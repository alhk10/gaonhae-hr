/**
 * Superadmin approval surface for /hello chat callback requests that have
 * no matched student. Used for inline-registration leads, no-match requests,
 * and trial / general callbacks.
 *
 * Lets superadmin match an existing student, create one from captured details,
 * edit the captured details, or reject the callback. No invoice work is done
 * here — chat payments require a matched student at submission time.
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
import { CheckCircle, XCircle, UserSearch, MessageCircle, UserPlus, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import { getBranches } from '@/services/settingsService';
import { createStudent } from '@/services/studentService';
import {
  listUnmatchedChatCallbacks,
  findChatCallbackStudentMatches,
  matchChatCallback,
  rejectChatCallback,
  updateChatCallback,
  linkCreatedStudentToCallback,
  type PublicChatCallbackRow,
  type ChatCallbackMatchCandidate,
} from '@/services/chatCallbackApprovalService';

interface Props {
  branchId?: string;
}

const typeLabel = (t: string) => {
  switch (t) {
    case 'registration_request': return 'Inline registration';
    case 'no_match_request': return 'No-match';
    case 'trial_lead': return 'Trial lead';
    case 'lesson_schedule_request': return 'Lesson schedule';
    default: return 'Callback';
  }
};

const PublicHelloCallbackApprovals: React.FC<Props> = ({ branchId }) => {
  const qc = useQueryClient();

  const [matchingRow, setMatchingRow] = useState<PublicChatCallbackRow | null>(null);
  const [editingRow, setEditingRow] = useState<PublicChatCallbackRow | null>(null);
  const [rejectingRow, setRejectingRow] = useState<PublicChatCallbackRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editDraft, setEditDraft] = useState<Partial<PublicChatCallbackRow>>({});
  const [newStudent, setNewStudent] = useState({
    first_name: '', last_name: '', date_of_birth: '', email: '', phone: '', branch_id: '', gender: '', current_belt: '',
  });
  const [creating, setCreating] = useState(false);

  const { data: branches = [] } = useQuery({
    queryKey: ['branches-for-hello-approvals'],
    queryFn: getBranches,
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['unmatched-chat-callbacks', branchId],
    queryFn: () => listUnmatchedChatCallbacks(branchId),
    refetchInterval: 60_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['unmatched-chat-callbacks'] });
  };

  const { data: matches = [], isFetching: matchesLoading } = useQuery({
    queryKey: ['hello-callback-matches', matchingRow?.id],
    queryFn: () => findChatCallbackStudentMatches(matchingRow!),
    enabled: !!matchingRow,
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ['hello-callback-student-search', searchTerm, matchingRow?.branch_id],
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

  React.useEffect(() => {
    if (matchingRow) {
      const fallback = (matchingRow.name || '').trim().split(/\s+/);
      setNewStudent({
        first_name: matchingRow.first_name || fallback[0] || '',
        last_name: matchingRow.last_name || fallback.slice(1).join(' ') || '',
        date_of_birth: matchingRow.date_of_birth || '',
        email: matchingRow.contact_email || '',
        phone: matchingRow.contact_phone || '',
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

  const handleMatch = async (studentId: string) => {
    if (!matchingRow) return;
    setBusyId(matchingRow.id);
    try {
      await matchChatCallback(matchingRow.id, studentId);
      toast.success('Student matched');
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
    const { first_name, last_name, date_of_birth, email, branch_id, gender, current_belt, phone } = newStudent;
    if (!first_name.trim() || !last_name.trim() || !date_of_birth || !branch_id) {
      toast.error('First name, last name, DOB and branch are required');
      return;
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error('Invalid email');
      return;
    }
    const fn = first_name.trim().toUpperCase();
    const ln = last_name.trim().toUpperCase();
    setCreating(true);
    try {
      const student = await createStudent({
        first_name: fn,
        last_name: ln,
        certificate_name: `${fn} ${ln}`,
        display_name: `${fn} ${ln}`,
        date_of_birth,
        email: email ? email.trim().toLowerCase() : undefined,
        phone: phone || undefined,
        branch_id,
        gender: gender || undefined,
        current_belt: current_belt || undefined,
        status: 'trial',
      });
      await linkCreatedStudentToCallback(matchingRow.id, student.id);
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
      await updateChatCallback(editingRow.id, {
        first_name: editDraft.first_name || null,
        last_name: editDraft.last_name || null,
        contact_email: editDraft.contact_email || null,
        contact_phone: editDraft.contact_phone || null,
        date_of_birth: editDraft.date_of_birth || null,
        gender: editDraft.gender || null,
        current_belt: editDraft.current_belt || null,
        branch_id: editDraft.branch_id || null,
      });
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
      await rejectChatCallback(rejectingRow.id, rejectReason.trim());
      toast.success('Callback rejected');
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
          <MessageCircle className="w-4 h-4" />
          Public Hello Chat — Unmatched
          <Badge variant="secondary">{rows.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => {
          const branchName = branches.find((b: any) => b.id === row.branch_id)?.name || row.branch_id || '—';
          const fullName = `${row.first_name || ''} ${row.last_name || ''}`.trim().toUpperCase()
            || (row.name || '').toUpperCase()
            || '—';
          return (
            <div key={row.id} className="border rounded-md p-3 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-0.5 text-sm">
                  <div className="font-semibold">
                    {fullName}{' '}
                    <Badge variant="outline" className="text-[10px] ml-1">{typeLabel(row.type)}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {row.contact_email || '—'} · {row.contact_phone || '—'} · DOB {row.date_of_birth ? formatDate(row.date_of_birth) : '—'}
                  </div>
                  <div className="text-xs">
                    {branchName} · Belt {row.current_belt || '—'} · {row.gender || '—'}
                  </div>
                  {row.message && (
                    <div className="text-xs text-muted-foreground whitespace-pre-wrap break-words max-w-prose">
                      {row.message}
                    </div>
                  )}
                  <div className="text-xs">submitted {formatDateTime(row.created_at)}</div>
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
            <DialogTitle>Match student — {matchingRow?.name || ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Callback: {matchingRow?.contact_email || '—'} · {matchingRow?.contact_phone || '—'} · DOB {matchingRow?.date_of_birth ? formatDate(matchingRow.date_of_birth) : '—'}
            </div>

            <div>
              <Label className="text-xs">Suggested matches</Label>
              {matchesLoading && <div className="text-xs text-muted-foreground">Loading…</div>}
              {!matchesLoading && matches.length === 0 && (
                <div className="text-xs text-muted-foreground">No fuzzy matches found.</div>
              )}
              <div className="space-y-1 mt-1">
                {matches.map((m: ChatCallbackMatchCandidate) => (
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
                  <div className="text-xs text-muted-foreground">Create one from the chat details.</div>
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
                    <Label className="text-xs">Phone</Label>
                    <Input className="h-8" value={newStudent.phone}
                      onChange={(e) => setNewStudent(s => ({ ...s, phone: e.target.value }))} />
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
            <DialogTitle>Edit callback details</DialogTitle>
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
              <Input type="email" className="h-8" value={editDraft.contact_email || ''}
                onChange={(e) => setEditDraft(d => ({ ...d, contact_email: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input className="h-8" value={editDraft.contact_phone || ''}
                onChange={(e) => setEditDraft(d => ({ ...d, contact_phone: e.target.value }))} />
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
            <DialogTitle>Reject callback</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="h-reason" className="text-xs">Reason</Label>
            <Textarea id="h-reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} />
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

export default PublicHelloCallbackApprovals;
