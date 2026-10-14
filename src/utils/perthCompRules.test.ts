declare const describe: any, it: any, expect: any;
import { eventIneligibility, gradeRank, seminarIneligibility, ageByBirthYear, ageDivision, SEMINARS } from './perthCompRules';

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
  it('Kyorugi Seminar 2 needs age 10+ and Red belt or above', () => {
    expect(seminarIneligibility('ks2', 9, gradeRank('g2'), [])).not.toBeNull();
    expect(seminarIneligibility('ks2', 10, gradeRank('g2'), [])).toBeNull();
    expect(seminarIneligibility('ks2', 10, gradeRank('g3'), [])).not.toBeNull();
  });
  it('Kyorugi Seminar 1 allows Green belt and above, including Black Tip', () => {
    expect(seminarIneligibility('ks1', 7, gradeRank('g6'), [])).toBeNull();
    expect(seminarIneligibility('ks1', 7, gradeRank('g1'), [])).toBeNull();
    expect(seminarIneligibility('ks1', 7, gradeRank('g8'), [])).not.toBeNull();
  });
  it('Kyorugi 1 and Poomsae 2 no longer overlap and can be combined', () => {
    expect(seminarIneligibility('ks1', 7, gradeRank('g6'), ['ps2'])).toBeNull();
    expect(seminarIneligibility('ps2', 12, 10, ['ks1'])).toBeNull();
  });
  it('seminar caps match the posters: 30, 30, 50, 30', () => {
    const caps = SEMINARS.map((s) => s.cap);
    expect(caps).toEqual([30, 30, 50, 30]);
  });
  it('age is by birth year', () => {
    expect(ageByBirthYear('2020-12-31')).toBe(6);
    expect(ageDivision(6)).toBe('5-6');
    expect(ageDivision(4)).toBeNull();
    expect(ageDivision(18)).toBe('18+');
  });
});
