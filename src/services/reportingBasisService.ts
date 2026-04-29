/**
 * Reporting basis helpers.
 *
 * Accrual: include all posted journals within the period.
 * Cash:    exclude AR/AP accruals so revenue/expenses appear when cash settles.
 *
 * Implementation note: We do not currently re-date individual journals based on
 * payment dates. Instead, on a "cash" basis we exclude lines posted to
 * Accounts Receivable / Accounts Payable accounts (which represent unsettled
 * accruals). Settled invoices net to zero on AR/AP and therefore remain in the
 * P&L through their income/expense legs. Unsettled invoices are filtered out.
 *
 * This is a pragmatic approximation suitable for management reporting. A full
 * cash-basis re-pricing would require linking each AR/AP movement back to a
 * payment date, which can be added as a Phase 6.5 enhancement.
 */
import type { ReportingBasis } from '@/contexts/FinanceBasisContext';

export interface LedgerLine {
  line_id: string;
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  account_subtype: string | null;
  account_country: 'Singapore' | 'Australia';
  debit: number;
  credit: number;
  entry_date: string;
  entry_branch_id: string | null;
  line_branch_id: string | null;
  entry_status: 'draft' | 'posted' | 'void';
  source_type: string;
}

/**
 * Returns true if a ledger line should be included for the given basis.
 */
export function includeLineForBasis(line: LedgerLine, basis: ReportingBasis): boolean {
  if (basis === 'accrual') return true;
  // Cash basis: drop AR/AP movements so only cash-settled activity remains.
  const subtype = (line.account_subtype || '').toLowerCase();
  const name = (line.account_name || '').toLowerCase();
  const isAR = subtype.includes('receivable') || name.includes('accounts receivable') || name === 'receivables';
  const isAP = subtype.includes('payable')    || name.includes('accounts payable')    || name === 'payables';
  return !(isAR || isAP);
}

export function basisLabel(basis: ReportingBasis): string {
  return basis === 'cash' ? 'Cash basis' : 'Accrual basis';
}
