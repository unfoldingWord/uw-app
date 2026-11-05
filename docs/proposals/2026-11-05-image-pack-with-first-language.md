# Install the Image Pack with the first language

Status: proposed, awaiting a decision. Issue #97, change 1.

## Problem

Open Bible Stories frames have no pictures until a leader finds Languages → Extras or the Library card and
downloads the Image Pack. Onboarding installs only the language pack (`src/features/onboarding/service.ts`), as
LA-3, ADR 0006 and the PRD's "optional" pack say. Since 2026-11-05 the story reader says so in the picture well and
offers a one-tap download, but a fresh install still opens its first story without pictures.

## Change

Install the Image Pack (about 31 MB for the 598 pictures at 360px) with the first language pack, behind the same
"download over this connection" consent, so stories have pictures by default. Record it in the PRD decision log,
since it changes LA-3's "optional".

## Alternatives

- **Keep it optional, with the in-place download (today).** Smallest first download; pictures are one tap away
  from every frame that needs one.
- **Offer it as a second step at the end of onboarding.** One more decision for the leader at the moment they want
  to start reading.

## Rules affected

- PRD LA-3 and the decision log; ADR 0006 if the pack stops being optional.
- No architecture rule. The install already exists (`packs.installFromCatalog(imagePackId)`).
