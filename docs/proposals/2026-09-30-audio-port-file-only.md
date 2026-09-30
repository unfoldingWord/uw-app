# Remove the URL source from the Audio port

Status: approved by the download-only decision of issue #53 (PRD decision log row 73), carried out in
issue #63.

## Problem

Audio is download-only in v1.0.0: it plays from an Audio Pack on the phone (ST-4). The Audio port still
accepted `{ kind: 'url', url }`, so the kernel kept an allowlist wrapper for it (`allowlistedAudio` in
`src/lib/scope.ts`), the platform adapter resolved a stream with a `HEAD` request through Http, and the sim
tested refusing a stream from a tracker host. None of it is reachable from a screen, and an unused way to
reach the network is a liability.

## Change

- `src/lib/ports.ts`: `AudioSource` is `{ kind: 'file'; path: string }` only. The `kind` stays, so every
  caller that builds a file source is unchanged.
- `src/lib/scope.ts` and `src/lib/compose.ts`: `allowlistedAudio` is removed; modules get the Audio port as
  it is, and the Player still refuses a file outside `packs/`.
- `src/platform/audio.ts` and `src/platform/ports.ts`: the adapter no longer takes the host policy or Http
  and resolves only a file's media address.
- `sim/adapters/audio.ts`, `sim/player.test.ts`, `sim/kernel-reactions.test.ts` and the ST-4 scenario drop the
  stream cases; the overlapping-loads test now uses a second file, the story Audio Pack.

## Alternatives

- Keep the URL source for v1.1 streaming. Streaming is revisited when DCS carries audio (row 73); adding it
  back then is one union member and one resolver, and it should come with its own proposal and host.

## Rules affected

- Rule 4: `src/lib/ports.ts`, `src/lib/compose.ts` and `src/platform/` are shared roots; this narrows them. No
  rule is broken, so there is no row in `docs/exceptions.md`.
- AGENTS.md section 10 (network calls only through Http to allowlisted hosts) holds more simply: audio makes no
  network call at all.
