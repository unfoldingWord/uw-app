# Provisional flavors for formation, audio and story images

Status: proposed, awaiting human approval. The code behind it is confined to named constants so that approval,
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
   | Theological formation | `parascriptural` | `x-obsMovements` | `ingredients/NN/<section>.md`, one Markdown file per section per story. Required: `key-idea`, `creedal-verse`, `summary`, `observation`, `translation`, `discourse`, `theological`, `journal`. Optional: `drafting`, `checking`, `conclusion`. The file name is the section id, so no parser depends on a localized heading |
   | Audio | `scripture` | `audioTranslation` (the Scripture Burrito 1.0 standard flavor) | one `audio/*` file per chapter, `scope` naming the book, e.g. `ingredients/RUT/RUT_001.mp3` |
   | Story images | `peripheral` | `x-obsImages` | `image/*` files under `ingredients/images/`, named by the basename of the CDN URL a frame cites (`obs-en-01-01.jpg`). Language tag `zxx` (no linguistic content) |

2. **Image overrides.** A language overrides a story image by carrying an `image/*` ingredient at the same path,
   `ingredients/images/<basename>`, inside its own Open Bible Stories burrito. Corpus resolves a frame's image by
   basename: the language's burrito first, then the Image Pack. The stories row admits these extra ingredients.

3. **Provenance in the metadata.** Scripture Burrito 1.0 fields only, no sidecar and no extension keys:
   - `identification.primary.dcs["{publisher}/{resource}"] = { revision: <release tag>, timestamp: <released> }`
   - `identification.upstream.dcs = [{ "{publisher}/{resource}": { revision: <commit sha>, timestamp } }]`, the
     repository revision the burrito was generated from
   - `idAuthorities.dcs = { id: "https://git.door43.org", name: { en: "Door43 Content Service" } }`
   - licence: `copyright.shortStatements[0].statement`, `copyright.licenses[0].url`, and `ingredients/LICENSE.md`
   - language: `languages[0].tag`

   `readProvenance(metadata)` in `src/lib/burrito/metadata.ts` reads exactly these. A burrito the app writes for a
   transfer or a share uses `buildBurrito`, which writes the same fields. Whether `go-rc2sb` writes the tag and the
   commit in these places is unverified from this environment; the live contract check will show it.

4. **Story helps versus book helps.** Both use `x-bcvnotes`, `x-bcvquestions` or `x-bcvarticles`. A burrito whose
   TSV ingredients carry no book `scope` is Story helps (one TSV, `tn_OBS.tsv` or `sq_OBS.tsv`, references
   `story:frame`); one whose TSVs name a book is Notes, Word Links or Questions, and each such TSV must name exactly
   one book. This is the repository's reading of "scoped to stories" and is unconfirmed against a generated
   `obs-tn` or `obs-sq` archive.

5. **The sim's catalog.** `sim/fixtures/catalog.json` is shaped like
   `GET https://git.door43.org/api/v1/catalog/search?stage=prod&topic=tc-ready` (`{ ok, data: [entry] }`, entries
   with `full_name`, `owner`, `name`, `branch_or_tag_name`, `commit_sha`, `subject`, `language`,
   `language_title`, `language_direction`, `language_is_gl`, `release`, `repo`, `zipball_url`, `ingredients`,
   `books`, `stage`, `released`). It is reconstructed from knowledge of the DCS API, because `git.door43.org` is
   unreachable from the build environment. `sim/fixtures/routes.json` maps each URL the memory Http adapter
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
