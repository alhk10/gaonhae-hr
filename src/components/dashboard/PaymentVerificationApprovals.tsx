import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ShieldCheck, CheckCircle, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const PaymentVerificationApprovals = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [editAmount, setEditAmount] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { data: unverifiedPayments = [], isLoading } = useQuery({
    queryKey: ['superadmin-unverified-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, invoices!inner(invoice_number, branch_id, total_amount, status, students(first_name, last_name))')
        .eq('is_verified', false)
        .not('proof_of_payment_url', 'is', null)
        .neq('payment_method', 'cash')
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

  const handleVerify = async (payment: any) => {
    try {
      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          is_verified: true,
          verified_by: user?.employeeId || null,
          verified_at: new Date().toISOString(),
        })
        .eq('id', payment.id);
      if (paymentError) throw paymentError;

      if (payment.invoice_id) {
        const { error: invoiceError } = await supabase
          .from('invoices')
          .update({ status: 'verified' })
          .eq('id', payment.invoice_id)
          .eq('status', 'paid');
        if (invoiceError) throw invoiceError;
      }

      queryClient.invalidateQueries({ queryKey: ['superadmin-unverified-payments'] });
      queryClient.invalidateQueries({ queryKey: ['branch-payments'] });
      queryClient.invalidateQueries({ queryKey: ['branch-invoices'] });
      toast.success('Payment verified successfully');
    } catch (error) {
      toast.error('Failed to verify payment');
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
        const newStatus = balanceDue <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid';

        await supabase
          .from('invoices')
          .update({ amount_paid: totalPaid, balance_due: balanceDue, status: newStatus })
          .eq('id', editingPayment.invoice_id);
      }

      queryClient.invalidateQueries({ queryKey: ['superadmin-unverified-payments'] });
      queryClient.invalidateQueries({ queryKey: ['branch-payments'] });
      queryClient.invalidateQueries({ queryKey: ['branch-invoices'] });
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
              <a
                href={payment.proof_of_payment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 w-full sm:w-[200px] rounded border overflow-hidden hover:opacity-80 transition-opacity cursor-pointer"
              >
                <img
                  src={payment.proof_of_payment_url}
                  alt="Payment proof"
                  className="w-full h-auto max-h-[150px] sm:max-h-none object-contain"
                />
              </a>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">
                  {payment.invoices?.invoice_number || 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {payment.invoices?.students
                    ? `${payment.invoices.students.first_name} ${payment.invoices.students.last_name}`
                    : 'Unknown'}{' '}
                  · ${payment.amount?.toFixed(2)} ·{' '}
                  {format(new Date(payment.payment_date), 'dd MMM yyyy')} ·{' '}
                  <span className="capitalize">
                    {payment.payment_method?.replace('_', ' ')}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {branchMap.get(payment.invoices?.branch_id) || 'Unknown'}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => handleEditAmount(payment)}>
                  <Pencil className="w-3 h-3 mr-1" />
                  Edit
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
    </>
  );
};

export default PaymentVerificationApprovals;
