/**
 * School Fees tab embedded in /access.
 * Lists school-fee payments submitted through the public /hello chat and lets
 * unlocked staff verify, reject or delete a submission (with its auto invoice).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, Trash2, Loader2, AlertTriangle, FileText, UserPlus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { SignedImage } from '@/components/common/SignedMedia';
import { formatDateTime } from '@/utils/dateFormat';
import { formatCurrency } from '@/utils/currencyUtils';
import { useAuth } from '@/contexts/AuthContext';
import {
  getSchoolFeesList,
  verifySchoolFeesSubmission,
  rejectSchoolFeesSubmission,
  getSchoolFeesDeleteContext,
  deleteSchoolFeesSubmission,
  getSchoolFeesStudentMatches,
  matchSchoolFeesSubmission,
  type SchoolFeesRow,
} from '@/services/schoolFeesSubmissionService';
import SchoolFeeProductSettingsDialog from '@/components/grading-list/SchoolFeeProductSettingsDialog';


interface Props {
  branchFilter: string;
  canEdit?: boolean;
  canDelete?: boolean;
  /** Bump to re-apply drill filters from the Summary tab */
  drillNonce?: number;
  drillPendingOnly?: boolean;
}

const statusClass = (s: string) => {
  switch ((s || '').toLowerCase()) {
    case 'verified':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  }
};

const statusLabel = (s: string) => {
  const v = (s || '').toLowerCase();
  if (v === 'verified') return 'Verified';
  if (v === 'rejected') return 'Rejected';
  return 'Pending';
};

const itemsSummary = (row: SchoolFeesRow) =>
  (row.items || [])
    .map((i) => {
      const name = i.product_name || 'Item';
      const term = i.term_name ? ` — ${i.term_name}` : '';
      const qty = i.qty && i.qty > 1 ? ` ×${i.qty}` : '';
      return `${name}${term}${qty}`;
    })
    .join(', ');

const methodLabel = (m?: string | null) =>
  m === 'bank_transfer' ? 'Bank transfer' : m === 'paynow' ? 'PayNow' : (m || '—');

const SchoolFeesTab: React.FC<Props> = ({ branchFilter, canEdit, canDelete, drillNonce, drillPendingOnly }) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const actor = user?.employeeId || user?.email || 'admin';

  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_verification' | 'verified' | 'rejected'>('all');
  useEffect(() => {
    if (drillPendingOnly) setStatusFilter('pending_verification');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drillNonce, drillPendingOnly]);
  const [search, setSearch] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [proofRow, setProofRow] = useState<SchoolFeesRow | null>(null);
  const [invoiceRow, setInvoiceRow] = useState<SchoolFeesRow | null>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [rejectRow, setRejectRow] = useState<SchoolFeesRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [deleteRow, setDeleteRow] = useState<SchoolFeesRow | null>(null);
  const [matchRow, setMatchRow] = useState<SchoolFeesRow | null>(null);
  const [busy, setBusy] = useState(false);

  // Build the invoice PDF for the selected row and preview it inline
  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    if (!invoiceRow) {
      setInvoiceUrl(null);
      setInvoiceError(null);
      return;
    }
    setInvoiceLoading(true);
    setInvoiceError(null);
    (async () => {
      try {
        const detail = await getSchoolFeesInvoiceDetail(invoiceRow.id);
        if (!detail) throw new Error('No invoice found for this payment');
        const blob = await getInvoicePDFBlob(detail);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setInvoiceUrl(objectUrl);
      } catch (e: any) {
        if (!cancelled) setInvoiceError(e?.message || 'Could not load invoice');
      } finally {
        if (!cancelled) setInvoiceLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [invoiceRow]);


  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['school-fees-list', statusFilter],
    queryFn: () => getSchoolFeesList(null, statusFilter === 'all' ? null : statusFilter),
    staleTime: 30 * 1000,
  });

  const { data: deleteCtx, isLoading: ctxLoading } = useQuery({
    queryKey: ['school-fees-delete-context', deleteRow?.id],
    queryFn: () => getSchoolFeesDeleteContext(deleteRow!.id),
    enabled: !!deleteRow,
    staleTime: 0,
  });

  const { data: matches = [], isLoading: matchesLoading } = useQuery({
    queryKey: ['school-fees-student-matches', matchRow?.id],
    queryFn: () => getSchoolFeesStudentMatches(matchRow!.id),
    enabled: !!matchRow,
    staleTime: 0,
  });


  const filtered = useMemo(() => {
    let res = rows as SchoolFeesRow[];
    if (branchFilter !== 'all') res = res.filter((r) => (r.branch_name || '—') === branchFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      res = res.filter((r) =>
        `${r.student_name || ''} ${r.contact_name || ''} ${r.contact_email || ''} ${r.reference_number || ''}`
          .toLowerCase()
          .includes(q),
      );
    }
    return res;
  }, [rows, branchFilter, search]);


  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['school-fees-list'] });
  };

  const handleVerify = async (row: SchoolFeesRow) => {
    setBusy(true);
    try {
      await verifySchoolFeesSubmission(row.id, actor);
      toast.success('Payment verified');
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Could not verify payment');
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!rejectRow) return;
    setBusy(true);
    try {
      await rejectSchoolFeesSubmission(rejectRow.id, rejectReason.trim(), actor);
      toast.success('Payment rejected');
      setRejectRow(null);
      setRejectReason('');
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Could not reject payment');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRow) return;
    setBusy(true);
    try {
      await deleteSchoolFeesSubmission(deleteRow.id, actor);
      toast.success('Submission deleted');
      setDeleteRow(null);
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Could not delete submission');
    } finally {
      setBusy(false);
    }
  };

  const handleMatch = async (studentId: string) => {
    if (!matchRow) return;
    setBusy(true);
    try {
      await matchSchoolFeesSubmission(matchRow.id, studentId, actor);
      toast.success('Student linked and invoice created');
      setMatchRow(null);
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Could not link student');
    } finally {
      setBusy(false);
    }
  };

  const isPdf = (url?: string | null) => !!url && url.toLowerCase().includes('.pdf');



  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="text-lg font-semibold mr-auto">School Fees</h2>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search student"
          className="h-8 w-[160px] text-xs"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending_verification">Pending</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        {canEdit && (
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            title="Class availability & pricing"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </div>

      <SchoolFeeProductSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        actor={actor}
      />


      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading payments…
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center">
          No school fee payments submitted through /hello yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Student</TableHead>
                <TableHead className="text-xs">Branch</TableHead>
                <TableHead className="text-xs">Items</TableHead>
                <TableHead className="text-xs text-right">Amount</TableHead>
                <TableHead className="text-xs">Method</TableHead>
                <TableHead className="text-xs">Proof</TableHead>
                <TableHead className="text-xs">Invoice</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                {(canEdit || canDelete) && <TableHead className="text-xs text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-xs whitespace-nowrap">{formatDateTime(row.created_at)}</TableCell>
                  <TableCell className="text-xs font-medium">
                    <div>{row.student_name || row.contact_name || '—'}</div>
                    {!row.student_id && (
                      <div className="space-y-0.5">
                        <Badge variant="outline" className="text-[10px] bg-orange-100 text-orange-800 border-orange-200">
                          Unmatched
                        </Badge>
                        {row.contact_email && (
                          <div className="text-[10px] text-muted-foreground break-all">{row.contact_email}</div>
                        )}
                        {row.contact_dob && (
                          <div className="text-[10px] text-muted-foreground">DOB {row.contact_dob}</div>
                        )}
                      </div>
                    )}
                  </TableCell>

                  <TableCell className="text-xs">{row.branch_name || '—'}</TableCell>
                  <TableCell className="text-xs max-w-[220px]">
                    <span className="line-clamp-2 break-words">{itemsSummary(row) || '—'}</span>
                  </TableCell>
                  <TableCell className="text-xs text-right whitespace-nowrap">
                    {formatCurrency(Number(row.amount || 0))}
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{methodLabel(row.payment_method)}</TableCell>
                  <TableCell>
                    {row.proof_url ? (
                      <button
                        type="button"
                        onClick={() => setProofRow(row)}
                        className="block"
                        title="View proof"
                      >
                        {isPdf(row.proof_url) ? (
                          <FileText className="h-6 w-6 text-muted-foreground" />
                        ) : (
                          <SignedImage
                            src={row.proof_url}
                            alt="Payment proof"
                            className="h-8 w-8 object-cover rounded border"
                          />
                        )}
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs font-mono whitespace-nowrap">
                    {row.invoice_number || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${statusClass(row.status)}`}>
                      {statusLabel(row.status)}
                    </Badge>
                  </TableCell>
                  {(canEdit || canDelete) && (
                    <TableCell className="text-right whitespace-nowrap">
                      {canEdit && !row.student_id && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-blue-600"
                          title="Link to student"
                          disabled={busy}
                          onClick={() => setMatchRow(row)}
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      )}

                      {canEdit && row.status !== 'verified' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-green-600"
                          title="Verify"
                          disabled={busy}
                          onClick={() => handleVerify(row)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {canEdit && row.status !== 'rejected' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-amber-600"
                          title="Reject"
                          disabled={busy}
                          onClick={() => { setRejectRow(row); setRejectReason(''); }}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          title="Delete"
                          disabled={busy}
                          onClick={() => setDeleteRow(row)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Proof preview */}
      <Dialog open={!!proofRow} onOpenChange={(o) => !o && setProofRow(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Payment proof</DialogTitle>
            <DialogDescription className="text-xs">
              {proofRow?.student_name} — {formatCurrency(Number(proofRow?.amount || 0))}
            </DialogDescription>
          </DialogHeader>
          {proofRow?.proof_url && (
            isPdf(proofRow.proof_url) ? (
              <a
                href={proofRow.proof_url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary underline"
              >
                Open PDF proof
              </a>
            ) : (
              <SignedImage
                src={proofRow.proof_url}
                alt="Payment proof"
                className="w-full max-h-[70vh] object-contain rounded border"
              />
            )
          )}
        </DialogContent>
      </Dialog>

      {/* Reject */}
      <Dialog open={!!rejectRow} onOpenChange={(o) => !o && setRejectRow(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Reject payment?</DialogTitle>
            <DialogDescription className="text-xs">
              {rejectRow?.student_name} — the linked invoice will be set back to unpaid.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason (optional)"
            className="text-xs"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectRow(null)} disabled={busy}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={busy}>
              {busy ? 'Rejecting…' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={!!deleteRow} onOpenChange={(o) => !o && setDeleteRow(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Delete school fee payment?</DialogTitle>
            <DialogDescription className="text-xs">
              {deleteRow?.student_name || 'This row'} — this cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-xs">
            {ctxLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Checking links…
              </div>
            ) : deleteCtx?.invoice_number ? (
              <div className="flex items-start gap-2 rounded border border-amber-300 bg-amber-50 p-2 text-amber-900">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <div>
                    Linked invoice{' '}
                    <span className="font-mono font-medium">{deleteCtx.invoice_number}</span>
                  </div>
                  <div className="text-[11px]">
                    The invoice ({deleteCtx.invoice_items} line item
                    {deleteCtx.invoice_items === 1 ? '' : 's'}) and {deleteCtx.payments} payment
                    {deleteCtx.payments === 1 ? '' : 's'} created by /hello will also be deleted.
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">No linked invoice was found for this row.</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRow(null)} disabled={busy}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={busy || ctxLoading}>
              {busy ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Match to student */}
      <Dialog open={!!matchRow} onOpenChange={(o) => !o && setMatchRow(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Link payment to a student</DialogTitle>
            <DialogDescription className="text-xs">
              {matchRow?.contact_name || '—'}
              {matchRow?.contact_email ? ` · ${matchRow.contact_email}` : ''}
              {matchRow?.contact_dob ? ` · DOB ${matchRow.contact_dob}` : ''}
            </DialogDescription>
          </DialogHeader>
          {matchesLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-6 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Finding matches…
            </div>
          ) : matches.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              No likely student matches found.
            </p>
          ) : (
            <div className="max-h-[50vh] overflow-y-auto divide-y">
              {matches.map((m) => (
                <div key={m.student_id} className="flex items-center gap-2 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate">{m.full_name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {[m.student_number, m.email, m.branch_id, m.current_belt].filter(Boolean).join(' · ')}
                    </div>
                    {m.reason && <div className="text-[10px] text-blue-700">{m.reason}</div>}
                  </div>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    disabled={busy}
                    onClick={() => handleMatch(m.student_id)}
                  >
                    Link
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>

  );
};

export default SchoolFeesTab;
