/** Record a payment on an invoice from a password-only /access session (branch-checked on the server). */
import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { toISODate } from '@/utils/dateFormat';

interface Props { invoiceId: string; invoiceNumber: string; balance: number; country: string | null; onClose: () => void; onDone: () => void }

const AccessRecordPaymentDialog: React.FC<Props> = ({ invoiceId, invoiceNumber, balance, country, onClose, onDone }) => {
  const isAU = String(country || '').toUpperCase().startsWith('AU');
  const [amount, setAmount] = useState(balance.toFixed(2));
  const [method, setMethod] = useState(isAU ? 'bank_transfer' : 'paynow');
  const [date, setDate] = useState(toISODate(new Date()));
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const clientRef = useRef(crypto.randomUUID());
  const needsProof = method === 'paynow' || method === 'bank_transfer';

  const submit = async () => {
    const amt = Number(amount);
    if (!(amt > 0) || amt > balance + 0.005) { toast.error(`Amount must be between $0.01 and $${balance.toFixed(2)}`); return; }
    if (needsProof && !file) { toast.error('Please upload proof of payment'); return; }
    if (file && !file.type.startsWith('image/')) { toast.error('Proof must be an image (PDF not accepted)'); return; }
    setBusy(true);
    try {
      let proofUrl: string | null = null;
      if (file) {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
        const path = `access/${invoiceId}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
        const up = await supabase.storage.from('payment-proofs').upload(path, file, { upsert: false, contentType: file.type });
        if (up.error) throw new Error('Could not upload the proof, please try again.');
        proofUrl = supabase.storage.from('payment-proofs').getPublicUrl(path).data.publicUrl;
      }
      const { error } = await (supabase as any).rpc('access_record_payment', {
        p_password: sessionStorage.getItem('access_pw_v1') || '', p_invoice_id: invoiceId, p_amount: amt, p_date: date,
        p_method: method, p_reference: reference, p_notes: notes, p_proof_url: proofUrl, p_client_ref: clientRef.current,
      });
      if (error) throw error;
      toast.success('Payment recorded');
      onDone();
    } catch (e: any) { toast.error(e?.message || 'Failed to record payment'); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-sm text-xs">
        <DialogHeader><DialogTitle className="text-sm">Record payment · {invoiceNumber}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <div><Label className="text-xs">Amount (balance ${balance.toFixed(2)})</Label>
            <Input className="h-7 text-xs" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div><Label className="text-xs">Payment date</Label>
            <Input className="h-7 text-xs" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><Label className="text-xs">Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="paynow">PayNow</SelectItem>
                <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select></div>
          <div><Label className="text-xs">Reference</Label>
            <Input className="h-7 text-xs" value={reference} onChange={(e) => setReference(e.target.value)} /></div>
          <div><Label className="text-xs">Proof of payment (image){needsProof ? ' *' : ''}</Label>
            <Input className="h-7 text-xs" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
          <div><Label className="text-xs">Notes</Label>
            <Textarea className="text-xs" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" className="text-xs" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button size="sm" className="text-xs" onClick={submit} disabled={busy}>{busy && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}Record Payment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AccessRecordPaymentDialog;
