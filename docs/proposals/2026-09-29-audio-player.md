# Audio playback in the kernel

Status: accepted in issue #6 (2026-09-30), as built; recorded in ADR 0010. It was built under exception first. The `player` module, the study and formation controls and
the audio bar landed on the scaffold branch under the entry in `docs/exceptions.md` (rule 4,
`src/lib/player`). What was built differs from the change below in three places: there are no `AudioPlayed`
or `AudioPaused` events, since no telemetry fold in PRD section 9 counts listens and the journal stays lean
(only a `Failure` with step `audio` is journaled); the listener API is `subscribe(listener)`; and the
services expose `listen(clip)` returning one clip's `toggle`, `seek`, `skip`, `stop`, `status` and
`subscribe`, plus `audioTime(status)`. If the proposal is refused, the module and the controls are removed and
the audio bar's play control goes back to disabled.

## Problem

ST-4 asks for an audio bar on the passage view that plays, pauses and seeks, and streams when online. The
Audio port exists (`src/lib/ports.ts`, with the allowlisted wrapper in `src/lib/scope.ts`), but no kernel
module uses it, so nothing a feature service can reach plays a clip. A screen may not call a port (AGENTS.md
rule 2), and the study service sees only the kernel. The Study screen (T11) therefore shows the audio bar's
states (on this phone, not downloaded, downloading) and the download action, and renders its play control
disabled with the `failure.audio.unavailable` hint.

## Change

Add a small kernel module, `player`, over the Audio port:

- `load(clip)` for a downloaded `AudioClip` (a Files path under the audio pack) or a stream URL from a
  release that carries one; `play()`, `pause()`, `seek(positionMs)`, `status()` and `onStatus(listener)`.
- Events `AudioPlayed` and `AudioPaused` with the resource and reference, so the telemetry folds can count
  listens, and a `Failure` with `audio.unavailable` when the port refuses or the file is gone.
- No durable values; the module owns nothing in `owns`.

The study service then exposes `listen(clip)`, `pause()`, `seek(ms)` and `audioStatus()`, and the audio bar
gains a play and pause toggle, a position track that seeks, and the `study.audio.time` label. Formation's
story audio uses the same module.

## Alternatives

- Let the study service call the Audio port directly: breaks the rule that services are pure over the kernel
  and leaves the sim without a journal of what played.
- Play audio from the screen through expo-audio: breaks rule 2 and cannot be replayed or tested in the sim.

## Rules affected

Rule 4: `src/lib/kernel.ts` gains a module and `src/lib/domain/events.ts` gains two events, both shared
roots. No exception is needed once the proposal is accepted.
