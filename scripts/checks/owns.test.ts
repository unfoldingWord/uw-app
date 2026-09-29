import { describe, expect, it } from 'vitest';
import { tablesWrittenIn } from '@lib/scope';
import { ownershipFindings, type OwnsClaim } from './owns.ts';

const claims: OwnsClaim[] = [
  { owner: 'kernel', folder: 'src/lib/journal', tables: ['journal'], directories: [], keys: [] },
  { owner: 'packs', folder: 'src/lib/packs', tables: ['packs'], directories: ['packs'], keys: [] },
  { owner: 'home', folder: 'src/features/home', tables: [], directories: [], keys: ['home.name'] },
];

describe('ownershipFindings (AGENTS.md rule 3)', () => {
  it('passes when every value has one owner and only its owner writes it', () => {
    expect(
      ownershipFindings({
        claims,
        createdTables: ['journal', 'packs'],
        sources: [{ path: 'src/lib/packs/store.ts', text: "run('DELETE FROM packs WHERE pack = ?')" }],
        tablesWrittenIn,
      }),
    ).toEqual([]);
  });

  it('names a value claimed twice, a directory inside another, a table no one owns and a foreign writer', () => {
    expect(
      ownershipFindings({
        claims: [
          ...claims,
          {
            owner: 'study',
            folder: 'src/features/study',
            tables: ['packs'],
            directories: ['packs/x'],
            keys: ['home.name'],
          },
        ],
        createdTables: ['journal', 'packs', 'orphans'],
        sources: [
          { path: 'src/lib/catalog/catalog.ts', text: "run('INSERT INTO journal (seq) VALUES (1)')" },
          { path: 'src/features/home/store.ts', text: 'exec(`UPDATE ghosts SET a = 1`)' },
        ],
        tablesWrittenIn,
      }),
    ).toEqual([
      'table packs is claimed by packs and study',
      'key home.name is claimed by home and study',
      'directory packs/x of study lies inside packs of packs',
      'table orphans is created by a migration and owned by no one',
      'src/lib/catalog/catalog.ts writes journal, which kernel owns in src/lib/journal',
      'src/features/home/store.ts writes ghosts, which no one owns',
    ]);
  });
});
