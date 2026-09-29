# Strings awaiting native review

Every locale file under `src/lib/strings/locales/` lists every key of the English table. The fifteen
translations were written by an AI agent on 2026-09-29, not by native speakers, and none has been reviewed.
Release criterion 6 asks for complete strings; complete here means every key has a value, not that the value
is right. Until a native speaker signs off a locale, treat it as a draft.

How to review: read the English table by area (`src/lib/strings/en/*.ts`), then the locale file key by key.
Change a value in place; set it to `null` to fall back to English for that key while a better wording is found.
`npm run checks` reports placeholders, plural forms and the voice rules; it cannot judge meaning or tone.

## What every reviewer should check

- **Register.** The English is second person, calm and plain. The drafts use: `tú` (es-419), `vous` (fr),
  `você` (pt-BR), `je` (nl), `Anda` (id), `вы` (ru), `आप` (hi), `আপনি` (bn), `آپ` (ur), `شما` (fa), the
  imperative (ar, sw, vi, zh-Hans), and a polite register (my). Confirm each suits church leaders.
- **Church vocabulary.** The words for Formation, Foundations, Training, Topics, the five movements
  (Observation, Translation, Discourse, Theological, Journal), key idea, creedal verse, session and group. These
  are the least certain in every language; `nav.formation`, `formation.*`, `movement.*` and `session.*` first.
- **Resource names.** The Open Bible Stories title in each language (`resource.stories`,
  `home.saved.story`, `search.kind.story`) should match what the published translation calls itself.
  "Literal" and "simplified" (`study.text.*`, `resource.literal`, `resource.simplified`) should read as plain
  words, not product names.
- **The partner invitation and About.** `invitation.body`, `about.partner.body`, `licence.partners`: relational,
  honest and measured, never transactional. "The unreached" is a term of art in English; check it is not
  heard as a slight.
- **Privacy.** `privacy.*` states the analytics policy of PRD section 9. A reviewer should confirm each count
  says exactly what the English says, since the policy is binding.
- **Failures.** `failure.*` must stay calm; no word that reads as an alarm or an error code. Four keys
  were drafted after the rest, when Packs, Corpus and the kernel added their codes: `failure.http.cancelled`,
  `failure.kernel.not-owned`, `failure.kernel.observer-failed` and `failure.corpus.unreadable`. The two kernel
  keys describe an inner fault in plain words; check they do not read as blame or as a warning.
  `failure.transfer.cancelled` was drafted later still, with Transfer: it is shown on both phones when either
  one stops a transfer, so it must not read as the other person's fault.
  `privacy.count.transfersByPlatformPair` was drafted at the Transfer merge: it names the kind of phone
  (iPhone or Android) at each end, and must not read as naming a person or a device.
- **Drafted in T8.** Six keys were added with the feature services and drafted in every locale at once:
  `failure.partners.invalid-feed`, `settings.reducedBlur`, `settings.reducedBlur.about`,
  `impact.securityNote`, `resource.wordLinks` and `resource.wordLinks.about`. `impact.securityNote` is a
  placeholder until comms supplies the website's security note (`docs/impact-stories.md`); a story that carries
  its own note shows that note instead.
- **Drafted with the Transfer, Share and diagnostics services.** `transfer.code`, `transfer.code.hint` and
  `transfer.nothing`. The code is the four digits both phones show while they pair; the word for it should be
  the one people use for a short number read aloud, not a password or a PIN.
- **Drafted in T11.** Seven keys were added with the Study screens and drafted in every locale at once:
  `study.helps.showResponse`, `study.helps.hideResponse`, `study.noLanguage`, `study.noLanguage.action`,
  `library.download`, `library.onPhone` and `search.fullText.inSettings`. `library.download` interpolates a
  resource title such as "Greek New Testament"; check the verb agrees with it where the language inflects.
- **Search examples.** `search.placeholder` and `search.empty` use Ruth 2 and covenant as examples; the book
  name and the word should be the ones a reader in that language would type.

## Per locale

| Locale | Areas needing the closest review |
|---|---|
| es-419 | `tú` versus `usted`; "Colabora" for partner; `formation.*` |
| fr | Non-breaking spaces before `:` and `?` are plain spaces; "Histoires Bibliques Libres" as the OBS title |
| pt-BR | "Seja parceiro" wording; "encontro" for session |
| nl | Language names are interpolated without "het"; check sentences that read awkwardly with an autonym |
| id | "Pembinaan" for Formation; "Cerita Alkitab Terbuka" as the OBS title |
| sw | Noun-class agreement in plural forms (`library.*`, `transfer.selected`); "Malezi" for Formation |
| vi | "Đào tạo" for Formation; "Câu Chuyện Kinh Thánh Mở" as the OBS title |
| ru | "Формирование" for Formation (was "Наставничество", mentoring); the `other` plural form, used for fractions only |
| hi | "शिष्यता" for Formation; greetings by time of day |
| bn | "শিষ্যত্ব" for Formation; Bengali digits in `search.placeholder` |
| zh-Hans | "造就" for Formation; spacing around interpolated numbers |
| ar | All six plural forms, especially `zero` and `many`; "التكوين" for Formation (was "التلمذة", discipleship); RTL layout of `·` joins |
| ur | Nastaliq line height in long strings; "شاگردی" for Formation |
| fa | Zero-width non-joiners; "شاگردسازی" for Formation; Persian digits in `search.*` |
| my | The whole table: Burmese was the least certain draft, and no published Burmese content exists to check terms against |

## Not yet worded

The impact story itself (title, body, security note) is content from the partners feed, not a string (PA-6);
the shipped story is English and awaits comms review (`docs/impact-stories.md`).
Dates are formatted by the screen layer with the platform's date formatting, and counts can be passed to
`plural` already formatted, so digits follow the locale where the platform supports it.

## Changes on 2026-09-29 (review 2)

- Plural categories no longer come from `Intl.PluralRules`, which Hermes may not ship. They come from the
  CLDR rules written as data in `src/lib/strings/plural.ts`, checked against the ICU in Node for all sixteen
  locales. The phone and the sim now pick the same form.
- `ru`: `nav.formation`, `formation.title` and the other Formation labels were "Наставничество"
  (mentoring); they are now "Формирование" (formation). `movement.discourse` was "Повествование"
  (narration); it is now "Дискурс", the term the movement is named for. Both are an AI agent's choice and
  still need a native reviewer, who may prefer "Духовное формирование" for the title.
- `ar`: every "التلمذة" (discipleship) is now "التكوين" (formation, as in "التكوين الروحي"). Same caveat.
- `hi`, `bn`, `ur` and `fa` also word Formation as discipleship ("शिष्यता", "শিষ্যত্ব", "شاگردی",
  "شاگردسازی"). They are unchanged and flagged here for the same review.
- `es-419`, `fr`, `pt-BR` `many` forms ("{count} de recursos", "{count} de ressources"): reviewed and kept.
  CLDR gives these languages a `many` category for round millions (1 000 000, 2 000 000) precisely because
  the noun then takes "de" ("1 000 000 de ressources"); with the rule table above, `many` is chosen only for
  those counts, and every other count uses `other`. A native reviewer should confirm the phrasing, but none
  of these forms reads as clearly wrong, so none was changed.

## Added with the transfer, share and diagnostics screens (U1)

- `study.frame.picture`: the accessible name of a story picture in the Study reader. Each locale copies its own `session.frame.picture`, so the two readers name a picture the same way; review them together.
- `transfer.app.ready`: shown on the receiving phone when the app itself arrived, with its size. Drafted by an AI agent in fifteen locales. It must not promise that the phone installs the app on its own: handing the file to the system installer is not built yet.
