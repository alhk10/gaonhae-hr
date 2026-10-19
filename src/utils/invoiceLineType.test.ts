import { describe, it, expect } from 'vitest';
import { isClassLineItem } from './invoiceLineType';

describe('isClassLineItem', () => {
  it('treats belts as products (qty shown)', () => {
    expect(isClassLineItem({ description: 'Color Belt (Yellow / 140)' })).toBe(false);
  });
  it('treats term-linked lines as classes', () => {
    expect(isClassLineItem({ description: 'Kids 1x/week', metadata: { term_id: 't1' } })).toBe(true);
  });
  it('treats ad-hoc lessons as classes', () => {
    expect(isClassLineItem({ description: 'Ad-Hoc Lesson' })).toBe(true);
  });
});
