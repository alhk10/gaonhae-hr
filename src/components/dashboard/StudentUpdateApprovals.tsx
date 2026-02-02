import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X, Eye, User, Clock, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getPendingRequestsByBranch, 
  getAllPendingRequests,
  approveRequest, 
  rejectRequest, 
  StudentUpdateRequestWithDetails 
} from '@/services/studentUpdateRequestService';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface StudentUpdateApprovalsProps {
  branchId?: string;
  showAll?: boolean;
}

const StudentUpdateApprovals: React.FC<StudentUpdateApprovalsProps> = ({ branchId, showAll = false }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<StudentUpdateRequestWithDetails | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');

  const { data: pendingRequests = [], isLoading } = useQuery({
    queryKey: ['student-update-requests', branchId, showAll],
    queryFn: async () => {
      if (showAll) {
        return getAllPendingRequests();
      }
      if (branchId) {
        return getPendingRequestsByBranch(branchId);
      }
      return [];
    },
    enabled: !!branchId || showAll,
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      if (!user?.employeeId) throw new Error('User not authenticated');
      return approveRequest(requestId, user.employeeId);
    },
    onSuccess: () => {
      toast.success('Student update approved successfully');
      queryClient.invalidateQueries({ queryKey: ['student-update-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-student-updates'] });
      setReviewDialogOpen(false);
      setSelectedRequest(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to approve update');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, notes }: { requestId: string; notes: string }) => {
      if (!user?.employeeId) throw new Error('User not authenticated');
      return rejectRequest(requestId, user.employeeId, notes);
    },
    onSuccess: () => {
      toast.success('Student update rejected');
      queryClient.invalidateQueries({ queryKey: ['student-update-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-student-updates'] });
      setRejectDialogOpen(false);
      setRejectNotes('');
      setSelectedRequest(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to reject update');
    },
  });

  const handleViewRequest = (request: StudentUpdateRequestWithDetails) => {
    setSelectedRequest(request);
    setReviewDialogOpen(true);
  };

  const handleApprove = () => {
    if (selectedRequest) {
      approveMutation.mutate(selectedRequest.id);
    }
  };

  const handleReject = () => {
    if (selectedRequest) {
      rejectMutation.mutate({ requestId: selectedRequest.id, notes: rejectNotes });
    }
  };

  const renderChanges = (changes: unknown) => {
    // Safely parse changes object
    const changesObj = typeof changes === 'object' && changes !== null ? changes as Record<string, unknown> : {};
    return Object.entries(changesObj).map(([key, value]) => (
      <div key={key} className="flex justify-between items-center py-2 border-b last:border-0">
        <span className="text-sm font-medium text-muted-foreground capitalize">
          {key.replace(/_/g, ' ')}
        </span>
        <span className="text-sm font-semibold">
          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
        </span>
      </div>
    ));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-12 bg-muted rounded"></div>
            <div className="h-12 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingRequests.length === 0) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                Pending Student Updates
              </CardTitle>
              <CardDescription>
                Students have requested changes to their profiles that require approval
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {pendingRequests.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <div 
                key={request.id} 
                className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {request.student_name}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Requested {format(new Date(request.requested_at), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {typeof request.requested_changes === 'object' && request.requested_changes !== null ? Object.keys(request.requested_changes).length : 0} changes
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewRequest(request)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Review
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Profile Update</DialogTitle>
            <DialogDescription>
              {selectedRequest?.student_name} has requested the following changes:
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-1 px-1">
              {selectedRequest && renderChanges(selectedRequest.requested_changes)}
            </div>
          </ScrollArea>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setReviewDialogOpen(false);
                setRejectDialogOpen(true);
              }}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-1" />
              Reject
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approveMutation.isPending}
              className="flex-1"
            >
              <Check className="w-4 h-4 mr-1" />
              {approveMutation.isPending ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Update Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this update request.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reject-notes">Rejection Reason</Label>
              <Textarea
                id="reject-notes"
                placeholder="Enter the reason for rejection..."
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectNotes('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending || !rejectNotes.trim()}
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StudentUpdateApprovals;
