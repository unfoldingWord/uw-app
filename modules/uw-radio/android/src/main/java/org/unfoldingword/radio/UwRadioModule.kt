package org.unfoldingword.radio

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.os.Build
import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.net.Inet4Address
import java.net.InetAddress
import java.net.NetworkInterface

private const val SERVICE_TYPE = "_uwapp._tcp"
private const val PACKAGE_MIME_TYPE = "application/vnd.android.package-archive"
private val cellularInterfaces = listOf("rmnet", "ccmni", "pdp", "v4-rmnet", "dummy", "tun")
private val wifiInterfaces = listOf("wlan", "swlan", "ap", "softap", "eth")

internal class RadioException(code: String, message: String) : CodedException(code, message, null)

@Suppress("DEPRECATION")
private fun ipv4Of(info: NsdServiceInfo): String? {
  val addresses: List<InetAddress> =
    if (Build.VERSION.SDK_INT >= 34) info.hostAddresses else listOfNotNull(info.host)
  return addresses.firstOrNull { it is Inet4Address }?.hostAddress
}

private fun localIpv4(): String? {
  val interfaces = NetworkInterface.getNetworkInterfaces()?.toList().orEmpty()
    .filter { it.isUp && !it.isLoopback }
    .filterNot { item -> cellularInterfaces.any { item.name.startsWith(it) } }
    .sortedBy { item -> if (wifiInterfaces.any { item.name.startsWith(it) }) 0 else 1 }
  return interfaces
    .flatMap { it.inetAddresses.toList() }
    .firstOrNull { it is Inet4Address && !it.isLoopbackAddress && !it.isLinkLocalAddress }
    ?.hostAddress
}

private class RadioBrowse(
  private val nsd: NsdManager,
  private val promise: Promise,
) : NsdManager.DiscoveryListener {
  private val handler = Handler(Looper.getMainLooper())
  private val pending = ArrayDeque<NsdServiceInfo>()
  private val found = LinkedHashMap<String, Map<String, Any>>()
  private var resolving = false
  private var started = false
  private var finished = false

  fun start(timeoutMs: Long) {
    handler.post {
      try {
        nsd.discoverServices(SERVICE_TYPE, NsdManager.PROTOCOL_DNS_SD, this)
        started = true
      } catch (error: IllegalArgumentException) {
        finish()
      }
    }
    handler.postDelayed({ finish() }, timeoutMs)
  }

  private fun finish() {
    if (finished) {
      return
    }
    finished = true
    if (started) {
      try {
        nsd.stopServiceDiscovery(this)
      } catch (error: IllegalArgumentException) {
        started = false
      }
    }
    promise.resolve(found.values.toList())
  }

  @Suppress("DEPRECATION")
  private fun next() {
    if (finished || resolving) {
      return
    }
    val info = pending.removeFirstOrNull() ?: return
    resolving = true
    nsd.resolveService(
      info,
      object : NsdManager.ResolveListener {
        override fun onResolveFailed(serviceInfo: NsdServiceInfo, errorCode: Int) {
          handler.post {
            resolving = false
            next()
          }
        }

        override fun onServiceResolved(serviceInfo: NsdServiceInfo) {
          handler.post {
            record(serviceInfo)
            resolving = false
            next()
          }
        }
      },
    )
  }

  private fun record(info: NsdServiceInfo) {
    val host = ipv4Of(info) ?: return
    val code = info.attributes["code"]?.toString(Charsets.UTF_8) ?: return
    val platform = info.attributes["platform"]?.toString(Charsets.UTF_8) ?: return
    found["$host:${info.port}"] = mapOf("host" to host, "port" to info.port, "code" to code, "platform" to platform)
  }

  override fun onDiscoveryStarted(serviceType: String) {}

  override fun onDiscoveryStopped(serviceType: String) {}

  override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) {
    handler.post {
      started = false
      finish()
    }
  }

  override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) {}

  override fun onServiceFound(serviceInfo: NsdServiceInfo) {
    handler.post {
      pending.addLast(serviceInfo)
      next()
    }
  }

  override fun onServiceLost(serviceInfo: NsdServiceInfo) {}
}

class UwRadioModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val nsd: NsdManager
    get() = context.getSystemService(Context.NSD_SERVICE) as NsdManager

  private var registration: NsdManager.RegistrationListener? = null

  override fun definition() = ModuleDefinition {
    Name("UwRadio")

    AsyncFunction("register") { name: String, port: Int, code: String, platform: String, promise: Promise ->
      unregister()
      val info = NsdServiceInfo().apply {
        serviceName = name
        serviceType = SERVICE_TYPE
        setPort(port)
        setAttribute("code", code)
        setAttribute("platform", platform)
      }
      val listener = object : NsdManager.RegistrationListener {
        private var settled = false

        override fun onServiceRegistered(serviceInfo: NsdServiceInfo) {
          if (!settled) {
            settled = true
            promise.resolve(null)
          }
        }

        override fun onRegistrationFailed(serviceInfo: NsdServiceInfo, errorCode: Int) {
          registration = null
          if (!settled) {
            settled = true
            promise.reject(RadioException("ERR_REGISTER", "The transfer service was not registered: $errorCode"))
          }
        }

        override fun onServiceUnregistered(serviceInfo: NsdServiceInfo) {}

        override fun onUnregistrationFailed(serviceInfo: NsdServiceInfo, errorCode: Int) {}
      }
      registration = listener
      nsd.registerService(info, NsdManager.PROTOCOL_DNS_SD, listener)
    }

    AsyncFunction("unregister") {
      unregister()
    }

    AsyncFunction("browse") { timeoutMs: Int, promise: Promise ->
      RadioBrowse(nsd, promise).start(timeoutMs.toLong().coerceAtLeast(0))
    }

    AsyncFunction("localAddress") {
      localIpv4()
    }

    AsyncFunction("appPackage") {
      appPackage()
    }

    AsyncFunction("install") { contentUri: String ->
      install(contentUri)
    }

    OnDestroy {
      unregister()
    }
  }

  private fun unregister() {
    val current = registration ?: return
    registration = null
    try {
      nsd.unregisterService(current)
    } catch (error: IllegalArgumentException) {
      return
    }
  }

  private fun appPackage(): Map<String, Any>? {
    val info = context.applicationInfo
    val splits = info.splitSourceDirs
    if (splits != null && splits.isNotEmpty()) {
      return null
    }
    val file = File(info.sourceDir)
    if (!file.isFile || !file.canRead()) {
      return null
    }
    return mapOf("uri" to Uri.fromFile(file).toString(), "bytes" to file.length().toDouble())
  }

  @Suppress("DEPRECATION")
  private fun declaresInstallPermission(): Boolean {
    val info = context.packageManager.getPackageInfo(context.packageName, PackageManager.GET_PERMISSIONS)
    return info.requestedPermissions?.contains(Manifest.permission.REQUEST_INSTALL_PACKAGES) == true
  }

  private fun install(contentUri: String) {
    if (!declaresInstallPermission()) {
      throw RadioException("ERR_INSTALL_NOT_PERMITTED", "This build does not declare REQUEST_INSTALL_PACKAGES")
    }
    val intent = Intent(Intent.ACTION_VIEW).apply {
      setDataAndType(Uri.parse(contentUri), PACKAGE_MIME_TYPE)
      addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    val activity = appContext.currentActivity
    if (activity != null) {
      activity.startActivity(intent)
    } else {
      context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
  }
}
