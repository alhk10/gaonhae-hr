/**
 * Service for the public /hello chat callback request approvals.
 * Allows superadmins to review unmatched inline registrations / no-match leads /
 * trial leads and either match to an existing student or create a new one.
 */
import { supabase } from '@/integrations/supabase/client';

export interface PublicChatCallbackRow {
  id: string;
  session_id: string | null;
  branch_id: string | null;
  name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  type: string;
  message: string | null;
  preferred_time: string | null;
  status: string;
  email_sent_at: string | null;
  created_at: string;
  matched_student_id: string | null;
  created_student_id: string | null;
  rejected_at: string | null;
  rejected_reason: string | null;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  current_belt: string | null;
}

export interface ChatCallbackMatchCandidate {
  id: string;
  student_number: string | null;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  branch_id: string | null;
  current_belt: string | null;
  score: number;
}

const norm = (s?: string | null) => (s || '').trim().toUpperCase();

/** List callbacks where no student has been matched and status not rejected. */
export const listUnmatchedChatCallbacks = async (
  branchId?: string,
): Promise<PublicChatCallbackRow[]> => {
  let q = supabase
    .from('public_chat_callback_requests')
    .select('*')
    .is('matched_student_id', null)
    .neq('status', 'rejected')
    .neq('type', 'lesson_schedule_request')
    .order('created_at', { ascending: false });
  if (branchId) q = q.eq('branch_id', branchId);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as any as PublicChatCallbackRow[];
};

export const getUnmatchedChatCallbackCount = async (branchId?: string): Promise<number> => {
  let q = supabase
    .from('public_chat_callback_requests')
    .select('*', { count: 'exact', head: true })
    .is('matched_student_id', null)
    .neq('status', 'rejected')
    .neq('type', 'lesson_schedule_request');
  if (branchId) q = q.eq('branch_id', branchId);
  const { count } = await q;
  return count || 0;
};

const parseSplitName = (full: string | null): { fn: string; ln: string } => {
  const t = (full || '').trim();
  if (!t) return { fn: '', ln: '' };
  const parts = t.split(/\s+/);
  if (parts.length === 1) return { fn: parts[0], ln: '' };
  return { fn: parts[0], ln: parts.slice(1).join(' ') };
};

/** Fuzzy-score candidate students from the captured details. */
export const findChatCallbackStudentMatches = async (
  cb: PublicChatCallbackRow,
): Promise<ChatCallbackMatchCandidate[]> => {
  const fn = norm(cb.first_name || parseSplitName(cb.name).fn);
  const ln = norm(cb.last_name || parseSplitName(cb.name).ln);
  if (!fn && !ln && !cb.contact_email && !cb.contact_phone) return [];
  const orParts: string[] = [];
  if (fn) orParts.push(`first_name.ilike.%${fn}%`);
  if (ln) orParts.push(`last_name.ilike.%${ln}%`);
  if (cb.contact_email) orParts.push(`email.ilike.%${cb.contact_email.trim()}%`);
  const query = supabase
    .from('students')
    .select('id, student_number, first_name, last_name, email, phone, date_of_birth, branch_id, current_belt')
    .limit(50);
  const { data, error } = orParts.length
    ? await query.or(orParts.join(','))
    : await query;
  if (error) throw error;
  const phoneDigits = (cb.contact_phone || '').replace(/\D/g, '');
  const dob = cb.date_of_birth;
  const branchId = cb.branch_id;
  const scored = (data || []).map((s: any) => {
    let score = 0;
    const sfn = norm(s.first_name);
    const sln = norm(s.last_name);
    if (fn && sfn === fn) score += 3;
    else if (fn && (sfn.includes(fn) || fn.includes(sfn))) score += 1;
    if (ln && sln === ln) score += 3;
    else if (ln && (sln.includes(ln) || ln.includes(sln))) score += 1;
    if (dob && s.date_of_birth === dob) score += 4;
    if (branchId && s.branch_id === branchId) score += 1;
    if (cb.contact_email && s.email && norm(s.email) === norm(cb.contact_email)) score += 3;
    if (phoneDigits && s.phone && s.phone.replace(/\D/g, '').includes(phoneDigits)) score += 2;
    return { ...s, score };
  });
  return scored
    .filter((c: any) => c.score > 0)
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 5) as ChatCallbackMatchCandidate[];
};

/** Persist edited contact details on an unmatched callback. */
export const updateChatCallback = async (
  id: string,
  patch: Partial<PublicChatCallbackRow>,
): Promise<void> => {
  const clean: any = { ...patch };
  if (typeof clean.first_name === 'string') clean.first_name = clean.first_name.trim().toUpperCase();
  if (typeof clean.last_name === 'string') clean.last_name = clean.last_name.trim().toUpperCase();
  if (typeof clean.contact_email === 'string') {
    clean.contact_email = clean.contact_email.trim().toLowerCase() || null;
  }
  if (clean.gender === '') clean.gender = null;
  if (clean.current_belt === '') clean.current_belt = null;
  // Keep `name` in sync if first/last provided.
  if (clean.first_name !== undefined || clean.last_name !== undefined) {
    const composed = `${clean.first_name ?? ''} ${clean.last_name ?? ''}`.trim();
    if (composed) clean.name = composed;
  }
  const { error } = await supabase
    .from('public_chat_callback_requests')
    .update(clean)
    .eq('id', id);
  if (error) throw error;
};

/** Link an existing student to the callback and mark matched. */
export const matchChatCallback = async (id: string, studentId: string): Promise<void> => {
  const { error } = await supabase
    .from('public_chat_callback_requests')
    .update({ matched_student_id: studentId, status: 'matched' } as any)
    .eq('id', id);
  if (error) throw error;
};

/** Mark a callback rejected. */
export const rejectChatCallback = async (id: string, reason: string): Promise<void> => {
  const { error } = await supabase
    .from('public_chat_callback_requests')
    .update({
      status: 'rejected',
      rejected_at: new Date().toISOString(),
      rejected_reason: reason || 'Rejected',
    } as any)
    .eq('id', id);
  if (error) throw error;
};

/** Store the id of the newly created student linked to this callback. */
export const linkCreatedStudentToCallback = async (id: string, studentId: string): Promise<void> => {
  const { error } = await supabase
    .from('public_chat_callback_requests')
    .update({
      matched_student_id: studentId,
      created_student_id: studentId,
      status: 'matched',
    } as any)
    .eq('id', id);
  if (error) throw error;
};
