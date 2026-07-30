/**
 * Public school fees payment page (no auth).
 * Mounted at /fees. Mirrors the /grading page structure.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { formatDate } from '@/utils/dateFormat';
import PaymentInfoDisplay from '@/components/payment/PaymentInfoDisplay';
import ProofOfPaymentUpload from '@/components/payment/ProofOfPaymentUpload';
import { getPublicBranches, getPublicPaymentOptions } from '@/services/gradingPaymentSubmissionService';
import {
  getPublicClassProducts,
  getPublicTermsForBranch,
  submitSchoolFeesPayment,
} from '@/services/schoolFeesSubmissionService';

const GST_RATE = 0.09;

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const feesSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(60),
  lastName: z.string().trim().min(1, 'Last name is required').max(60),
  email: z.string().trim().email('Please enter a valid email').max(255),
});

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

const PublicSchoolFeesPayment: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [branchId, setBranchId] = useState('');
  const [dob, setDob] = useState<Date | undefined>();
  const [termId, setTermId] = useState('');
  const [productId, setProductId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'paynow' | 'bank_transfer'>('paynow');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ ref: string } | null>(null);

  const { data: branches = [] } = useQuery({
    queryKey: ['public-branches'],
    queryFn: getPublicBranches,
    staleTime: 5 * 60 * 1000,
  });

  const selectedBranch = useMemo(() => branches.find(b => b.id === branchId), [branches, branchId]);
  const isSingapore = (selectedBranch?.country || '').toLowerCase() === 'singapore';

  const { data: options } = useQuery({
    queryKey: ['public-payment-options', branchId, 'fees'],
    queryFn: () => getPublicPaymentOptions(branchId, 'Foundation 1'),
    enabled: !!branchId,
  });

  const { data: terms = [] } = useQuery({
    queryKey: ['public-branch-terms', branchId],
    queryFn: () => getPublicTermsForBranch(branchId),
    enabled: !!branchId,
  });

  const { data: products = [], isFetching: loadingProducts } = useQuery({
    queryKey: ['public-class-products', branchId],
    queryFn: () => getPublicClassProducts(branchId),
    enabled: !!branchId,
  });

  // Default the term to the current one, else the next upcoming one.
  useEffect(() => {
    if (!terms.length) {
      setTermId('');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const current = terms.find(t => t.start_date <= today && t.end_date >= today);
    const upcoming = terms.find(t => t.start_date > today);
    setTermId((current || upcoming || terms[terms.length - 1]).term_id);
  }, [terms]);

  useEffect(() => {
    setProductId('');
  }, [branchId]);

  const selectedProduct = useMemo(
    () => products.find(p => p.product_id === productId) || null,
    [products, productId],
  );
  const selectedTerm = useMemo(() => terms.find(t => t.term_id === termId) || null, [terms, termId]);

  const termWeeks = useMemo(() => {
    if (!selectedTerm) return 12;
    const start = new Date(selectedTerm.start_date).getTime();
    const end = new Date(selectedTerm.end_date).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 12;
    const days = (end - start) / (1000 * 60 * 60 * 24) + 1;
    return Math.max(1, Math.round(days / 7));
  }, [selectedTerm]);

  const weeklyPrice = Number(selectedProduct?.branch_price ?? 0);
  const subtotal = weeklyPrice * termWeeks;
  const gstAmount = isSingapore ? subtotal * GST_RATE : 0;
  const totalAmount = subtotal + gstAmount;

  const parsed = feesSchema.safeParse({ firstName, lastName, email });

  const canSubmit =
    parsed.success && !!branchId && !!dob && !!selectedProduct && !!proofFile && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Please check your details');
      return;
    }
    if (!canSubmit || !dob || !proofFile || !selectedProduct) return;
    setSubmitting(true);
    try {
      const result = await submitSchoolFeesPayment({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        date_of_birth: dob.toISOString().split('T')[0],
        branch_id: branchId,
        product_id: selectedProduct.product_id,
        term_id: termId || null,
        amount: Number(totalAmount.toFixed(2)),
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
                  Your school fees payment has been recorded and will be verified by our
                  staff. Please keep your reference number for your records.
                </AlertDescription>
              </Alert>
              <Button
                variant="outline"
                onClick={() => {
                  setSuccess(null);
                  setFirstName('');
                  setLastName('');
                  setEmail('');
                  setBranchId('');
                  setDob(undefined);
                  setTermId('');
                  setProductId('');
                  setProofFile(null);
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

  const bankInfo = options?.bank_transfer_info;
  const qrUrl = options?.paynow_qr_url;

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="text-center">
          <img
            src="/lovable-uploads/gaonhae-logo-transparent.png"
            alt="Gaonhae Taekwondo"
            className="h-[67px] w-auto mx-auto mb-3"
          />
          <h1 className="text-2xl font-semibold">School Fees Payment</h1>
          <p className="text-sm text-muted-foreground">
            Pay your Gaonhae Taekwondo school fees securely
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
                  <Input
                    id="first_name"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value.toUpperCase())}
                    placeholder="First name"
                    maxLength={60}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value.toUpperCase())}
                    placeholder="Last name"
                    maxLength={60}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">Please use the student's full name.</p>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  maxLength={255}
                />
                <p className="text-xs text-muted-foreground">
                  Please ensure email is correct, confirmation will be sent to this email.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch">Branch *</Label>
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger id="branch">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
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
                <Label htmlFor="term">Term *</Label>
                <Select value={termId} onValueChange={setTermId} disabled={!branchId || terms.length === 0}>
                  <SelectTrigger id="term">
                    <SelectValue placeholder={!branchId ? 'Select branch first' : terms.length === 0 ? 'No terms available' : 'Select term'} />
                  </SelectTrigger>
                  <SelectContent>
                    {terms.map((t) => (
                      <SelectItem key={t.term_id} value={t.term_id}>
                        {t.term_name} ({formatDate(t.start_date)} – {formatDate(t.end_date)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="class-package">Class *</Label>
                <Select value={productId} onValueChange={setProductId} disabled={!branchId}>
                  <SelectTrigger id="class-package">
                    <SelectValue placeholder={!branchId ? 'Select branch first' : 'Select class'} />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.product_id} value={p.product_id}>
                        {p.product_name} — ${Number(p.branch_price).toFixed(2)}/wk × {termWeeks} = ${(Number(p.branch_price) * termWeeks).toFixed(2)}
                      </SelectItem>

                    ))}
                  </SelectContent>
                </Select>
                {selectedProduct?.description && (
                  <p className="text-xs text-muted-foreground">{selectedProduct.description}</p>
                )}
              </div>

              {branchId && !loadingProducts && products.length === 0 && (
                <Alert variant="destructive">
                  <AlertDescription className="text-sm">
                    No classes are configured for this branch. Please contact your branch.
                  </AlertDescription>
                </Alert>
              )}

              {selectedProduct && (
                <div className="rounded-md border p-3 bg-background text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {selectedProduct.product_name}
                      {selectedTerm ? ` — ${selectedTerm.term_name}` : ''}
                    </span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  {isSingapore && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">GST (9%)</span>
                      <span>${gstAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between font-semibold border-t pt-1">
                    <span>Total</span>
                    <span>${totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {selectedProduct && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="payment-method">Payment Method</Label>
                    <Select
                      value={paymentMethod}
                      onValueChange={(v) => setPaymentMethod(v as 'paynow' | 'bank_transfer')}
                    >
                      <SelectTrigger id="payment-method">
                        <SelectValue />
                      </SelectTrigger>
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

                  <ProofOfPaymentUpload
                    value={proofFile}
                    onChange={setProofFile}
                    required
                    acceptPdf={false}
                  />

                  <Button type="submit" className="w-full" disabled={!canSubmit}>
                    {submitting ? 'Submitting...' : `Submit Payment${totalAmount > 0 ? ` ($${totalAmount.toFixed(2)})` : ''}`}
                  </Button>
                </>
              )}
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

export default PublicSchoolFeesPayment;
