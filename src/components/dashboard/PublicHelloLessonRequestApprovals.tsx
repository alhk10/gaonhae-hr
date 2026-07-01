/**
 * Approval card for /hello chat lesson-schedule requests.
 * Rendered on both the Branch Dashboard (scoped to branchId) and the
 * Superadmin Dashboard (all branches).
 */
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CalendarClock, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTime } from '@/utils/dateFormat';
import { getBranches } from '@/services/settingsService';
import {
  listPendingLessonRequests,
  approveLessonRequest,
  rejectLessonRequest,
  type PendingLessonRequest,
} from '@/services/chatLessonRequestService';

interface Props {
  branchId?: string;
}

const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const PublicHelloLessonRequestApprovals: React.FC<Props> = ({ branchId }) => {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingRow, setRejectingRow] = useState<PendingLessonRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: branches = [] } = useQuery({
    queryKey: ['branches-for-lesson-approvals'],
    queryFn: getBranches,
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['pending-lesson-requests', branchId],
    queryFn: () => listPendingLessonRequests(branchId),
    refetchInterval: 60_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['pending-lesson-requests'] });
    qc.invalidateQueries({ queryKey: ['pending-lesson-requests-slot'] });
    qc.invalidateQueries({ queryKey: ['slot-attendance'] });
  };

  const handleApprove = async (row: PendingLessonRequest) => {
    setBusyId(row.id);
    try {
      await approveLessonRequest(row);
      toast.success('Lessons booked');
      invalidate();
    } catch (e: any) {
      toast.error(e.message || 'Failed to approve');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingRow) return;
    setBusyId(rejectingRow.id);
    try {
      await rejectLessonRequest(rejectingRow.id, rejectReason.trim());
      toast.success('Request rejected');
      setRejectingRow(null);
      setRejectReason('');
      invalidate();
    } catch (e: any) {
      toast.error(e.message || 'Failed to reject');
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading || rows.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <CalendarClock className="w-4 h-4" />
          Public Hello Chat — Lesson Requests
          <Badge variant="secondary">{rows.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => {
          const branchName = branches.find((b: any) => b.id === row.branch_id)?.name || row.branch_id || '—';
          const fullName = `${row.student_first_name || ''} ${row.student_last_name || ''}`.trim().toUpperCase() || '—';
          const pendingCancels = row.cancellations.filter(c => !row.handled_booking_keys.includes(c.key));
          return (
            <div key={row.id} className="border rounded-md p-3 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-0.5 text-sm min-w-0">
                  <div className="font-semibold">
                    {fullName}{' '}
                    <Badge variant="outline" className="text-[10px] ml-1">Lesson request</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {branchName} · {row.contact_email || '—'} · {row.contact_phone || '—'}
                  </div>
                  {pendingCancels.length > 0 && (
                    <div className="text-xs">
                      <span className="font-medium">Cancel:</span>
                      <ul className="ml-4 list-disc">
                        {pendingCancels.map((c) => (
                          <li key={c.key}>
                            {fmtDate(c.date)} {c.start_time.slice(0,5)}–{c.end_time.slice(0,5)}
                            {c.class_type ? ` (${c.class_type})` : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {row.pending_bookings.length > 0 && (
                    <div className="text-xs">
                      <span className="font-medium">Book:</span>
                      <ul className="ml-4 list-disc">
                        {row.pending_bookings.map((b) => (
                          <li key={b.key}>
                            {fmtDate(b.date)} {b.start_time.slice(0,5)}–{b.end_time.slice(0,5)}
                            {b.class_type ? ` (${b.class_type})` : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">submitted {formatDateTime(row.created_at)}</div>
                </div>
                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pending</Badge>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={() => handleApprove(row)}
                  disabled={busyId === row.id}
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                  Approve & Book
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => { setRejectingRow(row); setRejectReason(''); }}
                  disabled={busyId === row.id}
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  Reject
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>

      <Dialog open={!!rejectingRow} onOpenChange={(o) => { if (!o) setRejectingRow(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject lesson request</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Reason (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingRow(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={busyId === rejectingRow?.id}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PublicHelloLessonRequestApprovals;
