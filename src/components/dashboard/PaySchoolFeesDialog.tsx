import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, CreditCard, Upload, CheckCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { Term, calculateTeachingWeeks } from '@/services/termCalendarService';
import { getClassPricingTiers, calculateEnrollmentPrice } from '@/services/classEnrollmentService';
import { createInvoice } from '@/services/invoiceService';
import { createPayment } from '@/services/paymentService';

interface PaySchoolFeesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  student: {
    id: string;
    first_name: string;
    last_name: string;
    branch_id?: string;
  };
  availableTerms: Term[];
  previousEnrollment: any | null;
}

const PaySchoolFeesDialog: React.FC<PaySchoolFeesDialogProps> = ({
  open,
  onOpenChange,
  studentId,
  student,
  availableTerms,
  previousEnrollment,
}) => {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'select' | 'payment' | 'success'>('select');
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [selectedClassType, setSelectedClassType] = useState<string>('');
  const [selectedTierName, setSelectedTierName] = useState<string>('');
  const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null);
  const [invoiceAmount, setInvoiceAmount] = useState<number>(0);
  
  // Payment form state
  const [paymentMethod, setPaymentMethod] = useState<string>('paynow');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const selectedTerm = availableTerms.find(t => t.id === selectedTermId);

  // Fetch branch for country-specific payment methods
  const { data: branch } = useQuery({
    queryKey: ['branch-details', student.branch_id],
    queryFn: async () => {
      if (!student.branch_id) return null;
      const { data } = await supabase
        .from('branches')
        .select('*')
        .eq('id', student.branch_id)
        .single();
      return data;
    },
    enabled: !!student.branch_id,
  });

  // Fetch pricing tiers
  const { data: pricingTiers = [] } = useQuery({
    queryKey: ['class-pricing-tiers', student.branch_id],
    queryFn: () => getClassPricingTiers(student.branch_id!),
    enabled: !!student.branch_id,
  });

  // Fetch class products for the branch
  const { data: classProducts = [] } = useQuery({
    queryKey: ['class-products', student.branch_id],
    queryFn: async () => {
      if (!student.branch_id) return [];
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .ilike('category_id', '%class%');
      return data || [];
    },
    enabled: !!student.branch_id,
  });

  // Get unique class types from pricing tiers
  const classTypes = [...new Set(pricingTiers.map(t => t.class_type))];
  
  // Get tiers for selected class type
  const tiersForClassType = pricingTiers.filter(t => t.class_type === selectedClassType);

  // Auto-fill from previous enrollment
  useEffect(() => {
    if (previousEnrollment && !selectedClassType) {
      setSelectedClassType(previousEnrollment.class_type || '');
      setSelectedTierName(previousEnrollment.tier_name || '');
    }
  }, [previousEnrollment]);

  // Auto-select first term
  useEffect(() => {
    if (availableTerms.length > 0 && !selectedTermId) {
      setSelectedTermId(availableTerms[0].id);
    }
  }, [availableTerms]);

  // Calculate price
  const selectedTier = tiersForClassType.find(t => t.tier_name === selectedTierName);
  const termWeeks = selectedTerm 
    ? calculateTeachingWeeks(selectedTerm.start_date, selectedTerm.end_date, selectedTerm.breaks || [])
    : 0;
  const calculatedPrice = selectedTier 
    ? calculateEnrollmentPrice(termWeeks, selectedTier.price_per_week, selectedTier.price_per_lesson, selectedTier.tier_name)
    : 0;

  // Payment methods based on country
  const getPaymentMethods = () => {
    const country = branch?.country;
    if (country === 'Australia') {
      return [
        { value: 'bank_transfer', label: 'Bank Transfer' },
      ];
    }
    // Singapore and default
    return [
      { value: 'paynow', label: 'PayNow' },
      { value: 'bank_transfer', label: 'Bank Transfer' },
    ];
  };

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTerm || !selectedTier || !student.branch_id) {
        throw new Error('Missing required data');
      }

      // Find a matching class product
      const classProduct = classProducts.find(p => 
        p.name?.toLowerCase().includes(selectedClassType.toLowerCase()) ||
        p.name?.toLowerCase().includes('class')
      ) || classProducts[0];

      if (!classProduct) {
        throw new Error('No class product found. Please contact the academy.');
      }

      const invoice = await createInvoice({
        student_id: studentId,
        branch_id: student.branch_id,
        payment_terms_days: 7,
        internal_notes: `Term enrollment: ${selectedTerm.name} - ${selectedClassType} (${selectedTier.tier_display_name})`,
        items: [{
          product_id: classProduct.id,
          description: `${selectedTerm.name} - ${selectedClassType} (${selectedTier.tier_display_name}) - ${termWeeks} weeks`,
          quantity: termWeeks,
          unit_price: selectedTier.price_per_week,
          metadata: {
            term_id: selectedTerm.id,
            term_name: selectedTerm.name,
            class_type: selectedClassType,
            tier_name: selectedTierName,
            weeks: termWeeks,
          },
        }],
      });

      return invoice;
    },
    onSuccess: (invoice) => {
      setCreatedInvoiceId(invoice.id);
      setInvoiceAmount(invoice.total_amount);
      setStep('payment');
      toast.success('Invoice created! Please complete payment.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create invoice');
    },
  });

  // Handle file upload
  const uploadProofOfPayment = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${studentId}.${fileExt}`;
    const filePath = `payment-proofs/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('receipts')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  // Create payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!createdInvoiceId || !proofFile) {
        throw new Error('Missing invoice or proof of payment');
      }

      setIsUploading(true);
      const proofUrl = await uploadProofOfPayment(proofFile);

      const payment = await createPayment({
        invoice_id: createdInvoiceId,
        amount: invoiceAmount,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: paymentMethod as any,
        reference_number: referenceNumber || undefined,
        proof_of_payment_url: proofUrl,
      });

      return payment;
    },
    onSuccess: () => {
      setStep('success');
      queryClient.invalidateQueries({ queryKey: ['student-invoices'] });
      toast.success('Payment recorded successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to record payment');
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  const handleClose = () => {
    setStep('select');
    setSelectedTermId('');
    setCreatedInvoiceId(null);
    setProofFile(null);
    setReferenceNumber('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 'select' && 'Pay School Fees'}
            {step === 'payment' && 'Complete Payment'}
            {step === 'success' && 'Payment Successful'}
          </DialogTitle>
          <DialogDescription>
            {step === 'select' && 'Select your term and class enrollment'}
            {step === 'payment' && 'Upload proof of payment to complete'}
            {step === 'success' && 'Your enrollment has been confirmed'}
          </DialogDescription>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-4">
            {/* Previous Enrollment Info */}
            {previousEnrollment && (
              <Card className="bg-muted/50">
                <CardContent className="p-3">
                  <p className="text-sm text-muted-foreground">
                    Previous enrollment: <strong>{previousEnrollment.class_type}</strong> ({previousEnrollment.tier_name})
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Term Selection */}
            <div className="space-y-2">
              <Label>Select Term *</Label>
              <Select value={selectedTermId} onValueChange={setSelectedTermId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a term" />
                </SelectTrigger>
                <SelectContent>
                  {availableTerms.map((term) => (
                    <SelectItem key={term.id} value={term.id}>
                      {term.name} ({format(parseISO(term.start_date), 'dd MMM')} - {format(parseISO(term.end_date), 'dd MMM yyyy')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Class Type */}
            <div className="space-y-2">
              <Label>Class Type *</Label>
              <Select value={selectedClassType} onValueChange={(v) => { setSelectedClassType(v); setSelectedTierName(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class type" />
                </SelectTrigger>
                <SelectContent>
                  {classTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pricing Tier */}
            {selectedClassType && tiersForClassType.length > 0 && (
              <div className="space-y-2">
                <Label>Pricing Tier *</Label>
                <Select value={selectedTierName} onValueChange={setSelectedTierName}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select pricing tier" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiersForClassType.map((tier) => (
                      <SelectItem key={tier.id} value={tier.tier_name}>
                        {tier.tier_display_name} - ${tier.price_per_week}/week
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Summary */}
            {selectedTerm && selectedTier && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Term</span>
                    <span className="font-medium">{selectedTerm.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-medium">{termWeeks} weeks</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Rate</span>
                    <span className="font-medium">${selectedTier.price_per_week}/week</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-lg">${calculatedPrice.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={() => createInvoiceMutation.mutate()}
                disabled={!selectedTermId || !selectedClassType || !selectedTierName || createInvoiceMutation.isPending}
              >
                {createInvoiceMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Invoice & Pay
              </Button>
            </div>
          </div>
        )}

        {step === 'payment' && (
          <div className="space-y-4">
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Amount Due</span>
                  <span className="text-2xl font-bold">${invoiceAmount.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label>Payment Method *</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getPaymentMethods().map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reference Number */}
            <div className="space-y-2">
              <Label>Reference Number (Optional)</Label>
              <Input
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Transaction reference"
              />
            </div>

            {/* Proof of Payment */}
            <div className="space-y-2">
              <Label>Proof of Payment *</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="proof-upload"
                />
                <label htmlFor="proof-upload" className="cursor-pointer">
                  {proofFile ? (
                    <div className="flex items-center justify-center gap-2 text-primary">
                      <CheckCircle className="w-5 h-5" />
                      <span>{proofFile.name}</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload payment screenshot or PDF
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setStep('select')}>
                Back
              </Button>
              <Button
                onClick={() => createPaymentMutation.mutate()}
                disabled={!proofFile || createPaymentMutation.isPending || isUploading}
              >
                {(createPaymentMutation.isPending || isUploading) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Submit Payment
              </Button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Enrollment Confirmed!</h3>
              <p className="text-muted-foreground">
                Your payment has been recorded and your enrollment is active.
              </p>
            </div>
            <Button onClick={handleClose}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PaySchoolFeesDialog;
