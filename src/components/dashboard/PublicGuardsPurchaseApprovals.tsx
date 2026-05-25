/**
 * Superadmin approval surface for guards purchases (/guards) that arrived
 * without a matched student. Allows matching, creating a student from the
 * captured details, editing the captured details, or rejecting the purchase.
 *
 * On match or create-student we also generate the paid invoice via
 * createInvoiceForPurchase to mirror the existing inline list behaviour.
 */
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, UserSearch, ShieldCheck, UserPlus, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import { getBranches } from '@/services/settingsService';
import {
  listGuardsPurchases,
  updateGuardsPurchase,
  findStudentMatches,
  createStudentFromPurchase,
  createInvoiceForPurchase,
  type GuardsPurchaseRow,
  type StudentMatchCandidate,
} from '@/services/guardsPurchaseService';

interface Props {
  branchId?: string;
}

const PublicGuardsPurchaseApprovals: React.FC<Props> = ({ branchId }) => {
  const qc = useQueryClient();
  const { user: _user } = useAuth();

  const [matchingRow, setMatchingRow] = useState<GuardsPurchaseRow | null>(null);
  const [editingRow, setEditingRow] = useState<GuardsPurchaseRow | null>(null);
  const [rejectingRow, setRejectingRow] = useState<GuardsPurchaseRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editDraft, setEditDraft] = useState<Partial<GuardsPurchaseRow>>({});

  const { data: branches = [] } = useQuery({
    queryKey: ['branches-for-guards-approvals'],
    queryFn: getBranches,
  });

  const { data: allRows = [], isLoading } = useQuery({
    queryKey: ['guards-purchase-approvals', branchId],
    queryFn: listGuardsPurchases,
    refetchInterval: 60_000,
  });

  const rows = allRows.filter((r) => {
    if (r.matched_student_id) return false;
    if (r.sale_status === 'rejected' || r.sale_status === 'cancelled') return false;
    if (branchId && r.branch_id !== branchId) return false;
    return true;
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['guards-purchase-approvals'] });
    qc.invalidateQueries({ queryKey: ['guards-purchases'] });
  };

  const { data: matches = [], isFetching: matchesLoading } = useQuery({
    queryKey: ['guards-purchase-matches', matchingRow?.id],
    queryFn: () => findStudentMatches(matchingRow!),
    enabled: !!matchingRow,
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ['guards-purchase-student-search', searchTerm, matchingRow?.branch_id],
    queryFn: async () => {
      if (searchTerm.trim().length < 2) return [];
      const term = `%${searchTerm.trim()}%`;
      const { data } = await supabase
        .from('students')
        .select('id, student_number, first_name, last_name, email, date_of_birth, branch_id, current_belt, phone')
        .or(`first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term},student_number.ilike.${term}`)
        .limit(20);
      return data || [];
    },
    enabled: !!matchingRow && searchTerm.trim().length >= 2,
  });

  const [newStudent, setNewStudent] = useState({
    first_name: '', last_name: '', date_of_birth: '', email: '', branch_id: '', gender: '', current_belt: '',
  });
  const [creating, setCreating] = useState(false);

  React.useEffect(() => {
    if (matchingRow) {
      setNewStudent({
        first_name: matchingRow.first_name || '',
        last_name: matchingRow.last_name || '',
        date_of_birth: matchingRow.date_of_birth || '',
        email: matchingRow.email || '',
        branch_id: matchingRow.branch_id || '',
        gender: (matchingRow.gender || '').toLowerCase(),
        current_belt: matchingRow.current_belt || '',
      });
      setShowCreate(false);
    }
  }, [matchingRow]);

  React.useEffect(() => {
    if (editingRow) setEditDraft({ ...editingRow });
  }, [editingRow]);

  const finalize = async (row: GuardsPurchaseRow, studentId: string) => {
    // Link student first so the invoice creation sees the relationship.
    await updateGuardsPurchase(row.id, { matched_student_id: studentId });
    try {
      await createInvoiceForPurchase({ ...row, matched_student_id: studentId }, studentId);
    } catch (e: any) {
      // Surface but do not roll back the match; staff can retry from the list.
      toast.error(`Matched, but invoice failed: ${e.message || e}`);
      return;
    }
  };

  const handleMatch = async (studentId: string) => {
    if (!matchingRow) return;
    setBusyId(matchingRow.id);
    try {
      await finalize(matchingRow, studentId);
      toast.success('Student matched and invoice created');
      setMatchingRow(null);
      setSearchTerm('');
      invalidate();
    } catch (e: any) {
      toast.error(e.message || 'Failed to match');
    } finally {
      setBusyId(null);
    }
  };

  const handleCreateAndMatch = async () => {
    if (!matchingRow) return;
    const { first_name, last_name, date_of_birth, email, branch_id } = newStudent;
    if (!first_name.trim() || !last_name.trim() || !date_of_birth || !branch_id) {
      toast.error('First name, last name, DOB and branch are required');
      return;
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error('Invalid email');
      return;
    }
    setCreating(true);
    try {
      const studentId = await createStudentFromPurchase({
        ...matchingRow,
        first_name: newStudent.first_name,
        last_name: newStudent.last_name,
        date_of_birth: newStudent.date_of_birth,
        email: newStudent.email || null,
        branch_id: newStudent.branch_id,
        gender: newStudent.gender || null,
        current_belt: newStudent.current_belt || null,
      });
      await finalize(matchingRow, studentId);
      toast.success('Student created and matched');
      setMatchingRow(null);
      setSearchTerm('');
      setShowCreate(false);
      invalidate();
    } catch (e: any) {
      toast.error(e.message || 'Failed to create student');
    } finally {
      setCreating(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingRow) return;
    setBusyId(editingRow.id);
    try {
      const patch: any = {
        first_name: (editDraft.first_name || '').trim().toUpperCase(),
        last_name: (editDraft.last_name || '').trim().toUpperCase(),
        email: editDraft.email ? editDraft.email.trim().toLowerCase() : null,
        phone: editDraft.phone || null,
        date_of_birth: editDraft.date_of_birth || null,
        gender: editDraft.gender ? String(editDraft.gender).toLowerCase() : null,
        current_belt: editDraft.current_belt || null,
        branch_id: editDraft.branch_id || null,
      };
      await updateGuardsPurchase(editingRow.id, patch);
      toast.success('Details updated');
      setEditingRow(null);
      invalidate();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingRow) return;
    setBusyId(rejectingRow.id);
    try {
      await updateGuardsPurchase(rejectingRow.id, { sale_status: 'rejected', notes: rejectReason.trim() || null });
      toast.success('Purchase rejected');
      setRejectingRow(null);
      setRejectReason('');
      invalidate();
    } catch (e: any) {
      toast.error(e.message || 'Failed to reject');
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading) return null;
  if (rows.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          Public Guards Purchases — Unmatched
          <Badge variant="secondary">{rows.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => {
          const branchName = branches.find((b: any) => b.id === row.branch_id)?.name || row.branch_id || '—';
          const fullName = `${row.first_name || ''} ${row.last_name || ''}`.trim().toUpperCase();
          return (
            <div key={row.id} className="border rounded-md p-3 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-0.5 text-sm">
                  <div className="font-semibold">
                    {fullName || '—'}{' '}
                    <span className="text-xs text-muted-foreground font-normal">{row.reference_number}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {row.email || '—'} · {row.phone || '—'} · DOB {row.date_of_birth ? formatDate(row.date_of_birth) : '—'}
                  </div>
                  <div className="text-xs">
                    {branchName} · Belt {row.current_belt || '—'} · {row.gender || '—'}
                  </div>
                  <div className="text-xs">
                    Amount: <span className="font-medium">${Number(row.total || 0).toFixed(2)}</span> · {row.payment_method || '—'}
                    {' · '}submitted {formatDateTime(row.created_at)}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Unmatched</Badge>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => setMatchingRow(row)} disabled={busyId === row.id}>
                  <UserSearch className="w-3.5 h-3.5 mr-1" />
                  Match Student
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingRow(row)} disabled={busyId === row.id}>
                  <Pencil className="w-3.5 h-3.5 mr-1" />
                  Edit details
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setRejectingRow(row)} disabled={busyId === row.id}>
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  Reject
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>

      {/* Match dialog */}
      <Dialog open={!!matchingRow} onOpenChange={(o) => { if (!o) { setMatchingRow(null); setSearchTerm(''); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Match student — {`${matchingRow?.first_name || ''} ${matchingRow?.last_name || ''}`.trim()}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Purchase: {matchingRow?.email || '—'} · DOB {matchingRow?.date_of_birth ? formatDate(matchingRow.date_of_birth) : '—'} · {matchingRow?.branch_id}
            </div>

            <div>
              <Label className="text-xs">Suggested matches</Label>
              {matchesLoading && <div className="text-xs text-muted-foreground">Loading…</div>}
              {!matchesLoading && matches.length === 0 && (
                <div className="text-xs text-muted-foreground">No fuzzy matches found.</div>
              )}
              <div className="space-y-1 mt-1">
                {matches.map((m: StudentMatchCandidate) => (
                  <div key={m.id} className="flex items-center justify-between gap-2 border rounded p-2 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {`${m.first_name || ''} ${m.last_name || ''}`.trim().toUpperCase()}{' '}
                        <span className="text-xs text-muted-foreground">{m.student_number}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {m.email || '—'} · DOB {m.date_of_birth ? formatDate(m.date_of_birth) : '—'} · {m.branch_id} · {m.current_belt || '—'}
                      </div>
                      <div className="text-[11px] text-muted-foreground">score {m.score}</div>
                    </div>
                    <Button size="sm" onClick={() => handleMatch(m.id)} disabled={busyId === matchingRow?.id}>Use</Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs">Search students</Label>
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
                        {s.email || '—'} · DOB {s.date_of_birth ? formatDate(s.date_of_birth) : '—'} · {s.branch_id} · {s.current_belt || '—'}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => handleMatch(s.id)} disabled={busyId === matchingRow?.id}>Use</Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <Label className="text-xs">No matching student?</Label>
                  <div className="text-xs text-muted-foreground">Create one from the purchase details.</div>
                </div>
                {!showCreate && (
                  <Button size="sm" variant="outline" onClick={() => setShowCreate(true)}>
                    <UserPlus className="w-3.5 h-3.5 mr-1" />
                    Create new student
                  </Button>
                )}
              </div>

              {showCreate && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">First name *</Label>
                    <Input className="h-8" value={newStudent.first_name}
                      onChange={(e) => setNewStudent(s => ({ ...s, first_name: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Last name *</Label>
                    <Input className="h-8" value={newStudent.last_name}
                      onChange={(e) => setNewStudent(s => ({ ...s, last_name: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Date of birth *</Label>
                    <Input type="date" className="h-8" value={newStudent.date_of_birth}
                      onChange={(e) => setNewStudent(s => ({ ...s, date_of_birth: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input type="email" className="h-8" value={newStudent.email}
                      onChange={(e) => setNewStudent(s => ({ ...s, email: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Branch *</Label>
                    <Select value={newStudent.branch_id} onValueChange={(v) => setNewStudent(s => ({ ...s, branch_id: v }))}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="Select branch" /></SelectTrigger>
                      <SelectContent>
                        {branches.map((b: any) => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Gender</Label>
                    <Select value={newStudent.gender} onValueChange={(v) => setNewStudent(s => ({ ...s, gender: v }))}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="Optional" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2 flex justify-end gap-2 mt-1">
                    <Button size="sm" variant="outline" onClick={() => setShowCreate(false)} disabled={creating}>Cancel</Button>
                    <Button size="sm" onClick={handleCreateAndMatch} disabled={creating}>
                      {creating ? 'Creating…' : 'Create & Match'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit details dialog */}
      <Dialog open={!!editingRow} onOpenChange={(o) => { if (!o) setEditingRow(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit purchase details</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">First name</Label>
              <Input className="h-8" value={editDraft.first_name || ''}
                onChange={(e) => setEditDraft(d => ({ ...d, first_name: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Last name</Label>
              <Input className="h-8" value={editDraft.last_name || ''}
                onChange={(e) => setEditDraft(d => ({ ...d, last_name: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Date of birth</Label>
              <Input type="date" className="h-8" value={editDraft.date_of_birth || ''}
                onChange={(e) => setEditDraft(d => ({ ...d, date_of_birth: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" className="h-8" value={editDraft.email || ''}
                onChange={(e) => setEditDraft(d => ({ ...d, email: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input className="h-8" value={editDraft.phone || ''}
                onChange={(e) => setEditDraft(d => ({ ...d, phone: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Branch</Label>
              <Select value={editDraft.branch_id || ''} onValueChange={(v) => setEditDraft(d => ({ ...d, branch_id: v }))}>
                <SelectTrigger className="h-8"><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  {branches.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Gender</Label>
              <Select value={(editDraft.gender || '').toLowerCase()} onValueChange={(v) => setEditDraft(d => ({ ...d, gender: v }))}>
                <SelectTrigger className="h-8"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Current belt</Label>
              <Input className="h-8" value={editDraft.current_belt || ''}
                onChange={(e) => setEditDraft(d => ({ ...d, current_belt: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRow(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={busyId === editingRow?.id}>
              <CheckCircle className="w-3.5 h-3.5 mr-1" />Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectingRow} onOpenChange={(o) => { if (!o) { setRejectingRow(null); setRejectReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject purchase</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="g-reason" className="text-xs">Reason</Label>
            <Textarea id="g-reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingRow(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={busyId === rejectingRow?.id}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PublicGuardsPurchaseApprovals;
