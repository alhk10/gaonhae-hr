import { describe, it, expect } from 'vitest';
import { sortAccessStudents } from './accessStudentSort';

const r = (name: string, belt: string | null, group: string | null, emp = false) =>
  ({ name, current_belt: belt, class_group: group, is_employee: emp });

describe('sortAccessStudents', () => {
  it('puts employees last', () => {
    const out = sortAccessStudents([r('A', '1st Dan', 'Little Gaonhae', true), r('B', 'White', 'Team Gaonhae')]);
    expect(out.map((x) => x.name)).toEqual(['B', 'A']);
  });
  it('orders class groups Little, Kids, Teens & Adults, Team, then none', () => {
    const out = sortAccessStudents([
      r('T', 'White', 'Team Gaonhae'), r('N', 'White', null), r('K', 'White', 'Kids'),
      r('A', 'White', 'Teens & Adults'), r('L', 'White', 'Little Gaonhae'),
    ]);
    expect(out.map((x) => x.name)).toEqual(['L', 'K', 'A', 'T', 'N']);
  });
  it('sorts highest belt first within a group', () => {
    const out = sortAccessStudents([r('W', 'White', 'Kids'), r('R', 'Red', 'Kids'), r('F', 'Foundation 1', 'Kids')]);
    expect(out.map((x) => x.name)).toEqual(['R', 'W', 'F']);
  });
});
