/**
 * Currency Utilities
 * Centralized currency formatting for multi-currency support
 */

// Currency to locale mapping for proper formatting
const currencyLocaleMap: Record<string, string> = {
  SGD: 'en-SG',
  MYR: 'ms-MY',
  IDR: 'id-ID',
  THB: 'th-TH',
  PHP: 'en-PH',
  VND: 'vi-VN',
  USD: 'en-US',
  GBP: 'en-GB',
  AUD: 'en-AU',
  JPY: 'ja-JP',
  CNY: 'zh-CN',
  INR: 'en-IN',
};

// Currency symbol mapping for simple display
const currencySymbolMap: Record<string, string> = {
  SGD: 'S$',
  MYR: 'RM',
  IDR: 'Rp',
  THB: '฿',
  PHP: '₱',
  VND: '₫',
  USD: '$',
  GBP: '£',
  AUD: 'A$',
  JPY: '¥',
  CNY: '¥',
  INR: '₹',
};

// Default currency
export const DEFAULT_CURRENCY = 'SGD';

/**
 * Format a number as currency using Intl.NumberFormat
 * @param amount - The amount to format
 * @param currency - The currency code (defaults to SGD)
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number, currency: string = DEFAULT_CURRENCY): string => {
  const locale = currencyLocaleMap[currency] || 'en-SG';
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // Fallback for unsupported currencies
    const symbol = currencySymbolMap[currency] || currency;
    return `${symbol}${amount.toFixed(2)}`;
  }
};

/**
 * Get the currency symbol for a given currency code
 * @param currency - The currency code
 * @returns Currency symbol
 */
export const getCurrencySymbol = (currency: string = DEFAULT_CURRENCY): string => {
  return currencySymbolMap[currency] || currency;
};

/**
 * Format a number with just the symbol prefix (simpler formatting)
 * @param amount - The amount to format
 * @param currency - The currency code (defaults to SGD)
 * @returns Formatted string with symbol
 */
export const formatCurrencySimple = (amount: number, currency: string = DEFAULT_CURRENCY): string => {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${amount.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

/**
 * Get the locale for a currency
 * @param currency - The currency code
 * @returns Locale string
 */
export const getCurrencyLocale = (currency: string = DEFAULT_CURRENCY): string => {
  return currencyLocaleMap[currency] || 'en-SG';
};
