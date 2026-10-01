/**
 * Public studio rental booking + payment form (no auth). Mounted at /rental.
 * Prices are recalculated server-side by submit_studio_rental.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { PhoneInput } from '@/components/ui/phone-input';
import { Plus, Trash2, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import SignaturePad from '@/components/common/SignaturePad';
import PaymentInfoDisplay from '@/components/payment/PaymentInfoDisplay';
import ProofOfPaymentUpload from '@/components/payment/ProofOfPaymentUpload';
import { getPublicPaymentOptions } from '@/services/gradingPaymentSubmissionService';
import { assertValidPaymentProof, newClientRef } from '@/utils/publicPaymentValidation';
import { formatCurrency } from '@/utils/currencyUtils';
import { formatDate, toISODate } from '@/utils/dateFormat';
import {
  buildAgreementText, getRentalSettings, quoteRental, submitRental, type RentalSession,
} from '@/services/studioRentalService';

const TIMES = Array.from({ length: 34 }, (_, i) => {
  const mins = 6 * 60 + i * 30; // 06:00 → 22:30
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
});
const hoursBetween = (a: string, b: string) => {
  const [ah, am] = a.split(':').map(Number); const [bh, bm] = b.split(':').map(Number);
  return (bh * 60 + bm - ah * 60 - am) / 60;
};

interface Row { date?: Date; start: string; end: string }

const PublicStudioRental: React.FC = () => {
  const [branchId, setBranchId] = useState('');
  const [name, setName] = useState('');
  const [nric, setNric] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [rows, setRows] = useState<Row[]>([{ start: '09:00', end: '10:00' }]);
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [method, setMethod] = useState<'paynow' | 'bank_transfer'>('paynow');
  const [proof, setProof] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ reference: string; total: number } | null>(null);
  const clientRef = useRef(newClientRef());

  useEffect(() => { document.title = 'Studio Rental Booking | Gaonhae Taekwondo'; }, []);

  const { data: settings = [], isLoading } = useQuery({ queryKey: ['studio-rental-settings'], queryFn: getRentalSettings });
  const branches = settings.filter(s => s.enabled);
  const cfg = branches.find(b => b.branch_id === branchId);
  const isAU = /australia|^au$/i.test(cfg?.country || '');
  const currency = isAU ? 'AUD' : 'SGD';

  const { data: payOpts } = useQuery({
    queryKey: ['public-payment-options', branchId],
    queryFn: () => getPublicPaymentOptions(branchId, 'Foundation 1'),
    enabled: !!branchId,
  });
  useEffect(() => { if (isAU) setMethod('bank_transfer'); }, [isAU]);

  const sessions: RentalSession[] = useMemo(() => rows
    .filter(r => r.date && hoursBetween(r.start, r.end) >= 1)
    .map(r => ({ date: toISODate(r.date!), start: r.start, end: r.end })), [rows]);
  const rowsValid = rows.length > 0 && rows.every(r => r.date && hoursBetween(r.start, r.end) >= 1);

  const { data: quote, error: quoteError, isFetching: quoting } = useQuery({
    queryKey: ['studio-rental-quote', branchId, nric.trim().toUpperCase(), email.trim().toLowerCase(), sessions],
    queryFn: () => quoteRental(branchId, nric, email, sessions),
    enabled: !!branchId && rowsValid && sessions.length > 0,
    retry: false,
  });

  const agreementText = cfg ? buildAgreementText({
    branchName: cfg.branch_name, renterName: name.trim().toUpperCase(), nric: nric.trim().toUpperCase(),
    contact, hourly: cfg.hourly_rate, discounted: cfg.discounted_rate,
    threshold: cfg.monthly_threshold_hours, deposit: cfg.deposit_amount, lawCountry: 'Singapore',
  }) : '';

  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const canSubmit = !!cfg && name.trim().length >= 2 && nric.trim().length >= 4 && contact.trim().length >= 6
    && emailOk && rowsValid && !!quote && agreed && !!signature && !!proof && !submitting;

  const updateRow = (i: number, patch: Partial<Row>) =>
    setRows(rs => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const handleSubmit = async () => {
    if (!cfg || !signature || !proof) return;
    try {
      assertValidPaymentProof(proof);
      setSubmitting(true);
      const res = await submitRental({
        clientRef: clientRef.current, branchId, renterName: name, nric, contact, email,
        sessions, agreementText, signature, paymentMethod: method, proofFile: proof,
      });
      setDone({ reference: res.reference, total: Number(res.total_amount) });
      window.scrollTo({ top: 0 });
    } catch (e: any) {
      toast.error(e?.message || 'Could not submit your booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-muted/30 p-4 flex items-start justify-center">
        <Card className="max-w-lg w-full mt-10">
          <CardContent className="pt-6 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 mx-auto text-primary" />
            <h1 className="text-xl font-semibold">Booking received</h1>
            <p className="text-sm text-muted-foreground">
              Reference <span className="font-mono font-medium text-foreground">{done.reference}</span> ·
              {' '}{formatCurrency(done.total, currency)}
            </p>
            <p className="text-sm">Your booking is pending confirmation. We will check your payment and confirm availability shortly.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-3 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-4 text-left">
        <header className="!text-center py-2">
          <h1 className="text-2xl font-bold">Studio Rental Booking</h1>
          <p className="text-sm text-muted-foreground">Gaonhae Taekwondo</p>
        </header>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">1. Branch & renter details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Branch *</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger><SelectValue placeholder={isLoading ? 'Loading…' : 'Select branch'} /></SelectTrigger>
                <SelectContent>
                  {branches.map(b => <SelectItem key={b.branch_id} value={b.branch_id}>{b.branch_name}</SelectItem>)}
                </SelectContent>
              </Select>
              {!isLoading && branches.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">Studio rental is not open for booking right now.</p>
              )}
              {cfg && (
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(cfg.hourly_rate, currency)}/hour · {formatCurrency(cfg.discounted_rate, currency)}/hour for all hours once you exceed {cfg.monthly_threshold_hours} hours in a month · {formatCurrency(cfg.deposit_amount, currency)} deposit on first booking
                </p>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>Renter name *</Label><Input value={name} maxLength={150} onChange={e => setName(e.target.value.toUpperCase())} /></div>
              <div><Label>NRIC / UEN *</Label><Input value={nric} maxLength={30} onChange={e => setNric(e.target.value.toUpperCase())} /></div>
              <div><Label>Contact number *</Label><PhoneInput value={contact} onChange={setContact} /></div>
              <div><Label>Email *</Label><Input type="email" value={email} maxLength={255} onChange={e => setEmail(e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">2. Sessions</CardTitle>
            <CardDescription>Minimum 1 hour, in 30-minute steps. Bookings are subject to availability.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {rows.map((r, i) => {
              const h = hoursBetween(r.start, r.end);
              return (
                <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
                  <DatePicker selected={r.date} onSelect={d => updateRow(i, { date: d })} placeholder="Date" />
                  <Select value={r.start} onValueChange={v => updateRow(i, { start: v })}>
                    <SelectTrigger className="w-[88px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{TIMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={r.end} onValueChange={v => updateRow(i, { end: v })}>
                    <SelectTrigger className="w-[88px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{TIMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button type="button" variant="ghost" size="icon" disabled={rows.length === 1}
                    onClick={() => setRows(rs => rs.filter((_, idx) => idx !== i))} aria-label="Remove session">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <p className={`col-span-4 text-xs -mt-1 ${h < 1 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {r.date ? formatDate(r.date) : 'Pick a date'} · {h < 1 ? 'At least 1 hour' : `${h} hour${h === 1 ? '' : 's'}`}
                  </p>
                </div>
              );
            })}
            <Button type="button" variant="outline" size="sm"
              onClick={() => setRows(rs => [...rs, { start: rs[rs.length - 1]?.start || '09:00', end: rs[rs.length - 1]?.end || '10:00' }])}>
              <Plus className="h-4 w-4 mr-1" /> Add session
            </Button>

            {quoteError && <p className="text-sm text-destructive">{(quoteError as any).message}</p>}
            {quote && (
              <div className="rounded-md border p-3 text-sm space-y-1 bg-background">
                {quote.months.map(m => (
                  <div key={m.month} className="flex justify-between">
                    <span>{m.month} · {m.hours}h × {formatCurrency(m.rate, currency)}{m.previous_hours > 0 ? ` (${m.previous_hours}h already booked)` : ''}</span>
                    <span>{formatCurrency(m.amount, currency)}</span>
                  </div>
                ))}
                {quote.gst_amount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>GST ({Math.round(quote.gst_rate * 100)}%{quote.gst_inclusive ? ' included' : ''})</span>
                    <span>{formatCurrency(quote.gst_amount, currency)}</span>
                  </div>
                )}
                {quote.deposit_amount > 0 && (
                  <div className="flex justify-between"><span>Security deposit (first booking)</span><span>{formatCurrency(quote.deposit_amount, currency)}</span></div>
                )}
                <div className="flex justify-between font-semibold border-t pt-1">
                  <span>Total to pay</span><span>{formatCurrency(quote.total_amount, currency)}</span>
                </div>
              </div>
            )}
            {quoting && <p className="text-xs text-muted-foreground">Calculating…</p>}
          </CardContent>
        </Card>

        {cfg && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">3. Studio Rental Agreement</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="max-h-80 overflow-y-auto rounded-md border bg-background p-3 text-xs whitespace-pre-wrap leading-relaxed">
                {agreementText}
              </div>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox checked={agreed} onCheckedChange={v => setAgreed(!!v)} className="mt-0.5" />
                I have read and agree to the Studio Rental Agreement.
              </label>
              <div>
                <Label>Renter signature *</Label>
                <SignaturePad value={signature} onChange={setSignature} />
                <p className="text-xs text-muted-foreground mt-1">Date: {formatDate(new Date())}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {cfg && quote && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">4. Payment</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {!isAU && (
                <Select value={method} onValueChange={v => setMethod(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paynow">PayNow</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <PaymentInfoDisplay paymentMethod={method} bankTransferInfo={(payOpts as any)?.bank_transfer_info} paynowQrUrl={(payOpts as any)?.paynow_qr_url} />
              <ProofOfPaymentUpload value={proof} onChange={setProof} required label="Payment screenshot *" />
              <Button className="w-full" disabled={!canSubmit} onClick={handleSubmit}>
                {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting…</> : `Submit booking · ${formatCurrency(quote.total_amount, currency)}`}
              </Button>
              {!canSubmit && !submitting && (
                <p className="text-xs text-muted-foreground text-center">Complete all fields, tick the agreement, sign and upload your payment screenshot.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PublicStudioRental;
