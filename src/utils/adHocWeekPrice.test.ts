import { adHocWeekPrice, classLineUnitPrice } from './schoolFeePlan';
let fail = 0;
const eq = (n: string, a: unknown, b: unknown) => { if (a !== b) { fail++; console.error('FAIL', n, a, b); } else console.log('ok', n); };
eq('1x weekly, 1 week = one ad-hoc lesson', classLineUnitPrice(1, 48.75, adHocWeekPrice(1, 27)), 27);
eq('2x weekly, 1 week = two ad-hoc lessons', classLineUnitPrice(1, 66.25, adHocWeekPrice(2, 27)), 54);
eq('2 weeks keeps weekly price', classLineUnitPrice(2, 48.75, adHocWeekPrice(1, 27)), 48.75);
eq('no ad-hoc product keeps weekly price', classLineUnitPrice(1, 48.75, undefined), 48.75);
if (fail) process.exit(1);
