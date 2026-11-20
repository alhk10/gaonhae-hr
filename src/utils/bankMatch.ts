/** Cents-exact check that the selected payments add up to the bank transfer. */
export const toCents = (n: number) => Math.round(Number(n) * 100);
export function selectionTotal(amounts: number[]): number {
  return amounts.reduce((s, a) => s + toCents(a), 0) / 100;
}
export function selectionMatchesTransfer(amounts: number[], transfer: number): boolean {
  return amounts.length > 0 && amounts.reduce((s, a) => s + toCents(a), 0) === toCents(transfer);
}

/** Allocation may cover part of a transfer: every amount > 0 and the total never above the remaining amount. */
export function allocationFits(amounts: number[], remaining: number): boolean {
  return amounts.length > 0 && amounts.every((a) => toCents(a) > 0) && amounts.reduce((s, a) => s + toCents(a), 0) <= toCents(remaining);
}

/** Human label for how far a payment/invoice time is from the transfer time, e.g. "2h earlier". */
export function timeGapLabel(at: string, transferAt: string): string {
  const mins = Math.round((new Date(at).getTime() - new Date(transferAt).getTime()) / 60000);
  const a = Math.abs(mins);
  if (a < 1) return 'same time';
  const txt = a < 60 ? `${a}m` : a < 48 * 60 ? `${Math.round(a / 60)}h` : `${Math.round(a / 1440)}d`;
  return `${txt} ${mins < 0 ? 'earlier' : 'later'}`;
}

/** Up to `limit` subsets of candidate amounts that add up exactly to the target (by cents). */
export function exactCombos<T extends { amount: number }>(items: T[], target: number, limit = 3): T[][] {
  const out: T[][] = []; const goal = toCents(target); const list = items.slice(0, 14);
  const walk = (i: number, sum: number, pick: T[]) => {
    if (out.length >= limit) return;
    if (sum === goal && pick.length > 1) { out.push([...pick]); return; }
    if (i >= list.length || sum > goal) return;
    walk(i + 1, sum + toCents(list[i].amount), [...pick, list[i]]);
    walk(i + 1, sum, pick);
  };
  walk(0, 0, []);
  return out;
}
