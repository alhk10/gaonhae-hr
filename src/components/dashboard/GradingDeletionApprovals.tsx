/**
 * Grading Deletion Approvals Component
 * Displays pending grading registration deletion requests for superadmin approval
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X, GraduationCap, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-SG', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-destructive" />
            Grading Registration Deletion Requests
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
          <GraduationCap className="w-5 h-5 text-destructive" />
          Grading Registration Deletion Requests
          {requests.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {requests.length} pending
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Review and approve or reject grading registration deletion requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
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
            <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No pending grading deletion requests</p>
          </div>
        ) : (
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
                  <TableCell className="font-medium">
                    {request.student_name}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{request.requested_by_email || 'Unknown'}</div>
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

export default GradingDeletionApprovals;
