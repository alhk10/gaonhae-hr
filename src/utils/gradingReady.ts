export type GradingBadgeState = 'not_ready' | 'ready' | 'paid';

export const gradingBadgeState = (g?: { ready?: boolean; paid?: boolean } | null): GradingBadgeState =>
  g?.paid ? 'paid' : g?.ready ? 'ready' : 'not_ready';

/**
 * /hello shows the Grading option only when staff marked ready, it's not yet paid,
 * and the term is paid enough (50% of weeks, or any weeks for late joiners).
 */
export const helloShowsGrading = (
  g?: { ready?: boolean; paid?: boolean; term_eligible?: boolean } | null,
): boolean => gradingBadgeState(g) === 'ready' && g?.term_eligible !== false;
