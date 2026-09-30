import Darwin
import ExpoModulesCore
import Foundation

enum RadioConstants {
  static let serviceType = "_uwapp._tcp."
  static let domain = "local."
  static let resolveSeconds: TimeInterval = 5
}

enum RadioAddresses {
  static func text(_ buffer: [CChar]) -> String? {
    return buffer.withUnsafeBufferPointer { pointer in
      pointer.baseAddress.map { String(cString: $0) }
    }
  }

  static func ipv4(from addresses: [Data]) -> String? {
    for data in addresses {
      let host: String? = data.withUnsafeBytes { raw -> String? in
        guard let base = raw.baseAddress, raw.count >= MemoryLayout<sockaddr_in>.size else {
          return nil
        }
        guard base.assumingMemoryBound(to: sockaddr.self).pointee.sa_family == sa_family_t(AF_INET) else {
          return nil
        }
        var address = base.assumingMemoryBound(to: sockaddr_in.self).pointee.sin_addr
        var buffer = [CChar](repeating: 0, count: Int(INET_ADDRSTRLEN))
        guard inet_ntop(AF_INET, &address, &buffer, socklen_t(INET_ADDRSTRLEN)) != nil else {
          return nil
        }
        return text(buffer)
      }
      if let host = host {
        return host
      }
    }
    return nil
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

final class RadioPublisher: NSObject, NetServiceDelegate {
  private var promise: Promise?

  init(promise: Promise) {
    self.promise = promise
  }

  func netServiceDidPublish(_ sender: NetService) {
    promise?.resolve()
    promise = nil
  }

  func netService(_ sender: NetService, didNotPublish errorDict: [String: NSNumber]) {
    promise?.reject("ERR_REGISTER", "The transfer service was not published")
    promise = nil
  }
}

final class RadioBrowse: NSObject, NetServiceBrowserDelegate, NetServiceDelegate {
  private let browser = NetServiceBrowser()
  private var resolving: [NetService] = []
  private var found: [String: [String: Any]] = [:]
  private var promise: Promise?
  private let done: (RadioBrowse) -> Void

  init(promise: Promise, done: @escaping (RadioBrowse) -> Void) {
    self.promise = promise
    self.done = done
    super.init()
    browser.delegate = self
  }

  func start(timeoutMs: Int) {
    browser.searchForServices(ofType: RadioConstants.serviceType, inDomain: RadioConstants.domain)
    DispatchQueue.main.asyncAfter(deadline: .now() + .milliseconds(max(0, timeoutMs))) { [weak self] in
      self?.finish()
    }
  }

  func netServiceBrowser(_ browser: NetServiceBrowser, didFind service: NetService, moreComing: Bool) {
    service.delegate = self
    resolving.append(service)
    service.resolve(withTimeout: RadioConstants.resolveSeconds)
  }

  func netServiceBrowser(_ browser: NetServiceBrowser, didNotSearch errorDict: [String: NSNumber]) {
    finish()
  }

  func netServiceDidResolveAddress(_ sender: NetService) {
    guard let host = RadioAddresses.ipv4(from: sender.addresses ?? []) else {
      return
    }
    let record = NetService.dictionary(fromTXTRecord: sender.txtRecordData() ?? Data())
    guard let code = record["code"].flatMap({ String(data: $0, encoding: .utf8) }),
      let platform = record["platform"].flatMap({ String(data: $0, encoding: .utf8) })
    else {
      return
    }
    found["\(host):\(sender.port)"] = ["host": host, "port": sender.port, "code": code, "platform": platform]
  }

  func netService(_ sender: NetService, didNotResolve errorDict: [String: NSNumber]) {}

  func finish() {
    guard let pending = promise else {
      return
    }
    promise = nil
    browser.stop()
    resolving.forEach { $0.stop() }
    resolving.removeAll()
    pending.resolve(Array(found.values))
    done(self)
  }
}

public class UwRadioModule: Module {
  private var published: NetService?
  private var publisher: RadioPublisher?
  private var browses: [RadioBrowse] = []

  public func definition() -> ModuleDefinition {
    Name("UwRadio")

    AsyncFunction("register") { (name: String, port: Int, code: String, platform: String, promise: Promise) in
      self.stopPublishing()
      let service = NetService(domain: RadioConstants.domain, type: RadioConstants.serviceType, name: name, port: Int32(port))
      service.setTXTRecord(NetService.data(fromTXTRecord: ["code": Data(code.utf8), "platform": Data(platform.utf8)]))
      let publisher = RadioPublisher(promise: promise)
      service.delegate = publisher
      self.publisher = publisher
      self.published = service
      service.publish()
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
    published?.stop()
    published = nil
    publisher = nil
  }
}
