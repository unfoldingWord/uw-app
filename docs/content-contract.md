# Content contract

What the app accepts, stated so that both sides of the seam can check it: this repository with a validator over fixtures, and the Door43 Content Service team with the same validator over their releases. Words are in [`CONTEXT.md`](../CONTEXT.md).

## Supply

- Source: Door43 Content Service catalog, stage `prod`, topic `tc-ready`, any publisher.
- Form: Scripture Burrito 1.0.0 as emitted by `go-rc2sb`, one burrito per resource per release.
- Where it comes from: DCS generates a Scripture Burrito archive for every tagged release, the "Source Files as SB (ZIP)" link on a repository's releases page, at

  ```
  https://git.door43.org/{owner}/{repo}/sb/{tag}.zip
  ```

  The catalog API does not carry this URL, but every entry carries `full_name` and `branch_or_tag_name`, from which the Catalog module derives it. Verified on 2026-09-29 for the current production tags of the English core set, the Hebrew Bible, a gateway-language Translation Notes release and a Door43-catalog Open Bible Stories release.
- Archive layout: one top-level directory named for the repository, holding `metadata.json`, `ingredients/`, and repository files that are not part of the burrito (`README.md`, `.github/`, `.gitignore`). The Packs module keeps the burrito and discards the rest.
- The app never reads a Resource Container. If a release has no burrito archive, it is absent from the app; that is a supply gap to raise upstream, never a parser to write here.

Two asks of the DCS team remain, both narrow: the archive for the five-movement formation repository (`en_obs-tf`) fails to generate today, and audio is not yet part of any burrito. Exposing the archive URL in the catalog entry would remove the derivation, but nothing waits on it.

## Flavors the app admits

Pinned from the `rc2sb` mirrors on 2026-09-29 and confirmed against a generated release archive (`en_tq` v91). A burrito outside this table is ignored, and the validator says which row it failed.

| Resource | flavorType | flavor | Ingredients | Parsed as |
|---|---|---|---|---|
| Literal text, Simplified text, Hebrew, Greek | scripture | textTranslation | one USFM per book, `scope` naming the book | Text with alignment |
| Notes | parascriptural | x-bcvnotes | one TSV per book | Helps: Notes |
| Word Links | parascriptural | x-bcvarticles | one TSV per book | Helps: Word Links |
| Questions | parascriptural | x-bcvquestions | one TSV per book | Helps: Questions |
| Words, Academy | peripheral | x-peripheralArticles | Markdown tree plus `config.yaml` | Articles |
| Open Bible Stories | gloss | textStories | `content/01.md` to `content/50.md` | Stories and Frames |
| Story helps | parascriptural | x-bcvnotes, x-bcvquestions, x-bcvarticles, scoped to stories | one TSV | Helps on Stories |
| Theological formation | to pin | the `sb` archive for `en_obs-tf` returns a server error today; provisional form in [the proposal](proposals/2026-09-29-provisional-flavors.md) | | Movements on Stories |
| Audio | to pin | DCS marks audio attachments on releases; the burrito form is unconfirmed; provisional form in [the proposal](proposals/2026-09-29-provisional-flavors.md) | | Audio Pack |

Two rows are open and block the corresponding requirements (FO-2, ST-4) until DCS generates them. The validator treats them as unknown flavors, not failures, so the rest of the supply is usable meanwhile.

## What every burrito must carry

- `metadata.json` with `format: "scripture burrito"`, `meta.version`, `type.flavorType.name`, `type.flavorType.flavor.name`, `languages[0].tag`, `identification.name` and `identification.abbreviation`, `copyright.shortStatements[0].statement`.
- Every ingredient listed with `mimeType`, `size` and `checksum.md5`, and present on disk with that size and checksum.
- A licence ingredient or a copyright statement naming CC BY-SA 4.0. The app renders this as provenance; a burrito without it fails validation, because content without a licence cannot leave the device.

## What the app adds

The app writes burritos too: a pack offered in a transfer, or a share of a passage. What it writes must pass the same validator, and it adds nothing the standard does not allow. Provenance rides in the burrito's own metadata, never in a sidecar.

## The validator

`lib/burrito/validate` takes a directory and returns a report: the row matched, or the first rule broken with the path that broke it. It runs in `npm run contract` over every fixture burrito, and, when online, over one current release per row. The DCS team can run the same function over any candidate release before publishing it.

## Fixture language

`qaa` carries one burrito per admitted row, built from short public-domain and CC BY-SA snippets by `sim/fixtures/build.ts`, so the fixture is regenerable and stays under a few hundred kilobytes. `qab` carries stories only. These two are what every scenario installs; no scenario touches a real release.
