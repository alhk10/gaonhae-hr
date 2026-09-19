/**
 * Superadmin approval section for student merge requests raised on /access.
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Check, X, Merge } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatDate } from '@/utils/dateFormat';
import { useAuth } from '@/contexts/AuthContext';
import {
  getPendingStudentMergeRequests,
  approveStudentMergeRequest,
  rejectStudentMergeRequest,
} from '@/services/studentMergeRequestService';

const nameOf = (s: any) => `${s?.first_name || ''} ${s?.last_name || ''}`.trim().toUpperCase();

const StudentMergeApprovals: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const { data: requests = [] } = useQuery({
    queryKey: ['pending-student-merge-requests'],
    queryFn: getPendingStudentMergeRequests,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['pending-student-merge-requests'] });
    queryClient.invalidateQueries({ queryKey: ['pending-student-merge-count'] });
    queryClient.invalidateQueries({ queryKey: ['public-student-directory'] });
  };

  const approve = useMutation({
    mutationFn: (id: string) => approveStudentMergeRequest(id, user?.email || ''),
    onSuccess: (counts) => {
      const summary = Object.entries(counts || {})
        .filter(([, n]) => (n as number) > 0)
        .map(([k, n]) => `${k}: ${n}`)
        .join(', ');
      toast.success(`Students merged. ${summary || ''}`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: (id: string) => rejectStudentMergeRequest(id, user?.email || '', reason),
    onSuccess: () => {
      toast.success('Merge request rejected');
      setRejectOpen(false);
      setSelectedId(null);
      setReason('');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (requests.length === 0) return null;

  return (
    <>
      <Card>
        <CardHeader className="px-3 py-3 sm:px-6 sm:py-4">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Merge className="w-4 h-4" />
            Student Merge Requests
            <Badge variant="destructive" className="text-xs">{requests.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6 space-y-2">
          {requests.map((req: any) => {
            const snap = req.snapshot || {};
            const students: any[] = snap.students || [];
            const keep = students.find((s) => s.student_id === req.keep_id);
            const drops = students.filter((s) => s.student_id !== req.keep_id);
            return (
              <div key={req.id} className="p-2 border rounded-lg space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 text-xs">
                    <p className="text-sm font-medium truncate">
                      Keep: {keep ? nameOf(keep) : req.keep_id}
                      {keep?.student_number ? ` (${keep.student_number})` : ''}
                    </p>
                    <p className="text-muted-foreground break-words">
                      Remove: {drops.length
                        ? drops.map((d) => `${nameOf(d)}${d.student_number ? ` (${d.student_number})` : ''}`).join(', ')
                        : `${req.drop_ids?.length || 0} record(s)`}
                    </p>
                    <p className="text-muted-foreground">
                      By: {req.requested_by} · {formatDate(new Date(req.created_at))}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-green-600 border-green-200 hover:bg-green-50"
                      onClick={() => approve.mutate(req.id)}
                      disabled={approve.isPending}
                    >
                      <Check className="w-3.5 h-3.5 mr-1" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => { setSelectedId(req.id); setRejectOpen(true); }}
                      disabled={reject.isPending}
                    >
                      <X className="w-3.5 h-3.5 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
                {drops.length > 0 && (
                  <div className="text-[11px] text-muted-foreground">
                    {drops.map((d) => (
                      <div key={d.student_id}>
                        {nameOf(d)} — {d.email || 'no email'} · {d.phone || 'no mobile'} · invoices {d.invoices_count ?? 0},
                        enrolments {d.enrollments_count ?? 0}, attendance {d.attendance_count ?? 0}, grading {d.grading_count ?? 0}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Merge Request</DialogTitle>
            <DialogDescription>Provide a reason for rejecting this merge.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reason (optional)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for rejection..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => selectedId && reject.mutate(selectedId)}
              disabled={reject.isPending}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StudentMergeApprovals;
