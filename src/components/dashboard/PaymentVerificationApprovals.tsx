import React, { useState } from 'react';
import { SignedImage, SignedLink } from '@/components/common/SignedMedia';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ShieldCheck, CheckCircle, Pencil, XCircle } from 'lucide-react';

import { toast } from 'sonner';
import { formatDate } from '@/utils/dateFormat';
import { postPaymentJournal, postInvoiceIssuedJournal } from '@/services/accountingPostings';

const PaymentVerificationApprovals = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [editAmount, setEditAmount] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [rejectingPayment, setRejectingPayment] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const { data: unverifiedPayments = [], isLoading } = useQuery({
    queryKey: ['superadmin-unverified-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, invoices!inner(invoice_number, branch_id, total_amount, status, students(first_name, last_name))')
        .eq('is_verified', false)
        .or('proof_of_payment_url.not.is.null,payment_method.eq.credit')
        .neq('payment_method', 'cash')
        .or('verification_status.is.null,verification_status.eq.pending')
        .order('payment_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches-lookup'],
    queryFn: async () => {
      const { data } = await supabase.from('branches').select('id, name');
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const branchMap = React.useMemo(() => {
    const map = new Map<string, string>();
    branches.forEach((b: any) => map.set(b.id, b.name));
    return map;
  }, [branches]);

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['superadmin-unverified-payments'] });
    queryClient.invalidateQueries({ queryKey: ['pending-verification-count'] });
    queryClient.invalidateQueries({ queryKey: ['branch-payments'] });
    queryClient.invalidateQueries({ queryKey: ['branch-invoices'] });
  };

  // Recalculate what an invoice has actually been paid, ignoring rejected payments.
  const recalcInvoice = async (invoiceId: string, invoiceTotal: number) => {
    const { data: payments } = await supabase
      .from('payments')
      .select('amount, verification_status, is_verified')
      .eq('invoice_id', invoiceId);

    const live = (payments || []).filter((p: any) => p.verification_status !== 'rejected');
    const totalPaid = live.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
    const balanceDue = Math.max(0, Number((invoiceTotal - totalPaid).toFixed(2)));
    const allVerified = live.length > 0 && live.every((p: any) => p.verification_status === 'verified');
    const status = balanceDue > 0.009
      ? (totalPaid > 0 ? 'partially_paid' : 'unpaid')
      : (allVerified ? 'verified' : 'paid');

    await supabase
      .from('invoices')
      .update({ amount_paid: totalPaid, balance_due: balanceDue, status })
      .eq('id', invoiceId);
  };

  const handleVerify = async (payment: any) => {
    try {
      const stamp = {
        is_verified: true,
        verified_by: user?.employeeId || null,
        verified_at: new Date().toISOString(),
        verification_status: 'verified',
      };

      // Verify every outstanding payment on the invoice, including any credit
      // applied at checkout, so the student's credit hold is settled with it.
      const query = supabase.from('payments').update(stamp);
      const { error: paymentError } = payment.invoice_id
        ? await query
            .eq('invoice_id', payment.invoice_id)
            .or('verification_status.is.null,verification_status.eq.pending')
        : await query.eq('id', payment.id);
      if (paymentError) throw paymentError;

      if (payment.invoice_id) {
        await supabase.rpc('consume_credit_hold', {
          p_invoice_id: payment.invoice_id,
          p_actor: user?.email || 'staff',
        });
        await recalcInvoice(payment.invoice_id, Number(payment.invoices?.total_amount || 0));
      }

      invalidateQueries();
      void postPaymentJournal(payment.id);
      if (payment.invoice_id) void postInvoiceIssuedJournal(payment.invoice_id);
      toast.success('Payment verified successfully');
    } catch (error) {
      toast.error('Failed to verify payment');
    }
  };

  const handleReject = async () => {
    if (!rejectingPayment) return;
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setIsRejecting(true);
    try {
      const stamp = {
        verification_status: 'rejected',
        verification_rejection_reason: rejectionReason.trim(),
        verified_by: user?.employeeId || null,
        verified_at: new Date().toISOString(),
      };

      const query = supabase.from('payments').update(stamp);
      const { error: paymentError } = rejectingPayment.invoice_id
        ? await query
            .eq('invoice_id', rejectingPayment.invoice_id)
            .or('verification_status.is.null,verification_status.eq.pending')
        : await query.eq('id', rejectingPayment.id);
      if (paymentError) throw paymentError;

      if (rejectingPayment.invoice_id) {
        // Give any credit held for this payment back to the student.
        await supabase.rpc('release_credit_hold', {
          p_invoice_id: rejectingPayment.invoice_id,
          p_actor: user?.email || 'staff',
        });
        await recalcInvoice(rejectingPayment.invoice_id, Number(rejectingPayment.invoices?.total_amount || 0));
      }

      invalidateQueries();
      void postPaymentJournal(rejectingPayment.id);
      if (rejectingPayment.invoice_id) void postInvoiceIssuedJournal(rejectingPayment.invoice_id);
      toast.success('Payment verification rejected');
      setRejectingPayment(null);
      setRejectionReason('');
    } catch (error) {
      toast.error('Failed to reject payment');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleEditAmount = (payment: any) => {
    setEditingPayment(payment);
    setEditAmount(payment.amount?.toString() || '0');
  };

  const handleSaveAmount = async () => {
    if (!editingPayment) return;
    const newAmount = parseFloat(editAmount);
    if (isNaN(newAmount) || newAmount < 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('payments')
        .update({ amount: newAmount, updated_at: new Date().toISOString() })
        .eq('id', editingPayment.id);
      if (error) throw error;

      if (editingPayment.invoice_id) {
        const { data: allPayments } = await supabase
          .from('payments')
          .select('amount')
          .eq('invoice_id', editingPayment.invoice_id);

        const totalPaid = (allPayments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
        const invoiceTotal = editingPayment.invoices?.total_amount || 0;
        const balanceDue = Math.max(0, invoiceTotal - totalPaid);
        const newStatus = balanceDue <= 0 ? 'paid' : totalPaid > 0 ? 'partially_paid' : 'unpaid';

        await supabase
          .from('invoices')
          .update({ amount_paid: totalPaid, balance_due: balanceDue, status: newStatus })
          .eq('id', editingPayment.invoice_id);
      }

      invalidateQueries();
      toast.success('Payment amount updated');
      setEditingPayment(null);
    } catch (error) {
      toast.error('Failed to update payment amount');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || unverifiedPayments.length === 0) return null;

  return (
    <>
      <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
        <CardHeader className="px-3 py-3 sm:px-6 sm:py-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <ShieldCheck className="w-4 h-4 text-orange-600" />
            Payment Verification
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 text-xs">
              {unverifiedPayments.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6 space-y-2">
          {unverifiedPayments.map((payment: any) => (
            <div
              key={payment.id}
              className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-background rounded-lg border"
            >
              {payment.payment_method === 'credit' && !payment.proof_of_payment_url ? (
                <div className="shrink-0 w-full sm:w-[200px] h-[100px] rounded border flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground bg-muted">
                  <Wallet className="w-5 h-5" />
                  <span>Credit payment — no proof needed</span>
                  <span className="text-[10px]">Confirm to finalise the credit, or Reject to return it</span>
                </div>
              ) : (
              <SignedLink
                href={payment.proof_of_payment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 w-full sm:w-[200px] rounded border overflow-hidden hover:opacity-80 transition-opacity cursor-pointer"
              >
                <SignedImage
                  src={payment.proof_of_payment_url}
                  alt="Payment proof"
                  className="w-full h-auto max-h-[150px] sm:max-h-none object-contain"
                  fallback={
                    <div className="w-full h-[100px] flex items-center justify-center text-xs text-muted-foreground bg-muted">
                      Payment proof
                    </div>
                  }
                />
              </SignedLink>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">
                  {payment.invoices?.invoice_number || 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {payment.invoices?.students
                    ? `${payment.invoices.students.first_name} ${payment.invoices.students.last_name}`
                    : 'Unknown'}{' '}
                  · ${payment.amount?.toFixed(2)} ·{' '}
                  {formatDate(new Date(payment.payment_date))} ·{' '}
                  <span className="capitalize">
                    {payment.payment_method?.replace('_', ' ')}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {branchMap.get(payment.invoices?.branch_id) || 'Unknown'}
                </p>
                {payment.proof_scan_status && (
                  <Badge
                    variant="secondary"
                    className={`mt-1 text-[10px] ${
                      payment.proof_scan_status === 'match'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : payment.proof_scan_status === 'mismatch'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {payment.proof_scan_status === 'match'
                      ? `Screenshot matches $${Number(payment.proof_scan_amount ?? 0).toFixed(2)}`
                      : payment.proof_scan_status === 'mismatch'
                        ? `Screenshot shows $${Number(payment.proof_scan_amount ?? 0).toFixed(2)}`
                        : 'Screenshot could not be read'}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => handleEditAmount(payment)}>
                  <Pencil className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button size="sm" variant="destructive" className="h-7 text-xs px-2" onClick={() => { setRejectingPayment(payment); setRejectionReason(''); }}>
                  <XCircle className="w-3 h-3 mr-1" />
                  Reject
                </Button>
                <Button size="sm" className="h-7 text-xs px-2" onClick={() => handleVerify(payment)}>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Verify
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Edit Amount Dialog */}
      <Dialog open={!!editingPayment} onOpenChange={(open) => !open && setEditingPayment(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Payment Amount</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              {editingPayment?.invoices?.invoice_number} — {editingPayment?.invoices?.students
                ? `${editingPayment.invoices.students.first_name} ${editingPayment.invoices.students.last_name}`
                : 'Unknown'}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="edit-amount">Received Amount ($)</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                min="0"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPayment(null)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSaveAmount} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Payment Dialog */}
      <Dialog open={!!rejectingPayment} onOpenChange={(open) => { if (!open) { setRejectingPayment(null); setRejectionReason(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject Payment Verification</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              {rejectingPayment?.invoices?.invoice_number} — {rejectingPayment?.invoices?.students
                ? `${rejectingPayment.invoices.students.first_name} ${rejectingPayment.invoices.students.last_name}`
                : 'Unknown'}
              {' '}· ${rejectingPayment?.amount?.toFixed(2)}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="rejection-reason">Reason for Rejection *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="e.g. Proof is blurry, amount doesn't match..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectingPayment(null); setRejectionReason(''); }} disabled={isRejecting}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={isRejecting || !rejectionReason.trim()}>
              {isRejecting ? 'Rejecting...' : 'Reject Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PaymentVerificationApprovals;
