import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { SignedImage, SignedLink } from '@/components/common/SignedMedia';
import { formatDate } from '@/utils/dateFormat';

interface Props { invoiceId: string; signedIn: boolean; reloadKey: number; currency: string; balance: number; }

const statusOf = (p: any) => {
  if (p.verification_status === 'rejected') return 'rejected';
  if (p.proof_scan_amount != null && Number(p.proof_scan_amount) + 0.005 < Number(p.amount) && !p.is_verified) return 'shortage';
  return p.is_verified || p.verification_status === 'verified' ? 'verified' : 'pending';
};

const InvoicePaymentsList: React.FC<Props> = ({ invoiceId, signedIn, reloadKey, currency, balance }) => {
  const [rows, setRows] = useState<any[] | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    let off = false;
    (async () => {
      let data: any[] = [];
      if (signedIn) {
        const r = await supabase.from('payments').select('*').eq('invoice_id', invoiceId).order('payment_date').order('created_at');
        data = r.data || [];
      } else {
        const r = await (supabase as any).rpc('access_invoice_payments', { p_password: sessionStorage.getItem('access_pw_v1') || '', p_invoice_id: invoiceId });
        data = r.data || [];
      }
      if (!off) setRows(data);
    })();
    return () => { off = true; };
  }, [invoiceId, signedIn, reloadKey]);

  const m = (n: number) => `${n < 0 ? '-' : ''}${currency}${Math.abs(n).toFixed(2)}`;
  if (!rows) return null;
  const counted = rows.filter((p) => statusOf(p) !== 'rejected');
  const paid = counted.filter((p) => statusOf(p) === 'verified').reduce((s, p) => s + Number(p.amount), 0);
  const pending = counted.filter((p) => statusOf(p) !== 'verified').reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="border rounded-md p-2 text-xs space-y-1">
      <p className="font-semibold text-sm">Payments</p>
      {rows.length === 0 ? <p className="text-muted-foreground">No payments recorded</p> : (
        <ul className="divide-y">
          {rows.map((p) => {
            const st = statusOf(p);
            const proofs = [p.proof_of_payment_url, ...(Array.isArray(p.extra_proofs) ? p.extra_proofs.map((x: any) => x?.url || x) : [])].filter((u: any) => typeof u === 'string' && u);
            return (
              <li key={p.id} className="py-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="w-[80px]">{formatDate(p.payment_date)}</span>
                <span className="capitalize min-w-[80px]">{String(p.payment_method || '').replace(/_/g, ' ')}</span>
                <span className="text-muted-foreground flex-1 min-w-[100px] break-words">{p.reference_number || p.payment_number || ''}</span>
                <Badge variant={st === 'verified' ? 'default' : st === 'pending' ? 'secondary' : 'destructive'} className="text-[10px]">{st}</Badge>
                {proofs.map((u: string) => (
                  <button key={u} type="button" onClick={() => setPreview(u)} className="h-8 w-8 rounded border overflow-hidden">
                    <SignedImage src={u} alt="Proof" className="h-full w-full object-cover" />
                  </button>
                ))}
                <span className={`w-[80px] text-right font-medium ${st === 'rejected' ? 'line-through text-muted-foreground' : ''}`}>{m(Number(p.amount))}</span>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex flex-wrap justify-end gap-4 pt-1 border-t">
        <span>Paid: <b>{m(paid)}</b></span>
        {pending > 0 && <span>Pending: <b>{m(pending)}</b></span>}
        <span>Balance due: <b>{m(balance)}</b></span>
      </div>
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-auto">
          {preview && <div className="space-y-2"><SignedImage src={preview} alt="Proof" className="w-full h-auto" /><SignedLink href={preview} target="_blank" rel="noreferrer" className="text-primary underline text-xs">Open in new tab</SignedLink></div>}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoicePaymentsList;
