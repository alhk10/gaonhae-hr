/**
 * Grading Deletion Approvals Component
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X, GraduationCap, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
import { formatDate } from '@/utils/dateFormat';
  getPendingGradingDeletionRequests,
  approveGradingDeletionRequest,
  rejectGradingDeletionRequest,
  type GradingDeletionRequest
} from '@/services/gradingDeletionRequestService';

const GradingDeletionApprovals: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading, error } = useQuery({
    queryKey: ['pending-grading-deletion-requests'],
    queryFn: getPendingGradingDeletionRequests,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const approveMutation = useMutation({
    mutationFn: approveGradingDeletionRequest,
    onSuccess: () => {
      toast.success('Grading registration deletion approved and executed');
      queryClient.invalidateQueries({ queryKey: ['pending-grading-deletion-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-grading-deletion-count'] });
      queryClient.invalidateQueries({ queryKey: ['grading-list-students'] });
    },
    onError: (error: Error) => toast.error(`Failed to approve: ${error.message}`),
  });

  const rejectMutation = useMutation({
    mutationFn: rejectGradingDeletionRequest,
    onSuccess: () => {
      toast.success('Deletion request rejected');
      queryClient.invalidateQueries({ queryKey: ['pending-grading-deletion-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-grading-deletion-count'] });
    },
    onError: (error: Error) => toast.error(`Failed to reject: ${error.message}`),
  });

  const handleApprove = (requestId: string) => {
    if (confirm('Approve this grading registration deletion? This cannot be undone.')) {
      approveMutation.mutate(requestId);
    }
  };

  const handleReject = (requestId: string) => {
    if (confirm('Reject this deletion request?')) {
      rejectMutation.mutate(requestId);
    }
  };

  const formatDate = (dateString: string) => {formatDate(
    return new Date(dateString));
  };

  if (error) {
    return (
      <Card>
        <CardHeader className="px-3 py-3 sm:px-6 sm:py-4">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-destructive" />
            Grading Deletion Requests
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4" /><span>Failed to load deletion requests</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="px-3 py-3 sm:px-6 sm:py-4">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-destructive" />
          Grading Deletion
          {requests.length > 0 && (
            <Badge variant="destructive" className="text-xs">{requests.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            <p>No pending grading deletion requests</p>
          </div>
        ) : (
          <>
            {/* Mobile card layout */}
            <div className="space-y-2 md:hidden">
              {requests.map((request) => (
                <div key={request.id} className="p-2.5 border rounded-lg bg-card space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">{request.student_name}</span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => handleApprove(request.id)} disabled={approveMutation.isPending || rejectMutation.isPending}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleReject(request.id)} disabled={approveMutation.isPending || rejectMutation.isPending}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {request.requested_by_email || 'Unknown'} · {formatDate(request.created_at)}
                  </div>
                  {request.reason && <p className="text-xs text-muted-foreground truncate">{request.reason}</p>}
                </div>
              ))}
            </div>

            {/* Desktop table layout */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.student_name}</TableCell>
                      <TableCell><div className="text-sm">{request.requested_by_email || 'Unknown'}</div></TableCell>
                      <TableCell><div className="text-sm text-muted-foreground">{formatDate(request.created_at)}</div></TableCell>
                      <TableCell><div className="text-sm text-muted-foreground max-w-[200px] truncate">{request.reason || '-'}</div></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleApprove(request.id)} disabled={approveMutation.isPending || rejectMutation.isPending}><Check className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleReject(request.id)} disabled={approveMutation.isPending || rejectMutation.isPending}><X className="h-4 w-4" /></Button>
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

export default GradingDeletionApprovals;
