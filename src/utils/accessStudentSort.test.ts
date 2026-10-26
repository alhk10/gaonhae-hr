import { sortAccessStudents } from './accessStudentSort';

const equal = (actual: unknown, expected: unknown, rule: string) => {
  const a = JSON.stringify(actual); const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${rule}: expected ${e}, got ${a}`);
};
const r = (name: string, belt: string | null, group: string | null, emp = false) =>
  ({ name, current_belt: belt, class_group: group, is_employee: emp });
const names = (rows: { name: string }[]) => rows.map((x) => x.name);

equal(names(sortAccessStudents([r('A', '1st Dan', 'Little Gaonhae', true), r('B', 'White', 'Team Gaonhae')])), ['B', 'A'], 'employees sort last');
equal(names(sortAccessStudents([
  r('T', 'White', 'Team Gaonhae'), r('N', 'White', null), r('K', 'White', 'Kids'),
  r('A', 'White', 'Teens & Adults'), r('L', 'White', 'Little Gaonhae'),
])), ['L', 'K', 'A', 'T', 'N'], 'class group order');
equal(names(sortAccessStudents([r('W', 'White', 'Kids'), r('R', 'Red', 'Kids'), r('F', 'Foundation 1', 'Kids')])), ['R', 'W', 'F'], 'highest belt first');
console.log('accessStudentSort tests passed');
