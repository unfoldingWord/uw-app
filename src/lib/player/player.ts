import { failureCodeOf, type FailureCode } from '../domain/failures';
import { packDirectory, packsDirectory, type PackId } from '../domain/pack';
import { defineModule, ownsNothing, type ModuleContext } from '../module';
import type { AudioSource } from '../ports';

export type PlayerState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'failed';

export type PlayerStatus =
  | { readonly state: 'idle' }
  | { readonly state: 'loading'; readonly clip: string }
  | {
      readonly state: 'playing' | 'paused' | 'ended';
      readonly clip: string;
      readonly positionMs: number;
      readonly durationMs: number;
    }
  | { readonly state: 'failed'; readonly clip: string; readonly code: FailureCode };

export type PlayerListener = (status: PlayerStatus) => void;

export type PlayerApi = {
  load(source: AudioSource): Promise<PlayerStatus>;
  play(): Promise<PlayerStatus>;
  pause(): Promise<PlayerStatus>;
  seek(positionMs: number): Promise<PlayerStatus>;
  stop(): Promise<PlayerStatus>;
  status(): PlayerStatus;
  subscribe(listener: PlayerListener): () => void;
};

type Loaded = { readonly clip: string; readonly source: AudioSource };

type Phase = { readonly state: PlayerState; readonly code?: FailureCode };

type Step = { readonly failed?: FailureCode };

const idle: PlayerStatus = Object.freeze({ state: 'idle' });

export function clipOf(source: AudioSource): string {
  return source.path;
}

function segments(path: string): string[] {
  return path.split('/').filter((part) => part !== '');
}

function isInside(path: string, directory: string): boolean {
  const parts = segments(path);
  const root = segments(directory);
  return parts.length > root.length && root.every((part, index) => parts[index] === part);
}

function isPackFile(path: string): boolean {
  return !segments(path).some((part) => part.startsWith('.')) && isInside(path, packsDirectory);
}

function audioCodeOf(error: unknown): FailureCode {
  const code = failureCodeOf(error);
  return code === 'unexpected' ? 'audio.unavailable' : code;
}

function createPlayer(context: ModuleContext) {
  const { audio, files } = context.ports;
  const listeners = new Set<PlayerListener>();
  let loaded: Loaded | undefined;
  let phase: Phase = { state: 'idle' };
  let generation = 0;

  function measured(clip: string, state: 'playing' | 'paused' | 'ended'): PlayerStatus {
    const port = audio.status();
    const durationMs = port.durationMs;
    const positionMs = state === 'ended' ? durationMs : Math.min(durationMs, port.positionMs);
    return { state, clip, positionMs, durationMs };
  }

  function current(): PlayerStatus {
    if (loaded === undefined || phase.state === 'idle') {
      return idle;
    }
    const { clip } = loaded;
    switch (phase.state) {
      case 'loading':
        return { state: 'loading', clip };
      case 'failed':
        return { state: 'failed', clip, code: phase.code ?? 'audio.unavailable' };
      default:
        return measured(clip, phase.state);
    }
  }

  function announce(): PlayerStatus {
    const now = current();
    for (const listener of [...listeners]) {
      listener(now);
    }
    return now;
  }

  function enter(state: PlayerState, code?: FailureCode): PlayerStatus {
    phase = code === undefined ? { state } : { state, code };
    return announce();
  }

  function finishedPlaying(): boolean {
    if (phase.state !== 'playing') {
      return false;
    }
    const port = audio.status();
    return port.state === 'ended' || (port.durationMs > 0 && port.positionMs >= port.durationMs);
  }

  function status(): PlayerStatus {
    if (finishedPlaying()) {
      return enter('ended');
    }
    return current();
  }

  let queue: Promise<void> = Promise.resolve();

  function serial(work: () => Promise<Step>): Promise<Step> {
    const run = queue.then(work);
    queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  function failed(ticket: number, error: unknown): Step {
    if (ticket !== generation) {
      return {};
    }
    const code = audioCodeOf(error);
    enter('failed', code);
    return { failed: code };
  }

  async function settle(step: Step): Promise<PlayerStatus> {
    if (step.failed !== undefined) {
      await context.emit({ type: 'Failure', payload: { code: step.failed, context: { step: 'audio' } } });
    }
    return status();
  }

  async function open(ticket: number, source: AudioSource): Promise<Step | 'opened'> {
    if (ticket !== generation) {
      return {};
    }
    if (source.kind === 'file' && (!isPackFile(source.path) || !(await files.exists(source.path)))) {
      return failed(ticket, { code: 'audio.unavailable' });
    }
    if (ticket !== generation) {
      return {};
    }
    try {
      await audio.load(source);
    } catch (error) {
      return failed(ticket, error);
    }
    return ticket === generation ? 'opened' : {};
  }

  async function load(source: AudioSource): Promise<PlayerStatus> {
    generation += 1;
    const ticket = generation;
    loaded = { clip: clipOf(source), source };
    enter('loading');
    const step = await serial(async () => {
      const opened = await open(ticket, source);
      if (opened !== 'opened') {
        return opened;
      }
      enter('paused');
      return {};
    });
    return settle(step);
  }

  async function play(): Promise<PlayerStatus> {
    const target = loaded;
    if (target === undefined || phase.state === 'loading') {
      return status();
    }
    if (finishedPlaying()) {
      enter('ended');
    }
    if (phase.state === 'playing') {
      return status();
    }
    const ticket = generation;
    const reopen = phase.state !== 'paused';
    if (reopen) {
      enter('loading');
    }
    const step = await serial(async () => {
      if (reopen) {
        const opened = await open(ticket, target.source);
        if (opened !== 'opened') {
          return opened;
        }
      }
      if (ticket !== generation) {
        return {};
      }
      try {
        await audio.play();
      } catch (error) {
        return failed(ticket, error);
      }
      if (ticket === generation) {
        enter('playing');
      }
      return {};
    });
    return settle(step);
  }

  async function pause(): Promise<PlayerStatus> {
    if (finishedPlaying()) {
      return enter('ended');
    }
    if (phase.state !== 'playing') {
      return status();
    }
    const ticket = generation;
    const step = await serial(async () => {
      if (ticket !== generation) {
        return {};
      }
      try {
        await audio.pause();
      } catch (error) {
        return failed(ticket, error);
      }
      if (ticket === generation) {
        enter('paused');
      }
      return {};
    });
    return settle(step);
  }

  async function seek(positionMs: number): Promise<PlayerStatus> {
    const before = status();
    if (before.state !== 'playing' && before.state !== 'paused' && before.state !== 'ended') {
      return before;
    }
    const target = Math.max(0, Math.min(before.durationMs, Math.round(positionMs)));
    const ticket = generation;
    const step = await serial(async () => {
      if (ticket !== generation) {
        return {};
      }
      try {
        if (before.state === 'ended') {
          await audio.pause();
        }
        await audio.seek(target);
      } catch (error) {
        return failed(ticket, error);
      }
      if (ticket !== generation) {
        return {};
      }
      if (before.state === 'ended') {
        enter(target >= before.durationMs ? 'ended' : 'paused');
      } else {
        announce();
      }
      return {};
    });
    return settle(step);
  }

  async function stop(): Promise<PlayerStatus> {
    generation += 1;
    const had = loaded !== undefined;
    loaded = undefined;
    phase = { state: 'idle' };
    if (had) {
      announce();
    }
    const step = await serial(async () => {
      try {
        await audio.unload();
      } catch (error) {
        return { failed: audioCodeOf(error) };
      }
      return {};
    });
    return settle(step);
  }

  function removed(pack: PackId): boolean {
    return loaded?.source.kind === 'file' && isInside(loaded.source.path, packDirectory(pack));
  }

  return {
    api: {
      load,
      play,
      pause,
      seek,
      stop,
      status,
      subscribe(listener: PlayerListener) {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    } satisfies PlayerApi,
    removed,
    stop,
  };
}

export const playerModule = defineModule<PlayerApi>({
  events: [],
  owns: ownsNothing,
  create(context) {
    const player = createPlayer(context);
    return {
      api: player.api,
      async observe(entry) {
        if (entry.type === 'PackRemoved' && player.removed(entry.payload.pack)) {
          await player.stop();
        }
      },
    };
  },
});
