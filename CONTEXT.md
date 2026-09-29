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

**Pack**:
A set of resources installed on the device and replaced as one unit. Three kinds: **Language Pack** (every text resource for one language), **Image Pack** (the Open Bible Stories images, shared across languages), **Audio Pack** (audio for one resource in one language).
_Avoid_: bundle, download, library (that is a screen)

**Source**:
Where a pack's burritos come from: the Catalog, a Peer, or a File.
_Avoid_: origin, provider

**Provenance**:
The release tag, commit, publisher and licence carried on every piece of content, from download to screen to whatever leaves the device.
_Avoid_: metadata, attribution (attribution is what provenance is rendered as)

**Text**:
A Bible text resource. Two readings may exist for a language: **Literal** (close to the original) and **Simplified** (everyday words).
_Avoid_: ULT, UST, GLT, GST in anything a user sees; Bible (ambiguous)

**Helps**:
The verse-bound resources shown with a passage: **Notes**, **Word Links** and **Questions**.
_Avoid_: resource strip, annotations, translation helps

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

**Link**:
An open connection between two peers over the Transport port, carrying the bytes of one transfer. In code, `TransportLink`.
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

**Event**:
A typed record of something that happened in the kernel. Modules communicate and the journal is written in events.
_Avoid_: log line, message, action

**Journal**:
The bounded, append-only record of events on a device, including failures. It leaves the device only through Share.
_Avoid_: log, history, telemetry (telemetry is derived from it)

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

**Locale**:
The language of the app's own words: buttons, labels, settings. One of sixteen.
_Avoid_: UI language, interface language, translation
