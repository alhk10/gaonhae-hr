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
import { Loader2, Upload, CheckCircle, ArrowRight, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO, subDays } from 'date-fns';
import { GradingSlot } from '@/services/gradingService';
import { createInvoice } from '@/services/invoiceService';
import { createPayment } from '@/services/paymentService';
import { formatBeltLevel } from '@/constants/beltLevels';
import { getNextBelt } from './QuickActionsSection';

interface PayGradingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  student: {
    id: string;
    first_name: string;
    last_name: string;
    branch_id?: string;
    current_belt?: string;
  };
  gradingSlots: GradingSlot[];
}

const PayGradingDialog: React.FC<PayGradingDialogProps> = ({
  open,
  onOpenChange,
  studentId,
  student,
  gradingSlots,
}) => {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'select' | 'success'>('select');
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  // Payment form state
  const [paymentMethod, setPaymentMethod] = useState<string>('paynow');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const selectedSlot = gradingSlots.find(s => s.id === selectedSlotId);
  const nextBelt = getNextBelt(student.current_belt);

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

  // Fetch grading fee product based on belt transition
  const { data: gradingProduct } = useQuery({
    queryKey: ['grading-product', student.current_belt, nextBelt, student.branch_id],
    queryFn: async () => {
      if (!student.current_belt || !nextBelt) return null;
      
      // Build the expected product name pattern: "Foundation 1 >> Foundation 2"
      const productName = `${formatBeltLevel(student.current_belt)} >> ${formatBeltLevel(nextBelt)}`;
      
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('name', productName)
        .maybeSingle();
      
      if (!data) return null;
      
      // Check for branch-specific pricing override
      if (student.branch_id) {
        const { data: priceRule } = await supabase
          .from('price_rules')
          .select('price_override, is_active')
          .eq('product_id', data.id)
          .eq('branch_id', student.branch_id)
          .maybeSingle();
        
        // If rule exists and is hidden, return null
        if (priceRule?.is_active === false) return null;
        
        return {
          ...data,
          effective_price: priceRule?.price_override ?? data.base_price,
        };
      }
      
      return { ...data, effective_price: data.base_price };
    },
    enabled: !!student.current_belt && !!nextBelt,
  });

  // Check for duplicate grading invoice (60-day rule)
  const { data: existingGradingInvoice } = useQuery({
    queryKey: ['grading-duplicate-check', studentId, gradingProduct?.id],
    queryFn: async () => {
      if (!gradingProduct?.id) return null;
      
      const sixtyDaysAgo = subDays(new Date(), 60).toISOString().split('T')[0];
      
      const { data } = await supabase
        .from('invoice_items')
        .select(`
          id,
          invoice_id,
          invoices!inner(id, status, created_at, student_id)
        `)
        .eq('product_id', gradingProduct.id)
        .eq('invoices.student_id', studentId)
        .neq('invoices.status', 'cancelled')
        .gte('invoices.created_at', sixtyDaysAgo)
        .limit(1)
        .maybeSingle();

      return data;
    },
    enabled: !!gradingProduct?.id,
  });

  // Set duplicate error
  useEffect(() => {
    if (existingGradingInvoice) {
      setDuplicateError('A grading invoice was already created within the last 60 days. Please contact the academy if you need assistance.');
    } else {
      setDuplicateError(null);
    }
  }, [existingGradingInvoice]);

  // Auto-select first slot
  useEffect(() => {
    if (gradingSlots.length > 0 && !selectedSlotId) {
      setSelectedSlotId(gradingSlots[0].id);
    }
  }, [gradingSlots]);

  // Set default payment method based on country
  useEffect(() => {
    if (branch?.country === 'Australia') {
      setPaymentMethod('bank_transfer');
    } else {
      setPaymentMethod('paynow');
    }
  }, [branch?.country]);

  // Payment methods based on country
  const getPaymentMethods = () => {
    const country = branch?.country;
    if (country === 'Australia') {
      return [
        { value: 'bank_transfer', label: 'Bank Transfer' },
      ];
    }
    return [
      { value: 'paynow', label: 'PayNow' },
      { value: 'bank_transfer', label: 'Bank Transfer' },
    ];
  };

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

  // Combined create invoice and payment mutation
  const createInvoiceAndPayMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSlot || !gradingProduct || !student.branch_id || !student.current_belt) {
        throw new Error('Missing required data');
      }
      if (!proofFile) {
        throw new Error('Proof of payment is required');
      }
      if (duplicateError) {
        throw new Error(duplicateError);
      }

      // Step 1: Create invoice
      const invoice = await createInvoice({
        student_id: studentId,
        branch_id: student.branch_id,
        payment_terms_days: 7,
        internal_notes: `Grading registration: ${formatBeltLevel(student.current_belt)} → ${formatBeltLevel(nextBelt)} on ${format(parseISO(selectedSlot.grading_date), 'dd MMM yyyy')}`,
        items: [{
          product_id: gradingProduct.id,
          description: gradingProduct.name,
          quantity: 1,
          unit_price: gradingProduct.effective_price || gradingProduct.base_price || 0,
          metadata: {
            grading_slot_id: selectedSlot.id,
            grading_date: selectedSlot.grading_date,
            current_belt: student.current_belt,
            target_belt: nextBelt,
          },
        }],
      });

      // Step 2: Upload proof of payment
      setIsUploading(true);
      const proofUrl = await uploadProofOfPayment(proofFile);

      // Step 3: Create payment
      await createPayment({
        invoice_id: invoice.id,
        amount: invoice.total_amount,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: paymentMethod as any,
        reference_number: referenceNumber || undefined,
        proof_of_payment_url: proofUrl,
      });

      return invoice;
    },
    onSuccess: () => {
      setStep('success');
      queryClient.invalidateQueries({ queryKey: ['student-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['grading-registrations'] });
      toast.success('Invoice created and payment recorded successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to process');
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  const handleClose = () => {
    setStep('select');
    setSelectedSlotId('');
    setProofFile(null);
    setReferenceNumber('');
    onOpenChange(false);
  };

  const effectivePrice = gradingProduct?.effective_price ?? gradingProduct?.base_price ?? 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 'select' && 'Register for Grading'}
            {step === 'success' && 'Registration Successful'}
          </DialogTitle>
          <DialogDescription>
            {step === 'select' && 'Select a grading session and complete payment'}
            {step === 'success' && 'Your grading registration is confirmed'}
          </DialogDescription>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-4">
            {/* Belt Progression */}
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-center gap-3">
                  <Badge variant="outline" className="text-base px-3 py-1">
                    {formatBeltLevel(student.current_belt)}
                  </Badge>
                  <ArrowRight className="w-5 h-5 text-purple-600" />
                  <Badge className="text-base px-3 py-1 bg-purple-600">
                    {formatBeltLevel(nextBelt)}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Duplicate Warning */}
            {duplicateError && (
              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-orange-800">{duplicateError}</p>
                </CardContent>
              </Card>
            )}

            {/* Grading Slot Selection */}
            <div className="space-y-2">
              <Label>Select Grading Session *</Label>
              <Select value={selectedSlotId} onValueChange={setSelectedSlotId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a session" />
                </SelectTrigger>
                <SelectContent>
                  {gradingSlots.map((slot) => (
                    <SelectItem key={slot.id} value={slot.id}>
                      {format(parseISO(slot.grading_date), 'EEEE, dd MMM yyyy')}
                      {slot.start_time && ` at ${slot.start_time.slice(0, 5)}`}
                      {slot.branch_name && ` - ${slot.branch_name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Summary */}
            {selectedSlot && gradingProduct && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium">
                      {format(parseISO(selectedSlot.grading_date), 'dd MMM yyyy')}
                    </span>
                  </div>
                  {selectedSlot.start_time && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Time</span>
                      <span className="font-medium">{selectedSlot.start_time.slice(0, 5)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-semibold">Grading Fee</span>
                    <span className="font-bold text-lg">${effectivePrice.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Section */}
            {selectedSlot && gradingProduct && !duplicateError && (
              <div className="space-y-4 pt-2 border-t">
                <Label className="text-base font-semibold">Payment</Label>
                
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
                      id="grading-proof-upload"
                    />
                    <label htmlFor="grading-proof-upload" className="cursor-pointer">
                      {proofFile ? (
                        <div className="flex items-center justify-center gap-2 text-primary">
                          <CheckCircle className="w-5 h-5" />
                          <span className="text-sm">{proofFile.name}</span>
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
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={() => createInvoiceAndPayMutation.mutate()}
                disabled={
                  !selectedSlotId || 
                  !gradingProduct || 
                  !proofFile || 
                  !!duplicateError || 
                  createInvoiceAndPayMutation.isPending ||
                  isUploading
                }
              >
                {(createInvoiceAndPayMutation.isPending || isUploading) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Create Invoice & Pay
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
              <h3 className="font-semibold text-lg">Grading Registration Confirmed!</h3>
              <p className="text-muted-foreground">
                You are registered for the grading exam. Good luck!
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

export default PayGradingDialog;
