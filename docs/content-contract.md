# Content contract

What the app accepts, stated so that both sides of the seam can check it: this repository with a validator over fixtures, and the Door43 Content Service team with the same validator over their releases. Words are in [`CONTEXT.md`](../CONTEXT.md).

## Supply

- Source: Door43 Content Service catalog, stage `prod`, topic `tc-ready`, any publisher.
- Form: Scripture Burrito 1.0.0 as emitted by `go-rc2sb`, one burrito per resource per release.
- Where it comes from: DCS generates a Scripture Burrito archive on request for every tagged release, the "Source Files as SB (ZIP)" link on a repository's releases page, at

  ```
  https://git.door43.org/{owner}/{repo}/sb/{tag}.zip
  ```

  The catalog API does not carry this URL, but every entry carries `full_name` and `branch_or_tag_name`, from which the Catalog module derives it. Verified on 2026-09-29 (CI run 36618141715) for 17 current production releases; every one answered with a zip except `en_obs-tf` v4.
- Language names: on every refresh the Catalog module also reads `GET /api/v1/catalog/list/languages?stage=prod&topic=tc-ready` and keeps, per language code `lc`, the anglicised name `ang`, the autonym `ln` and the direction `ld` (`gw` is ignored). The list is optional: when it fails, the refresh still succeeds, the names from the last good list stay, and a table of ISO 639 names is the fallback. The fixture copies this shape (INFERRED from issue #14; the live contract step asserts it).
- Archive layout: one top-level directory named for the repository, holding `metadata.json`, `ingredients/`, and repository files that are not part of the burrito (`README.md`, `LICENSE.md`, `.github/`, `.gitea/`, `.gitignore`). The Packs module keeps the burrito and discards the rest.
- The app never reads a Resource Container. If a release has no burrito archive, it is absent from the app; that is a supply gap to raise upstream, never a parser to write here.

One ask of the DCS team remains: the archive for the five-movement formation repository (`en_obs-tf` v4) fails to generate today (HTTP 500). Audio and the story pictures are no longer asks: the app writes a burrito around the release assets and the CDN pictures (ADR 0006). Exposing the archive URL in the catalog entry would remove the derivation, but nothing waits on it.

## Flavors the app admits

Observed on 2026-09-29 in GitHub Actions run 36618141715, which paged the whole production `tc-ready` catalog (322 entries, 50 a page, `x-total-count` and a `Link` header) and opened the `sb` archive of 17 current releases: the English core set, the Hebrew Bible, the Greek New Testament, a gateway literal and simplified pair (`es-419_glt`, `es-419_gst`) and a Door43-catalog Open Bible Stories (`sw_obs`). Every archive was generated on request by `go-rc2sb` v0.5.0. A burrito outside this table is ignored, and the validator says which row it failed. The catalog entry carries its own `flavor_type` and `flavor`, which do not always agree with the burrito's; the burrito's are the ones the app reads.

| Resource | flavorType | flavor | Ingredients | Parsed as |
|---|---|---|---|---|
| Literal text, Simplified text, Hebrew, Greek | scripture | textTranslation | one `BBB.usfm` per book, listed as `text/plain` (older burritos say `text/x-usfm`; both are accepted, and USFM is told by the `.usfm` extension), `scope` naming the book with an empty chapter list. `FRT.usfm` front matter and books with no verse are listed, and are not shown as books. `go-rc2sb` lists a USFM file whose id is not one of the 66 books (`FRT`, `BAK`, `GLO`, the deuterocanon, `XXA` to `XXG`) with no `scope` at all (CI run 36629971685); such a file is accepted unscoped or scoped to its own id, and at least one USFM ingredient must name a book of the Bible | Text with alignment |
| Notes | parascriptural | x-bcvnotes | one `BBB.tsv` per book | Helps: Notes |
| Word Links | parascriptural | x-bcvarticles | one `BBB.tsv` per book; `TWLink` is a path into the burrito, `./payload/names/paul.md`. The burrito also carries the whole Words dictionary under `payload/`, which the app does not read from here. When the Words burrito is in the same language pack, the app keeps one copy of each article listed with the same path, size and md5 in both, and puts it back when the Word Links burrito is read to leave the phone, so what a transfer sends is still the burrito as it arrived | Helps: Word Links |
| Questions | parascriptural | x-bcvquestions | one `BBB.tsv` per book | Helps: Questions |
| Words | parascriptural | x-bcvarticles, from a repository whose code is `tw` (`en_tw`, `mr_tW`) | Markdown under `payload/{kt,names,other}/` plus `payload/config.yaml`; its book TSVs are not read. The catalog calls it `peripheral/x-peripheralArticles` | Articles; `payload/kt/god.md` is the same article as `rc://*/tw/dict/bible/kt/god` |
| Academy (and Words, if ever emitted so) | peripheral | x-peripheralArticles | `<manual>/<slug>/{01.md,title.md,sub-title.md}`, with `<manual>/config.yaml` (dependencies; optional, since `bahtraku/id_ta` v30 ships `checking/` without one) and `<manual>/toc.yaml` | Articles |
| Open Bible Stories | gloss | textStories | `content/01.md` to `content/50.md`, each scoped to the Bible passages it tells | Stories and Frames |
| Story helps | peripheral | x-obsnotes, x-obsquestions | one unscoped `OBS.tsv`. The catalog calls them `parascriptural/x-notes` and `x-questions` | Helps on Stories |
| Story helps | parascriptural | x-bcvnotes, x-bcvquestions, x-bcvarticles, when no TSV names a book other than `OBS` | one `OBS.tsv`, scoped `{OBS: []}` for `obs-twl` (whose links stay `rc://`) | Helps on Stories |
| Theological formation | to pin | the catalog lists `en_obs-tf` v4 as `peripheral/x-OBSTheologicalFormation`; its `sb` archive still returns HTTP 500. Provisional form in [the proposal](proposals/2026-09-29-provisional-flavors.md) | | Movements on Stories |
| Audio (written by the app, ADR 0006) | scripture | audioTranslation | DCS publishes audio as release assets, one `.m4a` per story (`ahr_obs_v1_01_128kbps.m4a`) or chapter, flagged by `attachment_types.audio`. The app downloads them and writes the burrito: `ingredients/OBS/OBS_NN.m4a` scoped `{OBS: [n]}` for Open Bible Stories, `ingredients/BBB/BBB_CCC.m4a` scoped `{BBB: [c]}` for a Bible, `audio/mp4` (or `audio/mpeg`), provenance from the release's catalog entry and licence from the `LICENSE.md` at its tag. One asset per story or chapter: the first by name when several bit rates are listed | Audio Pack |
| Story images (written by the app, ADR 0006) | peripheral | x-obsImages | The app downloads every 360px picture the `unfoldingWord/en_obs` stories cite (`https://cdn.door43.org/obs/jpg/360px/obs-en-NN-NN.jpg`, 598 on the live release) to `ingredients/images/<basename>`, `image/jpeg`, language `zxx`, with provenance and licence from the `en_obs` release it read them from. A language overrides one by carrying `ingredients/images/<basename>` in its own stories burrito | Image Pack |

Words and Word Links are both `x-bcvarticles` with the same layout, so the only thing that tells them apart in the burrito is the repository code in `identification.primary`: `tw` is Words, anything else is Word Links. The catalog subject (`Translation Words`, `TSV Translation Words Links`) agrees.

One row is open and blocks FO-2 on live data until DCS generates it: formation, which is also left out of the default language pack until then. The validator treats them as unknown flavors, not failures, so the rest of the supply is usable meanwhile. Not yet sampled: `en_obs-sn` (expected `x-obsnotes`), the one non-TSV `OBS Translation Questions` release (`peripheral/x-OBSTranslationQuestions`, ignored today), the 16 `ts` OBS repositories, `en_t4t`, `en_bsb` and the Arabic and Russian Bibles.

## What every burrito must carry

- `metadata.json` with `format: "scripture burrito"`, `meta.version`, `type.flavorType.name`, `type.flavorType.flavor.name`, `languages[0].tag`, `identification.name` and `identification.abbreviation`, `copyright.shortStatements[0].statement` (its `mimetype` and `lang` are optional; `en_obs` has neither).
- Every ingredient listed with `mimeType`, `size` and `checksum.md5`, and present on disk with that size and checksum.
- A licence ingredient or a copyright statement naming CC BY-SA 4.0. Every sampled release carries `ingredients/LICENSE.md` naming it; some statements do not (`Copyright © 2023 by unfoldingWord`). When the statement names no licence, the app shows the statement followed by the licence the LICENSE ingredient names (`Copyright © 2023 by unfoldingWord, CC BY-SA 4.0`). A burrito without either fails validation, because content without a licence cannot leave the device.

## Provenance

- `identification.primary.dcs` has one key, the repository the RC manifest names, which can differ from the catalog's `full_name` (`Door43/sw_obs` for `Door43-Catalog/sw_obs`, `Idiomas-Puentes/es-419_tpl` for `es-419_gl/es-419_glt`). Its `revision` is the commit. There is no tag and no `upstream` anywhere in `metadata.json`, and `timestamp` and `meta.dateCreated` are the moment the archive was generated, not the release date, so the archive's bytes differ on every download.
- The app therefore takes publisher, resource, tag and release date (`released`) from the catalog entry it downloaded, and the commit from the catalog and the burrito, which agree.
- A peer's offer names the release as the sender recorded it, and the commit; the receiver refuses a burrito whose revision is not the offered commit.
- A file carries no tag. When the catalog on the phone lists a release with the burrito's commit, the file takes that release's publisher, resource and tag. Otherwise it keeps the repository named in the burrito and the tag `unrecorded`, and an update from the catalog replaces it.

## What the app adds

The app writes exactly two kinds of burrito itself, around assets the catalog lists (ADR 0006): the Image Pack and an Audio Pack, in the rows above. They are written into the install's staging directory, checked by the same validator as a DCS burrito (rows `status: 'app-written'`), and never carry anything that did not come from the catalog entry, the release's assets or its repository licence. A transfer sends each installed burrito as it arrived from DCS, byte for byte, and must pass the same validator; the app adds nothing to it. What the metadata cannot say (the tag) travels in the transfer offer beside the commit, never in a sidecar file. `buildBurrito` in `src/lib/burrito/build.ts` writes the same shape as `go-rc2sb` and is used by the fixtures and tests.

## The validator

`lib/burrito/validate` takes a directory and returns a report: the row matched, or the first rule broken with the path that broke it. It runs in `npm run contract` over every fixture burrito, and, when online, over the whole production catalog and one current release per row and form (`scripts/contract-live.ts`), checking that each lands on its row and that the literal and simplified pair read as such. In CI it also runs the kernel on memory adapters over the real catalog (`scripts/contract-ingest.ts`): it asserts at least 300 paged entries, 190 languages and the shape of the languages list, builds `defaultReleases` for `en` and `id` and installs them, builds the Image Pack from the pictures `en_obs` cites, reads a passage with its helps, story 1 with its pictures and a Words article, asserts that `en_tn` attaches at least 95 percent of its quoted notes in a sample of books, and prints each pack's measured size on the phone and its download size, so the run records PRD 8.4's numbers. Offline, the live part is skipped and never fails. The DCS team can run the same function over any candidate release before publishing it.

## Fixture language

`qaa` carries one burrito per admitted row and form, built from short public-domain and CC BY-SA snippets by `sim/fixtures/build.ts`, so the fixture is regenerable and stays under a few hundred kilobytes. The fixtures copy the observed shapes: the `go-rc2sb` metadata, `revision` as the commit, `text/plain` USFM with a front matter file and a stub book, Words and Word Links as `x-bcvarticles` with a `payload/` tree, story helps as one `OBS.tsv`, and a statement that names no licence. One deliberate difference: a fixture book holds one chapter, so its scope names that chapter, where a real release leaves the list empty for a whole book. `sim/fixtures/catalog.json` carries every key a real catalog entry has, and the memory Http adapter serves it in pages of 50 with `x-total-count` and `Link` headers. `qaa` also carries two texts outside the publisher's own pair, `unfoldingWord/qaa_t4t` and `Worldview/qaa_bsb`, and a second publisher's stories (`Door43-Catalog/qaa_obs`), so the default pack and the optional downloads can be told apart. `qab` carries stories only. These two are what every scenario installs; no scenario touches a real release.
