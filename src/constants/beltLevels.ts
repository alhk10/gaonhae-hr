/**
 * Belt Level Constants
 * Central source of truth for belt level options across the application
 * 
 * Note: Poom belts are for students under 15 years old.
 * At age 15, they convert to Dan.
 */

export const BELT_LEVELS = [
  'Foundation 1',
  'Foundation 2',
  'Foundation 3',
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
  '5th Dan'
] as const;

export type BeltLevel = typeof BELT_LEVELS[number];

// Mutable array version for components that need string[]
export const BELT_LEVELS_ARRAY: string[] = [...BELT_LEVELS];

/**
 * Format belt level for display
 * Converts hyphenated database values to readable format
 * e.g., "foundation-2" -> "Foundation 2"
 */
export const formatBeltLevel = (belt: string | null | undefined): string => {
  if (!belt) return '';
  // Convert hyphenated values to display format with proper casing
  return belt
    .replace(/-/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
};

/**
 * Get the next belt level in the progression
 * Returns null if already at the highest level or belt not found
 */
export const getNextBeltLevel = (currentBelt: string): string | null => {
  const index = BELT_LEVELS.indexOf(currentBelt as BeltLevel);
  if (index === -1 || index === BELT_LEVELS.length - 1) {
    return null;
  }
  return BELT_LEVELS[index + 1];
};

/**
 * Get the belt level index for comparison/ordering
 * Returns -1 if belt not found
 */
export const getBeltLevelIndex = (belt: string): number => {
  return BELT_LEVELS.indexOf(belt as BeltLevel);
};

/**
 * Compare two belt levels
 * Returns negative if belt1 < belt2, positive if belt1 > belt2, 0 if equal
 */
export const compareBeltLevels = (belt1: string, belt2: string): number => {
  return getBeltLevelIndex(belt1) - getBeltLevelIndex(belt2);
};

/**
 * Get the belt level after skipping one (for double promotions)
 * Returns null if not possible (at or near highest level)
 */
export const getDoubleBeltLevel = (currentBelt: string): string | null => {
  const nextBelt = getNextBeltLevel(currentBelt);
  if (!nextBelt) return null;
  return getNextBeltLevel(nextBelt);
};
