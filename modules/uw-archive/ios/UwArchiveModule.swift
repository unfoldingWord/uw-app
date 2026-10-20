import Compression
import ExpoModulesCore
import Foundation

private struct ArchiveUnreadable: Error {}

private struct ArchiveTooLarge: Error {}

private struct Entry {
  let name: String
  let method: UInt16
  let compressed: UInt64
  let size: UInt64
  let local: UInt64
}

private func little16(_ data: Data, _ offset: Int) -> UInt16 {
  let start = data.startIndex + offset
  return UInt16(data[start]) | UInt16(data[start + 1]) << 8
}

private func little32(_ data: Data, _ offset: Int) -> UInt32 {
  let start = data.startIndex + offset
  return UInt32(data[start]) | UInt32(data[start + 1]) << 8 | UInt32(data[start + 2]) << 16
    | UInt32(data[start + 3]) << 24
}

private func fileUrl(_ location: String) -> URL {
  if location.hasPrefix("file://"), let parsed = URL(string: location) {
    return parsed
  }
  return URL(fileURLWithPath: location)
}

private func refused(_ rule: String, _ path: String) -> [String: Any] {
  return ["ok": false, "rule": rule, "path": path]
}

private func unsafe(_ name: String) -> Bool {
  return name.hasPrefix("/") || name.contains("\\") || name.contains("\u{0}")
    || name.split(separator: "/", omittingEmptySubsequences: false).contains("..")
}

private let chunkSize = 256 * 1024

private final class Extraction {
  let archive: URL
  let root: URL
  let maxEntries: Int
  let maxBytes: UInt64
  var total: UInt64 = 0

  init(archive: URL, into: URL, maxEntries: Int, maxBytes: UInt64) {
    self.archive = archive
    self.root = into.standardizedFileURL
    self.maxEntries = maxEntries
    self.maxBytes = maxBytes
  }

  func run() throws -> [String: Any] {
    guard let handle = try? FileHandle(forReadingFrom: archive) else {
      return refused("archive-unreadable", "")
    }
    defer { try? handle.close() }
    let entries: [Entry]
    do {
      entries = try centralDirectory(handle)
    } catch is ArchiveTooLarge {
      return refused("archive-too-large", "")
    } catch {
      return refused("archive-unreadable", "")
    }
    if entries.isEmpty {
      return refused("archive-unreadable", "")
    }
    try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
    var files: [[String: Any]] = []
    for entry in entries {
      if entry.name.hasSuffix("/") {
        continue
      }
      if unsafe(entry.name) {
        return refused("archive-path", entry.name)
      }
      let target = root.appendingPathComponent(entry.name).standardizedFileURL
      guard target.path.hasPrefix(root.path + "/") else {
        return refused("archive-path", entry.name)
      }
      try FileManager.default.createDirectory(
        at: target.deletingLastPathComponent(), withIntermediateDirectories: true)
      do {
        let bytes = try write(entry, from: handle, to: target)
        files.append(["path": entry.name, "bytes": Double(bytes)])
      } catch is ArchiveTooLarge {
        return refused("archive-too-large", entry.name)
      } catch is ArchiveUnreadable {
        return refused("archive-unreadable", entry.name)
      }
    }
    return ["ok": true, "files": files]
  }

  func centralDirectory(_ handle: FileHandle) throws -> [Entry] {
    let size = try handle.seekToEnd()
    let tailLength = min(size, UInt64(65_557))
    try handle.seek(toOffset: size - tailLength)
    guard let tail = try handle.read(upToCount: Int(tailLength)), tail.count >= 22 else {
      throw ArchiveUnreadable()
    }
    var end = tail.count - 22
    while end >= 0 && little32(tail, end) != 0x0605_4b50 {
      end -= 1
    }
    guard end >= 0 else {
      throw ArchiveUnreadable()
    }
    let count = little16(tail, end + 10)
    let directorySize = little32(tail, end + 12)
    let directoryOffset = little32(tail, end + 16)
    guard count != 0xFFFF, directorySize != 0xFFFF_FFFF, directoryOffset != 0xFFFF_FFFF else {
      throw ArchiveUnreadable()
    }
    guard Int(count) <= maxEntries else {
      throw ArchiveTooLarge()
    }
    guard UInt64(directoryOffset) + UInt64(directorySize) <= size else {
      throw ArchiveUnreadable()
    }
    try handle.seek(toOffset: UInt64(directoryOffset))
    guard let directory = try handle.read(upToCount: Int(directorySize)),
      directory.count == Int(directorySize)
    else {
      throw ArchiveUnreadable()
    }
    var entries: [Entry] = []
    var position = 0
    for _ in 0..<Int(count) {
      guard position + 46 <= directory.count, little32(directory, position) == 0x0201_4b50 else {
        throw ArchiveUnreadable()
      }
      let flags = little16(directory, position + 8)
      let method = little16(directory, position + 10)
      let compressed = little32(directory, position + 20)
      let uncompressed = little32(directory, position + 24)
      let nameLength = Int(little16(directory, position + 28))
      let extraLength = Int(little16(directory, position + 30))
      let commentLength = Int(little16(directory, position + 32))
      let local = little32(directory, position + 42)
      guard flags & 1 == 0, method == 0 || method == 8, compressed != 0xFFFF_FFFF,
        uncompressed != 0xFFFF_FFFF, local != 0xFFFF_FFFF,
        position + 46 + nameLength <= directory.count
      else {
        throw ArchiveUnreadable()
      }
      let start = directory.startIndex + position + 46
      let nameBytes = directory.subdata(in: start..<(start + nameLength))
      guard
        let name = String(data: nameBytes, encoding: .utf8)
          ?? String(data: nameBytes, encoding: .isoLatin1)
      else {
        throw ArchiveUnreadable()
      }
      entries.append(
        Entry(
          name: name, method: method, compressed: UInt64(compressed), size: UInt64(uncompressed),
          local: UInt64(local)))
      position += 46 + nameLength + extraLength + commentLength
    }
    return entries
  }

  func write(_ entry: Entry, from handle: FileHandle, to target: URL) throws -> UInt64 {
    try handle.seek(toOffset: entry.local)
    guard let header = try handle.read(upToCount: 30), header.count == 30,
      little32(header, 0) == 0x0403_4b50
    else {
      throw ArchiveUnreadable()
    }
    let start = entry.local + 30 + UInt64(little16(header, 26)) + UInt64(little16(header, 28))
    try handle.seek(toOffset: start)
    guard FileManager.default.createFile(atPath: target.path, contents: nil) else {
      throw CocoaError(.fileWriteUnknown)
    }
    let output = try FileHandle(forWritingTo: target)
    defer { try? output.close() }
    var written: UInt64 = 0
    let emit: (Data) throws -> Void = { data in
      written += UInt64(data.count)
      self.total += UInt64(data.count)
      if self.total > self.maxBytes {
        throw ArchiveTooLarge()
      }
      try output.write(contentsOf: data)
    }
    if entry.method == 0 {
      var remaining = entry.compressed
      while remaining > 0 {
        guard let chunk = try handle.read(upToCount: Int(min(remaining, UInt64(chunkSize)))),
          !chunk.isEmpty
        else {
          throw ArchiveUnreadable()
        }
        remaining -= UInt64(chunk.count)
        try emit(chunk)
      }
    } else {
      try inflate(from: handle, count: entry.compressed, emit: emit)
    }
    guard written == entry.size else {
      throw ArchiveUnreadable()
    }
    return written
  }

  func inflate(from handle: FileHandle, count: UInt64, emit: (Data) throws -> Void) throws {
    let stream = UnsafeMutablePointer<compression_stream>.allocate(capacity: 1)
    defer { stream.deallocate() }
    guard compression_stream_init(stream, COMPRESSION_STREAM_DECODE, COMPRESSION_ZLIB)
      == COMPRESSION_STATUS_OK
    else {
      throw ArchiveUnreadable()
    }
    defer { compression_stream_destroy(stream) }
    let input = UnsafeMutablePointer<UInt8>.allocate(capacity: chunkSize)
    defer { input.deallocate() }
    let output = UnsafeMutablePointer<UInt8>.allocate(capacity: chunkSize)
    defer { output.deallocate() }
    var remaining = count
    var finished = false
    while !finished {
      var read = 0
      if remaining > 0 {
        guard let chunk = try handle.read(upToCount: Int(min(remaining, UInt64(chunkSize)))),
          !chunk.isEmpty
        else {
          throw ArchiveUnreadable()
        }
        read = chunk.count
        chunk.copyBytes(to: input, count: read)
        remaining -= UInt64(read)
      }
      let flags = remaining == 0 ? Int32(COMPRESSION_STREAM_FINALIZE.rawValue) : 0
      stream.pointee.src_ptr = UnsafePointer(input)
      stream.pointee.src_size = read
      repeat {
        stream.pointee.dst_ptr = output
        stream.pointee.dst_size = chunkSize
        let status = compression_stream_process(stream, flags)
        let produced = chunkSize - stream.pointee.dst_size
        if produced > 0 {
          try emit(Data(bytes: output, count: produced))
        }
        switch status {
        case COMPRESSION_STATUS_END:
          finished = true
        case COMPRESSION_STATUS_OK:
          break
        default:
          throw ArchiveUnreadable()
        }
      } while !finished && (stream.pointee.src_size > 0 || stream.pointee.dst_size == 0)
      if !finished && remaining == 0 {
        throw ArchiveUnreadable()
      }
    }
  }
}

public final class UwArchiveModule: Module {
  public func definition() -> ModuleDefinition {
    Name("UwArchive")

    AsyncFunction("extract") {
      (archive: String, into: String, maxEntries: Int, maxBytes: Double) -> [String: Any] in
      try Extraction(
        archive: fileUrl(archive), into: fileUrl(into), maxEntries: maxEntries,
        maxBytes: UInt64(maxBytes)
      ).run()
    }
  }
}
