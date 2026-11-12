import { describe, it, expect } from 'vitest';
import { isTermFullyPaid } from './schoolFeePlan';

describe('isTermFullyPaid', () => {
  it('4 of 12 weeks is not paid', () => expect(isTermFullyPaid([{ plan: 'four_weeks', weeks: 4 }], 12)).toBe(false));
  it('three 4-week plans cover 12 weeks', () => expect(isTermFullyPaid([1, 2, 3].map(() => ({ plan: 'four_weeks', weeks: 4 })), 12)).toBe(true));
  it('full-term plan is paid', () => expect(isTermFullyPaid([{ plan: 'term' }], 12)).toBe(true));
});
