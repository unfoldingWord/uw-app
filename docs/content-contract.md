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
- Archive layout: one top-level directory named for the repository, holding `metadata.json`, `ingredients/`, and repository files that are not part of the burrito (`README.md`, `LICENSE.md`, `.github/`, `.gitea/`, `.gitignore`). The Packs module keeps the burrito and discards the rest.
- The app never reads a Resource Container. If a release has no burrito archive, it is absent from the app; that is a supply gap to raise upstream, never a parser to write here.

Two asks of the DCS team remain, both narrow: the archive for the five-movement formation repository (`en_obs-tf` v4) fails to generate today (HTTP 500), and audio is published as release assets rather than in a burrito. Exposing the archive URL in the catalog entry would remove the derivation, but nothing waits on it.

## Flavors the app admits

Observed on 2026-09-29 in GitHub Actions run 36618141715, which paged the whole production `tc-ready` catalog (322 entries, 50 a page, `x-total-count` and a `Link` header) and opened the `sb` archive of 17 current releases: the English core set, the Hebrew Bible, the Greek New Testament, a gateway literal and simplified pair (`es-419_glt`, `es-419_gst`) and a Door43-catalog Open Bible Stories (`sw_obs`). Every archive was generated on request by `go-rc2sb` v0.5.0. A burrito outside this table is ignored, and the validator says which row it failed. The catalog entry carries its own `flavor_type` and `flavor`, which do not always agree with the burrito's; the burrito's are the ones the app reads.

| Resource | flavorType | flavor | Ingredients | Parsed as |
|---|---|---|---|---|
| Literal text, Simplified text, Hebrew, Greek | scripture | textTranslation | one `BBB.usfm` per book, listed as `text/plain` (older burritos say `text/x-usfm`; both are accepted, and USFM is told by the `.usfm` extension), `scope` naming the book with an empty chapter list. `FRT.usfm` front matter and books with no verse are listed, and are not shown as books | Text with alignment |
| Notes | parascriptural | x-bcvnotes | one `BBB.tsv` per book | Helps: Notes |
| Word Links | parascriptural | x-bcvarticles | one `BBB.tsv` per book; `TWLink` is a path into the burrito, `./payload/names/paul.md`. The burrito also carries the whole Words dictionary under `payload/`, which the app does not read from here | Helps: Word Links |
| Questions | parascriptural | x-bcvquestions | one `BBB.tsv` per book | Helps: Questions |
| Words | parascriptural | x-bcvarticles, from a repository whose code is `tw` (`en_tw`, `mr_tW`) | Markdown under `payload/{kt,names,other}/` plus `payload/config.yaml`; its book TSVs are not read. The catalog calls it `peripheral/x-peripheralArticles` | Articles; `payload/kt/god.md` is the same article as `rc://*/tw/dict/bible/kt/god` |
| Academy (and Words, if ever emitted so) | peripheral | x-peripheralArticles | `<manual>/<slug>/{01.md,title.md,sub-title.md}` plus `<manual>/config.yaml` and `<manual>/toc.yaml` | Articles |
| Open Bible Stories | gloss | textStories | `content/01.md` to `content/50.md`, each scoped to the Bible passages it tells | Stories and Frames |
| Story helps | peripheral | x-obsnotes, x-obsquestions | one unscoped `OBS.tsv`. The catalog calls them `parascriptural/x-notes` and `x-questions` | Helps on Stories |
| Story helps | parascriptural | x-bcvnotes, x-bcvquestions, x-bcvarticles, when no TSV names a book other than `OBS` | one `OBS.tsv`, scoped `{OBS: []}` for `obs-twl` (whose links stay `rc://`) | Helps on Stories |
| Theological formation | to pin | the catalog lists `en_obs-tf` v4 as `peripheral/x-OBSTheologicalFormation`; its `sb` archive still returns HTTP 500. Provisional form in [the proposal](proposals/2026-09-29-provisional-flavors.md) | | Movements on Stories |
| Audio | to pin | audio is not in any burrito: DCS publishes it as release assets, one `.m4a` per story (`ahr_obs_v1_01_128kbps.m4a`), flagged by `attachment_types.audio`. Provisional form in [the proposal](proposals/2026-09-29-provisional-flavors.md) | | Audio Pack |

Words and Word Links are both `x-bcvarticles` with the same layout, so the only thing that tells them apart in the burrito is the repository code in `identification.primary`: `tw` is Words, anything else is Word Links. The catalog subject (`Translation Words`, `TSV Translation Words Links`) agrees.

Two rows are open and block the corresponding requirements (FO-2, ST-4) until DCS generates them. The validator treats them as unknown flavors, not failures, so the rest of the supply is usable meanwhile. Not yet sampled: `en_obs-sn` (expected `x-obsnotes`), the one non-TSV `OBS Translation Questions` release (`peripheral/x-OBSTranslationQuestions`, ignored today), the 16 `ts` OBS repositories, `en_t4t`, `en_bsb` and the Arabic and Russian Bibles.

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

A transfer sends each installed burrito as it arrived from DCS, byte for byte, and must pass the same validator; the app adds nothing to it. What the metadata cannot say (the tag) travels in the transfer offer beside the commit, never in a sidecar file. `buildBurrito` in `src/lib/burrito/build.ts` writes the same shape as `go-rc2sb` and is used by the fixtures and tests.

## The validator

`lib/burrito/validate` takes a directory and returns a report: the row matched, or the first rule broken with the path that broke it. It runs in `npm run contract` over every fixture burrito, and, when online, over the whole production catalog and one current release per row and form (`scripts/contract-live.ts`), checking that each lands on its row and that the literal and simplified pair read as such. In CI it also installs nine real English releases through the kernel on memory adapters and reads a passage, a story and a Words article from them (`scripts/contract-ingest.ts`). Offline, the live part is skipped and never fails. The DCS team can run the same function over any candidate release before publishing it.

## Fixture language

`qaa` carries one burrito per admitted row and form, built from short public-domain and CC BY-SA snippets by `sim/fixtures/build.ts`, so the fixture is regenerable and stays under a few hundred kilobytes. The fixtures copy the observed shapes: the `go-rc2sb` metadata, `revision` as the commit, `text/plain` USFM with a front matter file and a stub book, Words and Word Links as `x-bcvarticles` with a `payload/` tree, story helps as one `OBS.tsv`, and a statement that names no licence. One deliberate difference: a fixture book holds one chapter, so its scope names that chapter, where a real release leaves the list empty for a whole book. `sim/fixtures/catalog.json` carries every key a real catalog entry has, and the memory Http adapter serves it in pages of 50 with `x-total-count` and `Link` headers. `qab` carries stories only. These two are what every scenario installs; no scenario touches a real release.
