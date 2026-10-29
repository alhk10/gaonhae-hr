export type GradingBadgeState = 'not_ready' | 'ready' | 'paid';

export const gradingBadgeState = (g?: { ready?: boolean; paid?: boolean } | null): GradingBadgeState =>
  g?.paid ? 'paid' : g?.ready ? 'ready' : 'not_ready';

/** /hello shows the Grading option only when staff marked ready and it's not yet paid. */
export const helloShowsGrading = (g?: { ready?: boolean; paid?: boolean } | null): boolean =>
  gradingBadgeState(g) === 'ready';
