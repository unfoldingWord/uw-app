# Media addresses for pictures on the device

Status: accepted in issue #6 (2026-09-30), as built; recorded in ADR 0009. architecture.md lists `Files.uriOf` and the `media` module.

## Problem

Story frames carry `Frame.image.path` and cached impact stories carry `ImpactStory.image.path`: paths under
the Files port root. A React Native `Image` needs an address (`file://` on a phone), and no port or kernel
fact turned a path into one, so the Formation session, the Study story reader, About and the Home invitation
showed an empty well instead of the picture (T11, T12 and T10 recorded the gap). A remote image URL is not
an option: it would be a network call outside the Http port.

## Change

- The Files port gains one read, `uriOf(path): string | undefined`: the address of a file that exists, and
  `undefined` for a directory, a missing file or a path that leaves the root. The platform adapter returns
  expo-file-system's `File(...).uri` under the device root; the memory adapter returns a stable
  `memory://device/<path>`. Both adapters and the port contract case land in the same change (rule 1).
  `scopedFiles` passes it through, since it writes nothing.
- A small kernel module, `media`, exposes `uriOf(path)` to feature services and answers only for files under
  `packs/` (outside `.staging` and `.inbox`) and `partners/images/`. It owns nothing, emits no event and
  keeps no snapshot: an address is a view of a file another module already owns and journals.
- Services map what screens show: `study.picture(frame)`, `formation.picture(frame)`,
  `ImpactStoryView.image` in About and `image` on the Home invitation card. A screen renders the picture
  under the bottom protection gradient from `design-system/readme.md`, and keeps the calm Ocean well when
  there is no address.

## Alternatives

- Put a `uri` on `Frame` and `ImpactStory` inside Corpus and Partners: couples two parsers to a rendering
  concern and to the platform's address scheme, and makes every snapshot and replay carry device paths.
- Let each feature service read the Files port: services see only the kernel (rule 2).
- Read the bytes and hand screens a `data:` URI: loads every picture into JavaScript memory and doubles it.

## Rules affected

Rule 1 (a new port capability gets both adapters in the same change: done), rule 4 (`src/lib/kernel.ts` and
`src/lib/ports.ts` are shared roots). Recorded in `docs/exceptions.md` until the scaffold PR merges or this
proposal is refused.
