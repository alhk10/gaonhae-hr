import { readFileSync } from 'node:fs';

// Exercise the actual payment-step row mapping, including its saved-net fallback.
const source = readFileSync(new URL('../pages/PayrollProcessing.tsx', import.meta.url), 'utf8');
const start = source.indexOf('    const seenFullTimeIds', source.indexOf('  const renderPaymentStep ='));
const end = source.indexOf('    // Get casual employees', start);
if (start < 0 || end < 0) throw new Error('Payment-step calculation could not be located');
const mapping = new Bun.Transpiler({ loader: 'ts' }).transformSync(source.slice(start, end));
const paymentRows = new Function(
  'payrollState', 'allEmployees', 'selectedPeriod', 'isEmployedInPeriod',
  'getApprovedClaimsTotal', 'employeeAllowances', 'employeeDeductions', 'computeFullTime',
  `${mapping}\nreturn activeFullTimeEmployees;`,
);
const equal = (actual, expected, rule) => {
  if (actual !== expected) throw new Error(`${rule}: expected ${expected}, got ${actual}`);
};

const rows = paymentRows(
  { fullTimeEmployees: [
    { employeeId: 'claims', netPay: 1630, grossPay: 2000 },
    { employeeId: 'no-claims', netPay: 1600, grossPay: 2000 },
    { employeeId: 'saved', netPay: 1630, grossPay: 2000 },
  ] },
  [{ id: 'claims' }, { id: 'no-claims' }],
  'September 2026', () => true,
  (id) => id === 'no-claims' ? 0 : 30,
  {}, {},
  (employee) => ({ calc: {
    grossSalary: 2000,
    netSalary: 2000 - 400 + (employee.id === 'claims' ? 30 : 0),
  } }),
);
equal(rows[0].totalPay, 1630, 'approved claims added once to full-time bank payment');
equal(rows[1].totalPay, 1600, 'payment unchanged when no claims');
equal(rows[2].totalPay, 1630, 'saved net pay is not increased by claims again');
equal(rows.reduce((sum, row) => sum + row.totalPay, 0), 4860,
  'payment total includes claims once per employee');
console.log('payrollPayment ok');