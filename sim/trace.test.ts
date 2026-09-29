import { describe, expect, it } from 'vitest';
import { coverage, mustRequirementIds, strayScenarios, unproven, withoutScenario } from './trace.ts';

const prd = [
  '| ID | Requirement | Priority |',
  '|---|---|---|',
  '| ST-3 | Text toggle. | Must |',
  '| ST-11 | Something later. | Later |',
  '| SH-1 | Transfer with no internet. | Must |',
  '| DX-4 | Proven in the sim. | Must |',
].join('\n');

describe('trace', () => {
  it('reads only the Must requirement IDs from the PRD tables', () => {
    expect(mustRequirementIds(prd)).toEqual(['ST-3', 'SH-1', 'DX-4']);
  });

  it('counts a scenario named for the ID or a test that names it as proof', () => {
    const rows = coverage(
      ['ST-3', 'SH-1', 'DX-4'],
      ['SH-1.transfer-ios-to-android.ts', 'SH-10.other.ts'],
      [{ path: 'src/lib/corpus/corpus.test.ts', text: "describe('ST-3 text toggle', () => {})" }],
    );
    expect(unproven(rows)).toEqual(['DX-4']);
    expect(rows[0]?.tests).toEqual(['src/lib/corpus/corpus.test.ts']);
    expect(rows[1]?.scenarios).toEqual(['SH-1.transfer-ios-to-android.ts']);
  });

  it('does not mistake a longer ID for a shorter one', () => {
    const rows = coverage(['ST-1'], ['ST-10.bookmarks.ts'], [{ path: 'a.test.ts', text: 'ST-10' }]);
    expect(unproven(rows)).toEqual(['ST-1']);
  });

  it('asks DX-4 for a scenario, counting a test only as secondary proof', () => {
    const rows = coverage(
      ['ST-3', 'SH-1'],
      ['SH-1.transfer.ts'],
      [{ path: 'src/lib/corpus/corpus.test.ts', text: 'ST-3' }],
    );
    expect(unproven(rows)).toEqual([]);
    expect(withoutScenario(rows)).toEqual(['ST-3']);
  });

  it('names a scenario whose ID is not a Must requirement', () => {
    expect(
      strayScenarios(['ST-3'], ['ST-3.toggle.ts', 'ST-33.typo.ts', 'XX-1.later.ts', 'helpers.ts']),
    ).toEqual(['ST-33.typo.ts', 'XX-1.later.ts', 'helpers.ts']);
  });
});
