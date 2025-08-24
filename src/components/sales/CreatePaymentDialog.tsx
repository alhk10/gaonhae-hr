/**
 * Create Payment Dialog Component
 * Form for recording new payments against invoices
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { createPayment, type CreatePaymentData } from '@/services/paymentService';
import { getInvoices } from '@/services/invoiceService';
import { Loader2, Search, FileText, DollarSign } from 'lucide-react';

interface CreatePaymentDialogProps {
  trigger: React.ReactNode;
  onPaymentCreated?: () => void;
  preSelectedInvoiceId?: string;
}

interface InvoiceOption {
  id: string;
  invoice_number: string;
  student_name: string;
  total_amount: number;
  balance_due: number;
  status: string;
}

const CreatePaymentDialog: React.FC<CreatePaymentDialogProps> = ({ 
  trigger, 
  onPaymentCreated,
  preSelectedInvoiceId 
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchingInvoices, setSearchingInvoices] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    invoice_id: preSelectedInvoiceId || '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer' as CreatePaymentData['payment_method'],
    reference_number: '',
    proof_of_payment_url: '',
    notes: ''
  });

  useEffect(() => {
    if (open) {
      loadInvoices();
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
      // Load unpaid or partially paid invoices
      const response = await getInvoices(1, 100, searchQuery);
      const unpaidInvoices = response.invoices.filter(inv => 
        inv.status !== 'paid' && inv.status !== 'cancelled' && inv.balance_due > 0
      );
      
      setInvoices(unpaidInvoices.map(inv => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        student_name: inv.student_name || 'Unknown Student',
        total_amount: inv.total_amount,
        balance_due: inv.balance_due,
        status: inv.status
      })));
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setSearchingInvoices(false);
    }
  };

  useEffect(() => {
    if (open) {
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

    const selectedInvoice = invoices.find(inv => inv.id === formData.invoice_id);
    if (selectedInvoice && parseFloat(formData.amount) > selectedInvoice.balance_due) {
      toast.error(`Payment amount cannot exceed balance due of ${formatCurrency(selectedInvoice.balance_due)}`);
      return;
    }

    setLoading(true);
    try {
      const paymentData: CreatePaymentData = {
        invoice_id: formData.invoice_id,
        amount: parseFloat(formData.amount),
        payment_date: formData.payment_date,
        payment_method: formData.payment_method,
        reference_number: formData.reference_number || undefined,
        proof_of_payment_url: formData.proof_of_payment_url || undefined,
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
    }
  };

  const resetForm = () => {
    setFormData({
      invoice_id: preSelectedInvoiceId || '',
      amount: '',
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'bank_transfer',
      reference_number: '',
      proof_of_payment_url: '',
      notes: ''
    });
    setSearchQuery('');
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-SG', {
      style: 'currency',
      currency: 'SGD'
    }).format(amount);
  };

  const selectedInvoice = invoices.find(inv => inv.id === formData.invoice_id);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a payment against an invoice
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Invoice Selection */}
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
                          Balance: {formatCurrency(invoice.balance_due)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selected Invoice Info */}
            {selectedInvoice && (
              <Card className="bg-muted/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Invoice Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
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
                      <div className="font-medium">{formatCurrency(selectedInvoice.total_amount)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Balance Due:</span>
                      <div className="font-bold text-lg text-red-600">
                        {formatCurrency(selectedInvoice.balance_due)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Payment Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Payment Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Payment Amount *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={selectedInvoice?.balance_due}
                    value={formData.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    placeholder="0.00"
                    className="pl-10"
                    required
                  />
                </div>
                {selectedInvoice && formData.amount && parseFloat(formData.amount) > selectedInvoice.balance_due && (
                  <p className="text-sm text-destructive">
                    Amount exceeds balance due of {formatCurrency(selectedInvoice.balance_due)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_date">Payment Date *</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => handleInputChange('payment_date', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment Method *</Label>
              <Select value={formData.payment_method} onValueChange={(value) => handleInputChange('payment_method', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="digital_wallet">Digital Wallet</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference_number">Reference Number</Label>
              <Input
                id="reference_number"
                value={formData.reference_number}
                onChange={(e) => handleInputChange('reference_number', e.target.value)}
                placeholder="Transaction ID, cheque number, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proof_of_payment_url">Proof of Payment URL</Label>
              <Input
                id="proof_of_payment_url"
                type="url"
                value={formData.proof_of_payment_url}
                onChange={(e) => handleInputChange('proof_of_payment_url', e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Additional notes about this payment"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.invoice_id || !formData.amount}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePaymentDialog;