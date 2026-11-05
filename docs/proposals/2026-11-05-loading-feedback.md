# Loading feedback: a loading flag on async reads and a lit wave in the dot ring

Status: approved by the requirements owner on 2026-11-05 ("start working on all of these"; decisions delegated to
the agent). Covers #99 (in part) and #86 (in part). The timing rule and the design-system record of the wave are
design changes, listed under "Design changes needed" and not implemented.

## Problem

- `useAsyncValue` (`src/shared/ui/useAsyncValue.ts`) and the Study feature's `useLoaded` report a value but not
  whether a read is in flight. Screens can only show progress on the first read (`value === undefined`), and Home
  and Share rendered nothing at all while that first read ran (#99, gap 5). A reload after a pack change or a save
  left the old content on screen with no sign of work (#99, gap 2).
- `DotRing` (`src/shared/glass/DotRing.tsx`), the system's only loading affordance, breathes as one piece between
  opacity 0.55 and 0.9. On the Training, Library and Study loaders it reads as a frozen field of dots (#86).

## Change

- **`useAsyncValue`** returns `loading` beside `value`, `failure` and `reload`. `AsyncState` gains `requested`;
  `requestAsync(state, request)` records each read as it starts and `isLoading(state)` is true while the newest
  request is newer than the newest settled one. The known value stays in place while loading and after a failed
  re-read (AGENTS.md section 10). Callers that ignore `loading` keep compiling.
- **`useLoaded`** (Study feature, not a shared root) returns `loading` too, through a pure `createLoader` in
  `src/features/study/screens/parts/loader.ts` tested at its interface.
- **Screens:** Home shows `Loading` while its first reads run, Share shows `Loading` in place of the blank sheet,
  and Library and Article lay a `ReloadVeil` (the same `Loading`, pointer events off) over the kept content while a
  reload runs. `BookPicker.onChoose` and `ResultRow.onPress` are typed `() => void | Promise<void>`, and
  `ResultRow` routes its press through `createPressGate` and pulses with the same breathe loop `GlassButton` uses
  while the promise is pending.
- **`DotRing`** keeps the breathe keyframes, its 4.5 s loop, its easing and its colour, and runs them per ring
  instead of over the whole ring: ring `i` of `n` starts `i / n` of the loop after the centre ring
  (`waveDelays` in `keyframeTimeline.ts`), so a lit band travels outward. Each ring is one `Animated.View` over its
  own SVG, driven by the native driver (`useKeyframeWave` in `motion.ts`), so seven animated nodes, not 147. Under
  Reduce Motion the wave does not run and every ring rests at the resting values, opacity 1 and scale 1: a static
  lit ring. No colour, opacity, duration or easing value is new; the phase offset is derived from the ring count.

## Alternatives

- **A new lit colour token and a wave duration** as #86 asks. Not taken here: the design system has no such
  token, and inventing one is a Claude Design change. The breathe peak (0.9) is the lit value the system already
  defines; a brighter lit colour stays open for Claude Design.
- **Animating each of the 147 circles.** More nodes on the native driver for no visible gain; `react-native-svg`
  props also do not run on the native driver.
- **`{ value, loading }` as a breaking return type for `useLoaded`.** Other open PRs read `value` and `reload`;
  adding a field keeps them compiling.
- **Delaying the veil by about 150 ms.** That is the timing rule #99 asks the design system to define. With no
  token, the veil shows for the whole reload.

## Rules affected

- Rule 4: `src/shared/ui/useAsyncValue.ts`, `src/shared/glass/DotRing.tsx`, `motion.ts`, `keyframeTimeline.ts` and
  `geometry.ts` are shared roots; this proposal covers them.
- Rule 7 (UI): every value used comes from the tokens or `referenceValues`. `design-system/` is not edited.
- AGENTS.md section 10: a re-read never overwrites a known value with an unknown one; tested in
  `src/shared/ui/useAsyncValue.test.ts` and `src/features/study/screens/parts/loader.test.ts`.

## Design changes needed

- `DotRing.prompt.md` and `DotRing.d.ts` say "the whole ring breathes". Claude Design should record the per-ring
  wave (or replace it), and may add a lit colour token, which the code would then read.
- The timing rule from #99: acknowledge within a frame, show progress past about 150 ms, show words past about
  2 s. These need motion tokens before code can delay the veil or add words.
