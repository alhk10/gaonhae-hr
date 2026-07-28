/**
 * Service for school-fee payments submitted through the public /hello chat.
 * Backed by SECURITY DEFINER functions so the public /grading-list page can read
 * and moderate them without an authenticated Supabase session.
 */
import { supabase } from '@/integrations/supabase/client';

export interface SchoolFeesItem {
  product_id?: string;
  product_name?: string;
  size?: string | null;
  variant?: string | null;
  size_variant?: string | null;
  term_id?: string | null;
  term_name?: string | null;
  qty?: number;
  unit_price?: number;
}

export interface SchoolFeesRow {
  id: string;
  created_at: string;
  student_id: string | null;
  student_name: string | null;
  branch_id: string | null;
  branch_name: string | null;
  category: string | null;
  items: SchoolFeesItem[];
  amount: number | null;
  payment_method: string | null;
  proof_url: string | null;
  status: string;
  invoice_id: string | null;
  invoice_number: string | null;
  invoice_status: string | null;
  payment_id: string | null;
  payment_number: string | null;
  payment_verification_status: string | null;
}

export interface SchoolFeesDeleteContext {
  submission_id: string;
  amount: number | null;
  student_name: string | null;
  invoice_id: string | null;
  invoice_number: string | null;
  invoice_items: number;
  payments: number;
}

export const getSchoolFeesList = async (
  branchId?: string | null,
  status?: string | null,
): Promise<SchoolFeesRow[]> => {
  const { data, error } = await supabase.rpc('get_public_school_fees_list' as any, {
    p_branch_id: branchId || null,
    p_status: status || null,
  });
  if (error) throw error;
  return ((data || []) as any[]).map((r) => ({
    ...r,
    items: Array.isArray(r.items) ? r.items : [],
    amount: r.amount === null ? null : Number(r.amount),
  })) as SchoolFeesRow[];
};

export const verifySchoolFeesSubmission = async (id: string, verifiedBy: string): Promise<void> => {
  const { error } = await supabase.rpc('admin_verify_school_fees_submission' as any, {
    p_id: id,
    p_verified_by: verifiedBy,
  });
  if (error) throw error;
};

export const rejectSchoolFeesSubmission = async (
  id: string,
  reason: string,
  reviewedBy: string,
): Promise<void> => {
  const { error } = await supabase.rpc('admin_reject_school_fees_submission' as any, {
    p_id: id,
    p_reason: reason,
    p_reviewed_by: reviewedBy,
  });
  if (error) throw error;
};

export const getSchoolFeesDeleteContext = async (id: string): Promise<SchoolFeesDeleteContext> => {
  const { data, error } = await supabase.rpc('admin_school_fees_delete_context' as any, { p_id: id });
  if (error) throw error;
  return (data || {}) as SchoolFeesDeleteContext;
};

export const deleteSchoolFeesSubmission = async (id: string, deletedBy: string): Promise<void> => {
  const { error } = await supabase.rpc('admin_delete_school_fees_submission' as any, {
    p_id: id,
    p_deleted_by: deletedBy,
  });
  if (error) throw error;
};
