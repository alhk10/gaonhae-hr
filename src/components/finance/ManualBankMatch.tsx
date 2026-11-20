import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import DateField from '@/components/attendance/DateField';
import { formatDateTime, toISODate } from '@/utils/dateFormat';
import { timeGapLabel, allocationFits } from '@/utils/bankMatch';

const rpc = ((fn: string, args?: any) => (supabase.rpc as any).call(supabase, fn, args)) as any;
const accessPw = () => { try { return sessionStorage.getItem('access_pw_v1') || ''; } catch { return ''; } };
const sgd = (n: number) => `S$${Number(n).toFixed(2)}`;

interface Hit { kind: 'payment' | 'external'; payment_id: string | null; invoice_id: string; invoice_number: string; name: string; branch_name: string; amount: number; at: string; shortage: boolean; payer_known: boolean }

/** Search any open payment / external invoice and allocate one transfer across several of them (up to its remaining amount). */
const ManualBankMatch: React.FC<{ txnId: string; receivedAt: string; remaining: number; payerName: string; onDone: () => void }> = ({ txnId, receivedAt, remaining, payerName, onDone }) => {
  const day = (offset: number) => { const d = new Date(receivedAt); d.setDate(d.getDate() + offset); return toISODate(d); };
  const [from, setFrom] = useState(day(-7));
  const [to, setTo] = useState(day(7));
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [text, setText] = useState('');
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState<Record<string, number>>({});
  const key = (h: Hit) => h.payment_id ?? `ext:${h.invoice_id}`;

  const search = async () => {
    setBusy(true);
    const { data, error } = await rpc('access_bank_manual_search', { p_password: accessPw(), p_txn_id: txnId, p_from: from || null, p_to: to || null,
      p_amount_min: min ? Number(min) : null, p_amount_max: max ? Number(max) : null, p_text: text.trim() || null });
    setBusy(false);
    if (error) return toast.error(error.message);
    setHits((data ?? []) as Hit[]);
  };
  const amounts = Object.values(sel);
  const total = Math.round(amounts.reduce((t, n) => t + (Number(n) || 0), 0) * 100) / 100;
  const ok = amounts.length > 0 && allocationFits(amounts, remaining);

  const toggle = (h: Hit) => setSel((m) => {
    const k = key(h); const n = { ...m };
    if (k in n) delete n[k];
    else n[k] = h.kind === 'payment' ? Number(h.amount) : Math.min(Number(h.amount), Math.max(0, Math.round((remaining - total) * 100) / 100));
    return n;
  });

  const allocate = async () => {
    const items = Object.entries(sel).map(([k, amt]) => k.startsWith('ext:') ? { invoice_id: k.slice(4), amount: amt } : { payment_id: k });
    if (!confirm(`Allocate ${sgd(total)} of this ${sgd(remaining)} remaining to ${items.length} item(s) and remember ${payerName || 'this payer'}?`)) return;
    setBusy(true);
    const { data, error } = await rpc('access_bank_allocate', { p_password: accessPw(), p_txn_id: txnId, p_allocations: items });
    setBusy(false);
    if (error) return toast.error(error.message);
    const rem = Number(data?.remaining ?? 0);
    toast.success(rem > 0.004 ? `Allocated; ${sgd(rem)} still open` : 'Fully matched; payer remembered');
    setSel({}); setHits(null); onDone();
  };

  return (
    <div className="rounded border border-dashed p-2 space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <div><div className="text-[11px] text-muted-foreground">From</div><DateField value={from} onChange={setFrom} /></div>
        <div><div className="text-[11px] text-muted-foreground">To</div><DateField value={to} onChange={setTo} /></div>
        <div><div className="text-[11px] text-muted-foreground">Amount min</div><Input className="h-8 w-24 text-xs" type="number" step="0.01" value={min} onChange={(e) => setMin(e.target.value)} /></div>
        <div><div className="text-[11px] text-muted-foreground">Amount max</div><Input className="h-8 w-24 text-xs" type="number" step="0.01" value={max} onChange={(e) => setMax(e.target.value)} /></div>
        <div className="flex-1 min-w-[160px]"><div className="text-[11px] text-muted-foreground">Invoice, student or customer</div><Input className="h-8 text-xs" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} /></div>
        <Button size="sm" variant="outline" className="h-8" onClick={search} disabled={busy}><Search className="h-3.5 w-3.5 mr-1" />Search</Button>
      </div>
      {hits && hits.length === 0 && <p className="text-muted-foreground">No open payments or invoices found</p>}
      {hits?.map((h) => {
        const k = key(h); const on = k in sel;
        return (
          <div key={k} className="flex flex-wrap items-center gap-2 rounded border p-2">
            <Checkbox checked={on} disabled={h.shortage} onCheckedChange={() => toggle(h)} aria-label={`Select ${h.invoice_number}`} />
            {h.kind === 'external' && <Badge variant="outline">External</Badge>}
            <span className="font-medium">{h.name}</span><span>{h.invoice_number}</span>
            <span className="text-muted-foreground">{h.branch_name}</span>
            <span>{h.kind === 'external' ? `Balance ${sgd(h.amount)}` : sgd(h.amount)}</span>
            <span className="text-muted-foreground">{formatDateTime(h.at)} · {timeGapLabel(h.at, receivedAt)}</span>
            {h.payer_known && <Badge>known payer</Badge>}
            {h.shortage && <Badge variant="destructive">shortage</Badge>}
            {on && h.kind === 'external' && (
              <Input className="h-7 w-24 text-xs ml-auto" type="number" step="0.01" min="0" max={h.amount} value={sel[k]}
                aria-label="Amount to allocate" onChange={(e) => setSel((m) => ({ ...m, [k]: Number(e.target.value) }))} />
            )}
          </div>
        );
      })}
      {amounts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className={ok ? 'text-primary' : 'text-destructive'}>Allocated {sgd(total)} of {sgd(remaining)} remaining</span>
          <Button size="sm" variant="outline" className="h-6 px-2 ml-auto" disabled={!ok || busy} onClick={allocate}><Link2 className="h-3 w-3 mr-1" />Allocate & verify</Button>
        </div>
      )}
    </div>
  );
};

export default ManualBankMatch;
