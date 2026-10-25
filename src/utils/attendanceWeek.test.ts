import { mondayOf, toIsoDate, weekDates, visibleDays } from './attendanceWeek';

const equal = (actual: unknown, expected: unknown, rule: string) => {
  const a = JSON.stringify(actual); const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${rule}: expected ${e}, got ${a}`);
};

// Week starts on Monday
equal(toIsoDate(mondayOf(new Date(2026, 9, 25))), '2026-10-19', 'Sunday 25/10/2026 belongs to week of Monday 19/10/2026');
equal(toIsoDate(mondayOf(new Date(2026, 9, 19))), '2026-10-19', 'Monday stays Monday');
equal(weekDates(new Date(2026, 9, 19))[0], '2026-10-19', 'first day shown is Monday');
equal(weekDates(new Date(2026, 9, 19))[6], '2026-10-25', 'last day is Sunday');

// Days without lessons are hidden
const slots = [
  { id: 'wed-b', weekday: 3, start_time: '18:00:00' },
  { id: 'wed-a', weekday: 3, start_time: '16:00:00' },
  { id: 'sat', weekday: 6, start_time: '09:00:00' },
];
const dates = weekDates(new Date(2026, 9, 19));
equal(visibleDays(dates, slots).map((d) => d.date), ['2026-10-21', '2026-10-24'], 'only Wednesday and Saturday have lessons');
equal(visibleDays(dates, slots)[0].slots.map((s) => s.id), ['wed-a', 'wed-b'], 'slots sorted by start time');

// Public holidays and term breaks are hidden
equal(visibleDays(dates, slots, ['2026-10-24']).map((d) => d.date), ['2026-10-21'], 'public holiday Saturday hidden');
equal(visibleDays(dates, slots, [], [{ start_date: '2026-10-20', end_date: '2026-10-22' }]).map((d) => d.date), ['2026-10-24'], 'term break Wednesday hidden');

console.log('attendanceWeek tests passed');
