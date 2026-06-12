/**
 * Public competition payment page (no auth).
 * Mounted at /comps. Event-driven: admin defines events in /grading-list settings,
 * this page renders only the fields required by the selected event.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
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
  getPublicCompetitionEvents,
  submitCompetitionPayment,
  type CompetitionEvent,
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

const gstRateForCountry = (country?: string | null): number => {
  const c = (country || '').toLowerCase();
  if (c === 'singapore' || c === 'sg') return 0.09;
  if (c === 'australia' || c === 'au') return 0.10;
  return 0;
};

const PublicCompetitionPayment: React.FC = () => {
  const [eventId, setEventId] = useState<string>('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [branchId, setBranchId] = useState<string>('');
  const [dob, setDob] = useState<Date | undefined>();
  const [currentBelt, setCurrentBelt] = useState<string>('');
  const [gender, setGender] = useState<string>('');
  const [selectedExtras, setSelectedExtras] = useState<number[]>([]);
  const [coachingSelected, setCoachingSelected] = useState<boolean>(true);
  const [paymentMethod, setPaymentMethod] = useState<'paynow' | 'bank_transfer'>('paynow');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [indemnityClauseAccepted, setIndemnityClauseAccepted] = useState(false);
  const [indemnityFormFile, setIndemnityFormFile] = useState<File | null>(null);
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ ref: string } | null>(null);

  const { data: branches = [] } = useQuery({
    queryKey: ['public-branches'],
    queryFn: getPublicBranches,
    staleTime: 5 * 60 * 1000,
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['public-competition-events'],
    queryFn: getPublicCompetitionEvents,
    staleTime: 60 * 1000,
  });

  const activeEvents = useMemo(() => events.filter(e => e.is_active), [events]);
  const selectedEvent: CompetitionEvent | undefined = useMemo(
    () => activeEvents.find(e => e.id === eventId),
    [activeEvents, eventId],
  );

  // Auto-select if only one event
  useEffect(() => {
    if (!eventId && activeEvents.length === 1) setEventId(activeEvents[0].id);
  }, [activeEvents, eventId]);

  // When selected event changes, reset extras: required ones pre-selected; coaching reflects required flag
  useEffect(() => {
    if (!selectedEvent) return;
    const requiredIdx = selectedEvent.extra_lines
      .map((l, i) => (l.required ? i : -1))
      .filter(i => i >= 0);
    setSelectedExtras(requiredIdx);
    setCoachingSelected(selectedEvent.coaching_required !== false);
  }, [selectedEvent?.id]);

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
  const signatureRequired = !!(selectedEvent?.indemnity_clause && selectedEvent.indemnity_clause.trim().length > 0);

  const { data: options } = useQuery({
    queryKey: ['public-payment-options', branchId, currentBelt],
    queryFn: () => getPublicPaymentOptions(branchId, currentBelt || 'Foundation 1'),
    enabled: !!branchId,
  });

  const toggleExtra = (idx: number, checked: boolean) => {
    setSelectedExtras(prev =>
      checked ? Array.from(new Set([...prev, idx])) : prev.filter(x => x !== idx),
    );
  };

  const coachingAmount = Number(selectedEvent?.coaching_amount || 0);
  const coachingIncluded = !!selectedEvent && coachingSelected && coachingAmount > 0;

  const extrasTotal = useMemo(() => {
    if (!selectedEvent) return 0;
    return selectedExtras.reduce((sum, idx) => sum + Number(selectedEvent.extra_lines[idx]?.amount || 0), 0);
  }, [selectedEvent, selectedExtras]);

  const totalAmount = (coachingIncluded ? coachingAmount : 0) + extrasTotal;

  const canSubmit =
    !!selectedEvent &&
    !!firstName.trim() &&
    !!lastName.trim() &&
    !!email.trim() &&
    !!branchId &&
    !!dob &&
    !!currentBelt &&
    !!gender &&
    !!proofFile &&
    (!certificateRequired || !!certificateFile) &&
    (!signatureRequired || (!!signatureDataUrl && indemnityClauseAccepted)) &&
    (!selectedEvent.require_indemnity_form || !!indemnityFormFile) &&
    (!selectedEvent.require_passport || !!passportFile) &&
    (!selectedEvent.require_photo || !!photoFile) &&
    !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !selectedEvent || !dob || !proofFile) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const isoDob = `${dob.getFullYear()}-${String(dob.getMonth() + 1).padStart(2, '0')}-${String(dob.getDate()).padStart(2, '0')}`;
      const extras = selectedExtras
        .map(idx => selectedEvent.extra_lines[idx])
        .filter((l): l is { label: string; amount: number } => !!l)
        .map(l => ({ label: l.label, amount: Number(l.amount || 0) }));

      const result = await submitCompetitionPayment({
        first_name: firstName,
        last_name: lastName,
        email,
        branch_id: branchId,
        date_of_birth: isoDob,
        current_belt: currentBelt,
        amount: totalAmount,
        payment_method: paymentMethod,
        proof_file: proofFile,
        certificate_file: certificateFile,
        coaching_label: selectedEvent.coaching_label || selectedEvent.name,
        coaching_amount: coachingIncluded ? coachingAmount : 0,
        extra_lines: extras,
        event_id: selectedEvent.id,
        event_name: selectedEvent.name,
        gender,
        signature_data_url: signatureRequired ? signatureDataUrl : null,
        indemnity_form_file: selectedEvent.require_indemnity_form ? indemnityFormFile : null,
        passport_file: selectedEvent.require_passport ? passportFile : null,
        photo_file: selectedEvent.require_photo ? photoFile : null,
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
                  setBranchId(''); setDob(undefined); setCurrentBelt(''); setGender('');
                  setSelectedExtras([]); setProofFile(null); setCertificateFile(null);
                  setSignatureDataUrl(null); setIndemnityClauseAccepted(false);
                  setIndemnityFormFile(null); setPassportFile(null); setPhotoFile(null);
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
          <h1 className="text-2xl font-semibold">Competition Registration</h1>
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
              <div className="space-y-2">
                <Label htmlFor="event">Event *</Label>
                <Select value={eventId} onValueChange={setEventId} disabled={eventsLoading}>
                  <SelectTrigger id="event">
                    <SelectValue placeholder={eventsLoading ? 'Loading…' : 'Select event'} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeEvents.map(ev => (
                      <SelectItem key={ev.id} value={ev.id}>{ev.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!eventsLoading && activeEvents.length === 0 && (
                  <p className="text-xs text-muted-foreground">No active competition events. Please contact the academy.</p>
                )}
              </div>

              {selectedEvent && (
                <>
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

                  {coachingAmount > 0 && (
                    <div className="space-y-2">
                      <Label>Coaching Fee{selectedEvent.coaching_required ? ' *' : ''}</Label>
                      <div className="rounded-md border p-3 bg-muted/40">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={coachingSelected}
                            disabled={selectedEvent.coaching_required}
                            onCheckedChange={(v) =>
                              !selectedEvent.coaching_required && setCoachingSelected(v === true)
                            }
                          />
                          <Label className="text-sm font-normal flex-1">
                            {selectedEvent.coaching_label || selectedEvent.name}
                          </Label>
                          <span className="text-sm font-medium">
                            ${coachingAmount.toFixed(2)}
                          </span>
                        </div>
                        {selectedEvent.coaching_required && (
                          <p className="text-xs text-muted-foreground mt-1 ml-6">
                            Required for all participants
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedEvent.extra_lines.length > 0 && (
                    <div className="space-y-2">
                      <Label>Additional Items</Label>
                      <div className="space-y-2 rounded-md border p-3">
                        {selectedEvent.extra_lines.map((line, idx) => {
                          const checked = selectedExtras.includes(idx);
                          const required = line.required === true;
                          return (
                            <div key={idx} className="flex items-center gap-2">
                              <Checkbox
                                id={`extra-${idx}`}
                                checked={checked}
                                disabled={required}
                                onCheckedChange={(v) => !required && toggleExtra(idx, v === true)}
                              />
                              <Label htmlFor={`extra-${idx}`} className="text-sm font-normal flex-1 cursor-pointer">
                                {line.label}
                                {required && (
                                  <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">Required</span>
                                )}
                              </Label>
                              <span className="text-sm">${Number(line.amount).toFixed(2)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {totalAmount > 0 && (
                    <div className="rounded-md border p-3 bg-background text-sm space-y-1">
                      <div className="flex items-center justify-between font-semibold">
                        <span>Total</span>
                        <span>${totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {selectedEvent.require_photo && (
                    <FileField
                      label="Participant Photo"
                      value={photoFile}
                      onChange={setPhotoFile}
                      accept="image/*"
                      required
                      help="Clear face photo (passport-style)."
                    />
                  )}

                  {selectedEvent.require_passport && (
                    <FileField
                      label="Passport / Identification"
                      value={passportFile}
                      onChange={setPassportFile}
                      required
                    />
                  )}

                  {selectedEvent.require_indemnity_form && (
                    <FileField
                      label="Indemnity Form Upload"
                      value={indemnityFormFile}
                      onChange={setIndemnityFormFile}
                      required
                    />
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
                          checked={indemnityClauseAccepted}
                          onCheckedChange={(c) => setIndemnityClauseAccepted(c === true)}
                        />
                        <Label htmlFor="accept-indemnity" className="text-xs font-normal cursor-pointer">
                          I have read and agree to the indemnity clause above.
                        </Label>
                      </div>
                      <Label className="text-sm">Signature *</Label>
                      <SignaturePad value={signatureDataUrl} onChange={setSignatureDataUrl} />
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

export default PublicCompetitionPayment;
