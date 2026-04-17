import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X, CalendarClock, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
import { formatDateTime } from '@/utils/dateFormat';
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

  const formatDate = (dateString: string) =>formatDateTime(
    new Date(dateString));

  // Hide when empty and not loading
  if (!isLoading && !error && requests.length === 0) {
    return null;
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-destructive" />
            Slot Booking Edit Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>Failed to load edit requests</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-orange-500" />
          Slot Booking Edit Requests
          {requests.length > 0 && (
            <Badge variant="destructive" className="text-xs ml-1">{requests.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="flex items-center justify-between p-2 border rounded">
                <Skeleton className="h-4 w-32" />
                <div className="flex gap-1"><Skeleton className="h-7 w-7" /><Skeleton className="h-7 w-7" /></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {requests.map(req => (
              <div key={req.id} className="flex items-center justify-between gap-2 p-2 border rounded text-sm">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Badge variant={req.request_type === 'cancel' ? 'destructive' : req.request_type === 'branch_change' ? 'outline' : 'secondary'} className="text-[10px] px-1.5 py-0 shrink-0">
                    {req.request_type === 'branch_change' ? 'branch' : req.request_type}
                  </Badge>
                  <span className="truncate text-muted-foreground">{req.requested_by}</span>
                  <span className="truncate hidden sm:inline">
                    {req.request_type === 'branch_change' ? req.new_branch_name : req.new_employee_name || '-'}
                  </span>
                  {req.reason && <span className="truncate text-xs text-muted-foreground hidden md:inline">— {req.reason}</span>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => handleApprove(req.id)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleReject(req.id)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SlotBookingEditApprovals;
