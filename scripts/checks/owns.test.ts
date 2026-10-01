import { describe, expect, it } from 'vitest';
import { tablesWrittenIn } from '@lib/scope';
import { nonLiteralTargetsIn, ownershipFindings, writerSources, type OwnsClaim } from './owns.ts';

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

  it('reads copy tables as copy, not as SQL writes', () => {
    const sources = [
      { path: 'src/lib/strings/en/packs.ts', text: "'Update when you are ready'" },
      { path: 'src/lib/strings/locales/fr.ts', text: "'update its records'" },
      { path: 'src/lib/stringsmith/x.ts', text: "run('UPDATE when SET a = 1')" },
      { path: 'src/lib/catalog/catalog.ts', text: "run('UPDATE its SET a = 1')" },
    ];
    expect(
      ownershipFindings({ claims, createdTables: [], sources: writerSources(sources), tablesWrittenIn }),
    ).toEqual([
      'src/lib/stringsmith/x.ts writes when, which no one owns',
      'src/lib/catalog/catalog.ts writes its, which no one owns',
    ]);
  });

  it('refuses a table named by an interpolation or a concatenation unless it is admitted with the tables it ranges over', () => {
    const sources = [
      { path: 'src/lib/packs/store.ts', text: 'run(`DELETE FROM ${table} WHERE pack = ?`)' },
      { path: 'src/lib/packs/store.ts', text: "run('INSERT INTO ' + packsTable + ' (pack) VALUES (?)')" },
      { path: 'src/lib/catalog/catalog.ts', text: 'run(`UPDATE ${journalTable} SET seq = 1`)' },
      { path: 'src/lib/packs/clear.ts', text: 'run(`DELETE FROM "${name}" WHERE 1`)' },
    ];
    expect(
      ownershipFindings({
        claims,
        createdTables: [],
        sources,
        tablesWrittenIn,
        nonLiteralTargetsIn,
        admittedTargets: [
          { path: 'src/lib/packs/store.ts', expression: 'table', tables: ['packs'] },
          { path: 'src/lib/catalog/catalog.ts', expression: 'journalTable', tables: ['journal'] },
          { path: 'src/lib/packs/gone.ts', expression: 'table', tables: ['packs'] },
        ],
      }),
    ).toEqual([
      'src/lib/packs/store.ts writes a table named by packsTable, not a literal; write the table name in the SQL, or admit the expression with the tables it ranges over in scripts/checks/owns.check.ts',
      'src/lib/packs/clear.ts writes a table named by name, not a literal; write the table name in the SQL, or admit the expression with the tables it ranges over in scripts/checks/owns.check.ts',
      'src/lib/catalog/catalog.ts writes journal (through journalTable), which kernel owns in src/lib/journal',
      'src/lib/packs/gone.ts no longer names a table by table; remove its entry from scripts/checks/owns.check.ts',
    ]);
  });

  it('finds every non-literal write target and no literal one', () => {
    expect(
      nonLiteralTargetsIn(
        [
          'run(`INSERT OR REPLACE INTO ${a} (x) VALUES (?)`)',
          'run(`CREATE TABLE IF NOT EXISTS ${b.name} (x)`)',
          "run('DROP TABLE IF EXISTS ' + c)",
          'run(`CREATE INDEX i ON ${d} (x)`)',
          'run(`DELETE FROM packs WHERE id IN (${ids})`)',
          'run(`INSERT INTO packs (${columns}) VALUES (?)`)',
        ].join('\n'),
      ),
    ).toEqual(['a', 'b.name', 'c', 'd']);
  });
});
