import { describe, expect, it } from 'vitest';
import type { TrainingOutline, TrainingUnit } from '../../service';
import { manualStateOf, type Course } from './course';

const translate: TrainingUnit = {
  manual: 'translate',
  title: 'Translation Manual',
  lessons: [{ number: 1, title: 'Introduction', id: 'translate/translate-manual' }],
  sections: [{ lessons: [{ number: 1, title: 'Introduction', id: 'translate/translate-manual' }] }],
};

function courseWith(units: readonly TrainingUnit[]): Course {
  const outline: TrainingOutline = { lessons: units.length, units };
  return { outline, group: undefined, storiesOnPhone: false };
}

describe('FO-1 a manual route resolves to its unit, an empty Academy, or a manual that cannot be found', () => {
  it('is loading before the course arrives', () => {
    expect(manualStateOf(undefined, 'translate')).toEqual({ kind: 'loading' });
  });

  it('finds the unit the route names', () => {
    expect(manualStateOf(courseWith([translate]), 'translate')).toEqual({ kind: 'found', unit: translate });
  });

  it('says the Academy is not in the language when it has no units', () => {
    expect(manualStateOf(courseWith([]), 'translate')).toEqual({ kind: 'empty' });
  });

  it('says the manual cannot be found when the route names no unit', () => {
    expect(manualStateOf(courseWith([translate]), 'trnslate')).toEqual({ kind: 'missing' });
    expect(manualStateOf(courseWith([translate]), undefined)).toEqual({ kind: 'missing' });
  });
});
