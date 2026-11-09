/**
 * STF Poom → Dan administrative conversion rules. Mirrors the database
 * function `_dan_conversion_check`, which enforces them on invoice lines.
 *
 *  1st Dan: 15th birthday, any Poom (1st–4th)
 *  2nd Dan: 16th birthday, 1st Dan, 1 year since previous conversion
 *  3rd Dan: 18th birthday, 2nd Dan, 2 years
 *  4th Dan: 21st birthday, 3rd Dan, 3 years
 *  Dan > Dan also needs a previous Poom rank >= target Dan (e.g. 4th Poom for 4th Dan);
 *  otherwise the student must take a grading.
 */
import { parseDateOnly } from '@/utils/birthDate';

export const POOM_RANKS = ['1st Poom', '2nd Poom', '3rd Poom', '4th Poom'];
const DAN_STEPS: Record<string, { minAge: number; requires: string; waitYears: number }> = {
  '2nd Dan': { minAge: 16, requires: '1st Dan', waitYears: 1 },
  '3rd Dan': { minAge: 18, requires: '2nd Dan', waitYears: 2 },
  '4th Dan': { minAge: 21, requires: '3rd Dan', waitYears: 3 },
};

const ageOn = (dob: Date, asOf: Date) => {
  let a = asOf.getFullYear() - dob.getFullYear();
  const m = asOf.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && asOf.getDate() < dob.getDate())) a -= 1;
  return a;
};
const addYears = (d: Date, y: number) => new Date(d.getFullYear() + y, d.getMonth(), d.getDate());

/** Next conversion for a belt (4th Poom → 1st Dan first; never skips). */
export const nextConversionTarget = (belt?: string | null): string | null => {
  if (!belt) return null;
  if (POOM_RANKS.includes(belt)) return '1st Dan';
  const hit = Object.entries(DAN_STEPS).find(([, s]) => s.requires === belt);
  return hit ? hit[0] : null;
};

export interface ConversionCheck { target: string | null; eligible: boolean; reason: string | null; dateUnknown?: boolean; gradingRequired?: boolean }

export function checkConversionEligibility(
  belt: string | null | undefined,
  dob: string | Date | null | undefined,
  lastConversion: string | Date | null | undefined,
  asOf: Date = new Date(),
  prePoom?: string | null,
): ConversionCheck {
  const target = nextConversionTarget(belt);
  if (!target) return { target: null, eligible: false, reason: 'No conversion for this rank' };
  const birth = dob ? parseDateOnly(dob) : null;
  if (!birth) return { target, eligible: false, reason: 'Date of birth is missing' };
  const age = ageOn(birth, asOf);
  if (target === '1st Dan') {
    return age >= 15 ? { target, eligible: true, reason: null } : { target, eligible: false, reason: 'Available from the 15th birthday' };
  }
  const step = DAN_STEPS[target];
  const poomNo = prePoom ? parseInt(prePoom, 10) : 0;
  if (!(poomNo >= parseInt(target, 10))) return { target, eligible: false, gradingRequired: true, reason: `Needs ${target.replace('Dan', 'Poom')} before conversion - take the grading instead` };
  if (age < step.minAge) return { target, eligible: false, reason: `Available from the ${step.minAge}th birthday` };
  const last = lastConversion ? parseDateOnly(lastConversion) : null;
  if (!last) return { target, eligible: false, dateUnknown: true, reason: `Previous Dan conversion date unknown - upload the ${step.requires} certificate` };
  const until = addYears(last, step.waitYears);
  if (until > asOf) return { target, eligible: false, reason: `Wait until ${String(until.getDate()).padStart(2, '0')}/${String(until.getMonth() + 1).padStart(2, '0')}/${until.getFullYear()}` };
  return { target, eligible: true, reason: null };
}

/** Badge shown on Attendance / profile: eligible, or Dan holder whose date is unknown but old enough. */
export const conversionDue = (c: ConversionCheck) => !c.gradingRequired && (c.eligible || !!c.dateUnknown);

/** "1st Dan (4th Poom)" when a Poom was converted. */
export const formatRankWithPoom = (belt?: string | null, prePoom?: string | null) =>
  belt && prePoom && /Dan$/.test(belt) ? `${belt} (${prePoom})` : belt || '';

/** Product name for a conversion from a given rank. */
export const conversionProductName = (belt: string) => {
  const t = nextConversionTarget(belt);
  return t ? `STF ${belt} > ${t}` : null;
};
