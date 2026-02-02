/**
 * Invoice Deletion Approvals Component
 * Displays pending invoice deletion requests for superadmin approval
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X, FileText, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getPendingInvoiceDeletionRequests,
  approveInvoiceDeletionRequest,
  rejectInvoiceDeletionRequest,
  type InvoiceDeletionRequest
} from '@/services/invoiceDeletionRequestService';
import { formatCurrency } from '@/utils/currencyUtils';

const InvoiceDeletionApprovals: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading, error } = useQuery({
    queryKey: ['pending-invoice-deletion-requests'],
    queryFn: getPendingInvoiceDeletionRequests,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  const approveMutation = useMutation({
    mutationFn: approveInvoiceDeletionRequest,
    onSuccess: () => {
      toast.success('Invoice deletion approved and executed');
      queryClient.invalidateQueries({ queryKey: ['pending-invoice-deletion-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-invoice-deletion-count'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve: ${error.message}`);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: rejectInvoiceDeletionRequest,
    onSuccess: () => {
      toast.success('Deletion request rejected');
      queryClient.invalidateQueries({ queryKey: ['pending-invoice-deletion-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-invoice-deletion-count'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to reject: ${error.message}`);
    }
  });

  const handleApprove = (requestId: string) => {
    if (confirm('Are you sure you want to approve this invoice deletion? This action cannot be undone.')) {
      approveMutation.mutate(requestId);
    }
  };

  const handleReject = (requestId: string) => {
    if (confirm('Are you sure you want to reject this deletion request?')) {
      rejectMutation.mutate(requestId);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-SG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-destructive" />
            Invoice Deletion Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-4 h-4" />
            <span>Failed to load deletion requests</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-destructive" />
          Invoice Deletion Requests
          {requests.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {requests.length} pending
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Review and approve or reject invoice deletion requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No pending invoice deletion requests</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">
                    {request.invoice_number || '-'}
                  </TableCell>
                  <TableCell>
                    {request.student_name || '-'}
                  </TableCell>
                  <TableCell className="font-medium">
                    {request.total_amount ? formatCurrency(request.total_amount) : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {request.requested_by_email || 'Unknown'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(request.created_at)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {request.reason || '-'}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                        title="Approve deletion"
                        onClick={() => handleApprove(request.id)}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Reject deletion"
                        onClick={() => handleReject(request.id)}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default InvoiceDeletionApprovals;
