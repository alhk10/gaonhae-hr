/**
 * Period Utilities
 * Centralized date/period parsing and formatting functions
 */

export interface ParsedPeriod {
  year: number;
  month: number;
}

export interface DateRange {
  start: string;
  end: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Format period for API calls (convert to YYYY-MM format)
 * @param period - Period in "July 2025" or "2025-07" format
 * @returns Period in "YYYY-MM" format
 */
export function formatPeriodForAPI(period: string): string {
  if (period.includes('-')) {
    return period; // Already in YYYY-MM format
  }
  
  // Convert "July 2025" to "2025-07"
  const [monthName, year] = period.split(' ');
  const monthIndex = MONTH_NAMES.indexOf(monthName);
  
  if (monthIndex === -1) return period;
  
  return `${year}-${(monthIndex + 1).toString().padStart(2, '0')}`;
}

/**
 * Parse period string into year and month components
 * @param period - Period in "July 2025" or "2025-07" format
 * @returns Object with year and month (month is 1-12)
 */
export function parsePeriod(period: string): ParsedPeriod {
  let year: number;
  let month: number;
  
  if (period.includes(' ')) {
    // "November 2025" format
    const [monthName, yearStr] = period.split(' ');
    month = MONTH_NAMES.indexOf(monthName) + 1;
    year = parseInt(yearStr);
  } else {
    // "2025-11" format
    const [yearStr, monthStr] = period.split('-');
    year = parseInt(yearStr);
    month = parseInt(monthStr);
  }
  
  return { year, month };
}

/**
 * Check if period is November 2025 or later (for dynamic pricing)
 * @param period - Period string in any format
 * @returns True if period is November 2025 or later
 */
export function isNovember2025OrLater(period: string): boolean {
  try {
    const { year, month } = parsePeriod(period);
    const periodDate = new Date(year, month - 1, 1);
    const november2025 = new Date(2025, 10, 1); // Month is 0-indexed
    
    return periodDate >= november2025;
  } catch (error) {
    console.error('[periodUtils] Error parsing period:', error);
    return false;
  }
}

/**
 * Get date range for a given period (start and end dates)
 * @param period - Period string in any format
 * @returns Object with start and end dates in YYYY-MM-DD format
 */
export function getDateRangeForPeriod(period: string): DateRange {
  const { year, month } = parsePeriod(period);
  
  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
  
  // Calculate last day of month
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
  
  return { start: startDate, end: endDate };
}

/**
 * Format period for display (convert to readable format)
 * @param year - Year (e.g., 2025)
 * @param month - Month (1-12)
 * @returns Period in "July 2025" format
 */
export function formatPeriodDisplay(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/**
 * Get current period in API format (YYYY-MM)
 * @returns Current period string
 */
export function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Check if a date falls within a period
 * @param date - Date to check (YYYY-MM-DD format)
 * @param period - Period string
 * @returns True if date is within the period
 */
export function isDateInPeriod(date: string, period: string): boolean {
  const { start, end } = getDateRangeForPeriod(period);
  return date >= start && date <= end;
}
