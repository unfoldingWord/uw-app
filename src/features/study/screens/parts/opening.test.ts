import { describe, expect, it } from 'vitest';
import { nextOpening, requestKey } from './opening';

describe('ST-2 opening the same verse again reopens its helps (issue #82)', () => {
  it('tells two openings of one reference apart', () => {
    const first = requestKey('RUT 1:16', nextOpening());
    const second = requestKey('RUT 1:16', nextOpening());
    expect(first).not.toBe(second);
  });

  it('keeps one opening the same request on every render', () => {
    const opening = nextOpening();
    expect(requestKey('RUT 1:16', opening)).toBe(requestKey('RUT 1:16', opening));
  });

  it('keeps a link from outside Study, which carries no opening, keyed by its reference', () => {
    expect(requestKey('RUT 1:16', undefined)).toBe(requestKey('RUT 1:16', undefined));
    expect(requestKey('RUT 1:16', undefined)).not.toBe(requestKey('RUT 1:17', undefined));
    expect(requestKey(undefined, undefined)).not.toBe(requestKey('RUT 1:16', undefined));
  });
});
