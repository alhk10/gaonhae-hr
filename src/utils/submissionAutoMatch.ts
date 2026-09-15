/**
 * Shared "scan and auto-link" behaviour for public submission approvals
 * (grading, competitions, events/seminars and uniforms & guards).
 *
 * For every outstanding row that is not yet linked to a student we fetch the
 * suggestion list and link the top suggestion when it clears the shared
 * confidence rule (>= AUTO_MATCH_THRESHOLD and clearly ahead of the runner-up).
 */

import { pickAutoMatch, MAX_MATCH_SCORE, type MatchSubject, candidateStudentId } from './submissionMatchConfidence';
import { getOverrideGuards, recordMatchEvent, type MatchScope } from '@/services/submissionMatchHistoryService';

/** Rows already attempted this session, keyed by surface, so we never loop. */
const attempted = new Map<string, Set<string>>();

const scopeSet = (scope: string): Set<string> => {
  let s = attempted.get(scope);
  if (!s) {
    s = new Set<string>();
    attempted.set(scope, s);
  }
  return s;
};

export const clearAutoMatchAttempts = (scope: string): void => {
  attempted.delete(scope);
};

export interface AutoMatchSweepOptions<T, M extends { score: number | string | null }> {
  /** Unique id of the row. */
  getId: (row: T) => string;
  /** True when the row still needs a student. */
  needsMatch: (row: T) => boolean;
  /** Suggestion list for the row. */
  fetchMatches: (row: T) => Promise<M[]>;
  /** Links the row to the chosen student. */
  match: (row: T, candidate: M) => Promise<unknown>;
  /** Links the row to a remembered student that the search did not surface. */
  matchStudent?: (row: T, studentId: string) => Promise<unknown>;
  /** Maximum score of the scorer behind `fetchMatches`. */
  maxScore?: number;
  /** Submitted details, used for the contradiction guard and remembered rules. */
  getSubject?: (row: T) => MatchSubject;
  /** Scope recorded in the match history. */
  historyScope?: MatchScope;
  /** Who is running the sweep. */
  actor?: string | null;
}

export interface AutoMatchSweepResult {
  matchedIds: string[];
  errors: Record<string, string>;
}

/**
 * Link every outstanding row whose best suggestion is confident enough and
 * does not contradict the submitted details. Rows are processed sequentially
 * and each is attempted at most once per session (per scope) so re-renders
 * never re-fire the same work.
 */
export const runAutoMatchSweep = async <T, M extends { score: number | string | null }>(
  scope: string,
  rows: T[],
  opts: AutoMatchSweepOptions<T, M>,
): Promise<AutoMatchSweepResult> => {
  const seen = scopeSet(scope);
  const result: AutoMatchSweepResult = { matchedIds: [], errors: {} };

  for (const row of rows) {
    const id = opts.getId(row);
    if (!id || seen.has(id) || !opts.needsMatch(row)) continue;
    seen.add(id);
    try {
      const matches = await opts.fetchMatches(row);
      const subject = opts.getSubject?.(row) ?? null;
      const guards = subject
        ? await getOverrideGuards(subject)
        : { blockedStudentIds: [], preferredStudentId: null, preferredIsStrong: false };
      const auto = pickAutoMatch(matches, {
        maxScore: opts.maxScore ?? MAX_MATCH_SCORE,
        subject,
        blockedStudentIds: guards.blockedStudentIds,
        preferredStudentId: guards.preferredStudentId,
        preferredIsWeak: !guards.preferredIsStrong,
      });
      if (!auto) {
        // Staff already told us who this is — link straight to that account
        // even when the search did not surface it. Only when the person was
        // recognised by their own name and birth date: a shared family email or
        // mobile could belong to a sibling, so those are left for staff.
        const remembered = guards.preferredIsStrong ? guards.preferredStudentId : null;
        const inList = remembered
          ? matches.some((m) => candidateStudentId(m as any) === remembered)
          : false;
        if (remembered && !inList && opts.matchStudent) {
          await opts.matchStudent(row, remembered);
          result.matchedIds.push(id);
          if (opts.historyScope) {
            await recordMatchEvent({
              scope: opts.historyScope,
              submissionId: id,
              studentId: remembered,
              method: 'auto',
              actor: opts.actor ?? 'system',
              note: 'remembered from a previous manual match',
            });
          }
        }
        continue;
      }
      await opts.match(row, auto.match);
      result.matchedIds.push(id);
      if (opts.historyScope) {
        await recordMatchEvent({
          scope: opts.historyScope,
          submissionId: id,
          studentId: candidateStudentId(auto.match as any) || null,
          method: 'auto',
          confidence: auto.confidence,
          actor: opts.actor ?? 'system',
        });
      }
    } catch (e: any) {
      result.errors[id] = e?.message || String(e);
    }
  }

  return result;
};
