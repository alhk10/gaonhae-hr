/**
 * Student Credit Service
 * Handles credit balance tracking for overpayments, refunds, and manual adjustments
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface StudentCredit {
  id: string;
  student_id: string;
  amount: number;
  type: 'overpayment' | 'refund' | 'item_refund' | 'manual_adjustment' | 'credit_applied';
  reference_id: string | null;
  description: string;
  created_by: string | null;
  created_at: string;
}

export interface StudentCreditSummary {
  student_id: string;
  student_name: string;
  credit_balance: number;
  last_transaction_date: string | null;
}

/**
 * Get the net credit balance for a student
 */
export const getStudentCreditBalance = async (studentId: string): Promise<number> => {
  const { data, error } = await supabase
    .from('student_credits')
    .select('amount')
    .eq('student_id', studentId);

  if (error) {
    logger.error('Error fetching student credit balance', error);
    return 0;
  }

  return (data || []).reduce((sum, row) => sum + Number(row.amount), 0);
};

/**
 * Get credit transaction history for a student
 */
export const getStudentCreditHistory = async (studentId: string): Promise<StudentCredit[]> => {
  const { data, error } = await supabase
    .from('student_credits')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error fetching student credit history', error);
    return [];
  }

  return (data || []) as StudentCredit[];
};

/**
 * Add a manual credit adjustment (positive = add credit, negative = deduct)
 */
export const addManualCredit = async (
  studentId: string,
  amount: number,
  description: string,
  createdBy?: string
): Promise<StudentCredit | null> => {
  const { data, error } = await supabase
    .from('student_credits')
    .insert({
      student_id: studentId,
      amount,
      type: 'manual_adjustment',
      description,
      created_by: createdBy || null
    })
    .select()
    .single();

  if (error) {
    logger.error('Error adding manual credit', error);
    throw new Error(`Failed to add credit: ${error.message}`);
  }

  return data as StudentCredit;
};

/**
 * Record an overpayment credit
 */
export const addOverpaymentCredit = async (
  studentId: string,
  amount: number,
  paymentId: string,
  invoiceNumber: string,
  createdBy?: string
): Promise<StudentCredit | null> => {
  const { data, error } = await supabase
    .from('student_credits')
    .insert({
      student_id: studentId,
      amount,
      type: 'overpayment',
      reference_id: paymentId,
      description: `Overpayment on Invoice #${invoiceNumber}`,
      created_by: createdBy || null
    })
    .select()
    .single();

  if (error) {
    logger.error('Error recording overpayment credit', error);
    throw new Error(`Failed to record overpayment: ${error.message}`);
  }

  return data as StudentCredit;
};

/**
 * Apply credit to an invoice (records a negative credit entry)
 */
export const applyCredit = async (
  studentId: string,
  invoiceId: string,
  invoiceNumber: string,
  amount: number,
  createdBy?: string
): Promise<StudentCredit | null> => {
  // amount should be positive; we store it as negative to deduct from balance
  const { data, error } = await supabase
    .from('student_credits')
    .insert({
      student_id: studentId,
      amount: -Math.abs(amount),
      type: 'credit_applied',
      reference_id: invoiceId,
      description: `Credit applied to Invoice #${invoiceNumber}`,
      created_by: createdBy || null
    })
    .select()
    .single();

  if (error) {
    logger.error('Error applying credit', error);
    throw new Error(`Failed to apply credit: ${error.message}`);
  }

  return data as StudentCredit;
};

/**
 * Issue a refund (zeroes out credit balance)
 */
export const issueRefund = async (
  studentId: string,
  amount: number,
  description: string,
  createdBy?: string
): Promise<StudentCredit | null> => {
  const { data, error } = await supabase
    .from('student_credits')
    .insert({
      student_id: studentId,
      amount: -Math.abs(amount),
      type: 'refund',
      description: description || 'Credit refund issued',
      created_by: createdBy || null
    })
    .select()
    .single();

  if (error) {
    logger.error('Error issuing refund', error);
    throw new Error(`Failed to issue refund: ${error.message}`);
  }

  return data as StudentCredit;
};

export interface CreditStudentOption {
  id: string;
  name: string;
  student_number: string | null;
}

/**
 * Search students by name or student number (for the manual credit dialog)
 */
export const searchStudentsForCredit = async (query: string): Promise<CreditStudentOption[]> => {
  const q = query.trim();
  if (q.length < 2) return [];

  const { data, error } = await supabase
    .from('students')
    .select('id, first_name, last_name, student_number')
    .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,student_number.ilike.%${q}%`)
    .order('first_name')
    .limit(20);

  if (error) {
    logger.error('Error searching students for credit', error);
    return [];
  }

  return (data || []).map(s => ({
    id: s.id,
    name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
    student_number: s.student_number ?? null,
  }));
};

/**
 * Staff request for a cash refund of a student's credit balance.
 * The amount is held immediately so it cannot be spent or refunded twice.
 */
export const requestCreditRefund = async (
  studentId: string,
  studentName: string,
  amount: number,
  reason: string,
  requestedByEmail: string
): Promise<void> => {
  const { data: hold, error: holdError } = await supabase
    .from('student_credits')
    .insert({
      student_id: studentId,
      amount: -Math.abs(amount),
      type: 'refund_pending' as any,
      description: `Cash refund pending superadmin approval — ${reason}`,
      created_by: requestedByEmail || null,
    })
    .select()
    .single();

  if (holdError) {
    logger.error('Error holding credit for refund request', holdError);
    throw new Error(`Failed to submit refund request: ${holdError.message}`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('invoice_action_requests')
    .insert({
      invoice_id: null as any,
      action_type: 'credit_refund',
      request_data: { student_id: studentId, amount, reason, hold_id: hold?.id },
      requested_by: user?.id || null,
      requested_by_email: requestedByEmail || null,
      invoice_number: null,
      student_name: studentName,
      status: 'pending',
    });

  if (error) {
    // Roll back the hold so the balance is not stuck
    if (hold?.id) await supabase.from('student_credits').delete().eq('id', hold.id);
    logger.error('Error submitting credit refund request', error);
    throw new Error(`Failed to submit refund request: ${error.message}`);
  }
};

/**
 * Turn an approved credit refund request into an actual refund
 */
export const completeCreditRefundRequest = async (
  requestData: any,
  approvedByEmail?: string
): Promise<void> => {
  if (requestData?.hold_id) {
    await supabase.from('student_credits').delete().eq('id', requestData.hold_id);
  }
  await issueRefund(
    requestData?.student_id,
    Number(requestData?.amount || 0),
    requestData?.reason || 'Credit refund approved',
    approvedByEmail
  );
};

/**
 * Release the hold placed by a rejected credit refund request
 */
export const releaseCreditRefundHold = async (requestData: any): Promise<void> => {
  if (requestData?.hold_id) {
    await supabase.from('student_credits').delete().eq('id', requestData.hold_id);
  }
};

/**
 * Get all students with credit balances (for admin view)
 */
export const getAllStudentCredits = async (): Promise<StudentCreditSummary[]> => {
  // Get all credits grouped by student
  const { data: credits, error } = await supabase
    .from('student_credits')
    .select('student_id, amount, created_at');

  if (error) {
    logger.error('Error fetching all student credits', error);
    return [];
  }

  if (!credits || credits.length === 0) return [];

  // Group by student and calculate balances
  const studentMap = new Map<string, { balance: number; lastDate: string }>();
  credits.forEach(c => {
    const existing = studentMap.get(c.student_id) || { balance: 0, lastDate: c.created_at };
    existing.balance += Number(c.amount);
    if (c.created_at > existing.lastDate) existing.lastDate = c.created_at;
    studentMap.set(c.student_id, existing);
  });

  // Get student names
  const studentIds = Array.from(studentMap.keys());
  const { data: students } = await supabase
    .from('students')
    .select('id, first_name, last_name')
    .in('id', studentIds);

  const studentNameMap = new Map<string, string>();
  (students || []).forEach(s => {
    studentNameMap.set(s.id, `${s.first_name || ''} ${s.last_name || ''}`.trim());
  });

  return Array.from(studentMap.entries())
    .map(([studentId, data]) => ({
      student_id: studentId,
      student_name: studentNameMap.get(studentId) || 'Unknown',
      credit_balance: data.balance,
      last_transaction_date: data.lastDate
    }))
    .filter(s => Math.abs(s.credit_balance) > 0.01)
    .sort((a, b) => b.credit_balance - a.credit_balance);
};

export interface CreditLedgerRow extends StudentCredit {
  student_name: string;
  invoice_id: string | null;
  invoice_number: string | null;
  balance_after: number;
  reversed: boolean;
  reversible: boolean;
}

export const isCreditReversible = (row: { type: string; reference_id: string | null }, reversedIds: Set<string>, id: string) =>
  !reversedIds.has(id) && !(row.reference_id || '').startsWith('reversal:') &&
  !['credit_hold', 'credit_hold_released', 'refund_pending'].includes(row.type);

export const reverseStudentCredit = async (creditId: string, reason: string) => {
  const { error } = await (supabase as any).rpc('admin_reverse_student_credit', { p_credit_id: creditId, p_reason: reason });
  if (error) throw new Error(error.message);
};

/** Running balance per student, computed oldest → newest. Returns rows newest first. */
export const withRunningBalance = <T extends { student_id: string; amount: number; created_at: string; id: string }>(
  rows: T[]
): (T & { balance_after: number })[] => {
  const asc = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  const bal = new Map<string, number>();
  const out = asc.map(r => {
    const next = Math.round(((bal.get(r.student_id) ?? 0) + Number(r.amount)) * 100) / 100;
    bal.set(r.student_id, next);
    return { ...r, balance_after: next };
  });
  return out.reverse();
};

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** Full credit ledger (optionally one student) with names, invoice links and running balances. */
export const getCreditLedger = async (studentId?: string): Promise<CreditLedgerRow[]> => {
  const all: StudentCredit[] = [];
  for (let from = 0; ; from += 1000) {
    let q = supabase.from('student_credits').select('*').order('created_at', { ascending: true }).range(from, from + 999);
    if (studentId) q = q.eq('student_id', studentId);
    const { data, error } = await q;
    if (error) throw error;
    all.push(...((data || []) as StudentCredit[]));
    if (!data || data.length < 1000) break;
  }
  const refIds = Array.from(new Set(all.map(c => c.reference_id?.match(UUID_RE)?.[0]).filter(Boolean) as string[]));
  const studentIds = Array.from(new Set(all.map(c => c.student_id)));
  const invMap = new Map<string, { id: string; invoice_number: string }>();
  const nameMap = new Map<string, string>();
  for (let i = 0; i < refIds.length; i += 200) {
    const chunk = refIds.slice(i, i + 200);
    const { data: invs } = await supabase.from('invoices').select('id, invoice_number').in('id', chunk);
    (invs || []).forEach(v => invMap.set(v.id, v as any));
    const missing = chunk.filter(id => !invMap.has(id));
    if (missing.length) {
      const { data: items } = await supabase.from('invoice_items').select('id, invoice_id, invoices(id, invoice_number)').in('id', missing);
      (items || []).forEach((it: any) => it.invoices && invMap.set(it.id, it.invoices));
    }
  }
  for (let i = 0; i < studentIds.length; i += 200) {
    const { data: st } = await supabase.from('students').select('id, first_name, last_name').in('id', studentIds.slice(i, i + 200));
    (st || []).forEach((s: any) => nameMap.set(s.id, `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim()));
  }
  const reversedIds = new Set(all.map(c => c.reference_id || '').filter(r => r.startsWith('reversal:')).map(r => r.slice(9)));
  return withRunningBalance(all.map(c => ({ ...c, amount: Number(c.amount) }))).map(c => {
    const ref = (c.reference_id || '').startsWith('reversal:') ? undefined : c.reference_id?.match(UUID_RE)?.[0];
    const inv = ref ? invMap.get(ref) : undefined;
    return { ...c, student_name: nameMap.get(c.student_id) || 'Unknown', invoice_id: inv?.id ?? null, invoice_number: inv?.invoice_number ?? null,
      reversed: reversedIds.has(c.id), reversible: isCreditReversible(c, reversedIds, c.id) };
  });
};
