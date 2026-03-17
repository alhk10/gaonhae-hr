import { supabase } from '@/integrations/supabase/client';
import type { CreateInvoiceData } from './invoiceService';
import { createInvoice } from './invoiceService';

export const DISCOUNT_APPROVAL_THRESHOLD = 250;

export interface InvoiceDiscountApproval {
  id: string;
  invoice_data: CreateInvoiceData;
  student_name: string;
  branch_name: string | null;
  total_discount: number;
  total_amount: number;
  item_count: number;
  requested_by: string | null;
  requested_by_email: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  approval_reason: string | null;
  created_at: string;
}

export const submitDiscountApproval = async (
  invoiceData: CreateInvoiceData,
  studentName: string,
  branchName: string | null,
  totalDiscount: number,
  totalAmount: number,
  requestedByEmail: string | null,
  approvalReason?: string
): Promise<void> => {
  const { error } = await supabase
    .from('invoice_discount_approvals' as any)
    .insert({
      invoice_data: invoiceData as any,
      student_name: studentName,
      branch_name: branchName,
      total_discount: totalDiscount,
      total_amount: totalAmount,
      item_count: invoiceData.items.length,
      requested_by_email: requestedByEmail,
      approval_reason: approvalReason || null,
      status: 'pending',
    });

  if (error) throw error;
};

export const getPendingDiscountApprovals = async (): Promise<InvoiceDiscountApproval[]> => {
  const { data, error } = await supabase
    .from('invoice_discount_approvals' as any)
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as InvoiceDiscountApproval[];
};

export const getPendingDiscountApprovalsCount = async (): Promise<number> => {
  const { count, error } = await supabase
    .from('invoice_discount_approvals' as any)
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (error) throw error;
  return count || 0;
};

export const approveDiscountApproval = async (
  approvalId: string,
  reviewedBy: string
): Promise<void> => {
  // Get the approval record
  const { data: approval, error: fetchError } = await supabase
    .from('invoice_discount_approvals' as any)
    .select('*')
    .eq('id', approvalId)
    .single();

  if (fetchError || !approval) throw fetchError || new Error('Approval not found');

  const invoiceData = (approval as any).invoice_data as CreateInvoiceData;

  // Create the invoice
  await createInvoice(invoiceData);

  // Mark as approved
  const { error } = await supabase
    .from('invoice_discount_approvals' as any)
    .update({
      status: 'approved',
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', approvalId);

  if (error) throw error;
};

export const rejectDiscountApproval = async (
  approvalId: string,
  reviewedBy: string,
  reason?: string
): Promise<void> => {
  const { error } = await supabase
    .from('invoice_discount_approvals' as any)
    .update({
      status: 'rejected',
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason || null,
    })
    .eq('id', approvalId);

  if (error) throw error;
};

/**
 * Calculate total discount amount across all invoice items
 */
export const calculateTotalDiscount = (
  items: Array<{
    quantity: number;
    unit_price: number;
    discount_type?: 'percentage' | 'amount';
    discount_value?: number;
    total: number;
  }>
): number => {
  return items.reduce((sum, item) => {
    const gross = item.quantity * item.unit_price;
    const discount = gross - item.total;
    return sum + Math.max(0, discount);
  }, 0);
};
