/**
 * Transaction delete requests raised from the public /access lists
 * (school fees, grading, competitions, seminars, uniforms & guards).
 * Only superadmins can approve; approving runs the full deletion.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X, Trash2, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatDateTime } from '@/utils/dateFormat';
import { formatCurrency } from '@/utils/currencyUtils';
import {
  getPendingSubmissionDeletionRequests,
  approveSubmissionDeletionRequest,
  rejectSubmissionDeletionRequest,
  SOURCE_LABELS,
} from '@/services/submissionDeletionRequestService';

const SubmissionDeleteApprovals: React.FC = () => {
  const qc = useQueryClient();

  const { data: requests = [], isLoading, error } = useQuery({
    queryKey: ['pending-submission-deletion-requests'],
    queryFn: getPendingSubmissionDeletionRequests,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['pending-submission-deletion-requests'] });
    qc.invalidateQueries({ queryKey: ['pending-submission-deletion-count'] });
    qc.invalidateQueries({ queryKey: ['submission-flags'] });
  };

  const approve = useMutation({
    mutationFn: approveSubmissionDeletionRequest,
    onSuccess: () => { toast.success('Record deleted'); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: (id: string) => rejectSubmissionDeletionRequest(id),
    onSuccess: () => { toast.success('Delete request rejected'); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (error) {
    return (
      <Card>
        <CardHeader className="px-3 py-3 sm:px-6 sm:py-4">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-destructive" /> Transaction Delete Requests
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4" /><span>Failed to load delete requests</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isLoading && requests.length === 0) return null;

  return (
    <Card>
      <CardHeader className="px-3 py-3 sm:px-6 sm:py-4">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-destructive" />
          Transaction Delete Requests
          {requests.length > 0 && (
            <Badge variant="destructive" className="text-[10px]">{requests.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6 space-y-2">
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          requests.map((r) => (
            <div key={r.id} className="rounded border p-2 space-y-1 text-xs">
              <div className="flex flex-wrap items-center gap-1">
                <Badge variant="outline" className="text-[10px]">{SOURCE_LABELS[r.source]}</Badge>
                <span className="font-medium">{r.student_name || 'Unnamed'}</span>
                {r.reference_number && (
                  <span className="font-mono text-muted-foreground">{r.reference_number}</span>
                )}
                {r.amount != null && <span className="text-muted-foreground">{formatCurrency(r.amount)}</span>}
              </div>
              <div className="text-muted-foreground">
                Reason: {r.reason || '—'}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Requested {formatDateTime(r.created_at)}
                {r.requested_by ? ` by ${r.requested_by}` : ''}
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 text-xs"
                  disabled={approve.isPending}
                  onClick={() => {
                    if (confirm('Approve and permanently delete this record?')) approve.mutate(r.id);
                  }}
                >
                  <Check className="w-3 h-3 mr-1" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={reject.isPending}
                  onClick={() => reject.mutate(r.id)}
                >
                  <X className="w-3 h-3 mr-1" /> Reject
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default SubmissionDeleteApprovals;
