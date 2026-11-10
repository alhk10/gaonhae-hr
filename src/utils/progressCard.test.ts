import { describe, it, expect } from 'vitest';
import { ageOn, termLabelOf } from './progressCard';

describe('progress card helpers', () => {
  it('age is whole years, before birthday not counted', () => {
    expect(ageOn('2018-11-11', new Date(2026, 10, 10))).toBe(7);
    expect(ageOn('2018-11-10', new Date(2026, 10, 10))).toBe(8);
    expect(ageOn(null)).toBeNull();
  });
  it('term label reads like 2026 Term 4', () => {
    expect(termLabelOf('Term 4 2026')).toBe('2026 Term 4');
    expect(termLabelOf('Term 4', '2026-10-01')).toBe('2026 Term 4');
  });
});
