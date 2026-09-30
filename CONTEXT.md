# unfoldingWord App

The vocabulary of the app that puts open Bible translation resources in the hands of church leaders, offline, without an account, shareable phone to phone. One context; every document, module, test and screen uses these words and no synonyms.

## Language

### Content

**Resource**:
One published work in one language, such as Swahili Translation Notes. The unit the catalog lists and a pack contains.
_Avoid_: repo, repository, Resource Container, RC

**Release**:
One tagged production version of a resource on Door43 Content Service, identified by publisher, resource, language and tag.
_Avoid_: version (use for the tag string only), build

**Publisher**:
The organization that owns a release.
_Avoid_: owner, org, author

**Catalog**:
The set of releases the app knows about, normalized from Door43's catalog. It says what exists; it holds no content.
_Avoid_: index, feed, DCS (that is the upstream, not the catalog)

**Burrito**:
One Scripture Burrito: a directory or archive with a metadata file and ingredients. The file form of one resource.
_Avoid_: bundle, zip, archive, container

**App-written Burrito**:
A burrito the app writes itself around assets the catalog lists, because DCS generates no archive for them: the Image Pack from the pictures `en_obs` cites, and an Audio Pack from a release's audio assets (ADR 0006). It passes the same validator as a DCS burrito.
_Avoid_: converted, generated, synthetic

**Pack**:
A set of resources installed on the device and replaced as one unit. Three kinds: **Language Pack** (every text resource for one language), **Image Pack** (the Open Bible Stories images, shared across languages), **Audio Pack** (audio for one resource in one language).
_Avoid_: bundle, download, library (that is a screen)

**Default Pack**:
What a Language Pack holds when the leader downloads a language in one action: the preferred publisher's own Literal and Simplified text and the helps. Other publishers' texts and releases whose row has no source yet are **Optional Downloads**, listed in the library with their publisher and never installed unless the leader chooses them.
_Avoid_: core set, bundle

**Partial Pack**:
A Language Pack installed without one or more of its optional resources because their download failed. The text is required: a failed Literal or Simplified text fails the whole install. The journal and the Languages screen name each failed release, and Retry installs only what is missing.
_Avoid_: broken pack, incomplete download

**Source**:
Where a pack's burritos come from: the Catalog, a Peer, or a File.
_Avoid_: origin, provider

**Provenance**:
The release tag, commit, publisher and licence carried on every piece of content, from download to screen to whatever leaves the device.
_Avoid_: metadata, attribution (attribution is what provenance is rendered as)

**Label**:
A title or a name that points at content without being content: an article, story or Word title in the contents lists (`Contents.words`, `Contents.academy`, `Contents.stories`), a book name, a reference's name (`corpus.title`, `bookName`, `referenceName`). A label carries no provenance because it never leaves the device alone: whatever is shared or sent is the content it names, with that content's provenance. The provenance check lists `words`, `academy` and `stories` by name and exempts them as labels, and fails on a label that holds anything but its id or number and its title.
_Avoid_: heading, caption, metadata

**Text**:
A Bible text resource. Two readings may exist for a language: **Literal** (close to the original) and **Simplified** (everyday words).
_Avoid_: ULT, UST, GLT, GST in anything a user sees; Bible (ambiguous)

**Helps**:
The verse-bound resources shown with a passage: **Notes**, **Word Links** and **Questions**.
_Avoid_: resource strip, annotations, translation helps

**Introduction**:
A **Note** on a whole book or a whole chapter rather than on a verse. A passage that opens the book carries the book's introduction, and a passage that opens a chapter carries that chapter's; they are shown first among the notes.
_Avoid_: intro note, overview, general notes

**Article**:
A standalone piece of reference text: a **Word** entry (Translation Words) or an **Academy** article (Translation Academy).
_Avoid_: page, entry, topic

**Story**:
One of the fifty Open Bible Stories. Made of **Frames**, each an image and a paragraph.
_Avoid_: chapter (for stories), slide

**Reference**:
A book, chapter and verse or verse range, in one versification.
_Avoid_: location, address

**Passage**:
The text and helps for one reference, assembled from the corpus.
_Avoid_: verse view, reader (that is a screen)

**Bookmark**:
A passage, article or story a leader saved to find again from Home. It holds a reference or an id and the language, never text.
_Avoid_: favourite, saved item (that is the Home card that lists bookmarks), position (that is formation)

**Corpus**:
Everything installed on the device, queryable as passages, articles, stories and search hits.
_Avoid_: database, store, content

### Formation

**Pathway**:
The structured formation content a group walks through. Today: Open Bible Stories with the five movements.
_Avoid_: curriculum, course, journey

**Track**:
One strand of the pathway: **Foundations**, **Training** or **Topics**.
_Avoid_: tab, section, module

**Session**:
One unit of a track a group meets for: a story with its movements, or an Academy lesson.
_Avoid_: lesson (except for Training), meeting, step

**Movement**:
One of the five parts of a story session: Observation, Translation, Discourse, Theological, Journal.
_Avoid_: phase, stage, question set

**Group**:
A named position in a pathway, held on one device, with its notes. It has no members and no account.
_Avoid_: class, cohort, team

**Position**:
Where a group is: track, session and movement.
_Avoid_: progress (that is a number derived from position), bookmark

### Sharing

**Transfer**:
Moving a pack from one phone to another with no network, inside the app.
_Avoid_: sync, send (that is Share), P2P, beam

**Peer**:
Another device running the app, found nearby over the Transport port, that a transfer is made with.
_Avoid_: client, partner (that is a supporter), node

**Advertisement**:
A device making itself findable to peers for a transfer, under a short code shown on its screen.
_Avoid_: broadcast, beacon, hosting

**Pairing code**:
The short code an advertisement shows. The receiver sends it back when it connects, and the sender declines a connection that does not carry it.
_Avoid_: PIN, password, token

**Address**:
Where an advertisement listens on the shared local network, as host and port. Shown as text and as a QR code for when discovery finds nothing; never journaled. In code, `Advertisement.address` and a `Peer` id.
_Avoid_: IP, endpoint, URL

**App package**:
The Android app file one phone sends another so it can be installed without a store (SH-2). iOS has none. Handing it to the system installer is journaled as `AppInstallerOpened`.
_Avoid_: APK (in copy), binary, installer

**Link**:
An open connection between two peers over the Transport port, carrying the bytes of one transfer. In code, `TransportLink`. What an accepted transfer hands Packs, each archive as the file it was received into, is a `PeerDelivery`.
_Avoid_: socket, channel, session (that is formation)

**Offer**:
What a sender puts on the table in a transfer: the resources selected and their sizes. The receiver accepts an offer.
_Avoid_: manifest, plan

**Share**:
Sending a passage or story out of the app as text or audio through the system share sheet, with a link to get the app.
_Avoid_: export, transfer

**Import**:
Installing a pack from a burrito file the user opened.
_Avoid_: upload, load

**Payload**:
What a share produces: content, provenance and the link, in one form the share sheet accepts.
_Avoid_: message, attachment

### Device and system

**Device**:
One installation of the app, with its packs, corpus, groups and journal. The sim runs many; a phone runs one.
_Avoid_: client, instance, phone (a phone hosts a device)

**Kernel**:
The pure core of the app: every module wired over ports, created once per device. Screens talk only to it.
_Avoid_: engine, core (as a noun), backend

**Port**:
An interface the kernel needs from the outside world: files, database, network, radios, audio, clock.
_Avoid_: driver, provider, service

**Adapter**:
A concrete implementation of a port. Every port has exactly two: the platform adapter and the memory adapter.
_Avoid_: mock, stub, implementation (when the seam is the topic)

**Media address**:
The address a screen renders a picture from: a story frame image in a pack or a cached impact story image, given by the kernel's media module for a file on the device. A web address is never loaded as a picture.
_Avoid_: image URL, picture link, remote image

**Player**:
The kernel's one audio player. It plays one audio clip at a time, a chapter of an Audio Pack or a story's audio, from its file on the device (audio is download-only in v1.0.0), and reports idle, loading, playing, paused, ended or failed with a code. Only a failure enters the journal; the position never does.
_Avoid_: media player, audio engine, track

**Event**:
A typed record of something that happened in the kernel. Modules communicate and the journal is written in events.
_Avoid_: log line, message, action

**Journal**:
The bounded, append-only record of events on a device, including failures. It leaves the device only through Share.
_Avoid_: log, history, telemetry (telemetry is derived from it)

**Diagnostics file**:
The one file a leader shares from Settings so someone can help: the journal written out as a document, and the snapshot beside it. `npm run replay` rebuilds a device from it. In code the journal half is `JournalExport`, written by `journal.export()` and read by `parseJournalExport`; "export" names only that code, never a word a leader sees, and the file leaves the device only through Share. By default it leaves out what the leader read (the passages, articles and stories opened, and bookmarks), keeping every event; "Include what I read" puts them in for that one share.
_Avoid_: log file, dump, backup

**Snapshot**:
The whole state of a device folded into one document: packs, corpus summary, groups, preferences, journal tail.
_Avoid_: dump, state, export

**Sim**:
The headless world: any number of devices on memory adapters, a fixture catalog and a shared transport, driven from Node.
_Avoid_: mock app, test harness, emulator

**Scenario**:
A scripted run in the sim named for the requirement it proves.
_Avoid_: test case, flow, story

**Fixture language**:
A tiny synthetic language, code `qaa`, with a real burrito for every resource type, used by every scenario. A second, `qab`, has stories but no formation content.
_Avoid_: test data, sample language

### People and locale

**Leader**:
The primary user: a pastor, translator, teacher or group leader in the global church.
_Avoid_: user (in copy and documents), customer, member

**Partner**:
A supporter, or a person who might become one. Secondary audience.
_Avoid_: donor, funder

**Invitation**:
The card that invites a partner to take part, led by an impact story.
_Avoid_: popup, ad, appeal

**Impact story**:
A published account of what the resources have meant for real people, carried from unfoldingWord's website.
_Avoid_: testimonial, case study

**Language**:
A language that has content. What a leader reads in.
_Avoid_: locale (that is the app's own language)

**Preference**:
A value the leader chooses that shapes the app on this device: the app locale, the theme, reduced blur, the first name, the current language, the reading, English movements alongside. One of a closed list of keys. Whether a language's full-text index is wanted is not a preference; Corpus keeps it.
_Avoid_: setting (that is the screen), option, config

**Locale**:
The language of the app's own words: buttons, labels, settings. One of sixteen.
_Avoid_: UI language, interface language, translation

**Locale sign-off**:
A native speaker's review of one drafted locale, recorded with a reviewer and a date in `docs/strings-review.md` and by date in `localeSignOffs`. Only English and the signed-off locales are offered; an unreviewed locale resolves to English. The sim and the web render harness run the **drafts** gate, which offers all sixteen; the app runs the **reviewed** gate.
_Avoid_: approval, certification, translation review (in code)
