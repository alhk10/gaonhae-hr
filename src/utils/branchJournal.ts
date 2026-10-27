export interface JournalRow {
  id: string; kind: 'auto' | 'manual'; date: string; direction: 'in' | 'out'; amount: number;
  description: string; reference: string | null; category: string | null; remark: string | null; receipt_path: string | null;
}
export interface JournalLine extends JournalRow { balance: number }

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Adds a running balance starting from the opening balance, and period totals. */
export function withRunningBalance(opening: number, rows: JournalRow[]) {
  let bal = Number(opening) || 0; let totalIn = 0; let totalOut = 0;
  const lines: JournalLine[] = rows.map((r) => {
    const amt = Number(r.amount) || 0;
    if (r.direction === 'in') { bal += amt; totalIn += amt; } else { bal -= amt; totalOut += amt; }
    return { ...r, amount: amt, balance: r2(bal) };
  });
  return { lines, opening: r2(Number(opening) || 0), totalIn: r2(totalIn), totalOut: r2(totalOut), net: r2(totalIn - totalOut), closing: r2(bal) };
}
