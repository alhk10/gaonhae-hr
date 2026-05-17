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
  submitGradingPayment,
} from '@/services/gradingPaymentSubmissionService';

const PublicGradingPayment: React.FC = () => {
  const [studentName, setStudentName] = useState('');
  const [branchId, setBranchId] = useState<string>('');
  const [dob, setDob] = useState<Date | undefined>();
  const [currentBelt, setCurrentBelt] = useState<string>('');
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

  const { data: options, isFetching: loadingOptions } = useQuery({
    queryKey: ['public-payment-options', branchId, currentBelt],
    queryFn: () => getPublicPaymentOptions(branchId, currentBelt),
    enabled: !!branchId && !!currentBelt,
  });

  // Reset belt if branch country changes and current belt is invalid
  useEffect(() => {
    if (currentBelt && !beltOptions.includes(currentBelt)) {
      setCurrentBelt('');
    }
  }, [beltOptions, currentBelt]);

  const canSubmit =
    !!studentName.trim() &&
    !!branchId &&
    !!dob &&
    !!currentBelt &&
    !!options?.product_id &&
    !!proofFile &&
    !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !dob || !options?.product_id || !proofFile) return;
    setSubmitting(true);
    try {
      const result = await submitGradingPayment({
        student_name: studentName,
        branch_id: branchId,
        date_of_birth: dob.toISOString().split('T')[0],
        current_belt: currentBelt,
        resolved_product_id: options.product_id,
        resolved_grading_slot_id: options.slot_id ?? null,
        amount: options.product_price ?? null,
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
              <p className="text-muted-foreground">
                Your reference number is
              </p>
              <p className="text-3xl font-mono font-bold tracking-wider">
                {success.ref}
              </p>
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

              {branchId && currentBelt && (
                <div className="rounded-md border p-3 bg-background">
                  {loadingOptions ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : options?.product_id ? (
                    <div className="space-y-1 text-sm">
                      <p className="font-medium">{options.product_name}</p>
                      <p className="text-lg font-semibold">
                        ${Number(options.product_price ?? 0).toFixed(2)}
                      </p>
                      {options.slot_date && (
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
                </div>
              )}

              {options?.product_id && (
                <PaymentInfoDisplay
                  paymentMethod="paynow"
                  paynowQrUrl={options.paynow_qr_url}
                />
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
                {submitting ? 'Submitting...' : 'Submit Payment'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicGradingPayment;
