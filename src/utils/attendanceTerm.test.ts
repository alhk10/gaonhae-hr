import { adjacentAttendanceTerm } from './attendanceTerm';

const eq = (actual: unknown, expected: unknown, message: string) => {
  if (actual !== expected) throw new Error(`${message}: ${actual} !== ${expected}`);
};
const t3 = { id: 't3', start_date: '2026-07-01', end_date: '2026-09-16' };
const t4 = { id: 't4', start_date: '2026-09-30', end_date: '2026-12-16' };
const t1 = { id: 't1', start_date: '2027-01-06', end_date: '2027-03-28' };
const terms = [t1, t3, t4];
eq(adjacentAttendanceTerm(terms, t4, '2026-11-12', -1)?.start_date, '2026-07-01', 'Previous crosses the term break');
eq(adjacentAttendanceTerm(terms, t4, '2026-11-12', 1)?.start_date, '2027-01-06', 'Next crosses the year and term break');
eq(adjacentAttendanceTerm(terms, t3, '2026-07-01', -1), undefined, 'No previous term at the boundary');
eq(adjacentAttendanceTerm(terms, t1, '2027-01-06', 1), undefined, 'No next term at the boundary');
eq(adjacentAttendanceTerm(terms, undefined, '2026-09-23', 1)?.id, 't4', 'Next from a break reaches a term');
eq(adjacentAttendanceTerm(terms, undefined, '2026-09-23', -1)?.id, 't3', 'Previous from a break reaches a term');
eq(terms[0].id, 't1', 'Navigation does not mutate cached term order');
console.log('attendanceTerm tests passed');