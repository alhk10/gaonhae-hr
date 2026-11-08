import { describe, it, expect } from 'vitest';
import { checkConversionEligibility as check, nextConversionTarget, formatRankWithPoom } from './danConversion';
import { getNextBeltLevel } from '@/constants/beltLevels';

const asOf = new Date(2026, 10, 8); // 08/11/2026

describe('Poom/Dan tracks', () => {
  it('4th Poom never grades into 4th Dan', () => expect(getNextBeltLevel('4th Poom')).toBeNull());
  it('3rd Poom grades to 4th Poom', () => expect(getNextBeltLevel('3rd Poom')).toBe('4th Poom'));
  it('1st Dan grades to 2nd Dan', () => expect(getNextBeltLevel('1st Dan')).toBe('2nd Dan'));
  it('4th Poom converts to 1st Dan first', () => expect(nextConversionTarget('4th Poom')).toBe('1st Dan'));
});

describe('conversion rules', () => {
  it('1st Dan from the 15th birthday', () => {
    expect(check('4th Poom', '2011-11-08', null, asOf).eligible).toBe(true);
    expect(check('1st Poom', '2011-11-09', null, asOf).eligible).toBe(false);
  });
  it('2nd Dan needs 16 and 1 year wait', () => {
    expect(check('1st Dan', '2010-11-08', '2025-11-08', asOf).eligible).toBe(true);
    expect(check('1st Dan', '2010-11-08', '2025-11-09', asOf).eligible).toBe(false);
    expect(check('1st Dan', '2010-11-09', '2020-01-01', asOf).eligible).toBe(false);
  });
  it('3rd Dan needs 18 and 2 years', () => {
    expect(check('2nd Dan', '2008-11-08', '2024-11-08', asOf).eligible).toBe(true);
    expect(check('2nd Dan', '2008-11-08', '2024-11-09', asOf).eligible).toBe(false);
  });
  it('4th Dan needs 21 and 3 years', () => {
    expect(check('3rd Dan', '2005-11-08', '2023-11-08', asOf).eligible).toBe(true);
    expect(check('3rd Dan', '2005-11-09', '2020-01-01', asOf).eligible).toBe(false);
  });
  it('unknown previous date blocks with dateUnknown', () => {
    const r = check('1st Dan', '2000-01-01', null, asOf);
    expect(r.eligible).toBe(false);
    expect(r.dateUnknown).toBe(true);
  });
  it('shows converted Poom', () => expect(formatRankWithPoom('1st Dan', '4th Poom')).toBe('1st Dan (4th Poom)'));
});
