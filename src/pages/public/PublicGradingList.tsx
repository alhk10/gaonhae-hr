/**
 * Public grading list page (no auth).
 * Mounted at /grading-list.
 *
 * Hidden admin edit mode: discrete lock icon top-right; password unlocks inline
 * delete/update-slot, plus amount + proof columns for submission rows.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Lock, Unlock, Trash2, Pencil, Download, CheckCircle, XCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import { SignedImage } from '@/components/common/SignedMedia';
import { resolveStorageUrl } from '@/utils/storageUrl';
import { useAuth } from '@/contexts/AuthContext';
import {
  getPublicGradingList,
  getPublicGradingSlotsByDate,
  adminUpdateGradingSubmissionSlot,
  adminDeleteGradingSubmission,
  verifyGradingSubmission,
  rejectGradingSubmission,
  type PublicGradingListRow,
  type PublicGradingSlotByDate,
} from '@/services/gradingPaymentSubmissionService';

const ADMIN_UNLOCK_PASSWORD = 'Hp97533488';
const ADMIN_FULL_UNLOCK_PASSWORD = '39SeagullWalk';

const statusVariant = (status: string) => {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  }
};

const PublicGradingList: React.FC = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const verifiedBy = user?.employeeId || user?.email || 'system';
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [unlockLevel, setUnlockLevel] = useState<'none' | 'standard' | 'full'>('none');
  const editMode = unlockLevel !== 'none';
  const canDelete = unlockLevel === 'full';
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [pwInput, setPwInput] = useState('');

  const [slotEditRow, setSlotEditRow] = useState<PublicGradingListRow | null>(null);
  const [slotChoice, setSlotChoice] = useState<string>('');
  const [confirmDeleteRow, setConfirmDeleteRow] = useState<PublicGradingListRow | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [rejectRow, setRejectRow] = useState<PublicGradingListRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['public-grading-list'],
    queryFn: () => getPublicGradingList({}),
    staleTime: 30 * 1000,
  });

  const dateOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.grading_date) set.add(r.grading_date);
    return Array.from(set).sort();
  }, [rows]);

  useEffect(() => {
    if (dateFilter === 'all' && dateOptions.length > 0) {
      setDateFilter(dateOptions[0]);
    }
  }, [dateOptions, dateFilter]);

  const filteredRows = useMemo(
    () => (dateFilter === 'all' ? rows : rows.filter((r) => r.grading_date === dateFilter)),
    [rows, dateFilter],
  );

  const groups = useMemo(() => {
    const map = new Map<string, { header: PublicGradingListRow; items: PublicGradingListRow[] }>();
    for (const r of filteredRows) {
      const key = `${r.grading_date || 'unscheduled'}|${r.start_time || ''}|${r.slot_id || ''}`;
      if (!map.has(key)) map.set(key, { header: r, items: [] });
      map.get(key)!.items.push(r);
    }
    for (const g of map.values()) {
      g.items.sort((a, b) => {
        const ba = (a.branch_name || '').localeCompare(b.branch_name || '');
        if (ba !== 0) return ba;
        return (a.student_name || '').localeCompare(b.student_name || '');
      });
    }
    return Array.from(map.values()).sort((a, b) => {
      const da = a.header.grading_date || '9999-12-31';
      const db = b.header.grading_date || '9999-12-31';
      if (da !== db) return da.localeCompare(db);
      const ta = a.header.start_time || '99:99:99';
      const tb = b.header.start_time || '99:99:99';
      return ta.localeCompare(tb);
    });
  }, [filteredRows]);

  // Slots for the edit-slot dialog (all branches, by the row's grading_date)
  const { data: editableSlots = [] } = useQuery({
    queryKey: ['public-grading-slots-by-date', slotEditRow?.grading_date],
    queryFn: () =>
      slotEditRow?.grading_date
        ? getPublicGradingSlotsByDate(slotEditRow.grading_date)
        : Promise.resolve([] as PublicGradingSlotByDate[]),
    enabled: !!slotEditRow?.grading_date,
  });

  const handleUnlock = () => {
    if (pwInput === ADMIN_FULL_UNLOCK_PASSWORD) {
      setUnlockLevel('full');
      setUnlockOpen(false);
      setPwInput('');
      toast.success('Full edit mode enabled');
    } else if (pwInput === ADMIN_UNLOCK_PASSWORD) {
      setUnlockLevel('standard');
      setUnlockOpen(false);
      setPwInput('');
      toast.success('Edit mode enabled');
    } else {
      toast.error('Incorrect password');
    }
  };

  const handleSlotSave = async () => {
    if (!slotEditRow?.submission_id || !slotChoice) return;
    try {
      await adminUpdateGradingSubmissionSlot(slotEditRow.submission_id, slotChoice);
      toast.success('Slot updated');
      setSlotEditRow(null);
      setSlotChoice('');
      qc.invalidateQueries({ queryKey: ['public-grading-list'] });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update slot');
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteRow?.submission_id) return;
    try {
      await adminDeleteGradingSubmission(confirmDeleteRow.submission_id);
      toast.success('Submission deleted');
      setConfirmDeleteRow(null);
      qc.invalidateQueries({ queryKey: ['public-grading-list'] });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete');
    }
  };

  const handleVerify = async (row: PublicGradingListRow) => {
    if (!row.submission_id) return;
    setBusyId(row.submission_id);
    try {
      await verifyGradingSubmission(row.submission_id, verifiedBy);
      toast.success('Marked as verified');
      qc.invalidateQueries({ queryKey: ['public-grading-list'] });
      qc.invalidateQueries({ queryKey: ['pending-grading-submissions'] });
      qc.invalidateQueries({ queryKey: ['pending-grading-submissions-count'] });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to verify');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectRow?.submission_id) return;
    setBusyId(rejectRow.submission_id);
    try {
      await rejectGradingSubmission(rejectRow.submission_id, rejectReason.trim() || 'Rejected', verifiedBy);
      toast.success('Submission rejected');
      setRejectRow(null);
      setRejectReason('');
      qc.invalidateQueries({ queryKey: ['public-grading-list'] });
      qc.invalidateQueries({ queryKey: ['pending-grading-submissions'] });
      qc.invalidateQueries({ queryKey: ['pending-grading-submissions-count'] });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to reject');
    } finally {
      setBusyId(null);
    }
  };

  const openLightbox = async (storedUrl: string) => {
    const resolved = await resolveStorageUrl(storedUrl);
    setLightboxUrl(resolved || storedUrl);
  };

  const handleDownloadPdf = () => {
    if (groups.length === 0) return;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 10;
    const gutter = 6;
    const colW = (pageW - margin * 2 - gutter) / 2;
    const colX = [margin, margin + colW + gutter];

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Grading List', pageW / 2, margin + 4, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const subtitle = dateFilter === 'all' ? 'All dates' : formatDate(dateFilter);
    doc.text(subtitle, pageW / 2, margin + 9, { align: 'center' });

    const contentTop = margin + 14;
    const contentBottom = pageH - margin;
    const colY = [contentTop, contentTop];

    const renderGroup = (g: typeof groups[number]) => {
      const sub = [
        g.header.grading_date ? formatDate(g.header.grading_date) : 'Unscheduled',
        g.header.start_time
          ? `${g.header.start_time.slice(0, 5)}${g.header.end_time ? `–${g.header.end_time.slice(0, 5)}` : ''}`
          : null,
      ].filter(Boolean).join(' · ');
      const title = g.header.slot_title || sub || 'Grading';

      const body = g.items.map((r, i) => [
        String(i + 1),
        r.branch_name || '—',
        r.student_name,
        `${r.current_belt || '—'}${r.target_belt ? ` → ${r.target_belt}` : ''}`,
        r.paid_status,
      ]);

      // Estimate height: title (~5mm) + subtitle (~3.5mm) + table rows
      const estRowH = 4.2;
      const headH = 5.5;
      const estH = 4.5 + (g.header.slot_title ? 3.2 : 0) + headH + body.length * estRowH + 4;

      // Pick column: prefer one with room; else the shorter; else new page
      let ci = colY[0] <= colY[1] ? 0 : 1;
      if (colY[ci] + estH > contentBottom && colY[1 - ci] + estH <= contentBottom) {
        ci = 1 - ci;
      }
      if (colY[ci] + estH > contentBottom) {
        // New page
        doc.addPage();
        colY[0] = margin;
        colY[1] = margin;
        ci = 0;
      }

      const x = colX[ci];
      let y = colY[ci];

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      const titleLines = doc.splitTextToSize(title, colW);
      doc.text(titleLines, x, y + 3.5);
      y += titleLines.length * 4;

      if (g.header.slot_title) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(120);
        doc.text(sub, x, y + 3);
        doc.setTextColor(0);
        y += 3.5;
      }

      autoTable(doc, {
        startY: y + 1,
        margin: { left: x, right: pageW - x - colW },
        tableWidth: colW,
        head: [['#', 'Branch', 'Student', 'Belt', 'Status']],
        body,
        styles: { fontSize: 7, cellPadding: 1, overflow: 'linebreak' },
        headStyles: { fillColor: [240, 240, 240], textColor: 30, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        columnStyles: {
          0: { cellWidth: 6, halign: 'right' },
          1: { cellWidth: 18 },
          2: { cellWidth: 'auto' },
          3: { cellWidth: 22 },
          4: { cellWidth: 18 },
        },
      });

      // @ts-ignore lastAutoTable is attached by plugin
      colY[ci] = (doc as any).lastAutoTable.finalY + 4;
    };

    groups.forEach(renderGroup);

    const fname = `grading-list-${dateFilter === 'all' ? 'all' : dateFilter}.pdf`;
    try {
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fname;
      a.rel = 'noopener';
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (e) {
      try { doc.save(fname); } catch { /* noop */ }
      toast.error('Could not download PDF in this view');
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 py-6 px-4">
      <div className="max-w-5xl mx-auto space-y-4 relative">
        {/* Discrete unlock button */}
        <button
          type="button"
          aria-label={editMode ? 'Lock edit mode' : 'Unlock edit mode'}
          onClick={() => (editMode ? setUnlockLevel('none') : setUnlockOpen(true))}
          className="absolute right-0 top-0 p-1.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        >
          {editMode ? <Unlock className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
        </button>

        <div className="text-center">
          <h1 className="text-2xl font-semibold">Grading List</h1>
        </div>

        <Card>
          <CardContent className="p-3 flex gap-2">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="All dates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All dates</SelectItem>
                {dateOptions.map((d) => (
                  <SelectItem key={d} value={d}>{formatDate(d)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleDownloadPdf}
              disabled={isLoading || groups.length === 0}
              title="Download PDF"
            >
              <Download className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {isLoading && (
          <p className="text-center text-sm text-muted-foreground">Loading...</p>
        )}

        {!isLoading && groups.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No grading registrations found.
            </CardContent>
          </Card>
        )}

        {groups.map((g, idx) => {
          const subtitle = [
            g.header.grading_date ? formatDate(g.header.grading_date) : 'Unscheduled',
            g.header.start_time
              ? `${g.header.start_time.slice(0, 5)}${g.header.end_time ? `–${g.header.end_time.slice(0, 5)}` : ''}`
              : null,
          ].filter(Boolean).join(' · ');
          return (
            <Card key={idx}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  <div className="font-semibold">
                    {g.header.slot_title || subtitle || 'Grading'}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-7 w-8 px-2 text-xs">#</TableHead>
                      <TableHead className="h-7 px-2 text-[11px]">Branch</TableHead>
                      <TableHead className="h-7 px-2 text-[11px]">Student</TableHead>
                      <TableHead className="h-7 px-2 text-[11px]">Belt</TableHead>
                      <TableHead className="h-7 px-2 text-[11px]">Status</TableHead>
                      {editMode && (
                        <>
                          <TableHead className="h-7 px-2 text-[11px] text-right">Amount</TableHead>
                          <TableHead className="h-7 px-2 text-[11px]">Proof</TableHead>
                          <TableHead className="h-7 px-2 text-[11px] w-8"></TableHead>
                          <TableHead className="h-7 px-2 text-[11px] w-8"></TableHead>
                          <TableHead className="h-7 px-2 text-[11px] w-8"></TableHead>
                          <TableHead className="h-7 px-2 text-[11px] w-8"></TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {g.items.map((r, i) => (
                      <TableRow key={i} className="odd:bg-muted/40">
                        <TableCell className="px-2 py-0.5 text-[11px] tabular-nums whitespace-nowrap">{i + 1}</TableCell>
                        <TableCell className="px-2 py-0.5 text-[11px]">{r.branch_name || '—'}</TableCell>
                        <TableCell className="px-2 py-0.5 text-[11px] font-medium">{r.student_name}</TableCell>
                        <TableCell className="px-2 py-0.5 text-[11px] text-muted-foreground whitespace-nowrap">
                          {r.current_belt || '—'}{r.target_belt ? ` → ${r.target_belt}` : ''}
                        </TableCell>
                        <TableCell className="px-2 py-0.5">
                          <Badge variant="outline" className={`${statusVariant(r.paid_status)} text-[10px] px-1.5 py-0 whitespace-nowrap`}>
                            {r.paid_status}
                          </Badge>
                        </TableCell>
                        {editMode && (
                          <>
                            <TableCell className="px-2 py-0.5 text-[11px] tabular-nums whitespace-nowrap text-right">
                              {r.source === 'submission' && r.amount != null ? `$${Number(r.amount).toFixed(2)}` : '—'}
                            </TableCell>
                            <TableCell className="px-2 py-0.5">
                              {r.source === 'submission' && r.proof_url ? (
                                <button
                                  type="button"
                                  onClick={() => openLightbox(r.proof_url!)}
                                  className="block"
                                  title="Click to enlarge"
                                >
                                  <SignedImage
                                    src={r.proof_url}
                                    alt="Proof"
                                    className="h-8 w-8 object-cover rounded border cursor-zoom-in hover:opacity-80"
                                    fallback={<span className="text-muted-foreground text-xs">—</span>}
                                  />
                                </button>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell className="px-2 py-0.5">
                              {r.source === 'submission' && r.paid_status === 'pending_verification' && (
                                <button
                                  type="button"
                                  onClick={() => handleVerify(r)}
                                  disabled={busyId === r.submission_id}
                                  className="text-green-600 hover:text-green-800 disabled:opacity-50"
                                  title="Verify payment"
                                >
                                  <CheckCircle className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </TableCell>
                            <TableCell className="px-2 py-0.5">
                              {r.source === 'submission' && r.paid_status === 'pending_verification' && (
                                <button
                                  type="button"
                                  onClick={() => setRejectRow(r)}
                                  disabled={busyId === r.submission_id}
                                  className="text-red-600 hover:text-red-800 disabled:opacity-50"
                                  title="Reject submission"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </TableCell>
                            <TableCell className="px-2 py-0.5">
                              {r.source === 'submission' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSlotEditRow(r);
                                    setSlotChoice(r.slot_id || '');
                                  }}
                                  className="text-muted-foreground hover:text-foreground"
                                  title="Update slot"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </TableCell>
                            <TableCell className="px-2 py-0.5">
                              {canDelete && r.source === 'submission' && (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteRow(r)}
                                  className="text-red-600 hover:text-red-800"
                                  title="Delete submission"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Unlock dialog */}
      <Dialog open={unlockOpen} onOpenChange={setUnlockOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Enter password</DialogTitle>
          </DialogHeader>
          <Input
            type="password"
            value={pwInput}
            onChange={(e) => setPwInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
            placeholder="Password"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlockOpen(false)}>Cancel</Button>
            <Button onClick={handleUnlock}>Unlock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Slot edit dialog */}
      <Dialog open={!!slotEditRow} onOpenChange={(o) => !o && setSlotEditRow(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update slot</DialogTitle>
            <DialogDescription>{slotEditRow?.student_name}</DialogDescription>
          </DialogHeader>
          <Select value={slotChoice} onValueChange={setSlotChoice}>
            <SelectTrigger>
              <SelectValue placeholder="Select slot" />
            </SelectTrigger>
            <SelectContent>
              {editableSlots.map((s) => {
                const fallback = `${formatDate(s.grading_date)} ${s.start_time?.slice(0, 5) || ''} · ${s.branch_name}`;
                return (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title || fallback}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSlotEditRow(null)}>Cancel</Button>
            <Button onClick={handleSlotSave} disabled={!slotChoice}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!confirmDeleteRow} onOpenChange={(o) => !o && setConfirmDeleteRow(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete submission?</DialogTitle>
            <DialogDescription>
              {confirmDeleteRow?.student_name} — this cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteRow(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Proof lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={(o) => !o && setLightboxUrl(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogHeader>
            <DialogTitle className="sr-only">Payment proof</DialogTitle>
          </DialogHeader>
          {lightboxUrl && (
            <img src={lightboxUrl} alt="Payment proof" className="w-full h-auto rounded" />
          )}
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectRow} onOpenChange={(o) => { if (!o) { setRejectRow(null); setRejectReason(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject submission?</DialogTitle>
            <DialogDescription>{rejectRow?.student_name}</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectRow(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={busyId === rejectRow?.submission_id}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PublicGradingList;
