declare const describe: any, it: any, expect: any;
import { eventIneligibility, gradeRank, seminarIneligibility, ageByBirthYear, ageDivision } from './perthCompRules';

describe('Perth comp rules', () => {
  it('allows own grade and higher, not lower', () => {
    const r = gradeRank('g6');
    expect(eventIneligibility('g6', r)).toBeNull();
    expect(eventIneligibility('g1', r)).toBeNull();
    expect(eventIneligibility('g7', r)).not.toBeNull();
  });
  it('restricts Poom/Dan holders to Poom/Dan events', () => {
    expect(eventIneligibility('g1', 10)).not.toBeNull();
    expect(eventIneligibility('pd_koryo', 10)).toBeNull();
  });
  it('blocks non-geup Foundation from competition', () => {
    expect(eventIneligibility('g10', gradeRank('foundation'))).not.toBeNull();
  });
  it('Kyorugi Seminar 2 needs age 9+ and Red belt or above', () => {
    expect(seminarIneligibility('ks2', 8, gradeRank('g2'), [])).not.toBeNull();
    expect(seminarIneligibility('ks2', 9, gradeRank('g2'), [])).toBeNull();
    expect(seminarIneligibility('ks2', 9, gradeRank('g3'), [])).not.toBeNull();
  });
  it('age is by birth year', () => {
    expect(ageByBirthYear('2020-12-31')).toBe(6);
    expect(ageDivision(6)).toBe('4-6');
    expect(ageDivision(18)).toBe('18+');
  });
});
