/**
 * Shared confidence helpers for submission → student matching.
 *
 * Scores come from different scorers (SQL fuzzy match for grading/competition/
 * seminar, client-side scoring for guards purchases), so each caller passes the
 * maximum possible score for its scorer and we normalise to a 0-100 confidence.
 */

/** Max score of the SQL scorer: email .5 + DOB .3 + branch .1 + name .5 */
export const MAX_MATCH_SCORE = 1.4;

/** Max score of the guards purchase client-side scorer. */
export const MAX_GUARDS_MATCH_SCORE = 14;

/** Auto-link when the best match is at least this confident. */
export const AUTO_MATCH_THRESHOLD = 85;

/** ...and the runner-up is at least this many points behind. */
export const AUTO_MATCH_GAP = 10;

export const toConfidence = (score: number | string | null | undefined, maxScore = MAX_MATCH_SCORE): number => {
  const n = typeof score === 'string' ? parseFloat(score) : Number(score ?? 0);
  if (!Number.isFinite(n) || maxScore <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((n / maxScore) * 100)));
};

/**
 * Pick the single match that is safe to auto-link, or null when the top match
 * isn't confident enough or a runner-up is too close to call.
 */
export const pickAutoMatch = <T extends { score: number | string | null }>(
  matches: T[] | null | undefined,
  maxScore = MAX_MATCH_SCORE,
): { match: T; confidence: number } | null => {
  if (!matches || matches.length === 0) return null;
  const sorted = [...matches].sort((a, b) => toConfidence(b.score, maxScore) - toConfidence(a.score, maxScore));
  const top = toConfidence(sorted[0].score, maxScore);
  if (top < AUTO_MATCH_THRESHOLD) return null;
  const second = sorted[1] ? toConfidence(sorted[1].score, maxScore) : 0;
  if (top - second < AUTO_MATCH_GAP) return null;
  return { match: sorted[0], confidence: top };
};
