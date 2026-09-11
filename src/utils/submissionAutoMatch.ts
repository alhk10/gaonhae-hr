/**
 * Shared "scan and auto-link" behaviour for public submission approvals
 * (grading, competitions, events/seminars and uniforms & guards).
 *
 * For every outstanding row that is not yet linked to a student we fetch the
 * suggestion list and link the top suggestion when it clears the shared
 * confidence rule (>= AUTO_MATCH_THRESHOLD and clearly ahead of the runner-up).
 */

import { pickAutoMatch, MAX_MATCH_SCORE } from './submissionMatchConfidence';

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
  /** Maximum score of the scorer behind `fetchMatches`. */
  maxScore?: number;
}

export interface AutoMatchSweepResult {
  matchedIds: string[];
  errors: Record<string, string>;
}

/**
 * Link every outstanding row whose best suggestion is confident enough.
 * Rows are processed sequentially and each is attempted at most once per
 * session (per scope) so re-renders never re-fire the same work.
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
      const auto = pickAutoMatch(matches, opts.maxScore ?? MAX_MATCH_SCORE);
      if (!auto) continue;
      await opts.match(row, auto.match);
      result.matchedIds.push(id);
    } catch (e: any) {
      result.errors[id] = e?.message || String(e);
    }
  }

  return result;
};
