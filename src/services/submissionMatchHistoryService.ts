/**
 * History of submission → student matches and the corrections staff make.
 *
 * Every link (automatic or manual) is recorded so staff can see how a payment
 * ended up on an account, and every correction is remembered as a rule: the
 * wrong account is never suggested automatically again and the corrected
 * account is preferred next time the same person submits.
 */

import { supabase } from '@/integrations/supabase/client';
import { buildIdentityKey, type MatchSubject } from '@/utils/submissionMatchConfidence';

export type MatchScope = 'grading' | 'competition' | 'seminar' | 'guards' | 'school-fees';

export interface MatchEvent {
  id: string;
  scope: string;
  submission_id: string;
  student_id: string | null;
  previous_student_id: string | null;
  method: string;
  confidence: number | null;
  actor: string | null;
  note: string | null;
  created_at: string;
}

export interface RecordMatchEventInput {
  scope: MatchScope;
  submissionId: string;
  studentId: string | null;
  previousStudentId?: string | null;
  method: 'auto' | 'manual';
  confidence?: number | null;
  actor?: string | null;
  note?: string | null;
}

/** Never let history writing break the actual matching flow. */
export const recordMatchEvent = async (input: RecordMatchEventInput): Promise<void> => {
  try {
    await supabase.from('submission_match_events' as any).insert({
      scope: input.scope,
      submission_id: input.submissionId,
      student_id: input.studentId,
      previous_student_id: input.previousStudentId ?? null,
      method: input.method,
      confidence: input.confidence ?? null,
      actor: input.actor ?? null,
      note: input.note ?? null,
    } as any);
  } catch (e) {
    console.warn('Failed to record match event', e);
  }
};

export interface MatchOverride {
  identity_key: string;
  blocked_student_id: string | null;
  preferred_student_id: string | null;
}

/** Remembered rules for one person (by name + DOB + contact). */
export const getMatchOverrides = async (subject: MatchSubject): Promise<MatchOverride[]> => {
  const key = buildIdentityKey(subject);
  if (!key.replace(/\|/g, '').trim()) return [];
  const { data, error } = await supabase
    .from('submission_match_overrides' as any)
    .select('identity_key, blocked_student_id, preferred_student_id')
    .eq('identity_key', key);
  if (error) {
    console.warn('Failed to load match overrides', error);
    return [];
  }
  return (data || []) as unknown as MatchOverride[];
};

export interface OverrideGuards {
  blockedStudentIds: string[];
  preferredStudentId: string | null;
}

export const getOverrideGuards = async (subject: MatchSubject): Promise<OverrideGuards> => {
  const rows = await getMatchOverrides(subject);
  return {
    blockedStudentIds: rows.map((r) => r.blocked_student_id).filter(Boolean) as string[],
    preferredStudentId: rows.find((r) => r.preferred_student_id)?.preferred_student_id ?? null,
  };
};

/** Remember that this person is not that account (and optionally who they are). */
export const rememberMatchCorrection = async (params: {
  subject: MatchSubject;
  blockedStudentId?: string | null;
  preferredStudentId?: string | null;
  actor?: string | null;
}): Promise<void> => {
  const identity_key = buildIdentityKey(params.subject);
  if (!identity_key.replace(/\|/g, '').trim()) return;
  try {
    await supabase.from('submission_match_overrides' as any).insert({
      identity_key,
      blocked_student_id: params.blockedStudentId ?? null,
      preferred_student_id: params.preferredStudentId ?? null,
      actor: params.actor ?? null,
    } as any);
  } catch (e) {
    console.warn('Failed to remember match correction', e);
  }
};

export const listMatchEvents = async (params: {
  scope?: string;
  autoOnly?: boolean;
  limit?: number;
} = {}): Promise<MatchEvent[]> => {
  let query = supabase
    .from('submission_match_events' as any)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(params.limit ?? 200);
  if (params.scope) query = query.eq('scope', params.scope);
  if (params.autoOnly) query = query.eq('method', 'auto');
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as MatchEvent[];
};
