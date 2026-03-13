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
  type: 'overpayment' | 'refund' | 'manual_adjustment' | 'credit_applied';
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
