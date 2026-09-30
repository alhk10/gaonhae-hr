/**
 * Dialogs for the /access School Fees tab: inline edit, add a second
 * payment screenshot, and request an overpayment to be added as credit.
 */
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/currencyUtils';
import {
  updateSchoolFeesRow, addSchoolFeesExtraProof, requestOverpaymentCredit, type SchoolFeesRow,
} from '@/services/schoolFeesSubmissionService';

/** Amount paid according to screenshots minus amount due (null when unknown). */
export const schoolFeesPaidDiff = (row: SchoolFeesRow): number | null => {
  if (row.paid_total == null) return null;
  return Math.round((Number(row.paid_total) - Number(row.amount || 0)) * 100) / 100;
};

interface BaseProps {
  row: SchoolFeesRow | null;
  onClose: () => void;
  onDone: () => void;
  actor: string;
}

export const SchoolFeesEditDialog: React.FC<BaseProps> = ({ row, onClose, onDone, actor }) => {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('paynow');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!row) return;
    setAmount(row.amount != null ? String(row.amount) : '');
    setMethod(row.payment_method || 'paynow');
    setEmail(row.contact_email || '');
    setReason('');
  }, [row]);

  const verified = row?.status === 'verified';

  const save = async () => {
    if (!row) return;
    const amt = amount.trim() === '' ? null : Number(amount);
    if (amt != null && (!isFinite(amt) || amt < 0)) { toast.error('Enter a valid amount'); return; }
    if (verified && !reason.trim()) { toast.error('Please give a reason for the superadmin'); return; }
    setBusy(true);
    try {
      const res = await updateSchoolFeesRow(row, {
        amount: amt,
        payment_method: method,
        email: row.source === 'hello' ? null : email,
        reason,
      }, actor);
      toast.success(res === 'requested' ? 'Change sent to superadmin for approval' : 'Saved');
      onDone();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Could not save');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Edit payment</DialogTitle>
          <DialogDescription className="text-xs">
            {row?.student_name || row?.contact_name}
            {verified && ' — already verified, changes need superadmin approval.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Amount paid</Label>
            <Input className="h-8 text-xs" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Payment method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="paynow">PayNow</SelectItem>
                <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {row?.source !== 'hello' && (
            <div>
              <Label className="text-xs">Contact email</Label>
              <Input className="h-8 text-xs" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          )}
          <div>
            <Label className="text-xs">Reason {verified ? '*' : ''}</Label>
            <Textarea className="text-xs" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button size="sm" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : verified ? 'Send for approval' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const SchoolFeesExtraProofDialog: React.FC<Omit<BaseProps, 'actor'>> = ({ row, onClose, onDone }) => {
  const [file, setFile] = useState<File | null>(null);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { setFile(null); setAmount(''); }, [row]);

  const diff = row ? schoolFeesPaidDiff(row) : null;

  const save = async () => {
    if (!row || !file) { toast.error('Choose a screenshot'); return; }
    const amt = amount.trim() === '' ? null : Number(amount);
    if (amt != null && (!isFinite(amt) || amt <= 0)) { toast.error('Enter the amount shown on the screenshot'); return; }
    setBusy(true);
    try {
      await addSchoolFeesExtraProof(row, file, amt);
      toast.success('Second payment screenshot added');
      onDone();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Add another payment screenshot</DialogTitle>
          <DialogDescription className="text-xs">
            Amount due {formatCurrency(Number(row?.amount || 0))}
            {row?.paid_total != null && <> · screenshots so far {formatCurrency(Number(row.paid_total))}</>}
            {diff != null && diff < 0 && <> · short {formatCurrency(-diff)}</>}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Input type="file" accept="image/*" className="text-xs" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <div>
            <Label className="text-xs">Amount on this screenshot</Label>
            <Input className="h-8 text-xs" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <p className="text-[11px] text-muted-foreground">The first screenshot is kept. Verification status does not change.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button size="sm" onClick={save} disabled={busy || !file}>{busy ? 'Uploading…' : 'Add screenshot'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const SchoolFeesOverpayDialog: React.FC<BaseProps> = ({ row, onClose, onDone, actor }) => {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!row) return;
    const d = schoolFeesPaidDiff(row);
    setAmount(d && d > 0 ? d.toFixed(2) : '');
    setReason('');
  }, [row]);

  const save = async () => {
    if (!row) return;
    const amt = Number(amount);
    if (!isFinite(amt) || amt <= 0) { toast.error('Enter a positive amount'); return; }
    setBusy(true);
    try {
      await requestOverpaymentCredit(row, amt, `Overpaid ${formatCurrency(amt)}${reason.trim() ? ` — ${reason.trim()}` : ''}`, actor);
      toast.success('Sent to superadmin for approval');
      onDone();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Could not send request');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Add overpayment to credits</DialogTitle>
          <DialogDescription className="text-xs">
            {row?.student_name} · due {formatCurrency(Number(row?.amount || 0))}
            {row?.paid_total != null && <> · paid {formatCurrency(Number(row.paid_total))}</>}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Credit amount</Label>
            <Input className="h-8 text-xs" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Note</Label>
            <Textarea className="text-xs" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <p className="text-[11px] text-muted-foreground">
            A superadmin must approve. Once approved, the credit is used automatically on the student's next invoice.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button size="sm" onClick={save} disabled={busy}>{busy ? 'Sending…' : 'Request approval'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
