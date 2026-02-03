/**
 * Belt Level Constants
 * Central source of truth for belt level options across the application
 */

export const BELT_LEVELS = [
  'Foundation 1', 'Foundation 2', 'Foundation 3',
  'White Tip', 'White',
  'Yellow Tip', 'Yellow',
  'Green Tip', 'Green',
  'Blue Tip', 'Blue',
  'Red Tip', 'Red',
  'Brown Tip', 'Brown',
  'Poom 1', 'Poom 2', 'Poom 3', 'Poom 4',
  'Dan 1', 'Dan 2', 'Dan 3', 'Dan 4', 'Dan 5'
] as const;

export type BeltLevel = typeof BELT_LEVELS[number];

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
