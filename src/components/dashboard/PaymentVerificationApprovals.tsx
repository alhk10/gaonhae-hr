import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const PaymentVerificationApprovals = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  if (isLoading || unverifiedPayments.length === 0) return null;

  return (
    <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="w-5 h-5 text-orange-600" />
          Payment Verification
          <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
            {unverifiedPayments.length} pending
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {unverifiedPayments.map((payment: any) => (
          <div
            key={payment.id}
            className="flex items-center gap-3 p-3 bg-background rounded-lg border"
          >
            <a
              href={payment.proof_of_payment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 w-[252px] rounded border overflow-hidden hover:opacity-80 transition-opacity cursor-pointer"
            >
              <img
                src={payment.proof_of_payment_url}
                alt="Payment proof"
                className="w-full h-auto object-contain"
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
              <p className="text-xs text-muted-foreground mt-1">
                Branch: {branchMap.get(payment.invoices?.branch_id) || payment.invoices?.branch_id || 'Unknown'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => handleVerify(payment)}>
                <CheckCircle className="w-3 h-3 mr-1" />
                Verify
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default PaymentVerificationApprovals;
