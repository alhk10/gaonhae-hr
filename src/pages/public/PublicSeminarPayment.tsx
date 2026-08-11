/**
 * Public seminar booking page (no auth).
 * Mounted at /seminars. Event-driven mirror of /comps: admins define seminar
 * events (packages, indemnity, required uploads) in /access settings.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Download, FileText } from 'lucide-react';
import { formatDate } from '@/utils/dateFormat';
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
import SignaturePad from '@/components/common/SignaturePad';
import {
  getPublicBranches,
  getPublicPaymentOptions,
} from '@/services/gradingPaymentSubmissionService';
import {
  submitSeminarPayment,
  getPublicSeminarEvents,
  combineSeminarPackages,
  type SeminarPackageCode,
} from '@/services/seminarPaymentSubmissionService';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const POOM_BELTS = new Set(['1st Poom', '2nd Poom', '3rd Poom', '4th Poom']);
const DAN_BELTS = new Set(['1st Dan', '2nd Dan', '3rd Dan', '4th Dan', '5th Dan']);
const FOUNDATION_ALL = new Set(['Foundation', 'Foundation 1', 'Foundation 2', 'Foundation 3']);

const filterBeltsByAge = (belts: string[], age: number | null): string[] => {
  if (age === null) return belts;
  return belts.filter((b) => {
    if (FOUNDATION_ALL.has(b)) return age <= 5;
    if (POOM_BELTS.has(b)) return age < 15;
    if (DAN_BELTS.has(b)) return age >= 15;
    return true;
  });
};

const gstRateForCountry = (country?: string | null): number => {
  const c = (country || '').toLowerCase();
  if (c === 'singapore' || c === 'sg') return 0.09;
  if (c === 'australia' || c === 'au') return 0.10;
  return 0;
};

const calcAge = (dob: Date, ref: Date = new Date()): number => {
  let age = ref.getFullYear() - dob.getFullYear();
  const m = ref.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < dob.getDate())) age--;
  return age;
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

const PublicSeminarPayment: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [branchId, setBranchId] = useState<string>('');
  const [dob, setDob] = useState<Date | undefined>();
  const [gender, setGender] = useState<string>('');
  const [currentBelt, setCurrentBelt] = useState<string>('');
  const [eventId, setEventId] = useState<string>('');
  const [eventTouched, setEventTouched] = useState(false);
  const [packageCodes, setPackageCodes] = useState<SeminarPackageCode[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'paynow' | 'bank_transfer'>('paynow');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [gradingCardFile, setGradingCardFile] = useState<File | null>(null);
  const [indemnityFormFile, setIndemnityFormFile] = useState<File | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [indemnityAccepted, setIndemnityAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ ref: string } | null>(null);

  const { data: branches = [] } = useQuery({
    queryKey: ['public-branches'],
    queryFn: getPublicBranches,
    staleTime: 5 * 60 * 1000,
  });

  const { data: allEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['public-seminar-events'],
    queryFn: getPublicSeminarEvents,
    staleTime: 60 * 1000,
  });

  const events = useMemo(() => {
    return allEvents.filter((e) => {
      if (!e.is_active) return false;
      const branchOk = !e.branch_ids?.length || (!!branchId && e.branch_ids.includes(branchId));
      const beltOk = !e.belts?.length || (!!currentBelt && e.belts.includes(currentBelt));
      return branchOk && beltOk;
    });
  }, [allEvents, branchId, currentBelt]);

  // Keep the selection valid as branch / belt change; auto-pick when only one fits.
  useEffect(() => {
    if (eventId && !events.some(e => e.id === eventId)) {
      setEventId('');
      setPackageCodes([]);
      return;
    }
    if (!eventId && events.length === 1) setEventId(events[0].id);
  }, [events, eventId]);


  const selectedEvent = useMemo(
    () => events.find(e => e.id === eventId) || null,
    [events, eventId],
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

  const multiSelectAllowed = selectedEvent?.multi_package_discount === true;

  const selectedPackages = useMemo(
    () => (selectedEvent?.packages || []).filter(o => packageCodes.includes(o.code)),
    [selectedEvent, packageCodes],
  );

  const togglePackage = (code: SeminarPackageCode) => {
    setPackageCodes(prev => {
      if (!multiSelectAllowed) return [code];
      return prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code];
    });
  };

  const combined = useMemo(
    () => combineSeminarPackages(selectedPackages, multiSelectAllowed, selectedEvent?.min_packages ?? 2),
    [selectedPackages, multiSelectAllowed, selectedEvent?.min_packages],
  );

  const discountAmount = combined.discount_amount;
  const totalAmount = combined.amount;
  const gstRate = gstRateForCountry(selectedBranch?.country);
  const gstAmount = gstRate > 0 ? totalAmount - totalAmount / (1 + gstRate) : 0;

  const signatureRequired = !!(selectedEvent?.indemnity_clause && selectedEvent.indemnity_clause.trim().length > 0);
  const indemnityFormRequired = !!selectedEvent?.indemnity_template_url;

  const { data: options } = useQuery({
    queryKey: ['public-payment-options', branchId, currentBelt],
    queryFn: () => getPublicPaymentOptions(branchId, currentBelt || 'Foundation 1'),
    enabled: !!branchId,
  });

  const canSubmit =
    !!firstName.trim() &&
    !!lastName.trim() &&
    !!email.trim() &&
    !!branchId &&
    !!dob &&
    !!gender &&
    !!currentBelt &&
    !!selectedEvent &&
    selectedPackages.length > 0 &&
    !!proofFile &&
    (!selectedEvent?.require_passport || !!passportFile) &&
    (!selectedEvent?.require_photo || !!photoFile) &&
    (!selectedEvent?.require_grading_card || !!gradingCardFile) &&
    (!indemnityFormRequired || !!indemnityFormFile) &&
    (!signatureRequired || (!!signatureDataUrl && indemnityAccepted)) &&
    !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !dob || !proofFile || selectedPackages.length === 0 || !selectedEvent) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const isoDob = `${dob.getFullYear()}-${String(dob.getMonth() + 1).padStart(2, '0')}-${String(dob.getDate()).padStart(2, '0')}`;
      const result = await submitSeminarPayment({
        first_name: firstName,
        last_name: lastName,
        email,
        branch_id: branchId,
        date_of_birth: isoDob,
        gender,
        current_belt: currentBelt,
        event_id: selectedEvent.id,
        package_code: combined.package_code,
        package_label: combined.package_label,
        session_dates: combined.session_dates,
        amount: combined.amount,
        discount_amount: combined.discount_amount,
        payment_method: paymentMethod,
        proof_file: proofFile,
        passport_file: selectedEvent.require_passport ? passportFile : null,
        photo_file: selectedEvent.require_photo ? photoFile : null,
        grading_card_files: selectedEvent.require_grading_card && gradingCardFile ? [gradingCardFile] : [],
        indemnity_form_file: indemnityFormRequired ? indemnityFormFile : null,
        signature_data_url: signatureRequired ? signatureDataUrl : null,
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
              <h1 className="text-2xl font-semibold">Booking Submitted</h1>
              <p className="text-muted-foreground">Your reference number is</p>
              <p className="text-2xl font-mono font-bold tracking-wider">{success.ref}</p>
              <Alert>
                <AlertDescription className="text-left text-sm">
                  Your seminar booking has been recorded and payment will be verified
                  by our staff. Please keep your reference number for your records.
                </AlertDescription>
              </Alert>
              <Button
                variant="outline"
                onClick={() => {
                  setSuccess(null);
                  setFirstName(''); setLastName(''); setEmail('');
                  setDob(undefined); setGender(''); setCurrentBelt('');
                  setEventId(''); setPackageCodes([]);
                  setProofFile(null); setPassportFile(null); setPhotoFile(null);
                  setGradingCardFile(null); setIndemnityFormFile(null);
                  setSignatureDataUrl(null); setIndemnityAccepted(false);
                  setSubmitError(null);
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
          <h1 className="text-2xl font-semibold">Event Registration</h1>
          <p className="text-sm text-muted-foreground">
            {selectedEvent?.name || 'Enter your details, then choose an event'}
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
                <Label htmlFor="gender">Gender *</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="belt">Current Belt *</Label>
                <Select value={currentBelt} onValueChange={setCurrentBelt} disabled={!branchId}>
                  <SelectTrigger id="belt">
                    <SelectValue placeholder="Select current belt" />
                  </SelectTrigger>
                  <SelectContent>
                    {beltOptions.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div
                className={
                  eventTouched
                    ? 'space-y-2'
                    : 'space-y-2 rounded-lg border-2 border-amber-400 bg-amber-50 p-3 ring-2 ring-amber-200'
                }
              >
                <div className="flex items-center gap-2">
                  <Label htmlFor="seminar-event">Event *</Label>
                  {!eventTouched && (
                    <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Select
                    </span>
                  )}
                </div>
                <Select
                  value={eventId}
                  onValueChange={(v) => { setEventId(v); setEventTouched(true); setPackageCodes([]); }}
                  disabled={eventsLoading || events.length === 0}
                >
                  <SelectTrigger id="seminar-event" className={eventTouched ? undefined : 'border-amber-400 bg-background'}>
                    <SelectValue placeholder={eventsLoading ? 'Loading…' : (events.length ? 'Select event' : 'No open events')} />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((ev) => (
                      <SelectItem key={ev.id} value={ev.id}>{ev.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!eventsLoading && events.length > 0 && (
                  <p className={`text-xs ${eventTouched ? 'text-muted-foreground' : 'font-medium text-amber-700'}`}>
                    Events shown match your branch and belt. Please confirm you have selected the correct event.
                  </p>
                )}
                {!eventsLoading && events.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No open events for the selected branch and belt. Please contact the academy.
                  </p>
                )}
              </div>

              {selectedEvent && (
                <>
                  {(indemnityFormRequired ||
                    selectedEvent.require_passport ||
                    selectedEvent.require_photo ||
                    selectedEvent.require_grading_card) && (
                    <Alert className="border-primary/40 bg-primary/5">
                      <FileText className="h-4 w-4" />
                      <AlertDescription className="space-y-2">
                        <div className="text-sm font-semibold text-foreground">
                          Before you submit — documents required
                        </div>
                        <ol className="list-decimal pl-4 space-y-1 text-xs text-foreground/90">
                          {indemnityFormRequired && (
                            <li>Download the Indemnity Form, print it, fill it in, sign it, and reupload below.</li>
                          )}
                          {selectedEvent.require_passport && (
                            <li>Prepare a clear photo or scan of the participant&apos;s passport / NRIC.</li>
                          )}
                          {selectedEvent.require_photo && (
                            <li>Prepare a recent participant photo (head and shoulders).</li>
                          )}
                          {selectedEvent.require_grading_card && (
                            <li>Prepare a clear photo or scan of the participant&apos;s grading card.</li>
                          )}
                        </ol>
                        {indemnityFormRequired && (
                          <Button type="button" size="sm" variant="default" className="mt-1" asChild>
                            <a
                              href={selectedEvent.indemnity_template_url!}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={selectedEvent.indemnity_template_name || 'Indemnity-Form.pdf'}
                            >
                              <Download className="h-3.5 w-3.5 mr-1.5" />
                              Download Indemnity Form (PDF)
                            </a>
                          </Button>
                        )}
                        <p className="text-[11px] text-muted-foreground pt-1">
                          Accepted formats: PDF, JPG, PNG (max 5 MB each).
                        </p>
                      </AlertDescription>
                    </Alert>
                  )}


                  <div className="space-y-2">
                    <Label>Event Package{multiSelectAllowed ? 's' : ''} *</Label>
                    {multiSelectAllowed && (
                      <p className="text-xs text-muted-foreground">
                        Pick as many as you like — $10 off for 2, $20 for 3, $30 for 4, and $10 more for each extra.
                      </p>
                    )}
                    <div className="space-y-2 rounded-md border p-3">
                      {(selectedEvent.packages || []).length === 0 && (
                        <div className="text-sm text-muted-foreground">
                          No packages configured for this seminar.
                        </div>
                      )}
                      {(selectedEvent.packages || []).map((opt) => {
                        const checked = packageCodes.includes(opt.code);
                        return (
                          <label
                            key={opt.code}
                            className={`flex items-start gap-3 p-2 rounded-md cursor-pointer border ${
                              checked ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/50'
                            }`}
                          >
                            <input
                              type={multiSelectAllowed ? 'checkbox' : 'radio'}
                              name="seminar-package"
                              className="mt-1"
                              checked={checked}
                              onChange={() => togglePackage(opt.code)}
                            />
                            <div className="flex-1 text-sm">
                              <div className="font-medium">{opt.label}</div>
                              {opt.description && (
                                <div className="text-xs text-muted-foreground whitespace-pre-line">
                                  {opt.description}
                                </div>
                              )}
                              {opt.session_dates?.length > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  {opt.session_dates.map((d) => formatDate(d)).join(', ')}
                                </div>
                              )}
                            </div>
                            <span className="text-sm font-semibold whitespace-nowrap">
                              ${opt.amount.toFixed(2)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {selectedEvent.require_photo && (
                    <ProofOfPaymentUpload
                      value={photoFile}
                      onChange={setPhotoFile}
                      required
                      acceptPdf={false}
                      maxSizeMB={5}
                      label="Participant Photo"
                    />
                  )}

                  {selectedEvent.require_passport && (
                    <ProofOfPaymentUpload
                      value={passportFile}
                      onChange={setPassportFile}
                      required
                      acceptPdf
                      maxSizeMB={5}
                      label="Passport / NRIC"
                    />
                  )}

                  {selectedEvent.require_grading_card && (
                    <ProofOfPaymentUpload
                      value={gradingCardFile}
                      onChange={setGradingCardFile}
                      required
                      acceptPdf
                      maxSizeMB={5}
                      label="Grading Card"
                    />
                  )}

                  {indemnityFormRequired && (
                    <div className="space-y-2">
                      <ProofOfPaymentUpload
                        value={indemnityFormFile}
                        onChange={setIndemnityFormFile}
                        required
                        acceptPdf
                        maxSizeMB={5}
                        label="Signed Indemnity Form"
                      />
                      <p className="text-xs text-muted-foreground">
                        Upload the completed and signed indemnity form (PDF or photo).
                      </p>
                    </div>
                  )}

                  {signatureRequired && (
                    <div className="space-y-2">
                      <Label>Indemnity Clause *</Label>
                      <div className="border rounded-md p-3 bg-muted/30 max-h-48 overflow-y-auto whitespace-pre-wrap text-xs">
                        {selectedEvent.indemnity_clause}
                      </div>
                      <div className="flex items-start gap-2">
                        <Checkbox
                          id="accept-indemnity"
                          checked={indemnityAccepted}
                          onCheckedChange={(v) => setIndemnityAccepted(!!v)}
                        />
                        <Label htmlFor="accept-indemnity" className="text-xs font-normal leading-snug">
                          I have read and agree to the indemnity clause above.
                        </Label>
                      </div>
                      <Label className="text-xs">Signature *</Label>
                      <SignaturePad value={signatureDataUrl} onChange={setSignatureDataUrl} />
                    </div>
                  )}

                  {totalAmount > 0 && (
                    <div className="rounded-md border p-3 bg-background text-sm space-y-1">
                      {selectedPackages.length > 1 && (
                        <div className="flex items-center justify-between">
                          <span>{selectedPackages.length} packages</span>
                          <span>${combined.gross_amount.toFixed(2)}</span>
                        </div>
                      )}
                      {discountAmount > 0 && (
                        <div className="flex items-center justify-between text-green-700">
                          <span>Multi-package discount</span>
                          <span>-${discountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      {gstRate > 0 ? (
                        <>
                          <div className="flex items-center justify-between">
                            <span>Subtotal (excl. GST)</span>
                            <span>${(totalAmount - gstAmount).toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>GST ({(gstRate * 100).toFixed(0)}%)</span>
                            <span>${gstAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between font-semibold border-t pt-1 mt-1">
                            <span>Total (incl. GST)</span>
                            <span>${totalAmount.toFixed(2)}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-between font-semibold">
                          <span>Total</span>
                          <span>${totalAmount.toFixed(2)}</span>
                        </div>
                      )}
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
                    maxSizeMB={5}
                  />

                  {submitError && (
                    <Alert variant="destructive">
                      <AlertDescription className="text-sm break-words">{submitError}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" className="w-full" disabled={!canSubmit}>
                    {submitting
                      ? 'Submitting...'
                      : `Submit Payment${totalAmount > 0 ? ` ($${totalAmount.toFixed(2)})` : ''}`}
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

export default PublicSeminarPayment;
