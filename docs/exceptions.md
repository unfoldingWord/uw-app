# Exceptions

Every exception to rules 1 to 4 of [`AGENTS.md`](../AGENTS.md), written before the code, in the same commit
(rule 5). An exception without an entry here is a defect. Newest first.

| Date | Rule broken | File | Why the rule cannot hold here |
|---|---|---|---|
| 2026-09-29 | Rule 2: `src/platform/*` never imports application code | `src/platform/**` | A platform adapter implements a port, so it must see the port's interface and the domain types that interface names. `src/platform/**` may import `@lib/ports` and `@lib/domain/*` as types only (`import type`), which erase at build and carry no behaviour. Every value import from `@lib`, and every import from `@features`, `@shared` or `@sim`, stays refused. Enforced by the `platform` layer in `scripts/eslint/boundaries.ts` with `allowTypeImports`. |
