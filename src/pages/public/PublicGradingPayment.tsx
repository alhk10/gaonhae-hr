/**
 * Public grading payment page (no auth).
 * Mounted at /pay. Intended subdomain: payment.gaonhae.app.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { formatDate } from '@/utils/dateFormat';
import { getBeltLevelsForCountry } from '@/constants/beltLevels';
import PaymentInfoDisplay from '@/components/payment/PaymentInfoDisplay';
import ProofOfPaymentUpload from '@/components/payment/ProofOfPaymentUpload';
import {
  getPublicBranches,
  getPublicPaymentOptions,
  getPublicGradingProducts,
  getPublicGradingSlots,
  submitGradingPayment,
} from '@/services/gradingPaymentSubmissionService';
import { supabase } from '@/integrations/supabase/client';

const FOUNDATION_BELTS = ['Foundation 1', 'Foundation 2', 'Foundation 3'];
const GST_RATE = 0.09;

const calcAge = (dob: Date, ref: Date = new Date()): number => {
  let age = ref.getFullYear() - dob.getFullYear();
  const m = ref.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < dob.getDate())) age--;
  return age;
};

const BLOCK_MSG = 'We are unable to process your grading. Please speak to a master for more information.';

/**
 * Resolve target belt and block-state for age-gated current belts.
 * Returns { target: string | null, blocked: boolean }.
 * target = null when no age gating applies (use existing prefix match).
 */
const resolveAgeGating = (
  currentBelt: string,
  age: number | null,
): { target: string | null; blocked: boolean } => {
  if (age === null) return { target: null, blocked: false };
  const under15 = age < 15;
  switch (currentBelt) {
    case 'Black Tip':
      return { target: under15 ? '1st Poom' : '1st Dan', blocked: false };
    case '1st Poom':
      return under15 ? { target: '2nd Poom', blocked: false } : { target: null, blocked: true };
    case '2nd Poom':
      return under15 ? { target: '3rd Poom', blocked: false } : { target: null, blocked: true };
    case '3rd Poom':
      return under15 ? { target: '4th Poom', blocked: false } : { target: null, blocked: true };
    default:
      return { target: null, blocked: false };
  }
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const POOM_BELTS = new Set(['1st Poom', '2nd Poom', '3rd Poom', '4th Poom']);
const DAN_BELTS = new Set(['1st Dan', '2nd Dan', '3rd Dan', '4th Dan', '5th Dan']);
const FOUNDATION_ALL = new Set(['Foundation', 'Foundation 1', 'Foundation 2', 'Foundation 3']);

const monthsSinceBirth = (dob: Date, ref: Date = new Date()): number => {
  let months = (ref.getFullYear() - dob.getFullYear()) * 12 + (ref.getMonth() - dob.getMonth());
  if (ref.getDate() < dob.getDate()) months--;
  return months;
};

const filterBeltsByAge = (belts: string[], age: number | null, dob?: Date | null): string[] => {
  if (age === null) return belts;
  // Foundation buffer: allow up to 6 years + 3 months (75 months) so children who just turned 6 can still grade.
  const foundationOk = dob ? monthsSinceBirth(dob) <= 75 : age <= 5;
  return belts.filter((b) => {
    if (FOUNDATION_ALL.has(b)) return foundationOk;
    if (POOM_BELTS.has(b)) return age < 15;
    if (DAN_BELTS.has(b)) return age >= 15;
    return true;
  });
};

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

const PublicGradingPayment: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [branchId, setBranchId] = useState<string>('');
  const [dob, setDob] = useState<Date | undefined>();
  const [currentBelt, setCurrentBelt] = useState<string>('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'paynow' | 'bank_transfer'>('paynow');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ refs: string[] } | null>(null);

  const { data: branches = [] } = useQuery({
    queryKey: ['public-branches'],
    queryFn: getPublicBranches,
    staleTime: 5 * 60 * 1000,
  });

  const selectedBranch = useMemo(
    () => branches.find(b => b.id === branchId),
    [branches, branchId],
  );

  const age = useMemo(() => (dob ? calcAge(dob) : null), [dob]);

  const beltOptions = useMemo(
    () => filterBeltsByAge(getBeltLevelsForCountry(selectedBranch?.country), age, dob),
    [selectedBranch?.country, age, dob],
  );

  const isFoundation = FOUNDATION_BELTS.includes(currentBelt);

  const gating = useMemo(() => resolveAgeGating(currentBelt, age), [currentBelt, age]);
  const isSingapore = (selectedBranch?.country || '').toLowerCase() === 'singapore';

  // For non-foundation: keep existing single-product + slot lookup
  const { data: options, isFetching: loadingOptions } = useQuery({
    queryKey: ['public-payment-options', branchId, currentBelt],
    queryFn: () => getPublicPaymentOptions(branchId, currentBelt),
    enabled: !!branchId && !!currentBelt,
  });

  // Foundation: fetch all three transitions with branch pricing.
  // Non-foundation: fetch single matching product (with optional explicit target for age-gated belts).
  const beltsForLookup = useMemo(
    () => (isFoundation ? FOUNDATION_BELTS : currentBelt ? [currentBelt] : []),
    [isFoundation, currentBelt],
  );

  const targetsForLookup = useMemo<(string | null)[] | undefined>(() => {
    if (isFoundation || !currentBelt) return undefined;
    if (gating.target) return [gating.target];
    return undefined;
  }, [isFoundation, currentBelt, gating.target]);

  const { data: productList = [] } = useQuery({
    queryKey: [
      'public-grading-products',
      branchId,
      beltsForLookup.join(','),
      (targetsForLookup || []).join(','),
    ],
    queryFn: () => getPublicGradingProducts(branchId, beltsForLookup, targetsForLookup),
    enabled: !!branchId && beltsForLookup.length > 0 && !gating.blocked,
  });

  // Reset belt if branch country changes and current belt is invalid
  useEffect(() => {
    if (currentBelt && !beltOptions.includes(currentBelt)) {
      setCurrentBelt('');
    }
  }, [beltOptions, currentBelt]);

  // Reset selections when belt, branch, or age-gating target changes
  useEffect(() => {
    setSelectedProductIds([]);
    setSelectedSlotId('');
  }, [currentBelt, branchId, gating.target]);

  // Auto-select products: single match for non-foundation; all visible for foundation
  useEffect(() => {
    if (!isFoundation && productList.length === 1) {
      setSelectedProductIds([productList[0].product_id]);
    }
  }, [isFoundation, productList]);

  // Foundation: filter to transitions whose source-belt index >= currentBelt index, sorted.
  const visibleProducts = useMemo(() => {
    if (!isFoundation) return productList;
    const currentIdx = FOUNDATION_BELTS.indexOf(currentBelt);
    const withIdx = productList
      .map((p) => {
        const m = /Foundation\s*(\d)/i.exec(p.product_name || '');
        const srcIdx = m ? Number(m[1]) - 1 : -1;
        return { p, srcIdx };
      })
      .filter((x) => x.srcIdx >= 0 && x.srcIdx >= currentIdx)
      .sort((a, b) => a.srcIdx - b.srcIdx);
    return withIdx.map((x) => x.p);
  }, [productList, isFoundation, currentBelt]);

  // Foundation: auto-select all visible grading transitions
  useEffect(() => {
    if (isFoundation && visibleProducts.length > 0) {
      setSelectedProductIds(visibleProducts.map((p) => p.product_id));
    }
  }, [isFoundation, visibleProducts]);

  const toggleProduct = (productId: string, checked: boolean) => {
    if (isFoundation) {
      const idx = visibleProducts.findIndex((p) => p.product_id === productId);
      if (idx === -1) return;
      if (checked) {
        // Include this and all preceding visible items
        const idsToAdd = visibleProducts.slice(0, idx + 1).map((p) => p.product_id);
        setSelectedProductIds((prev) => Array.from(new Set([...prev, ...idsToAdd])));
      } else {
        // Remove this and all following visible items
        const idsToRemove = new Set(visibleProducts.slice(idx).map((p) => p.product_id));
        setSelectedProductIds((prev) => prev.filter((id) => !idsToRemove.has(id)));
      }
      return;
    }
    setSelectedProductIds((prev) =>
      checked ? Array.from(new Set([...prev, productId])) : prev.filter((id) => id !== productId),
    );
  };

  const selectedItems = useMemo(
    () => productList.filter(p => selectedProductIds.includes(p.product_id)),
    [productList, selectedProductIds],
  );

  const dobIso = useMemo(() => (dob ? dob.toISOString().split('T')[0] : null), [dob]);

  // Reset slot when product selection, DOB, or current belt changes
  useEffect(() => {
    setSelectedSlotId('');
  }, [selectedProductIds.join(','), dobIso, currentBelt]);

  // Slot eligibility is driven by belt + age + branch (and the slot's own gating).
  // We intentionally do NOT filter by selected transition product, so Stage slots
  // (Stage 1-3, Stage 4-10, Stage 11-26, Foundation Video Test) remain visible.
  const { data: slotList = [] } = useQuery({
    queryKey: ['public-grading-slots', branchId, dobIso, currentBelt],
    queryFn: () => getPublicGradingSlots(branchId, [], dobIso, currentBelt || null),
    enabled: !!branchId,
  });

  // Age-gate slots by parsed target belt (Poom = age <15, Dan = age >=15).
  // Stage slots (Stage 1..26) are kept — they apply to both Poom and Dan.
  const filteredSlotList = useMemo(() => {
    if (age === null) return slotList;
    return slotList.filter((s: any) => {
      const stageName: string = s.stage_product_name || '';
      if (/^\s*stage\s+\d+/i.test(stageName)) return true;
      const title: string = s.title || '';
      const idx = title.lastIndexOf('>>');
      const target = (idx >= 0 ? title.slice(idx + 2) : title).toLowerCase();
      if (target.includes('poom')) return age < 15;
      if (target.includes('dan')) return age >= 15;
      return true;
    });
  }, [slotList, age]);

  useEffect(() => {
    if (selectedSlotId && !filteredSlotList.some((s: any) => s.id === selectedSlotId)) {
      setSelectedSlotId('');
    }
  }, [filteredSlotList, selectedSlotId]);

  const selectedSlot = useMemo(
    () => filteredSlotList.find(s => s.id === selectedSlotId) || null,
    [filteredSlotList, selectedSlotId],
  );

  // When the selected slot is a Stage slot, override the product/price with the Stage product.
  const effectiveItems = useMemo(() => {
    if (selectedSlot?.stage_product_id) {
      return [{
        product_id: selectedSlot.stage_product_id,
        product_name: selectedSlot.stage_product_name || 'Stage',
        branch_price: Number(selectedSlot.stage_product_branch_price ?? 0),
        current_belt: currentBelt,
      }];
    }
    return selectedItems.map(p => ({
      product_id: p.product_id,
      product_name: p.product_name,
      branch_price: Number(p.branch_price ?? 0),
      current_belt: p.current_belt,
    }));
  }, [selectedSlot, selectedItems, currentBelt]);

  const subtotal = useMemo(
    () => effectiveItems.reduce((sum, p) => sum + Number(p.branch_price ?? 0), 0),
    [effectiveItems],
  );
  const gstAmount = isSingapore ? subtotal * GST_RATE : 0;
  const totalAmount = subtotal + gstAmount;

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const canSubmit =
    !!firstName.trim() &&
    !!lastName.trim() &&
    emailValid &&
    !!branchId &&
    !!dob &&
    !!currentBelt &&
    !gating.blocked &&
    effectiveItems.length > 0 &&
    !!selectedSlotId &&
    !!proofFile &&
    !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !dob || !proofFile) return;
    setSubmitting(true);
    try {
      const result = await submitGradingPayment({
        first_name: firstName,
        last_name: lastName,
        email: email.trim(),
        branch_id: branchId,
        date_of_birth: dob.toISOString().split('T')[0],
        current_belt: currentBelt,
        items: effectiveItems.map(p => ({
          product_id: p.product_id,
          amount: Number(p.branch_price ?? 0),
          current_belt: p.current_belt,
        })),
        resolved_grading_slot_id: selectedSlotId || options?.slot_id || null,
        payment_method: paymentMethod,
        proof_file: proofFile,
      });
      setSuccess({ refs: result.reference_numbers });
      toast.success('Payment submitted successfully');

      // Fire-and-forget confirmation email
      if (selectedSlot) {
        const dt = new Date(`${selectedSlot.grading_date}T${(selectedSlot.start_time || '00:00:00').slice(0,8)}`);
        const dateStr = `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
        const timeStr = selectedSlot.start_time ? selectedSlot.start_time.slice(0,5) : '';
        try {
          await supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'grading-confirmation',
              recipientEmail: email.trim(),
              idempotencyKey: `grading-${result.ids[0]}`,
              templateData: {
                studentName: `${firstName.trim()} ${lastName.trim()}`.toUpperCase(),
                products: effectiveItems.map(p => p.product_name),
                dateTime: `${dateStr}${timeStr ? ' at ' + timeStr : ''}`,
                branchName: selectedSlot.branch_name,
                branchAddress: selectedSlot.branch_address || '',
              },
            },
          });
        } catch (mailErr) {
          console.warn('Failed to send confirmation email', mailErr);
        }
      }
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
              <p className="text-muted-foreground">
                Your reference {success.refs.length > 1 ? 'numbers are' : 'number is'}
              </p>
              <div className="space-y-1">
                {success.refs.map(r => (
                  <p key={r} className="text-2xl font-mono font-bold tracking-wider">
                    {r}
                  </p>
                ))}
              </div>
              <Alert>
                <AlertDescription className="text-left text-sm">
                  Your registration has been recorded and payment will be
                  verified by our staff. Please keep your reference number for
                  your records.
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
                  setCurrentBelt('');
                  setSelectedProductIds([]);
                  setSelectedSlotId('');
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
          <h1 className="text-2xl font-semibold">Grading Payment</h1>
          <p className="text-sm text-muted-foreground">
            Pay your Gaonhae Taekwondo grading fee securely
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
              <p className="text-xs text-muted-foreground -mt-2">Please use your full name.</p>

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
                <p className="text-xs text-muted-foreground">Please ensure email is correct, confirmation will be sent to this email.</p>
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
                <Label htmlFor="belt">Current Belt</Label>
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
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isFoundation && branchId && !gating.blocked && visibleProducts.length > 0 && (
                <div className="space-y-2">
                  <Label>Grading</Label>
                  <div className="space-y-2 rounded-md border p-3">
                    {visibleProducts.map((p) => {
                      const checked = selectedProductIds.includes(p.product_id);
                      return (
                        <div key={p.product_id} className="flex items-center gap-2">
                          <Checkbox
                            id={`grading-${p.product_id}`}
                            checked={checked}
                            onCheckedChange={(c) => toggleProduct(p.product_id, c === true)}
                          />
                          <Label htmlFor={`grading-${p.product_id}`} className="text-sm font-normal cursor-pointer">
                            {p.product_name} — ${Number(p.branch_price ?? 0).toFixed(2)}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {branchId && currentBelt && gating.blocked && (
                <Alert variant="destructive">
                  <AlertDescription className="text-sm">{BLOCK_MSG}</AlertDescription>
                </Alert>
              )}

              {branchId && currentBelt && !gating.blocked && !loadingOptions && productList.length === 0 && (
                <Alert variant="destructive">
                  <AlertDescription className="text-sm">
                    No grading fee configured for this belt. Please contact your branch.
                  </AlertDescription>
                </Alert>
              )}

              {branchId && currentBelt && !gating.blocked && selectedProductIds.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="slot">Grading Slot</Label>
                  <Select value={selectedSlotId} onValueChange={setSelectedSlotId}>
                    <SelectTrigger id="slot">
                      <SelectValue placeholder={filteredSlotList.length === 0 ? 'No upcoming slots available' : 'Select grading slot'} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSlotList.map((s) => {
                        const [y, m, d] = s.grading_date.split('-');
                        const dateLbl = `${d}/${m}/${y}`;
                        const timeLbl = s.start_time ? ` ${s.start_time.slice(0, 5)}` : '';
                        const label = s.title?.trim() || `${dateLbl}${timeLbl}`;
                        return (
                          <SelectItem key={s.id} value={s.id}>
                            {label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedItems.length > 0 && (
                <div className="rounded-md border p-3 bg-background text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
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

              {selectedItems.length > 0 && (
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
                    <PaymentInfoDisplay
                      paymentMethod="paynow"
                      paynowQrUrl={qrUrl}
                    />
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

              {selectedSlotId && (
                <>
                  <ProofOfPaymentUpload
                    value={proofFile}
                    onChange={setProofFile}
                    required
                    acceptPdf={false}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!canSubmit}
                  >
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

export default PublicGradingPayment;
