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
import { Loader2, Upload, CheckCircle, ArrowRight, AlertCircle, CalendarCheck } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO, subDays, differenceInYears, differenceInMonths } from 'date-fns';
import { GradingSlot } from '@/services/gradingService';
import { createInvoice } from '@/services/invoiceService';
import { createPayment } from '@/services/paymentService';

import { formatBeltLevel } from '@/constants/beltLevels';
import { getNextBelt } from './QuickActionsSection';
import { getInvoiceTemplates } from '@/services/invoiceTemplateService';
import PaymentInfoDisplay from '@/components/payment/PaymentInfoDisplay';
import { Term, calculateTeachingWeeks, calculateRemainingTeachingWeeks, isInsideTerm } from '@/services/termCalendarService';
import ClassScheduleSelector from './ClassScheduleSelector';

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
    date_of_birth?: string;
  };
  gradingSlots: GradingSlot[];
  availableTerms?: Term[];
  previousEnrollment?: any | null;
}

function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  const years = differenceInYears(today, dob);
  const monthsAfterBirthday = differenceInMonths(today, dob) % 12;
  return years + (monthsAfterBirthday / 12);
}

const PayGradingDialog: React.FC<PayGradingDialogProps> = ({
  open,
  onOpenChange,
  studentId,
  student,
  gradingSlots,
  availableTerms = [],
  previousEnrollment,
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

  // Term payment opt-in state
  const [alsoPayTermFees, setAlsoPayTermFees] = useState(false);
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [isRemainingWeeks, setIsRemainingWeeks] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedClassSlots, setSelectedClassSlots] = useState<string[]>([]);
  const [wasTermIncluded, setWasTermIncluded] = useState(false);

  const selectedSlot = gradingSlots.find(s => s.id === selectedSlotId);
  const nextBelt = getNextBelt(student.current_belt);

  const studentAge = useMemo(() => {
    if (!student.date_of_birth) return 0;
    return calculateAge(student.date_of_birth);
  }, [student.date_of_birth]);

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

  // Fetch grading fee product based on belt transition
  const { data: gradingProduct } = useQuery({
    queryKey: ['grading-product', student.current_belt, nextBelt, student.branch_id],
    queryFn: async () => {
      if (!student.current_belt || !nextBelt) return null;
      
      const productName = `${formatBeltLevel(student.current_belt)} >> ${formatBeltLevel(nextBelt)}`;
      
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('name', productName)
        .maybeSingle();
      
      if (!data) return null;
      
      if (student.branch_id) {
        const { data: priceRule } = await supabase
          .from('price_rules')
          .select('price_override, is_active')
          .eq('product_id', data.id)
          .eq('branch_id', student.branch_id)
          .maybeSingle();
        
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

  // === Term payment queries (only when opt-in is checked) ===

  // Fetch paid term IDs
  const { data: paidTermIds = [] } = useQuery({
    queryKey: ['student-paid-terms', studentId],
    queryFn: async () => {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, status')
        .eq('student_id', studentId)
        .in('status', ['paid', 'draft']);

      if (!invoices || invoices.length === 0) return [];

      const invoiceIds = invoices.map(inv => inv.id);
      const { data: items } = await supabase
        .from('invoice_items')
        .select('metadata')
        .in('invoice_id', invoiceIds);

      if (!items) return [];

      const termIds: string[] = [];
      items.forEach(item => {
        const metadata = item.metadata as any;
        if (metadata?.term_id) termIds.push(metadata.term_id);
      });
      return [...new Set(termIds)];
    },
    enabled: !!studentId && alsoPayTermFees,
  });

  // Fetch class products
  const { data: classProducts = [] } = useQuery({
    queryKey: ['class-products-with-pricing', student.branch_id],
    queryFn: async () => {
      if (!student.branch_id) return [];
      
      const { data: categories } = await supabase
        .from('product_categories')
        .select('id')
        .eq('name', 'Classes')
        .single();
      
      if (!categories) return [];
      
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('category_id', categories.id);
      
      if (!products || products.length === 0) return [];
      
      const productIds = products.map(p => p.id);
      const { data: priceRules } = await supabase
        .from('price_rules')
        .select('*')
        .in('product_id', productIds)
        .eq('branch_id', student.branch_id);
      
      const priceRuleMap = new Map(priceRules?.map(r => [r.product_id, r]) || []);
      
      return products
        .filter(product => {
          const rule = priceRuleMap.get(product.id);
          if (!rule) return true;
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
    enabled: !!student.branch_id && alsoPayTermFees,
  });

  // Computed unpaid terms
  const unpaidTerms = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return availableTerms
      .filter(term => !paidTermIds.includes(term.id))
      .filter(term => term.end_date >= today)
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
  }, [availableTerms, paidTermIds]);

  const currentTermForRemaining = useMemo(() => {
    return unpaidTerms.find(term => isInsideTerm(term));
  }, [unpaidTerms]);

  const selectedTerm = unpaidTerms.find(t => t.id === selectedTermId);

  const remainingWeeksForCurrentTerm = useMemo(() => {
    if (!currentTermForRemaining) return 0;
    return calculateRemainingTeachingWeeks(currentTermForRemaining.end_date, currentTermForRemaining.breaks || []);
  }, [currentTermForRemaining]);

  const termWeeks = useMemo(() => {
    if (!selectedTerm) return 0;
    if (isRemainingWeeks && currentTermForRemaining && selectedTerm.id === currentTermForRemaining.id) {
      return remainingWeeksForCurrentTerm;
    }
    return calculateTeachingWeeks(selectedTerm.start_date, selectedTerm.end_date, selectedTerm.breaks || []);
  }, [selectedTerm, isRemainingWeeks, currentTermForRemaining, remainingWeeksForCurrentTerm]);

  const selectedProduct = classProducts.find(p => p.id === selectedProductId);
  const calculatedTermPrice = selectedProduct ? termWeeks * selectedProduct.effective_price : 0;

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

  // Auto-select first unpaid term when opt-in checked
  useEffect(() => {
    if (alsoPayTermFees && unpaidTerms.length > 0 && !selectedTermId) {
      setSelectedTermId(unpaidTerms[0].id);
    }
  }, [alsoPayTermFees, unpaidTerms, selectedTermId]);

  // Auto-fill product from previous enrollment
  useEffect(() => {
    if (alsoPayTermFees && previousEnrollment && !selectedProductId && classProducts.length > 0) {
      const matchingProduct = classProducts.find(p =>
        p.name?.toLowerCase() === previousEnrollment.tier_name?.toLowerCase()
      );
      if (matchingProduct) {
        setSelectedProductId(matchingProduct.id);
      }
    }
  }, [alsoPayTermFees, previousEnrollment, classProducts, selectedProductId]);

  // Payment methods based on country
  const getPaymentMethods = () => {
    const country = branch?.country;
    if (country === 'Australia') {
      return [{ value: 'bank_transfer', label: 'Bank Transfer' }];
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

  const effectiveGradingPrice = gradingProduct?.effective_price ?? gradingProduct?.base_price ?? 0;
  const combinedTotal = effectiveGradingPrice + (alsoPayTermFees ? calculatedTermPrice : 0);

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
      if (alsoPayTermFees && (!selectedTermId || !selectedProductId || !selectedTerm || !selectedProduct)) {
        throw new Error('Please complete the term payment fields');
      }

      // Step 1: Create grading invoice
      const gradingInvoice = await createInvoice({
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

      // Step 3: Create grading payment
      await createPayment({
        invoice_id: gradingInvoice.id,
        amount: gradingInvoice.total_amount,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: paymentMethod as any,
        reference_number: referenceNumber || undefined,
        proof_of_payment_url: proofUrl,
      });

      // Step 4: If term fees opted in, create term invoice + payment + enrollment
      if (alsoPayTermFees && selectedTerm && selectedProduct) {
        const weeksLabel = isRemainingWeeks ? 'remaining weeks' : 'weeks';
        const termInvoice = await createInvoice({
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

        // Create term payment (reuse same proof)
        await createPayment({
          invoice_id: termInvoice.id,
          amount: termInvoice.total_amount,
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: paymentMethod as any,
          reference_number: referenceNumber || undefined,
          proof_of_payment_url: proofUrl,
        });

        // Enrollment and scheduled classes are now automatically created by createInvoice
      }

      return { termIncluded: alsoPayTermFees };
    },
    onSuccess: (result) => {
      setWasTermIncluded(result.termIncluded);
      setStep('success');
      queryClient.invalidateQueries({ queryKey: ['student-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['grading-registrations'] });
      if (result.termIncluded) {
        queryClient.invalidateQueries({ queryKey: ['student-paid-terms'] });
        queryClient.invalidateQueries({ queryKey: ['student-my-enrollments'] });
        queryClient.invalidateQueries({ queryKey: ['student-all-scheduled-classes'] });
        queryClient.invalidateQueries({ queryKey: ['student-entitlements'] });
        toast.success('Grading registration and term enrollment confirmed!');
      } else {
        toast.success('Invoice created and payment recorded successfully!');
      }
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
    setAlsoPayTermFees(false);
    setSelectedTermId('');
    setSelectedProductId('');
    setSelectedClassSlots([]);
    setIsRemainingWeeks(false);
    setWasTermIncluded(false);
    onOpenChange(false);
  };

  const isTermFieldsIncomplete = alsoPayTermFees && (!selectedTermId || !selectedProductId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={`${alsoPayTermFees ? 'max-w-3xl' : 'max-w-lg'} max-h-[85vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle>
            {step === 'select' && 'Register for Grading'}
            {step === 'success' && 'Registration Successful'}
          </DialogTitle>
          <DialogDescription>
            {step === 'select' && 'Select a grading session and complete payment'}
            {step === 'success' && 'Your registration is confirmed'}
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
                      {slot.title || `Grading Session`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Also Pay Term Fees Opt-in */}
            {selectedSlot && gradingProduct && !duplicateError && availableTerms.length > 0 && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="also-pay-term"
                      checked={alsoPayTermFees}
                      onCheckedChange={(v) => setAlsoPayTermFees(!!v)}
                      className="mt-0.5"
                    />
                    <label htmlFor="also-pay-term" className="text-sm cursor-pointer">
                      <div className="flex items-center gap-2">
                        <CalendarCheck className="w-4 h-4 text-blue-600" />
                        <span className="font-medium">Also pay for the next term?</span>
                      </div>
                      <p className="text-muted-foreground text-xs mt-1">
                        Complete both grading registration and term enrollment in a single payment.
                      </p>
                    </label>
                  </div>

                  {/* Expanded term fields */}
                  {alsoPayTermFees && (
                    <div className="space-y-3 pt-2 border-t border-blue-200">
                      {unpaidTerms.length === 0 ? (
                        <p className="text-sm text-muted-foreground">All terms are already paid.</p>
                      ) : (
                        <>
                          {/* Term Selection */}
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

                          {/* Package Selection */}
                          <div className="space-y-2">
                            <Label>Package *</Label>
                            {classProducts.length === 0 ? (
                              <div className="text-sm text-muted-foreground p-3 border border-dashed rounded-md bg-muted/30">
                                No packages available for this branch.
                              </div>
                            ) : (
                              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select package" />
                                </SelectTrigger>
                                <SelectContent>
                                  {classProducts.map((product) => (
                                    <SelectItem key={product.id} value={product.id}>
                                      {product.name}
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
                                allowedClassTypes={selectedProduct?.allowed_class_types}
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Combined Summary */}
            {selectedSlot && gradingProduct && !duplicateError && (
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
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Grading Fee</span>
                    <span className="font-medium">${effectiveGradingPrice.toFixed(2)}</span>
                  </div>
                  {alsoPayTermFees && selectedTerm && selectedProduct && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          School Fees ({termWeeks} {isRemainingWeeks ? 'remaining' : ''} weeks)
                        </span>
                        <span className="font-medium">${calculatedTermPrice.toFixed(2)}</span>
                      </div>
                      {selectedClassSlots.length > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Classes Selected</span>
                          <span className="font-medium">{selectedClassSlots.length}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-lg">${combinedTotal.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Section */}
            {selectedSlot && gradingProduct && !duplicateError && (
              <div className="space-y-4 pt-2 border-t">
                <Label className="text-base font-semibold">
                  Payment
                  {alsoPayTermFees && selectedProduct && (
                    <span className="text-xs text-muted-foreground font-normal ml-2">(covers both grading & school fees)</span>
                  )}
                </Label>
                
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

                {/* Payment Info Display */}
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
                  <div className="border-2 border-dashed rounded-lg p-4 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && !file.type.startsWith('image/')) {
                          toast.error('Only image files are accepted for payment proof');
                          e.target.value = '';
                          return;
                        }
                        setProofFile(file || null);
                      }}
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
                            Click to upload payment screenshot
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
                  isTermFieldsIncomplete ||
                  createInvoiceAndPayMutation.isPending ||
                  isUploading
                }
              >
                {(createInvoiceAndPayMutation.isPending || isUploading) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {alsoPayTermFees && selectedProduct ? 'Create Invoices & Pay Both' : 'Create Invoice & Pay'}
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
              <h3 className="font-semibold text-lg">
                {wasTermIncluded
                  ? 'Grading Registration & Term Enrollment Confirmed!'
                  : 'Grading Registration Confirmed!'}
              </h3>
              <p className="text-muted-foreground">
                {wasTermIncluded
                  ? 'You are registered for the grading exam and enrolled for the next term. Good luck!'
                  : 'You are registered for the grading exam. Good luck!'}
              </p>
            </div>
            <Button onClick={handleClose}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PayGradingDialog;
