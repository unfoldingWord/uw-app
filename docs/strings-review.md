# Strings awaiting native review

Every locale file under `src/lib/strings/locales/` lists every key of the English table. The fifteen
translations were written by an AI agent on 2026-09-29, not by native speakers, and none has been reviewed.
Release criterion 6 asks for complete strings; complete here means every key has a value, not that the value
is right. Until a native speaker signs off a locale, treat it as a draft; the app does not offer it (see Sign-off).

How to review: read the English table by area (`src/lib/strings/en/*.ts`), then the locale file key by key.
Change a value in place; set it to `null` to fall back to English for that key while a better wording is found.
`npm run checks` reports placeholders, plural forms and the voice rules; it cannot judge meaning or tone.

## Sign-off

A locale ships only once a native speaker signs it off (issue #51). Until then it is not offered as the app
language: Settings lists English and the signed-off locales only, and a phone set to an unreviewed language
opens in English, with every string in English. The drafted table stays in the repository, and a reviewed
locale still falls back to English key by key wherever its value is `null`.

To sign a locale off, fill in the reviewer and the date (YYYY-MM-DD) in its row below and set the same date
for that locale in `localeSignOffs` in `src/lib/strings/locales.ts`, in the same commit. The
`locale-signoff` check in `npm run checks` fails when the two disagree. The code carries only the date, never
the reviewer's name.

The sim runs every locale regardless: a scenario device created with `localeGate: 'drafts'` offers all sixteen,
so the right-to-left scenarios for Arabic, Urdu and Farsi keep running before those locales are reviewed. The
release gate is `releaseGate` in `src/lib/strings/locales.ts` (`reviewed`).

| Locale | Reviewer | Date |
|---|---|---|
| es-419 |  |  |
| fr |  |  |
| hi |  |  |
| ru |  |  |
| ar |  |  |
| zh-Hans |  |  |
| sw |  |  |
| pt-BR |  |  |
| id |  |  |
| vi |  |  |
| bn |  |  |
| ur |  |  |
| fa |  |  |
| my |  |  |
| nl |  |  |

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
  `privacy.count.transfersByPlatformPair` was removed in G1: the platform pair split is not on the PRD
  section 9 fold list, so it never leaves the phone and the privacy screen no longer lists it.
- **Drafted in T8.** Six keys were added with the feature services and drafted in every locale at once:
  `failure.partners.invalid-feed`, `settings.reducedBlur`, `settings.reducedBlur.about`,
  `impact.securityNote`, `resource.wordLinks` and `resource.wordLinks.about`. `impact.securityNote` is a
  placeholder until comms supplies the website's security note (`docs/impact-stories.md`); a story that carries
  its own note shows that note instead.
- **Drafted with the Transfer, Share and diagnostics services.** `transfer.code`, `transfer.code.hint` and
  `transfer.nothing`. The code is the six digits both phones show while they pair (four until v1.1.0, issue #64); the word for it should be
  the one people use for a short number read aloud, not a password or a PIN.
- **Drafted in T11.** Seven keys were added with the Study screens and drafted in every locale at once:
  `study.helps.showResponse`, `study.helps.hideResponse`, `study.noLanguage`, `study.noLanguage.action`,
  `library.download`, `library.onPhone` and `search.fullText.inSettings`. `library.download` interpolates a
  resource title such as "Greek New Testament"; check the verb agrees with it where the language inflects.
- **Drafted on 2026-09-30 (issue #4).** `privacy.backup` says a backup of the phone may include notes and group
  names until a later update confirms they are kept out. It is temporary: the change that records the iPhone run
  of the backup exclusion removes it. Check it reads as calm and honest, not as an alarm.
- **Drafted with the introductions in Study (2026-09-30).** `study.helps.bookIntro` and
  `study.helps.chapterIntro` label the book and chapter introductions shown first among the notes. The word
  for "book" should be the one used for a book of the Bible (ar uses سفر), and "chapter" the one the Bible
  text itself uses (fa and ur باب, id pasal).
- **Drafted with the Reduce motion override (issue #36).** `settings.reducedMotion` and
  `settings.reducedMotion.about`, drafted in every locale at once. The setting stops the glass from drifting,
  floating and breathing; the word should be the one the phone's own accessibility settings use for Reduce
  Motion in that language.
- **Drafted with issue #20 (2026-09-30).** `diagnostics.body` was rewritten and `diagnostics.body.reading` and
  `diagnostics.includeReading` added, in every locale at once. The two bodies must each name exactly what the
  shared file holds: without, then with, the passages, articles and stories the leader opened or saved. The
  toggle label is first person ("Include what I read"), as the issue's decision words it; check it reads as the
  leader's own choice.
- **Redrafted with the glossary (issue #34, 2026-09-30).** Nine values changed in English and every locale at
  once so they use the words `CONTEXT.md` keeps: `failure.http.timeout`, `failure.http.status` and
  `failure.catalog.invalid-response` name the catalog, not the library (Library is a screen);
  `failure.kv.io` says preference, not setting; `failure.db.io` covers a refused save as well as a failed read;
  `search.label` lists passages, articles and stories (a lesson is Training only); and
  `failure.pack.checksum-mismatch`, `home.download.waiting` and `resource.audio.about` stop using "download" as a
  noun for a pack. Check the word for catalog is plain to a leader, not a technical term.
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

## Added with the release wiring (T13)

- `failure.boot`: the one line shown when the app could not start its library on the phone (the database or the files would not open), above Try again (`common.retry`). The kernel has not started, so the line is chosen from the phone's own language, not the app setting. Drafted by an AI agent in fifteen locales; it must stay calm and must not suggest anything was lost.

## Added with file import (I1)

- Six keys for importing a burrito on the phone (SH-3), drafted by an AI agent in fifteen locales:
  `languages.import.title` (the section heading), `languages.import` (the row), `languages.import.about` (one
  sentence under it), `languages.import.opened` (asked when another app opened a `.zip` in unfoldingWord, with
  the file name in `{name}`), `languages.import.install` (the button) and `languages.import.done`.
  "Scripture Burrito" is a format name and is kept in Latin letters in every locale; check that the word
  chosen for "archive" (`.zip`) is the one phones in that language use. The Arabic draft puts a right-to-left
  mark before `(.zip)` so the parentheses sit on the right side. `languages.import.opened` must read as a
  question the leader can decline, not a warning.

## Changed with the scope gaps (G1)

- `privacy.counts` was "When you are online, the app sends only these counts, as numbers, with no
  identifiers." Nothing is sent today (no endpoint is chosen), so it now reads "The app counts only these
  numbers, on this phone, and will send only them, in batches, once sending is turned on in a later
  release." Redrafted by an AI agent in fifteen locales. It must read as calm and factual, not as a promise
  of a date; check "in batches" is the plain word for sending several numbers together, not a technical term.
  `privacy.dropped` ("If the counts cannot be sent, they are dropped") is unchanged and still true of the
  later release.
- `privacy.count.transfersByPlatformPair` is removed from English and every locale (see Privacy above).
- `settings.appLanguage.direction`: one sentence under the app language list in Settings, saying the app
  restarts to change the layout direction when the leader switches to or from Arabic, Urdu or Farsi (PRD 11).
  Drafted by an AI agent in fifteen locales. It names the three languages in each locale's own words for them;
  check the names and that "restarts" does not read as a fault.
## Added with the audio player (G2)

- `study.audio.back` and `study.audio.forward`: the two pills under the audio bar that move ten seconds back
  and ahead. Each is the pill's visible text and its accessible name, so it spells out "seconds". The digits
  are ASCII in every locale, including `ar`, `fa`, `ur`, `bn`, `hi` and `my`; a reviewer may prefer the
  locale's own digits.
- `study.audio.loading`: the caption while a clip is being opened. It must not suggest a download.
- `session.audio.time`: the elapsed and total time under "Play and discuss" when a story has audio, the same
  shape as `study.audio.time`. The times are written `m:ss` with ASCII digits.
- Drafted by an AI agent in fifteen locales; none reviewed.

## Added with the Transport radio and the installer hand-off (N2)

- `transfer.network`: the one sentence that asks the leader to put both phones on one Wi-Fi or hotspot. "Wi-Fi"
  and "hotspot" are kept as the words phones show in each locale where the draft could not find a common
  local word; check each.
- `transfer.address` and `transfer.address.qr`: the typed fallback and the accessible name of the QR code.
  `{address}` is digits, dots and a colon, never translated. "Picture code" stands in for "QR code"; a
  reviewer may prefer the local name for QR.
- `transfer.typed`, `transfer.typed.address`, `transfer.typed.code`, `transfer.typed.connect`,
  `transfer.typed.invalid`: the receiver's form for an address typed from the other phone.
- `transfer.app.install`, `transfer.app.install.opened`, `transfer.app.install.unsupported`: the installer
  hand-off on Android. "Installer" is the system screen that installs an app; it must not read as a separate
  program the leader has to find.
- Drafted by an AI agent in fifteen locales; none reviewed.

## Added with the v1.1.0 transport follow-ups (issue #64)

- `transfer.localNetwork.prompt`: the sentence iOS shows in its own local network prompt the first time a
  transfer starts. It is not shown by any screen: `app.config.ts` puts the English value in Info.plist, and
  `plugins/system-prompts/index.ts` writes it into `InfoPlist.strings` for English and each signed-off locale
  through Expo's `locales` config, so a drafted locale reaches the prompt only once it is signed off. iOS shows
  it in a system dialog beside the app's name; keep it one plain sentence that says when the app looks and
  that it looks only on the local network.
- `transfer.typed.invalid` now says six-digit: the pairing code grew from four digits to six.
- Drafted by an AI agent in fifteen locales; none reviewed.
- `privacy.summary.sending`, `privacy.counts.sending` and `privacy.sending.later` (issue #52): the privacy
  screen's summary, intro and note once a telemetry endpoint is set and the app sends its counts. Until then the
  screen keeps `privacy.summary`, `privacy.counts` and `privacy.dropped`, which say nothing is sent yet. "Batch"
  is one small bundle of numbers sent once a day; it must not read as a file or a report about the leader.

## One sentence of support (issue #42, 2026-09-30)

Support copy is one sentence (AGENTS.md section 7, the design readme). Fifty-five keys carried two, and each was
rewritten in English as one sentence that keeps both facts, then redrafted by an AI agent in all fifteen locales
to match. None is reviewed. The `strings` check in `npm run checks` now counts sentences with the platform's
sentence segmenter in every locale and fails above one; `onboarding.tagline` and `onboarding.footer` are exempt
because PRD ON-1 fixes their wording. In `my` the little section sign (၊) is read as a comma, not a full stop.

- **Home, Study, Formation.** `state.offline`, `onboarding.name.hint`, `home.download.detail`, `home.new.detail`,
  `invitation.body`, `study.audio.offline`, `library.footer`, `search.fullText.inSettings`,
  `formation.group.deleteConfirm`, `formation.training.about`, `session.picturesMissing`.
  `study.audio.offline` also stopped saying audio streams when online: v1.0.0 plays only a downloaded Audio
  Pack (ST-4), so it now says only to download it once to listen offline.
- **Languages and Transfer.** `languages.coverage`, `languages.removeConfirm`, `languages.import.opened`,
  `languages.import.done`, `transfer.note`, `transfer.app.ios`, `transfer.sent`, `transfer.stopped`,
  `transfer.app.received`, `transfer.address.qr`, `transfer.app.install.opened`,
  `transfer.app.install.unsupported`. `languages.removeConfirm` now asks "until you download it again" in place
  of a second sentence saying it can be downloaded later; check it still reads as reassurance.
- **About and Settings.** `about.publishedBy.body` (every plural form), `about.partner.body`,
  `settings.fullText.about`, `settings.storage.about`, `settings.licence.about`, `settings.footer`.
- **Failures.** `failure.boot` and twenty-five `failure.*` keys: `http.offline`, `http.timeout`, `http.status`,
  `http.cancelled`, `files.no-space`, `files.io`, `db.migration-failed`, `db.io`, `kv.io`,
  `journal.persist-failed`, `journal.event-rejected`, `kernel.not-owned`, `kernel.observer-failed`,
  `catalog.invalid-response`, `pack.not-found`, `pack.no-space`, `pack.checksum-mismatch`, `pack.mixed-packs`,
  `corpus.unreadable`, `transfer.unsupported`, `transfer.declined`, `transfer.peer-lost`,
  `transfer.cancelled`, `partners.invalid-feed`, `unexpected`. Each joins what happened and what to do with
  "so", "but" or "and". The locale drafts join the two existing sentences the same way with the language's own
  word for it; a reviewer may prefer a fresh sentence where the join reads mechanically. In `my` the two halves
  are joined with ၊, which is the least certain of all.

The prototype (`design-system/templates/uw-resources-app/UwResourcesApp.dc.html`) still carries the old
two-sentence wording of `invitation.body`, `about.partner.body` and `settings.footer`; the next Claude Design
sync should take the new wording.
