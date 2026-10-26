import { BELT_LEVELS_ARRAY } from '@/constants/beltLevels';

export const CLASS_GROUP_ORDER = ['Little Gaonhae', 'Kids', 'Teens & Adults', 'Team Gaonhae'];

export interface SortableStudent {
  name: string;
  current_belt: string | null;
  is_employee?: boolean | null;
  class_group?: string | null;
}

const beltRank = (b: string | null) => {
  if (!b) return -1;
  const i = BELT_LEVELS_ARRAY.indexOf(b);
  return i === -1 ? -1 : i;
};

const groupRank = (g?: string | null) => {
  const i = g ? CLASS_GROUP_ORDER.indexOf(g) : -1;
  return i === -1 ? CLASS_GROUP_ORDER.length : i;
};

/** Students before employees, then class group, then highest belt, then name. */
export function sortAccessStudents<T extends SortableStudent>(rows: T[]): T[] {
  return [...rows].sort((a, b) =>
    Number(!!a.is_employee) - Number(!!b.is_employee) ||
    groupRank(a.class_group) - groupRank(b.class_group) ||
    beltRank(b.current_belt) - beltRank(a.current_belt) ||
    (a.name || '').localeCompare(b.name || ''),
  );
}
