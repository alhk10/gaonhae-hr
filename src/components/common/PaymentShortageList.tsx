/** Payments whose scanned proof is lower than the amount claimed. Only superadmin resolves; /access staff can record the balance. */
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { SignedLink } from '@/components/common/SignedMedia';
import { formatDateTime } from '@/utils/dateFormat';
import { currencyForCountry, formatCurrency } from '@/utils/currencyUtils';
import AccessRecordPaymentDialog from '@/components/grading-list/AccessRecordPaymentDialog';

interface Row {
  payment_id: string; invoice_id: string; invoice_number: string; student_name: string; branch_name: string | null;
  country: string | null; amount: number; scanned_amount: number; shortfall: number; balance_due: number;
  proof_url: string | null; created_at: string;
}

interface Props { mode: 'access' | 'superadmin'; lockedBranchName?: string }

const PaymentShortageList: React.FC<Props> = ({ mode, lockedBranchName }) => {
  const qc = useQueryClient();
  const [recording, setRecording] = useState<Row | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const key = ['payment-shortages', mode];
  const { data: rows = [] } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = mode === 'access'
        ? await (supabase as any).rpc('access_list_payment_shortages', { p_password: sessionStorage.getItem('access_pw_v1') || '' })
        : await (supabase as any).rpc('admin_list_payment_shortages');
      if (error) throw error;
      return (data || []) as Row[];
    },
  });
  const shown = rows.filter((r) => !lockedBranchName || r.branch_name === lockedBranchName);
  if (shown.length === 0) return null;

  const resolve = async (r: Row, action: 'accept_scanned' | 'confirm_full' | 'reject') => {
    const label = action === 'accept_scanned' ? 'Accept the scanned amount' : action === 'confirm_full' ? 'Confirm the full amount was paid' : 'Reject this payment';
    if (!window.confirm(`${label} for ${r.invoice_number}?`)) return;
    setBusy(r.payment_id);
    const { error } = await (supabase as any).rpc('admin_resolve_payment_shortage', { p_payment_id: r.payment_id, p_action: action });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success('Payment shortage resolved');
    qc.invalidateQueries({ queryKey: ['payment-shortages'] });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" /> Payment shortages
          <Badge variant="destructive" className="text-[10px]">{shown.length}</Badge>
        </CardTitle>
        {mode === 'access' && <p className="text-[11px] text-muted-foreground">Only superadmin can approve a shortage. You can record a second payment for the balance.</p>}
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <ul className="divide-y">
          {shown.map((r) => {
            const cur = currencyForCountry(r.country);
            return (
              <li key={r.payment_id} className="py-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm">
                <span className="text-muted-foreground w-[120px] shrink-0">{formatDateTime(r.created_at)}</span>
                <span className="font-medium flex-1 min-w-[140px] break-words">{r.student_name}</span>
                <span className="text-muted-foreground">{r.invoice_number} · {r.branch_name || '—'}</span>
                <span>Paid {formatCurrency(Number(r.amount), cur)} · Scanned {formatCurrency(Number(r.scanned_amount), cur)}</span>
                <Badge variant="destructive" className="text-[10px]">Short {formatCurrency(Number(r.shortfall), cur)}</Badge>
                {r.proof_url && <SignedLink href={r.proof_url} target="_blank" rel="noreferrer" className="text-primary underline text-xs">Proof</SignedLink>}
                <div className="flex flex-wrap gap-1">
                  {mode === 'access' && Number(r.balance_due) > 0.009 && (
                    <Button size="sm" className="h-7 text-xs" onClick={() => setRecording(r)}>Record Payment</Button>
                  )}
                  {mode === 'superadmin' && (<>
                    <Button size="sm" variant="outline" className="h-7 text-xs" disabled={busy === r.payment_id} onClick={() => resolve(r, 'accept_scanned')}>Accept scanned</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" disabled={busy === r.payment_id} onClick={() => resolve(r, 'confirm_full')}>Confirm full</Button>
                    <Button size="sm" variant="destructive" className="h-7 text-xs" disabled={busy === r.payment_id} onClick={() => resolve(r, 'reject')}>Reject</Button>
                  </>)}
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
      {recording && (
        <AccessRecordPaymentDialog
          invoiceId={recording.invoice_id} invoiceNumber={recording.invoice_number} balance={Number(recording.balance_due)}
          country={recording.country} onClose={() => setRecording(null)}
          onDone={() => { setRecording(null); qc.invalidateQueries({ queryKey: ['payment-shortages'] }); }}
        />
      )}
    </Card>
  );
};

export default PaymentShortageList;
