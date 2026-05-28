/**
 * Seminars tab embedded in /grading-list.
 * Lists Unarmed Combat Seminar bookings, supports verification/matching and
 * the "collected" flag.
 */
import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Search, UserPlus, FileText, XCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { formatDate } from '@/utils/dateFormat';
import {
  getPublicSeminarList,
  findSeminarSubmissionStudentMatches,
  matchSeminarSubmission,
  importSeminarSubmissionStudent,
  createSeminarInvoice,
  rejectSeminarSubmission,
  markSeminarCollected,
  type PublicSeminarListRow,
  type SeminarStudentMatch,
} from '@/services/seminarPaymentSubmissionService';
import { useAuth } from '@/contexts/AuthContext';

const statusVariant = (s: string) => {
  switch (s) {
    case 'paid':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  }
};

interface Props {
  branchFilter: string;
  canEdit?: boolean;
  canDelete?: boolean;
  onRequestDelete?: (id: string, studentName: string) => void;
}

const SeminarsTab: React.FC<Props> = ({ branchFilter, canEdit, canDelete, onRequestDelete }) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const verifiedBy = user?.employeeId || user?.email || 'system';
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'rejected'>('all');
  const [matchRow, setMatchRow] = useState<PublicSeminarListRow | null>(null);
  const [rejectRow, setRejectRow] = useState<PublicSeminarListRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['public-seminar-list', branchFilter, statusFilter],
    queryFn: () => getPublicSeminarList(
      branchFilter === 'all' ? null : branchFilter,
      statusFilter === 'all' ? null : statusFilter,
    ),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['public-seminar-list'] });

  const handleToggleCollected = async (r: PublicSeminarListRow, value: boolean) => {
    setBusyId(r.submission_id);
    try {
      await markSeminarCollected(r.submission_id, value, verifiedBy);
      toast.success(value ? 'Marked collected' : 'Marked not collected');
      invalidate();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectRow) return;
    setBusyId(rejectRow.submission_id);
    try {
      await rejectSeminarSubmission(rejectRow.submission_id, rejectReason.trim(), verifiedBy);
      toast.success('Rejected');
      setRejectRow(null);
      setRejectReason('');
      invalidate();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to reject');
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold mr-auto">Unarmed Combat Seminar</h2>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="Sale status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {rows.length === 0 ? (
        <div className="text-sm text-muted-foreground">No seminar bookings yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Submitted</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>DOB</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Belt</TableHead>
                <TableHead>Package</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Proof</TableHead>
                <TableHead>Sale Status</TableHead>
                <TableHead>Match / Invoice</TableHead>
                <TableHead>Collected</TableHead>
                {(canEdit || canDelete) && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.submission_id}>
                  <TableCell className="text-xs">{formatDate(r.created_at)}</TableCell>
                  <TableCell className="font-medium">{r.student_name}</TableCell>
                  <TableCell className="text-xs">{r.date_of_birth ? formatDate(r.date_of_birth) : '—'}</TableCell>
                  <TableCell className="text-xs">{r.branch_name || '—'}</TableCell>
                  <TableCell className="text-xs">{r.current_belt || '—'}</TableCell>
                  <TableCell className="text-xs max-w-[260px]">{r.package_label}</TableCell>
                  <TableCell className="text-right text-xs">${Number(r.amount).toFixed(2)}</TableCell>
                  <TableCell>
                    {r.proof_url ? (
                      <a
                        href={r.proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary underline"
                      >
                        View
                      </a>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusVariant(r.paid_status)}>{r.paid_status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {r.invoice_number ? (
                      <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-300">
                        <FileText className="h-3 w-3 mr-1" />{r.invoice_number}
                      </Badge>
                    ) : r.matched_student_id ? (
                      canEdit ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={busyId === r.submission_id}
                          onClick={async () => {
                            setBusyId(r.submission_id);
                            try {
                              await createSeminarInvoice(r.submission_id, verifiedBy);
                              toast.success('Invoice created');
                              invalidate();
                            } catch (e: any) {
                              toast.error(e?.message || 'Failed');
                            } finally {
                              setBusyId(null);
                            }
                          }}
                        >
                          <FileText className="h-3 w-3 mr-1" />Create invoice
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">Matched</span>
                      )
                    ) : canEdit ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => setMatchRow(r)}
                      >
                        <Search className="h-3 w-3 mr-1" />Find match
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">Not matched</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      checked={r.collected}
                      disabled={!canEdit || busyId === r.submission_id}
                      onCheckedChange={(c) => handleToggleCollected(r, c === true)}
                    />
                  </TableCell>
                  {(canEdit || canDelete) && (
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        {canEdit && r.paid_status === 'pending' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-800"
                            title="Reject"
                            onClick={() => setRejectRow(r)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && onRequestDelete && (
                          <button
                            type="button"
                            onClick={() => onRequestDelete(r.submission_id, r.student_name)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete row"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <MatchDialog
        row={matchRow}
        onClose={() => setMatchRow(null)}
        onLinked={invalidate}
        verifiedBy={verifiedBy}
      />

      <Dialog open={!!rejectRow} onOpenChange={(o) => { if (!o) { setRejectRow(null); setRejectReason(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject booking?</DialogTitle>
            <DialogDescription>{rejectRow?.student_name}</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectRow(null); setRejectReason(''); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={busyId === rejectRow?.submission_id}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface MatchDialogProps {
  row: PublicSeminarListRow | null;
  onClose: () => void;
  onLinked: () => void;
  verifiedBy: string;
}

const MatchDialog: React.FC<MatchDialogProps> = ({ row, onClose, onLinked, verifiedBy }) => {
  const open = !!row;
  const [busy, setBusy] = useState(false);

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ['seminar-matches', row?.submission_id],
    queryFn: () => row ? findSeminarSubmissionStudentMatches(row.submission_id) : Promise.resolve([] as SeminarStudentMatch[]),
    enabled: open,
  });

  const linkAndInvoice = async (studentId: string) => {
    if (!row) return;
    setBusy(true);
    try {
      await matchSeminarSubmission(row.submission_id, studentId);
      const invId = await createSeminarInvoice(row.submission_id, verifiedBy);
      toast.success(`Linked & invoice created (${invId.slice(0, 8)}…)`);
      onLinked();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to link');
    } finally {
      setBusy(false);
    }
  };

  const createNew = async () => {
    if (!row) return;
    setBusy(true);
    try {
      await importSeminarSubmissionStudent(row.submission_id, verifiedBy);
      await createSeminarInvoice(row.submission_id, verifiedBy);
      toast.success('Student created & invoice issued');
      onLinked();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create student');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Match to student</DialogTitle>
          <DialogDescription>
            {row?.student_name} · DOB {row?.date_of_birth ? formatDate(row.date_of_birth) : '—'} · {row?.branch_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </div>
          ) : matches.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No likely matches found for these details.
            </div>
          ) : (
            matches.map((m) => (
              <button
                key={m.student_id}
                type="button"
                disabled={busy}
                onClick={() => linkAndInvoice(m.student_id)}
                className="w-full text-left rounded border p-2 hover:bg-muted/50 disabled:opacity-50"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium text-sm">{m.full_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {m.student_number || '—'} · DOB {m.date_of_birth ? formatDate(m.date_of_birth) : '—'} · {m.email || 'no email'}
                    </div>
                    {m.reason && <div className="text-[11px] text-muted-foreground mt-0.5">{m.reason}</div>}
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {Math.round(Number(m.score) * 100)}
                  </Badge>
                </div>
              </button>
            ))
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={createNew} disabled={busy}>
            <UserPlus className="h-4 w-4 mr-1" /> Create new student
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SeminarsTab;
