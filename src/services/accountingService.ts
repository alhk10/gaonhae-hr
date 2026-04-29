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

// =====================================================================
// Journals
// =====================================================================

export type JournalStatus = 'draft' | 'posted' | 'void';
export type JournalSourceType =
  | 'manual' | 'invoice' | 'payment' | 'payroll' | 'claim'
  | 'expense' | 'inventory' | 'bank' | 'adjustment';

export interface JournalEntry {
  id: string;
  entry_number: string | null;
  entry_date: string;
  period: string;
  branch_id: string | null;
  country: Country;
  source_type: JournalSourceType;
  source_id: string | null;
  narration: string | null;
  reference: string | null;
  status: JournalStatus;
  created_by: string | null;
  posted_at: string | null;
  posted_by: string | null;
  voided_at: string | null;
  voided_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface JournalLine {
  id: string;
  journal_id: string;
  line_no: number;
  account_id: string;
  description: string | null;
  debit: number;
  credit: number;
  tax_code_id: string | null;
  tax_amount: number;
  branch_id: string | null;
  contact_type: string | null;
  contact_ref: string | null;
  created_at: string;
}

export interface JournalLineDraft {
  account_id: string;
  description?: string | null;
  debit?: number;
  credit?: number;
  tax_code_id?: string | null;
  tax_amount?: number;
  tax_base_amount?: number;
  branch_id?: string | null;
  contact_type?: string | null;
  contact_ref?: string | null;
}

export interface JournalEntryWithLines extends JournalEntry {
  lines: JournalLine[];
}

export interface ListJournalsFilter {
  country?: Country;
  branch_id?: string;
  status?: JournalStatus;
  from?: string;
  to?: string;
  source_type?: JournalSourceType;
  search?: string;
  limit?: number;
}

export async function listJournals(filter: ListJournalsFilter = {}): Promise<JournalEntry[]> {
  let q = supabase.from('journal_entries').select('*').order('entry_date', { ascending: false }).order('created_at', { ascending: false });
  if (filter.country) q = q.eq('country', filter.country);
  if (filter.branch_id) q = q.eq('branch_id', filter.branch_id);
  if (filter.status) q = q.eq('status', filter.status);
  if (filter.source_type) q = q.eq('source_type', filter.source_type);
  if (filter.from) q = q.gte('entry_date', filter.from);
  if (filter.to) q = q.lte('entry_date', filter.to);
  if (filter.search) q = q.or(`narration.ilike.%${filter.search}%,reference.ilike.%${filter.search}%,entry_number.ilike.%${filter.search}%`);
  if (filter.limit) q = q.limit(filter.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as JournalEntry[];
}

export async function getJournal(id: string): Promise<JournalEntryWithLines> {
  const { data: entry, error } = await supabase.from('journal_entries').select('*').eq('id', id).single();
  if (error) throw error;
  const { data: lines, error: lerr } = await supabase
    .from('journal_lines').select('*').eq('journal_id', id).order('line_no');
  if (lerr) throw lerr;
  return { ...(entry as JournalEntry), lines: (lines || []) as JournalLine[] };
}

export async function listJournalLines(filter: {
  account_id?: string;
  branch_id?: string;
  from?: string;
  to?: string;
  status?: JournalStatus;
  limit?: number;
}): Promise<Array<JournalLine & { entry: JournalEntry }>> {
  let q = supabase
    .from('journal_lines')
    .select('*, entry:journal_entries!inner(*)')
    .order('created_at', { ascending: false });
  if (filter.account_id) q = q.eq('account_id', filter.account_id);
  if (filter.branch_id) q = q.eq('branch_id', filter.branch_id);
  if (filter.from) q = q.gte('entry.entry_date', filter.from);
  if (filter.to) q = q.lte('entry.entry_date', filter.to);
  if (filter.status) q = q.eq('entry.status', filter.status);
  if (filter.limit) q = q.limit(filter.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as Array<JournalLine & { entry: JournalEntry }>;
}

function generateEntryNumber(): string {
  const d = new Date();
  const yyyymm = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  const rnd = Math.floor(Math.random() * 9000 + 1000);
  return `JE-${yyyymm}-${rnd}`;
}

export async function createJournal(input: {
  entry_date: string;
  country: Country;
  branch_id?: string | null;
  narration?: string | null;
  reference?: string | null;
  source_type?: JournalSourceType;
  source_id?: string | null;
  created_by?: string | null;
  lines: JournalLineDraft[];
  post?: boolean;
}): Promise<JournalEntryWithLines> {
  if (!input.lines || input.lines.length < 2) {
    throw new Error('A journal needs at least two lines (one debit and one credit).');
  }
  const totalDebit = input.lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const totalCredit = input.lines.reduce((s, l) => s + Number(l.credit || 0), 0);
  if (Math.round(totalDebit * 100) !== Math.round(totalCredit * 100)) {
    throw new Error(`Journal not balanced: debit ${totalDebit.toFixed(2)} vs credit ${totalCredit.toFixed(2)}`);
  }

  const { data: entry, error } = await supabase
    .from('journal_entries')
    .insert({
      entry_number: generateEntryNumber(),
      entry_date: input.entry_date,
      period: input.entry_date.slice(0, 7),
      country: input.country,
      branch_id: input.branch_id ?? null,
      narration: input.narration ?? null,
      reference: input.reference ?? null,
      source_type: input.source_type ?? 'manual',
      source_id: input.source_id ?? null,
      created_by: input.created_by ?? null,
      status: 'draft',
    })
    .select('*')
    .single();
  if (error) throw error;

  const linesPayload = input.lines.map((l, i) => ({
    journal_id: entry.id,
    line_no: i + 1,
    account_id: l.account_id,
    description: l.description ?? null,
    debit: Number(l.debit || 0),
    credit: Number(l.credit || 0),
    tax_code_id: l.tax_code_id ?? null,
    tax_amount: Number(l.tax_amount || 0),
    tax_base_amount: Number(l.tax_base_amount || 0),
    branch_id: l.branch_id ?? input.branch_id ?? null,
    contact_type: l.contact_type ?? null,
    contact_ref: l.contact_ref ?? null,
  }));
  const { error: lerr } = await supabase.from('journal_lines').insert(linesPayload);
  if (lerr) throw lerr;

  if (input.post) {
    await postJournal(entry.id, input.created_by ?? null);
  }
  return getJournal(entry.id);
}

export async function postJournal(id: string, postedBy?: string | null): Promise<void> {
  const { error } = await supabase
    .from('journal_entries')
    .update({ status: 'posted', posted_by: postedBy ?? null })
    .eq('id', id);
  if (error) throw error;
}

export async function voidJournal(id: string, voidedBy?: string | null): Promise<void> {
  const { error } = await supabase
    .from('journal_entries')
    .update({ status: 'void', voided_by: voidedBy ?? null })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteJournal(id: string): Promise<void> {
  const { error } = await supabase.from('journal_entries').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Find existing posted journal(s) for a source event.
 * `subEvent`, when supplied, is appended to `reference` to scope the lookup
 * (e.g. invoice id may have multiple journals: "issued", "void", "refund:itemId").
 */
export async function findJournalsBySource(
  sourceType: JournalSourceType,
  sourceId: string,
  subEvent?: string,
): Promise<JournalEntry[]> {
  let q = supabase
    .from('journal_entries')
    .select('*')
    .eq('source_type', sourceType)
    .eq('source_id', sourceId)
    .neq('status', 'void');
  if (subEvent) q = q.eq('reference', subEvent);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as JournalEntry[];
}

/**
 * Idempotent posting helper. If a non-void journal already exists for the
 * (sourceType, sourceId, subEvent) tuple it is voided and replaced.
 *
 * Returns the new posted journal id, or null if `lines` was empty.
 */
export async function postJournalForSource(input: {
  sourceType: JournalSourceType;
  sourceId: string;
  subEvent?: string;
  entry_date: string;
  country: Country;
  branch_id?: string | null;
  narration?: string | null;
  created_by?: string | null;
  lines: JournalLineDraft[];
}): Promise<string | null> {
  if (!input.lines || input.lines.length === 0) return null;

  // Filter zero-amount lines and verify balanced
  const lines = input.lines.filter(
    (l) => Math.round((Number(l.debit || 0) + Number(l.credit || 0)) * 100) > 0,
  );
  if (lines.length < 2) return null;

  // Void prior matching journals (idempotency)
  const prior = await findJournalsBySource(input.sourceType, input.sourceId, input.subEvent);
  for (const p of prior) {
    if (p.status === 'posted') {
      await voidJournal(p.id, input.created_by ?? null);
    } else if (p.status === 'draft') {
      await deleteJournal(p.id);
    }
  }

  const created = await createJournal({
    entry_date: input.entry_date,
    country: input.country,
    branch_id: input.branch_id ?? null,
    narration: input.narration ?? null,
    reference: input.subEvent ?? null,
    source_type: input.sourceType,
    source_id: input.sourceId,
    created_by: input.created_by ?? null,
    lines,
    post: true,
  });
  return created.id;
}

/** Void all non-void journals for a source event (used on cancel/delete). */
export async function voidJournalsForSource(
  sourceType: JournalSourceType,
  sourceId: string,
  voidedBy?: string | null,
): Promise<number> {
  const prior = await findJournalsBySource(sourceType, sourceId);
  let n = 0;
  for (const p of prior) {
    if (p.status === 'posted') {
      await voidJournal(p.id, voidedBy ?? null);
      n++;
    } else if (p.status === 'draft') {
      await deleteJournal(p.id);
      n++;
    }
  }
  return n;
}
