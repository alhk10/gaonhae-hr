/**
 * Service for school-fee payments submitted through the public /hello chat.
 * Backed by SECURITY DEFINER functions so the public /access page can read
 * and moderate them without an authenticated Supabase session.
 */
import { supabase } from '@/integrations/supabase/client';
import { assertValidPaymentProof, assertValidDateOfBirth } from '@/utils/publicPaymentValidation';

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
  /** 'hello' = paid inside the /hello chat (invoice-backed); 'submission' = legacy /fees form */
  source?: 'hello' | 'submission';
  /** Amount read from the first screenshot */
  scan_amount?: number | null;
  /** Additional screenshots added by staff: { url, amount } */
  extra_proofs?: { url: string; amount: number | null }[];
  /** Scanned first proof + extra proofs */
  paid_total?: number | null;
  overpayment_request_status?: string | null;
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
  const rows = (data || []) as any[];
  // /hello stores bare private storage paths; sign them server-side in one batch.
  const isBare = (u: any) => typeof u === 'string' && u && !/^https?:/i.test(u);
  const bare = new Set<string>();
  rows.forEach((r) => {
    if (isBare(r.proof_url)) bare.add(r.proof_url);
    (Array.isArray(r.extra_proofs) ? r.extra_proofs : []).forEach((p: any) => isBare(p?.url) && bare.add(p.url));
  });
  let signed: Record<string, string> = {};
  if (bare.size) {
    const { data: res } = await supabase.functions.invoke('sign-payment-proof', { body: { paths: [...bare] } });
    signed = (res as any)?.urls || {};
  }
  const sign = (u: any) => (isBare(u) ? signed[u] || u : u ?? null);
  return rows.map((r) => ({
    ...r,
    proof_url: sign(r.proof_url),
    items: Array.isArray(r.items) ? r.items : [],
    amount: r.amount === null ? null : Number(r.amount),
    scan_amount: r.scan_amount == null ? null : Number(r.scan_amount),
    paid_total: r.paid_total == null ? null : Number(r.paid_total),
    extra_proofs: Array.isArray(r.extra_proofs) ? r.extra_proofs.map((p: any) => ({ ...p, url: sign(p?.url) })) : [],
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
  min_age: number | null;
  max_age: number | null;
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

/** Age range is a product-wide setting (applies at every branch). */
export const setClassProductAgeRange = async (
  productId: string,
  minAge: number | null,
  maxAge: number | null,
  actor?: string | null,
): Promise<void> => {
  const { error } = await supabase.rpc('admin_set_class_product_age_range' as any, {
    p_product_id: productId,
    p_min_age: minAge,
    p_max_age: maxAge,
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
  assertValidPaymentProof(input.proof_file);
  assertValidDateOfBirth(input.date_of_birth);
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

/* ------------------------------------------------------------------ */
/* Inline invoice preview (matched submissions)                        */
/* ------------------------------------------------------------------ */

import type { InvoiceData } from '@/utils/invoicePDFGenerator';
import { invoiceCountryCode } from '@/services/invoicePDFTemplate';

/**
 * Loads the full invoice created for a matched school-fee submission,
 * shaped for the shared invoice PDF generator. Returns null when the
 * submission has not been matched to a student yet.
 */
export const getSchoolFeesInvoiceDetail = async (
  submissionId: string,
): Promise<InvoiceData | null> => {
  const { data, error } = await supabase.rpc('get_public_school_fees_invoice' as any, {
    p_submission_id: submissionId,
  });
  if (error) throw error;
  if (!data) return null;

  const raw = data as any;
  const items = Array.isArray(raw.items) ? raw.items : [];
  const country = invoiceCountryCode(raw.branch?.country);
  if (raw.template?.country !== country) throw new Error(`No active ${country} invoice template is set up`);

  return {
    id: raw.id,
    invoice_number: raw.invoice_number,
    issue_date: raw.issue_date,
    due_date: raw.due_date,
    subtotal: Number(raw.subtotal || 0),
    tax_amount: Number(raw.tax_amount || 0),
    discount_amount: Number(raw.discount_amount || 0),
    total_amount: Number(raw.total_amount || 0),
    amount_paid: Number(raw.amount_paid || 0),
    balance_due: Number(raw.balance_due || 0),
    notes: raw.notes ?? null,
    status: raw.status ?? null,
    student: {
      name: raw.student?.name || '',
      address: raw.student?.address ?? null,
      phone: raw.student?.phone ?? null,
      email: raw.student?.email ?? null,
    },
    branch: {
      name: raw.branch?.name || '',
      address: raw.branch?.address ?? undefined,
    },
    template: raw.template,
    items: items.map((it: any, idx: number) => ({
      id: String(idx),
      description: it.description || '',
      quantity: Number(it.quantity || 1),
      unit_price: Number(it.unit_price || 0),
      total_amount: Number(it.total_price || 0),
      tax_rate: 0,
      tax_amount: 0,
      metadata: it.refunded ? { refunded: true } : undefined,
    })),
  };
};

/**
 * Replace the proof file on a school-fee submission row (public_chat_payment_submissions).
 */
export const adminReplaceSchoolFeesProof = async (
  id: string,
  file: File,
  branchId: string | null,
): Promise<string> => {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `public-fees/${branchId || 'unknown'}/edit_${Date.now()}_proof.${ext}`;
  const { error: upErr } = await supabase.storage
    .from('payment-proofs')
    .upload(path, file, { upsert: false, contentType: file.type });
  if (upErr) throw new Error(`Proof upload failed: ${upErr.message}`);
  const { data: signed } = await supabase.storage
    .from('payment-proofs')
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  const url = signed?.signedUrl ?? path;
  const { error: updErr } = await supabase.rpc('admin_replace_school_fees_proof' as any, {
    p_id: id,
    p_proof_url: url,
  });
  if (updErr) throw updErr;
  return url;
};

/* ------------------------------------------------------------------ */
/* Inline edit, extra proofs, overpayment-to-credit requests           */
/* ------------------------------------------------------------------ */

export const updateSchoolFeesRow = async (
  row: Pick<SchoolFeesRow, 'id' | 'source'>,
  changes: { amount?: number | null; payment_method?: string | null; email?: string | null; reason?: string | null },
  actor: string,
): Promise<'saved' | 'requested'> => {
  const { data, error } = await supabase.rpc('admin_update_school_fees_row' as any, {
    p_id: row.id,
    p_source: row.source === 'hello' ? 'hello' : 'submission',
    p_amount: changes.amount ?? null,
    p_payment_method: changes.payment_method ?? null,
    p_email: changes.email ?? null,
    p_reason: changes.reason ?? null,
    p_actor: actor,
  });
  if (error) throw error;
  return data as 'saved' | 'requested';
};

export const addSchoolFeesExtraProof = async (
  row: Pick<SchoolFeesRow, 'id' | 'source' | 'branch_id'>,
  file: File,
  amount: number | null,
): Promise<void> => {
  if (!file.type.startsWith('image/')) throw new Error('Please upload an image (PDF not accepted)');
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `public-fees/${row.branch_id || 'unknown'}/extra_${Date.now()}_proof.${ext}`;
  const { error: upErr } = await supabase.storage
    .from('payment-proofs')
    .upload(path, file, { upsert: false, contentType: file.type });
  if (upErr) throw new Error(`Proof upload failed: ${upErr.message}`);
  const { data: signed } = await supabase.storage
    .from('payment-proofs')
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  const { error } = await supabase.rpc('admin_add_school_fees_extra_proof' as any, {
    p_id: row.id,
    p_source: row.source === 'hello' ? 'hello' : 'submission',
    p_url: signed?.signedUrl ?? path,
    p_amount: amount,
  });
  if (error) throw error;
};

export const requestOverpaymentCredit = async (
  row: Pick<SchoolFeesRow, 'id' | 'source'>,
  amount: number,
  reason: string,
  actor: string,
): Promise<void> => {
  const { error } = await supabase.rpc('request_overpayment_credit' as any, {
    p_id: row.id,
    p_source: row.source === 'hello' ? 'hello' : 'submission',
    p_amount: amount,
    p_reason: reason,
    p_actor: actor,
  });
  if (error) throw error;
};

export const reviewOverpaymentCredit = async (
  requestId: string,
  approve: boolean,
  reviewer: string,
  reason?: string,
): Promise<void> => {
  const { error } = await supabase.rpc('review_overpayment_credit' as any, {
    p_request_id: requestId,
    p_approve: approve,
    p_reviewer: reviewer,
    p_reason: reason ?? null,
  });
  if (error) throw error;
};
