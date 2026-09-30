---
status: accepted
---
# v1.0.0 counts on the phone and sends nothing

PRD 9 allows anonymous aggregate counts, each a fold over events (ADR 0003), and PRD 14 proposes the measures. Sending them needs an endpoint, a batching and retry policy, an iOS privacy manifest entry and a privacy screen that matches, and none of these is decided. We decided (issue #52) that v1.0.0 ships counting only: the `telemetry` kernel module folds the journal into the PRD 9 list, `telemetry.leaving()` is exactly that list, and the privacy screen shows it with copy saying the app counts on the phone and will send only these numbers once a later release turns sending on. Nothing leaves the phone; the Http port has no telemetry host on its allowlist. Sending is v1.1: it adds one host to the allowlist, a Share-free outbound path through the Http port, the privacy manifest declaration (Product Interaction, not linked, not tracking) and the privacy copy, together. The cost is that the success measures of PRD 14 are not observable for the first release except from diagnostics files leaders choose to share.
