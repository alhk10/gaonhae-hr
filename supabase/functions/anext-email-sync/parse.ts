// Parses an ANEXT "You have received" alert (snippet or plain text) into a transaction.
export interface AnextTxn {
  txn_ref: string; amount: number; currency: string; received_at: string;
  payer_name: string; account_last4: string; method: string;
}

const decode = (s: string) => s
  .replace(/<[^>]+>/g, ' ')
  .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ').trim();

export function parseAnextAlert(raw: string): AnextTxn | null {
  const text = decode(raw);
  const ref = text.match(/Transaction Ref:\s*([A-Za-z0-9]+)/i);
  const m = text.match(/received\s+([A-Z]{3})\s?([\d,]+\.\d{2})\s+on\s+(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})\s*\(SGT\)\s+from\s+(.+?)\s+to your account ending\s+(\d{4})\s+via\s+([A-Z]+)/i);
  if (!ref || !m) return null;
  const [, cur, amt, dd, mm, yyyy, hh, mi, payer, last4, method] = m;
  const amount = Number(amt.replace(/,/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return {
    txn_ref: ref[1], amount, currency: cur.toUpperCase(),
    received_at: `${yyyy}-${mm}-${dd}T${hh}:${mi}:00+08:00`,
    payer_name: payer.trim().toUpperCase(), account_last4: last4, method: method.toUpperCase(),
  };
}
