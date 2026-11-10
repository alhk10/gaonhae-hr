import { supabase } from '@/integrations/supabase/client';
import { accessPassword } from '@/services/lessonBookingService';
import type { Readiness } from '@/utils/progressCard';

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn as any, args as any);
  if (error) throw new Error(error.message);
  return data as T;
}

export interface ProgressCardRow {
  term_label: string | null; report_date: string; belt_snapshot: string | null; age_snapshot: number | null;
  ratings: Record<string, string>; grading_readiness: Readiness | null; comments: string | null;
}
export interface ProgressReportRow {
  name: string; dob: string | null; term_label: string | null; report_date: string; belt: string | null; age: number | null;
  ratings: Record<string, string>; grading_readiness: Readiness | null; comments: string | null; paid_date: string | null;
}

export const progressSettings = (branchId: string, enabled?: boolean) =>
  rpc<boolean>('access_progress_settings', { p_password: accessPassword(), p_branch_id: branchId, p_enabled: enabled ?? null });
export const listProgressCards = (branchId: string, termIds: string[]) =>
  rpc<{ student_id: string; term_id: string }[]>('access_progress_card_list', { p_password: accessPassword(), p_branch_id: branchId, p_term_ids: termIds });
export const getProgressCard = (studentId: string, termId: string) =>
  rpc<ProgressCardRow | null>('access_progress_card_get', { p_password: accessPassword(), p_student_id: studentId, p_term_id: termId });
export const saveProgressCard = (studentId: string, termId: string, row: Partial<ProgressCardRow>) =>
  rpc<string>('access_progress_card_upsert', { p_password: accessPassword(), p_student_id: studentId, p_term_id: termId, p_row: row });
export const getProgressReport = (branchId: string, termIds: string[]) =>
  rpc<ProgressReportRow[]>('access_progress_report', { p_password: accessPassword(), p_branch_id: branchId, p_term_ids: termIds });

export interface StudentCard {
  id: string; student_id?: string; term_id: string; term_label: string | null; report_date: string; belt: string | null; age: number | null;
  ratings: Record<string, string>; grading_readiness: Readiness | null; dob: string | null; name: string; viewed_at?: string | null;
}
export const cardsForStudents = (studentIds: string[]) =>
  rpc<{ enabled_branches: string[]; cards: StudentCard[] }>('access_progress_cards_for_students', { p_password: accessPassword(), p_student_ids: studentIds });
export const helloProgressCards = (sessionId: string, studentId: string) =>
  rpc<StudentCard[]>('hello_progress_cards', { p_session_id: sessionId, p_student_id: studentId });
export const helloMarkCardViewed = (sessionId: string, studentId: string, cardId: string) =>
  rpc<void>('hello_mark_progress_card_viewed', { p_session_id: sessionId, p_student_id: studentId, p_card_id: cardId });

export async function downloadStudentCard(c: StudentCard) {
  const { buildProgressReportPdf } = await import('@/utils/progressCardPdf');
  await buildProgressReportPdf([{ name: c.name, dob: c.dob, term_label: c.term_label, report_date: c.report_date, belt: c.belt, age: c.age,
    ratings: c.ratings || {}, grading_readiness: c.grading_readiness, comments: null, paid_date: null }], '', c.term_label || '',
    { cardOnly: true, fileName: `progress-card-${c.name.replace(/\s+/g, '-').toLowerCase()}-${(c.term_label || '').replace(/\s+/g, '-').toLowerCase()}.pdf` });
}
