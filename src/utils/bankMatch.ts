/** Cents-exact check that the selected payments add up to the bank transfer. */
export const toCents = (n: number) => Math.round(Number(n) * 100);
export function selectionTotal(amounts: number[]): number {
  return amounts.reduce((s, a) => s + toCents(a), 0) / 100;
}
export function selectionMatchesTransfer(amounts: number[], transfer: number): boolean {
  return amounts.length > 0 && amounts.reduce((s, a) => s + toCents(a), 0) === toCents(transfer);
}
