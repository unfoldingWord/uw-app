---
status: accepted
---
# The memory Db adapter takes its SQL engine

The memory Db adapter ran on `node:sqlite`, which exists only in Node, and the web render harness (ADR 0008) needs the same adapter in a browser. We decided that `sim/adapters/sql-db.ts` implements the Db port once, over a small injected `SqlEngine` (`exec`, `run`, `all`, `get`), with its write guard, serialized calls and transactions written once: `node:sqlite` is the engine in Node (the sim, scenarios, checks and replay) and sql.js, the WebAssembly build of SQLite, in the browser (`sim/web/sqljs.ts`). There is still one memory adapter for Db, so this is not a second adapter; the port contract cases run against it with the Node engine. The cost is that the two engines are not the same build: sql.js has no FTS5, so the full-text index is never opened in the harness, and a statement that only one engine accepts would pass the sim and fail the harness, or the reverse. Scenarios and the contract cases run only on `node:sqlite`, which is the engine that proves behaviour; the harness only renders. Accepted with issue #7.
