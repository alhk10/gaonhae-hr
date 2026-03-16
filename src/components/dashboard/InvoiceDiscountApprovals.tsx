import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Receipt } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  getPendingDiscountApprovals,
  approveDiscountApproval,
  rejectDiscountApproval,
  type InvoiceDiscountApproval,
} from '@/services/invoiceDiscountApprovalService';

const InvoiceDiscountApprovals: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['pending-discount-approvals'],
    queryFn: getPendingDiscountApprovals,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveDiscountApproval(id, user?.employeeId || 'superadmin'),
    onSuccess: () => {
      toast.success('Invoice approved and created');
      queryClient.invalidateQueries({ queryKey: ['pending-discount-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['pending-discount-approvals-count'] });
    },
    onError: (err: Error) => toast.error(`Failed to approve: ${err.message}`),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => rejectDiscountApproval(id, user?.employeeId || 'superadmin'),
    onSuccess: () => {
      toast.success('Discount approval rejected');
      queryClient.invalidateQueries({ queryKey: ['pending-discount-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['pending-discount-approvals-count'] });
    },
    onError: (err: Error) => toast.error(`Failed to reject: ${err.message}`),
  });

  const handleApprove = (id: string) => {
    if (confirm('Approve this invoice? It will be created immediately.')) {
      approveMutation.mutate(id);
    }
  };

  const handleReject = (id: string) => {
    if (confirm('Reject this discount approval?')) {
      rejectMutation.mutate(id);
    }
  };

  if (!isLoading && requests.length === 0) return null;

  return (
    <Card>
      <CardHeader className="px-3 py-3 sm:px-6 sm:py-4 pb-2">
        <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
          <Receipt className="w-4 h-4 text-amber-600" />
          Invoice Discounts
          {requests.length > 0 && (
            <Badge variant="destructive" className="ml-1">{requests.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          requests.map((req) => (
            <div
              key={req.id}
              className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card"
            >
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm truncate">{req.student_name}</span>
                  {req.branch_name && (
                    <Badge variant="outline" className="text-xs">{req.branch_name}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{req.item_count} item{req.item_count !== 1 ? 's' : ''}</span>
                  <span>•</span>
                  <span>Total: ${req.total_amount.toFixed(2)}</span>
                  <span>•</span>
                  <span className="text-destructive font-medium">
                    Discount: ${req.total_discount.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  By {req.requested_by_email || 'Unknown'} · {new Date(req.created_at).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  onClick={() => handleReject(req.id)}
                  disabled={rejectMutation.isPending}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleApprove(req.id)}
                  disabled={approveMutation.isPending}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default InvoiceDiscountApprovals;
