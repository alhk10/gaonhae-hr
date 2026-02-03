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
  const [selectedProductId, setSelectedProductId] = useState<string>('');
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
      
      // Fetch branch-specific price rules - only get active ones for this branch
      const productIds = products.map(p => p.id);
      const { data: priceRules } = await supabase
        .from('price_rules')
        .select('*')
        .in('product_id', productIds)
        .eq('branch_id', student.branch_id)
        .eq('is_active', true);
      
      const priceRuleMap = new Map(priceRules?.map(r => [r.product_id, r]) || []);
      
      // Only return products that have an active price rule for this branch
      return products
        .filter(product => priceRuleMap.has(product.id))
        .map(product => {
          const branchRule = priceRuleMap.get(product.id)!;
          return {
            ...product,
            effective_price: branchRule.price_override ?? product.base_price,
            has_branch_price: !!branchRule.price_override,
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

  // Auto-select first term
  useEffect(() => {
    if (availableTerms.length > 0 && !selectedTermId) {
      setSelectedTermId(availableTerms[0].id);
    }
  }, [availableTerms]);

  // Calculate price based on selected product and term weeks
  const termWeeks = selectedTerm 
    ? calculateTeachingWeeks(selectedTerm.start_date, selectedTerm.end_date, selectedTerm.breaks || [])
    : 0;
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

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTerm || !selectedProduct || !student.branch_id) {
        throw new Error('Missing required data');
      }

      const invoice = await createInvoice({
        student_id: studentId,
        branch_id: student.branch_id,
        payment_terms_days: 7,
        internal_notes: `Term enrollment: ${selectedTerm.name} - ${selectedProduct.name}`,
        items: [{
          product_id: selectedProduct.id,
          description: `${selectedTerm.name} - ${selectedProduct.name} - ${termWeeks} weeks`,
          quantity: termWeeks,
          unit_price: selectedProduct.effective_price,
          metadata: {
            term_id: selectedTerm.id,
            term_name: selectedTerm.name,
            product_name: selectedProduct.name,
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
    setSelectedProductId('');
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

            {/* Pricing Tier (from Products) */}
            <div className="space-y-2">
              <Label>Pricing Tier *</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pricing tier" />
                </SelectTrigger>
                <SelectContent>
                  {classProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - ${product.effective_price}/week
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Summary */}
            {selectedTerm && selectedProduct && (
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
                    <span className="font-medium">${selectedProduct.effective_price}/week</span>
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
                disabled={!selectedTermId || !selectedProductId || createInvoiceMutation.isPending}
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
