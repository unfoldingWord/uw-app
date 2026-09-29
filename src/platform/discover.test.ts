import { describe, expect, it } from 'vitest';
import { collectMigrations, type ModuleContext } from './discover';

function contextOf(modules: Record<string, unknown>): ModuleContext {
  return Object.assign((id: string) => modules[id], { keys: () => Object.keys(modules) });
}

const migration = (id: string) => ({ default: { id, statements: [`CREATE TABLE t_${id.slice(0, 4)} (n)`] } });

describe('migration discovery by reserved location', () => {
  it('collects migrations/ and every feature migrations/ folder in code-point order of their ids', () => {
    const found = collectMigrations([
      contextOf({
        './0100-corpus.ts': migration('0100-corpus'),
        './0001-journal.ts': migration('0001-journal'),
      }),
      contextOf({
        './home/migrations/0200-home.ts': migration('0200-home'),
        './home/migrations/README.md': 'ignored',
      }),
    ]);
    expect(found.map((item) => item.id)).toEqual(['0001-journal', '0100-corpus', '0200-home']);
  });

  it('refuses a file that is not a migration, declares another id, or repeats one', () => {
    expect(() => collectMigrations([contextOf({ './0001-a.ts': { default: 'x' } })])).toThrow(
      './0001-a.ts must default-export a Migration',
    );
    expect(() => collectMigrations([contextOf({ './0001-a.ts': migration('0001-b') })])).toThrow(
      './0001-a.ts must declare the id 0001-a',
    );
    expect(() =>
      collectMigrations([
        contextOf({ './0001-a.ts': migration('0001-a') }),
        contextOf({ './x/migrations/0001-a.ts': migration('0001-a') }),
      ]),
    ).toThrow('migration 0001-a is declared twice');
  });
});
