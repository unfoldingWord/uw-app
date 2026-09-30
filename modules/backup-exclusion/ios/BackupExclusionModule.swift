import ExpoModulesCore
import Foundation

internal final class NotAFileLocationException: GenericException<String> {
  override var reason: String {
    "Not a file location: \(param)"
  }
}

internal final class NotADirectoryException: GenericException<String> {
  override var reason: String {
    "No directory exists at \(param)"
  }
}

public final class BackupExclusionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BackupExclusion")

    Function("excludeFromBackup") { (location: String) throws -> Bool in
      var url = try BackupExclusionModule.directoryURL(location)
      var values = URLResourceValues()
      values.isExcludedFromBackup = true
      try url.setResourceValues(values)
      return try BackupExclusionModule.readExcluded(url)
    }

    Function("isExcludedFromBackup") { (location: String) throws -> Bool in
      try BackupExclusionModule.readExcluded(BackupExclusionModule.directoryURL(location))
    }
  }

  static func directoryURL(_ location: String) throws -> URL {
    let url: URL
    if location.hasPrefix("/") {
      url = URL(fileURLWithPath: location, isDirectory: true)
    } else if let parsed = URL(string: location), parsed.isFileURL {
      url = parsed
    } else {
      throw NotAFileLocationException(location)
    }
    var isDirectory: ObjCBool = false
    guard FileManager.default.fileExists(atPath: url.path, isDirectory: &isDirectory), isDirectory.boolValue else {
      throw NotADirectoryException(url.path)
    }
    return url
  }

  static func readExcluded(_ url: URL) throws -> Bool {
    var fresh = URL(fileURLWithPath: url.path, isDirectory: true)
    fresh.removeAllCachedResourceValues()
    return try fresh.resourceValues(forKeys: [.isExcludedFromBackupKey]).isExcludedFromBackup ?? false
  }
}
