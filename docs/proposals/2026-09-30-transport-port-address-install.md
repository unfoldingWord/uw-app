# The Transport port gains an address, an installer hand-off and an adoptable app package

Status: approved through the decisions in issues #2 and #3 (2026-09-29), which accept
`docs/proposals/2026-09-29-transport-radio.md` as written. That proposal said the Transport port would not
change; building it showed three small changes it needs. They are listed here so a human can review them as
the architecture change they are. Nothing here has run on a phone.

## Problem

1. **QR and typed fallback (issue #2).** When multicast is blocked the receiver needs the sender's address.
   The port gave no way to learn it: `Advertisement` carried only the code, and `Peer.id` was opaque.
2. **The receiver checks nothing and the sender learns nothing (security review in issue #2).** Any phone
   on the network could connect to an advertisement and receive the offer without knowing the code.
3. **App package (issue #3).** On Android `applicationInfo.sourceDir` is outside the app's Files root, so
   the kernel cannot read it through the Files port, and no port call opened the system installer.

## Change

- `Advertisement.address: string | undefined`: where the advertisement listens (`host:port` on a phone,
  the memory peer id in the sim). `Peer.id` is the address `connect` dials, so the kernel's new
  `transfer.connectAt(address, code)` builds a `Peer` from a typed or scanned address. The address is shown
  on the sender's screen as text and as a QR code of `unfoldingword://transfer?address=…&code=…`, which the
  other phone's system camera opens in the app (the Transfer screen reads the two parameters); the app asks
  for no camera permission. The address is never journaled (DX-2 checks the memory addresses stay out of a
  shared journal).
- The receiver's `hello` carries the pairing code; the sender reads the receiver's `hello` before it sends
  its own, declines a missing or wrong code with `transfer.declined` (journaled as a `Failure` with step
  `transfer`), closes that link and keeps advertising, up to eight refusals. Protocol version stays 1; a
  `hello` code is 4 to 8 digits. The code stays 4 digits: SH-1 asserts it, and with the check a phone that
  taps the wrong advertisement is declined instead of being served.
- `AppPackage` is `{ source, bytes }`: `source` is an address the Files port can `adopt`. The sender
  adopts the package into `transfer/outgoing/app.apk` (owned by the transfer module) when the receiver
  accepts it, and streams it from there; the directory is removed when the transfer ends.
- `Transport.install(path)`: opens the system installer on a Files path. The kernel's
  `transfer.installApp()` calls it on the received package; iOS and a build without
  `REQUEST_INSTALL_PACKAGES` refuse with `transfer.unsupported`, a missing package with `files.not-found`,
  each journaled as a `Failure`. On Android the platform adapter passes the file's content URI
  (expo-file-system's `FileSystemFileProvider`) to `modules/uw-radio`, which starts `ACTION_VIEW` with read
  permission granted.
- `REQUEST_INSTALL_PACKAGES` is declared only when `UW_ANDROID_PACKAGE_INSTALLER=1`, which only the new
  `apk` profile in `eas.json` sets; `npm run checks` builds the config both ways and fails if the store
  build declares it, the apk build lacks it, or a store profile sets the flag.

## Alternatives

- Keep `AppPackage.path` a Files path and have the platform adapter copy the package into the device root:
  a second writer of a Files directory (rule 3), and a 30 to 60 MB copy on every capabilities call.
- A separate installer port: one more port and adapter pair for one call; Transport already owns the app
  package.
- A camera scanner for the QR code: needs camera permission, which `app.config.ts` blocks and AGENTS.md
  section 10 treats as out of scope. The system camera opening the app link needs none.
- A longer code: stronger against guessing on a shared network, but SH-1 asserts four digits and the
  prototype shows four. The check above removes the case the security review named; a longer code is left
  as a follow-up.

## Rules affected

- Rule 4: `src/lib/ports.ts` (`Advertisement.address`, `AppPackage.source`, `Transport.install`) and
  `src/platform/` (`transport.ts`, `radio.ts`, `stream-link.ts`, `ports.ts`) are shared roots; both adapters
  and the port contract change in the same commit.
- AGENTS.md section 3: `modules/uw-radio/` and `react-native-tcp-socket` are the Transport adapter's native
  dependencies, as the approved proposal says; the network check admits the socket package in
  `src/platform/transport.ts` only.
- PRD section 7: iOS gains `NSLocalNetworkUsageDescription` and `NSBonjourServices: ["_uwapp._tcp"]`; the apk
  build gains `REQUEST_INSTALL_PACKAGES`. No Bluetooth, location or camera permission.
