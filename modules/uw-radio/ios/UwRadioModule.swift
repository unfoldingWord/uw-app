import Darwin
import ExpoModulesCore
import Foundation
import dnssd

enum RadioConstants {
  static let serviceType = "_uwapp._tcp."
  static let domain = "local."
  static let noError = DNSServiceErrorType(kDNSServiceErr_NoError)
}

enum RadioAddresses {
  static func text(_ buffer: [CChar]) -> String? {
    return buffer.withUnsafeBufferPointer { pointer in
      pointer.baseAddress.map { String(cString: $0) }
    }
  }

  static func ipv4(from address: UnsafePointer<sockaddr>) -> String? {
    guard address.pointee.sa_family == sa_family_t(AF_INET) else {
      return nil
    }
    return address.withMemoryRebound(to: sockaddr_in.self, capacity: 1) { inet -> String? in
      var raw = inet.pointee.sin_addr
      var buffer = [CChar](repeating: 0, count: Int(INET_ADDRSTRLEN))
      guard inet_ntop(AF_INET, &raw, &buffer, socklen_t(INET_ADDRSTRLEN)) != nil else {
        return nil
      }
      return text(buffer)
    }
  }

  static func local() -> String? {
    var first: UnsafeMutablePointer<ifaddrs>?
    guard getifaddrs(&first) == 0, let head = first else {
      return nil
    }
    defer { freeifaddrs(first) }
    var fallback: String?
    for entry in sequence(first: head, next: { $0.pointee.ifa_next }) {
      let flags = Int32(entry.pointee.ifa_flags)
      guard let address = entry.pointee.ifa_addr,
        address.pointee.sa_family == sa_family_t(AF_INET),
        (flags & IFF_UP) != 0,
        (flags & IFF_LOOPBACK) == 0
      else {
        continue
      }
      var host = [CChar](repeating: 0, count: Int(NI_MAXHOST))
      guard getnameinfo(address, socklen_t(address.pointee.sa_len), &host, socklen_t(host.count), nil, 0, NI_NUMERICHOST) == 0,
        let found = text(host)
      else {
        continue
      }
      let name = String(cString: entry.pointee.ifa_name)
      if name.hasPrefix("en") || name.hasPrefix("bridge") {
        return found
      }
      if fallback == nil && !name.hasPrefix("pdp_ip") && !name.hasPrefix("utun") {
        fallback = found
      }
    }
    return fallback
  }
}

enum RadioText {
  static func record(_ values: [(String, String)]) -> Data {
    var record = TXTRecordRef()
    TXTRecordCreate(&record, 0, nil)
    defer { TXTRecordDeallocate(&record) }
    for (key, value) in values {
      let bytes = Array(value.utf8.prefix(255))
      _ = TXTRecordSetValue(&record, key, UInt8(bytes.count), bytes)
    }
    guard let pointer = TXTRecordGetBytesPtr(&record) else {
      return Data()
    }
    return Data(bytes: pointer, count: Int(TXTRecordGetLength(&record)))
  }

  static func value(_ key: String, length: UInt16, record: UnsafePointer<UInt8>?) -> String? {
    guard let record = record else {
      return nil
    }
    var size: UInt8 = 0
    guard let pointer = TXTRecordGetValuePtr(length, record, key, &size) else {
      return nil
    }
    let data = Data(bytes: pointer, count: Int(size))
    return String(data: data, encoding: .utf8)
  }
}

final class RadioRegistration {
  private var reference: DNSServiceRef?
  private var promise: Promise?

  init(promise: Promise) {
    self.promise = promise
  }

  func start(name: String, port: Int, code: String, platform: String) {
    let text = RadioText.record([("code", code), ("platform", platform)])
    let context = Unmanaged.passUnretained(self).toOpaque()
    let error = text.withUnsafeBytes { raw in
      DNSServiceRegister(
        &reference, 0, 0, name, RadioConstants.serviceType, RadioConstants.domain, nil,
        UInt16(clamping: port).bigEndian, UInt16(raw.count), raw.baseAddress,
        { _, _, errorCode, _, _, _, context in
          guard let context = context else {
            return
          }
          Unmanaged<RadioRegistration>.fromOpaque(context).takeUnretainedValue().registered(errorCode)
        },
        context)
    }
    guard error == RadioConstants.noError, let reference = reference else {
      self.reference = nil
      settle(error)
      return
    }
    let queued = DNSServiceSetDispatchQueue(reference, DispatchQueue.main)
    if queued != RadioConstants.noError {
      stop()
      settle(queued)
    }
  }

  func registered(_ errorCode: DNSServiceErrorType) {
    if errorCode != RadioConstants.noError {
      stop()
    }
    settle(errorCode)
  }

  func stop() {
    if let reference = reference {
      DNSServiceRefDeallocate(reference)
    }
    reference = nil
  }

  private func settle(_ errorCode: DNSServiceErrorType) {
    guard let pending = promise else {
      return
    }
    promise = nil
    if errorCode == RadioConstants.noError {
      pending.resolve()
    } else {
      pending.reject("ERR_REGISTER", "The transfer service was not published (\(errorCode))")
    }
  }
}

final class RadioResolution {
  private weak var browse: RadioBrowse?
  private var resolveReference: DNSServiceRef?
  private var addressReference: DNSServiceRef?
  private var port = 0
  private var code: String?
  private var platform: String?

  init(browse: RadioBrowse) {
    self.browse = browse
  }

  func start(interface: UInt32, name: UnsafePointer<CChar>, type: UnsafePointer<CChar>, domain: UnsafePointer<CChar>) {
    let context = Unmanaged.passUnretained(self).toOpaque()
    let error = DNSServiceResolve(
      &resolveReference, 0, interface, name, type, domain,
      { _, _, interface, errorCode, _, host, port, textLength, text, context in
        guard let context = context, errorCode == RadioConstants.noError, let host = host else {
          return
        }
        Unmanaged<RadioResolution>.fromOpaque(context).takeUnretainedValue()
          .resolved(interface: interface, host: host, port: port, textLength: textLength, text: text)
      },
      context)
    guard error == RadioConstants.noError, let reference = resolveReference else {
      resolveReference = nil
      return
    }
    if DNSServiceSetDispatchQueue(reference, DispatchQueue.main) != RadioConstants.noError {
      stop()
    }
  }

  func resolved(interface: UInt32, host: UnsafePointer<CChar>, port: UInt16, textLength: UInt16, text: UnsafePointer<UInt8>?) {
    guard let code = RadioText.value("code", length: textLength, record: text),
      let platform = RadioText.value("platform", length: textLength, record: text)
    else {
      return
    }
    self.port = Int(UInt16(bigEndian: port))
    self.code = code
    self.platform = platform
    if let reference = resolveReference {
      DNSServiceRefDeallocate(reference)
    }
    resolveReference = nil
    let context = Unmanaged.passUnretained(self).toOpaque()
    let error = DNSServiceGetAddrInfo(
      &addressReference, 0, interface, DNSServiceProtocol(kDNSServiceProtocol_IPv4), host,
      { _, _, _, errorCode, _, address, _, context in
        guard let context = context, errorCode == RadioConstants.noError, let address = address else {
          return
        }
        Unmanaged<RadioResolution>.fromOpaque(context).takeUnretainedValue().addressed(address)
      },
      context)
    guard error == RadioConstants.noError, let reference = addressReference else {
      addressReference = nil
      return
    }
    if DNSServiceSetDispatchQueue(reference, DispatchQueue.main) != RadioConstants.noError {
      stop()
    }
  }

  func addressed(_ address: UnsafePointer<sockaddr>) {
    guard let host = RadioAddresses.ipv4(from: address), let code = code, let platform = platform else {
      return
    }
    browse?.found(host: host, port: port, code: code, platform: platform)
  }

  func stop() {
    if let reference = resolveReference {
      DNSServiceRefDeallocate(reference)
    }
    if let reference = addressReference {
      DNSServiceRefDeallocate(reference)
    }
    resolveReference = nil
    addressReference = nil
  }
}

final class RadioBrowse {
  private var reference: DNSServiceRef?
  private var resolutions: [RadioResolution] = []
  private var services: [String: [String: Any]] = [:]
  private var promise: Promise?
  private let done: (RadioBrowse) -> Void

  init(promise: Promise, done: @escaping (RadioBrowse) -> Void) {
    self.promise = promise
    self.done = done
  }

  func start(timeoutMs: Int) {
    let context = Unmanaged.passUnretained(self).toOpaque()
    let error = DNSServiceBrowse(
      &reference, 0, 0, RadioConstants.serviceType, RadioConstants.domain,
      { _, flags, interface, errorCode, name, type, domain, context in
        guard let context = context, errorCode == RadioConstants.noError,
          (flags & DNSServiceFlags(kDNSServiceFlagsAdd)) != 0,
          let name = name, let type = type, let domain = domain
        else {
          return
        }
        Unmanaged<RadioBrowse>.fromOpaque(context).takeUnretainedValue()
          .appeared(interface: interface, name: name, type: type, domain: domain)
      },
      context)
    guard error == RadioConstants.noError, let reference = reference else {
      self.reference = nil
      finish()
      return
    }
    if DNSServiceSetDispatchQueue(reference, DispatchQueue.main) != RadioConstants.noError {
      finish()
      return
    }
    DispatchQueue.main.asyncAfter(deadline: .now() + .milliseconds(max(0, timeoutMs))) { [weak self] in
      self?.finish()
    }
  }

  func appeared(interface: UInt32, name: UnsafePointer<CChar>, type: UnsafePointer<CChar>, domain: UnsafePointer<CChar>) {
    guard promise != nil else {
      return
    }
    let resolution = RadioResolution(browse: self)
    resolutions.append(resolution)
    resolution.start(interface: interface, name: name, type: type, domain: domain)
  }

  func found(host: String, port: Int, code: String, platform: String) {
    services["\(host):\(port)"] = ["host": host, "port": port, "code": code, "platform": platform]
  }

  func finish() {
    guard let pending = promise else {
      return
    }
    promise = nil
    if let reference = reference {
      DNSServiceRefDeallocate(reference)
    }
    reference = nil
    resolutions.forEach { $0.stop() }
    resolutions.removeAll()
    pending.resolve(Array(services.values))
    done(self)
  }
}

public class UwRadioModule: Module {
  private var registration: RadioRegistration?
  private var browses: [RadioBrowse] = []

  public func definition() -> ModuleDefinition {
    Name("UwRadio")

    AsyncFunction("register") { (name: String, port: Int, code: String, platform: String, promise: Promise) in
      self.stopPublishing()
      let registration = RadioRegistration(promise: promise)
      self.registration = registration
      registration.start(name: name, port: port, code: code, platform: platform)
    }.runOnQueue(.main)

    AsyncFunction("unregister") {
      self.stopPublishing()
    }.runOnQueue(.main)

    AsyncFunction("browse") { (timeoutMs: Int, promise: Promise) in
      let browse = RadioBrowse(promise: promise) { [weak self] finished in
        self?.browses.removeAll { $0 === finished }
      }
      self.browses.append(browse)
      browse.start(timeoutMs: timeoutMs)
    }.runOnQueue(.main)

    AsyncFunction("localAddress") { () -> String? in
      return RadioAddresses.local()
    }

    AsyncFunction("appPackage") { () -> [String: String]? in
      return nil
    }

    AsyncFunction("install") { (contentUri: String, promise: Promise) in
      promise.reject("ERR_INSTALL_NOT_PERMITTED", "iOS does not install app packages")
    }

    OnDestroy {
      DispatchQueue.main.async {
        self.stopPublishing()
        self.browses.forEach { $0.finish() }
      }
    }
  }

  private func stopPublishing() {
    registration?.stop()
    registration = nil
  }
}
