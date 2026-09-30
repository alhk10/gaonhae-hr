/**
 * Pending student approvals on the /access Summary tab:
 *  - new students submitted through the public registration form
 *  - personal detail change requests raised from /hello
 * Approve / reject requires the /access password (canApprove).
 */
import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, UserPlus, PencilLine, Pencil } from 'lucide-react';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import {
  getPendingStudentApprovals,
  approvePendingApproval,
  rejectPendingApproval,
  updatePendingApprovalDetails,
  type PendingStudentApproval,
  type PendingApprovalKind,
} from '@/services/publicStudentApprovalService';
import StudentNameButton from '@/components/grading-list/StudentNameButton';
import StudentProfileDialog from '@/components/grading-list/StudentProfileDialog';

const NO_BRANCH = '—';

const FIELD_LABELS: Record<string, string> = {
  first_name: 'First name',
  last_name: 'Last name',
  preferred_name: 'Preferred name',
  certificate_name: 'Certificate name',
  display_name: 'Display name',
  date_of_birth: 'Date of birth',
  gender: 'Gender',
  email: 'Email',
  phone: 'Contact',
  whatsapp: 'WhatsApp',
  current_belt: 'Belt',
  emergency_contact_name: 'Emergency contact',
  emergency_contact_phone: 'Emergency phone',
  medical_conditions: 'Medical',
  referral_source: 'Heard from',
};

const label = (k: string) => FIELD_LABELS[k] || k.replace(/_/g, ' ');

const showValue = (k: string, v: any) => {
  if (v === null || v === undefined || v === '') return '—';
  if (k === 'date_of_birth') return formatDate(String(v));
  return String(v);
};

/** DD/MM/YYYY (or ISO) -> ISO yyyy-mm-dd for saving; returns null when unparsable. */
const toIsoDate = (raw: string): string | null => {
  const s = raw.trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
};

interface Props {
  lockedBranchName?: string;
  lockedBranchId?: string;
  canApprove?: boolean;
}

const PendingApprovalsSection: React.FC<Props> = ({ lockedBranchName, lockedBranchId, canApprove }) => {
  const qc = useQueryClient();
  const [openKind, setOpenKind] = useState<PendingApprovalKind | null>(null);
  const [openBranch, setOpenBranch] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<PendingStudentApproval | null>(null);
  const [reason, setReason] = useState('');
  const [profileId, setProfileId] = useState<string | null>(null);
  const [editing, setEditing] = useState<PendingStudentApproval | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['public-pending-student-approvals', lockedBranchId || 'all'],
    queryFn: () => getPendingStudentApprovals(lockedBranchId || null),
    staleTime: 30 * 1000,
  });

  const visible = useMemo(
    () =>
      (rows as PendingStudentApproval[]).filter(
        (r) => !lockedBranchName || (r.branch_name || NO_BRANCH) === lockedBranchName,
      ),
    [rows, lockedBranchName],
  );

  const byBranch = useMemo(() => {
    const map = new Map<string, { registration: number; update_request: number }>();
    for (const r of visible) {
      const b = r.branch_name || NO_BRANCH;
      if (!map.has(b)) map.set(b, { registration: 0, update_request: 0 });
      map.get(b)![r.kind] += 1;
    }
    const list = Array.from(map.entries())
      .map(([branch, c]) => ({ branch, ...c }))
      .filter((r) => r.registration + r.update_request > 0)
      .sort((a, b) => a.branch.localeCompare(b.branch));
    const totals = list.reduce(
      (acc, r) => ({
        registration: acc.registration + r.registration,
        update_request: acc.update_request + r.update_request,
      }),
      { registration: 0, update_request: 0 },
    );
    return { list, totals };
  }, [visible]);

  const drillRows = useMemo(() => {
    if (!openKind) return [];
    return visible.filter(
      (r) => r.kind === openKind && (!openBranch || (r.branch_name || NO_BRANCH) === openBranch),
    );
  }, [visible, openKind, openBranch]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['public-pending-student-approvals'] });
    qc.invalidateQueries({ queryKey: ['public-student-directory'] });
  };

  const handleApprove = async (row: PendingStudentApproval) => {
    setBusyId(row.id);
    try {
      await approvePendingApproval(row);
      toast.success(row.kind === 'registration' ? 'Student added' : 'Changes applied');
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Could not approve');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async () => {
    if (!rejecting) return;
    setBusyId(rejecting.id);
    try {
      await rejectPendingApproval(rejecting, reason.trim() || undefined);
      toast.success('Rejected');
      setRejecting(null);
      setReason('');
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Could not reject');
    } finally {
      setBusyId(null);
    }
  };

  const openEdit = (row: PendingStudentApproval) => {
    const vals: Record<string, string> = {};
    for (const [k, v] of Object.entries(row.details)) {
      if (v === null || v === undefined) continue;
      vals[k] = k === 'date_of_birth' ? formatDate(String(v)) : String(v);
    }
    setEditValues(vals);
    setEditing(row);
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    const details: Record<string, any> = {};
    for (const [k, v] of Object.entries(editValues)) {
      const trimmed = v.trim();
      if (k === 'date_of_birth') {
        if (!trimmed) continue;
        const iso = toIsoDate(trimmed);
        if (!iso) {
          toast.error('Date of birth must be DD/MM/YYYY');
          return;
        }
        details[k] = iso;
      } else {
        details[k] = trimmed;
      }
    }
    setBusyId(editing.id);
    try {
      await updatePendingApprovalDetails(editing, details);
      toast.success('Details updated');
      setEditing(null);
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Could not save changes');
    } finally {
      setBusyId(null);
    }
  };

  const Count: React.FC<{ value: number; branch: string; kind: PendingApprovalKind }> = ({ value, branch, kind }) => {
    if (!value) return <span>–</span>;
    return (
      <button
        type="button"
        className="text-primary underline-offset-2 hover:underline font-medium"
        onClick={() => {
          setOpenKind(kind);
          setOpenBranch(branch === 'ALL' ? null : branch);
        }}
      >
        {value}
      </button>
    );
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Student approvals by branch
            <Badge
              variant={byBranch.totals.registration + byBranch.totals.update_request > 0 ? 'destructive' : 'secondary'}
              className="text-[10px]"
            >
              {byBranch.totals.registration + byBranch.totals.update_request}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
            </div>
          ) : byBranch.list.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No students waiting for approval.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left font-medium py-2 pr-2">Branch</th>
                    <th className="text-right font-medium py-2 px-2">New students</th>
                    <th className="text-right font-medium py-2 pl-2">Detail changes</th>
                  </tr>
                </thead>
                <tbody>
                  {byBranch.list.map((r) => (
                    <tr key={r.branch} className="border-b last:border-0">
                      <td className="py-2 pr-2 font-medium">{r.branch}</td>
                      <td className="py-2 px-2 text-right">
                        <Count value={r.registration} branch={r.branch} kind="registration" />
                      </td>
                      <td className="py-2 pl-2 text-right">
                        <Count value={r.update_request} branch={r.branch} kind="update_request" />
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-muted/50">
                    <td className="py-2 pr-2 font-semibold">Total</td>
                    <td className="py-2 px-2 text-right font-semibold">
                      <Count value={byBranch.totals.registration} branch="ALL" kind="registration" />
                    </td>
                    <td className="py-2 pl-2 text-right font-semibold">
                      <Count value={byBranch.totals.update_request} branch="ALL" kind="update_request" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!openKind} onOpenChange={(o) => !o && setOpenKind(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              {openKind === 'registration' ? <UserPlus className="h-4 w-4" /> : <PencilLine className="h-4 w-4" />}
              {openKind === 'registration' ? 'New students waiting' : 'Detail changes waiting'}
              {openBranch ? ` — ${openBranch}` : ''}
            </DialogTitle>
          </DialogHeader>

          {!canApprove && (
            <p className="text-[11px] text-muted-foreground">
              Enter the password to approve or reject.
            </p>
          )}

          <div className="space-y-2">
            {drillRows.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">Nothing waiting.</p>
            )}
            {drillRows.map((row) => (
              <div key={row.id} className="border rounded-md p-2 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">
                      <StudentNameButton
                        name={row.display_name}
                        studentId={row.student_id}
                        onOpen={(id) => setProfileId(id)}
                      />
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {(row.branch_name || NO_BRANCH)} · {formatDateTime(row.submitted_at)}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={!canApprove || busyId === row.id}
                      onClick={() => openEdit(row)}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      disabled={!canApprove || busyId === row.id}
                      onClick={() => handleApprove(row)}
                    >
                      {busyId === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Approve'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={!canApprove || busyId === row.id}
                      onClick={() => {
                        setRejecting(row);
                        setReason('');
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5">
                  {Object.entries(row.details)
                    .filter(([, v]) => v !== null && v !== undefined && v !== '')
                    .map(([k, v]) => (
                      <div key={k} className="text-[11px] flex gap-1">
                        <span className="text-muted-foreground">{label(k)}:</span>
                        {row.kind === 'update_request' ? (
                          <span>
                            <span className="line-through text-muted-foreground">
                              {showValue(k, row.current_values?.[k])}
                            </span>{' '}
                            <span className="font-medium">{showValue(k, v)}</span>
                          </span>
                        ) : (
                          <span className="font-medium">{showValue(k, v)}</span>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">Edit {editing?.display_name || ''}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(editValues).map(([k, v]) => (
              <label key={k} className="text-[11px] space-y-0.5">
                <span className="text-muted-foreground">
                  {label(k)}
                  {k === 'date_of_birth' ? ' (DD/MM/YYYY)' : ''}
                </span>
                <Input
                  value={v}
                  onChange={(e) => setEditValues((prev) => ({ ...prev, [k]: e.target.value }))}
                  className="h-7 text-xs"
                />
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button size="sm" className="h-8 text-xs" disabled={!!busyId} onClick={handleSaveEdit}>
              {busyId === editing?.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Reject {rejecting?.display_name || ''}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)"
            className="text-xs"
            maxLength={500}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-8 text-xs"
              disabled={!!busyId}
              onClick={handleReject}
            >
              Reject
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <StudentProfileDialog studentId={profileId} open={!!profileId} onOpenChange={(o) => !o && setProfileId(null)} />
    </>
  );
};

export default PendingApprovalsSection;
