---
status: accepted
---
# One install path for catalog, peer and file

Downloading a language pack, receiving one from another phone and importing a burrito file are the same operation: `packs.install(source, plan)`, with `fromCatalog`, `fromPeer` and `fromFile` as the three sources. We chose this over three features with three code paths so that atomic replacement, checksum verification, provenance and the events are written once and proven once, and so that a transfer's receiving half is nothing more than an install. The transfer protocol is then only about moving bytes and negotiating an offer, which is why it can be a small state machine over the Transport port.
