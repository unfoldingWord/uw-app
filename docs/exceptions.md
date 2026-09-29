# Exceptions

Every exception to rules 1 to 4 of [`AGENTS.md`](../AGENTS.md), written before the code, in the same commit
(rule 5). An exception without an entry here is a defect. Newest first.

| Date | Rule broken | File | Why the rule cannot hold here |
|---|---|---|---|
| 2026-09-29 | Rule 2: `sim/*` imports `src/lib/*` and `src/features/*/service.ts` and nothing else | `sim/migrations.ts` | Migrations are discovered by reserved location (`migrations/` and `src/features/*/migrations/`, AGENTS.md rule 4), never listed in a registry, so the sim finds them by reading those directories and loading each file by its path. A migration file is data: an id and SQL statements, typed by `import type { Migration } from '@lib/ports'`, and the `migrations` lint layer in `scripts/eslint/boundaries.ts` refuses any other import in it. The sim loads nothing else this way. |
| 2026-09-29 | Rule 2: `src/platform/*` never imports application code | `src/platform/**` | A platform adapter implements a port, so it must see the port's interface and the domain types that interface names. `src/platform/**` may import `@lib/ports` and `@lib/domain/*` as types only (`import type`), which erase at build and carry no behaviour. Every value import from `@lib`, and every import from `@features`, `@shared` or `@sim`, stays refused. Enforced by the `platform` layer in `scripts/eslint/boundaries.ts` with `allowTypeImports`. |
