/**
 * Student merge requests — raised from the /access Students tab,
 * approved or rejected by a superadmin on the superadmin dashboard.
 */
import { supabase } from '@/integrations/supabase/client';

export interface StudentMergeRequest {
  id: string;
  keep_id: string;
  drop_ids: string[];
  snapshot: any;
  requested_by: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  merge_result: any;
  created_at: string;
}

export async function getPendingStudentMergeRequests(): Promise<StudentMergeRequest[]> {
  const { data, error } = await (supabase as any).rpc('list_pending_student_merge_requests');
  if (error) throw error;
  return (data || []) as StudentMergeRequest[];
}

export async function getPendingStudentMergeRequestsCount(): Promise<number> {
  const rows = await getPendingStudentMergeRequests();
  return rows.length;
}

export async function approveStudentMergeRequest(requestId: string, actor: string) {
  const { data, error } = await (supabase as any).rpc('approve_student_merge_request', {
    p_request_id: requestId,
    p_actor: actor,
  });
  if (error) throw error;
  return (data || {}) as Record<string, number>;
}

export async function rejectStudentMergeRequest(requestId: string, actor: string, reason?: string) {
  const { error } = await (supabase as any).rpc('reject_student_merge_request', {
    p_request_id: requestId,
    p_actor: actor,
    p_reason: reason || null,
  });
  if (error) throw error;
}
