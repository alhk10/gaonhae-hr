/** Rules for the Perth Seminars & Poomsae Championship 2026 (mirrors submit_perth_event_registration). */

export const PERTH_BANK_INFO = 'ACCOUNT NAME: GAONHAE TAEKWONDO\nBSB: 803-439\nACCOUNT NUMBER: 238 648 651\nPlease use the participant name as reference.';

export const SEMINARS = [
  { code: 'ps1', short: 'PS1', name: 'Poomsae Seminar 1', time: '11:00am – 12:30pm', who: 'Green to Black Tip belt · Age 7+', cap: 30 },
  { code: 'ks1', short: 'KS1', name: 'Kyorugi Seminar 1', time: '12:40pm – 2:10pm', who: 'Green Belt & Above · Age 7+', cap: 30 },
  { code: 'ps2', short: 'PS2', name: 'Poomsae Seminar 2', time: '2:40pm – 4:10pm', who: 'Poom & Dan belts · Age 7+', cap: 50 },
  { code: 'ks2', short: 'KS2', name: 'Kyorugi Seminar 2', time: '4:20pm – 5:50pm', who: 'Red Belt & Above · Age 10+', cap: 30 },
];

const GEUP_POOMSAE: Record<number, string> = { 10: 'Taegeuk 1 Jang', 9: 'Taegeuk 1 Jang', 8: 'Taegeuk 2 Jang', 7: 'Taegeuk 2 Jang', 6: 'Taegeuk 3 Jang', 5: 'Taegeuk 4 Jang', 4: 'Taegeuk 5 Jang', 3: 'Taegeuk 6 Jang', 2: 'Taegeuk 7 Jang', 1: 'Taegeuk 8 Jang' };

export const COMP_EVENTS = [
  ...[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((g) => ({ code: `g${g}`, kind: 'geup' as const, label: `Geup ${g} – ${GEUP_POOMSAE[g]}` })),
  { code: 'pd_t7', kind: 'poomdan' as const, label: 'Poom/Dan – Taegeuk 7 Jang' },
  { code: 'pd_t8', kind: 'poomdan' as const, label: 'Poom/Dan – Taegeuk 8 Jang' },
  { code: 'pd_koryo', kind: 'poomdan' as const, label: 'Poom/Dan – Koryo' },
  { code: 'pd_keumgang', kind: 'poomdan' as const, label: 'Poom/Dan – Keumgang' },
  { code: 'pd_taebaek', kind: 'poomdan' as const, label: 'Poom/Dan – Taebaek' },
];

export const AGE_DIVISIONS = ['4–6', '7–8', '9–11', '12–14', '15–17', '18 & above'];

export const GRADES = [
  ...[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((g) => ({ value: `g${g}`, label: `${g} Geup` })),
  { value: 'poomdan', label: 'Poom / Dan' },
];

export const GAONHAE_BELTS = [
  { value: 'foundation', label: 'Foundation 1, 2 or 3 (non-geup)' },
  { value: 'g10', label: 'White' }, { value: 'g9', label: 'Yellow Tip' }, { value: 'g8', label: 'Yellow' },
  { value: 'g7', label: 'Green Tip' }, { value: 'g6', label: 'Green' }, { value: 'g5', label: 'Blue Tip' },
  { value: 'g4', label: 'Blue' }, { value: 'g3', label: 'Red Tip' }, { value: 'g2', label: 'Red' },
  { value: 'g1', label: 'Black Tip' }, { value: 'poomdan', label: 'Poom / Dan' },
];

/** -1 = non-geup, 0 = 10 Geup … 9 = 1 Geup, 10 = Poom/Dan. */
export const gradeRank = (grade: string): number => {
  if (grade === 'poomdan') return 10;
  const m = /^g(\d+)$/.exec(grade);
  return m ? 10 - Number(m[1]) : -1;
};

export const gradeLabel = (grade: string) =>
  grade === 'poomdan' ? 'Poom / Dan' : grade === 'foundation' ? 'Foundation (non-geup)' : `${grade.slice(1)} Geup`;

/** Competition age is determined by birth year. */
export const ageByBirthYear = (dob: string) => 2026 - Number(dob.slice(0, 4));

export const ageDivision = (age: number) =>
  age < 4 ? null : age <= 6 ? '4-6' : age <= 8 ? '7-8' : age <= 11 ? '9-11' : age <= 14 ? '12-14' : age <= 17 ? '15-17' : '18+';

export const seminarIneligibility = (code: string, age: number | null, rank: number | null, selected: string[]): string | null => {
  if (age === null || rank === null) return 'Enter date of birth and grade';
  const rule: Record<string, [number, (r: number) => boolean, string]> = {
    ps1: [7, (r) => r >= 4 && r <= 9, 'Green to Black Tip only'],
    ks1: [7, (r) => r >= 4 && r <= 9, 'Green Belt & Above only'],
    ps2: [7, (r) => r === 10, 'Poom & Dan only'],
    ks2: [10, (r) => r >= 8, 'Red Belt & Above only'],
  };
  const [minAge, ok, msg] = rule[code];
  if (age < minAge) return `Age ${minAge}+ only`;
  if (!ok(rank)) return msg;
  return null;
};

/** Own grade or higher; Poom/Dan holders only Poom/Dan events. */
export const eventIneligibility = (code: string, rank: number | null): string | null => {
  if (rank === null || rank < 0) return 'Not eligible';
  const isPd = code.startsWith('pd_');
  if (rank === 10) return isPd ? null : 'Poom/Dan events only';
  if (isPd) return 'Poom/Dan holders only';
  return gradeRank(code) >= rank ? null : 'Below current grade';
};

export const eventLabel = (code: string) => COMP_EVENTS.find((e) => e.code === code)?.label || code;
export const seminarLabel = (code: string) => SEMINARS.find((s) => s.code === code)?.name || code;
