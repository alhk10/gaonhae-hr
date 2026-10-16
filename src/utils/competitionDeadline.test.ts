import { describe, expect, it } from 'bun:test';
import { parseDeadline, splitDeadline, isPastDeadline } from './competitionDeadline';

describe('competition deadline', () => {
  it('reads entered time as GMT+8', () => {
    expect(parseDeadline('06/11/2026', '23:59')).toBe('2026-11-06T15:59:00.000Z');
  });
  it('empty date means no deadline', () => {
    expect(parseDeadline('', '')).toBeNull();
  });
  it('rejects invalid dates', () => {
    expect(parseDeadline('31/02/2026', '10:00')).toBeUndefined();
  });
  it('round-trips', () => {
    expect(splitDeadline('2026-11-06T15:59:00.000Z')).toEqual({ date: '06/11/2026', time: '23:59' });
  });
  it('event closes at the deadline', () => {
    const dl = '2026-11-06T15:59:00.000Z';
    expect(isPastDeadline(dl, new Date('2026-11-06T15:58:59Z'))).toBe(false);
    expect(isPastDeadline(dl, new Date('2026-11-06T15:59:00Z'))).toBe(true);
    expect(isPastDeadline(null)).toBe(false);
  });
});
