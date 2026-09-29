# unfoldingWord App: Product Requirements Document

| | |
|---|---|
| Status | Draft for review |
| Version | 0.1 |
| Date | 2026-09-29 |
| Owner | Jesse Griffin (jesse.griffin@unfoldingword.org) |
| Repository | https://github.com/unfoldingWord/uw-app |
| Design | Generative Glass design system and app mockup: https://claude.ai/design/p/d6d24ced-3b92-4f3e-acfe-2c269874c320 |

---

## 1. Vision

**Tagline**

> Every resource. Every language. One open door.

**Vision statement**

> Put a decade of open Bible translation resources in the hands of every church leader who needs them.

**Expanded vision**

We envision one trusted app where any leader in the global church can find, read and share every open-licensed resource the global church has built with unfoldingWord, in the languages they work in, with or without a connection. It exists so that no barrier of cost, access or discoverability stands between a local church and the tools it needs to translate Scripture, teach it and multiply. Along the way, the same open door lets partners and supporters see what the global church has built together.

**The feature test**

Every proposed feature must pass one of these two questions, in this order:

1. Does this remove a barrier between a church leader and a resource they need?
2. If not, does it help a partner see what the church has built?

If neither, it does not belong in this app.

---

## 2. Who it is for

**Primary: leaders in the global church.** Pastors, translators, teachers and small-group leaders, many of them working among the least reached, often with intermittent or no connectivity, on mid-range or low-end Android phones, sometimes in places where a Bible app on a phone carries risk. They may lead more than one group. They speak a gateway language (Spanish, Hindi, Swahili, Indonesian and so on) and often a heart language as well.

**Secondary: financial partners and supporters.** People in the United States and elsewhere who give to unfoldingWord or might. They want to see, on their own phone, the breadth of what the global church has built, to read what it has meant for real people, and to be invited to take part. They are never the reason a screen exists; they benefit from screens that exist for leaders.

**Not designed for:** unfoldingWord staff dashboards, translation project management, or content editing. Those live in other tools.

---

## 3. Goals

1. **Complete.** Every open-licensed resource unfoldingWord and gateway-language organizations publish at production quality on Door43 Content Service is discoverable in the app, with nothing gated or left out.
2. **Findable by language and passage.** A leader can start from their language and a passage, or from a task such as leading a story session, and land on the right resource in a few taps.
3. **Usable offline.** Whole-language packs download once and work without a connection, because the least-reached contexts are often the least connected.
4. **Shareable without the internet.** A leader can pass content, and on Android the app itself, from one phone to another with no network.
5. **Free and open.** No cost, no account, clear open-license terms, and the freedom to copy, adapt and pass resources on.
6. **A formation pathway.** Open Bible Stories with the five movements of the Equipping Journey give a leader a structured way to gather a group, press play and go deeper.
7. **Trustworthy.** Content matches the published source release, is versioned, and is attributed to the organization that produced it.
8. **Legible to partners.** Supporters can see the breadth of the library and are invited, at the right moment, to partner in extending its reach.

---

## 4. Non-goals for the first release

- **Not a translation editor.** Creating, editing or checking resources stays in translationCore, gatewayEdit and BT Servant.
- **Not a donation platform.** The app invites and links to https://unfoldingword.org/Give. It does not process giving.
- **Not a general devotional Bible app.** No reading plans, verse of the day, highlights sync or social features.
- **Not gated or personalized by account.** No login is required for anything. There is no account at all in the first release.
- **Not a security-disguised app.** A calculator-style disguise with passcode is a known need in some contexts but is out of scope for this release and is not on the roadmap until product decides otherwise.
- **Not a replacement for the Open Bible Stories app.** OBS is a first-class resource here, but the existing OBS app remains a separate product for now.
- **Not tap-a-word.** Word-level alignment is used to attach notes to the right words, but original-language lookup by tapping a word is the first post-launch feature, not a launch feature.
- **Not internal tooling.** The private "uw-platform" repository is an unrelated internal tool.

---

## 5. Product principles

These come from the unfoldingWord brand persona, the Trusted Guide, and apply to copy, design and feature decisions alike.

- **The church is the hero.** Resources are attributed to the organization that made them. unfoldingWord resources are shown prominently, but the app never positions unfoldingWord as the reason the work exists.
- **Calm, clear, short.** Sentence case, plain words, one-sentence supporting copy, no exclamation marks, no emoji, no jargon without a definition.
- **Nothing leaves the phone that the user did not choose to send.** No identifiers, no third-party analytics, no location permission.
- **Offline is the default state, not a fallback.** Every screen is designed for the case where the network is absent.
- **Open all the way down.** Content is CC BY-SA 4.0. The app is MIT. The bundle format is Scripture Burrito, an open standard, so what the app produces is usable elsewhere.

---

## 6. Product overview

### 6.1 Navigation

Three tabs. Nothing else at the top level.

| Tab | Purpose |
|---|---|
| **Home** | Where you left off, what is on your phone, what is new, and the partner invitation when due. |
| **Study** | Reading, listening and browsing the Bible and its resources, passage first. The catalog for the current language lives here. |
| **Formation** | The pathway: Open Bible Stories walked through the five movements, with groups and progress. |

**Language** is not a tab. The current language is a chip in the Home and Study headers that opens a dialog for switching, downloading and managing languages.

### 6.2 The four surfaces at a glance

```
Onboarding ──> Home ──┬── Study ──┬── Passage view (text + resource strip)
                      │           ├── Catalog for this language
                      │           ├── Article reader (Words, Academy)
                      │           └── Search
                      ├── Formation ──┬── Tracks (Foundations, Training, Topics)
                      │               ├── Groups
                      │               └── Session (five movements)
                      └── Languages dialog ──> Downloads, transfer, storage
```

---

## 7. Feature requirements

Requirement identifiers are stable and can be referenced from issues. "Must" is a first-release requirement. "Later" is on the roadmap and out of the first release.

### 7.1 Onboarding

| ID | Requirement | Priority |
|---|---|---|
| ON-1 | First launch shows the logo on a glass plate, the overline "Open Bible translation resources", the tagline, one sentence of body copy, a primary action "Choose your language" and a secondary "Continue in English". Footer reads "Free. Openly licensed. No account needed." | Must |
| ON-2 | Choosing a language starts the download of that language pack and lands on Home with progress visible. | Must |
| ON-3 | An optional first-name field, stored only on the device, used only for the Home greeting. The app does not attempt to read a name from the device or its accounts. | Must |
| ON-4 | No account, sign-in, email or phone number is requested at any point. | Must |

### 7.2 Home

| ID | Requirement | Priority |
|---|---|---|
| HO-1 | Header: current-language chip (opens the Languages dialog) and a light/dark toggle. | Must |
| HO-2 | Date and a time-of-day greeting, with the first name if given. | Must |
| HO-3 | "Continue reading" card: the last passage opened in Study. | Must |
| HO-4 | "Continue formation" card: the active group's next session. | Must |
| HO-5 | Download status for the current language: what is on the phone, what is missing, one tap to complete. | Must |
| HO-6 | Saved items: bookmarked passages, articles and stories. | Must |
| HO-7 | The partner invitation card, when due (see 7.7). | Must |
| HO-8 | "What is new" when a downloaded resource has a newer production release. | Must |

### 7.3 Study

| ID | Requirement | Priority |
|---|---|---|
| ST-1 | Study opens to the passage view on the last-read reference. | Must |
| ST-2 | Passage view: book, chapter and verse navigation; the Bible text on top; a strip of the other resources available for that passage below it, namely notes, words, questions. Notes are attached to the verse and, where alignment data allows, to the quoted words. | Must |
| ST-3 | Bible text toggle between the literal text and the simplified text, labelled in plain words ("Close to the original" and "Everyday words"), when both exist for the language. | Must |
| ST-4 | Audio bar on the passage view when the release carries audio; streams when online, downloadable for offline. | Must |
| ST-5 | A library button opens the catalog for the current language: one card per resource type with counts, download state and the publishing organization. unfoldingWord resources are listed first. | Must |
| ST-6 | Article reader for Translation Words and Translation Academy, with in-article links resolving to other articles and to passages. | Must |
| ST-7 | Original-language texts (Hebrew Old Testament, Greek New Testament) appear in the catalog as an optional download outside any language pack, and read as plain text. | Must |
| ST-8 | Search: reference entry, plus title search across Translation Words, Translation Academy and Open Bible Stories. | Must |
| ST-9 | Full-text search across downloaded content, behind a setting that builds the index on the device and shows the storage cost before doing so. | Must |
| ST-10 | Bookmark any passage, article or story. Bookmarks appear on Home. | Must |
| ST-11 | Tap a word to see its original-language form, gloss and Translation Words entry. | Later |
| ST-12 | "Ask BT Servant about this passage", opening BT Servant with the reference pre-filled. | Later |

### 7.4 Formation

| ID | Requirement | Priority |
|---|---|---|
| FO-1 | Three tracks: **Foundations** (Open Bible Stories with the five movements), **Training** (Translation Academy arranged as a course), **Topics** (empty until content exists; hidden when empty). | Must |
| FO-2 | Foundations is the 50 stories. Each session opens with the key idea, creedal verse and summary, then the story frames with images and audio where available, then the five movements: Observation, Translation, Discourse, Theological, Journal. Drafting, checking and conclusion follow where the content provides them. | Must |
| FO-3 | The story frame view has a primary "Play and discuss" action and per-movement question lists, matching the "Talk about it" pattern in the mockup. | Must |
| FO-4 | **Groups.** A user can create any number of groups, each with a name and a position in the pathway. No account, no sync, no members list. Progress is per group and stays on the device. | Must |
| FO-5 | **Language fallback.** When the current language lacks the five-movement content, Foundations shows the plain stories with their study questions where those exist, marks the movement layer "Not yet in this language", and offers a toggle to show the English movements alongside the local-language story. | Must |
| FO-6 | Session notes for a group, stored locally. | Must |
| FO-7 | Additional theological formation content beyond OBS as it is published. | Later |

### 7.5 Languages and downloads

| ID | Requirement | Priority |
|---|---|---|
| LA-1 | The Languages dialog lists every language with production content, showing the autonym, English name, resource count and an "Offline" badge when downloaded. Searchable. | Must |
| LA-2 | **Language pack** is the unit of download: all text resources for a language in one action. Bible text, notes, words, word links, questions, academy, stories and story helps. | Must |
| LA-3 | **Images** for Open Bible Stories are a single shared pack downloaded once, since the images are the same across languages. A language may override individual images; overrides ship inside that language's pack. | Must |
| LA-4 | **Audio** is a separate download per resource per language, never part of the language pack. | Must |
| LA-5 | Multiple languages can be downloaded and switched between. | Must |
| LA-6 | Storage management: see the size of each pack, remove a pack, see free space. | Must |
| LA-7 | Update check against the catalog when online; updates are opt-in and replace the pack atomically. | Must |
| LA-8 | Per-book downloads. | Later |

### 7.6 Sharing

| ID | Requirement | Priority |
|---|---|---|
| SH-1 | **Phone-to-phone transfer with no internet**, in the app, between any two phones running it, including iOS to Android and back. The sender chooses which resources of a language go; the receiver sees progress and the result is a ready-to-read pack. | Must |
| SH-2 | On Android, the sender can also transfer the app package itself so the receiver can install it without store access. The PRD records that iOS does not permit this. | Must |
| SH-3 | Bundles exchanged in transfer are Scripture Burrito, so they are importable by other Scripture Burrito tools. The app also accepts a Scripture Burrito bundle opened from a file. | Must |
| SH-4 | **Share out**: a passage or a story as text, and as an audio file where audio exists, through the system share sheet, with a short link to get the app appended. | Must |
| SH-5 | Every shared item carries its licence and attribution. | Must |

### 7.7 Partners and about

| ID | Requirement | Priority |
|---|---|---|
| PA-1 | **About this library** screen: number of languages, resources per type, publishing organizations, the current impact stories (PA-6), and how to partner, with a link to unfoldingWord. Catalog data comes from what the app already holds. | Must |
| PA-2 | **Partner invitation.** A card on Home inviting the user to partner with unfoldingWord to extend the reach into the unreached. Shown only when the device's region, inferred from locale and time zone with no location permission, is the United States. First shown on the fifth distinct day of use, dismissible, and shown again on the same rule every three months. Never shown as a modal over content. The card leads with one impact story (PA-6) as the example of what partnering makes possible, then the invitation and the link to https://unfoldingword.org/Give. | Must |
| PA-3 | **Licence page** carries a short notice that the resources are free because partners make them so, linking to https://unfoldingword.org/Give. | Must |
| PA-4 | Links on the About screen to three things a leader may want next, and nothing else: translationCore, BT Servant, and Foundations BT (https://foundationsbt.com), the framework site for understanding Bible translation with the Tano Story Series videos. Each link states in one sentence what it is for. | Must |
| PA-5 | A public web page generated from the same catalog data for fundraising use. | Later |
| PA-6 | **Impact stories.** The app carries a small set of the impact stories unfoldingWord already publishes through its newsletter and website. Each story is a title, an image, a short body and a link to the full story on unfoldingword.org, with the website's security note (names changed) carried verbatim. Stories come from an unfoldingWord-hosted feed owned by the communications team, are fetched when online and cached for offline, and at least one ships bundled with every release so the partner invitation never appears without one. The launch story is "Jeremiah and the Occult King" (https://unfoldingword.org/africa/when-jeremiah-first-heard-that-his-chadian-church-planting/), about Open Bible Stories translated into Chadian Arabic. Stories appear on the partner invitation (PA-2) and on the About this library screen (PA-1). Tone follows the brand guide for impact stories: reverent, human, grounded, centred on the people in the story. | Must |

### 7.8 Settings

| ID | Requirement | Priority |
|---|---|---|
| SE-1 | App language (one of the 16 locales, see section 11), theme, first name, full-text index toggle, storage management, licence and attribution, About. | Must |
| SE-2 | Accessibility: every control labelled for screen readers, dynamic type up to the platform maximum, contrast meets WCAG AA on glass surfaces in both themes. | Must |

---

## 8. Content and data

### 8.1 Source of truth

Door43 Content Service (DCS), https://git.door43.org, via its catalog API.

- **Stage:** production only.
- **Tag:** the `tc-ready` topic marks the latest valid releases. As of 2026-09-29 there are 322 production entries with this tag, including all of unfoldingWord's English core repositories, the original-language texts, `en_obs` and `en_obs-tf`.
- **Publishers:** any organization whose release meets the stage and tag rule. The publishing organization is always shown. unfoldingWord resources are listed first within a language.
- **Format consumed by the app:** Scripture Burrito, natively. The app does not parse Resource Containers.

### 8.2 Scripture Burrito supply

The app consumes only tagged, production-stage Scripture Burrito releases published on DCS. Today DCS mirrors Resource Container repositories into the `rc2sb` organization, and the source repositories carry a `pushing2sb` topic, but those mirrors are master-branch only and no production-stage Scripture Burrito release is owned by unfoldingWord yet. The `go-rc2sb` library exists in the unfoldingWord GitHub organization.

**External prerequisite (owner: DCS team):** the DCS pipeline publishes tagged production Scripture Burrito releases for every `tc-ready` production Resource Container, carrying through `tc-ready`, subject, language, owner and audio attachments. This project does not build a conversion service. If the prerequisite slips, the fallback is a stateless conversion service owned by this project running `go-rc2sb` and publishing to object storage; that fallback is a decision to be taken explicitly, not a default.

### 8.3 Resource types

| Resource | Where it appears | Notes |
|---|---|---|
| Literal text (ULT and gateway equivalents) | Study, "Close to the original" | Aligned USFM in source; alignment used for note attachment |
| Simplified text (UST and gateway equivalents) | Study, "Everyday words" | |
| Translation Notes | Study resource strip | Verse-bound |
| Translation Words and Word Links | Study resource strip, article reader, search | |
| Translation Questions | Study resource strip | |
| Translation Academy | Study article reader, Formation Training track, search | |
| Open Bible Stories | Formation Foundations, Study catalog, share out | Images shared pack; audio separate |
| OBS Study Questions, Study Notes, Translation Notes, Translation Questions, Word Links | Formation fallback and story view | |
| OBS Theological Formation | Formation Foundations | English and Indonesian today |
| Hebrew Old Testament, Greek New Testament | Study catalog, optional download | Plain text until tap-a-word |

### 8.4 Language pack composition

One pack per language containing every text resource above that exists for it. Excluded from the pack: OBS images (shared pack), audio (separate), original-language texts (separate).

Reference sizes, English, raw source before Scripture Burrito packaging and compression: literal text 81 MB, simplified text 94 MB, Translation Notes 34 MB, everything else under 10 MB. Whole pack roughly 220 MB raw; expected 40 to 60 MB compressed. The transfer screen's resource selection (SH-1) exists so a phone-to-phone transfer can omit a text.

### 8.5 Versioning

Every downloaded resource records its release tag and the commit it came from. Updates replace a pack atomically. The app never shows content from two releases of the same resource at once.

### 8.6 Production coverage of the 16 locale languages, 2026-09-29

| Coverage | Languages |
|---|---|
| Full core set (aligned Bible, notes, words, academy) | English, Spanish (Latin America), Hindi, Russian, Arabic, Indonesian, Bengali, Farsi |
| Five-movement formation content | English, Indonesian |
| Open Bible Stories, with or without an aligned Bible, nothing more | French, Chinese, Swahili, Portuguese (Brazil), Urdu, Vietnamese |
| Nothing tagged `tc-ready` at production | Burmese, Dutch |

**Request to content teams:** French, Swahili, Portuguese and Chinese have gateway-language work on DCS that is not tagged for production. Tagging it is the fastest way to widen the app's launch coverage and is outside this project's scope.

---

## 9. Platform and technical constraints

| Area | Decision |
|---|---|
| Platforms | Native iOS and Android. |
| Stack | Expo with React Native and TypeScript, EAS for builds and store submission, matching the existing Open Bible Stories app. |
| Offline | Offline-first. All content, progress, groups, notes and bookmarks live on the device. There is no server-side user state. |
| Bundle format | Scripture Burrito, read natively, produced natively for transfer. |
| Backend | None owned by this project in the first release. Discovery and downloads come from DCS. |
| Transfer | Cross-platform phone-to-phone with no network. The transport is an implementation decision with one constraint: iOS to Android must work in both directions. Candidates include a local Wi-Fi link with one phone as host, or BLE for discovery with Wi-Fi for payload. Android package transfer uses the installed package export. |
| Accounts | None. |
| Analytics | Anonymous aggregate counts only: app opens, language pack downloads per language, transfers completed, shares sent. No identifiers, no device fingerprint, no third-party SDK. Sent in batches when online, droppable without loss to the user. The policy is stated in the app's privacy screen and in this document; changing it requires changing both. |
| Permissions | No location. Local network and Bluetooth only when the user starts a transfer. Storage only as the platform requires for share sheet and file import. |
| Distribution | Apple App Store, Google Play, plus a signed Android package attached to each GitHub release for sideloading. |
| Store accounts | unfoldingWord holds both an Apple Developer Program organization account and a Google Play developer account. |
| Store name | "unfoldingWord". Check availability of the exact name on both stores before submission. |
| Licence | Code MIT (already in the repository). Content CC BY-SA 4.0 as published. |
| Engineering practices | Follow the unfoldingWord engineering practices proposal where it fits; deviations recorded in this document's decision log. Repository conventions from `uw-dev-skills` apply to commits. |

---

## 10. Design

The app is built on the **Generative Glass** design system, the liquid-glass product companion to the unfoldingWord brand. Source: https://claude.ai/design/p/d6d24ced-3b92-4f3e-acfe-2c269874c320. The mockup template "unfoldingWord resources app" in that system is the visual reference for onboarding, Home, the catalog, the language dialog, the reader and the story player, in light and dark.

### 10.1 What the system fixes

- **Palette.** The five brand colours only: Inspire #31ADE3 (primary), Ocean #014263, Tech #231F20, Cultivate #70C9CC, Kindle #E59D33. Ink is Ocean pulled toward black; paper neutrals lean toward Cultivate; the aurora backdrop is the brand hues at pastel weight and is never used as a fill, border or text colour. There is no red; Kindle carries warnings.
- **Glass.** Four white-fill steps, five blur steps (8 to 64 px) with saturation, a half-pixel white hairline, an inset top light and a faint prismatic sheen on every surface. Never more than two glass levels stacked. Shadows are multi-layer, diffuse and cast in Ocean.
- **Radii.** Nothing sharp: cards 28, image wells 22, category tiles 18, small tiles 14, sheets 34; every interactive element is a full pill.
- **Type.** Product UI in SF Pro Display and Text; hero 28, card title 19, body 15, label 13, caption 12, micro 10, overline 9 uppercase tracked. Brand surfaces (About, partner invitation, store listing, marketing) in Avenir: Black for headings, Book for body, Medium uppercase in Inspire for subheads. Never mix the two families on one surface.
- **Motion.** Organic and slow: liquid easing with slight overshoot on entry, 140 ms micro-feedback up to 1100 ms morphs, three-beat choreography (what leaves softens, what connects draws, what arrives rises), a press-and-result "recoil" as one motion. Nothing snaps.
- **Dark theme.** A complete `data-theme="dark"` that re-points semantic aliases only.
- **Layout.** 18 px gutter, 18 px card padding, 10 px between stacked surfaces, content bottom-weighted, status bar and primary action fixed.
- **Icons.** Lucide outlines, 1.7 px stroke, monochrome, no emoji. The logo mark is the app icon and sits on a glass plate, never directly on the aurora.
- **Copy.** Calm, second person, sentence case, one-sentence supporting copy, no exclamation marks, no em-dashes, no product names in running copy.

### 10.2 Brand rules that carry into the app

- unfoldingWord is always written in camelCase.
- The full lockup appears on onboarding and About; the mark alone is the icon.
- The angled 70 percent colour-block motif from the print guide is deliberately not used.

### 10.3 Open design questions

- **Fonts on Android.** Apple's licence covers SF Pro on Apple platforms. Android needs a product UI face with the same metrics feel; candidates are Inter or Nunito Sans. Avenir's webfont and app-embedding licence must be confirmed before shipping the binaries.
- **Glass on low-end Android.** Backdrop blur at five ladder steps is expensive on budget GPUs. The design must define a reduced-blur mode that keeps the hairlines, fills and radii and drops the blur.
- **Waha-like, distinctively unfoldingWord.** The layout borrows Waha's clarity: gather, press play, discuss; progress per set; card lists. It is distinct in material (glass), palette, voice, the three-tab structure, passage-first Study, and the five-movement content.

---

## 11. Localization

- **Register:** the 16 locales in the Open Bible Stories website codebase, `src/i18n/config.ts` in `unfoldingWord/obs-website`: en, es (Latin America), fr, hi, ru, ar (RTL), zh (Simplified), sw, pt (Brazil), id, vi, bn, ur (RTL), fa (RTL), my, nl.
- **Rule:** the app ships every locale whose strings are complete at release; incomplete locales fall back to English string by string. Right-to-left layouts are first-class.
- **Content language and app language are independent.** A Swahili speaker can run the app in English and read Swahili content, or the reverse.

---

## 12. Privacy and security

- No accounts, no identifiers, no third-party SDKs, no location permission, no contacts or accounts access.
- Aggregate analytics only, as defined in section 9, documented in-app.
- Names, groups, notes and progress never leave the device except when the user explicitly transfers or shares.
- No disguise or passcode mode in the first release (see non-goals).
- Public copy follows the brand security guideline: no names, locations or images of people in sensitive contexts.

---

## 13. Release criteria

The first public release ships when all of these are true. There is no date.

1. All 16 locale languages appear in the app with whatever is in production at release, and at least eight of them offer the full core set offline.
2. Formation runs end to end with the five movements in English and Indonesian, and with the fallback in every other language that has Open Bible Stories.
3. A leader can transfer a language pack, with resource selection, from one phone to another with no internet, iOS to Android and back, and the receiving phone can read it immediately. On Android the app itself can be transferred the same way.
4. Every screen works with no connection after the initial download.
5. Listed on the Apple App Store and Google Play as "unfoldingWord", with a signed Android package on the GitHub release.
6. UI available in English plus every one of the 16 locales that has complete strings, with RTL verified for Arabic, Urdu and Farsi.
7. Screen-reader labels on every control, dynamic type supported, contrast AA in both themes.
8. Analytics policy implemented exactly as written in section 9 and verified by inspecting outbound traffic.

---

## 14. Success measures

Proposed; to be confirmed with product before launch. All are aggregate and anonymous.

| Measure | Why it matters |
|---|---|
| Language packs downloaded, per language | The vision is measured in leaders with resources in hand |
| Transfers completed, per platform pair | Whether the offline door is actually used |
| Shares sent | Whether the app spreads by leaders' own hands |
| Formation sessions started, per language | Whether the pathway is used, not just installed |
| Distinct days of use per install, distribution | Whether it becomes a working tool rather than a one-time look |
| Partner-invitation taps and impact-story opens | The only partner-facing measures |

---

## 15. Dependencies and prerequisites

| Dependency | Owner | Status |
|---|---|---|
| DCS publishes tagged production Scripture Burrito releases for `tc-ready` content, with audio attachments carried through | DCS team | Not yet; mirrors exist at master only |
| Content tagging for French, Swahili, Portuguese, Chinese and others | Content teams | Gaps listed in 8.6 |
| OBS Theological Formation in languages beyond English and Indonesian | Content teams | Two languages today |
| Apple and Google developer accounts | unfoldingWord | Held |
| Store name "unfoldingWord" available | Product | To check |
| Font licences: SF Pro on Apple only; Avenir embedding; Android substitute chosen | Design | Open |
| Short link domain for share-out | Product | To choose |
| Impact stories feed: format, hosting and the process for adding a story when the newsletter publishes one | Communications team | To set up; the launch story is chosen |

---

## 16. Roadmap after the first release

In rough priority order. Each is subject to the feature test in section 1.

1. Tap-a-word original-language lookup (ST-11).
2. Per-book downloads (LA-8).
3. "Ask BT Servant about this passage" handoff (ST-12).
4. Topics track in Formation as content is published (FO-7).
5. Additional theological formation content beyond Open Bible Stories.
6. Public web page from the catalog for partners (PA-5).
7. Community translation of the app's own strings beyond the 16 locales.
8. Revisit absorbing the Open Bible Stories app.

---

## 17. Open questions

- Which transport for phone-to-phone transfer meets the cross-platform constraint with acceptable throughput on low-end Android? Spike before design.
- Android product UI typeface.
- Short-link domain and whether the link should carry the language.
- Whether the partner invitation copy is drafted by the development team or product; the brand voice is "relational, not transactional" and "honest, measured".

---

## 18. Decision log

Decisions taken in the requirements interview of 2026-09-29 with Jesse Griffin. Each is a product decision unless marked as a fact.

| # | Decision |
|---|---|
| 1 | Primary audience is church leaders; financial partners are secondary. |
| 2 | Tagline "Every resource. Every language. One open door." Vision statement as in section 1. |
| 3 | The private `uw-platform` repository is an unrelated internal tool. |
| 4 | Scope is the open content library; tool links only to translationCore and BT Servant, tertiary. The resource set is the ecosystem in the unfoldingWord developer guide. The app is the structured counterpart to BT Servant's conversational access to the same resources. |
| 5 | Native iOS and Android. Expo, React Native, TypeScript, EAS. (Fact: Expo produces native binaries; the OBS app already ships this way.) |
| 6 | A single `docs/PRD.md`, no ADRs for now. |
| 7 | Anonymous aggregate analytics only. |
| 8 | No release date; release criteria instead. |
| 9 | Open Bible Stories is in scope as a resource and as the key piece of the formation pathway; the OBS app remains separate. |
| 10 | Design: Generative Glass design system; layout inspired by Waha; distinctively unfoldingWord. |
| 11 | Scripture Burrito natively, enabling offline peer-to-peer sharing. Supply comes from DCS production releases; a project-owned conversion service is a fallback, not the plan. |
| 12 | Publishers: any organization, production stage, `tc-ready` tag; unfoldingWord prominent. |
| 13 | Distribution: both stores plus a signed Android package on GitHub releases. |
| 14 | UI localization register: the 16 locales from the OBS website. |
| 15 | Partner-facing: timed, region-inferred invitation for US users every three months; notice on the licence page linking to Give; About this library screen. |
| 16 | BT Servant: link only in the first release; contextual handoff later. |
| 17 | Formation is the five-movement OBS Theological Formation content; other formation content added later. |
| 18 | In-app phone-to-phone transfer, including the Android app package. |
| 19 | Tabs: Home, Study, Formation. Languages is a dialog. |
| 20 | Local groups with a name and pathway position; no accounts. |
| 21 | Security disguise mode: not in scope. |
| 22 | Partner invitation: locale and time zone, no location permission, fifth distinct day, quarterly cycle. |
| 23 | Audio where the catalog has it; alignment used for note attachment only; tap-a-word later. |
| 24 | Study opens to the passage view; the catalog is one tap away. |
| 25 | Optional typed first name; the app cannot reliably read a name from the device (fact: iOS 16 and later withhold the personalized device name without a special entitlement; Android needs contacts or accounts permission). |
| 26 | Formation fallback: plain stories with study questions, plus a toggle to show English movements alongside. |
| 27 | Whole-language packs; OBS images as a shared pack with per-language overrides; audio separate. |
| 28 | Search: reference plus titles, with an opt-in full-text index. |
| 29 | Store accounts held for both platforms. |
| 30 | Release criteria as in section 13, targeting the 16 locale languages with eight at full core set. |
| 31 | Store name "unfoldingWord". |
| 32 | Transfer screen allows resource-level selection. |
| 33 | Original-language texts as an optional download, plain text. |
| 34 | Share out a passage or story as text or audio with a link to the app. |
| 35 | Impact stories from the newsletter and website appear in the app; one leads the partner invitation. Launch story: "Jeremiah and the Occult King". (Amends the partner-facing scope in decision 15.) |
| 36 | A third off-app link, Foundations BT, joins translationCore and BT Servant on the About screen. (Amends decision 4.) |

---

## Appendix A. Facts gathered on 2026-09-29

- DCS catalog supports `metadataType` values `rc`, `sb`, `tc`, `ts`. At production stage: 576 Resource Container entries, 35 Scripture Burrito entries (none owned by unfoldingWord), 27 translationStudio, 1 translationCore. At the `latest` stage, Scripture Burrito entries number 1,092, dominated by test owners plus the `rc2sb` organization's master-branch mirrors of unfoldingWord and gateway-language repositories.
- `tc-ready`: 322 production entries. unfoldingWord's `en_ult`, `en_ust`, `en_tn`, `en_tw`, `en_twl`, `en_tq`, `en_ta`, `el-x-koine_ugnt`, `hbo_uhb`, `en_obs` and `en_obs-tf` all carry it.
- Catalog entries expose per-release `zipball_url`, per-file `ingredients` with sizes, and `attachment_types` including audio.
- `unfoldingWord/go-rc2sb`, `go-ts2rc` and `go-tc2rc` exist on GitHub for conversion into Scripture Burrito.
- `unfoldingWord/obs-5m-mcp` documents the five movements (Observation, Translation, Discourse, Theological, Journal) and the session pathway (observe, discuss, draft, check, serve, share).
- Waha (Kingdom Strategies): tabs Foundations, Topics, Training; audio-led Discovery Bible Study for groups of 3 to 12; offline download; progress per group; optional accounts; a security mode; sharing via messaging apps; no in-app peer-to-peer transfer.
- The Open Bible Stories app (`unfoldingWord/obs-app`) is Expo 52, React Native 0.76, with EAS configuration and Android APK releases; its README lists iOS as coming soon.
