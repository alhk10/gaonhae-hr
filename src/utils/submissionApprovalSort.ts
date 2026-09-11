/**
 * Shared client-side sorting for the public submission approval lists
 * (grading / competition / seminar / guards).
 *
 * - priority: choose whether unmatched or unverified rows sort to the top first.
 * - The other action state is used as the secondary sort key.
 * - newestFirst: within each group, order by created_at descending (default) or ascending.
 */
export function sortSubmissionsByAction<T extends { created_at?: string | null }>(
  rows: T[],
  opts: {
    priority: 'unmatched' | 'unverified';
    newestFirst: boolean;
    isUnmatched: (row: T) => boolean;
    isUnverified: (row: T) => boolean;
  },
): T[] {
  const { priority, newestFirst, isUnmatched, isUnverified } = opts;
  const arr = [...rows];
  arr.sort((a, b) => {
    const primary = priority === 'unmatched' ? isUnmatched : isUnverified;
    const secondary = priority === 'unmatched' ? isUnverified : isUnmatched;
    const primaryDifference = Number(primary(b)) - Number(primary(a));
    if (primaryDifference !== 0) return primaryDifference;
    const secondaryDifference = Number(secondary(b)) - Number(secondary(a));
    if (secondaryDifference !== 0) return secondaryDifference;
    const at = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
    return newestFirst ? bt - at : at - bt;
  });
  return arr;
}
