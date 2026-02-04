/**
 * Centralized color mapping for class types
 * Provides consistent styling across all timetable and schedule components
 */

export const CLASS_TYPE_COLORS: Record<string, {
  bg: string;
  border: string;
  text: string;
  badge: string;
}> = {
  'Private Lesson': {
    bg: 'bg-blue-100 dark:bg-blue-950/30',
    border: 'border-blue-300 dark:border-blue-700',
    text: 'text-blue-800 dark:text-blue-200',
    badge: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-700',
  },
  'Kids': {
    bg: 'bg-green-100 dark:bg-green-950/30',
    border: 'border-green-300 dark:border-green-700',
    text: 'text-green-800 dark:text-green-200',
    badge: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-200 dark:border-green-700',
  },
  'Teens & Adults': {
    bg: 'bg-violet-100 dark:bg-violet-950/30',
    border: 'border-violet-300 dark:border-violet-700',
    text: 'text-violet-800 dark:text-violet-200',
    badge: 'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-900/50 dark:text-violet-200 dark:border-violet-700',
  },
  'Little Gaonhae': {
    bg: 'bg-yellow-100 dark:bg-yellow-950/30',
    border: 'border-yellow-300 dark:border-yellow-700',
    text: 'text-yellow-800 dark:text-yellow-200',
    badge: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-200 dark:border-yellow-700',
  },
  'Team Gaonhae Poomsae': {
    bg: 'bg-sky-100 dark:bg-sky-950/30',
    border: 'border-sky-300 dark:border-sky-700',
    text: 'text-sky-800 dark:text-sky-200',
    badge: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/50 dark:text-sky-200 dark:border-sky-700',
  },
  'Team Gaonhae Kyorugi': {
    bg: 'bg-orange-100 dark:bg-orange-950/30',
    border: 'border-orange-300 dark:border-orange-700',
    text: 'text-orange-800 dark:text-orange-200',
    badge: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/50 dark:text-orange-200 dark:border-orange-700',
  },
  'Combat/Self-Defense': {
    bg: 'bg-emerald-100 dark:bg-emerald-950/30',
    border: 'border-emerald-300 dark:border-emerald-700',
    text: 'text-emerald-800 dark:text-emerald-200',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-200 dark:border-emerald-700',
  },
  'Kang Klass': {
    bg: 'bg-amber-100 dark:bg-amber-950/30',
    border: 'border-amber-300 dark:border-amber-700',
    text: 'text-amber-800 dark:text-amber-200',
    badge: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:text-amber-200 dark:border-amber-700',
  },
  'Junior': {
    bg: 'bg-pink-100 dark:bg-pink-950/30',
    border: 'border-pink-300 dark:border-pink-700',
    text: 'text-pink-800 dark:text-pink-200',
    badge: 'bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-900/50 dark:text-pink-200 dark:border-pink-700',
  },
  'Competition': {
    bg: 'bg-lime-100 dark:bg-lime-950/30',
    border: 'border-lime-300 dark:border-lime-700',
    text: 'text-lime-800 dark:text-lime-200',
    badge: 'bg-lime-100 text-lime-800 border-lime-300 dark:bg-lime-900/50 dark:text-lime-200 dark:border-lime-700',
  },
};

const DEFAULT_COLORS = {
  bg: 'bg-gray-100 dark:bg-gray-800',
  border: 'border-gray-300 dark:border-gray-600',
  text: 'text-gray-800 dark:text-gray-200',
  badge: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600',
};

/**
 * Get all color classes for a class type
 */
export function getClassTypeColors(classType: string) {
  return CLASS_TYPE_COLORS[classType] || DEFAULT_COLORS;
}

/**
 * Get badge-specific classes for a class type
 */
export function getClassTypeBadgeClasses(classType: string): string {
  return getClassTypeColors(classType).badge;
}

/**
 * Get card container classes for a class type
 */
export function getClassTypeCardClasses(classType: string): string {
  const colors = getClassTypeColors(classType);
  return `${colors.bg} ${colors.border}`;
}
