import { describe, expect, it } from 'vitest';
import { createBoot, type BootState } from './boot';

describe('createBoot', () => {
  it('opens once however many times it is started', async () => {
    let opened = 0;
    const boot = createBoot(async () => {
      opened += 1;
      return 'kernel';
    });
    const [first, second] = await Promise.all([boot.start(), boot.start()]);
    await boot.start();
    expect(opened).toBe(1);
    expect(first).toEqual({ status: 'ready', attempt: 1, booted: 'kernel' });
    expect(second).toBe(first);
  });

  it('turns a rejected open into a failed state instead of an unhandled rejection', async () => {
    const boot = createBoot<string>(() => Promise.reject(new Error('db.io')));
    await expect(boot.start()).resolves.toEqual({ status: 'failed', attempt: 1 });
    expect(boot.state()).toEqual({ status: 'failed', attempt: 1 });
  });

  it('turns an open that throws before its first await into a failed state', async () => {
    const boot = createBoot<string>(() => {
      throw new Error('files.io');
    });
    await expect(boot.start()).resolves.toEqual({ status: 'failed', attempt: 1 });
  });

  it('opens again on retry after a failure, and not before', async () => {
    const answers = [false, true];
    let opened = 0;
    const boot = createBoot(async () => {
      opened += 1;
      if (answers.shift() !== true) {
        throw new Error('db.io');
      }
      return 'kernel';
    });
    await boot.retry();
    expect(opened).toBe(0);
    await boot.start();
    const seen: BootState<string>['status'][] = [];
    const stop = boot.subscribe((state) => seen.push(state.status));
    const retried = await boot.retry();
    stop();
    expect(opened).toBe(2);
    expect(retried).toEqual({ status: 'ready', attempt: 2, booted: 'kernel' });
    expect(seen).toEqual(['booting', 'ready']);
    await boot.retry();
    expect(opened).toBe(2);
  });
});
