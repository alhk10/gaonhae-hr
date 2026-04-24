/**
 * Grading scorecard column service
 *
 * Manages the per-term + per-branch flexible scorecard column set stored in
 * `grading_term_scorecard_columns`. Adding or removing a column also keeps
 * each student's `grading_registrations.scorecard` JSON in sync so cells
 * line up with headers.
 */

import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_SCORECARD_LABELS, ScorecardRow } from '@/constants/scorecardLabels';

export interface ScorecardColumn {
  id: string;
  term_id: string;
  branch_id: string;
  label: string;
  position: number;
}

const KEY = ['grading-scorecard-columns'] as const;
export const scorecardColumnsKey = (termId: string, branchId: string) =>
  [...KEY, termId, branchId] as const;

const seedDefaults = async (termId: string, branchId: string): Promise<ScorecardColumn[]> => {
  const rows = DEFAULT_SCORECARD_LABELS.map((label, idx) => ({
    term_id: termId,
    branch_id: branchId,
    label,
    position: idx,
  }));
  const { data, error } = await supabase
    .from('grading_term_scorecard_columns')
    .insert(rows)
    .select('id, term_id, branch_id, label, position');
  if (error) {
    // Race: another tab seeded; refetch.
    const refetched = await supabase
      .from('grading_term_scorecard_columns')
      .select('id, term_id, branch_id, label, position')
      .eq('term_id', termId)
      .eq('branch_id', branchId)
      .order('position', { ascending: true });
    return (refetched.data as ScorecardColumn[]) || [];
  }
  return (data as ScorecardColumn[]) || [];
};

export const listColumns = async (termId: string, branchId: string): Promise<ScorecardColumn[]> => {
  if (!termId || !branchId) return [];
  const { data, error } = await supabase
    .from('grading_term_scorecard_columns')
    .select('id, term_id, branch_id, label, position')
    .eq('term_id', termId)
    .eq('branch_id', branchId)
    .order('position', { ascending: true });
  if (error) throw error;
  if (!data || data.length === 0) {
    return seedDefaults(termId, branchId);
  }
  return data as ScorecardColumn[];
};

/** Append a new column and add an empty `{label, value:""}` row to every student in the term+branch. */
export const addColumn = async (termId: string, branchId: string, label: string) => {
  const trimmed = label.trim();
  if (!trimmed) throw new Error('Label is required');

  const existing = await listColumns(termId, branchId);
  if (existing.some(c => c.label.toLowerCase() === trimmed.toLowerCase())) {
    throw new Error('A column with that label already exists');
  }
  const nextPos = existing.length > 0 ? Math.max(...existing.map(c => c.position)) + 1 : 0;

  const { error: insErr } = await supabase
    .from('grading_term_scorecard_columns')
    .insert([{ term_id: termId, branch_id: branchId, label: trimmed, position: nextPos }]);
  if (insErr) throw insErr;

  // Sync into existing students' scorecard JSON for this term + branch
  const { data: branchInvoices } = await supabase
    .from('invoices').select('student_id').eq('branch_id', branchId);
  const branchStudentIds = [...new Set((branchInvoices || []).map((i: any) => i.student_id).filter(Boolean))];
  if (branchStudentIds.length === 0) return;

  const { data: regs } = await supabase
    .from('grading_registrations')
    .select('id, scorecard, student_id')
    .eq('term_id', termId)
    .in('student_id', branchStudentIds);

  const updates = (regs || []).map((r: any) => {
    const arr = Array.isArray(r.scorecard) ? r.scorecard : [];
    if (arr.some((row: any) => String(row?.label || '').toLowerCase() === trimmed.toLowerCase())) {
      return null;
    }
    const next = [...arr, { label: trimmed, value: '' }];
    return supabase.from('grading_registrations').update({ scorecard: next as any }).eq('id', r.id);
  }).filter(Boolean);
  if (updates.length > 0) await Promise.all(updates as any);
};

export const removeColumn = async (termId: string, branchId: string, label: string) => {
  const { error } = await supabase
    .from('grading_term_scorecard_columns')
    .delete()
    .eq('term_id', termId)
    .eq('branch_id', branchId)
    .eq('label', label);
  if (error) throw error;

  const { data: branchInvoices } = await supabase
    .from('invoices').select('student_id').eq('branch_id', branchId);
  const branchStudentIds = [...new Set((branchInvoices || []).map((i: any) => i.student_id).filter(Boolean))];
  if (branchStudentIds.length === 0) return;

  const { data: regs } = await supabase
    .from('grading_registrations')
    .select('id, scorecard')
    .eq('term_id', termId)
    .in('student_id', branchStudentIds);

  const updates = (regs || []).map((r: any) => {
    const arr = Array.isArray(r.scorecard) ? r.scorecard : [];
    const next = arr.filter((row: any) => String(row?.label || '').toLowerCase() !== label.toLowerCase());
    if (next.length === arr.length) return null;
    return supabase.from('grading_registrations').update({ scorecard: next as any }).eq('id', r.id);
  }).filter(Boolean);
  if (updates.length > 0) await Promise.all(updates as any);
};

/** Read all scorecards for a list of registration IDs, keyed by id. */
export const fetchScorecardsByRegistrationIds = async (
  registrationIds: string[],
): Promise<Record<string, ScorecardRow[]>> => {
  if (registrationIds.length === 0) return {};
  const { data, error } = await supabase
    .from('grading_registrations')
    .select('id, scorecard')
    .in('id', registrationIds);
  if (error) throw error;
  const out: Record<string, ScorecardRow[]> = {};
  (data || []).forEach((r: any) => {
    const arr = Array.isArray(r.scorecard) ? r.scorecard : [];
    out[r.id] = arr.map((row: any) => ({
      label: String(row?.label ?? ''),
      value: String(row?.value ?? ''),
    }));
  });
  return out;
};
