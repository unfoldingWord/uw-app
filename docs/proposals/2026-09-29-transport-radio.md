# The Transport radio

Status: approved in issue #2 (2026-09-29). Built up to the spike in step 4 on 2026-09-30 (see `docs/exceptions.md`); before that, `src/platform/transport.ts` was the platform
adapter for the Transport port and reported `available: false`; the sim proves SH-1 and
SH-2 on the memory adapter's shared bus.

Evidence labels: **checked** means read in the package source or the docs in this repository on 2026-09-29;
**inference** means reasoned, not measured or read at the source. Nothing here has run on a phone. The numbers
for throughput are estimates the spike in step 4 must replace with measurements.

## Problem

SH-1 needs a transfer between any two phones running the app, iOS to Android and back, with no internet. SH-2
needs Android to hand over its own app package. PRD section 7 adds: no location, and local network and
Bluetooth permission only when the leader starts a transfer. A Language Pack is 40 to 60 MB compressed (PRD
section 8), and the target phone is a low-end Android. AGENTS.md section 3 leaves the radio open and makes any
native module outside Expo a proposal.

No Expo SDK 57 module opens a socket or a radio link between two phones (checked: `bundledNativeModules.json`
lists none). Whatever is chosen adds native code.

## Candidates

| Candidate | iOS to Android | Throughput for 60 MB (inference) | Native code and Expo fit | Permissions | Verdict |
|---|---|---|---|---|---|
| TCP over a shared local network (router Wi-Fi, an Android system hotspot or an iPhone Personal Hotspot), peers found by Bonjour/mDNS under the short code, with a QR code carrying address and port as fallback | Yes, both directions: once both phones are on one network, either can listen | Wi-Fi at 2 to 10 MB/s on a low-end phone: 6 to 30 s | `react-native-tcp-socket` (MIT, autolinked, needs no config plugin because it changes no manifest; iOS needs `NSLocalNetworkUsageDescription` and `NSBonjourServices` set in `app.config`). mDNS through `react-native-zeroconf` (MIT; maintenance to be checked) or Android `NsdManager` and iOS `NWBrowser` in a local Expo module | iOS: local network prompt at the first browse or listen, which happens when a transfer starts. Android: none beyond `INTERNET`; `NsdManager` needs no location (inference, to confirm in the spike) | **Recommended** |
| The same TCP link, with the app creating the network: Android `LocalOnlyHotspot`, iPhone joins through `NEHotspotConfiguration` | Yes | As above | A local Expo module (Expo Modules API, so it has a config plugin by construction); iOS needs the Hotspot Configuration entitlement | Android 8 to 12: `ACCESS_FINE_LOCATION` for `LocalOnlyHotspot`, which the PRD forbids. Android 13 and later: `NEARBY_WIFI_DEVICES` with `neverForLocation` | Later, Android 13 and later only |
| BLE for discovery, Wi-Fi for payload | Yes | BLE alone is tens of kB/s cross-platform: 10 minutes or more for 60 MB, so BLE can only carry discovery and the network credentials | `react-native-ble-plx` (Apache-2.0, ships a config plugin) | Bluetooth prompt on both; Android 11 and earlier need location to scan | Not needed if mDNS and QR find peers; revisit if field tests show leaders cannot share a network |
| Google Nearby Connections (`expo-nearby-connections` and similar) | No: the community wrappers use Nearby on Android and Multipeer on iOS, which do not talk to each other (inference from the wrapper design) | Good on Android to Android | Wrapper with a config plugin; Google Play services required | Location or nearby devices on Android | Refused: not cross-platform, and it depends on Google Play services |
| Apple Multipeer Connectivity | No: iOS only | Good between iPhones | Local module | Local network | Refused as the one radio; could serve iOS to iOS later |
| WebRTC data channel, signalled by a QR code (`react-native-webrtc`, MIT, with `@config-plugins/react-native-webrtc`) | Yes, on a shared local network with host candidates only | SCTP over Wi-Fi, 1 to 5 MB/s | Large native library (several MB per ABI, inference) | Local network | Refused: needs the same shared network as plain TCP, with far more code and binary size |
| Wi-Fi Aware (Android 8 and later, and iOS 26 and later) | Possibly, on hardware that has it | Wi-Fi speeds | Local module on both | Nearby devices | Refused for now: low-end Android hardware often lacks it (inference), and the iOS side is new |

## Change

1. **Radio.** TCP over a shared local network. The sender advertises a Bonjour/mDNS service named for the short
   code (`_uwapp._tcp`) and listens on an ephemeral port; the receiver browses, or scans a QR code with address
   and port when multicast is blocked. The Transport port does not change: `advertise(code)` listens and
   registers, `discover` browses, `connect` opens the socket, `TransportLink` frames chunks of
   `maxChunkBytes()` over it. The leader connects both phones to one network first: a router, an Android system
   hotspot (works without a SIM on most phones, inference) or an iPhone Personal Hotspot (needs a cellular plan).
   The transfer screen explains this in one sentence with a picture.
2. **Native pieces.** `react-native-tcp-socket` for the socket, and one local Expo module,
   `modules/uw-radio/` (Expo Modules API, Kotlin and Swift), for mDNS on both platforms and for the Android app
   package. No other native module. Both land behind `src/platform/transport.ts`; nothing else imports them.
3. **App package (SH-2).** On Android the module returns `applicationInfo.sourceDir` (the same file as
   `getPackageCodePath()`) and its size when `splitSourceDirs` is empty. An install from Google Play is split, and
   `base.apk` alone does not install, so `appPackage()` returns `undefined` there and the transfer screen does not
   offer the app; the universal APK from EAS (`eas.json` build profile `apk`) is the one that shares itself.
   The receiver saves the package through Files and opens it with the system installer, which asks the leader to
   allow installs from this app. That needs `REQUEST_INSTALL_PACKAGES`, which Google Play restricts; the Play build
   leaves it out and the APK build declares it. On iOS `appPackage()` is always `undefined`: iOS does not permit it.
4. **Spike before build.** One day on a low-end Android (2 GB RAM, Android 10 or 11) and an iPhone on each of the
   three network kinds: measure throughput both ways for a 60 MB pack, time to discover, and which prompts appear
   when. Record the runs in `docs/progress_tracker.md`. The proposal is confirmed only if 60 MB moves in under
   two minutes both ways and no location prompt appears.
5. **Later, only on evidence.** `LocalOnlyHotspot` on Android 13 and later so the app can create the network;
   BLE for discovery if leaders cannot share a network in field tests.

## Alternatives

- Keep Transport unavailable and rely on Share and Import (SH-3) of a burrito file through Bluetooth file
  sharing or a messaging app. Needs no native code, but Android's Bluetooth OPP is slow and missing on some
  phones, iOS has no Bluetooth file sharing to Android, and it does not meet SH-1's in-app transfer.
- BLE for everything: cross-platform and no shared network, but too slow for a Language Pack.
- A different radio per pair (Nearby for Android to Android, Multipeer for iPhone to iPhone, TCP between them):
  three implementations of one port, three sets of permissions and tests, for a gain the spike has not shown.

## Rules affected

- AGENTS.md section 3: Transport stops being open. `react-native-tcp-socket` and `modules/uw-radio/` become the
  platform adapter's only native dependencies, recorded in `docs/dependencies.md`.
- AGENTS.md section 3, "Native modules outside Expo": `react-native-tcp-socket` has no config plugin and needs
  none; `modules/uw-radio/` is an Expo module. Both are admitted by this proposal, and the network check in
  `scripts/checks/network.check.ts` lists `react-native-tcp-socket` as a package that opens sockets on purpose,
  imported only by `src/platform/transport.ts`.
- AGENTS.md section 10 ("the only network calls are through the Http port"): the transfer socket is not an
  internet call; it goes to a peer on the local network through the Transport port only. The lint list
  `deviceModules` in `scripts/eslint/boundaries.ts` already keeps both packages out of application code.
- PRD section 7, permissions: local network (iOS) at the first transfer; no Bluetooth and no location with this
  choice. `app.config` gains `NSLocalNetworkUsageDescription` and `NSBonjourServices: ["_uwapp._tcp"]`.
- `docs/exceptions.md`: the entry for the unavailable Transport adapter closes when the adapter lands.
