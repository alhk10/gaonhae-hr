/**
 * Accounting Mappings (Phase 3)
 *
 * Resolves Chart of Accounts UUIDs from stable system codes (e.g. "1100" = A/R).
 * Caches results per country to avoid repeated lookups across postings.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Country } from './accountingService';

// System account codes (must match the seeded chart_of_accounts rows)
export const ACC = {
  CASH: '1000',
  BANK: '1010',
  BANK_PAYNOW: '1020', // SG only; falls back to BANK
  AR: '1100',
  STUDENT_CREDIT_AR: '1110',
  INVENTORY: '1200',
  AP: '2000',
  GST_OUTPUT: '2100',
  GST_INPUT: '2110',
  PAYG_PAYABLE: '2150', // AU
  WAGES_PAYABLE: '2200',
  CPF_PAYABLE: '2210', // SG
  SDL_PAYABLE: '2220', // SG
  SUPER_PAYABLE: '2230', // AU
  STUDENT_CREDIT_LIAB: '2300',
  CLAIMS_PAYABLE: '2400',
  OWNER_EQUITY: '3000',
  RETAINED_EARNINGS: '3100',
  INCOME_TERM: '4000',
  INCOME_GRADING: '4010',
  INCOME_ADHOC: '4020',
  INCOME_UNIFORM: '4030',
  INCOME_TRIAL: '4040',
  INCOME_OTHER: '4090',
  SALES_DISCOUNTS: '4900',
  COGS: '5000',
  WAGES: '6000',
  CASUAL_COACHING: '6010',
  CPF_EXPENSE: '6020', // SG
  SDL_EXPENSE: '6030', // SG
  SUPER_EXPENSE: '6025', // AU
  STAFF_CLAIMS: '6040',
} as const;

export type AccCode = (typeof ACC)[keyof typeof ACC];

const cache = new Map<Country, Map<string, string>>();

async function loadCountry(country: Country): Promise<Map<string, string>> {
  if (cache.has(country)) return cache.get(country)!;
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .select('id, code')
    .eq('country', country);
  if (error) throw error;
  const m = new Map<string, string>();
  (data || []).forEach((r: { id: string; code: string }) => m.set(r.code, r.id));
  cache.set(country, m);
  return m;
}

export async function getAccountId(country: Country, code: string): Promise<string> {
  const m = await loadCountry(country);
  const id = m.get(code);
  if (!id) throw new Error(`Account code ${code} not found for ${country}`);
  return id;
}

export async function tryGetAccountId(country: Country, code: string): Promise<string | null> {
  const m = await loadCountry(country);
  return m.get(code) || null;
}

export function clearAccountCache(country?: Country) {
  if (country) cache.delete(country);
  else cache.clear();
}

/** Tax-code id cache by country+code. */
const taxCache = new Map<Country, Map<string, string>>();
async function loadTaxCodes(country: Country): Promise<Map<string, string>> {
  if (taxCache.has(country)) return taxCache.get(country)!;
  const { data, error } = await supabase.from('tax_codes').select('id, code').eq('country', country);
  if (error) throw error;
  const m = new Map<string, string>();
  (data || []).forEach((r: { id: string; code: string }) => m.set(r.code, r.id));
  taxCache.set(country, m);
  return m;
}

export async function getTaxCodeId(country: Country, code: string): Promise<string | null> {
  const m = await loadTaxCodes(country);
  return m.get(code) || null;
}

/** Standard-rated output tax code for the given country. */
export async function standardOutputTaxCode(country: Country): Promise<string | null> {
  return getTaxCodeId(country, country === 'Singapore' ? 'SG-SR' : 'AU-GST');
}

/** Resolve the bank-side account from a payment method. */
export async function resolveBankAccount(country: Country, method?: string | null): Promise<string> {
  const m = (method || '').toLowerCase();
  if (m === 'cash') return getAccountId(country, ACC.CASH);
  if (m === 'paynow' && country === 'Singapore') {
    const id = await tryGetAccountId(country, ACC.BANK_PAYNOW);
    if (id) return id;
  }
  return getAccountId(country, ACC.BANK);
}

/** Map a product category name to an income account code. */
export function incomeCodeForCategory(categoryName?: string | null): AccCode {
  const name = (categoryName || '').toLowerCase();
  if (name.includes('grading')) return ACC.INCOME_GRADING;
  if (name.includes('uniform') || name.includes('apparel') || name.includes('protection') || name.includes('guard')) {
    return ACC.INCOME_UNIFORM;
  }
  if (name.includes('class')) return ACC.INCOME_TERM;
  return ACC.INCOME_OTHER;
}

/** Map an invoice item by inspecting product flags (ad-hoc / lesson / trial). */
export function incomeCodeForProduct(p: {
  category?: string | null;
  is_adhoc_lesson?: boolean | null;
  is_lesson?: boolean | null;
  name?: string | null;
}): AccCode {
  if (p.is_adhoc_lesson) return ACC.INCOME_ADHOC;
  const name = (p.name || '').toLowerCase();
  if (name.includes('trial')) return ACC.INCOME_TRIAL;
  if (name.includes('grading')) return ACC.INCOME_GRADING;
  if (p.is_lesson) return ACC.INCOME_TERM;
  return incomeCodeForCategory(p.category);
}

/** Map a free-text branch P&L expense category to an expense account code. */
export function expenseCodeForBranchCategory(category?: string | null): AccCode {
  const c = (category || '').toLowerCase();
  if (c.includes('wage') || c.includes('salary') || c.includes('payroll')) return ACC.WAGES;
  if (c.includes('coach')) return ACC.CASUAL_COACHING;
  if (c.includes('claim')) return ACC.STAFF_CLAIMS;
  if (c.includes('cogs') || c.includes('inventory') || c.includes('uniform purchase')) return ACC.COGS;
  // Generic fallback bucket — Other Expenses uses Wages for now until Phase 4 expense
  // accounts are split out per category. Safer than failing the journal post.
  return ACC.WAGES;
}
