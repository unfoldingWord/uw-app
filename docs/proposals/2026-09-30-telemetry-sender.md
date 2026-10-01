# Send the counts through the Http port, off until an endpoint is set

Status: approved in issue #52 (the issue's decision is the requirements owner's delegate's approval). The
endpoint itself is not decided and is left unset; the unfoldingWord-hosted receiver (a Cloudflare Worker is the
organization's pattern) is a follow-up, not part of this change.

## Problem

ADR 0012 shipped v1.0.0 counting only. PRD 9 says the counts are "sent in batches when online", and release
criterion 8 is met only because nothing is sent. v1.1.0 needs the sender, the iOS privacy manifest entry and a
privacy screen that stays true whether sending is on or off, without inventing an endpoint.

## Change

- **One config value.** `telemetryEndpoint` in `src/lib/network.ts`, `undefined` today. The host allowlist is
  `allowedHostsFor(telemetryEndpoint)`: the three content hosts, plus the endpoint's host once it is set.
- **The Http port** (`src/lib/ports.ts`) gains `POST` and a request `body`. The kernel's guard
  (`src/lib/guard.ts`, `SendPolicy`) refuses a `POST` to any address but the endpoint, and every `POST` while it
  is unset; a download is never a `POST`. The platform adapter sends the body and never follows a redirect for
  a `POST`; the memory adapter records the body in `sent()`.
- **The sender** is `telemetry.send()` (`src/lib/telemetry/sending.ts`), called by `app/_layout.tsx` after the
  kernel starts and after each foreground `resume()`. It sends one batch a day, only when online: the counts not
  yet sent, `leaving()` minus what earlier batches carried, which on a phone that has sent nothing is exactly
  `leaving()`. The body is that JSON object and nothing else, with one header, `content-type`, and a 15 second
  timeout. A 2xx journals `TelemetrySent` (the day and the batch, `verbatim`); any other outcome journals a
  `Failure` with its `http.*` code, the new failure step `telemetry` and, for a non-2xx, the status, and the
  batch waits for the next day. Offline, nothing is attempted and nothing is journaled. With no endpoint it
  returns `off` and makes no request, so the app behaves as before.
- **The fold.** Telemetry's checkpoint adds what has been sent and the day of the last batch, so the unsent
  counts survive the journal's bound; a v1.0.0 checkpoint without them reads as nothing sent.
- **The kernel** takes `telemetryEndpoint` (`createKernel`), which picks the telemetry module and the guard's
  policy; the sim device takes the same option and its memory Http admits the endpoint's host. Replay builds
  devices with no endpoint, so a replay never sends; `TelemetrySent` is appended as recorded.
- **The privacy screen** reads `telemetry.sending()`. Off: the v1.0.0 copy, which says nothing is sent yet. On:
  `privacy.summary.sending`, `privacy.counts.sending` and `privacy.sending.later` in place of the summary, the
  intro and the dropped note.
- **The iOS privacy manifest** declares `NSPrivacyCollectedDataTypeProductInteraction`, not linked, not
  tracking, purpose analytics, through `ios.privacyManifests` in `app.config.ts`
  (`plugins/privacy-manifest/index.ts`), only while the endpoint is set; unset, the list stays empty.
- `sim/scenarios/SE-1.privacy-counts-leave-as-leaving.ts` proves both states.

## Alternatives

- **Send cumulative totals each time.** Simpler, but with no identifier a receiver cannot tell two batches from
  one phone from one batch each from two phones, so totals would be counted again on every send.
- **Carry the endpoint in `app.config.ts` `extra`.** The kernel would need it through a port or `expo-constants`
  at the platform layer, and the allowlist in `src/lib` would no longer be a constant the `network` check reads.
- **Declare the privacy manifest entry now.** App Store privacy labels would then claim collection that does not
  happen until the endpoint is set.
- **Send from a reaction to `AppOpened`.** A reaction may only emit `follows` events and replay would redo it; an
  explicit call from the root layout keeps the send out of replay.

## Rules affected

- AGENTS.md rule 4: `src/lib/ports.ts`, `src/lib/domain/*`, `src/lib/compose.ts`, `src/lib/kernel.ts`,
  `src/platform/http.ts`, `app/_layout.tsx` and `app.config.ts` are shared roots; this proposal covers each
  change. No rule is broken, so `docs/exceptions.md` gains no row.
- AGENTS.md section 10 (the only network calls are through the Http port to allowlisted hosts, with a timeout, a
  non-2xx path and a defined offline behaviour) holds for the new call.
- PRD 9, `docs/architecture.md`, `docs/replay.md` and `docs/release-checklist.md` change in the same commit.
  ADR 0012 stays as the record of v1.0.0; this proposal is the v1.1.0 step it names.
