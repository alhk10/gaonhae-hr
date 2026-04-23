/**
 * Create Payment Dialog Component
 * Form for recording new payments against invoices
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { createPayment, type CreatePaymentData } from '@/services/paymentService';
import { getInvoices } from '@/services/invoiceService';
import { supabase } from '@/integrations/supabase/client';
import { getInvoiceTemplates, InvoiceTemplate } from '@/services/invoiceTemplateService';
import { getStudentCreditBalance } from '@/services/studentCreditService';
import PaymentInfoDisplay from '@/components/payment/PaymentInfoDisplay';
import ProofOfPaymentUpload from '@/components/payment/ProofOfPaymentUpload';
import { Loader2, Search, FileText, DollarSign } from 'lucide-react';

interface CreatePaymentDialogProps {
  trigger: React.ReactNode;
  onPaymentCreated?: () => void;
  preSelectedInvoiceId?: string;
  isStudentPortal?: boolean;
}

interface InvoiceOption {
  id: string;
  invoice_number: string;
  student_name: string;
  student_id?: string;
  total_amount: number;
  balance_due: number;
  status: string;
  branch_id?: string;
  branch_country?: string;
}

const CreatePaymentDialog: React.FC<CreatePaymentDialogProps> = ({ 
  trigger, 
  onPaymentCreated,
  preSelectedInvoiceId,
  isStudentPortal = false
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchingInvoices, setSearchingInvoices] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [invoiceItems, setInvoiceItems] = useState<Array<{ id: string; description: string; quantity: number; unit_price: number; total_amount: number }>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [studentCreditBalance, setStudentCreditBalance] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    invoice_id: preSelectedInvoiceId || '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'paynow' as CreatePaymentData['payment_method'],
    reference_number: '',
    proof_of_payment_url: '',
    notes: ''
  });
  const [invoiceTemplate, setInvoiceTemplate] = useState<InvoiceTemplate | null>(null);

  // Fast single-invoice fetch for pre-selected invoice (inline pay)
  const loadSingleInvoice = async (invoiceId: string) => {
    try {
      setSearchingInvoices(true);
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, student_id, total_amount, balance_due, status, branch_id, students(first_name, last_name)')
        .eq('id', invoiceId)
        .single();

      if (error || !data) {
        console.error('Error loading single invoice:', error);
        toast.error('Failed to load invoice');
        return;
      }

      let branchCountry = 'Singapore';
      if (data.branch_id) {
        const { data: branch } = await supabase
          .from('branches')
          .select('country')
          .eq('id', data.branch_id)
          .single();
        if (branch?.country) branchCountry = branch.country;
      }

      const student = data.students as any;
      const studentName = student
        ? `${student.first_name || ''} ${student.last_name || ''}`.trim()
        : 'Unknown Student';

      setInvoices([{
        id: data.id,
        invoice_number: data.invoice_number,
        student_name: studentName,
        student_id: data.student_id,
        total_amount: data.total_amount,
        balance_due: data.balance_due,
        status: data.status || 'draft',
        branch_id: data.branch_id || undefined,
        branch_country: branchCountry
      }]);
    } catch (error) {
      console.error('Error loading single invoice:', error);
      toast.error('Failed to load invoice');
    } finally {
      setSearchingInvoices(false);
    }
  };

  useEffect(() => {
    if (open) {
      if (preSelectedInvoiceId) {
        loadSingleInvoice(preSelectedInvoiceId);
      } else {
        loadInvoices();
      }
    }
  }, [open]);

  useEffect(() => {
    if (preSelectedInvoiceId) {
      setFormData(prev => ({ ...prev, invoice_id: preSelectedInvoiceId }));
    }
  }, [preSelectedInvoiceId]);

  const loadInvoices = async () => {
    try {
      setSearchingInvoices(true);
      const response = await getInvoices(1, 100, searchQuery);
      const unpaidInvoices = response.invoices.filter(inv => 
        inv.status !== 'paid' && inv.status !== 'cancelled' && inv.balance_due > 0
      );
      
      const branchIds = [...new Set(unpaidInvoices.filter(inv => inv.branch_id).map(inv => inv.branch_id))];
      let branchCountries: Record<string, string> = {};
      
      if (branchIds.length > 0) {
        const { data: branches } = await supabase
          .from('branches')
          .select('id, country')
          .in('id', branchIds as string[]);
        
        if (branches) {
          branchCountries = branches.reduce((acc, branch) => {
            acc[branch.id] = branch.country || 'Singapore';
            return acc;
          }, {} as Record<string, string>);
        }
      }
      
      setInvoices(unpaidInvoices.map(inv => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        student_name: inv.student_name || 'Unknown Student',
        student_id: inv.student_id,
        total_amount: inv.total_amount,
        balance_due: inv.balance_due,
        status: inv.status,
        branch_id: inv.branch_id,
        branch_country: inv.branch_id ? branchCountries[inv.branch_id] : 'Singapore'
      })));
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setSearchingInvoices(false);
    }
  };

  useEffect(() => {
    if (open && !preSelectedInvoiceId) {
      const debounceTimer = setTimeout(() => {
        loadInvoices();
      }, 300);
      return () => clearTimeout(debounceTimer);
    }
  }, [searchQuery, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.invoice_id) {
      toast.error('Please select an invoice');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    // Proof of payment is required unless payment method is cash
    if (!proofFile && formData.payment_method !== 'cash') {
      toast.error('Please upload proof of payment');
      return;
    }

    const selectedInvoice = invoices.find(inv => inv.id === formData.invoice_id);
    const paymentAmount = parseFloat(formData.amount);
    
    if (selectedInvoice && paymentAmount > selectedInvoice.balance_due) {
      const excess = paymentAmount - selectedInvoice.balance_due;
      if (!window.confirm(`Payment exceeds balance due by $${excess.toFixed(2)}. The excess will be stored as student credit. Continue?`)) {
        return;
      }
    }

    setLoading(true);
    try {
      let proofUrl = formData.proof_of_payment_url;
      
      // Upload proof file if selected
      if (proofFile) {
        setUploadingProof(true);
        const fileExt = proofFile.name.split('.').pop();
        const fileName = `${formData.invoice_id}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(fileName, proofFile);
        
        if (uploadError) {
          throw new Error(`Failed to upload proof: ${uploadError.message}`);
        }
        
        const { data: urlData } = supabase.storage
          .from('payment-proofs')
          .getPublicUrl(fileName);
        
        proofUrl = urlData.publicUrl;
        setUploadingProof(false);
      }
      
      const paymentData: CreatePaymentData = {
        invoice_id: formData.invoice_id,
        amount: parseFloat(formData.amount),
        payment_date: formData.payment_date,
        payment_method: formData.payment_method,
        reference_number: formData.reference_number || undefined,
        proof_of_payment_url: proofUrl || undefined,
        notes: formData.notes || undefined
      };

      await createPayment(paymentData);
      
      toast.success('Payment recorded successfully');
      setOpen(false);
      resetForm();
      onPaymentCreated?.();
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to record payment');
    } finally {
      setLoading(false);
      setUploadingProof(false);
    }
  };

  const resetForm = () => {
    setFormData({
      invoice_id: preSelectedInvoiceId || '',
      amount: '',
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'paynow',
      reference_number: '',
      proof_of_payment_url: '',
      notes: ''
    });
    setSearchQuery('');
    setProofFile(null);
  };


  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type (images only)
      if (!file.type.startsWith('image/')) {
        toast.error('Only image files are accepted for payment proof');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setProofFile(file);
    }
  };

  const removeFile = () => {
    setProofFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatCurrencyValue = (amount: number) => {
    return new Intl.NumberFormat('en-SG', {
      style: 'currency',
      currency: 'SGD'
    }).format(amount);
  };

  const selectedInvoice = invoices.find(inv => inv.id === formData.invoice_id);

  // Fetch invoice items and student credit when invoice is selected
  useEffect(() => {
    const fetchItems = async () => {
      if (!formData.invoice_id) {
        setInvoiceItems([]);
        setStudentCreditBalance(0);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('invoice_items')
          .select('id, description, quantity, unit_price, total_amount')
          .eq('invoice_id', formData.invoice_id)
          .order('created_at');
        if (!error && data) {
          setInvoiceItems(data);
        }
      } catch (err) {
        console.error('Error fetching invoice items:', err);
      }

      // Fetch student credit balance
      const invoice = invoices.find(inv => inv.id === formData.invoice_id);
      if (invoice?.student_id) {
        try {
          const balance = await getStudentCreditBalance(invoice.student_id);
          setStudentCreditBalance(balance);
        } catch {
          setStudentCreditBalance(0);
        }
      }
    };
    fetchItems();
  }, [formData.invoice_id, invoices]);
  
  // Determine country from selected invoice
  const selectedCountry = selectedInvoice?.branch_country || 'Singapore';
  const isSingapore = selectedCountry === 'Singapore';
  const isAustralia = selectedCountry === 'Australia';
  
  // Payment methods with country-based filtering and student portal exclusion
  const paymentMethods = useMemo(() => {
    const methods = [
      { value: 'paynow', label: 'PayNow', hideFor: ['Australia'] },
      { value: 'cash', label: 'Cash', hideFor: ['Singapore'] },
      { value: 'bank_transfer', label: 'Bank Transfer', hideFor: [] },
    ];
    
    return methods.filter(method => {
      // Hide cash for student portal
      if (isStudentPortal && method.value === 'cash') return false;
      return !method.hideFor.includes(selectedCountry);
    });
  }, [selectedCountry, isStudentPortal]);

  // Fetch invoice template based on selected invoice's branch country
  useEffect(() => {
    const fetchTemplate = async () => {
      if (!selectedCountry) return;
      
      const countryCodeMap: Record<string, string> = {
        'Singapore': 'SG',
        'Australia': 'AU'
      };
      const countryCode = countryCodeMap[selectedCountry] || 'SG';
      
      try {
        const templates = await getInvoiceTemplates(true);
        const matchingTemplate = templates.find(t => t.country === countryCode);
        setInvoiceTemplate(matchingTemplate || null);
      } catch (error) {
        console.error('Error fetching invoice template:', error);
      }
    };
    
    fetchTemplate();
  }, [selectedCountry]);
  
  // Set default payment method when invoice changes
  useEffect(() => {
    if (selectedInvoice) {
      const defaultMethod = isSingapore ? 'paynow' : 'bank_transfer';
      // Only update if current method is not available for this country
      const currentMethodAvailable = paymentMethods.some(m => m.value === formData.payment_method);
      if (!currentMethodAvailable) {
        handleInputChange('payment_method', defaultMethod);
      }
    }
  }, [selectedInvoice?.id, isSingapore, paymentMethods]);

  // Default amount to invoice balance when invoice is selected
  useEffect(() => {
    if (selectedInvoice && !formData.amount) {
      handleInputChange('amount', selectedInvoice.balance_due.toString());
    }
  }, [selectedInvoice?.id]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-sm">Record Payment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Invoice Selection - Hidden when pre-selected (e.g., from Student Portal) */}
          {!preSelectedInvoiceId && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Select Invoice</h3>
              
              <div className="space-y-2">
                <Label>Search Invoices</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by invoice number or student name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoice_id">Invoice *</Label>
                <Select value={formData.invoice_id} onValueChange={(value) => handleInputChange('invoice_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={searchingInvoices ? "Loading..." : "Select invoice"} />
                  </SelectTrigger>
                  <SelectContent>
                    {invoices.map((invoice) => (
                      <SelectItem key={invoice.id} value={invoice.id}>
                        <div className="flex items-center justify-between w-full">
                          <div>
                            <span className="font-medium">{invoice.invoice_number}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              {invoice.student_name}
                            </span>
                          </div>
                          <span className="text-sm font-medium">
                            Balance: {formatCurrencyValue(invoice.balance_due)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Selected Invoice Info */}
          {selectedInvoice && (
            <Card className="bg-muted/50">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5" />
                  Invoice Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-3 pb-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Student:</span>
                    <div className="font-medium">{selectedInvoice.student_name}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <div className="font-medium capitalize">{selectedInvoice.status}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Amount:</span>
                    <div className="font-medium">{formatCurrencyValue(selectedInvoice.total_amount)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Balance Due:</span>
                    <div className="font-bold text-sm text-destructive">
                      {formatCurrencyValue(selectedInvoice.balance_due)}
                    </div>
                  </div>
                </div>

                {/* Invoice Items */}
                {invoiceItems.length > 0 && (
                  <div className="border-t pt-2 mt-1">
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Items</p>
                    <div className="space-y-1">
                      {invoiceItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-xs">
                          <div className="flex-1 min-w-0">
                            <span className="truncate block">{item.description}</span>
                          </div>
                          <span className="font-medium text-foreground ml-2 shrink-0">
                            {formatCurrencyValue(item.total_amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Student Credit Balance */}
                {studentCreditBalance > 0 && (
                  <div className="border-t pt-2 mt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Available Student Credit:</span>
                      <Badge variant="secondary" className="text-green-600 font-semibold">
                        {formatCurrencyValue(studentCreditBalance)}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Payment Details */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Payment Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="amount" className="text-xs">Payment Amount *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={selectedInvoice?.balance_due}
                    value={formData.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    placeholder="0.00"
                    className="pl-9 h-8 text-xs"
                    required
                  />
                </div>
                {selectedInvoice && formData.amount && parseFloat(formData.amount) > selectedInvoice.balance_due && (
                  <p className="text-xs text-destructive">
                    Amount exceeds balance due of {formatCurrencyValue(selectedInvoice.balance_due)}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="payment_date" className="text-xs">Payment Date *</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => handleInputChange('payment_date', e.target.value)}
                  className="h-8 text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="payment_method" className="text-xs">Payment Method *</Label>
              <Select value={formData.payment_method} onValueChange={(value) => handleInputChange('payment_method', value)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Info Display - Bank Transfer Info or PayNow QR */}
            <PaymentInfoDisplay
              paymentMethod={formData.payment_method}
              bankTransferInfo={invoiceTemplate?.bank_transfer_info}
              paynowQrUrl={invoiceTemplate?.paynow_qr_url}
            />

            <div className="space-y-1">
              <Label htmlFor="reference_number" className="text-xs">Reference Number</Label>
              <Input
                id="reference_number"
                value={formData.reference_number}
                onChange={(e) => handleInputChange('reference_number', e.target.value)}
                placeholder="Transaction ID, cheque number, etc."
                className="h-8 text-xs"
              />
            </div>

            <ProofOfPaymentUpload
              value={proofFile}
              onChange={setProofFile}
              required={formData.payment_method !== 'cash'}
              label={`Proof of Payment${formData.payment_method !== 'cash' ? '' : ' (optional for cash)'}`}
              compact
            />

          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || uploadingProof || !formData.invoice_id || !formData.amount} className="h-8 text-xs">
              {(loading || uploadingProof) && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {uploadingProof ? 'Uploading...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePaymentDialog;