/**
 * Accounting Postings (Phase 3)
 *
 * Module-specific journal builders. Each function fetches the data it needs,
 * builds a balanced set of journal lines, and calls postJournalForSource()
 * (which is itself idempotent — re-posting replaces the prior journal).
 *
 * All postings are wrapped in safe() so a failure here NEVER rolls back
 * the underlying business operation; we log + continue. Superadmins can
 * re-run via the backfill UI.
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { postJournalForSource, voidJournalsForSource, type Country, type JournalLineDraft } from './accountingService';
import {
  ACC,
  getAccountId,
  incomeCodeForProduct,
  expenseCodeForBranchCategory,
  resolveBankAccount,
  standardOutputTaxCode,
} from './accountingMappings';

type Money = number;

const r2 = (n: Money) => Math.round(Number(n || 0) * 100) / 100;

async function getBranchCountry(branchId?: string | null): Promise<Country> {
  if (!branchId) return 'Singapore';
  const { data } = await supabase.from('branches').select('country').eq('id', branchId).maybeSingle();
  const c = (data?.country || '').toString();
  if (c === 'Australia' || c === 'AU') return 'Australia';
  return 'Singapore';
}

/** Wrap a posting in try/catch so source operations never fail because of accounting. */
export async function safePost<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    logger.error(`[accounting] ${label} failed`, e);
    return null;
  }
}

// ============================================================
// INVOICES
// ============================================================
/**
 * Posts when an invoice transitions to a non-draft, non-cancelled state
 * (sent / unpaid / partially paid / paid / verified / overdue).
 *
 * Dr A/R (gross)   Cr Income (per line, by product)   Cr GST Output
 * Discounts → contra-income line on Dr Sales Discounts.
 */
export async function postInvoiceIssuedJournal(invoiceId: string): Promise<void> {
  await safePost(`invoice ${invoiceId} issued`, async () => {
    const { data: inv, error } = await supabase
      .from('invoices')
      .select('id, invoice_number, branch_id, status, subtotal, tax_amount, discount_amount, total_amount, issue_date, student_id')
      .eq('id', invoiceId)
      .maybeSingle();
    if (error) throw error;
    if (!inv) return null;

    // No journal for drafts or cancelled invoices
    if (!inv.status || inv.status === 'draft' || inv.status === 'cancelled') {
      await voidJournalsForSource('invoice', inv.id);
      return null;
    }

    const country = await getBranchCountry(inv.branch_id);
    const { data: items } = await supabase
      .from('invoice_items')
      .select('id, total_amount, tax_amount, product_id, description, products:product_id (name, is_lesson, is_adhoc_lesson, category_id, product_categories:category_id ( name ))')
      .eq('invoice_id', inv.id);

    const lines: JournalLineDraft[] = [];

    // Dr A/R for gross total
    const total = r2(inv.total_amount || 0);
    if (total <= 0) {
      // Nothing to post (or fully refunded) — make sure stale journals are voided.
      await voidJournalsForSource('invoice', inv.id);
      return null;
    }

    lines.push({
      account_id: await getAccountId(country, ACC.AR),
      debit: total,
      description: `Invoice ${inv.invoice_number}`,
      contact_type: 'student',
      contact_ref: inv.student_id,
      branch_id: inv.branch_id,
    });

    // Group income lines by income account code
    const incomeByCode = new Map<string, number>();
    for (const it of items || []) {
      const lineNet = r2(Number(it.total_amount || 0) - Number(it.tax_amount || 0));
      if (lineNet === 0) continue;
      const prodAny = it.products as any;
      const code = incomeCodeForProduct({
        category: prodAny?.product_categories?.name,
        is_adhoc_lesson: prodAny?.is_adhoc_lesson,
        is_lesson: prodAny?.is_lesson,
        name: prodAny?.name || it.description,
      });
      incomeByCode.set(code, r2((incomeByCode.get(code) || 0) + lineNet));
    }

    for (const [code, amount] of incomeByCode) {
      if (amount === 0) continue;
      lines.push({
        account_id: await getAccountId(country, code),
        credit: amount > 0 ? r2(Math.abs(amount)) : 0,
        debit: amount < 0 ? r2(Math.abs(amount)) : 0,
        description: `Sales — ${code}`,
        branch_id: inv.branch_id,
      });
      // Above flips sign safely: negative line items (e.g. bundle discount) become a debit on the income account.
    }

    // Discount as contra-income (sales discounts debit)
    const discount = r2(inv.discount_amount || 0);
    if (discount > 0) {
      lines.push({
        account_id: await getAccountId(country, ACC.SALES_DISCOUNTS),
        debit: discount,
        description: 'Sales discount',
        branch_id: inv.branch_id,
      });
    }

    // GST Output (tagged with standard-rated tax code so Tax Centre can aggregate it)
    const tax = r2(inv.tax_amount || 0);
    if (tax !== 0) {
      const taxCodeId = await standardOutputTaxCode(country);
      const netSupply = r2(Number(inv.subtotal || 0) - Number(inv.discount_amount || 0));
      lines.push({
        account_id: await getAccountId(country, ACC.GST_OUTPUT),
        credit: tax > 0 ? tax : 0,
        debit: tax < 0 ? Math.abs(tax) : 0,
        description: 'GST collected',
        branch_id: inv.branch_id,
        tax_code_id: taxCodeId,
        tax_amount: tax,
        tax_base_amount: netSupply,
      });
    }

    // Re-balance check: if rounding drift, plug into Other Income
    const totalDr = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
    const totalCr = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
    const diff = r2(totalDr - totalCr);
    if (Math.abs(diff) >= 0.01) {
      lines.push({
        account_id: await getAccountId(country, ACC.INCOME_OTHER),
        credit: diff > 0 ? diff : 0,
        debit: diff < 0 ? Math.abs(diff) : 0,
        description: 'Rounding',
        branch_id: inv.branch_id,
      });
    }

    return postJournalForSource({
      sourceType: 'invoice',
      sourceId: inv.id,
      subEvent: 'issued',
      entry_date: inv.issue_date || new Date().toISOString().slice(0, 10),
      country,
      branch_id: inv.branch_id,
      narration: `Invoice ${inv.invoice_number}`,
      lines,
    });
  });
}

export async function voidInvoiceJournal(invoiceId: string): Promise<void> {
  await safePost(`invoice ${invoiceId} void`, async () => {
    return voidJournalsForSource('invoice', invoiceId);
  });
}

// ============================================================
// PAYMENTS
// ============================================================
/**
 * Dr Bank/Cash/PayNow   Cr A/R
 */
export async function postPaymentJournal(paymentId: string): Promise<void> {
  await safePost(`payment ${paymentId}`, async () => {
    const { data: pay, error } = await supabase
      .from('payments')
      .select('id, payment_number, amount, payment_method, payment_date, invoice_id, verification_status, is_verified, invoices:invoice_id ( id, branch_id, invoice_number, student_id )')
      .eq('id', paymentId)
      .maybeSingle();
    if (error) throw error;
    if (!pay) return null;

    const inv: any = pay.invoices;
    const branchId = inv?.branch_id ?? null;

    // For non-cash, only post once verified (matches business rule — staff confirms transfer).
    const method = (pay.payment_method || '').toLowerCase();
    const requiresVerification = method !== 'cash' && method !== 'credit';
    if (requiresVerification && pay.verification_status === 'rejected') {
      await voidJournalsForSource('payment', pay.id);
      return null;
    }
    if (requiresVerification && !pay.is_verified) {
      // Pending — keep ledger un-posted until verification flips.
      await voidJournalsForSource('payment', pay.id);
      return null;
    }

    const country = await getBranchCountry(branchId);
    const amount = r2(pay.amount || 0);
    if (amount <= 0) {
      await voidJournalsForSource('payment', pay.id);
      return null;
    }

    const lines: JournalLineDraft[] = [
      {
        account_id: await resolveBankAccount(country, pay.payment_method),
        debit: amount,
        description: `Payment ${pay.payment_number || ''}`.trim(),
        branch_id: branchId,
      },
      {
        account_id: await getAccountId(country, ACC.AR),
        credit: amount,
        description: `Invoice ${inv?.invoice_number || pay.invoice_id}`,
        contact_type: 'student',
        contact_ref: inv?.student_id,
        branch_id: branchId,
      },
    ];

    return postJournalForSource({
      sourceType: 'payment',
      sourceId: pay.id,
      subEvent: 'received',
      entry_date: pay.payment_date || new Date().toISOString().slice(0, 10),
      country,
      branch_id: branchId,
      narration: `Payment ${pay.payment_number || pay.id}`,
      lines,
    });
  });
}

export async function voidPaymentJournal(paymentId: string): Promise<void> {
  await safePost(`payment ${paymentId} void`, async () => voidJournalsForSource('payment', paymentId));
}

// ============================================================
// CLAIMS
// ============================================================
/**
 * Approved: Dr Staff Claims expense  Cr Claims Payable
 * Paid:     Dr Claims Payable        Cr Bank
 */
export async function postClaimJournal(claimId: string | number): Promise<void> {
  await safePost(`claim ${claimId}`, async () => {
    const idAsNum = typeof claimId === 'string' ? parseInt(claimId, 10) : claimId;
    const { data: cl, error } = await supabase
      .from('claims')
      .select('id, employee_id, amount, status, submitted_date, branch_id, type, description')
      .eq('id', idAsNum)
      .maybeSingle();
    if (error) throw error;
    if (!cl) return null;

    const clIdStr = String(cl.id);
    const country = await getBranchCountry(cl.branch_id);
    const amount = r2(cl.amount || 0);
    const status = (cl.status || '').toLowerCase();

    if (amount <= 0 || status === 'rejected' || status === 'pending') {
      await voidJournalsForSource('claim', clIdStr);
      return null;
    }

    const accruedLines: JournalLineDraft[] = [
      {
        account_id: await getAccountId(country, ACC.STAFF_CLAIMS),
        debit: amount,
        description: `Claim — ${cl.type || ''} ${cl.description || ''}`.trim(),
        contact_type: 'employee',
        contact_ref: cl.employee_id,
        branch_id: cl.branch_id,
      },
      {
        account_id: await getAccountId(country, ACC.CLAIMS_PAYABLE),
        credit: amount,
        description: `Claim payable — ${cl.employee_id}`,
        branch_id: cl.branch_id,
      },
    ];
    await postJournalForSource({
      sourceType: 'claim',
      sourceId: clIdStr,
      subEvent: 'approved',
      entry_date: (cl.submitted_date || new Date().toISOString()).slice(0, 10),
      country,
      branch_id: cl.branch_id,
      narration: `Claim approved ${clIdStr}`,
      lines: accruedLines,
    });

    if (status === 'paid' || status === 'reimbursed') {
      const paidLines: JournalLineDraft[] = [
        {
          account_id: await getAccountId(country, ACC.CLAIMS_PAYABLE),
          debit: amount,
          description: `Claim paid — ${cl.employee_id}`,
          branch_id: cl.branch_id,
        },
        {
          account_id: await getAccountId(country, ACC.BANK),
          credit: amount,
          description: 'Claim reimbursement',
          branch_id: cl.branch_id,
        },
      ];
      await postJournalForSource({
        sourceType: 'claim',
        sourceId: clIdStr,
        subEvent: 'paid',
        entry_date: new Date().toISOString().slice(0, 10),
        country,
        branch_id: cl.branch_id,
        narration: `Claim paid ${clIdStr}`,
        lines: paidLines,
      });
    }

    return null;
  });
}

// ============================================================
// BRANCH P&L EXPENSES (legacy table — read & post)
// ============================================================
/**
 * Dr <category-mapped expense>   Cr Bank
 * Type=income rows are skipped (income is captured via invoices).
 */
export async function postBranchExpenseJournal(entryId: string): Promise<void> {
  await safePost(`branch expense ${entryId}`, async () => {
    const { data: e, error } = await supabase
      .from('branch_profit_loss_entries')
      .select('id, branch_id, month, year, category, subcategory, description, amount, type')
      .eq('id', entryId)
      .maybeSingle();
    if (error) throw error;
    if (!e) return null;

    if ((e.type || '').toLowerCase() !== 'expense') {
      await voidJournalsForSource('expense', e.id);
      return null;
    }

    const amount = r2(e.amount || 0);
    if (amount <= 0) {
      await voidJournalsForSource('expense', e.id);
      return null;
    }

    const country = await getBranchCountry(e.branch_id);
    // Use the 1st of the entry's month as posting date
    const m = String(e.month).padStart(2, '0');
    const date = `${e.year}-${m}-01`;

    const expenseCode = expenseCodeForBranchCategory(e.subcategory || e.category);
    const lines: JournalLineDraft[] = [
      {
        account_id: await getAccountId(country, expenseCode),
        debit: amount,
        description: `${e.category}${e.subcategory ? ' / ' + e.subcategory : ''} — ${e.description || ''}`.trim(),
        branch_id: e.branch_id,
      },
      {
        account_id: await getAccountId(country, ACC.BANK),
        credit: amount,
        description: 'Branch expense',
        branch_id: e.branch_id,
      },
    ];

    return postJournalForSource({
      sourceType: 'expense',
      sourceId: e.id,
      subEvent: 'recorded',
      entry_date: date,
      country,
      branch_id: e.branch_id,
      narration: `Branch expense — ${e.category}`,
      lines,
    });
  });
}

// ============================================================
// INVENTORY
// ============================================================
/**
 * Order received: Dr Inventory  Cr A/P
 */
export async function postInventoryReceivedJournal(orderId: string): Promise<void> {
  await safePost(`inventory order ${orderId}`, async () => {
    const { data: o, error } = await supabase
      .from('inventory_orders')
      .select('id, order_number, location_id, total_cost, status, received_at')
      .eq('id', orderId)
      .maybeSingle();
    if (error) throw error;
    if (!o) return null;

    const status = (o.status || '').toLowerCase();
    if (status !== 'received' && status !== 'approved') {
      await voidJournalsForSource('inventory', o.id);
      return null;
    }
    const amount = r2(o.total_cost || 0);
    if (amount <= 0) return null;

    const country = await getBranchCountry(o.location_id);
    const lines: JournalLineDraft[] = [
      {
        account_id: await getAccountId(country, ACC.INVENTORY),
        debit: amount,
        description: `Inventory received — ${o.order_number}`,
        branch_id: o.location_id,
      },
      {
        account_id: await getAccountId(country, ACC.AP),
        credit: amount,
        description: `Supplier payable — ${o.order_number}`,
        branch_id: o.location_id,
      },
    ];

    return postJournalForSource({
      sourceType: 'inventory',
      sourceId: o.id,
      subEvent: 'received',
      entry_date: (o.received_at || new Date().toISOString()).slice(0, 10),
      country,
      branch_id: o.location_id,
      narration: `Inventory order ${o.order_number}`,
      lines,
    });
  });
}

// ============================================================
// PAYROLL
// ============================================================
/**
 * Finalize: Dr Wages + statutory expense  Cr Wages Payable + statutory payables
 * Salary paid: Dr Wages Payable  Cr Bank
 * Statutory paid (CPF/Super): Dr Statutory Payable  Cr Bank
 */
interface PayrollDataLite {
  grossPay?: number;
  grossSalary?: number;
  netPay?: number;
  employerCPF?: number;
  employeeCPF?: number;
  cpfEmployer?: number;
  cpfEmployee?: number;
  sdl?: number;
  super?: number;
  superannuation?: number;
  payg?: number;
  branchId?: string | null;
  branch_id?: string | null;
}

export async function postPayrollJournals(payrollRecordId: string): Promise<void> {
  await safePost(`payroll ${payrollRecordId}`, async () => {
    const { data: rec, error } = await supabase
      .from('payroll_records')
      .select('id, employee_id, month, year, payroll_data, status, salary_paid, cpf_paid, salary_paid_at, cpf_paid_at')
      .eq('id', payrollRecordId)
      .maybeSingle();
    if (error) throw error;
    if (!rec) return null;

    const status = (rec.status || '').toLowerCase();
    if (status !== 'finalized' && status !== 'paid') {
      await voidJournalsForSource('payroll', rec.id);
      return null;
    }

    // Resolve employee → first branch (best-effort)
    const { data: emp } = await supabase
      .from('employees')
      .select('id, name')
      .eq('id', rec.employee_id)
      .maybeSingle();

    const pd = (rec.payroll_data || {}) as PayrollDataLite;
    const branchId = pd.branchId || pd.branch_id || null;
    const country = await getBranchCountry(branchId);

    const gross = r2(pd.grossPay ?? pd.grossSalary ?? 0);
    const net = r2(pd.netPay ?? gross);
    const cpfEr = r2(pd.employerCPF ?? pd.cpfEmployer ?? 0);
    const cpfEe = r2(pd.employeeCPF ?? pd.cpfEmployee ?? 0);
    const sdl = r2(pd.sdl ?? 0);
    const sup = r2(pd.super ?? pd.superannuation ?? 0);
    const payg = r2(pd.payg || 0);

    const dateBase = parsePayrollMonth(String(rec.month), rec.year);

    // ---- Finalize accrual journal ----
    if (gross > 0) {
      const lines: JournalLineDraft[] = [
        {
          account_id: await getAccountId(country, ACC.WAGES),
          debit: gross,
          description: `Wages — ${emp?.name || rec.employee_id}`,
          contact_type: 'employee',
          contact_ref: rec.employee_id,
          branch_id: branchId,
        },
      ];

      // Country-specific employer statutory
      if (country === 'Singapore') {
        if (cpfEr > 0) {
          lines.push({
            account_id: await getAccountId(country, ACC.CPF_EXPENSE),
            debit: cpfEr,
            description: 'CPF Employer',
            branch_id: branchId,
          });
          lines.push({
            account_id: await getAccountId(country, ACC.CPF_PAYABLE),
            credit: r2(cpfEr + cpfEe),
            description: 'CPF payable (employer + employee)',
            branch_id: branchId,
          });
        } else if (cpfEe > 0) {
          lines.push({
            account_id: await getAccountId(country, ACC.CPF_PAYABLE),
            credit: cpfEe,
            description: 'CPF payable (employee)',
            branch_id: branchId,
          });
        }
        if (sdl > 0) {
          lines.push({
            account_id: await getAccountId(country, ACC.SDL_EXPENSE),
            debit: sdl,
            description: 'SDL',
            branch_id: branchId,
          });
          lines.push({
            account_id: await getAccountId(country, ACC.SDL_PAYABLE),
            credit: sdl,
            description: 'SDL payable',
            branch_id: branchId,
          });
        }
      } else {
        // Australia
        if (sup > 0) {
          lines.push({
            account_id: await getAccountId(country, ACC.SUPER_EXPENSE),
            debit: sup,
            description: 'Superannuation',
            branch_id: branchId,
          });
          lines.push({
            account_id: await getAccountId(country, ACC.SUPER_PAYABLE),
            credit: sup,
            description: 'Super payable',
            branch_id: branchId,
          });
        }
        if (payg > 0) {
          lines.push({
            account_id: await getAccountId(country, ACC.PAYG_PAYABLE),
            credit: payg,
            description: 'PAYG withholding',
            branch_id: branchId,
          });
        }
      }

      // Net wages owed
      if (net > 0) {
        lines.push({
          account_id: await getAccountId(country, ACC.WAGES_PAYABLE),
          credit: net,
          description: 'Net wages payable',
          branch_id: branchId,
        });
      }

      // Plug small rounding on Wages Payable
      const dr = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
      const cr = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
      const diff = r2(dr - cr);
      if (Math.abs(diff) >= 0.01) {
        lines.push({
          account_id: await getAccountId(country, ACC.WAGES_PAYABLE),
          credit: diff > 0 ? diff : 0,
          debit: diff < 0 ? Math.abs(diff) : 0,
          description: 'Rounding',
          branch_id: branchId,
        });
      }

      await postJournalForSource({
        sourceType: 'payroll',
        sourceId: rec.id,
        subEvent: 'finalized',
        entry_date: dateBase,
        country,
        branch_id: branchId,
        narration: `Payroll ${rec.month} ${rec.year} — ${emp?.name || rec.employee_id}`,
        lines,
      });
    }

    // ---- Salary paid ----
    if (rec.salary_paid && net > 0) {
      await postJournalForSource({
        sourceType: 'payroll',
        sourceId: rec.id,
        subEvent: 'salary_paid',
        entry_date: (rec.salary_paid_at || new Date().toISOString()).slice(0, 10),
        country,
        branch_id: branchId,
        narration: `Salary paid — ${emp?.name || rec.employee_id}`,
        lines: [
          {
            account_id: await getAccountId(country, ACC.WAGES_PAYABLE),
            debit: net,
            description: 'Settle wages payable',
            branch_id: branchId,
          },
          {
            account_id: await getAccountId(country, ACC.BANK),
            credit: net,
            description: 'Salary disbursement',
            branch_id: branchId,
          },
        ],
      });
    } else if (!rec.salary_paid) {
      await voidJournalsForSource('payroll', `${rec.id}`).catch(() => {});
      // Note: can't selectively void only salary_paid sub-event — leave as-is.
    }

    // ---- CPF/Super paid ----
    if (rec.cpf_paid) {
      const stat = country === 'Singapore' ? r2(cpfEr + cpfEe + sdl) : r2(sup + payg);
      if (stat > 0) {
        const liabAcc = country === 'Singapore' ? ACC.CPF_PAYABLE : ACC.SUPER_PAYABLE;
        await postJournalForSource({
          sourceType: 'payroll',
          sourceId: rec.id,
          subEvent: 'statutory_paid',
          entry_date: (rec.cpf_paid_at || new Date().toISOString()).slice(0, 10),
          country,
          branch_id: branchId,
          narration: `Statutory paid — ${emp?.name || rec.employee_id}`,
          lines: [
            {
              account_id: await getAccountId(country, liabAcc),
              debit: stat,
              description: 'Settle statutory payable',
              branch_id: branchId,
            },
            {
              account_id: await getAccountId(country, ACC.BANK),
              credit: stat,
              description: 'Statutory disbursement',
              branch_id: branchId,
            },
          ],
        });
      }
    }

    return null;
  });
}

function parsePayrollMonth(month: string, year: number): string {
  // Supports both 'YYYY-MM' and 'Month YYYY' (per memory)
  if (/^\d{4}-\d{2}$/.test(month)) return `${month}-01`;
  const m = month.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (m) {
    const idx = ['january','february','march','april','may','june','july','august','september','october','november','december']
      .indexOf(m[1].toLowerCase());
    if (idx >= 0) return `${m[2]}-${String(idx + 1).padStart(2, '0')}-01`;
  }
  return `${year}-01-01`;
}
