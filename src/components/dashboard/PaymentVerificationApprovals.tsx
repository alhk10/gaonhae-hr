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
import { ShieldCheck, CheckCircle, Pencil, XCircle, Wallet, FileText, Trash2, ImagePlus } from 'lucide-react';
import InvoiceDialog from '@/components/sales/InvoiceDialog';
import { deletePayment } from '@/services/paymentService';
import { scanStoredPayments } from '@/hooks/usePaymentProofScan';

import { toast } from 'sonner';
import { formatDate } from '@/utils/dateFormat';

const PaymentVerificationApprovals = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [editAmount, setEditAmount] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [rejectingPayment, setRejectingPayment] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<any>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [proofPayment, setProofPayment] = useState<any>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofAmount, setProofAmount] = useState('');
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [viewingExtras, setViewingExtras] = useState<any>(null);

  const { data: unverifiedPayments = [], isLoading } = useQuery({
    queryKey: ['superadmin-unverified-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, invoices!inner(invoice_number, branch_id, student_id, total_amount, status, students(first_name, last_name))')
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

  // Catch-up: scan pending proofs that were never read, so matching ones auto-verify.
  const scanAttempted = React.useRef(new Set<string>());
  React.useEffect(() => {
    const ids = (unverifiedPayments as any[])
      .filter((p) => p.proof_of_payment_url && !p.proof_scan_status && p.payment_method !== 'credit' && !scanAttempted.current.has(p.id))
      .map((p) => p.id as string)
      .slice(0, 10);
    if (!ids.length) return;
    ids.forEach((id) => scanAttempted.current.add(id));
    void scanStoredPayments({ paymentIds: ids }).then((res) => {
      if (!res || !Object.keys(res).length) return;
      // Matched proofs auto-verify on the server; post their accounts like a manual Verify.
      for (const [pid, status] of Object.entries(res)) {
        if (status !== 'match') continue;
        const inv = (unverifiedPayments as any[]).find((p) => p.id === pid)?.invoice_id;
      }
      invalidateQueries();
      queryClient.invalidateQueries({ queryKey: ['superadmin-unverified-payments'] });
    });
  }, [unverifiedPayments, queryClient]);

  const creditStudentIds = React.useMemo(
    () => Array.from(new Set(
      (unverifiedPayments as any[])
        .filter((p) => p.payment_method === 'credit' && p.invoices?.student_id)
        .map((p) => p.invoices.student_id as string)
    )),
    [unverifiedPayments]
  );

  const { data: creditBalances = new Map<string, number>() } = useQuery({
    queryKey: ['credit-payment-balances', creditStudentIds.join(',')],
    enabled: creditStudentIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_credits')
        .select('student_id, amount')
        .in('student_id', creditStudentIds);
      if (error) throw error;
      const map = new Map<string, number>();
      (data || []).forEach((row: any) => {
        map.set(row.student_id, (map.get(row.student_id) || 0) + Number(row.amount || 0));
      });
      return map;
    },
    staleTime: 30 * 1000,
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

      // Verify only the reviewed payment row. If the invoice also has a
      // pending credit payment (credit applied at checkout), stamp that row
      // too so the student's credit hold is settled with this decision —
      // other unrelated pending payments on the invoice are left untouched.
      const { error: paymentError } = await supabase
        .from('payments')
        .update(stamp)
        .eq('id', payment.id);
      if (paymentError) throw paymentError;

      if (payment.invoice_id && payment.payment_method !== 'credit') {
        await supabase
          .from('payments')
          .update(stamp)
          .eq('invoice_id', payment.invoice_id)
          .eq('payment_method', 'credit')
          .or('verification_status.is.null,verification_status.eq.pending');
      }

      if (payment.invoice_id) {
        await supabase.rpc('consume_credit_hold', {
          p_invoice_id: payment.invoice_id,
          p_actor: user?.email || 'staff',
        });
        await recalcInvoice(payment.invoice_id, Number(payment.invoices?.total_amount || 0));
      }

      invalidateQueries();
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

      // Reject only the reviewed payment row; the linked credit row on the
      // same invoice follows the decision so its hold is released. Other
      // pending payments on the invoice are not affected.
      const { error: paymentError } = await supabase
        .from('payments')
        .update(stamp)
        .eq('id', rejectingPayment.id);
      if (paymentError) throw paymentError;

      if (rejectingPayment.invoice_id && rejectingPayment.payment_method !== 'credit') {
        await supabase
          .from('payments')
          .update(stamp)
          .eq('invoice_id', rejectingPayment.invoice_id)
          .eq('payment_method', 'credit')
          .or('verification_status.is.null,verification_status.eq.pending');
      }

      if (rejectingPayment.invoice_id) {
        // Give any credit held for this payment back to the student.
        await supabase.rpc('release_credit_hold', {
          p_invoice_id: rejectingPayment.invoice_id,
          p_actor: user?.email || 'staff',
        });
        await recalcInvoice(rejectingPayment.invoice_id, Number(rejectingPayment.invoices?.total_amount || 0));
      }

      invalidateQueries();
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

  const handleDelete = async () => {
    if (!deletingPayment) return;
    if (!deleteReason.trim()) {
      toast.error('Please give a reason (e.g. duplicate, wrong payment)');
      return;
    }
    setIsDeleting(true);
    try {
      // Return any held credit to the student before removing the payment.
      if (deletingPayment.invoice_id) {
        await supabase.rpc('release_credit_hold', {
          p_invoice_id: deletingPayment.invoice_id,
          p_actor: user?.email || 'superadmin',
        });
      }
      await deletePayment(deletingPayment.id);
      await logInvoiceChangeSafe(deletingPayment.invoice_id, deleteReason.trim());
      invalidateQueries();
      toast.success('Payment deleted and invoice recalculated');
      setDeletingPayment(null);
      setDeleteReason('');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete payment');
    } finally {
      setIsDeleting(false);
    }
  };

  const logInvoiceChangeSafe = async (invoiceId: string | undefined, reason: string) => {
    if (!invoiceId) return;
    try {
      const { logInvoiceChange } = await import('@/services/invoiceChangeLogService');
      await logInvoiceChange({
        invoice_id: invoiceId,
        action: 'payment_removed',
        changes: { reason },
      });
    } catch { /* logging is best-effort */ }
  };

  const handleAddProof = async () => {
    if (!proofPayment || !proofFile) {
      toast.error('Choose a screenshot');
      return;
    }
    if (!proofFile.type.startsWith('image/')) {
      toast.error('Please upload an image (PDF not accepted)');
      return;
    }
    const amt = proofAmount.trim() === '' ? null : Number(proofAmount);
    if (amt != null && (!isFinite(amt) || amt <= 0)) {
      toast.error('Enter the amount shown on the screenshot');
      return;
    }
    setIsUploadingProof(true);
    try {
      const ext = proofFile.name.split('.').pop() || 'jpg';
      const path = `public-fees/${proofPayment.invoices?.branch_id || 'unknown'}/extra_${Date.now()}_proof.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('payment-proofs')
        .upload(path, proofFile, { upsert: false, contentType: proofFile.type });
      if (upErr) throw new Error(`Proof upload failed: ${upErr.message}`);

      const existing = Array.isArray(proofPayment.extra_proofs) ? proofPayment.extra_proofs : [];
      const { error } = await supabase
        .from('payments')
        .update({
          extra_proofs: [...existing, { url: path, amount: amt, uploaded_at: new Date().toISOString() }],
          updated_at: new Date().toISOString(),
        })
        .eq('id', proofPayment.id);
      if (error) throw error;

      invalidateQueries();
      toast.success('Second payment screenshot added');
      setProofPayment(null);
      setProofFile(null);
      setProofAmount('');
    } catch (error: any) {
      toast.error(error?.message || 'Upload failed');
    } finally {
      setIsUploadingProof(false);
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
                  {payment.invoices?.student_id && creditBalances.has(payment.invoices.student_id) && (
                    <span className="text-[10px] font-medium text-foreground">
                      Balance: ${(creditBalances.get(payment.invoices.student_id)! + Number(payment.amount || 0)).toFixed(2)}
                      {' → '}
                      ${creditBalances.get(payment.invoices.student_id)!.toFixed(2)}
                    </span>
                  )}
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
                {Array.isArray(payment.extra_proofs) && payment.extra_proofs.length > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-1 ml-1 h-auto text-[10px] px-1.5 py-0.5"
                    onClick={() => setViewingExtras(payment)}
                  >
                    +{payment.extra_proofs.length} extra proof{payment.extra_proofs.length > 1 ? 's' : ''}
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => handleEditAmount(payment)}>
                  <Pencil className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                {payment.invoice_id && (
                  <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => setEditingInvoiceId(payment.invoice_id)}>
                    <FileText className="w-3 h-3 mr-1" />
                    Edit Invoice
                  </Button>
                )}
                <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => { setProofPayment(payment); setProofFile(null); setProofAmount(''); }}>
                  <ImagePlus className="w-3 h-3 mr-1" />
                  Add Proof
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs px-2 text-destructive border-destructive/40 hover:bg-destructive/10" onClick={() => { setDeletingPayment(payment); setDeleteReason(''); }}>
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
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

      {/* Edit Invoice Dialog */}
      {editingInvoiceId && (
        <InvoiceDialog
          mode="edit"
          invoiceId={editingInvoiceId}
          open={!!editingInvoiceId}
          onOpenChange={(open) => { if (!open) setEditingInvoiceId(null); }}
          onInvoiceUpdated={() => {
            invalidateQueries();
            setEditingInvoiceId(null);
          }}
        />
      )}

      {/* Delete Payment Dialog */}
      <Dialog open={!!deletingPayment} onOpenChange={(open) => { if (!open) { setDeletingPayment(null); setDeleteReason(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              {deletingPayment?.invoices?.invoice_number} — {deletingPayment?.invoices?.students
                ? `${deletingPayment.invoices.students.first_name} ${deletingPayment.invoices.students.last_name}`
                : 'Unknown'}
              {' '}· ${deletingPayment?.amount?.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">
              The payment is removed and the invoice total paid / balance / status recalculated. Any held credit returns to the student. If the whole invoice is a duplicate, delete it afterwards from Edit Invoice.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="delete-reason">Reason *</Label>
              <Textarea
                id="delete-reason"
                placeholder="e.g. Duplicate payment, wrong invoice..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeletingPayment(null); setDeleteReason(''); }} disabled={isDeleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting || !deleteReason.trim()}>
              {isDeleting ? 'Deleting...' : 'Delete Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Second Proof Dialog */}
      <Dialog open={!!proofPayment} onOpenChange={(open) => { if (!open) { setProofPayment(null); setProofFile(null); setProofAmount(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add another payment screenshot</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              {proofPayment?.invoices?.invoice_number} — {proofPayment?.invoices?.students
                ? `${proofPayment.invoices.students.first_name} ${proofPayment.invoices.students.last_name}`
                : 'Unknown'}
            </p>
            <Input type="file" accept="image/*" className="text-xs" onChange={(e) => setProofFile(e.target.files?.[0] || null)} />
            <div className="space-y-1.5">
              <Label htmlFor="proof-amount">Amount on this screenshot ($)</Label>
              <Input
                id="proof-amount"
                type="number"
                step="0.01"
                min="0"
                value={proofAmount}
                onChange={(e) => setProofAmount(e.target.value)}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">The first screenshot is kept. Verification status does not change.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setProofPayment(null); setProofFile(null); setProofAmount(''); }} disabled={isUploadingProof}>Cancel</Button>
            <Button onClick={handleAddProof} disabled={isUploadingProof || !proofFile}>
              {isUploadingProof ? 'Uploading...' : 'Add screenshot'}
            </Button>
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

      {/* View Extra Proofs Dialog */}
      <Dialog open={!!viewingExtras} onOpenChange={(open) => { if (!open) setViewingExtras(null); }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Extra payment proofs</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {viewingExtras?.invoices?.invoice_number} — {viewingExtras?.invoices?.students
                ? `${viewingExtras.invoices.students.first_name} ${viewingExtras.invoices.students.last_name}`
                : 'Unknown'}
            </p>
            {(Array.isArray(viewingExtras?.extra_proofs) ? viewingExtras.extra_proofs : []).map((p: any, i: number) => (
              <div key={i} className="space-y-1">
                <div className="text-xs text-muted-foreground">
                  Screenshot {i + 2}
                  {p?.amount != null && Number(p.amount) > 0 ? ` · $${Number(p.amount).toFixed(2)}` : ' · no amount entered'}
                  {p?.uploaded_at ? ` · ${formatDate(new Date(p.uploaded_at))}` : ''}
                </div>
                <SignedLink href={typeof p === 'string' ? p : p?.url} target="_blank" rel="noopener noreferrer">
                  <SignedImage
                    src={typeof p === 'string' ? p : p?.url}
                    alt={`Extra payment proof ${i + 2}`}
                    className="w-full max-h-[50vh] object-contain rounded border cursor-pointer hover:opacity-80"
                    fallback={
                      <div className="w-full h-[100px] flex items-center justify-center text-xs text-muted-foreground bg-muted rounded border">
                        Payment proof
                      </div>
                    }
                  />
                </SignedLink>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingExtras(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PaymentVerificationApprovals;
