/**
 * Leave Approvals Component
 * Displays pending leave requests for superadmin approval
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X, Calendar, AlertCircle, ExternalLink } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getAllLeaveRequests, updateLeaveStatus } from '@/services/leaveService';
import { formatDate } from '@/utils/dateFormat';

const LeaveApprovals: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: pendingLeave = [], isLoading, error } = useQuery({
    queryKey: ['pending-leave-approvals'],
    queryFn: async () => {
      const allLeave = await getAllLeaveRequests();
      return allLeave.filter(l => l.status === 'Pending');
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const approveMutation = useMutation({
    mutationFn: (leaveId: number) => updateLeaveStatus(leaveId, 'Approved'),
    onSuccess: () => {
      toast.success('Leave request approved');
      queryClient.invalidateQueries({ queryKey: ['pending-leave-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['pending-leave-count'] });
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve leave: ${error.message}`);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (leaveId: number) => updateLeaveStatus(leaveId, 'Rejected'),
    onSuccess: () => {
      toast.success('Leave request rejected');
      queryClient.invalidateQueries({ queryKey: ['pending-leave-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['pending-leave-count'] });
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to reject leave: ${error.message}`);
    }
  });

  const handleApprove = (leaveId: number) => {
    if (confirm('Are you sure you want to approve this leave request?')) {
      approveMutation.mutate(leaveId);
    }
  };

  const handleReject = (leaveId: number) => {
    if (confirm('Are you sure you want to reject this leave request?')) {
      rejectMutation.mutate(leaveId);
    }
  };
  if (error) {
    return (
      <Card>
        <CardHeader className="px-3 py-3 sm:px-6 sm:py-4">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            Leave Approvals
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>Failed to load leave requests</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingLeave.length === 0 && !isLoading) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="px-3 py-3 sm:px-6 sm:py-4">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-500" />
          Leave Approvals
          {pendingLeave.length > 0 && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
              {pendingLeave.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : (
          <>
            {/* Mobile card layout */}
            <div className="space-y-2 md:hidden">
              {pendingLeave.map((leave) => (
                <div key={leave.id} className="p-2.5 border rounded-lg bg-card space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">{leave.employeeName}</span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => handleApprove(leave.id)} disabled={approveMutation.isPending || rejectMutation.isPending}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleReject(leave.id)} disabled={approveMutation.isPending || rejectMutation.isPending}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <Badge variant="outline" className="text-[10px]">{leave.type}</Badge>
                    <span className="font-medium">{leave.days}d</span>
                    <span className="text-muted-foreground">{formatDate(leave.startDate)} – {formatDate(leave.endDate)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {leave.reason && <span className="text-muted-foreground truncate">{leave.reason}</span>}
                    {leave.medicalCertificate && (
                      <a href={leave.medicalCertificate} target="_blank" rel="noopener noreferrer" className="text-blue-600 flex items-center gap-0.5 shrink-0">
                        <ExternalLink className="h-3 w-3" />MC
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table layout */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>MC</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingLeave.map((leave) => (
                    <TableRow key={leave.id}>
                      <TableCell className="font-medium">{leave.employeeName}</TableCell>
                      <TableCell><Badge variant="outline">{leave.type}</Badge></TableCell>
                      <TableCell><div className="text-sm">{formatDate(leave.startDate)} - {formatDate(leave.endDate)}</div></TableCell>
                      <TableCell><span className="font-medium">{leave.days}</span></TableCell>
                      <TableCell><div className="text-sm text-muted-foreground max-w-[200px] truncate">{leave.reason || '-'}</div></TableCell>
                      <TableCell>
                        {leave.medicalCertificate ? (
                          <a href={leave.medicalCertificate} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />View
                          </a>
                        ) : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleApprove(leave.id)} disabled={approveMutation.isPending || rejectMutation.isPending}><Check className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleReject(leave.id)} disabled={approveMutation.isPending || rejectMutation.isPending}><X className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default LeaveApprovals;
