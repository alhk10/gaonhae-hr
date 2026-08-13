/**
 * Service for the public grading payment module.
 * Used by the public /pay and /access pages (no auth required).
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
  registration_id: string | null;
  slot_id: string | null;
  branch_id: string | null;
  branch_name: string | null;
  branch_country: string | null;
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
  result: string | null;
  remark: string | null;
  student_id: string | null;
  certificate_name: string | null;
  first_name: string | null;
  last_name: string | null;
  student_current_belt: string | null;
}

export const adminUpdateGradingResult = async (
  registrationId: string,
  result: string | null,
): Promise<void> => {
  const { error } = await supabase.rpc('admin_update_grading_result', {
    p_registration_id: registrationId,
    p_result: result,
  });
  if (error) throw error;
};

export const adminUpdateGradingRegistrationSlot = async (
  registrationId: string,
  slotId: string | null,
): Promise<void> => {
  const { error } = await supabase.rpc('admin_update_grading_registration_slot' as any, {
    p_registration_id: registrationId,
    p_slot_id: slotId,
  });
  if (error) throw error;
};

export const adminUpdateGradingRegistrationBranch = async (
  registrationId: string,
  branchId: string | null,
): Promise<void> => {
  const { error } = await supabase.rpc('admin_update_grading_registration_branch' as any, {
    p_registration_id: registrationId,
    p_branch_id: branchId,
  });
  if (error) throw error;
};

export const adminUpdateGradingRegistrationDisplayName = async (
  registrationId: string,
  displayName: string,
): Promise<void> => {
  const { error } = await supabase.rpc('admin_update_grading_registration_display_name' as any, {
    p_registration_id: registrationId,
    p_display_name: displayName,
  });
  if (error) throw error;
};

export const adminUpdateStudentCertificateName = async (
  studentId: string,
  certificateName: string,
): Promise<void> => {
  const { error } = await supabase.rpc('admin_update_student_certificate_name' as any, {
    p_student_id: studentId,
    p_certificate_name: certificateName,
  });
  if (error) throw error;
};


export interface PendingGradingSubmission {
  id: string;
  reference_number: string;
  first_name: string;
  last_name: string;
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
    .in('status', ['pending_verification', 'verified'])
    .is('matched_invoice_id', null)
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
    const composed = `${(r.first_name || '').trim()} ${(r.last_name || '').trim()}`.trim();
    return {
      ...r,
      first_name: r.first_name,
      last_name: r.last_name,
      student_name: composed,
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
    .in('status', ['pending_verification', 'verified'])
    .is('matched_invoice_id', null);
  if (branchId) q = q.eq('branch_id', branchId);
  const { count, error } = await q;
  if (error) return 0;
  return count || 0;
};

export const verifyGradingSubmission = async (submissionId: string, verifiedBy: string): Promise<void> => {
  const { error } = await supabase.rpc('admin_verify_grading_submission' as any, { p_id: submissionId, p_verified_by: verifiedBy });
  if (error) throw error;
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

export const adminUpdateGradingSubmissionBranch = async (id: string, branchId: string | null) => {
  const { error } = await supabase.rpc('admin_update_grading_submission_branch' as any, {
    p_submission_id: id,
    p_branch_id: branchId,
  });
  if (error) throw error;
};

export const adminUpdateGradingSubmissionDisplayName = async (id: string, displayName: string) => {
  const { error } = await supabase.rpc('admin_update_grading_submission_display_name' as any, {
    p_submission_id: id,
    p_display_name: displayName,
  });
  if (error) throw error;
};

export const adminUpdateGradingSubmissionResult = async (id: string, result: string | null) => {
  const { error } = await supabase.rpc('admin_update_grading_submission_result' as any, {
    p_submission_id: id,
    p_result: result,
  });
  if (error) throw error;
};

export const adminUpdateGradingRemark = async (
  registrationId: string,
  remark: string | null,
): Promise<void> => {
  const { error } = await supabase.rpc('admin_update_grading_remark' as any, {
    p_registration_id: registrationId,
    p_remark: remark,
  });
  if (error) throw error;
};

export const adminUpdateGradingSubmissionRemark = async (
  id: string,
  remark: string | null,
): Promise<void> => {
  const { error } = await supabase.rpc('admin_update_grading_submission_remark' as any, {
    p_submission_id: id,
    p_remark: remark,
  });
  if (error) throw error;
};

export const adminDeleteGradingSubmission = async (id: string) => {
  const { error } = await supabase.rpc('admin_delete_grading_submission' as any, { p_id: id });
  if (error) throw error;
};

export const adminDeleteGradingRegistration = async (id: string) => {
  const { error } = await supabase.rpc('admin_delete_grading_registration' as any, { p_id: id });
  if (error) throw error;
};

export interface DeleteRowContext {
  student_matched: boolean;
  student_name: string | null;
  invoice_number: string | null;
}

export const getGradingRowDeleteContext = async (
  source: 'registration' | 'submission',
  id: string,
): Promise<DeleteRowContext> => {
  const { data, error } = await supabase.rpc('admin_grading_row_delete_context' as any, {
    p_source: source,
    p_id: id,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    student_matched: !!row?.student_matched,
    student_name: row?.student_name ?? null,
    invoice_number: row?.invoice_number ?? null,
  };
};

/** Allow superadmin to edit captured submission contact details before matching. */
export const updateGradingSubmissionDetails = async (
  id: string,
  patch: {
    first_name?: string;
    last_name?: string;
    email?: string | null;
    date_of_birth?: string | null;
    current_belt?: string | null;
    branch_id?: string;
  },
): Promise<void> => {
  const clean: any = { ...patch };
  if (typeof clean.first_name === 'string') clean.first_name = clean.first_name.trim().toUpperCase();
  if (typeof clean.last_name === 'string') clean.last_name = clean.last_name.trim().toUpperCase();
  if (typeof clean.email === 'string') clean.email = clean.email.trim().toLowerCase() || null;
  if (clean.current_belt === '') clean.current_belt = null;
  const { error } = await supabase
    .from('grading_payment_submissions')
    .update(clean)
    .eq('id', id);
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
  first_name: string;
  last_name: string;
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

export interface PublicGradingSlotByDate {
  id: string;
  branch_id: string;
  branch_name: string;
  grading_date: string;
  start_time: string | null;
  end_time: string | null;
  title: string | null;
}

export const getPublicGradingSlotsByDate = async (
  date: string,
): Promise<PublicGradingSlotByDate[]> => {
  if (!date) return [];
  const { data, error } = await supabase.rpc('get_public_grading_slots_by_date' as any, {
    p_date: date,
  });
  if (error) throw error;
  return (data || []) as PublicGradingSlotByDate[];
};

export const getPublicBranches = async (): Promise<PublicBranch[]> => {
  const { data, error } = await supabase.rpc('get_public_branches');
  if (error) throw error;
  return (data || []) as PublicBranch[];
};

export interface StudentCountByMonth {
  branch_name: string;
  month: number;
  student_count: number;
}

export const getPublicStudentCountsByMonth = async (
  year: number,
): Promise<StudentCountByMonth[]> => {
  const { data, error } = await (supabase as any).rpc('get_public_student_counts_by_month', {
    p_year: year,
  });
  if (error) throw error;
  return ((data || []) as any[]).map((r) => ({
    branch_name: r.branch_name || '—',
    month: Number(r.month),
    student_count: Number(r.student_count || 0),
  }));
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

export interface PublicGradingDate {
  grading_date: string;
  entries: number;
}

/** All grading dates on record (past + future), newest first. */
export const getPublicGradingDates = async (): Promise<PublicGradingDate[]> => {
  const { data, error } = await supabase.rpc('get_public_grading_dates' as any);
  if (error) throw error;
  return ((data || []) as any[]).map((r) => ({
    grading_date: r.grading_date,
    entries: Number(r.entries ?? 0),
  }));
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
  const fn = (input.first_name || '').trim().toUpperCase();
  const ln = (input.last_name || '').trim().toUpperCase();
  const safeName = `${fn}_${ln}`.replace(/[^a-z0-9_]/gi, '_');
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
    first_name: fn,
    last_name: ln,
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

  const { data, error } = await supabase.rpc('submit_grading_payments', {
    _rows: rows as any,
  });

  if (error) throw error;
  const inserted = (data || []) as { id: string; reference_number: string }[];
  return {
    reference_numbers: inserted.map(r => r.reference_number),
    ids: inserted.map(r => r.id),
  };
};

/**
 * Replace the proof file on a grading payment submission row.
 */
export const adminReplaceGradingSubmissionProof = async (
  id: string,
  file: File,
  branchId: string,
): Promise<string> => {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `public-grading/${branchId}/edit_${Date.now()}_proof.${ext}`;
  const { error: upErr } = await supabase.storage
    .from('payment-proofs')
    .upload(path, file, { upsert: false, contentType: file.type });
  if (upErr) throw new Error(`Proof upload failed: ${upErr.message}`);
  const { data: signed } = await supabase.storage
    .from('payment-proofs')
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  const url = signed?.signedUrl ?? path;
  const { error: updErr } = await supabase
    .from('grading_payment_submissions')
    .update({ proof_url: url })
    .eq('id', id);
  if (updErr) throw updErr;
  return url;
};

/* ---------------------------------------------------------------------------
 * Grading events (grading_slots) admin management from /access
 * ------------------------------------------------------------------------- */

export interface AdminGradingSlot {
  id: string;
  branch_id: string | null;
  branch_name: string | null;
  grading_date: string;
  start_time: string | null;
  end_time: string | null;
  title: string | null;
  location: string | null;
  belt_levels: string[] | null;
  grading_product_ids: string[] | null;
  min_age: number | null;
  max_age: number | null;
  available_branch_ids: string[] | null;
  registration_count: number;
}

export const adminListGradingSlots = async (): Promise<AdminGradingSlot[]> => {
  const { data, error } = await (supabase as any).rpc('admin_list_grading_slots');
  if (error) throw error;
  return ((data || []) as any[]).map((r) => ({
    ...r,
    registration_count: Number(r.registration_count ?? 0),
  })) as AdminGradingSlot[];
};

export interface AdminGradingProduct {
  id: string;
  name: string;
}

export const adminListGradingProducts = async (): Promise<AdminGradingProduct[]> => {
  const { data, error } = await (supabase as any).rpc('admin_list_grading_products');
  if (error) throw error;
  return (data || []) as AdminGradingProduct[];
};

export interface AdminUpsertGradingSlotInput {
  id?: string | null;
  branch_id: string;
  grading_date: string;
  start_time?: string | null;
  end_time?: string | null;
  title?: string | null;
  location?: string | null;
  belt_levels?: string[] | null;
  grading_product_ids?: string[] | null;
  min_age?: number | null;
  max_age?: number | null;
  available_branch_ids?: string[] | null;
}

export const adminUpsertGradingSlot = async (
  input: AdminUpsertGradingSlotInput,
): Promise<string> => {
  const { data, error } = await (supabase as any).rpc('admin_upsert_grading_slot', {
    p_id: input.id ?? null,
    p_branch_id: input.branch_id,
    p_grading_date: input.grading_date,
    p_start_time: input.start_time || null,
    p_end_time: input.end_time || null,
    p_title: input.title || null,
    p_location: input.location || null,
    p_belt_levels: input.belt_levels?.length ? input.belt_levels : null,
    p_grading_product_ids: input.grading_product_ids?.length ? input.grading_product_ids : null,
    p_min_age: input.min_age ?? null,
    p_max_age: input.max_age ?? null,
    p_available_branch_ids: input.available_branch_ids?.length ? input.available_branch_ids : null,
  });
  if (error) throw error;
  return data as string;
};

export const adminDeleteGradingSlot = async (id: string): Promise<void> => {
  const { error } = await (supabase as any).rpc('admin_delete_grading_slot', { p_id: id });
  if (error) throw error;
};

