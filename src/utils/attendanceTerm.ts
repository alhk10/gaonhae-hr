interface TermDates {
  id: string;
  start_date: string;
  end_date: string;
}

/** Use the full branch calendar, not the terms overlapping one attendance week. */
export function adjacentAttendanceTerm<T extends TermDates>(
  terms: readonly T[], current: TermDates | undefined, dayIso: string, direction: -1 | 1,
): T | undefined {
  const anchor = current?.start_date ?? dayIso;
  const sorted = [...terms].sort((a, b) => a.start_date.localeCompare(b.start_date));
  return direction === 1
    ? sorted.find((t) => t.id !== current?.id && t.start_date > anchor)
    : sorted.reverse().find((t) => t.id !== current?.id && t.start_date < anchor);
}