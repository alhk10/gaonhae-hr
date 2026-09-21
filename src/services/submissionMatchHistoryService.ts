/**
 * History of submission → student matches and the corrections staff make.
 *
 * Every link (automatic or manual) is recorded so staff can see how a payment
 * ended up on an account, and every correction is remembered as a rule: the
 * wrong account is never suggested automatically again and the corrected
 * account is preferred next time the same person submits.
 */

import { supabase } from '@/integrations/supabase/client';
import { buildIdentityKeys, isStrongIdentityKey, type MatchSubject } from '@/utils/submissionMatchConfidence';

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

export interface MatchEventDetail {
  reference: string | null;
  submitted_name: string | null;
  date_of_birth: string | null;
  email: string | null;
  phone: string | null;
  branch_id: string | null;
  branch_name: string | null;
  amount: number | null;
  payment_method: string | null;
  status: string | null;
  current_student_id: string | null;
  invoice_id: string | null;
  invoice_number: string | null;
  submitted_at: string | null;
  can_correct: boolean;
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

/** Remembered rules for one person, looked up by every key they can be known by. */
export const getMatchOverrides = async (subject: MatchSubject): Promise<MatchOverride[]> => {
  const keys = buildIdentityKeys(subject);
  if (!keys.length) return [];
  const { data, error } = await supabase
    .from('submission_match_overrides' as any)
    .select('identity_key, blocked_student_id, preferred_student_id')
    .in('identity_key', keys);
  if (error) {
    console.warn('Failed to load match overrides', error);
    return [];
  }
  return (data || []) as unknown as MatchOverride[];
};

export interface OverrideGuards {
  blockedStudentIds: string[];
  preferredStudentId: string | null;
  /** True only when recalled by full details / name + birth date, not a shared email or mobile. */
  preferredIsStrong: boolean;
}


export const getOverrideGuards = async (subject: MatchSubject): Promise<OverrideGuards> => {
  const keys = buildIdentityKeys(subject);
  const rows = await getMatchOverrides(subject);
  const blockedStudentIds = Array.from(
    new Set(rows.map((r) => r.blocked_student_id).filter(Boolean) as string[]),
  );
  // Strongest key wins: full details, then name + birth date, then email, then mobile.
  let preferredStudentId: string | null = null;
  let preferredIsStrong = false;
  for (const key of keys) {
    const hit = rows.find((r) => r.identity_key === key && r.preferred_student_id);
    if (hit) {
      preferredStudentId = hit.preferred_student_id;
      preferredIsStrong = isStrongIdentityKey(key);
      break;
    }
  }
  return {
    blockedStudentIds: blockedStudentIds.filter((id) => id !== preferredStudentId),
    preferredStudentId,
    preferredIsStrong,
  };
};

/**
 * Remember a staff decision: who this person is, and (when they overruled a
 * suggestion) which account they are not. Stored against every key the person
 * can be recognised by, so a later submission with only one detail in common
 * still resolves.
 */
export const rememberMatch = async (params: {
  subject: MatchSubject;
  preferredStudentId?: string | null;
  blockedStudentId?: string | null;
  actor?: string | null;
}): Promise<void> => {
  const keys = buildIdentityKeys(params.subject);
  if (!keys.length) return;

  for (const identity_key of keys) {
    const rows: Array<{ blocked: string | null; preferred: string | null }> = [];
    if (params.preferredStudentId) rows.push({ blocked: null, preferred: params.preferredStudentId });
    if (params.blockedStudentId && params.blockedStudentId !== params.preferredStudentId) {
      rows.push({ blocked: params.blockedStudentId, preferred: params.preferredStudentId ?? null });
    }

    for (const row of rows) {
      try {
        const { error } = await supabase.from('submission_match_overrides' as any).insert({
          identity_key,
          blocked_student_id: row.blocked,
          preferred_student_id: row.preferred,
          actor: params.actor ?? null,
        } as any);
        if (error) {
          // Already remembered under this key — refresh the preferred account.
          let update = supabase
            .from('submission_match_overrides' as any)
            .update({ preferred_student_id: row.preferred, actor: params.actor ?? null, updated_at: new Date().toISOString() } as any)
            .eq('identity_key', identity_key);
          update = row.blocked
            ? update.eq('blocked_student_id', row.blocked)
            : update.is('blocked_student_id', null);
          await update;
        }
      } catch (e) {
        console.warn('Failed to remember match', e);
      }
    }
  }
};

/** Back-compat wrapper for the correction-only call sites. */
export const rememberMatchCorrection = rememberMatch;

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

export const getMatchEventDetail = async (eventId: string): Promise<MatchEventDetail> => {
  const { data, error } = await supabase.rpc('get_submission_match_event_detail' as any, {
    p_event_id: eventId,
  });
  if (error) throw error;
  return data as unknown as MatchEventDetail;
};

export const correctSubmissionMatch = async (params: {
  eventId: string;
  newStudentId?: string | null;
  actor?: string | null;
}): Promise<void> => {
  const { error } = await supabase.rpc('admin_correct_submission_match' as any, {
    p_event_id: params.eventId,
    p_new_student_id: params.newStudentId ?? null,
    p_actor: params.actor ?? 'superadmin',
  });
  if (error) throw error;
};
