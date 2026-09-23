/**
 * Pending student approvals shown on the /access Summary tab.
 * Reads/writes go through SECURITY DEFINER RPCs because /access is anonymous.
 */
import { supabase } from '@/integrations/supabase/client';

export type PendingApprovalKind = 'registration' | 'update_request';

export interface PendingStudentApproval {
  kind: PendingApprovalKind;
  id: string;
  student_id: string | null;
  display_name: string | null;
  branch_id: string | null;
  branch_name: string | null;
  submitted_at: string;
  details: Record<string, any>;
  current_values: Record<string, any>;
}

export async function getPendingStudentApprovals(branchId?: string | null): Promise<PendingStudentApproval[]> {
  const { data, error } = await supabase.rpc('get_public_pending_student_approvals' as any, {
    p_branch_id: branchId || null,
  });
  if (error) throw new Error(error.message);
  return ((data as any[]) || []).map((r) => ({
    ...r,
    details: (r.details as Record<string, any>) || {},
    current_values: (r.current_values as Record<string, any>) || {},
  })) as PendingStudentApproval[];
}

export async function approvePendingApproval(row: PendingStudentApproval, actor = 'access'): Promise<void> {
  const fn =
    row.kind === 'registration'
      ? 'approve_public_student_registration'
      : 'approve_public_student_update_request';
  const { error } = await supabase.rpc(fn as any, { p_id: row.id, p_actor: actor });
  if (error) throw new Error(error.message);
}

export async function rejectPendingApproval(
  row: PendingStudentApproval,
  reason?: string,
  actor = 'access',
): Promise<void> {
  const fn =
    row.kind === 'registration'
      ? 'reject_public_student_registration'
      : 'reject_public_student_update_request';
  const { error } = await supabase.rpc(fn as any, {
    p_id: row.id,
    p_reason: reason || null,
    p_actor: actor,
  });
  if (error) throw new Error(error.message);
}
