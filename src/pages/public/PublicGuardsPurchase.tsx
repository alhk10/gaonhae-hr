/**
 * Public guards purchase page (no auth). Mounted at /guards.
 * Mirrors /pay flow: buyer details + product selection + payment + proof upload.
 */
import React, { useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import PaymentInfoDisplay from '@/components/payment/PaymentInfoDisplay';
import ProofOfPaymentUpload from '@/components/payment/ProofOfPaymentUpload';
import { getBeltLevelsForCountry } from '@/constants/beltLevels';
import { useBranches } from '@/hooks/useBranches';
import {
  GUARDS_CATALOG,
  GST_RATE,
  submitGuardsPurchase,
  type GuardsProductKey,
} from '@/services/guardsPurchaseService';
import { getPublicPaymentOptions } from '@/services/gradingPaymentSubmissionService';
import { useQuery } from '@tanstack/react-query';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const DobPicker: React.FC<{ value: Date | undefined; onChange: (d: Date | undefined) => void }> = ({ value, onChange }) => {
  const currentYear = new Date().getFullYear();
  const [day, setDay] = useState<string>(value ? String(value.getDate()) : '');
  const [month, setMonth] = useState<string>(value ? String(value.getMonth()) : '');
  const [year, setYear] = useState<string>(value ? String(value.getFullYear()) : '');
  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = currentYear; y >= 1950; y--) arr.push(y);
    return arr;
  }, [currentYear]);
  const daysInMonth = useMemo(() => {
    const m = month === '' ? 0 : parseInt(month);
    const y = year === '' ? 2000 : parseInt(year);
    return new Date(y, m + 1, 0).getDate();
  }, [month, year]);
  const commit = (d: string, m: string, y: string) => {
    if (d && m !== '' && y) {
      const dayNum = Math.min(parseInt(d), new Date(parseInt(y), parseInt(m) + 1, 0).getDate());
      onChange(new Date(parseInt(y), parseInt(m), dayNum));
    } else {
      onChange(undefined);
    }
  };
  return (
    <div className="grid grid-cols-3 gap-2">
      <Select value={day} onValueChange={(v) => { setDay(v); commit(v, month, year); }}>
        <SelectTrigger><SelectValue placeholder="Day" /></SelectTrigger>
        <SelectContent>
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
            <SelectItem key={d} value={String(d)}>{d}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={month} onValueChange={(v) => { setMonth(v); commit(day, v, year); }}>
        <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
        <SelectContent>
          {MONTHS.map((name, i) => (
            <SelectItem key={i} value={String(i)}>{name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={year} onValueChange={(v) => { setYear(v); commit(day, month, v); }}>
        <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
        <SelectContent>
          {years.map(y => (
            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

const PublicGuardsPurchase: React.FC = () => {
  const { branches } = useBranches();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState<Date | undefined>();
  const [branchId, setBranchId] = useState('');
  const [gender, setGender] = useState('');
  const [currentBelt, setCurrentBelt] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [qty, setQty] = useState<Record<GuardsProductKey, number>>({ gaonhae_set: 0, adidas_set: 0 });
  const [paymentMethod, setPaymentMethod] = useState<'paynow' | 'bank_transfer'>('paynow');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ ref: string | null } | null>(null);

  const selectedBranch = useMemo(() => branches.find(b => b.id === branchId), [branches, branchId]);
  const isSingapore = (selectedBranch?.country || '').toLowerCase() === 'singapore';
  const beltOptions = useMemo(() => getBeltLevelsForCountry(selectedBranch?.country || null), [selectedBranch?.country]);

  const { data: payOptions } = useQuery({
    queryKey: ['public-payment-options-guards', branchId],
    queryFn: () => getPublicPaymentOptions(branchId, 'White'),
    enabled: !!branchId,
  });

  const items = useMemo(() => GUARDS_CATALOG.map(p => ({
    ...p,
    qty: qty[p.key] || 0,
  })), [qty]);

  const cartItems = items.filter(i => i.qty > 0);
  const totalInc = cartItems.reduce((s, i) => s + i.priceInc * i.qty, 0);
  const gstAmount = isSingapore ? totalInc - totalInc / (1 + GST_RATE) : 0;
  const subtotalEx = totalInc - gstAmount;

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit = !!firstName.trim() && !!lastName.trim() && !!dob && !!branchId
    && emailValid
    && cartItems.length > 0 && !!proofFile && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !dob || !proofFile) return;
    setSubmitting(true);
    try {
      const result = await submitGuardsPurchase({
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dob.toISOString().split('T')[0],
        branch_id: branchId,
        gender,
        current_belt: currentBelt === 'No belt' ? null : currentBelt,
        email,
        phone,
        items: cartItems.map(i => ({
          key: i.key,
          label: i.label,
          qty: i.qty,
          unit_price_inc: i.priceInc,
        })),
        payment_method: paymentMethod,
        proof_file: proofFile,
        is_singapore: isSingapore,
      });
      setSuccess({ ref: result.reference_number });
      toast.success('Order submitted successfully');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to submit order');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-muted/30 py-8 px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
              <h1 className="text-2xl font-semibold">Order Submitted</h1>
              {success.ref && (
                <>
                  <p className="text-muted-foreground">Your reference number is</p>
                  <p className="text-2xl font-mono font-bold tracking-wider">{success.ref}</p>
                </>
              )}
              <Alert>
                <AlertDescription className="text-left text-sm">
                  Your order has been recorded and payment will be verified by our staff.
                  You will be notified when your items are ready for collection.
                </AlertDescription>
              </Alert>
              <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
                Submit Another Order
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const bankInfo = payOptions?.bank_transfer_info;
  const qrUrl = payOptions?.paynow_qr_url;

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="text-center">
          <img
            src="/lovable-uploads/gaonhae-logo-transparent.png"
            alt="Gaonhae Taekwondo"
            className="h-[67px] w-auto mx-auto mb-3"
          />
          <h1 className="text-2xl font-semibold">Protection Guards Order</h1>
          <p className="text-sm text-muted-foreground">Order your Gaonhae or Adidas protection gear</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Your Details</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>First Name *</Label>
                  <Input required value={firstName} onChange={e => setFirstName(e.target.value.toUpperCase())} maxLength={60} />
                </div>
                <div className="space-y-2">
                  <Label>Last Name *</Label>
                  <Input required value={lastName} onChange={e => setLastName(e.target.value.toUpperCase())} maxLength={60} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Date of Birth *</Label>
                <DobPicker value={dob} onChange={setDob} />
              </div>

              <div className="space-y-2">
                <Label>Branch *</Label>
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                  <SelectContent>
                    {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Gender *</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Current Belt *</Label>
                  <Select value={currentBelt} onValueChange={setCurrentBelt} disabled={!branchId}>
                    <SelectTrigger><SelectValue placeholder={!branchId ? 'Select branch first' : 'Select'} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="No belt">No belt</SelectItem>
                      {beltOptions.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} maxLength={255} />
              </div>

              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="+65 9123 4567" maxLength={30} />
              </div>

              <div className="space-y-2">
                <Label>Items *</Label>
                <div className="space-y-3 rounded-md border p-3">
                  {GUARDS_CATALOG.map(p => {
                    const q = qty[p.key] || 0;
                    return (
                      <div key={p.key} className="space-y-2">
                        <div className="flex items-start gap-2">
                          <Checkbox
                            id={`item-${p.key}`}
                            checked={q > 0}
                            onCheckedChange={(c) => setQty(prev => ({ ...prev, [p.key]: c ? 1 : 0 }))}
                          />
                          <div className="flex-1">
                            <Label htmlFor={`item-${p.key}`} className="text-sm font-medium cursor-pointer">
                              {p.label} — ${p.priceInc.toFixed(2)}
                            </Label>
                            <p className="text-xs text-muted-foreground">{p.description}</p>
                          </div>
                        </div>
                        {q > 0 && (
                          <div className="flex items-center gap-2 pl-6">
                            <Label className="text-xs">Qty</Label>
                            <Input
                              type="number"
                              min={1}
                              max={10}
                              value={q}
                              onChange={e => setQty(prev => ({ ...prev, [p.key]: Math.max(1, parseInt(e.target.value) || 1) }))}
                              className="h-7 w-16"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {cartItems.length > 0 && (
                <div className="rounded-md border p-3 bg-background text-sm space-y-1">
                  {isSingapore && (
                    <>
                      <div className="flex justify-between"><span className="text-muted-foreground">Subtotal (ex GST)</span><span>${subtotalEx.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">GST (9%)</span><span>${gstAmount.toFixed(2)}</span></div>
                    </>
                  )}
                  <div className="flex justify-between font-semibold border-t pt-1"><span>Total</span><span>${totalInc.toFixed(2)}</span></div>
                </div>
              )}

              {cartItems.length > 0 && (
                <>
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paynow">PayNow</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {paymentMethod === 'paynow' ? (
                    <PaymentInfoDisplay paymentMethod="paynow" paynowQrUrl={qrUrl} />
                  ) : bankInfo ? (
                    <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm whitespace-pre-wrap">{bankInfo}</div>
                  ) : (
                    <Alert><AlertDescription className="text-sm">Bank transfer details are not configured for this branch.</AlertDescription></Alert>
                  )}
                </>
              )}

              <ProofOfPaymentUpload value={proofFile} onChange={setProofFile} required acceptPdf={false} />

              <Button type="submit" className="w-full" disabled={!canSubmit}>
                {submitting ? 'Submitting...' : `Submit Order${totalInc > 0 ? ` ($${totalInc.toFixed(2)})` : ''}`}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Gaonhae Taekwondo LLP | www.gaonhaetaekwondo.com
        </p>
      </div>
    </div>
  );
};

export default PublicGuardsPurchase;
