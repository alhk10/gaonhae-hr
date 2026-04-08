/**
 * View/Edit Payment Dialog Component
 * Displays payment details and allows editing permitted fields
 */

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { getPaymentById, updatePayment, type Payment } from '@/services/paymentService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/utils/currencyUtils';
import { Loader2, Edit, Save, X, Calendar, FileText, CreditCard, Receipt, Upload } from 'lucide-react';

interface ViewEditPaymentDialogProps {
  paymentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentUpdated?: () => void;
  initialMode?: 'view' | 'edit';
}

const ViewEditPaymentDialog: React.FC<ViewEditPaymentDialogProps> = ({
  paymentId,
  open,
  onOpenChange,
  onPaymentUpdated,
  initialMode = 'view'
}) => {
  const { userrole } = useAuth();
  const isSuperadmin = userrole === 'superadmin';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [newProofFile, setNewProofFile] = useState<File | null>(null);
  const [newProofPreview, setNewProofPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editData, setEditData] = useState({
    payment_method: '' as Payment['payment_method'],
    reference_number: '',
    notes: ''
  });

  useEffect(() => {
    if (open && paymentId) {
      loadPaymentData();
      setMode(initialMode);
    }
  }, [open, paymentId, initialMode]);

  const loadPaymentData = async () => {
    setLoading(true);
    try {
      const paymentData = await getPaymentById(paymentId);
      if (paymentData) {
        setPayment(paymentData);
        setEditData({
          payment_method: paymentData.payment_method,
          reference_number: paymentData.reference_number || '',
          notes: paymentData.notes || ''
        });
      }
    } catch (error) {
      console.error('Error loading payment:', error);
      toast.error('Failed to load payment details');
    } finally {
      setLoading(false);
    }
  };

  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed');
      return;
    }
    setNewProofFile(file);
    setNewProofPreview(URL.createObjectURL(file));
  };

  const uploadProofFile = async (): Promise<string | undefined> => {
    if (!newProofFile || !payment) return undefined;
    setUploading(true);
    try {
      const fileExt = newProofFile.name.split('.').pop();
      const filePath = `${payment.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, newProofFile, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(filePath);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading proof:', error);
      toast.error('Failed to upload proof of payment');
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!payment) return;
    
    setSaving(true);
    try {
      let proofUrl: string | undefined;
      if (newProofFile) {
        proofUrl = await uploadProofFile();
      }

      await updatePayment(payment.id, {
        payment_method: editData.payment_method,
        reference_number: editData.reference_number || undefined,
        notes: editData.notes || undefined,
        ...(proofUrl ? { proof_of_payment_url: proofUrl } : {})
      });

      setNewProofFile(null);
      setNewProofPreview(null);
      toast.success('Payment updated successfully');
      setMode('view');
      loadPaymentData();
      onPaymentUpdated?.();
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('Failed to update payment');
    } finally {
      setSaving(false);
    }
  };

  const formatPaymentMethod = (method: string) => {
    const methods: Record<string, string> = {
      'cash': 'Cash',
      'bank_transfer': 'Bank Transfer',
      'credit_card': 'Credit Card',
      'digital_wallet': 'Digital Wallet',
      'cheque': 'Cheque'
    };
    return methods[method] || method;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-SG');
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!payment) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Not Found</DialogTitle>
            <DialogDescription>The requested payment could not be found.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">
                Payment {payment.payment_number}
              </DialogTitle>
              <DialogDescription>
                For Invoice {payment.invoice_number}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {mode === 'view' ? (
                <Button variant="outline" size="sm" onClick={() => setMode('edit')}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setMode('view')}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Amount Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Payment Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(payment.amount)}
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Payment Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Payment Date</Label>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {formatDate(payment.payment_date)}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Student</Label>
              <div className="text-sm">{payment.student_name}</div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Payment Method</Label>
            {mode === 'edit' ? (
              <Select
                value={editData.payment_method}
                onValueChange={(value) => setEditData(prev => ({ ...prev, payment_method: value as Payment['payment_method'] }))}
              >
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
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {formatPaymentMethod(payment.payment_method)}
                </Badge>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Reference Number</Label>
            {mode === 'edit' ? (
              <Input
                value={editData.reference_number}
                onChange={(e) => setEditData(prev => ({ ...prev, reference_number: e.target.value }))}
                placeholder="e.g., transaction ID, cheque number"
              />
            ) : (
              <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
                {payment.reference_number || 'No reference number'}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            {mode === 'edit' ? (
              <Textarea
                value={editData.notes}
                onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                placeholder="Additional notes about this payment"
              />
            ) : (
              <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
                {payment.notes || 'No notes'}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Proof of Payment</Label>
            {mode === 'edit' && isSuperadmin ? (
              <div className="space-y-2">
                {(newProofPreview || payment.proof_of_payment_url) && (
                  <img
                    src={newProofPreview || payment.proof_of_payment_url || ''}
                    alt="Proof of payment"
                    className="max-h-32 rounded border object-contain"
                  />
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProofFileChange}
                />
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {payment.proof_of_payment_url || newProofFile ? 'Replace Proof' : 'Upload Proof'}
                </Button>
                {newProofFile && (
                  <p className="text-xs text-muted-foreground">{newProofFile.name}</p>
                )}
              </div>
            ) : payment.proof_of_payment_url ? (
              <Button variant="outline" size="sm" asChild>
                <a href={payment.proof_of_payment_url} target="_blank" rel="noopener noreferrer">
                  <Receipt className="h-4 w-4 mr-2" />
                  View Attachment
                </a>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">No proof attached</p>
            )}
          </div>

          <Separator />

          <div className="text-xs text-muted-foreground">
            <div>Created: {new Date(payment.created_at).toLocaleString()}</div>
            {payment.updated_at !== payment.created_at && (
              <div>Last Updated: {new Date(payment.updated_at).toLocaleString()}</div>
            )}
          </div>
        </div>

        {mode === 'edit' && (
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setMode('view')}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || uploading}>
              {(saving || uploading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              {uploading ? 'Uploading...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ViewEditPaymentDialog;
