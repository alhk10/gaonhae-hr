import { currencyForCountry, formatCurrency } from './currencyUtils';

describe('invoice currency', () => {
  it('Australia shows A$', () => expect(formatCurrency(290, currencyForCountry('Australia'))).toBe('A$290.00'));
  it('Singapore shows S$', () => expect(formatCurrency(290, currencyForCountry('Singapore'))).toBe('S$290.00'));
  it('unknown defaults to S$', () => expect(formatCurrency(1234.5, currencyForCountry(null))).toBe('S$1,234.50'));
});
