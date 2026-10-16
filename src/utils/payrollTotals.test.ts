import { casualNet, payrollTotals, mergeMonthOverride } from './payrollTotals';

const equal = (actual: unknown, expected: unknown, rule: string) => {
  if (actual !== expected) throw new Error(`${rule}: expected ${expected}, got ${actual}`);
};

equal(casualNet(500, 40, 0), 540, 'casual net = slot pay + claims when no CPF');
equal(casualNet(1000, 50, 200), 850, 'casual net subtracts employee CPF');

const rows = [{ gross: 990, cpf: 198, claims: 0, net: 792 }, { gross: 2000, cpf: 400, claims: 30, net: 1630 }];
const a = payrollTotals(rows), b = payrollTotals([...rows]);
equal(a.net, b.net, 'every step reports the same net total');
equal(a.net, 2422, 'net total adds up');

const merged = mergeMonthOverride({ baseSalary: 990, unpaidDays: 2 }, { baseSalary: 1100, unpaidDays: null as any });
equal(merged.baseSalary, 1100, 'recalculate keeps manual salary edit');
equal(merged.unpaidDays, 2, 'recalculate refreshes fields with no manual edit');
console.log('payrollTotals ok');
