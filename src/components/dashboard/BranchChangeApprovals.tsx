import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Building2, Check, X, ArrowRight } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getPendingBranchRequests, approveBranchRequest, rejectBranchRequest } from '@/services/employeeBranchRequestService';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

const BranchChangeApprovals = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['pending-branch-requests'],
    queryFn: getPendingBranchRequests,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  if (pendingRequests.length === 0) return null;

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await approveBranchRequest(requestId, user?.email || '');
      toast.success('Branch change approved');
      queryClient.invalidateQueries({ queryKey: ['pending-branch-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-branch-requests-count'] });
    } catch (error) {
      console.error('Error approving:', error);
      toast.error('Failed to approve');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await rejectBranchRequest(requestId, user?.email || '', rejectNotes[requestId]);
      toast.success('Branch change rejected');
      queryClient.invalidateQueries({ queryKey: ['pending-branch-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-branch-requests-count'] });
    } catch (error) {
      console.error('Error rejecting:', error);
      toast.error('Failed to reject');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Branch Change Requests
          <Badge variant="secondary">{pendingRequests.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pendingRequests.map((request: any) => (
            <div key={request.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="font-medium text-sm">{request.employee_name}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>{request.current_branch || 'No branch'}</span>
                    <ArrowRight className="w-3 h-3" />
                    <span className="font-medium text-foreground">{request.requested_branch}</span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(request.created_at), 'dd MMM yyyy')}
                </span>
              </div>
              {request.reason && (
                <p className="text-xs text-muted-foreground italic">"{request.reason}"</p>
              )}
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Rejection notes (optional)"
                  value={rejectNotes[request.id] || ''}
                  onChange={(e) => setRejectNotes(prev => ({ ...prev, [request.id]: e.target.value }))}
                  className="text-xs h-8 flex-1"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(request.id)}
                  disabled={processingId === request.id}
                  className="h-8"
                >
                  <X className="w-3 h-3 mr-1" /> Reject
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleApprove(request.id)}
                  disabled={processingId === request.id}
                  className="h-8"
                >
                  <Check className="w-3 h-3 mr-1" /> Approve
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default BranchChangeApprovals;
