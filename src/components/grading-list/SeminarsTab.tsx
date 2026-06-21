/**
 * Seminars tab embedded in /grading-list.
 * Lists Unarmed Combat Seminar bookings with inline match-and-verify
 * plus reject. Mirrors the Competitions tab pattern.
 */
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { XCircle, CheckCircle, Trash2, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { SignedImage } from '@/components/common/SignedMedia';
import { supabase } from '@/integrations/supabase/client';
import {
  getPublicSeminarList,
  rejectSeminarSubmission,
  verifySeminarSubmission,
  type PublicSeminarListRow,
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
  const [rejectRow, setRejectRow] = useState<PublicSeminarListRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; title: string } | null>(null);
  const [previewRotation, setPreviewRotation] = useState(0);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['public-seminar-list', branchFilter, statusFilter],
    queryFn: () => getPublicSeminarList(
      branchFilter === 'all' ? null : branchFilter,
      statusFilter === 'all' ? null : statusFilter,
    ),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['public-seminar-list'] });
    qc.invalidateQueries({ queryKey: ['pending-seminar-submissions'] });
    qc.invalidateQueries({ queryKey: ['pending-seminar-submissions-count'] });
  };

  const handleVerify = async (row: PublicSeminarListRow) => {
    setBusyId(row.submission_id);
    try {
      await verifySeminarSubmission(row.submission_id, verifiedBy);
      toast.success('Marked as verified');
      invalidate();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to verify');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectRow) return;
    setBusy(true);
    try {
      await rejectSeminarSubmission(rejectRow.submission_id, rejectReason.trim(), verifiedBy);
      toast.success('Rejected');
      setRejectRow(null);
      setRejectReason('');
      invalidate();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to reject');
    } finally {
      setBusy(false);
    }
  };


  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const Thumb: React.FC<{ url: string | null; title: string }> = ({ url, title }) => {
    if (!url) return <span className="text-xs text-muted-foreground">—</span>;
    return (
      <button
        type="button"
        onClick={() => { setPreview({ url, title }); setPreviewRotation(0); }}
        className="block"
        title="Click to view"
      >
        <SignedImage
          src={url}
          className="h-10 w-10 object-cover rounded border cursor-pointer hover:opacity-80"
          alt={title}
          fallback={<span className="text-xs text-muted-foreground">…</span>}
        />
      </button>
    );
  };

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
                <TableHead className="h-7 px-2 text-[11px]">Branch</TableHead>
                <TableHead className="h-7 px-2 text-[11px]">Student</TableHead>
                <TableHead className="h-7 px-2 text-[11px]">Belt</TableHead>
                <TableHead className="h-7 px-2 text-[11px]">Package</TableHead>
                <TableHead className="h-7 px-2 text-[11px]">Status</TableHead>
                <TableHead className="h-7 px-2 text-[11px] text-right">Amount</TableHead>
                <TableHead className="h-7 px-2 text-[11px]">Proof</TableHead>
                <TableHead className="h-7 px-2 text-[11px]">Actions</TableHead>
                {canDelete && <TableHead className="h-7 px-2 text-[11px] w-8" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.submission_id}>
                  <TableCell className="text-xs px-2 py-1">{r.branch_name || '—'}</TableCell>
                  <TableCell className="text-xs px-2 py-1 font-medium">{r.student_name}</TableCell>
                  <TableCell className="text-xs px-2 py-1">{r.current_belt || '—'}</TableCell>
                  <TableCell className="text-xs px-2 py-1 max-w-[260px]">{r.package_label}</TableCell>
                  <TableCell className="px-2 py-1">
                    <Badge className={statusVariant(r.paid_status)}>{r.paid_status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs px-2 py-1 text-right">${Number(r.amount).toFixed(2)}</TableCell>
                  <TableCell className="px-2 py-1">
                    <Thumb url={r.proof_url} title={`${r.student_name} — Payment Proof`} />
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    {r.paid_status === 'pending' ? (
                      <div className="flex items-center gap-1">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleVerify(r)}
                            disabled={busyId === r.submission_id}
                            className="text-green-600 hover:text-green-800 disabled:opacity-50"
                            title="Verify"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => setRejectRow(r)}
                            className="text-red-600 hover:text-red-800"
                            title="Reject"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  {canDelete && (
                    <TableCell className="px-2 py-1">
                      {onRequestDelete && (
                        <button
                          type="button"
                          onClick={() => onRequestDelete(r.submission_id, r.student_name)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete row"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Accept: match student & verify */}
      <Dialog open={!!acceptingRow} onOpenChange={(o) => { if (!o) { setAcceptingRow(null); setSearchTerm(''); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">Match student &amp; verify</DialogTitle>
            <DialogDescription className="text-xs">
              {acceptingRow?.student_name} · DOB {acceptingRow?.date_of_birth ? formatDate(acceptingRow.date_of_birth) : '—'} · {acceptingRow?.current_belt || '—'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Suggested matches</div>
              {matchesLoading && <div className="text-xs text-muted-foreground">Loading…</div>}
              {!matchesLoading && matches.length === 0 && (
                <div className="text-xs text-muted-foreground">No fuzzy matches found.</div>
              )}
              <div className="space-y-1">
                {matches.map((m: SeminarStudentMatch) => (
                  <div key={m.student_id} className="flex items-center justify-between gap-2 border rounded p-2 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {m.full_name} <span className="text-xs text-muted-foreground">{m.student_number}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {m.email || '—'} · DOB {m.date_of_birth ? formatDate(m.date_of_birth) : '—'} · {m.current_belt || '—'}
                      </div>
                      {m.reason && <div className="text-[11px] text-muted-foreground">{m.reason} · score {Number(m.score).toFixed(2)}</div>}
                    </div>
                    <Button size="sm" onClick={() => handleAcceptWithStudent(m.student_id)} disabled={busy}>Use</Button>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Search students</div>
              <Input
                placeholder="Name, email, or student number"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8"
              />
              <div className="space-y-1 mt-1">
                {searchResults.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 border rounded p-2 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {`${s.first_name || ''} ${s.last_name || ''}`.trim().toUpperCase()}{' '}
                        <span className="text-xs text-muted-foreground">{s.student_number}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {s.email || '—'} · DOB {s.date_of_birth ? formatDate(s.date_of_birth) : '—'} · {s.current_belt || '—'}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => handleAcceptWithStudent(s.id)} disabled={busy}>Use</Button>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateNewStudent}
                disabled={busy}
                className="w-full"
              >
                Create new student from submission &amp; verify
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
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
            <Button variant="destructive" onClick={handleReject} disabled={busy}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Proof preview */}
      <Dialog open={!!preview} onOpenChange={(o) => { if (!o) { setPreview(null); setPreviewRotation(0); } }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0 pr-8">
            <DialogTitle className="text-sm">{preview?.title}</DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setPreviewRotation((r) => (r + 90) % 360)}
              title="Rotate 90°"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </DialogHeader>
          {preview && (
            <div className="flex items-center justify-center overflow-hidden">
              <SignedImage
                src={preview.url}
                className="max-w-full max-h-[80vh] h-auto object-contain rounded transition-transform"
                alt={preview.title}
                style={{ transform: `rotate(${previewRotation}deg)` }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SeminarsTab;
