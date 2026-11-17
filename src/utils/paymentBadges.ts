export type BadgeTone = 'red' | 'amber' | 'green';
export interface PayBadge { label: string; tone: BadgeTone }

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** True when the date is earlier than the same day last month. */
export const isOverAMonth = (date: string | null | undefined, today: Date = new Date()): boolean => {
  if (!date) return false;
  const t = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
  if (t.getDate() !== today.getDate()) t.setDate(0); // e.g. 31 Mar -> 28/29 Feb
  return date.slice(0, 10) < iso(t);
};

export const termPayBadge = (status: string | null | undefined, invoiceDate?: string | null, today?: Date): PayBadge | null => {
  if (status === 'paid') return { label: 'Term Paid', tone: 'green' };
  if (status === 'none') return { label: 'No Term Invoice', tone: 'red' };
  if (status === 'unpaid') return { label: 'Unpaid Term Invoice', tone: isOverAMonth(invoiceDate, today) ? 'red' : 'amber' };
  return null;
};

export const unpaidInvoiceBadge = (total: number | null | undefined, oldest?: string | null, today?: Date): PayBadge | null => {
  if (!total || total <= 0.004) return null;
  return { label: `Unpaid invoice $${total.toFixed(2)} due`, tone: isOverAMonth(oldest, today) ? 'red' : 'amber' };
};
