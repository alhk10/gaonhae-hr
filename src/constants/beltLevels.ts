/**
 * Belt Level Constants
 * Central source of truth for belt level options across the application.
 *
 * Country-aware system:
 * - Singapore branches use the foundation belts: Foundation 1, Foundation 2, Foundation 3
 *   then White → Yellow Tip → Yellow → … → 5th Dan.
 * - Australia branches use a single "Foundation" belt
 *   then White → Yellow Tip → Yellow → … → 5th Dan.
 *
 * Note: Poom belts are for students under 15 years old.
 * At age 15, they convert to Dan.
 */

// Common progression after foundation (shared across all countries)
export const COMMON_BELTS = [
  'White',
  'Yellow Tip',
  'Yellow',
  'Green Tip',
  'Green',
  'Blue Tip',
  'Blue',
  'Red Tip',
  'Red',
  'Black Tip',
  '1st Poom',
  '1st Dan',
  '2nd Poom',
  '2nd Dan',
  '3rd Poom',
  '3rd Dan',
  '4th Poom',
  '4th Dan',
  '5th Dan',
] as const;

// Country-specific foundation belts
export const SG_FOUNDATION = ['Foundation 1', 'Foundation 2', 'Foundation 3'] as const;
export const AU_FOUNDATION = ['Foundation 1', 'Foundation 2', 'Foundation 3'] as const;

// Country-specific full lists
export const SG_BELT_LEVELS = [...SG_FOUNDATION, ...COMMON_BELTS] as const;
export const AU_BELT_LEVELS = [...AU_FOUNDATION, ...COMMON_BELTS] as const;

/**
 * Union of every valid belt across all countries.
 * Used for storage validation, multi-branch templates, and legacy display fallbacks.
 */
export const BELT_LEVELS = [
  ...SG_FOUNDATION,
  ...AU_FOUNDATION,
  'Foundation', // legacy AU value, kept for existing records
  ...COMMON_BELTS,
] as const;

export type BeltLevel = typeof BELT_LEVELS[number];

// Mutable array version for components that need string[]
export const BELT_LEVELS_ARRAY: string[] = [...BELT_LEVELS];

/**
 * Foundation → Black Tip range (inclusive). Used to gate the AU/Morley grading
 * certificate generator — Poom and Dan grades use a Kukkiwon-issued cert
 * instead and therefore never produce one of these certificates.
 */
const FOUNDATION_TO_BLACK_TIP: ReadonlySet<string> = new Set([
  ...SG_FOUNDATION,
  ...AU_FOUNDATION,
  'Foundation', // legacy AU value
  'White', 'Yellow Tip', 'Yellow', 'Green Tip', 'Green',
  'Blue Tip', 'Blue', 'Red Tip', 'Red', 'Black Tip',
]);

export const isFoundationToBlackTip = (belt?: string | null): boolean =>
  !!belt && FOUNDATION_TO_BLACK_TIP.has(belt);

export type Country = 'Singapore' | 'Australia' | string;

/**
 * Get the belt list relevant to a specific country.
 * Defaults to Singapore (the larger list) when country is unknown to keep
 * historical behaviour intact.
 */
export const getBeltLevelsForCountry = (country?: string | null): string[] => {
  if (country === 'Australia') return [...AU_BELT_LEVELS];
  return [...SG_BELT_LEVELS];
};

/**
 * Compute age in full years from a date of birth (string or Date).
 * Returns null if dob cannot be parsed.
 */
const calculateAge = (dob: string | Date | null | undefined): number | null => {
  if (!dob) return null;
  const birth = dob instanceof Date ? dob : new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
};

/**
 * Determine the default belt for a brand-new student based on country and DOB.
 * Rules:
 *   - Australia + age < 5 → "Foundation"
 *   - Singapore + age < 5 → "Foundation 1"
 *   - Any country + age ≥ 5 → "White"
 *   - Missing country or DOB → null (let the UI keep the field empty)
 */
export const getDefaultBeltForNewStudent = (
  country?: string | null,
  dob?: string | Date | null,
): string | null => {
  if (!country || !dob) return null;
  const age = calculateAge(dob);
  if (age === null) return null;
  if (age >= 5) return 'White';
  return country === 'Australia' ? 'Foundation' : 'Foundation 1';
};

/**
 * Format belt level for display
 * Converts hyphenated database values to readable format
 * e.g., "foundation-2" -> "Foundation 2"
 */
export const formatBeltLevel = (belt: string | null | undefined): string => {
  if (!belt) return '';
  return belt
    .replace(/-/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
};

/**
 * Resolve the belt list to use for a given context.
 * If country is provided we use the country-specific list,
 * otherwise we fall back to the SG list (existing behaviour).
 */
const resolveList = (country?: string | null): string[] =>
  country ? getBeltLevelsForCountry(country) : [...SG_BELT_LEVELS];

/**
 * Get the next belt level in the progression.
 * Optional country argument — defaults to the SG list to preserve current callers.
 */
export const getNextBeltLevel = (
  currentBelt: string,
  country?: string | null,
): string | null => {
  const list = resolveList(country);
  const index = list.indexOf(currentBelt);
  if (index === -1 || index === list.length - 1) return null;
  return list[index + 1];
};

/**
 * Get the belt level index for comparison/ordering.
 * Returns -1 if belt not found.
 */
export const getBeltLevelIndex = (
  belt: string,
  country?: string | null,
): number => {
  return resolveList(country).indexOf(belt);
};

/**
 * Compare two belt levels.
 * Returns negative if belt1 < belt2, positive if belt1 > belt2, 0 if equal.
 */
export const compareBeltLevels = (
  belt1: string,
  belt2: string,
  country?: string | null,
): number => {
  return getBeltLevelIndex(belt1, country) - getBeltLevelIndex(belt2, country);
};

/**
 * Get the belt level after skipping one (for double promotions).
 * Returns null if not possible (at or near the highest level).
 */
export const getDoubleBeltLevel = (
  currentBelt: string,
  country?: string | null,
): string | null => {
  const nextBelt = getNextBeltLevel(currentBelt, country);
  if (!nextBelt) return null;
  return getNextBeltLevel(nextBelt, country);
};
