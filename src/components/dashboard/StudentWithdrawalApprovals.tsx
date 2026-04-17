import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Check, X, UserMinus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDate } from '@/utils/dateFormat';
import {
  getPendingWithdrawalRequests,
  approveWithdrawalRequest,
  rejectWithdrawalRequest,
} from '@/services/studentWithdrawalRequestService';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';

const StudentWithdrawalApprovals: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');

  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['pending-withdrawal-requests'],
    queryFn: getPendingWithdrawalRequests,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveWithdrawalRequest(id, user?.email || ''),
    onSuccess: () => {
      toast.success('Withdrawal approved — student status set to withdrawn');
      queryClient.invalidateQueries({ queryKey: ['pending-withdrawal-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-withdrawal-count'] });
      queryClient.invalidateQueries({ queryKey: ['branch-students'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => rejectWithdrawalRequest(id, user?.email || '', rejectNotes),
    onSuccess: () => {
      toast.success('Withdrawal request rejected');
      queryClient.invalidateQueries({ queryKey: ['pending-withdrawal-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-withdrawal-count'] });
      setRejectDialogOpen(false);
      setSelectedId(null);
      setRejectNotes('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (pendingRequests.length === 0) return null;

  return (
    <>
      <Card>
        <CardHeader className="px-3 py-3 sm:px-6 sm:py-4">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <UserMinus className="w-4 h-4" />
            Student Withdrawal Requests
            <Badge variant="destructive" className="text-xs">{pendingRequests.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6 space-y-2">
          {pendingRequests.map((req: any) => (
            <div key={req.id} className="flex items-center justify-between gap-2 p-2 border rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{req.student_name}</p>
                <p className="text-xs text-muted-foreground">
                  Branch: {req.branch_id} · By: {req.requested_by} · {formatDate(new Date(req.created_at))}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs text-green-600 border-green-200 hover:bg-green-50"
                  onClick={() => approveMutation.mutate(req.id)}
                  disabled={approveMutation.isPending}
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => {
                    setSelectedId(req.id);
                    setRejectDialogOpen(true);
                  }}
                  disabled={rejectMutation.isPending}
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Withdrawal Request</DialogTitle>
            <DialogDescription>Provide a reason for rejecting this withdrawal request.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea value={rejectNotes} onChange={(e) => setRejectNotes(e.target.value)} placeholder="Reason for rejection..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => selectedId && rejectMutation.mutate(selectedId)}
              disabled={rejectMutation.isPending}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StudentWithdrawalApprovals;
