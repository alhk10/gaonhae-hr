/**
 * Deletion requests for public transaction lists (/access).
 *
 * Staff without a signed-in superadmin session can only *request* a deletion.
 * Superadmins approve or reject the request from the superadmin dashboard,
 * which then runs the same admin delete function that would have run directly.
 */
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export type SubmissionDeleteSource =
  | 'school_fees'
  | 'grading'
  | 'grading_registration'
  | 'competition'
  | 'seminar'
  | 'guards';

export interface SubmissionDeletionRequest {
  id: string;
  source: SubmissionDeleteSource;
  record_id: string;
  student_name: string | null;
  reference_number: string | null;
  amount: number | null;
  invoice_id: string | null;
  reason: string | null;
  requested_by: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
}

export interface SubmissionFlag {
  source: SubmissionDeleteSource;
  record_id: string;
  delete_request_status: string | null;
  duplicate_of_reference: string | null;
}

const db = supabase as any;

export const SOURCE_LABELS: Record<SubmissionDeleteSource, string> = {
  school_fees: 'School fees',
  grading: 'Grading',
  grading_registration: 'Grading registration',
  competition: 'Competition',
  seminar: 'Seminar',
  guards: 'Uniforms & guards',
};

export const submitSubmissionDeletionRequest = async (args: {
  source: SubmissionDeleteSource;
  recordId: string;
  studentName?: string | null;
  referenceNumber?: string | null;
  amount?: number | null;
  invoiceId?: string | null;
  reason: string;
  requestedBy?: string | null;
}): Promise<string> => {
  const { data, error } = await db.rpc('submit_submission_deletion_request', {
    p_source: args.source,
    p_record_id: args.recordId,
    p_student_name: args.studentName ?? null,
    p_reference_number: args.referenceNumber ?? null,
    p_amount: args.amount ?? null,
    p_invoice_id: args.invoiceId ?? null,
    p_reason: args.reason,
    p_requested_by: args.requestedBy ?? null,
  });
  if (error) throw new Error(error.message);
  return data as string;
};

export const getSubmissionFlags = async (
  source?: SubmissionDeleteSource,
): Promise<SubmissionFlag[]> => {
  const { data, error } = await db.rpc('get_public_submission_flags', {
    p_source: source ?? null,
  });
  if (error) {
    logger.error('Failed to load submission flags', error);
    return [];
  }
  return (data || []) as SubmissionFlag[];
};

/** Convenience: flags keyed by record id for a single source. */
export const getSubmissionFlagMap = async (
  source: SubmissionDeleteSource,
): Promise<Record<string, SubmissionFlag>> => {
  const rows = await getSubmissionFlags(source);
  const map: Record<string, SubmissionFlag> = {};
  for (const r of rows) map[r.record_id] = r;
  return map;
};

export const getPendingSubmissionDeletionRequests = async (): Promise<SubmissionDeletionRequest[]> => {
  const { data, error } = await db
    .from('submission_deletion_requests')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as SubmissionDeletionRequest[];
};

export const getPendingSubmissionDeletionRequestsCount = async (): Promise<number> => {
  const { count, error } = await db
    .from('submission_deletion_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');
  if (error) return 0;
  return count || 0;
};

export const approveSubmissionDeletionRequest = async (id: string): Promise<void> => {
  const { error } = await db.rpc('approve_submission_deletion_request', { p_id: id });
  if (error) throw new Error(error.message);
};

export const rejectSubmissionDeletionRequest = async (id: string, note?: string): Promise<void> => {
  const { error } = await db.rpc('reject_submission_deletion_request', {
    p_id: id,
    p_note: note ?? null,
  });
  if (error) throw new Error(error.message);
};
