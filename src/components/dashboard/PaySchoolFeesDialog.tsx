import React, { useState, useEffect, useMemo } from 'react';
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
import { Loader2, Calendar, CreditCard, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO, differenceInYears, differenceInMonths } from 'date-fns';
import { Term, calculateTeachingWeeks, calculateRemainingTeachingWeeks, isInsideTerm } from '@/services/termCalendarService';
import { createInvoice } from '@/services/invoiceService';
import { createPayment } from '@/services/paymentService';
import { createEnrollment, createScheduledClass } from '@/services/classEnrollmentService';
import ClassScheduleSelector from './ClassScheduleSelector';
import { getInvoiceTemplates, InvoiceTemplate } from '@/services/invoiceTemplateService';
import PaymentInfoDisplay from '@/components/payment/PaymentInfoDisplay';

interface PaySchoolFeesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  student: {
    id: string;
    first_name: string;
    last_name: string;
    branch_id?: string;
    date_of_birth?: string;
  };
  availableTerms: Term[];
  previousEnrollment: any | null;
}

// Calculate age in decimal years (e.g., 4.5 for 4 years 6 months)
function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  const years = differenceInYears(today, dob);
  const monthsAfterBirthday = differenceInMonths(today, dob) % 12;
  return years + (monthsAfterBirthday / 12);
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
  const [step, setStep] = useState<'select' | 'success'>('select');
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [isRemainingWeeks, setIsRemainingWeeks] = useState<boolean>(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedClassSlots, setSelectedClassSlots] = useState<string[]>([]);
  
  // Payment form state
  const [paymentMethod, setPaymentMethod] = useState<string>('paynow');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Calculate student's age
  const studentAge = useMemo(() => {
    if (!student.date_of_birth) return 0;
    return calculateAge(student.date_of_birth);
  }, [student.date_of_birth]);

  // Fetch paid term IDs for this student
  const { data: paidTermIds = [] } = useQuery({
    queryKey: ['student-paid-terms', studentId],
    queryFn: async () => {
      // Get all invoice items for this student that have term_id in metadata
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, status')
        .eq('student_id', studentId)
        .in('status', ['paid', 'draft']); // Both paid and unpaid invoices count

      if (!invoices || invoices.length === 0) return [];

      const invoiceIds = invoices.map(inv => inv.id);
      
      const { data: items } = await supabase
        .from('invoice_items')
        .select('metadata')
        .in('invoice_id', invoiceIds);

      if (!items) return [];

      // Extract term_ids from metadata
      const termIds: string[] = [];
      items.forEach(item => {
        const metadata = item.metadata as any;
        if (metadata?.term_id) {
          termIds.push(metadata.term_id);
        }
      });

      return [...new Set(termIds)]; // Unique term IDs
    },
    enabled: !!studentId,
  });

  // Filter available terms to show only unpaid ones
  const unpaidTerms = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return availableTerms
      .filter(term => !paidTermIds.includes(term.id))
      .filter(term => term.end_date >= today) // Only future or current terms
      .sort((a, b) => a.start_date.localeCompare(b.start_date)); // Earliest first
  }, [availableTerms, paidTermIds]);

  // Check if current term is available for "remaining weeks" payment
  const currentTermForRemaining = useMemo(() => {
    return unpaidTerms.find(term => isInsideTerm(term));
  }, [unpaidTerms]);

  const selectedTerm = unpaidTerms.find(t => t.id === selectedTermId);

  // Calculate remaining weeks for current term
  const remainingWeeksForCurrentTerm = useMemo(() => {
    if (!currentTermForRemaining) return 0;
    return calculateRemainingTeachingWeeks(currentTermForRemaining.end_date, currentTermForRemaining.breaks || []);
  }, [currentTermForRemaining]);

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

  // Fetch invoice template for payment info display
  const { data: invoiceTemplate } = useQuery({
    queryKey: ['invoice-template-for-payment', branch?.country],
    queryFn: async () => {
      const countryCodeMap: Record<string, string> = {
        'Singapore': 'SG',
        'Australia': 'AU'
      };
      const countryCode = countryCodeMap[branch?.country || 'Singapore'] || 'SG';
      
      const templates = await getInvoiceTemplates(true);
      return templates.find(t => t.country === countryCode) || null;
    },
    enabled: !!branch?.country,
  });

  // Fetch class products from the Classes category with branch-specific pricing
  const { data: classProducts = [] } = useQuery({
    queryKey: ['class-products-with-pricing', student.branch_id],
    queryFn: async () => {
      if (!student.branch_id) return [];
      
      // First get the Classes category ID
      const { data: categories } = await supabase
        .from('product_categories')
        .select('id')
        .eq('name', 'Classes')
        .single();
      
      if (!categories) return [];
      
      // Fetch products in the Classes category
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('category_id', categories.id);
      
      if (!products || products.length === 0) return [];
      
      // Fetch branch-specific price rules for this branch
      const productIds = products.map(p => p.id);
      const { data: priceRules } = await supabase
        .from('price_rules')
        .select('*')
        .in('product_id', productIds)
        .eq('branch_id', student.branch_id);
      
      const priceRuleMap = new Map(priceRules?.map(r => [r.product_id, r]) || []);
      
      // Filter products: show if NO rule exists (default visible) OR rule is active
      // Hide only if a rule exists with is_active = false
      return products
        .filter(product => {
          const rule = priceRuleMap.get(product.id);
          // If no rule exists, product is visible (default)
          if (!rule) return true;
          // If rule exists, check is_active (true = visible, false = hidden)
          return rule.is_active === true;
        })
        .map(product => {
          const branchRule = priceRuleMap.get(product.id);
          return {
            ...product,
            effective_price: branchRule?.price_override ?? product.base_price,
            has_branch_price: !!branchRule?.price_override,
          };
        });
    },
    enabled: !!student.branch_id,
  });

  // Get selected product
  const selectedProduct = classProducts.find(p => p.id === selectedProductId);

  // Auto-fill from previous enrollment (match by product name if possible)
  useEffect(() => {
    if (previousEnrollment && !selectedProductId && classProducts.length > 0) {
      const matchingProduct = classProducts.find(p => 
        p.name?.toLowerCase() === previousEnrollment.tier_name?.toLowerCase()
      );
      if (matchingProduct) {
        setSelectedProductId(matchingProduct.id);
      }
    }
  }, [previousEnrollment, classProducts, selectedProductId]);

  // Auto-select first unpaid term (next available)
  useEffect(() => {
    if (unpaidTerms.length > 0 && !selectedTermId) {
      setSelectedTermId(unpaidTerms[0].id);
    }
  }, [unpaidTerms, selectedTermId]);

  // Calculate price based on selected product and term weeks
  // If "remaining weeks" is selected, use remaining weeks calculation
  const termWeeks = useMemo(() => {
    if (!selectedTerm) return 0;
    if (isRemainingWeeks && currentTermForRemaining && selectedTerm.id === currentTermForRemaining.id) {
      return remainingWeeksForCurrentTerm;
    }
    return calculateTeachingWeeks(selectedTerm.start_date, selectedTerm.end_date, selectedTerm.breaks || []);
  }, [selectedTerm, isRemainingWeeks, currentTermForRemaining, remainingWeeksForCurrentTerm]);

  const calculatedPrice = selectedProduct 
    ? termWeeks * selectedProduct.effective_price
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

  // Combined create invoice and payment mutation
  const createInvoiceAndPayMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTerm || !selectedProduct || !student.branch_id) {
        throw new Error('Missing required data');
      }

      if (!proofFile) {
        throw new Error('Proof of payment is required');
      }

      // Step 1: Create invoice
      const weeksLabel = isRemainingWeeks ? 'remaining weeks' : 'weeks';
      const invoice = await createInvoice({
        student_id: studentId,
        branch_id: student.branch_id,
        payment_terms_days: 7,
        internal_notes: `Term enrollment: ${selectedTerm.name} - ${selectedProduct.name}${isRemainingWeeks ? ' (Remaining weeks)' : ''}`,
        items: [{
          product_id: selectedProduct.id,
          description: `${selectedTerm.name} - ${selectedProduct.name} - ${termWeeks} ${weeksLabel}`,
          quantity: termWeeks,
          unit_price: selectedProduct.effective_price,
          metadata: {
            term_id: selectedTerm.id,
            term_name: selectedTerm.name,
            product_name: selectedProduct.name,
            weeks: termWeeks,
            is_remaining_weeks: isRemainingWeeks,
            selected_class_slots: selectedClassSlots,
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

      // Step 4: Create enrollment record
      const enrollmentId = await createEnrollment({
        student_id: studentId,
        term_id: selectedTerm.id,
        branch_id: student.branch_id!,
        class_type: selectedProduct.name || 'Class',
        tier_name: selectedProduct.name || 'Standard',
        total_price: invoice.total_amount,
        invoice_item_id: undefined, // Will be linked via invoice metadata
      });

      // Step 5: Create scheduled classes from selected slots
      if (selectedClassSlots.length > 0) {
        // Fetch timetable data for start/end times
        const timetableIds = [...new Set(selectedClassSlots.map(s => s.split('_')[0]))];
        const { data: timetables } = await supabase
          .from('branch_timetables')
          .select('id, start_time, end_time')
          .in('id', timetableIds);

        const timetableMap = new Map(timetables?.map(t => [t.id, t]) || []);

        for (const slot of selectedClassSlots) {
          const [timetableId, date] = slot.split('_');
          const timetable = timetableMap.get(timetableId);
          if (timetable && date) {
            await createScheduledClass({
              enrollment_id: enrollmentId,
              timetable_id: timetableId,
              scheduled_date: date,
              start_time: timetable.start_time,
              end_time: timetable.end_time,
            });
          }
        }
      }

      return invoice;
    },
    onSuccess: () => {
      setStep('success');
      queryClient.invalidateQueries({ queryKey: ['student-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['student-paid-terms'] });
      queryClient.invalidateQueries({ queryKey: ['student-my-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['student-all-scheduled-classes'] });
      queryClient.invalidateQueries({ queryKey: ['student-entitlements'] });
      toast.success('Invoice created and payment recorded successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create invoice and payment');
    },
    onSettled: () => {
      setIsUploading(false);
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


  const handleClose = () => {
    setStep('select');
    setSelectedTermId('');
    setSelectedProductId('');
    setSelectedClassSlots([]);
    setIsRemainingWeeks(false);
    setProofFile(null);
    setReferenceNumber('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-3xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">
            {step === 'select' && 'Pay School Fees'}
          </DialogTitle>
          <DialogDescription>
            {step === 'select' && 'Select your term and class enrollment'}
          </DialogDescription>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-3 sm:space-y-4">
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

            {/* No unpaid terms available */}
            {unpaidTerms.length === 0 && (
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">All terms are paid</p>
                    <p className="text-sm text-amber-700 mt-1">
                      You have already enrolled for all available terms. Check back later for new terms.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {unpaidTerms.length > 0 && (
              <>
                {/* Term Selection - Show next unpaid term */}
                <div className="space-y-2">
                  <Label>Select Term *</Label>
                  <Select 
                    value={isRemainingWeeks ? `${selectedTermId}:remaining` : selectedTermId} 
                    onValueChange={(value) => {
                      if (value.endsWith(':remaining')) {
                        setSelectedTermId(value.replace(':remaining', ''));
                        setIsRemainingWeeks(true);
                      } else {
                        setSelectedTermId(value);
                        setIsRemainingWeeks(false);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a term" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Show "Remaining weeks" option for current term */}
                      {currentTermForRemaining && remainingWeeksForCurrentTerm > 0 && (
                        <SelectItem key={`${currentTermForRemaining.id}:remaining`} value={`${currentTermForRemaining.id}:remaining`}>
                          {currentTermForRemaining.name} - Remaining {remainingWeeksForCurrentTerm} weeks
                          <Badge variant="outline" className="ml-2 text-xs bg-primary/10 text-primary">Now</Badge>
                        </SelectItem>
                      )}
                      {unpaidTerms.map((term, index) => {
                        const isCurrentTerm = currentTermForRemaining?.id === term.id;
                        return (
                          <SelectItem key={term.id} value={term.id}>
                            {term.name} ({format(parseISO(term.start_date), 'dd MMM')} - {format(parseISO(term.end_date), 'dd MMM yyyy')})
                            {index === 0 && !isCurrentTerm && <Badge variant="secondary" className="ml-2 text-xs">Next</Badge>}
                            {isCurrentTerm && <Badge variant="secondary" className="ml-2 text-xs">Full Term</Badge>}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Package (from Products) */}
                <div className="space-y-2">
                  <Label>Package *</Label>
                  {classProducts.length === 0 ? (
                    <div className="text-sm text-muted-foreground p-3 border border-dashed rounded-md bg-muted/30">
                      No packages available for this branch. Please contact your administrator to configure class pricing.
                    </div>
                  ) : (
                    <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select package" />
                      </SelectTrigger>
                      <SelectContent>
                        {classProducts.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - ${product.effective_price}/week
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Class Schedule Selection */}
                {selectedTerm && selectedProductId && student.branch_id && student.date_of_birth && (
                  <div className="space-y-2">
                    <Label>Select Your Classes</Label>
                    <ClassScheduleSelector
                      branchId={student.branch_id}
                      studentAge={studentAge}
                      selectedSlots={selectedClassSlots}
                      onSlotsChange={setSelectedClassSlots}
                      term={selectedTerm}
                      lessonsPerWeek={selectedProduct?.lessons_per_week}
                    />
                  </div>
                )}

                {/* Summary */}
                {selectedTerm && selectedProduct && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-2.5 sm:p-4 space-y-1">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground">Term</span>
                        <span className="font-medium text-right truncate ml-2">
                          {selectedTerm.name}
                          {isRemainingWeeks && <span className="text-primary ml-1">(Remaining)</span>}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground">Duration</span>
                        <span className="font-medium text-right">{termWeeks} {isRemainingWeeks ? 'remaining weeks' : 'weeks'}</span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground">Rate</span>
                        <span className="font-medium text-right">${selectedProduct.effective_price}/week</span>
                      </div>
                      {selectedClassSlots.length > 0 && (
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-muted-foreground">Classes Selected</span>
                          <span className="font-medium">{selectedClassSlots.length}</span>
                        </div>
                      )}
                      <div className="border-t pt-1.5 flex justify-between">
                        <span className="font-semibold text-sm">Total</span>
                        <span className="font-bold text-sm sm:text-lg">${calculatedPrice.toFixed(2)}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Payment Section */}
                {selectedTerm && selectedProduct && (
                  <Card>
                    <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <CreditCard className="w-4 h-4" />
                        Payment Details
                      </div>

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

                      {/* Payment Info Display - Bank Transfer Info or PayNow QR */}
                      <PaymentInfoDisplay
                        paymentMethod={paymentMethod}
                        bankTransferInfo={invoiceTemplate?.bank_transfer_info}
                        paynowQrUrl={invoiceTemplate?.paynow_qr_url}
                      />

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
                        <div className="border-2 border-dashed rounded-lg p-3 sm:p-4 text-center">
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
                                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                                <span className="text-sm truncate max-w-[200px]">{proofFile.name}</span>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Upload className="w-6 h-6 mx-auto text-muted-foreground" />
                                <p className="text-xs text-muted-foreground">
                                  Click to upload payment screenshot or PDF
                                </p>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
              <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button
                onClick={() => createInvoiceAndPayMutation.mutate()}
                disabled={
                  !selectedTermId || 
                  !selectedProductId || 
                  !proofFile ||
                  createInvoiceAndPayMutation.isPending || 
                  isUploading ||
                  unpaidTerms.length === 0
                }
                className="w-full sm:w-auto"
              >
                {(createInvoiceAndPayMutation.isPending || isUploading) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                <span className="sm:hidden">Pay</span>
                <span className="hidden sm:inline">Create Invoice & Pay</span>
              </Button>
            </div>
          </div>
        )}


        {step === 'success' && (
          <div className="text-center py-4 sm:py-6 space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="font-semibold text-lg">Enrollment Confirmed!</h3>
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
