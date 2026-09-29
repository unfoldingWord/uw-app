---
status: accepted
---
# Events are the spine: journal, telemetry, snapshot and replay derive from them

Modules return typed events and the kernel appends them to a bounded, append-only journal on the device. Telemetry is a pure fold over events into counts; the snapshot is a fold over stores plus the journal tail; replay feeds an exported journal back through a kernel on memory adapters. We chose this over separate error logging, analytics SDK, state dumps and debug tooling because one spine gives an agent one thing to read when something goes wrong, keeps the privacy promise checkable (only folds leave the device, and the fold list is the PRD's), and makes a field bug reproducible from a file a leader shared out through the share sheet. The alternatives each add a channel that can disagree with the others.
