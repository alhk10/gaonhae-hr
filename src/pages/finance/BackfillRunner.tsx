import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatDateTime } from '@/utils/dateFormat';
import { postInvoiceIssuedJournal, postPaymentJournal } from '@/services/accountingPostings';

const MODULES = ['invoices', 'payments', 'claims', 'branch_expenses', 'inventory', 'payroll'] as const;
type Mod = (typeof MODULES)[number];

const POSTABLE_INVOICE_STATUSES = ['sent', 'unpaid', 'partially_paid', 'paid', 'verified', 'overdue'];

async function runWithConcurrency<T>(items: T[], limit: number, fn: (item: T) => Promise<void>, onProgress: () => void) {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      try { await fn(items[idx]); } catch (_) { /* counted by caller */ }
      onProgress();
    }
  });
  await Promise.all(workers);
}

export default function BackfillRunner() {
  const today = new Date().toISOString().slice(0, 10);
  const yearStart = `${new Date().getFullYear()}-01-01`;
  const [from, setFrom] = useState(yearStart);
  const [to, setTo] = useState(today);
  const [force, setForce] = useState(false);
  const [branchId, setBranchId] = useState<string>('all');
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = useState<Record<Mod, boolean>>(
    Object.fromEntries(MODULES.map((m) => [m, true])) as Record<Mod, boolean>,
  );
  const [running, setRunning] = useState(false);
  const [posting, setPosting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [progress, setProgress] = useState<{ done: number; total: number; ok: number; err: number } | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  const loadHistory = async () => {
    const { data } = await supabase.from('accounting_backfill_runs').select('*').order('run_at', { ascending: false }).limit(5);
    setHistory(data || []);
  };
  useEffect(() => {
    loadHistory();
    supabase.from('branches').select('id,name').order('name').then(({ data }) => setBranches(data || []));
  }, []);

  const run = async () => {
    setRunning(true); setResult(null);
    try {
      const modules = MODULES.filter((m) => selected[m]);
      const { data, error } = await supabase.functions.invoke('accounting-backfill', {
        body: { modules, from, to, force },
      });
      if (error) throw error;
      setResult(data);
      toast.success('Backfill scan complete');
      loadHistory();
    } catch (e: any) {
      toast.error(e.message || 'Backfill failed');
    } finally {
      setRunning(false);
    }
  };

  const postNow = async () => {
    if (!confirm(`Post journals for ${branchId === 'all' ? 'ALL branches' : branches.find(b => b.id === branchId)?.name} from ${from} to ${to}?`)) return;
    setPosting(true); setProgress({ done: 0, total: 0, ok: 0, err: 0 });
    let okCount = 0, errCount = 0;
    const summary: Record<string, { total: number; ok: number; err: number }> = {};

    try {
      // 1. Invoices
      if (selected.invoices) {
        let q = supabase.from('invoices').select('id').gte('issue_date', from).lte('issue_date', to).in('status', POSTABLE_INVOICE_STATUSES);
        if (branchId !== 'all') q = q.eq('branch_id', branchId);
        const { data: invs } = await q;
        let ids = (invs || []).map((r: any) => r.id);

        if (!force && ids.length) {
          const { data: existing } = await supabase
            .from('journal_entries')
            .select('source_id')
            .eq('source_type', 'invoice')
            .neq('status', 'void')
            .in('source_id', ids);
          const has = new Set((existing || []).map((r: any) => r.source_id));
          ids = ids.filter((id) => !has.has(id));
        }

        const s = { total: ids.length, ok: 0, err: 0 };
        setProgress((p) => ({ done: p?.done || 0, total: (p?.total || 0) + ids.length, ok: p?.ok || 0, err: p?.err || 0 }));
        await runWithConcurrency(ids, 5, async (id) => {
          try { await postInvoiceIssuedJournal(id); s.ok++; okCount++; }
          catch { s.err++; errCount++; }
        }, () => setProgress((p) => p && ({ ...p, done: p.done + 1, ok: okCount, err: errCount })));
        summary.invoices = s;
      }

      // 2. Payments
      if (selected.payments) {
        let payQ = supabase
          .from('payments')
          .select('id, invoice_id, is_verified, payment_method')
          .gte('payment_date', from)
          .lte('payment_date', to);
        const { data: pays } = await payQ;
        let rows = (pays || []).filter((p: any) => p.is_verified || ['cash', 'credit'].includes(String(p.payment_method).toLowerCase()));

        if (branchId !== 'all' && rows.length) {
          const invIds = Array.from(new Set(rows.map((r: any) => r.invoice_id).filter(Boolean)));
          const { data: invs } = await supabase.from('invoices').select('id').eq('branch_id', branchId).in('id', invIds);
          const ok = new Set((invs || []).map((r: any) => r.id));
          rows = rows.filter((r: any) => ok.has(r.invoice_id));
        }

        let ids = rows.map((r: any) => r.id);
        if (!force && ids.length) {
          const { data: existing } = await supabase
            .from('journal_entries')
            .select('source_id')
            .eq('source_type', 'payment')
            .neq('status', 'void')
            .in('source_id', ids);
          const has = new Set((existing || []).map((r: any) => r.source_id));
          ids = ids.filter((id) => !has.has(id));
        }

        const s = { total: ids.length, ok: 0, err: 0 };
        setProgress((p) => ({ done: p?.done || 0, total: (p?.total || 0) + ids.length, ok: p?.ok || 0, err: p?.err || 0 }));
        await runWithConcurrency(ids, 5, async (id) => {
          try { await postPaymentJournal(id); s.ok++; okCount++; }
          catch { s.err++; errCount++; }
        }, () => setProgress((p) => p && ({ ...p, done: p.done + 1, ok: okCount, err: errCount })));
        summary.payments = s;
      }

      await supabase.from('accounting_backfill_runs').insert({
        run_by: (await supabase.auth.getUser()).data.user?.email || 'unknown',
        modules: Object.keys(summary),
        from_date: from,
        to_date: to,
        force,
        summary: { ...summary, mode: 'post', branch_id: branchId },
        status: 'completed',
      });

      toast.success(`Posted ${okCount} journals${errCount ? `, ${errCount} errors` : ''}`);
      loadHistory();
    } catch (e: any) {
      toast.error(e.message || 'Post failed');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-4 max-w-4xl">
      <h1 className="text-2xl font-bold">Accounting Backfill</h1>
      <p className="text-sm text-muted-foreground">
        Scans (or posts) historical records into the new ledger. Idempotent — already-posted journals are skipped unless Force is checked.
      </p>

      <Card>
        <CardHeader><CardTitle className="text-base">Run</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Branch</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {MODULES.map((m) => (
              <label key={m} className="flex items-center gap-2 text-sm">
                <Checkbox checked={selected[m]} onCheckedChange={(v) => setSelected({ ...selected, [m]: !!v })} />
                <span className="capitalize">{m.replace('_', ' ')}</span>
              </label>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">Note: "Post journals now" currently supports invoices and payments. Other modules are scan-only.</p>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={force} onCheckedChange={(v) => setForce(!!v)} />
            Force re-post (void existing journals)
          </label>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={run} disabled={running || posting}>{running ? 'Scanning…' : 'Scan only'}</Button>
            <Button onClick={postNow} disabled={running || posting}>{posting ? 'Posting…' : 'Post journals now'}</Button>
          </div>
          {progress && (
            <div className="text-xs text-muted-foreground">
              Progress: {progress.done} / {progress.total} · {progress.ok} ok · {progress.err} errors
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader><CardTitle className="text-base">Last scan summary</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-3 rounded overflow-auto">{JSON.stringify(result.summary, null, 2)}</pre>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Recent runs</CardTitle></CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No runs yet.</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="text-xs border rounded p-2">
                  <div className="font-medium">{formatDateTime(h.run_at)} — {h.run_by}</div>
                  <div className="text-muted-foreground">{(h.modules || []).join(', ')} · {h.from_date} → {h.to_date} {h.force ? '· FORCE' : ''}</div>
                  <pre className="mt-1 text-[11px]">{JSON.stringify(h.summary, null, 2)}</pre>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
