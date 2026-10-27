import { currencyForCountry, formatCurrency } from './currencyUtils';

const equal = (actual: unknown, expected: unknown, rule: string) => {
  if (actual !== expected) throw new Error(`${rule}: expected ${expected}, got ${actual}`);
};

equal(formatCurrency(290, currencyForCountry('Australia')), 'A$290.00', 'Australia shows A$');
equal(formatCurrency(290, currencyForCountry('Singapore')), 'S$290.00', 'Singapore shows S$');
equal(formatCurrency(1234.5, currencyForCountry(null)), 'S$1,234.50', 'Unknown defaults to S$');
