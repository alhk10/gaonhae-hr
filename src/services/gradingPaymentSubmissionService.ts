/**
 * Service for the public grading payment module.
 * Used by the public /pay and /grading-list pages (no auth required).
 */
import { supabase } from '@/integrations/supabase/client';

export interface PublicBranch {
  id: string;
  name: string;
  country: string | null;
}

export interface PublicPaymentOptions {
  branch_country: string | null;
  paynow_qr_url: string | null;
  bank_transfer_info: string | null;
  product_id: string | null;
  product_name: string | null;
  product_price: number | null;
  slot_id: string | null;
  slot_date: string | null;
  slot_start: string | null;
  slot_end: string | null;
  slot_location: string | null;
}

export interface PublicGradingListRow {
  source: 'registration' | 'submission';
  submission_id: string | null;
  slot_id: string | null;
  branch_id: string | null;
  branch_name: string | null;
  grading_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  slot_title: string | null;
  student_name: string;
  current_belt: string | null;
  target_belt: string | null;
  paid_status: string;
  amount: number | null;
  proof_url: string | null;
}

export interface PendingGradingSubmission {
  id: string;
  reference_number: string;
  student_name: string;
  email: string | null;
  branch_id: string;
  date_of_birth: string | null;
  current_belt: string | null;
  resolved_product_id: string | null;
  resolved_grading_slot_id: string | null;
  amount: number | null;
  payment_method: string;
  proof_url: string | null;
  status: string;
  matched_student_id: string | null;
  matched_invoice_id: string | null;
  notes: string | null;
  created_at: string;
  branch_name?: string | null;
  product_name?: string | null;
  slot_label?: string | null;
}

export interface SubmissionStudentMatch {
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

export const getPendingGradingSubmissions = async (branchId?: string): Promise<PendingGradingSubmission[]> => {
  let q = supabase
    .from('grading_payment_submissions')
    .select('*')
    .eq('status', 'pending_verification')
    .order('created_at', { ascending: false });
  if (branchId) q = q.eq('branch_id', branchId);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data || []) as any[];
  if (rows.length === 0) return [];

  const branchIds = Array.from(new Set(rows.map(r => r.branch_id).filter(Boolean)));
  const productIds = Array.from(new Set(rows.map(r => r.resolved_product_id).filter(Boolean)));
  const slotIds = Array.from(new Set(rows.map(r => r.resolved_grading_slot_id).filter(Boolean)));

  const [branchesRes, productsRes, slotsRes] = await Promise.all([
    branchIds.length
      ? supabase.from('branches').select('id, name').in('id', branchIds)
      : Promise.resolve({ data: [] as any[] }),
    productIds.length
      ? supabase.from('products').select('id, name').in('id', productIds)
      : Promise.resolve({ data: [] as any[] }),
    slotIds.length
      ? supabase.from('grading_slots').select('id, grading_date, start_time, end_time, title, location').in('id', slotIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const branchMap = new Map<string, any>((branchesRes.data || []).map((b: any) => [b.id, b]));
  const productMap = new Map<string, any>((productsRes.data || []).map((p: any) => [p.id, p]));
  const slotMap = new Map<string, any>((slotsRes.data || []).map((s: any) => [s.id, s]));

  return rows.map((r: any) => {
    const slot = r.resolved_grading_slot_id ? slotMap.get(r.resolved_grading_slot_id) : null;
    return {
      ...r,
      student_name: r.student_name,
      branch_name: branchMap.get(r.branch_id)?.name ?? null,
      product_name: r.resolved_product_id ? (productMap.get(r.resolved_product_id)?.name ?? null) : null,
      slot_label: slot
        ? `${slot.grading_date}${slot.start_time ? ' ' + String(slot.start_time).slice(0, 5) : ''}${slot.title ? ' — ' + slot.title : ''}`
        : null,
    };
  });
};

export const getPendingGradingSubmissionsCount = async (branchId?: string): Promise<number> => {
  let q = supabase
    .from('grading_payment_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending_verification');
  if (branchId) q = q.eq('branch_id', branchId);
  const { count, error } = await q;
  if (error) return 0;
  return count || 0;
};

export const findStudentMatches = async (submissionId: string): Promise<SubmissionStudentMatch[]> => {
  const { data, error } = await supabase.rpc('find_grading_submission_student_matches' as any, { p_id: submissionId });
  if (error) throw error;
  return (data || []) as SubmissionStudentMatch[];
};

export const matchGradingSubmission = async (submissionId: string, studentId: string): Promise<void> => {
  const { error } = await supabase.rpc('admin_match_grading_submission' as any, { p_id: submissionId, p_student_id: studentId });
  if (error) throw error;
};

export const importGradingSubmission = async (submissionId: string, verifiedBy: string): Promise<string> => {
  const { data, error } = await supabase.rpc('admin_import_grading_submission' as any, { p_id: submissionId, p_verified_by: verifiedBy });
  if (error) throw error;
  return data as string;
};

export const rejectGradingSubmission = async (submissionId: string, reason: string, reviewedBy: string): Promise<void> => {
  const { error } = await supabase.rpc('admin_reject_grading_submission' as any, { p_id: submissionId, p_reason: reason, p_reviewed_by: reviewedBy });
  if (error) throw error;
};

export const adminUpdateGradingSubmissionSlot = async (id: string, slotId: string) => {
  const { error } = await supabase.rpc('admin_update_grading_submission_slot' as any, {
    p_id: id,
    p_slot_id: slotId,
  });
  if (error) throw error;
};

export const adminDeleteGradingSubmission = async (id: string) => {
  const { error } = await supabase.rpc('admin_delete_grading_submission' as any, { p_id: id });
  if (error) throw error;
};

export interface PublicGradingProduct {
  current_belt: string;
  product_id: string;
  product_name: string;
  base_price: number;
  branch_price: number;
}

export interface SubmitGradingPaymentItem {
  product_id: string;
  amount: number | null;
  current_belt: string;
}

export interface SubmitGradingPaymentInput {
  student_name: string;
  email: string;
  branch_id: string;
  date_of_birth: string; // ISO yyyy-MM-dd
  current_belt: string;
  items: SubmitGradingPaymentItem[];
  resolved_grading_slot_id: string | null;
  payment_method: 'paynow' | 'bank_transfer';
  proof_file: File;
}

export interface PublicGradingSlot {
  id: string;
  branch_id: string;
  branch_name: string;
  branch_address: string | null;
  grading_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  title: string | null;
  stage_product_id?: string | null;
  stage_product_name?: string | null;
  stage_product_branch_price?: number | null;
}

export const getPublicGradingSlots = async (
  branchId: string,
  productIds: string[],
  dob?: string | null,
  currentBelt?: string | null,
): Promise<PublicGradingSlot[]> => {
  if (!branchId) return [];
  const { data, error } = await supabase.rpc('get_public_grading_slots', {
    p_branch_id: branchId,
    p_product_ids: productIds.length > 0 ? productIds : null,
    p_dob: dob ?? null,
    p_current_belt: currentBelt ?? null,
  } as any);
  if (error) throw error;
  return (data || []) as PublicGradingSlot[];
};

export const getPublicBranches = async (): Promise<PublicBranch[]> => {
  const { data, error } = await supabase.rpc('get_public_branches');
  if (error) throw error;
  return (data || []) as PublicBranch[];
};

export const getPublicPaymentOptions = async (
  branchId: string,
  currentBelt: string,
): Promise<PublicPaymentOptions | null> => {
  const { data, error } = await supabase.rpc('get_public_payment_options', {
    p_branch_id: branchId,
    p_current_belt: currentBelt,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as PublicPaymentOptions) ?? null;
};

export const getPublicGradingList = async (params: {
  branch_id?: string | null;
  from?: string | null;
  to?: string | null;
} = {}): Promise<PublicGradingListRow[]> => {
  const { data, error } = await supabase.rpc('get_public_grading_list', {
    p_branch_id: params.branch_id ?? null,
    p_from: params.from ?? null,
    p_to: params.to ?? null,
  });
  if (error) throw error;
  return (data || []) as PublicGradingListRow[];
};

export const getPublicGradingProducts = async (
  branchId: string,
  currentBelts: string[],
  targetBelts?: (string | null)[],
): Promise<PublicGradingProduct[]> => {
  if (!branchId || currentBelts.length === 0) return [];
  const params: Record<string, unknown> = {
    p_branch_id: branchId,
    p_current_belts: currentBelts,
  };
  if (targetBelts && targetBelts.length === currentBelts.length) {
    params.p_target_belts = targetBelts;
  }
  const { data, error } = await supabase.rpc('get_public_grading_products', params as any);
  if (error) throw error;
  return (data || []) as PublicGradingProduct[];
};

export const submitGradingPayment = async (
  input: SubmitGradingPaymentInput,
): Promise<{ reference_numbers: string[]; ids: string[] }> => {
  if (!input.items.length) throw new Error('No items selected');

  // Upload proof first
  const ext = input.proof_file.name.split('.').pop() || 'jpg';
  const ts = Date.now();
  const safeName = input.student_name.replace(/[^a-z0-9]/gi, '_').toUpperCase();
  const path = `public-grading/${input.branch_id}/${ts}_${safeName}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('payment-proofs')
    .upload(path, input.proof_file, { upsert: false, contentType: input.proof_file.type });
  if (uploadError) throw uploadError;

  const { data: signed } = await supabase.storage
    .from('payment-proofs')
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);

  const proofUrl = signed?.signedUrl ?? path;

  const rows = input.items.map((item) => ({
    student_name: input.student_name.trim().toUpperCase(),
    email: input.email.trim().toLowerCase() || null,
    branch_id: input.branch_id,
    date_of_birth: input.date_of_birth,
    current_belt: item.current_belt || input.current_belt || null,
    resolved_product_id: item.product_id,
    resolved_grading_slot_id: input.resolved_grading_slot_id,
    amount: item.amount,
    payment_method: input.payment_method,
    proof_url: proofUrl,
    status: 'pending_verification' as const,
  }));

  const { data, error } = await supabase
    .from('grading_payment_submissions')
    .insert(rows)
    .select('id, reference_number');

  if (error) throw error;
  const inserted = (data || []) as { id: string; reference_number: string }[];
  return {
    reference_numbers: inserted.map(r => r.reference_number),
    ids: inserted.map(r => r.id),
  };
};
