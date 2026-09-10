/**
 * Shared client-side sorting for the public submission approval lists
 * (grading / competition / seminar / guards).
 *
 * - actionFirst: rows that still need action (unmatched or unverified) sort to the top.
 * - newestFirst: within each group, order by created_at descending (default) or ascending.
 */
export function sortSubmissionsByAction<T extends { created_at?: string | null }>(
  rows: T[],
  opts: { actionFirst: boolean; newestFirst: boolean; needsAction: (row: T) => boolean },
): T[] {
  const { actionFirst, newestFirst, needsAction } = opts;
  const arr = [...rows];
  arr.sort((a, b) => {
    if (actionFirst) {
      const aNeed = needsAction(a) ? 0 : 1;
      const bNeed = needsAction(b) ? 0 : 1;
      if (aNeed !== bNeed) return aNeed - bNeed;
    }
    const at = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
    return newestFirst ? bt - at : at - bt;
  });
  return arr;
}
