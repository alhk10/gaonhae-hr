import { supabase } from '@/integrations/supabase/client';
import { accessPassword } from '@/services/lessonBookingService';

export type StudentBranchLink = { student_id: string; branch_id: string };

/** Extra branches (besides the home branch) each student attends. */
export async function listStudentBranches(studentIds?: string[]): Promise<StudentBranchLink[]> {
  let q = (supabase as any).from('student_branches').select('student_id, branch_id');
  if (studentIds?.length) q = q.in('student_id', studentIds);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as StudentBranchLink[];
}

/** Superadmin or the all-branch password only (checked in the database). */
export async function setStudentBranch(studentId: string, branchId: string, on: boolean) {
  const { error } = await (supabase as any).rpc('access_student_branch_set', {
    p_password: accessPassword(), p_student_id: studentId, p_branch_id: branchId, p_on: on,
  });
  if (error) throw error;
}
