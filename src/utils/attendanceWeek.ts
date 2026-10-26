/** Week helpers for the /access Attendance tab. Weeks start on Monday. */

export const toIsoDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const parseIsoDate = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

/** Monday of the week containing `date`. */
export const mondayOf = (date: Date): Date => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  d.setDate(d.getDate() - offset);
  return d;
};

export const addDays = (date: Date, n: number): Date => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + n);
  return d;
};

/** Seven ISO dates Monday → Sunday. */
export const weekDates = (monday: Date): string[] => Array.from({ length: 7 }, (_, i) => toIsoDate(addDays(monday, i)));

interface SlotLike { id: string; weekday: number | null; start_time: string; specific_dates?: string[] | null }

/** A slot with specific dates runs only on those dates; otherwise every week on its weekday. */
export const slotRunsOn = (s: { weekday: number | null; specific_dates?: string[] | null }, isoDate: string): boolean =>
  s.specific_dates && s.specific_dates.length > 0
    ? s.specific_dates.includes(isoDate)
    : s.weekday === parseIsoDate(isoDate).getDay();

/** Previous session date of a slot before `isoDate` (7 days back for weekly slots). */
export const previousSessionDate = (s: { weekday: number | null; specific_dates?: string[] | null }, isoDate: string): string | null => {
  if (s.specific_dates && s.specific_dates.length > 0) {
    const prev = [...s.specific_dates].filter((d) => d < isoDate).sort();
    return prev.length ? prev[prev.length - 1] : null;
  }
  const d = parseIsoDate(isoDate); d.setDate(d.getDate() - 7);
  return toIsoDate(d);
};
interface RangeLike { start_date: string; end_date: string }

/**
 * Days to show: only days that have at least one active timeslot, skipping public holidays
 * and term breaks. Each day lists its slots sorted by start time.
 */
export function visibleDays<T extends SlotLike>(
  dates: string[],
  slots: T[],
  holidays: string[] = [],
  breaks: RangeLike[] = [],
): { date: string; slots: T[] }[] {
  const holidaySet = new Set(holidays);
  return dates
    .map((date) => {
      const daySlots = slots
        .filter((s) => slotRunsOn(s, date))
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
      return { date, slots: daySlots };
    })
    .filter(({ date, slots: s }) =>
      s.length > 0 &&
      !holidaySet.has(date) &&
      !breaks.some((b) => date >= b.start_date && date <= b.end_date),
    );
}

export const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/** Weekday options in Monday-first order for forms. */
export const WEEKDAY_OPTIONS = [1, 2, 3, 4, 5, 6, 0].map((v) => ({ value: v, label: WEEKDAY_LABELS[v] }));

/** Class colour palette (CSS variables --class-<name>). */
export const CLASS_COLORS = ['red', 'orange', 'amber', 'green', 'teal', 'blue', 'violet', 'pink'] as const;
export type ClassColor = typeof CLASS_COLORS[number];

/** Saved colour if valid, otherwise a stable pick from the class name. */
export function classColor(name?: string | null, saved?: string | null): ClassColor {
  if (saved && (CLASS_COLORS as readonly string[]).includes(saved)) return saved as ClassColor;
  const key = (name || '').trim().toLowerCase();
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return CLASS_COLORS[h % CLASS_COLORS.length];
}

export const classColorVar = (c: ClassColor) => `hsl(var(--class-${c}))`;
export const classColorTint = (c: ClassColor) => `hsl(var(--class-${c}) / 0.12)`;

/** Students from last week's bookings of one timeslot that can be copied into this week's same slot. */
export const copyCandidates = <T extends { student_id: string; status: string; student_status?: string | null }>(
  previous: T[], currentStudentIds: string[],
): T[] => {
  const have = new Set(currentStudentIds);
  const seen = new Set<string>();
  return previous.filter((b) => {
    if (b.status === 'rejected' || b.status === 'requested') return false;
    if (b.student_status && !['active', 'trial'].includes(b.student_status)) return false;
    if (have.has(b.student_id) || seen.has(b.student_id)) return false;
    seen.add(b.student_id);
    return true;
  });
};

export const isUnpaidTerm = (s: { term_payment?: string | null; student_status?: string | null }) =>
  s.student_status !== 'trial' && (s.term_payment === 'unpaid' || s.term_payment === 'none');

/** Day totals across all timeslots; requested bookings are reported separately. */
export const dayTotals = (bookings: { student_id: string; status: string }[]) => {
  const counted = bookings.filter((b) => b.status !== 'requested' && b.status !== 'rejected');
  return {
    total: counted.length,
    unique: new Set(counted.map((b) => b.student_id)).size,
    attended: counted.filter((b) => b.status === 'attended').length,
    absent: counted.filter((b) => b.status === 'absent').length,
    unmarked: counted.filter((b) => b.status === 'booked').length,
    requested: bookings.filter((b) => b.status === 'requested').length,
  };
};
