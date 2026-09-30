# Journal the installer hand-off and boot-time platform faults

Status: approved in issue #64 (the issue's direction is the requirements owner's delegate's approval for this
round, which asks to build).

## Problem

- Only a failed installer hand-off was journaled. When an Android phone that received the app opened the
  system installer on it (SH-2), the journal said nothing, so a diagnostics file could not show that the step
  was reached.
- The iCloud backup exclusion (issue #4, decision row 58) runs inside
  `createPlatformPorts` and fails closed: it throws before any kernel exists, so the fault reached no journal.
  A boot-time platform fault had no way to become a `Failure` with a code.

## Change

- `src/lib/domain/events.ts`: one event, `AppInstallerOpened`, with an empty payload and replay class
  `verbatim`, emitted by Transfer's `installApp()` after the Transport port's `install(path)` resolves. A refused
  hand-off stays a `Failure` and emits no opening. There are 44 events.
- `src/lib/domain/failures.ts`: one failure step, `backup`.
- `src/lib/faults.ts`: `createStartFaults()` keeps the faults of boot attempts that failed (`capture(open)`
  records `{ code, step }` from the error and rethrows it), at most eight, in memory only. `startFaultOf` reads
  the code with `failureCodeOf` and the step from the error's `step` field when it is a failure step, else
  `start`. The kernel re-exports `createStartFaults`.
- `src/lib/compose.ts`: `KernelOptions.faults`. `start()` journals each as `Failure { code, context: { step } }`
  after the migrations and the journal load, before the modules start and before `AppOpened`.
- `src/platform/backup.ts`: every error the exclusion throws carries `step: 'backup'` beside its `files.io` code.
- `app/_layout.tsx`: `openKernel` captures `createPlatformPorts` through one `startFaults`, passes the pending
  faults to `createKernel`, and clears them once `start()` succeeds. Fail-closed is unchanged: a failed
  exclusion still stops the boot and shows `BootFailure`; Try again opens fresh ports, and the kernel that
  starts journals the earlier fault.
- The sim device takes `startFaults` for its first boot only. `sim/scenarios/DX-1.b-start-fault-is-a-failure.ts`
  proves the order, that a restart does not journal it again, and that replay names the fault as its first
  divergence (the sim has no platform to fail, as with a failed migration).

What this does not do: a fault that fails every attempt is never journaled, because the fault is exactly that
nothing may be written where a backup reaches it, and the journal lives there. It is not kept across launches.

## Alternatives

- Write the fault to the journal anyway. The journal is in the database under the directory the exclusion
  failed to protect; writing there is what fail-closed forbids.
- Persist the fault in the iOS caches directory, which iCloud never backs up, and journal it on the next
  launch. It needs a new Files location outside the device root and a writer for it; worth it only if
  phones show the fault recurring across launches.
- A new port for platform faults. Every port needs two adapters, and the sim adapter would only hand back what
  the scenario put in; a kernel option is the same seam with less surface.
- A distinct event such as `PlatformFaulted`. AGENTS.md section 10 says a failure is a `Failure` with a code;
  a second failure shape would split every fold and screen that reads failures.

## Rules affected

- AGENTS.md rule 4: `src/lib/domain/*`, `src/lib/compose.ts` (the kernel's composition), `src/lib/kernel.ts`,
  `src/platform/` and `app/_layout.tsx` are shared roots; this proposal covers each change. No rule is broken,
  so `docs/exceptions.md` gains no row.
- `docs/architecture.md` (events, kernel options) and `docs/replay.md` (what the journal cannot carry) are
  updated in the same commit.
