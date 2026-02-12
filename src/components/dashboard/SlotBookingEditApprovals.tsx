import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X, CalendarClock, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  getPendingEditRequests,
  approveEditRequest,
  rejectEditRequest,
  type SlotBookingEditRequest,
} from '@/services/slotBookingEditRequestService';

const SlotBookingEditApprovals: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading, error } = useQuery({
    queryKey: ['pending-slot-edit-requests'],
    queryFn: getPendingEditRequests,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const approveMutation = useMutation({
    mutationFn: (requestId: string) => approveEditRequest(requestId, user?.employeeId || 'superadmin'),
    onSuccess: () => {
      toast.success('Edit request approved and executed');
      queryClient.invalidateQueries({ queryKey: ['pending-slot-edit-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-edit-requests-count'] });
      queryClient.invalidateQueries({ queryKey: ['branch-casual-schedule'] });
    },
    onError: (err: Error) => toast.error(`Failed to approve: ${err.message}`),
  });

  const rejectMutation = useMutation({
    mutationFn: (requestId: string) => rejectEditRequest(requestId, user?.employeeId || 'superadmin'),
    onSuccess: () => {
      toast.success('Edit request rejected');
      queryClient.invalidateQueries({ queryKey: ['pending-slot-edit-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-edit-requests-count'] });
    },
    onError: (err: Error) => toast.error(`Failed to reject: ${err.message}`),
  });

  const handleApprove = (id: string) => {
    if (confirm('Approve this edit request? The change will be executed immediately.')) {
      approveMutation.mutate(id);
    }
  };

  const handleReject = (id: string) => {
    if (confirm('Reject this edit request?')) {
      rejectMutation.mutate(id);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-SG', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-destructive" />
            Slot Booking Edit Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-4 h-4" />
            <span>Failed to load edit requests</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-orange-500" />
          Slot Booking Edit Requests
          {requests.length > 0 && (
            <Badge variant="destructive" className="ml-2">{requests.length} pending</Badge>
          )}
        </CardTitle>
        <CardDescription>Review cancel/swap requests for casual employee slot bookings</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <Skeleton className="h-4 w-32" />
                <div className="flex gap-2"><Skeleton className="h-8 w-8" /><Skeleton className="h-8 w-8" /></div>
              </div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CalendarClock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No pending slot booking edit requests</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Booking ID</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>New Employee</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map(req => (
                <TableRow key={req.id}>
                  <TableCell>
                    <Badge variant={req.request_type === 'cancel' ? 'destructive' : 'secondary'}>
                      {req.request_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs max-w-[120px] truncate">{req.booking_id}</TableCell>
                  <TableCell className="text-sm">{req.requested_by}</TableCell>
                  <TableCell className="text-sm">{req.new_employee_name || '-'}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{req.reason}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(req.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => handleApprove(req.id)}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleReject(req.id)}
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

export default SlotBookingEditApprovals;
