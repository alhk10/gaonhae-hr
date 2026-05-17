/**
 * Public grading payment page (no auth).
 * Mounted at /pay. Intended subdomain: payment.gaonhae.app.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarIcon, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/dateFormat';
import { getBeltLevelsForCountry } from '@/constants/beltLevels';
import PaymentInfoDisplay from '@/components/payment/PaymentInfoDisplay';
import ProofOfPaymentUpload from '@/components/payment/ProofOfPaymentUpload';
import {
  getPublicBranches,
  getPublicPaymentOptions,
  getPublicGradingProducts,
  submitGradingPayment,
} from '@/services/gradingPaymentSubmissionService';

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

const PublicGradingPayment: React.FC = () => {
  const [studentName, setStudentName] = useState('');
  const [branchId, setBranchId] = useState<string>('');
  const [dob, setDob] = useState<Date | undefined>();
  const [currentBelt, setCurrentBelt] = useState<string>('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
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

  const beltOptions = useMemo(
    () => getBeltLevelsForCountry(selectedBranch?.country),
    [selectedBranch?.country],
  );

  const isFoundation = FOUNDATION_BELTS.includes(currentBelt);

  const age = useMemo(() => (dob ? calcAge(dob) : null), [dob]);
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
  }, [currentBelt, branchId, gating.target]);

  // For non-foundation, auto-select the single matching product
  useEffect(() => {
    if (!isFoundation && productList.length === 1) {
      setSelectedProductIds([productList[0].product_id]);
    }
  }, [isFoundation, productList]);

  const toggleProduct = (productId: string, checked: boolean) => {
    setSelectedProductIds(prev =>
      checked ? Array.from(new Set([...prev, productId])) : prev.filter(id => id !== productId),
    );
  };

  const selectedItems = useMemo(
    () => productList.filter(p => selectedProductIds.includes(p.product_id)),
    [productList, selectedProductIds],
  );

  const subtotal = useMemo(
    () => selectedItems.reduce((sum, p) => sum + Number(p.branch_price ?? 0), 0),
    [selectedItems],
  );
  const gstAmount = isSingapore ? subtotal * GST_RATE : 0;
  const totalAmount = subtotal + gstAmount;

  const canSubmit =
    !!studentName.trim() &&
    !!branchId &&
    !!dob &&
    !!currentBelt &&
    !gating.blocked &&
    selectedItems.length > 0 &&
    !!proofFile &&
    !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !dob || !proofFile) return;
    setSubmitting(true);
    try {
      const result = await submitGradingPayment({
        student_name: studentName,
        branch_id: branchId,
        date_of_birth: dob.toISOString().split('T')[0],
        current_belt: currentBelt,
        items: selectedItems.map(p => ({
          product_id: p.product_id,
          amount: Number(p.branch_price ?? 0),
          current_belt: p.current_belt,
        })),
        resolved_grading_slot_id: options?.slot_id ?? null,
        payment_method: paymentMethod,
        proof_file: proofFile,
      });
      setSuccess({ refs: result.reference_numbers });
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
                  Your payment will be verified by our staff. You will receive
                  an invoice in your student profile once verified. Please keep
                  your reference number for your records.
                </AlertDescription>
              </Alert>
              <Button
                variant="outline"
                onClick={() => {
                  setSuccess(null);
                  setStudentName('');
                  setBranchId('');
                  setDob(undefined);
                  setCurrentBelt('');
                  setSelectedProductIds([]);
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
          <h1 className="text-2xl font-semibold">Grading Payment</h1>
          <p className="text-sm text-muted-foreground">
            Pay your grading fee securely
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Student Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Student Name</Label>
                <Input
                  id="name"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Full name"
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch">Branch</Label>
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
                <Label>Date of Birth</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !dob && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dob ? formatDate(dob) : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dob}
                      onSelect={setDob}
                      disabled={(d) => d > new Date()}
                      initialFocus
                      captionLayout="dropdown-buttons"
                      fromYear={1950}
                      toYear={new Date().getFullYear()}
                      className={cn('p-3 pointer-events-auto')}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="belt">Current Belt</Label>
                <Select
                  value={currentBelt}
                  onValueChange={setCurrentBelt}
                  disabled={!branchId}
                >
                  <SelectTrigger id="belt">
                    <SelectValue placeholder="Select current belt" />
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

              {branchId && currentBelt && gating.blocked && (
                <Alert variant="destructive">
                  <AlertDescription className="text-sm">{BLOCK_MSG}</AlertDescription>
                </Alert>
              )}

              {branchId && currentBelt && !gating.blocked && (
                <div className="rounded-md border p-3 bg-background space-y-2">
                  {isFoundation ? (
                    <>
                      <p className="text-xs text-muted-foreground">
                        Select one or more gradings
                      </p>
                      {productList.length === 0 ? (
                        <p className="text-sm text-destructive">
                          No grading fees configured for this branch.
                        </p>
                      ) : (
                        productList.map((p) => {
                          const checked = selectedProductIds.includes(p.product_id);
                          return (
                            <label
                              key={p.product_id}
                              className="flex items-center justify-between gap-2 cursor-pointer text-sm py-1"
                            >
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(v) => toggleProduct(p.product_id, !!v)}
                                />
                                <span>{p.product_name}</span>
                              </div>
                              <span className="font-medium">
                                ${Number(p.branch_price ?? 0).toFixed(2)}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </>
                  ) : loadingOptions ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : productList.length > 0 ? (
                    <div className="space-y-1 text-sm">
                      <p className="font-medium">{productList[0].product_name}</p>
                      <p className="text-lg font-semibold">
                        ${Number(productList[0].branch_price ?? 0).toFixed(2)}
                      </p>
                      {options?.slot_date && (
                        <p className="text-xs text-muted-foreground">
                          Next slot: {formatDate(options.slot_date)}
                          {options.slot_start ? ` at ${options.slot_start.slice(0, 5)}` : ''}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-destructive">
                      No grading fee configured for this belt. Please contact your branch.
                    </p>
                  )}

                  {selectedItems.length > 0 && (
                    <div className="border-t pt-2 text-sm space-y-1">
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
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicGradingPayment;
