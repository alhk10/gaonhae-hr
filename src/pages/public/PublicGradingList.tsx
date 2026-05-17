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
import { Lock, Unlock, Trash2, Pencil, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/utils/dateFormat';
import {
  getPublicGradingList,
  getPublicGradingSlots,
  adminUpdateGradingSubmissionSlot,
  adminDeleteGradingSubmission,
  type PublicGradingListRow,
  type PublicGradingSlot,
} from '@/services/gradingPaymentSubmissionService';

const ADMIN_UNLOCK_PASSWORD = 'Hp97533488';

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
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [editMode, setEditMode] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [pwInput, setPwInput] = useState('');

  const [slotEditRow, setSlotEditRow] = useState<PublicGradingListRow | null>(null);
  const [slotChoice, setSlotChoice] = useState<string>('');
  const [confirmDeleteRow, setConfirmDeleteRow] = useState<PublicGradingListRow | null>(null);

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

  // Slots for the edit-slot dialog (per row's branch)
  const { data: editableSlots = [] } = useQuery({
    queryKey: ['public-grading-slots', slotEditRow?.branch_id],
    queryFn: () =>
      slotEditRow?.branch_id
        ? getPublicGradingSlots(slotEditRow.branch_id, [], null, slotEditRow.current_belt)
        : Promise.resolve([] as PublicGradingSlot[]),
    enabled: !!slotEditRow?.branch_id,
  });

  const handleUnlock = () => {
    if (pwInput === ADMIN_UNLOCK_PASSWORD) {
      setEditMode(true);
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

  return (
    <div className="min-h-screen bg-muted/30 py-6 px-4">
      <div className="max-w-5xl mx-auto space-y-4 relative">
        {/* Discrete unlock button */}
        <button
          type="button"
          aria-label={editMode ? 'Lock edit mode' : 'Unlock edit mode'}
          onClick={() => (editMode ? setEditMode(false) : setUnlockOpen(true))}
          className="absolute right-0 top-0 p-1.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        >
          {editMode ? <Unlock className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
        </button>

        <div className="text-center">
          <h1 className="text-2xl font-semibold">Grading List</h1>
        </div>

        <Card>
          <CardContent className="p-3">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All dates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All dates</SelectItem>
                {dateOptions.map((d) => (
                  <SelectItem key={d} value={d}>{formatDate(d)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  {g.header.slot_title && (
                    <div className="text-xs text-muted-foreground font-normal mt-0.5">
                      {subtitle}
                    </div>
                  )}
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
                                <a
                                  href={r.proof_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 inline-flex"
                                  title="View proof"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
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
                              {r.source === 'submission' && (
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
              {editableSlots.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {formatDate(s.grading_date)} {s.start_time?.slice(0, 5)} · {s.branch_name}
                </SelectItem>
              ))}
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
    </div>
  );
};

export default PublicGradingList;
