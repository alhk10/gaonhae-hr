import { ageOn, termLabelOf } from './progressCard';

const equal = (actual: unknown, expected: unknown, rule: string) => {
  if (actual !== expected) throw new Error(`${rule}: expected ${String(expected)}, got ${String(actual)}`);
};

equal(ageOn('2018-11-11', new Date(2026, 10, 10)), 7, 'age before birthday');
equal(ageOn('2018-11-10', new Date(2026, 10, 10)), 8, 'age on birthday');
equal(ageOn(null), null, 'no dob');
equal(termLabelOf('Term 4 2026'), '2026 Term 4', 'term label from name');
equal(termLabelOf('Term 4', '2026-10-01'), '2026 Term 4', 'term label from start date');
console.log('progressCard tests passed');
