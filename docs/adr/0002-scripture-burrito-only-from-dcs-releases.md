---
status: accepted
---
# Scripture Burrito only, supplied by DCS releases

Resources on Door43 are Resource Containers; every existing unfoldingWord app parses that format. This app reads and writes Scripture Burrito only, and takes its burritos from the archives DCS generates for tagged production releases rather than converting anything itself. The reason is the transfer and share requirements: what leaves a phone must be a standard other tools open, and one format on both sides of every seam keeps Corpus the only parser in the tree. The cost is a dependency on DCS's generator for the two cases it does not yet cover, the formation repository and audio, recorded in `docs/content-contract.md` with a validator both sides can run. A project-owned converter is the named fallback for those cases and a decision to take on the record, not a drift.
