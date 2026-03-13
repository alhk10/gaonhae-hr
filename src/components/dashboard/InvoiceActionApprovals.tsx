import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Check, X, Loader2, FileText } from 'lucide-react';
import { getPendingActionRequests, approveActionRequest, rejectActionRequest, type InvoiceActionRequest } from '@/services/invoiceActionRequestService';
import { cancelInvoice } from '@/services/invoiceService';
import { format } from 'date-fns';

const InvoiceActionApprovals: React.FC = () => {
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<InvoiceActionRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: requests = [] } = useQuery({
    queryKey: ['pending-invoice-action-requests'],
    queryFn: getPendingActionRequests,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  if (requests.length === 0) return null;

  const handleApprove = async (request: InvoiceActionRequest) => {
    try {
      setProcessingId(request.id);

      if (request.action_type === 'cancellation') {
        await cancelInvoice(request.invoice_id);
      }
      // For adjustments, the request_data contains the edit payload
      // which would need to be applied - for now we just approve
      
      await approveActionRequest(request.id);
      toast.success(`${request.action_type === 'cancellation' ? 'Invoice cancelled & refunded' : 'Adjustment approved'} successfully`);
      queryClient.invalidateQueries({ queryKey: ['pending-invoice-action-requests'] });
    } catch (error: any) {
      toast.error(`Failed to approve: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectClick = (request: InvoiceActionRequest) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    try {
      setProcessingId(selectedRequest.id);
      await rejectActionRequest(selectedRequest.id, rejectionReason);
      toast.success('Request rejected');
      setRejectDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['pending-invoice-action-requests'] });
    } catch (error: any) {
      toast.error(`Failed to reject: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice Action Approvals
            <Badge variant="destructive" className="ml-2">{requests.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <Badge variant={request.action_type === 'cancellation' ? 'destructive' : 'outline'}>
                      {request.action_type === 'cancellation' ? 'Cancel & Refund' : 'Adjustment'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{request.invoice_number}</TableCell>
                  <TableCell>{request.student_name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{request.requested_by_email}</TableCell>
                  <TableCell className="text-sm">{format(new Date(request.created_at), 'dd MMM yyyy')}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleApprove(request)}
                        disabled={processingId === request.id}
                      >
                        {processingId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRejectClick(request)}
                        disabled={processingId === request.id}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>Provide a reason for rejecting this {selectedRequest?.action_type} request.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={processingId !== null}>
              {processingId && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InvoiceActionApprovals;
