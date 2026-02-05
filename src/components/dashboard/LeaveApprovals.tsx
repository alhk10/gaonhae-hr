/**
 * Leave Approvals Component
 * Displays pending leave requests for superadmin approval
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X, Calendar, AlertCircle, ExternalLink } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getAllLeaveRequests, updateLeaveStatus } from '@/services/leaveService';

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-SG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            Leave Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-500" />
          Leave Approvals
          {pendingLeave.length > 0 && (
            <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">
              {pendingLeave.length} pending
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Review and approve or reject leave requests
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
        ) : (
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
                  <TableCell className="font-medium">
                    {leave.employeeName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{leave.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{leave.days}</span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {leave.reason || '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {leave.medicalCertificate ? (
                      <a
                        href={leave.medicalCertificate}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View
                      </a>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                        title="Approve leave"
                        onClick={() => handleApprove(leave.id)}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Reject leave"
                        onClick={() => handleReject(leave.id)}
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

export default LeaveApprovals;
