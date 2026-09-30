import { describe, expect, it } from 'vitest';
import { audioPackId, languagePackId } from '@lib/domain/pack';
import { parseReference } from '@lib/domain/reference';
import { installFromCatalog } from './install';
import { createWorld } from './world';

const ruthAudio = audioPackId('qaa', 'qaa_ult');

async function phoneWithClip() {
  const world = createWorld();
  const phone = world.device('phone');
  await phone.start();
  await installFromCatalog(phone, [languagePackId('qaa'), ruthAudio]);
  const parsed = parseReference('RUT 1:1');
  if (!parsed.ok) {
    throw new Error('RUT 1:1 is not a reference');
  }
  const [clip] = (await phone.kernel.corpus.passage(parsed.reference, { language: 'qaa' }))?.audio ?? [];
  if (clip === undefined) {
    throw new Error('the audio pack carries no clip for Ruth 1');
  }
  phone.adapters.audio.provide({ kind: 'file', path: clip.path }, 40_000);
  return { world, phone, path: clip.path };
}

describe('player', () => {
  it('keeps the last clip asked for when two loads overlap', async () => {
    const { phone, path } = await phoneWithClip();
    const stream = 'https://git.door43.org/unfoldingWord/qaa_ult/raw/branch/master/01.mp3';
    phone.adapters.audio.provide({ kind: 'url', url: stream }, 20_000);
    const player = phone.kernel.player;
    const [first, second] = await Promise.all([
      player.load({ kind: 'file', path }),
      player.load({ kind: 'url', url: stream }),
    ]);
    expect(second).toEqual({ state: 'paused', clip: stream, positionMs: 0, durationMs: 20_000 });
    expect('clip' in first && first.clip).toBe(stream);
    expect(player.status()).toEqual(second);
  });

  it('refuses a file outside an installed pack without asking the port', async () => {
    const { phone } = await phoneWithClip();
    phone.adapters.audio.provide({ kind: 'file', path: 'diagnostics/journal.json' }, 1_000);
    const status = await phone.kernel.player.load({ kind: 'file', path: 'diagnostics/journal.json' });
    expect(status).toEqual({ state: 'failed', clip: 'diagnostics/journal.json', code: 'audio.unavailable' });
    expect(phone.adapters.audio.status().state).toBe('idle');
  });

  it('stops when the pack that holds the clip is removed', async () => {
    const { phone, path } = await phoneWithClip();
    const player = phone.kernel.player;
    const seen: string[] = [];
    const unsubscribe = player.subscribe((status) => seen.push(status.state));
    await player.load({ kind: 'file', path });
    await player.play();
    expect((await phone.kernel.packs.remove(ruthAudio)).ok).toBe(true);
    expect(player.status()).toEqual({ state: 'idle' });
    expect(phone.adapters.audio.status().state).toBe('idle');
    unsubscribe();
    await player.load({ kind: 'file', path });
    expect(seen).toEqual(['loading', 'paused', 'playing', 'idle']);
  });

  it('does nothing when asked to play, pause or seek with nothing loaded', async () => {
    const { phone } = await phoneWithClip();
    const player = phone.kernel.player;
    expect(await player.play()).toEqual({ state: 'idle' });
    expect(await player.pause()).toEqual({ state: 'idle' });
    expect(await player.seek(5_000)).toEqual({ state: 'idle' });
    expect(await player.stop()).toEqual({ state: 'idle' });
  });
});
