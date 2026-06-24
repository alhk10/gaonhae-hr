import { supabase } from '@/integrations/supabase/client';

export type MatchReason = 'name' | 'phone' | 'email' | 'dob_name';

export interface DuplicateCandidate {
  student_id: string;
  group_key: string;
  match_reason: MatchReason;
  last_activity_at: string;
}

export interface DuplicateStudentDetail {
  id: string;
  student_number: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  current_belt: string | null;
  branch_id: string | null;
  status: string | null;
  updated_at: string;
  created_at: string;
  last_activity_at: string;
  invoices_count: number;
  enrollments_count: number;
  attendance_count: number;
  grading_count: number;
}

export interface DuplicateGroup {
  group_key: string;
  match_reason: MatchReason;
  students: DuplicateStudentDetail[];
}

export interface DuplicateCriteria {
  name: boolean;
  phone: boolean;
  email: boolean;
  dob_name: boolean;
}

export async function findDuplicateStudentGroups(
  criteria: DuplicateCriteria
): Promise<DuplicateGroup[]> {
  const { data, error } = await (supabase as any).rpc('find_duplicate_students', {
    p_criteria: criteria,
  });
  if (error) throw error;

  const rows = (data || []) as Array<{
    group_key: string;
    match_reason: MatchReason;
    student_id: string;
    last_activity_at: string;
  }>;

  // Group rows
  const groupMap = new Map<string, { reason: MatchReason; ids: Set<string>; lastAct: Map<string, string> }>();
  for (const r of rows) {
    if (!groupMap.has(r.group_key)) {
      groupMap.set(r.group_key, { reason: r.match_reason, ids: new Set(), lastAct: new Map() });
    }
    const g = groupMap.get(r.group_key)!;
    g.ids.add(r.student_id);
    g.lastAct.set(r.student_id, r.last_activity_at);
  }

  const allIds = Array.from(new Set(rows.map((r) => r.student_id)));
  if (allIds.length === 0) return [];

  const { data: students, error: sErr } = await supabase
    .from('students')
    .select(
      'id, student_number, first_name, last_name, email, phone, date_of_birth, current_belt, branch_id, status, updated_at, created_at'
    )
    .in('id', allIds);
  if (sErr) throw sErr;

  // Counts in parallel
  const counts = await Promise.all(
    allIds.map(async (id) => {
      const [inv, enr, att, grd] = await Promise.all([
        supabase.from('invoices').select('id', { head: true, count: 'exact' }).eq('student_id', id),
        supabase
          .from('student_class_enrollments')
          .select('id', { head: true, count: 'exact' })
          .eq('student_id', id),
        supabase
          .from('class_attendance')
          .select('id', { head: true, count: 'exact' })
          .eq('student_id', id),
        supabase
          .from('grading_registrations')
          .select('id', { head: true, count: 'exact' })
          .eq('student_id', id),
      ]);
      return {
        id,
        invoices_count: inv.count || 0,
        enrollments_count: enr.count || 0,
        attendance_count: att.count || 0,
        grading_count: grd.count || 0,
      };
    })
  );
  const countById = new Map(counts.map((c) => [c.id, c]));
  const studentById = new Map((students || []).map((s) => [s.id, s]));

  const groups: DuplicateGroup[] = [];
  for (const [gk, g] of groupMap) {
    const arr: DuplicateStudentDetail[] = [];
    for (const id of g.ids) {
      const s = studentById.get(id);
      const c = countById.get(id);
      if (!s) continue;
      arr.push({
        ...(s as any),
        last_activity_at: g.lastAct.get(id) || s.updated_at,
        invoices_count: c?.invoices_count || 0,
        enrollments_count: c?.enrollments_count || 0,
        attendance_count: c?.attendance_count || 0,
        grading_count: c?.grading_count || 0,
      });
    }
    if (arr.length < 2) continue;
    arr.sort((a, b) => (b.last_activity_at || '').localeCompare(a.last_activity_at || ''));
    groups.push({ group_key: gk, match_reason: g.reason, students: arr });
  }

  groups.sort((a, b) => a.match_reason.localeCompare(b.match_reason));
  return groups;
}

export async function mergeStudents(
  keepId: string,
  dropIds: string[]
): Promise<Record<string, number>> {
  const { data, error } = await (supabase as any).rpc('merge_students', {
    p_keep_id: keepId,
    p_drop_ids: dropIds,
  });
  if (error) throw error;
  return (data || {}) as Record<string, number>;
}
