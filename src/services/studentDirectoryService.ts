/**
 * Public student directory service for the /access Students tab.
 * Backed by SECURITY DEFINER RPCs (students/invoices are RLS-protected).
 */
import { supabase } from '@/integrations/supabase/client';

export interface PublicStudentDirectoryRow {
  id: string;
  student_number: string | null;
  name: string;
  first_name: string | null;
  last_name: string | null;
  current_belt: string | null;
  branch_id: string | null;
  branch_name: string | null;
  status: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  term_name: string | null;
  class_type: string | null;
  tier_name: string | null;
  enrolled_weekdays: string[] | null;
  invoice_status: string | null;
  invoice_total: number | null;
  invoice_balance: number | null;
  credit_balance: number;
}

export async function getPublicStudentDirectory(opts: {
  search?: string;
  branchId?: string;
  status?: string;
}): Promise<PublicStudentDirectoryRow[]> {
  const { data, error } = await supabase.rpc('get_public_student_directory', {
    p_search: opts.search?.trim() || null,
    p_branch_id: opts.branchId || null,
    p_status: opts.status || null,
  });
  if (error) throw error;
  return (data || []) as PublicStudentDirectoryRow[];
}

export async function adminUpdateStudentBasic(
  studentId: string,
  updates: { belt?: string | null; branchId?: string | null; status?: string | null },
  actor: string,
): Promise<void> {
  const { error } = await supabase.rpc('admin_update_student_basic', {
    p_student_id: studentId,
    p_belt: updates.belt ?? null,
    p_branch_id: updates.branchId ?? null,
    p_status: updates.status ?? null,
    p_actor: actor,
  });
  if (error) throw error;
}
