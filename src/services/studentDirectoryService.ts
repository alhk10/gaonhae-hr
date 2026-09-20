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

export interface CreateStudentInput {
  firstName: string;
  lastName?: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  email?: string | null;
  phone?: string | null;
  branchId: string;
  belt?: string | null;
  status?: string;
}

/** Creates a student straight away. Throws with DUPLICATE_STUDENT when a same
 *  name + birth date record exists and `force` is not set. */
export async function createStudentPublic(
  input: CreateStudentInput,
  actor: string,
  force = false,
): Promise<string> {
  const { data, error } = await (supabase as any).rpc('admin_create_student_public', {
    p_first_name: input.firstName,
    p_last_name: input.lastName || null,
    p_date_of_birth: input.dateOfBirth || null,
    p_gender: input.gender || null,
    p_email: input.email || null,
    p_phone: input.phone || null,
    p_branch_id: input.branchId,
    p_current_belt: input.belt || null,
    p_status: input.status || 'active',
    p_actor: actor,
    p_force: force,
  });
  if (error) throw error;
  return data as string;
}

export interface DuplicateStudentRow {
  group_key: string;
  match_reason: 'name' | 'phone' | 'email' | 'dob_name';
  student_id: string;
  last_activity_at: string;
  student_number: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  current_belt: string | null;
  branch_id: string | null;
  status: string | null;
  invoices_count: number;
  enrollments_count: number;
  attendance_count: number;
  grading_count: number;
}

export interface PublicDuplicateGroup {
  group_key: string;
  match_reason: DuplicateStudentRow['match_reason'];
  students: DuplicateStudentRow[];
}

export async function findDuplicateStudentsPublic(criteria: {
  name: boolean; phone: boolean; email: boolean; dob_name: boolean;
}): Promise<PublicDuplicateGroup[]> {
  const { data, error } = await (supabase as any).rpc('public_find_duplicate_students', {
    p_criteria: criteria,
  });
  if (error) throw error;
  const rows = (data || []) as DuplicateStudentRow[];
  const map = new Map<string, PublicDuplicateGroup>();
  for (const r of rows) {
    if (!map.has(r.group_key)) {
      map.set(r.group_key, { group_key: r.group_key, match_reason: r.match_reason, students: [] });
    }
    const g = map.get(r.group_key)!;
    if (!g.students.some((s) => s.student_id === r.student_id)) g.students.push(r);
  }
  const groups = Array.from(map.values()).filter((g) => g.students.length > 1);
  groups.forEach((g) =>
    g.students.sort((a, b) => (b.last_activity_at || '').localeCompare(a.last_activity_at || '')),
  );
  groups.sort((a, b) => a.match_reason.localeCompare(b.match_reason));
  return groups;
}

export async function requestStudentMerge(
  keepId: string,
  dropIds: string[],
  actor: string,
  snapshot: unknown,
): Promise<string> {
  const { data, error } = await (supabase as any).rpc('public_request_student_merge', {
    p_keep_id: keepId,
    p_drop_ids: dropIds,
    p_actor: actor,
    p_snapshot: snapshot ?? {},
  });
  if (error) throw error;
  return data as string;
}

export async function adminUpdateStudentBasic(
  studentId: string,
  updates: { belt?: string | null; clearBelt?: boolean; branchId?: string | null; status?: string | null },
  actor: string,
): Promise<void> {
  const { error } = await supabase.rpc('admin_update_student_basic', {
    p_student_id: studentId,
    p_belt: updates.belt ?? null,
    p_branch_id: updates.branchId ?? null,
    p_status: updates.status ?? null,
    p_actor: actor,
    p_clear_belt: updates.clearBelt === true,
  });
  if (error) throw error;
}
