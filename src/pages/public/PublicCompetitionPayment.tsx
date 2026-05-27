/**
 * Public competition payment page (no auth).
 * Mounted at /comps. Mirror of /pay for the Singapore Open Poomsae.
 */
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
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
  getCompetitionProducts,
  submitCompetitionPayment,
  type CompetitionProduct,
} from '@/services/competitionPaymentSubmissionService';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const POOM_BELTS = new Set(['1st Poom', '2nd Poom', '3rd Poom', '4th Poom']);
const DAN_BELTS = new Set(['1st Dan', '2nd Dan', '3rd Dan', '4th Dan', '5th Dan']);
const FOUNDATION_ALL = new Set(['Foundation', 'Foundation 1', 'Foundation 2', 'Foundation 3']);

const calcAge = (dob: Date, ref: Date = new Date()): number => {
  let age = ref.getFullYear() - dob.getFullYear();
  const m = ref.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < dob.getDate())) age--;
  return age;
};

const filterBeltsByAge = (belts: string[], age: number | null): string[] => {
  if (age === null) return belts;
  return belts.filter((b) => {
    if (FOUNDATION_ALL.has(b)) return age <= 5;
    if (POOM_BELTS.has(b)) return age < 15;
    if (DAN_BELTS.has(b)) return age >= 15;
    return true;
  });
};

const isPoomOrDan = (belt: string) => POOM_BELTS.has(belt) || DAN_BELTS.has(belt);

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

const PublicCompetitionPayment: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [branchId, setBranchId] = useState<string>('');
  const [dob, setDob] = useState<Date | undefined>();
  const [currentBelt, setCurrentBelt] = useState<string>('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'paynow' | 'bank_transfer'>('paynow');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ ref: string } | null>(null);

  const { data: branches = [] } = useQuery({
    queryKey: ['public-branches'],
    queryFn: getPublicBranches,
    staleTime: 5 * 60 * 1000,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['competition-products'],
    queryFn: getCompetitionProducts,
    staleTime: 5 * 60 * 1000,
  });

  const coachingProduct = useMemo<CompetitionProduct | undefined>(
    () => products.find(p => /coaching/i.test(p.name)),
    [products],
  );
  const categoryProducts = useMemo<CompetitionProduct[]>(
    () => products.filter(p => /category/i.test(p.name)),
    [products],
  );

  const selectedBranch = useMemo(
    () => branches.find(b => b.id === branchId),
    [branches, branchId],
  );

  const age = useMemo(() => (dob ? calcAge(dob) : null), [dob]);
  const beltOptions = useMemo(
    () => filterBeltsByAge(getBeltLevelsForCountry(selectedBranch?.country), age),
    [selectedBranch?.country, age],
  );

  const certificateRequired = currentBelt && isPoomOrDan(currentBelt);

  const { data: options } = useQuery({
    queryKey: ['public-payment-options', branchId, currentBelt],
    queryFn: () => getPublicPaymentOptions(branchId, currentBelt || 'Foundation 1'),
    enabled: !!branchId,
  });

  const toggleCategory = (id: string, checked: boolean) => {
    setSelectedCategoryIds(prev =>
      checked ? Array.from(new Set([...prev, id])) : prev.filter(x => x !== id),
    );
  };

  const productWithGstTotal = (p?: CompetitionProduct) => {
    if (!p) return 0;
    const base = Number(p.base_price || 0);
    return base + base * Number(p.tax_rate || 0) / 100;
  };

  const subtotal = useMemo(() => {
    let s = Number(coachingProduct?.base_price || 0);
    for (const id of selectedCategoryIds) {
      const cp = categoryProducts.find(p => p.id === id);
      s += Number(cp?.base_price || 0);
    }
    return s;
  }, [coachingProduct, categoryProducts, selectedCategoryIds]);

  const gstAmount = useMemo(() => {
    let g = Math.round(Number(coachingProduct?.base_price || 0) * Number(coachingProduct?.tax_rate || 0)) / 100;
    for (const id of selectedCategoryIds) {
      const cp = categoryProducts.find(p => p.id === id);
      g += Math.round(Number(cp?.base_price || 0) * Number(cp?.tax_rate || 0)) / 100;
    }
    return g;
  }, [coachingProduct, categoryProducts, selectedCategoryIds]);

  const totalAmount = subtotal + gstAmount;

  const canSubmit =
    !!firstName.trim() &&
    !!lastName.trim() &&
    !!email.trim() &&
    !!branchId &&
    !!dob &&
    !!currentBelt &&
    !!coachingProduct &&
    selectedCategoryIds.length >= 1 &&
    !!proofFile &&
    (!certificateRequired || !!certificateFile) &&
    !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !coachingProduct || !dob || !proofFile) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const isoDob = `${dob.getFullYear()}-${String(dob.getMonth() + 1).padStart(2, '0')}-${String(dob.getDate()).padStart(2, '0')}`;
      const result = await submitCompetitionPayment({
        first_name: firstName,
        last_name: lastName,
        email,
        branch_id: branchId,
        date_of_birth: isoDob,
        current_belt: currentBelt,
        coaching_product_id: coachingProduct.id,
        category_product_ids: selectedCategoryIds,
        amount: totalAmount,
        payment_method: paymentMethod,
        proof_file: proofFile,
        certificate_file: certificateFile,
      });
      setSuccess({ ref: result.reference_number });
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || 'Failed to submit payment';
      setSubmitError(msg);
      toast.error(msg);
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
              <h1 className="text-2xl font-semibold">Registration Submitted</h1>
              <p className="text-muted-foreground">Your reference number is</p>
              <p className="text-2xl font-mono font-bold tracking-wider">{success.ref}</p>
              <Alert>
                <AlertDescription className="text-left text-sm">
                  Your competition registration has been recorded and payment will be
                  verified by our staff. Please keep your reference number for your records.
                </AlertDescription>
              </Alert>
              <Button
                variant="outline"
                onClick={() => {
                  setSuccess(null);
                  setFirstName(''); setLastName(''); setEmail('');
                  setBranchId(''); setDob(undefined); setCurrentBelt('');
                  setSelectedCategoryIds([]); setProofFile(null); setCertificateFile(null);
                }}
                className="w-full"
              >
                Submit Another Registration
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
          <h1 className="text-2xl font-semibold">Singapore Open Poomsae</h1>
          <p className="text-sm text-muted-foreground">
            Registration &amp; coaching payment
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registration Details</CardTitle>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch">Branch *</Label>
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger id="branch">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date of Birth *</Label>
                <DobPicker value={dob} onChange={setDob} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="belt">Current Belt *</Label>
                <Select
                  value={currentBelt}
                  onValueChange={setCurrentBelt}
                  disabled={!branchId || !dob}
                >
                  <SelectTrigger id="belt">
                    <SelectValue placeholder={!dob ? 'Select date of birth first' : 'Select current belt'} />
                  </SelectTrigger>
                  <SelectContent>
                    {beltOptions.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {certificateRequired && (
                <div className="space-y-2">
                  <ProofOfPaymentUpload
                    value={certificateFile}
                    onChange={setCertificateFile}
                    required
                    acceptPdf={false}
                    maxSizeMB={5}
                    label="Certificate Upload (Poom/Dan)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Please upload a clear photo of your Poom or Dan certificate.
                  </p>
                </div>
              )}

              {dob && currentBelt && coachingProduct && (
                <div className="space-y-2">
                  <Label>Coaching Fee *</Label>
                  <div className="rounded-md border p-3 bg-muted/40">
                    <div className="flex items-center gap-2">
                      <Checkbox checked disabled />
                      <Label className="text-sm font-normal flex-1">
                        {coachingProduct.name}
                      </Label>
                      <span className="text-sm font-medium">
                        ${productWithGstTotal(coachingProduct).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-6">
                      Required for all participants
                    </p>
                  </div>
                </div>
              )}

              {dob && currentBelt && categoryProducts.length > 0 && (
                <div className="space-y-2">
                  <Label>Event Categories * <span className="text-muted-foreground font-normal">(select at least one)</span></Label>
                  <div className="space-y-2 rounded-md border p-3">
                    {categoryProducts.map((p) => {
                      const checked = selectedCategoryIds.includes(p.id);
                      return (
                        <div key={p.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`cat-${p.id}`}
                            checked={checked}
                            onCheckedChange={(c) => toggleCategory(p.id, c === true)}
                          />
                          <Label htmlFor={`cat-${p.id}`} className="text-sm font-normal flex-1 cursor-pointer">
                            {p.name}
                          </Label>
                          <span className="text-sm">${productWithGstTotal(p).toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {dob && currentBelt && (coachingProduct || selectedCategoryIds.length > 0) && (
                <div className="rounded-md border p-3 bg-background text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">GST (9%)</span>
                    <span>${gstAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between font-semibold border-t pt-1">
                    <span>Total</span>
                    <span>${totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              )}

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

              {submitError && (
                <Alert variant="destructive">
                  <AlertDescription className="text-sm break-words">{submitError}</AlertDescription>
                </Alert>
              )}

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

export default PublicCompetitionPayment;
