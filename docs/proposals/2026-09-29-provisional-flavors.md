# Provisional flavors for formation, audio and story images

Status: proposed, awaiting human approval. Revised 2026-09-29 after GitHub Actions run 36618141715 read the real
catalog and archives (see "Revision" at the end). The code behind it is confined to named constants so that approval,
rejection or an upstream pin changes one place.

## Problem

`docs/content-contract.md` admits seven pinned rows and leaves two open: the five-movement formation content
(the `sb` archive for `en_obs-tf` fails to generate) and audio (no burrito form confirmed). A third resource has no
row at all: the Open Bible Stories images that LA-3 ships as one shared Image Pack, with per-language overrides.
FO-2, FO-5, ST-4, LA-3 and LA-4 cannot be proven in the sim without a burrito for each, and the fixture language
`qaa` is meant to carry "a real burrito for every resource type" (`CONTEXT.md`). Waiting for DCS leaves those
requirements with no scenario; inventing flavors silently would let a guess harden into the contract.

Four smaller shapes are also unpinned, and every later task (Catalog, Packs, Corpus, Formation) reads them:
where provenance sits in `metadata.json`, how story helps are told apart from book helps, how an image override is
carried, and the shape of the catalog the sim serves.

## Change

1. **Provisional rows, one constant.** `src/lib/burrito/flavors.ts` exports `provisionalFlavors` and holds three
   rows marked `status: 'provisional'` beside the seven pinned ones. `validate(files)` admits both by default and
   reports the row's status; `validate(files, { rows: pinnedRows })` is the contract exactly as written, and treats
   the provisional flavors as unknown (ignored, not failed). When DCS pins a form, the constant and the row's
   ingredient check change and the fixtures regenerate with `npm run fixtures`; nothing else names the flavor.

   | Row | flavorType | flavor | Ingredients |
   |---|---|---|---|
   | Theological formation | `peripheral` | `x-OBSTheologicalFormation` (the catalog's flavor for `en_obs-tf` v4 and `id_obs-tf` v0.1.0; the burrito's is unknown because its `sb` archive returns HTTP 500) | `ingredients/NN/<section>.md`, one Markdown file per section per story. Required: `key-idea`, `creedal-verse`, `summary`, `observation`, `translation`, `discourse`, `theological`, `journal`. Optional: `drafting`, `checking`, `conclusion`. The file name is the section id, so no parser depends on a localized heading |
   | Audio | `scripture` | `audioTranslation` (the Scripture Burrito 1.0 standard flavor) | one `audio/*` file per chapter, `scope` naming the book, e.g. `ingredients/RUT/RUT_001.mp3` |
   | Story images | `peripheral` | `x-obsImages` | `image/*` files under `ingredients/images/`, named by the basename of the CDN URL a frame cites (`obs-en-01-01.jpg`). Language tag `zxx` (no linguistic content) |

2. **Image overrides.** A language overrides a story image by carrying an `image/*` ingredient at the same path,
   `ingredients/images/<basename>`, inside its own Open Bible Stories burrito. Corpus resolves a frame's image by
   basename: the language's burrito first, then the Image Pack. The stories row admits these extra ingredients.

3. **Provenance in the metadata.** Superseded by what `go-rc2sb` v0.5.0 writes (run 36618141715):
   - `identification.primary.dcs["{owner}/{repo}"] = { revision: <commit sha>, timestamp: <generation time> }`;
     the key is the repository the RC manifest names and can differ from the catalog's `full_name`
   - no tag and no `upstream` anywhere; `timestamp` and `meta.dateCreated` are the request time, not the release
   - `idAuthorities.dcs = { id: "https://git.door43.org", name: { en: "Door43 Content Service" } }`
   - licence: `copyright.shortStatements[0].statement` (sometimes naming no licence, sometimes without `mimetype`
     and `lang`) and `ingredients/LICENSE.md`, which names CC BY-SA 4.0 in every sampled release
   - language: `languages[0].tag`

   `readProvenance(metadata)` in `src/lib/burrito/metadata.ts` reads the commit from `revision` and leaves the tag
   `unrecorded`. Packs takes publisher, resource, tag and release date from the catalog entry it downloaded, from
   the peer's offer (which also carries the commit, checked against `revision`), or, for a file, from the catalog
   release on the phone whose `commit_sha` is the burrito's `revision`. A file the catalog does not list keeps the
   tag `unrecorded`. `buildBurrito` writes the `go-rc2sb` shape and is used only by fixtures and tests.

4. **Story helps versus book helps.** Pinned by run 36618141715 and now in the contract: `obs-tn` is
   `peripheral/x-obsnotes`, `obs-sq` and `obs-tq` are `peripheral/x-obsquestions`, each one unscoped `OBS.tsv`;
   `obs-twl` is `parascriptural/x-bcvarticles` with `OBS.tsv` scoped `{OBS: []}`. A `parascriptural` burrito
   whose TSVs name no book other than `OBS` is Story helps; one whose TSVs name a book is Notes, Word Links or
   Questions.

5. **The sim's catalog.** `sim/fixtures/catalog.json` is shaped like
   `GET https://git.door43.org/api/v1/catalog/search?stage=prod&topic=tc-ready` (`{ ok, data: [entry] }`, entries
   with every top-level key a real entry has, including `tarbar_url` as DCS spells it, `flavor_type`, `flavor`,
   `attachment_types` and `repo.catalog`, and `last_updated` beside `data`). It copies entry 2 of the real
   catalog (run 36618141715). The memory Http adapter serves it in pages of 50 with `x-total-count` and `Link`. `sim/fixtures/routes.json` maps each URL the memory Http adapter
   serves (catalog search, language list, and `https://git.door43.org/{owner}/{repo}/sb/{tag}.zip` per release) to
   a file under `sim/fixtures/`. Formation, audio and images appear in it with subjects `OBS Theological
   Formation`, `Bible Audio` and `OBS Images`, which are provisional in the same way as their flavors.

## Alternatives

- **Wait for DCS.** Honest, but leaves FO-2, FO-5, ST-4, LA-3 and LA-4 with no scenario for an unknown time.
- **A project-owned converter for `en_obs-tf` and audio.** ADR 0002 names this as the fallback. It is a service to
  build and run, and a second parser; it is a larger decision than the fixtures need today.
- **Custom `x-` keys for provenance** (for example `x-provenance` in `meta`). Simpler to read, but other burrito
  tools may drop or refuse unknown keys, and the contract says the app adds nothing the standard does not allow.
- **Localized Markdown headings for movements in one file per story.** Closer to how the formation repository is
  written today, but every parser would need the heading in every language.

## Rules affected

- **Rule 1** (a new content flavor starts as a row in `docs/content-contract.md`): the provisional rows exist in
  code and fixtures before the contract pins them. Recorded in `docs/exceptions.md`. The contract's two open rows
  point here; the Image Pack gets a contract row when this is approved.
- **Rule 5**: the exception entry is written in the same commit as the code.
- No shared root in rule 4 is touched. `src/lib/burrito/` is new, pure and imports only `fflate` and
  `@noble/hashes`.

## Revision after the first real read (2026-09-29, run 36618141715)

- **Formation.** The provisional row now uses the catalog's flavor, `peripheral/x-OBSTheologicalFormation`, and the
  fixture `en_obs-tf` follows the catalog tag, v4. The `sb` archive for `en_obs-tf` v4 still returns HTTP 500, so
  the burrito's own flavor and layout remain unknown; the row stays provisional and the file layout above is still
  the repository's guess.
- **Audio.** Audio is not in any burrito. DCS publishes it as release assets, one AAC `.m4a` per story
  (`ahr_obs_v1_NN_128kbps.m4a`, 52 on `OBS-TLF/ahr_obs` v1), flagged by `attachment_types.audio` and `stream`
  in the catalog entry. The provisional `scripture/audioTranslation` row and its fixture stay as they are, so ST-4
  and LA-4 keep a scenario, but that row will not be what DCS supplies. **Open question for a human decision:**
  should an Audio Pack be built from release assets rather than a burrito? That needs (a) a way to carry
  provenance and the licence for files that have no `metadata.json` (the release's catalog entry, or a burrito the
  app writes around the downloaded files), (b) an audio row keyed by story rather than by Bible chapter, since
  `audioEntries` today needs a book scope and would drop OBS audio, and (c) `audio/mp4` in the admitted types.
  It also reopens ADR 0002 (content enters only as a burrito). Nothing is built until that is decided.
- **Images.** Unchanged; no image release was sampled.

