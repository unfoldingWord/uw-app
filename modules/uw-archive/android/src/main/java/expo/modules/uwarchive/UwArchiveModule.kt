package expo.modules.uwarchive

import android.net.Uri
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.IOException
import java.util.zip.ZipException
import java.util.zip.ZipFile

class UwArchiveModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("UwArchive")

    AsyncFunction("extract") { archive: String, into: String, maxEntries: Int, maxBytes: Double ->
      extract(fileOf(archive), fileOf(into), maxEntries, maxBytes.toLong())
    }
  }

  private fun fileOf(location: String): File {
    val parsed = Uri.parse(location)
    return File(if (parsed.scheme == "file") parsed.path ?: location else location)
  }

  private fun refused(rule: String, path: String): Map<String, Any> =
    mapOf("ok" to false, "rule" to rule, "path" to path)

  private fun unsafe(name: String): Boolean =
    name.startsWith("/") || name.contains('\\') || name.split('/').any { it == ".." } || name.contains('\u0000')

  private fun extract(archive: File, into: File, maxEntries: Int, maxBytes: Long): Map<String, Any> {
    val root = into.canonicalFile
    root.mkdirs()
    val files = mutableListOf<Map<String, Any>>()
    var entries = 0
    var total = 0L
    try {
      ZipFile(archive).use { zip ->
        val all = zip.entries()
        val buffer = ByteArray(256 * 1024)
        while (all.hasMoreElements()) {
          val entry = all.nextElement()
          entries += 1
          if (entries > maxEntries) {
            return refused("archive-too-large", entry.name)
          }
          if (entry.isDirectory) {
            continue
          }
          if (unsafe(entry.name)) {
            return refused("archive-path", entry.name)
          }
          val target = File(root, entry.name).canonicalFile
          if (!target.path.startsWith(root.path + File.separator)) {
            return refused("archive-path", entry.name)
          }
          target.parentFile?.mkdirs()
          var bytes = 0L
          zip.getInputStream(entry).use { input ->
            target.outputStream().buffered(256 * 1024).use { output ->
              while (true) {
                val read = input.read(buffer)
                if (read < 0) {
                  break
                }
                total += read
                bytes += read
                if (total > maxBytes) {
                  return refused("archive-too-large", entry.name)
                }
                output.write(buffer, 0, read)
              }
            }
          }
          files.add(mapOf("path" to entry.name, "bytes" to bytes.toDouble()))
        }
      }
    } catch (error: ZipException) {
      return refused("archive-unreadable", "")
    } catch (error: IOException) {
      if (error.message?.contains("ENOSPC") == true || error.message?.contains("No space") == true) {
        throw error
      }
      return refused("archive-unreadable", "")
    }
    if (entries == 0) {
      return refused("archive-unreadable", "")
    }
    return mapOf("ok" to true, "files" to files)
  }
}
