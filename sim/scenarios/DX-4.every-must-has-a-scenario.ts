import assert from 'node:assert/strict';
import { scenario } from '../scenario';
import { testProvenRequirements, traceRepository } from '../trace';

export default scenario(
  'DX-4',
  'every Must requirement in the PRD has a scenario named for its ID, or a test on the documented list',
  async () => {
    const report = traceRepository();
    assert.ok(report.ids.length > 0, 'the PRD lists Must requirements');
    assert.ok(report.ids.includes('DX-4'));
    assert.deepEqual(report.noScenario, [], 'every Must requirement has a scenario');
    assert.deepEqual(report.missing, [], 'nothing is unproven');
    assert.deepEqual(report.stray, [], 'every scenario is named for a Must requirement');
    assert.deepEqual(
      report.byTest,
      Object.keys(testProvenRequirements),
      'a test stands in for a scenario only where the list says why',
    );
    for (const id of report.byTest) {
      const row = report.rows.find((item) => item.id === id);
      assert.ok(row !== undefined && row.tests.length > 0, `${id} names the test that proves it`);
    }
  },
);
