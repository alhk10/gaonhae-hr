/**
 * Accounting Service
 *
 * Read/write helpers for the new accounting module:
 * - Chart of Accounts (CoA)
 * - Tax Codes
 * - Fiscal Periods
 *
 * Future phases will add: journals, bank accounts, reports, GST/BAS.
 */

import { supabase } from '@/integrations/supabase/client';

export type Country = 'Singapore' | 'Australia';
export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';
export type TaxDirection = 'output' | 'input' | 'none';

export interface TaxCode {
  id: string;
  code: string;
  name: string;
  country: Country;
  rate: number;
  report_box: string | null;
  direction: TaxDirection;
  is_active: boolean;
}

export interface ChartAccount {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  subtype: string | null;
  country: Country;
  parent_id: string | null;
  default_tax_code_id: string | null;
  system_account: boolean;
  is_active: boolean;
  description: string | null;
  sort_order: number;
}

export interface FiscalPeriod {
  id: string;
  country: Country;
  period: string;
  is_locked: boolean;
  locked_at: string | null;
  locked_by: string | null;
  notes: string | null;
}

// ---------- Tax Codes ----------
export async function listTaxCodes(country?: Country): Promise<TaxCode[]> {
  let q = supabase.from('tax_codes').select('*').order('country').order('code');
  if (country) q = q.eq('country', country);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as TaxCode[];
}

// ---------- Chart of Accounts ----------
export async function listAccounts(country?: Country): Promise<ChartAccount[]> {
  let q = supabase.from('chart_of_accounts').select('*').order('country').order('sort_order').order('code');
  if (country) q = q.eq('country', country);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as ChartAccount[];
}

export async function createAccount(input: Omit<ChartAccount, 'id' | 'system_account'> & { system_account?: boolean }): Promise<ChartAccount> {
  const { data, error } = await supabase.from('chart_of_accounts').insert(input).select('*').single();
  if (error) throw error;
  return data as ChartAccount;
}

export async function updateAccount(id: string, patch: Partial<ChartAccount>): Promise<ChartAccount> {
  const { data, error } = await supabase.from('chart_of_accounts').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data as ChartAccount;
}

export async function deleteAccount(id: string): Promise<void> {
  const { error } = await supabase.from('chart_of_accounts').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Fiscal Periods ----------
export async function listFiscalPeriods(country?: Country): Promise<FiscalPeriod[]> {
  let q = supabase.from('fiscal_periods').select('*').order('country').order('period', { ascending: false });
  if (country) q = q.eq('country', country);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as FiscalPeriod[];
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  asset: 'Assets',
  liability: 'Liabilities',
  equity: 'Equity',
  income: 'Income',
  expense: 'Expenses',
};
