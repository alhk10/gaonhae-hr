/**
 * Service for school-fee payments submitted through the public /hello chat.
 * Backed by SECURITY DEFINER functions so the public /access page can read
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
  contact_name: string | null;
  contact_email: string | null;
  contact_dob: string | null;
  reference_number: string | null;
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

/* ------------------------------------------------------------------ */
/* Public /fees page                                                   */
/* ------------------------------------------------------------------ */

export interface PublicClassProduct {
  product_id: string;
  product_name: string;
  description: string | null;
  base_price: number;
  branch_price: number;
}

export interface PublicBranchTerm {
  term_id: string;
  term_name: string;
  start_date: string;
  end_date: string;
}

export const getPublicClassProducts = async (branchId: string): Promise<PublicClassProduct[]> => {
  const { data, error } = await supabase.rpc('get_public_class_products' as any, {
    p_branch_id: branchId,
  });
  if (error) throw error;
  return ((data || []) as any[]).map((r) => ({
    ...r,
    base_price: Number(r.base_price ?? 0),
    branch_price: Number(r.branch_price ?? 0),
  })) as PublicClassProduct[];
};

/** Admin view of a class product's availability + price at one branch. */
export interface BranchClassProduct {
  product_id: string;
  product_name: string;
  description: string | null;
  base_price: number;
  rule_id: string | null;
  price_override: number | null;
  is_available: boolean;
}

export const getClassProductsForBranchAdmin = async (
  branchId: string,
): Promise<BranchClassProduct[]> => {
  if (!branchId) return [];
  const { data, error } = await supabase.rpc('get_class_products_for_branch_admin' as any, {
    p_branch_id: branchId,
  });
  if (error) throw error;
  return ((data || []) as any[]).map((r) => ({
    ...r,
    base_price: Number(r.base_price ?? 0),
    price_override: r.price_override === null || r.price_override === undefined
      ? null
      : Number(r.price_override),
    is_available: !!r.is_available,
  })) as BranchClassProduct[];
};

export const setClassProductBranchPricing = async (
  branchId: string,
  productId: string,
  available: boolean,
  priceOverride: number | null,
  actor?: string | null,
): Promise<void> => {
  const { error } = await supabase.rpc('admin_set_class_product_branch_pricing' as any, {
    p_branch_id: branchId,
    p_product_id: productId,
    p_available: available,
    p_price_override: priceOverride,
    p_actor: actor || null,
  });
  if (error) throw error;
};

export const getPublicTermsForBranch = async (branchId: string): Promise<PublicBranchTerm[]> => {
  const { data, error } = await supabase.rpc('get_public_terms_for_branch' as any, {
    p_branch_id: branchId,
  });
  if (error) throw error;
  return (data || []) as PublicBranchTerm[];
};

export interface SubmitSchoolFeesInput {
  first_name: string;
  last_name: string;
  email: string;
  date_of_birth: string;
  branch_id: string;
  product_id: string;
  term_id: string | null;
  amount: number;
  payment_method: 'paynow' | 'bank_transfer';
  proof_file: File;
}

export const submitSchoolFeesPayment = async (
  input: SubmitSchoolFeesInput,
): Promise<{ id: string; reference_number: string }> => {
  const ext = input.proof_file.name.split('.').pop() || 'jpg';
  const ts = Date.now();
  const safeName = `${input.first_name} ${input.last_name}`
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_');
  const path = `public-fees/${input.branch_id}/${ts}_${safeName}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('payment-proofs')
    .upload(path, input.proof_file, { upsert: false, contentType: input.proof_file.type });
  if (uploadError) throw uploadError;

  const { data: signed } = await supabase.storage
    .from('payment-proofs')
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  const proofUrl = signed?.signedUrl ?? path;

  const { data, error } = await supabase.rpc('submit_public_school_fees' as any, {
    p_first_name: input.first_name,
    p_last_name: input.last_name,
    p_email: input.email,
    p_date_of_birth: input.date_of_birth,
    p_branch_id: input.branch_id,
    p_product_id: input.product_id,
    p_term_id: input.term_id,
    p_amount: input.amount,
    p_payment_method: input.payment_method,
    p_proof_url: proofUrl,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row as { id: string; reference_number: string };
};

export const matchSchoolFeesSubmission = async (
  id: string,
  studentId: string,
  matchedBy: string,
): Promise<void> => {
  const { error } = await supabase.rpc('admin_match_school_fees_submission' as any, {
    p_id: id,
    p_student_id: studentId,
    p_matched_by: matchedBy,
  });
  if (error) throw error;
};


export interface SchoolFeesStudentMatch {
  student_id: string;
  student_number: string | null;
  full_name: string;
  email: string | null;
  date_of_birth: string | null;
  branch_id: string | null;
  current_belt: string | null;
  score: number;
  reason: string | null;
}

export const getSchoolFeesStudentMatches = async (
  id: string,
): Promise<SchoolFeesStudentMatch[]> => {
  const { data, error } = await supabase.rpc(
    'find_school_fees_submission_student_matches' as any,
    { p_id: id },
  );
  if (error) throw error;
  return ((data || []) as any[]).map((r) => ({
    ...r,
    score: Number(r.score ?? 0),
  })) as SchoolFeesStudentMatch[];
};
