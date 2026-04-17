import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Receipt, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { formatDateTime } from '@/utils/dateFormat';
import {
  getPendingDiscountApprovals,
  approveDiscountApproval,
  rejectDiscountApproval,
  type InvoiceDiscountApproval,
} from '@/services/invoiceDiscountApprovalService';

const InvoiceItemsView: React.FC<{ invoiceData: any }> = ({ invoiceData }) => {
  const items = invoiceData?.items || [];
  if (items.length === 0) return <p className="text-xs text-muted-foreground">No items</p>;

  return (
    <div className="mt-2 border rounded-md overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/50">
            <th className="text-left p-1.5 font-medium">Description</th>
            <th className="text-right p-1.5 font-medium w-10">Qty</th>
            <th className="text-right p-1.5 font-medium w-16">Price</th>
            <th className="text-right p-1.5 font-medium w-16">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: any, idx: number) => {
            const gross = (item.quantity || 1) * (item.unit_price || 0);
            const total = item.total_override ?? item.total ?? gross;
            const discount = gross - total;
            return (
              <tr key={idx} className="border-t border-border/50">
                <td className="p-1.5">
                  <span>{item.description || '—'}</span>
                  {discount > 0 && (
                    <span className="ml-1 text-destructive">(-${discount.toFixed(2)})</span>
                  )}
                </td>
                <td className="text-right p-1.5">{item.quantity || 1}</td>
                <td className="text-right p-1.5">${(item.unit_price || 0).toFixed(2)}</td>
                <td className="text-right p-1.5 font-medium">${total.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const ApprovalCard: React.FC<{
  req: InvoiceDiscountApproval;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  approving: boolean;
  rejecting: boolean;
}> = ({ req, onApprove, onReject, approving, rejecting }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-3 rounded-lg border bg-card space-y-2">
      <div className="flex items-center justify-between gap-3">
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
          {req.approval_reason && (
            <div className="flex flex-wrap gap-1 mt-1">
              {req.approval_reason.includes('threshold') && (
                <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                  Discount threshold
                </Badge>
              )}
              {req.approval_reason.includes('out-of-criteria') && (
                <Badge variant="secondary" className="text-[10px] bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                  Exception product
                </Badge>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            By {req.requested_by_email || 'Unknown'} · {formatDateTime(new Date(req.created_at))}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            onClick={() => onReject(req.id)}
            disabled={rejecting}
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onApprove(req.id)}
            disabled={approving}
          >
            <Check className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {expanded && <InvoiceItemsView invoiceData={req.invoice_data} />}
    </div>
  );
};

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
      <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6 space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          requests.map((req) => (
            <ApprovalCard
              key={req.id}
              req={req}
              onApprove={handleApprove}
              onReject={handleReject}
              approving={approveMutation.isPending}
              rejecting={rejectMutation.isPending}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default InvoiceDiscountApprovals;
