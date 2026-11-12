import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Link2, Unlink } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatDate, formatDateTime } from '@/utils/dateFormat';

const rpc = ((fn: string, args?: any) => (supabase.rpc as any).call(supabase, fn, args)) as any;
const accessPw = () => { try { return sessionStorage.getItem('access_pw_v1') || ''; } catch { return ''; } };
const sgd = (n: number) => `S$${Number(n).toFixed(2)}`;

interface Candidate { payment_id: string; invoice_number: string; student_name: string; branch_id: string; amount: number; payment_date: string; proof_ref: string | null; ref_match: boolean; name_match: boolean; shortage: boolean }
interface Txn { id: string; txn_ref: string; amount: number; received_at: string; payer_name: string; method: string; account_last4: string; status: 'matched' | 'unmatched' | 'review'; status_reason: string | null; matched_by: string | null; matched_at: string | null; invoice_number: string | null; student_name: string | null; candidates: Candidate[] | null }

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = { matched: 'default', review: 'secondary', unmatched: 'outline' };

const BankReconciliation: React.FC = () => {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>('open');
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
    mutationFn: async ({ txn, payment }: { txn: string; payment: string }) => {
      const { error } = await rpc('access_bank_match', { p_password: accessPw(), p_txn_id: txn, p_payment_id: payment });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Payment verified and linked'); refresh(); },
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
        <Button size="sm" className="ml-auto" onClick={() => sync.mutate()} disabled={sync.isPending}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${sync.isPending ? 'animate-spin' : ''}`} />{sync.isPending ? 'Syncing…' : 'Sync now'}
        </Button>
      </CardContent></Card>

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
                  <span>Linked to <span className="text-foreground font-medium">{t.invoice_number}</span> · {t.student_name} · {t.matched_by}{t.matched_at ? ` · ${formatDateTime(t.matched_at)}` : ''}</span>
                  <Button size="sm" variant="ghost" className="h-6 px-2 ml-auto" onClick={() => unmatch(t.id)}><Unlink className="h-3 w-3 mr-1" />Unlink</Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {t.status_reason && <div className="text-muted-foreground">{t.status_reason}</div>}
                  {(t.candidates ?? []).map((c) => (
                    <div key={c.payment_id} className="flex flex-wrap items-center gap-2 rounded border p-2">
                      <span className="font-medium">{c.student_name}</span>
                      <span>{c.invoice_number}</span>
                      <span>{sgd(c.amount)} · {formatDate(c.payment_date)}</span>
                      {c.proof_ref && <span className="text-muted-foreground break-all">Proof ref {c.proof_ref}</span>}
                      {c.ref_match && <Badge>ref match</Badge>}
                      {c.name_match && <Badge variant="secondary">name match</Badge>}
                      {c.shortage && <Badge variant="destructive">shortage</Badge>}
                      <Button size="sm" variant="outline" className="h-6 px-2 ml-auto" disabled={match.isPending || c.shortage}
                        onClick={() => confirm(`Verify ${c.student_name}'s payment of ${sgd(c.amount)} using this bank transfer?`) && match.mutate({ txn: t.id, payment: c.payment_id })}>
                        <Link2 className="h-3 w-3 mr-1" />Match & verify
                      </Button>
                    </div>
                  ))}
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
