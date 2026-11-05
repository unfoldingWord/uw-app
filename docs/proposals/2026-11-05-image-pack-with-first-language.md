# Install the Image Pack with the first language

Status: approved by the requirements owner on 2026-11-05 ("Go with your suggestions"). Issue #97, change 1. Recorded
as PRD decision 98.

## Problem

Open Bible Stories frames have no pictures until a leader finds Languages → Extras or the Library card and
downloads the Image Pack. Onboarding installs only the language pack (`src/features/onboarding/service.ts`), as
LA-3, ADR 0006 and the PRD's "optional" pack say. Since 2026-11-05 the story reader says so in the picture well and
offers a one-tap download, but a fresh install still opens its first story without pictures.

## Change

Install the Image Pack (about 31 MB for the 598 pictures at 360px) with the first language pack, behind the same
tap that starts the language download, so stories have pictures by default:

- When a language pack is started from onboarding or Languages, and no installed language pack carries stories, the
  Image Pack is not on the phone, the catalog offers it, and the chosen language's default pack has stories, the
  Image Pack install is queued right after the language pack (`picturesFollow` in `src/lib/packs/plan.ts`).
- The Languages row states the size the leader agrees to, with the pictures added when they will follow
  ("about 31 MB with story pictures"). Onboarding's language list states no size, so its copy is unchanged.
- Home keeps its progress card while the pictures arrive ("Downloading story pictures").
- The Image Pack stays its own pack. A picture failure leaves the language pack whole (LA-2 partial semantics), a
  later language never downloads the pictures again, and pictures a leader removed stay removed while a language
  with stories is on the phone. The reader's in-place "Download story pictures" and Languages → Extras remain for
  when the pictures are missing.

Recorded in the PRD decision log. LA-3's single shared pack is unchanged; ADR 0006 is unchanged because the pack is
still written by the app and still removable.

## Alternatives

- **Keep it optional, with the in-place download (today).** Smallest first download; pictures are one tap away
  from every frame that needs one.
- **Offer it as a second step at the end of onboarding.** One more decision for the leader at the moment they want
  to start reading.

## Rules affected

- PRD LA-3 and the decision log (decision 98). ADR 0006 is not changed: the pack stays optional and separate.
- No architecture rule. The install already exists (`packs.installFromCatalog(imagePackId)`); the decision is a pure
  planning function beside the other pack plans, called by the onboarding and languages services.
- The 31 MB figure is an estimate (`imagePackApproximateBytes` in `src/lib/catalog/built.ts`): the catalog has no
  size for app-built picture packs, and the figure was not re-measured against the CDN in this change.
