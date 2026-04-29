import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatDateTime } from '@/utils/dateFormat';

const MODULES = ['invoices', 'payments', 'claims', 'branch_expenses', 'inventory', 'payroll'] as const;
type Mod = (typeof MODULES)[number];

export default function BackfillRunner() {
  const today = new Date().toISOString().slice(0, 10);
  const yearStart = `${new Date().getFullYear()}-01-01`;
  const [from, setFrom] = useState(yearStart);
  const [to, setTo] = useState(today);
  const [force, setForce] = useState(false);
  const [selected, setSelected] = useState<Record<Mod, boolean>>(
    Object.fromEntries(MODULES.map((m) => [m, true])) as Record<Mod, boolean>,
  );
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const loadHistory = async () => {
    const { data } = await supabase.from('accounting_backfill_runs').select('*').order('run_at', { ascending: false }).limit(5);
    setHistory(data || []);
  };
  useEffect(() => { loadHistory(); }, []);

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

  return (
    <div className="container mx-auto p-4 space-y-4 max-w-4xl">
      <h1 className="text-2xl font-bold">Accounting Backfill</h1>
      <p className="text-sm text-muted-foreground">
        Scans historical records and reports how many would post to the new ledger.
        Idempotent — already-posted journals are skipped unless Force is checked.
      </p>

      <Card>
        <CardHeader><CardTitle className="text-base">Run scan</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
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
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={force} onCheckedChange={(v) => setForce(!!v)} />
            Force re-post (void existing journals)
          </label>
          <Button onClick={run} disabled={running}>{running ? 'Running…' : 'Run backfill'}</Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader><CardTitle className="text-base">Last run summary</CardTitle></CardHeader>
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
