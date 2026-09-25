/**
 * Duplicate detection for the public payment forms.
 *
 * Before a form saves, it asks the database whether the same person already
 * sent the same amount for the same branch within the last 24 hours. If so the
 * form offers to update that earlier submission instead of creating a second
 * record.
 */
import { supabase } from '@/integrations/supabase/client';

export type PublicSubmissionSource = 'grading' | 'competition' | 'seminar' | 'guards';

export interface DuplicateSubmissionHit {
  record_id: string;
  reference_number: string | null;
  status: string | null;
  amount: number | null;
  created_at: string;
  editable: boolean;
}

const db = supabase as any;

export const checkPublicSubmissionDuplicate = async (args: {
  source: PublicSubmissionSource;
  branchId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  amount: number;
}): Promise<DuplicateSubmissionHit | null> => {
  try {
    const { data, error } = await db.rpc('check_public_submission_duplicate', {
      p_source: args.source,
      p_branch_id: args.branchId,
      p_email: args.email,
      p_first_name: args.firstName,
      p_last_name: args.lastName,
      p_amount: args.amount,
    });
    if (error) return null; // never block a payment because the check failed
    const row = Array.isArray(data) ? data[0] : data;
    return (row as DuplicateSubmissionHit) || null;
  } catch {
    return null;
  }
};

/** Upload a replacement payment screenshot and return its URL. */
export const uploadReplacementProof = async (
  source: PublicSubmissionSource,
  branchId: string | null,
  file: File,
): Promise<string> => {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `public-${source}/${branchId || 'unknown'}/${Date.now()}_update.${ext}`;
  const { error } = await supabase.storage
    .from('payment-proofs')
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  const { data: signed } = await supabase.storage
    .from('payment-proofs')
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  return signed?.signedUrl ?? path;
};

export const updatePublicSubmission = async (args: {
  source: PublicSubmissionSource;
  recordId: string;
  branchId?: string | null;
  amount?: number | null;
  proofFile?: File | null;
  email?: string | null;
  phone?: string | null;
}): Promise<void> => {
  let proofUrl: string | null = null;
  if (args.proofFile) {
    proofUrl = await uploadReplacementProof(args.source, args.branchId ?? null, args.proofFile);
  }
  const { error } = await db.rpc('update_public_submission', {
    p_source: args.source,
    p_record_id: args.recordId,
    p_amount: args.amount ?? null,
    p_proof_url: proofUrl,
    p_email: args.email ?? null,
    p_phone: args.phone ?? null,
  });
  if (error) throw new Error(error.message);
};

/**
 * Verified submissions can't be edited directly — the parent asks for a
 * correction instead, and a superadmin approves it from the dashboard.
 */
export const submitSubmissionEditRequest = async (args: {
  source: PublicSubmissionSource | 'school_fees';
  recordId: string;
  studentName?: string | null;
  referenceNumber?: string | null;
  amount?: number | null;
  proposedChanges: { amount?: number | null; email?: string | null; phone?: string | null };
  reason?: string | null;
}): Promise<string> => {
  const { data, error } = await db.rpc('submit_submission_edit_request', {
    p_source: args.source,
    p_record_id: args.recordId,
    p_student_name: args.studentName ?? null,
    p_reference_number: args.referenceNumber ?? null,
    p_amount: args.amount ?? null,
    p_proposed_changes: args.proposedChanges,
    p_reason: args.reason ?? null,
    p_requested_by: 'public_form',
  });
  if (error) throw new Error(error.message);
  return data as string;
};

export interface SubmissionEditRequest {
  id: string;
  source: string;
  record_id: string;
  student_name: string | null;
  reference_number: string | null;
  amount: number | null;
  proposed_changes: { amount?: number | null; email?: string | null; phone?: string | null };
  reason: string | null;
  requested_by: string | null;
  created_at: string;
}

/** Superadmin: list pending correction requests. */
export const getPendingSubmissionEditRequests = async (): Promise<SubmissionEditRequest[]> => {
  const { data, error } = await db
    .from('submission_edit_requests')
    .select('id, source, record_id, student_name, reference_number, amount, proposed_changes, reason, requested_by, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SubmissionEditRequest[];
};

/** Superadmin: approve — applies the proposed changes to the record. */
export const approveSubmissionEditRequest = async (id: string): Promise<void> => {
  const { error } = await db.rpc('approve_submission_edit_request', { p_id: id });
  if (error) throw new Error(error.message);
};

/** Superadmin: reject a correction request. */
export const rejectSubmissionEditRequest = async (id: string): Promise<void> => {
  const { error } = await db.rpc('reject_submission_edit_request', { p_id: id, p_note: null });
  if (error) throw new Error(error.message);
};
