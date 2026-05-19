/**
 * Public accessories payment page (no auth). Mounted at /accessories.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { getBeltLevelsForCountry } from '@/constants/beltLevels';
import PaymentInfoDisplay from '@/components/payment/PaymentInfoDisplay';
import ProofOfPaymentUpload from '@/components/payment/ProofOfPaymentUpload';
import {
  getPublicBranches,
  getPublicPaymentOptions,
} from '@/services/gradingPaymentSubmissionService';
import {
  getPublicAccessoryProducts,
  submitAccessoryPayment,
} from '@/services/accessoryPaymentSubmissionService';

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

const PublicAccessoriesPayment: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [branchId, setBranchId] = useState<string>('');
  const [dob, setDob] = useState<Date | undefined>();
  const [currentBelt, setCurrentBelt] = useState<string>('');
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = useState<'paynow' | 'bank_transfer'>('paynow');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ ref: string } | null>(null);

  const { data: branches = [] } = useQuery({
    queryKey: ['public-branches'],
    queryFn: getPublicBranches,
    staleTime: 5 * 60 * 1000,
  });

  const selectedBranch = useMemo(
    () => branches.find(b => b.id === branchId),
    [branches, branchId],
  );

  const beltOptions = useMemo(
    () => getBeltLevelsForCountry(selectedBranch?.country),
    [selectedBranch?.country],
  );

  const { data: products = [] } = useQuery({
    queryKey: ['public-accessory-products', branchId],
    queryFn: () => getPublicAccessoryProducts(branchId),
    enabled: !!branchId,
  });

  // Payment options (PayNow QR + bank info) — reuse grading RPC; pass any belt
  const { data: payOptions } = useQuery({
    queryKey: ['public-payment-options', branchId, 'accessory'],
    queryFn: () => getPublicPaymentOptions(branchId, 'White'),
    enabled: !!branchId,
  });

  useEffect(() => {
    if (currentBelt && !beltOptions.includes(currentBelt)) setCurrentBelt('');
  }, [beltOptions, currentBelt]);

  useEffect(() => {
    setQtyMap({});
  }, [branchId]);

  const setQty = (id: string, qty: number) => {
    setQtyMap(prev => {
      const next = { ...prev };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  };

  const items = useMemo(() => {
    return products
      .filter(p => (qtyMap[p.product_id] || 0) > 0)
      .map(p => {
        const qty = qtyMap[p.product_id];
        const unit = Number(p.branch_price ?? 0);
        return {
          product_id: p.product_id,
          name: p.product_name,
          qty,
          unit_price: unit,
          line_total: unit * qty,
        };
      });
  }, [products, qtyMap]);

  const totalAmount = useMemo(
    () => items.reduce((s, i) => s + i.line_total, 0),
    [items],
  );

  const emailValid = !email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const canSubmit =
    !!firstName.trim() &&
    !!lastName.trim() &&
    emailValid &&
    !!branchId &&
    !!dob &&
    items.length > 0 &&
    !!proofFile &&
    !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !dob || !proofFile) return;
    setSubmitting(true);
    try {
      const result = await submitAccessoryPayment({
        first_name: firstName,
        last_name: lastName,
        email: email.trim(),
        branch_id: branchId,
        date_of_birth: dob.toISOString().split('T')[0],
        current_belt: currentBelt || null,
        items,
        amount: totalAmount,
        payment_method: paymentMethod,
        proof_file: proofFile,
      });
      setSuccess({ ref: result.reference_number });
      toast.success('Payment submitted successfully');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to submit payment');
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
              <h1 className="text-2xl font-semibold">Payment Submitted</h1>
              <p className="text-muted-foreground">Your reference number is</p>
              <p className="text-2xl font-mono font-bold tracking-wider">{success.ref}</p>
              <Alert>
                <AlertDescription className="text-left text-sm">
                  Your order has been recorded and payment will be verified by
                  our staff. Please keep your reference number for your records.
                </AlertDescription>
              </Alert>
              <Button
                variant="outline"
                onClick={() => {
                  setSuccess(null);
                  setFirstName(''); setLastName(''); setEmail('');
                  setBranchId(''); setDob(undefined); setCurrentBelt('');
                  setQtyMap({}); setProofFile(null);
                }}
                className="w-full"
              >
                Submit Another Payment
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
          <h1 className="text-2xl font-semibold">Accessories Payment</h1>
          <p className="text-sm text-muted-foreground">
            Order protection guards and accessories
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Student Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input id="first_name" required value={firstName}
                    onChange={(e) => setFirstName(e.target.value.toUpperCase())}
                    placeholder="First name" maxLength={60} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input id="last_name" required value={lastName}
                    onChange={(e) => setLastName(e.target.value.toUpperCase())}
                    placeholder="Last name" maxLength={60} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" maxLength={255} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch">Branch *</Label>
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger id="branch"><SelectValue placeholder="Select branch" /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date of Birth *</Label>
                <DobPicker value={dob} onChange={setDob} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="belt">Current Belt</Label>
                <Select value={currentBelt} onValueChange={setCurrentBelt} disabled={!branchId}>
                  <SelectTrigger id="belt">
                    <SelectValue placeholder={!branchId ? 'Select branch first' : 'Select current belt (optional)'} />
                  </SelectTrigger>
                  <SelectContent>
                    {beltOptions.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {branchId && products.length > 0 && (
                <div className="space-y-2">
                  <Label>Products</Label>
                  <div className="rounded-md border divide-y">
                    {products.map((p) => {
                      const qty = qtyMap[p.product_id] || 0;
                      return (
                        <div key={p.product_id} className="flex items-center justify-between gap-2 p-2">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm truncate">{p.product_name}</div>
                            <div className="text-xs text-muted-foreground">${Number(p.branch_price ?? 0).toFixed(2)}</div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button type="button" size="icon" variant="outline" className="h-7 w-7"
                              onClick={() => setQty(p.product_id, qty - 1)} disabled={qty <= 0}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-6 text-center text-sm">{qty}</span>
                            <Button type="button" size="icon" variant="outline" className="h-7 w-7"
                              onClick={() => setQty(p.product_id, qty + 1)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {items.length > 0 && (
                <div className="rounded-md border p-3 bg-background text-sm space-y-1">
                  {items.map(i => (
                    <div key={i.product_id} className="flex items-center justify-between">
                      <span className="text-muted-foreground truncate pr-2">{i.name} × {i.qty}</span>
                      <span>${i.line_total.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between font-semibold border-t pt-1">
                    <span>Total</span>
                    <span>${totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {items.length > 0 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="payment-method">Payment Method</Label>
                    <Select
                      value={paymentMethod}
                      onValueChange={(v) => setPaymentMethod(v as 'paynow' | 'bank_transfer')}
                    >
                      <SelectTrigger id="payment-method"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paynow">PayNow</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {paymentMethod === 'paynow' ? (
                    <PaymentInfoDisplay paymentMethod="paynow" paynowQrUrl={qrUrl} />
                  ) : bankInfo ? (
                    <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm whitespace-pre-wrap">
                      {bankInfo}
                    </div>
                  ) : (
                    <Alert>
                      <AlertDescription className="text-sm">
                        Bank transfer details are not configured for this branch.
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}

              <ProofOfPaymentUpload
                value={proofFile}
                onChange={setProofFile}
                required
                acceptPdf={false}
              />

              <Button type="submit" className="w-full" disabled={!canSubmit}>
                {submitting ? 'Submitting...' : `Submit Payment${totalAmount > 0 ? ` ($${totalAmount.toFixed(2)})` : ''}`}
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

export default PublicAccessoriesPayment;
