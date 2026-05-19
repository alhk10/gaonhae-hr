/**
 * Public accessories payment page (no auth). Mounted at /accessories.
 * Buyers pick from 4 hardcoded bundles; bundles are expanded into per-component
 * line items on submit so invoices reference real products.
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
  type AccessoryItem,
} from '@/services/accessoryPaymentSubmissionService';
import {
  ACCESSORY_BUNDLES,
  resolveComponentProductId,
  type Gender,
} from '@/constants/accessoryBundles';

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

/** Per-bundle selection state */
interface BundleState {
  qty: number;
  gender: Gender | null;
  /** keyed by component index */
  sizes: Record<number, string>;
}

const emptyBundleState = (): BundleState => ({ qty: 0, gender: null, sizes: {} });

const PublicAccessoriesPayment: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [branchId, setBranchId] = useState<string>('');
  const [dob, setDob] = useState<Date | undefined>();
  const [currentBelt, setCurrentBelt] = useState<string>('');
  const [bundleStates, setBundleStates] = useState<Record<string, BundleState>>({});
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

  // Used only to look up branch-overridden prices for component product ids
  const { data: products = [] } = useQuery({
    queryKey: ['public-accessory-products', branchId],
    queryFn: () => getPublicAccessoryProducts(branchId),
    enabled: !!branchId,
  });

  const priceById = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products) m.set(p.product_id, Number(p.branch_price ?? 0));
    return m;
  }, [products]);

  const { data: payOptions } = useQuery({
    queryKey: ['public-payment-options', branchId, 'accessory'],
    queryFn: () => getPublicPaymentOptions(branchId, 'White'),
    enabled: !!branchId,
  });

  useEffect(() => {
    if (currentBelt && !beltOptions.includes(currentBelt)) setCurrentBelt('');
  }, [beltOptions, currentBelt]);

  useEffect(() => {
    setBundleStates({});
  }, [branchId]);

  const getState = (key: string): BundleState =>
    bundleStates[key] ?? emptyBundleState();

  const updateState = (key: string, patch: Partial<BundleState>) => {
    setBundleStates(prev => ({
      ...prev,
      [key]: { ...emptyBundleState(), ...(prev[key] ?? {}), ...patch },
    }));
  };

  /** Bundle unit price = sum of component branch prices (gender-resolved) */
  const bundleUnitPrice = (bundleKey: string, gender: Gender | null): number => {
    const bundle = ACCESSORY_BUNDLES.find(b => b.key === bundleKey);
    if (!bundle) return 0;
    let total = 0;
    for (const c of bundle.components) {
      const pid = resolveComponentProductId(c, gender);
      if (pid) total += priceById.get(pid) ?? 0;
    }
    return total;
  };

  const bundleReady = (bundleKey: string): boolean => {
    const bundle = ACCESSORY_BUNDLES.find(b => b.key === bundleKey);
    if (!bundle) return false;
    const s = getState(bundleKey);
    if (s.qty <= 0) return false;
    if (bundle.requiresGender && !s.gender) return false;
    for (let i = 0; i < bundle.components.length; i++) {
      if (!s.sizes[i]) return false;
    }
    return true;
  };

  /** Cart preview (one line per bundle) */
  const cart = useMemo(() => {
    return ACCESSORY_BUNDLES
      .map(b => {
        const s = getState(b.key);
        if (s.qty <= 0) return null;
        const unit = bundleUnitPrice(b.key, s.gender);
        return {
          key: b.key,
          name: b.name,
          qty: s.qty,
          unit,
          line_total: unit * s.qty,
          ready: bundleReady(b.key),
        };
      })
      .filter(Boolean) as Array<{ key: string; name: string; qty: number; unit: number; line_total: number; ready: boolean }>;
  }, [bundleStates, priceById]);

  const totalAmount = useMemo(
    () => cart.reduce((s, i) => s + i.line_total, 0),
    [cart],
  );

  const allCartReady = cart.length > 0 && cart.every(c => c.ready);

  const emailValid = !email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const canSubmit =
    !!firstName.trim() &&
    !!lastName.trim() &&
    emailValid &&
    !!branchId &&
    !!dob &&
    allCartReady &&
    !!proofFile &&
    !submitting;

  /** Expand bundles to per-component line items for storage */
  const buildItems = (): AccessoryItem[] => {
    const items: AccessoryItem[] = [];
    for (const b of ACCESSORY_BUNDLES) {
      const s = getState(b.key);
      if (s.qty <= 0) continue;
      b.components.forEach((c, idx) => {
        const pid = resolveComponentProductId(c, s.gender);
        if (!pid) return;
        const unit = priceById.get(pid) ?? 0;
        const size = s.sizes[idx] || '';
        const colorSuffix = c.color ? ` (${c.color})` : '';
        const sizeSuffix = size ? ` – ${size}` : '';
        items.push({
          product_id: pid,
          name: `${c.label}${colorSuffix}${sizeSuffix}`,
          qty: s.qty,
          unit_price: unit,
          line_total: unit * s.qty,
          // extra bundle metadata for the admin list
          bundle_key: b.key,
          bundle_name: b.name,
          size: size || undefined,
          color: c.color,
        } as AccessoryItem);
      });
    }
    return items;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !dob || !proofFile) return;
    setSubmitting(true);
    try {
      const items = buildItems();
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
                  setBundleStates({}); setProofFile(null);
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

              {branchId && (
                <div className="space-y-2">
                  <Label>Bundles</Label>
                  <div className="space-y-3">
                    {ACCESSORY_BUNDLES.map((bundle) => {
                      const s = getState(bundle.key);
                      const unit = bundleUnitPrice(bundle.key, s.gender);
                      return (
                        <div key={bundle.key} className="rounded-md border p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium">{bundle.name}</div>
                              <div className="text-xs text-muted-foreground">
                                ${unit.toFixed(2)} per set
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button type="button" size="icon" variant="outline" className="h-7 w-7"
                                onClick={() => updateState(bundle.key, { qty: Math.max(0, s.qty - 1) })}
                                disabled={s.qty <= 0}>
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-6 text-center text-sm">{s.qty}</span>
                              <Button type="button" size="icon" variant="outline" className="h-7 w-7"
                                onClick={() => updateState(bundle.key, { qty: s.qty + 1 })}>
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          {s.qty > 0 && (
                            <div className="space-y-2 pt-1">
                              {bundle.requiresGender && (
                                <div className="space-y-1">
                                  <Label className="text-xs">Gender *</Label>
                                  <Select
                                    value={s.gender ?? ''}
                                    onValueChange={(v) => updateState(bundle.key, { gender: v as Gender })}
                                  >
                                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select gender" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="male">Male</SelectItem>
                                      <SelectItem value="female">Female</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                              <div className="grid grid-cols-1 gap-2">
                                {bundle.components.map((c, idx) => (
                                  <div key={idx} className="space-y-1">
                                    <Label className="text-xs">{c.label} – Size *</Label>
                                    <Select
                                      value={s.sizes[idx] ?? ''}
                                      onValueChange={(v) => updateState(bundle.key, { sizes: { ...s.sizes, [idx]: v } })}
                                    >
                                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select size" /></SelectTrigger>
                                      <SelectContent>
                                        {c.sizeOptions.map(sz => (
                                          <SelectItem key={sz} value={sz}>{sz}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {cart.length > 0 && (
                <div className="rounded-md border p-3 bg-background text-sm space-y-1">
                  {cart.map(i => (
                    <div key={i.key} className="flex items-center justify-between">
                      <span className="text-muted-foreground truncate pr-2">{i.name} × {i.qty}</span>
                      <span>${i.line_total.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between font-semibold border-t pt-1">
                    <span>Total</span>
                    <span>${totalAmount.toFixed(2)}</span>
                  </div>
                  {!allCartReady && (
                    <p className="text-xs text-destructive pt-1">
                      Please select gender (where required) and a size for every item.
                    </p>
                  )}
                </div>
              )}

              {cart.length > 0 && (
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
