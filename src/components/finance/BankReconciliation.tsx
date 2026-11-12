import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Link2, Unlink, Users, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import AnextVerifiedBadge from '@/components/finance/AnextVerifiedBadge';
import { selectionMatchesTransfer, selectionTotal } from '@/utils/bankMatch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatDate, formatDateTime } from '@/utils/dateFormat';

const rpc = ((fn: string, args?: any) => (supabase.rpc as any).call(supabase, fn, args)) as any;
const accessPw = () => { try { return sessionStorage.getItem('access_pw_v1') || ''; } catch { return ''; } };
const sgd = (n: number) => `S$${Number(n).toFixed(2)}`;

interface Candidate { payment_id: string; invoice_number: string; student_name: string; branch_id: string; amount: number; payment_date: string; proof_ref: string | null; ref_match: boolean; name_match: boolean; shortage: boolean; exact_amount: boolean; payer_known: boolean }
interface Linked { payment_id: string; invoice_number: string; amount: number; student_name: string }
interface Payer { id: string; payer_name: string; student_name: string; created_by: string | null; created_at: string }
interface Txn { id: string; txn_ref: string; amount: number; received_at: string; payer_name: string; method: string; account_last4: string; status: 'matched' | 'unmatched' | 'review'; status_reason: string | null; matched_by: string | null; matched_at: string | null; linked: Linked[] | null; candidates: Candidate[] | null }

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = { matched: 'default', review: 'secondary', unmatched: 'outline' };

const BankReconciliation: React.FC = () => {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>('open');
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [showPayers, setShowPayers] = useState(false);
  const payers = useQuery({
    queryKey: ['bank-payers'], enabled: showPayers, retry: false,
    queryFn: async () => { const { data, error } = await rpc('access_bank_payers', { p_password: accessPw() }); if (error) throw error; return (data ?? []) as Payer[]; },
  });
  const removePayer = async (p: Payer) => {
    if (!confirm(`Stop remembering ${p.payer_name} as a payer for ${p.student_name}?`)) return;
    const { error } = await rpc('access_bank_payer_delete', { p_password: accessPw(), p_id: p.id });
    if (error) toast.error(error.message); else { toast.success('Payer removed'); qc.invalidateQueries({ queryKey: ['bank-payers'] }); refresh(); }
  };
  const toggle = (txn: string, pid: string) => setPicked((m) => { const cur = m[txn] ?? []; return { ...m, [txn]: cur.includes(pid) ? cur.filter((x) => x !== pid) : [...cur, pid] }; });
  const { data, isLoading, error } = useQuery({
    queryKey: ['bank-txns', status],
    retry: false,
    queryFn: async () => {
      const { data, error } = await rpc('access_bank_transactions', { p_password: accessPw(), p_status: status === 'all' || status === 'open' ? null : status });
      if (error) throw error;
      const rows = (data?.rows ?? []) as Txn[];
      return { sync: data?.sync as { last_synced_at?: string; last_error?: string } | null, rows: status === 'open' ? rows.filter((r) => r.status !== 'matched') : rows };
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['bank-txns'] });

  const sync = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('anext-email-sync', { body: { password: accessPw() } });
      if (error) throw error;
      return data as { new: number; rematched: number };
    },
    onSuccess: (d) => { toast.success(`Synced: ${d.new} new email(s), ${d.rematched} newly matched`); refresh(); },
    onError: (e: any) => toast.error(e?.message || 'Sync failed'),
  });
  const match = useMutation({
    mutationFn: async ({ txn, payments }: { txn: string; payments: string[] }) => {
      const { error } = await rpc('access_bank_match', { p_password: accessPw(), p_txn_id: txn, p_payment_ids: payments });
      if (error) throw error;
    },
    onSuccess: (_d, v) => { toast.success(`${v.payments.length} payment(s) verified; payer remembered`); setPicked((m) => ({ ...m, [v.txn]: [] })); refresh(); },
    onError: (e: any) => toast.error(e?.message || 'Could not match'),
  });
  const unmatch = async (id: string) => {
    if (!confirm('Unlink this bank transaction? The payment stays verified; review it separately if needed.')) return;
    const { error } = await rpc('access_bank_unmatch', { p_password: accessPw(), p_txn_id: id });
    if (error) toast.error(error.message); else { toast.success('Unlinked'); refresh(); }
  };

  return (
    <div className="space-y-3">
      <Card><CardContent className="p-3 flex flex-wrap items-center gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Needs attention</SelectItem>
            <SelectItem value="review">Needs review</SelectItem>
            <SelectItem value="unmatched">Unmatched</SelectItem>
            <SelectItem value="matched">Matched</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          ANEXT PayNow/FAST · Last sync: {data?.sync?.last_synced_at ? formatDateTime(data.sync.last_synced_at) : 'never'}
          {data?.sync?.last_error && <span className="text-destructive"> · {data.sync.last_error}</span>}
        </span>
        <Button size="sm" variant="outline" className="ml-auto" onClick={() => setShowPayers((v) => !v)}><Users className="h-3.5 w-3.5 mr-1" />Remembered payers</Button>
        <Button size="sm" onClick={() => sync.mutate()} disabled={sync.isPending}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${sync.isPending ? 'animate-spin' : ''}`} />{sync.isPending ? 'Syncing…' : 'Sync now'}
        </Button>
      </CardContent></Card>

      {showPayers && <Card><CardContent className="p-3 text-xs space-y-1">
        <div className="font-medium text-sm">Remembered payers</div>
        <p className="text-muted-foreground">Saved when a transfer is matched. One payer can pay for several students; later transfers from them verify automatically when amounts add up exactly.</p>
        {payers.isLoading ? <p>Loading…</p> : (payers.data ?? []).length === 0 ? <p className="text-muted-foreground">None yet</p> : (
          <div className="divide-y">{(payers.data ?? []).map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-2 py-1">
              <span className="font-medium">{p.payer_name}</span><span>→ {p.student_name}</span>
              <span className="text-muted-foreground">{p.created_by} · {formatDate(p.created_at)}</span>
              <Button size="icon" variant="ghost" className="h-6 w-6 ml-auto" aria-label="Remove payer" onClick={() => removePayer(p)}><X className="h-3 w-3" /></Button>
            </div>))}</div>)}
      </CardContent></Card>}

      {error ? <p className="text-sm text-destructive">{(error as any).message}</p> : isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <div className="space-y-2">
          {data!.rows.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No bank transactions here</p>}
          {data!.rows.map((t) => (
            <Card key={t.id}><CardContent className="p-3 text-xs space-y-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold text-sm">{sgd(t.amount)}</span>
                <span>{formatDateTime(t.received_at)}</span>
                <span className="font-medium break-words">{t.payer_name}</span>
                <Badge variant="outline">{t.method}</Badge>
                <Badge variant={statusVariant[t.status]}>{t.status === 'review' ? 'needs review' : t.status}</Badge>
                <span className="text-muted-foreground break-all">Ref {t.txn_ref}</span>
              </div>
              {t.status === 'matched' ? (
                <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                  <AnextVerifiedBadge />
                  <span>Linked to {(t.linked ?? []).map((l, i) => <span key={l.payment_id}>{i > 0 && ', '}<span className="text-foreground font-medium">{l.invoice_number}</span> {l.student_name} ({sgd(l.amount)})</span>)} · {t.matched_by}{t.matched_at ? ` · ${formatDateTime(t.matched_at)}` : ''}</span>
                  <Button size="sm" variant="ghost" className="h-6 px-2 ml-auto" onClick={() => unmatch(t.id)}><Unlink className="h-3 w-3 mr-1" />Unlink</Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {t.status_reason && <div className="text-muted-foreground">{t.status_reason}</div>}
                  {(t.candidates ?? []).map((c) => (
                    <label key={c.payment_id} className="flex flex-wrap items-center gap-2 rounded border p-2 cursor-pointer">
                      <Checkbox checked={(picked[t.id] ?? []).includes(c.payment_id)} disabled={c.shortage} onCheckedChange={() => toggle(t.id, c.payment_id)} />
                      <span className="font-medium">{c.student_name}</span>
                      <span>{c.invoice_number}</span>
                      <span>{sgd(c.amount)} · {formatDate(c.payment_date)}</span>
                      {c.proof_ref && <span className="text-muted-foreground break-all">Proof ref {c.proof_ref}</span>}
                      {c.exact_amount && <Badge variant="outline">exact amount</Badge>}
                      {c.payer_known && <Badge>known payer</Badge>}
                      {c.ref_match && <Badge>ref match</Badge>}
                      {c.name_match && <Badge variant="secondary">name match</Badge>}
                      {c.shortage && <Badge variant="destructive">shortage</Badge>}
                    </label>
                  ))}
                  {(t.candidates ?? []).length > 0 && (() => {
                    const sel = (t.candidates ?? []).filter((c) => (picked[t.id] ?? []).includes(c.payment_id));
                    const ok = selectionMatchesTransfer(sel.map((c) => c.amount), t.amount);
                    return (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className={ok ? 'text-primary' : 'text-muted-foreground'}>Selected {sgd(selectionTotal(sel.map((c) => c.amount)))} of {sgd(t.amount)}</span>
                        <Button size="sm" variant="outline" className="h-6 px-2 ml-auto" disabled={!ok || match.isPending}
                          onClick={() => confirm(`Verify ${sel.length} payment(s) totalling ${sgd(t.amount)} with this transfer and remember ${t.payer_name} as their payer?`) && match.mutate({ txn: t.id, payments: sel.map((c) => c.payment_id) })}>
                          <Link2 className="h-3 w-3 mr-1" />Match & verify
                        </Button>
                      </div>
                    );
                  })()}
                </div>
              )}
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default BankReconciliation;
