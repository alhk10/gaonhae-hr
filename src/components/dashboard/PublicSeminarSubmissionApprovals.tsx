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
import { CheckCircle, XCircle, UserSearch, GraduationCap, Pencil, UserPlus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { SignedImage } from '@/components/common/SignedMedia';
import { SignedImagePreview } from '@/components/common/SignedImagePreview';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import { getBranches } from '@/services/settingsService';
import { createStudent } from '@/services/studentService';
import {
  getPendingSeminarSubmissions,
  findSeminarSubmissionStudentMatches,
  matchSeminarSubmission,
  importSeminarSubmissionStudent,
  createSeminarInvoice,
  rejectSeminarSubmission,
  updateSeminarSubmissionDetails,
  type PendingSeminarSubmission,
  type SeminarStudentMatch,
} from '@/services/seminarPaymentSubmissionService';
import { pickAutoMatch, toConfidence } from '@/utils/submissionMatchConfidence';
import { runAutoImportSweep, tryAutoImport, clearAutoImportAttempts } from '@/utils/submissionAutoImport';
import { runAutoMatchSweep, clearAutoMatchAttempts } from '@/utils/submissionAutoMatch';

interface Props {
  branchId?: string;
}

const PublicSeminarSubmissionApprovals: React.FC<Props> = ({ branchId }) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const verifiedBy = user?.employeeId || user?.email || 'system';

  const [matchingSub, setMatchingSub] = useState<PendingSeminarSubmission | null>(null);
  const [rejectingSub, setRejectingSub] = useState<PendingSeminarSubmission | null>(null);
  const [editingSub, setEditingSub] = useState<PendingSeminarSubmission | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<PendingSeminarSubmission>>({});
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newStudent, setNewStudent] = useState({
    first_name: '', last_name: '', date_of_birth: '', email: '', branch_id: '', gender: '', current_belt: '',
  });
  const [creating, setCreating] = useState(false);

  const { data: branches = [] } = useQuery({
    queryKey: ['branches-for-seminar-submission-create'],
    queryFn: getBranches,
  });

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['pending-seminar-submissions', branchId],
    queryFn: () => getPendingSeminarSubmissions(branchId),
    refetchInterval: 60_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['pending-seminar-submissions'] });
    qc.invalidateQueries({ queryKey: ['pending-seminar-submissions-count'] });
    qc.invalidateQueries({ queryKey: ['public-seminar-list'] });
  };

  const { data: matches = [], isFetching: matchesLoading } = useQuery({
    queryKey: ['seminar-submission-matches', matchingSub?.id],
    queryFn: () => findSeminarSubmissionStudentMatches(matchingSub!.id),
    enabled: !!matchingSub,
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ['seminar-submission-student-search', searchTerm],
    queryFn: async () => {
      if (searchTerm.trim().length < 2) return [];
      const term = `%${searchTerm.trim()}%`;
      const { data } = await supabase
        .from('students')
        .select('id, student_number, first_name, last_name, email, date_of_birth, branch_id, current_belt')
        .or(`first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term},student_number.ilike.${term}`)
        .limit(20);
      return data || [];
    },
    enabled: !!matchingSub && searchTerm.trim().length >= 2,
  });

  React.useEffect(() => {
    if (matchingSub) {
      setNewStudent({
        first_name: matchingSub.first_name || '',
        last_name: matchingSub.last_name || '',
        date_of_birth: matchingSub.date_of_birth || '',
        email: matchingSub.email || '',
        branch_id: matchingSub.branch_id || '',
        gender: matchingSub.gender || '',
        current_belt: matchingSub.current_belt || '',
      });
      setShowCreate(false);
    }
  }, [matchingSub]);

  React.useEffect(() => {
    if (editingSub) setEditDraft({ ...editingSub });
  }, [editingSub]);

  const handleMatch = async (studentId: string, autoLabel?: string) => {
    if (!matchingSub) return;
    setBusyId(matchingSub.id);
    try {
      await matchSeminarSubmission(matchingSub.id, studentId);
      toast.success(autoLabel || 'Student matched');
      if (matchingSub.status === 'verified') {
        const res = await tryAutoImport(() => createSeminarInvoice(matchingSub.id, verifiedBy));
        if (res.imported) toast.success('Verified submission imported as invoice');
        else if (res.error) toast.error(`Matched, but import failed: ${res.error}`);
      }
      setMatchingSub(null);
      setSearchTerm('');
      invalidate();
    } catch (e: any) {
      toast.error(e.message || 'Failed to match student');
    } finally {
      setBusyId(null);
    }
  };

  // Auto-link the top suggestion when it is 85%+ confident and clearly ahead.
  const autoMatchedRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!matchingSub || matchesLoading) return;
    if (autoMatchedRef.current === matchingSub.id) return;
    const auto = pickAutoMatch(matches as SeminarStudentMatch[]);
    if (!auto) return;
    autoMatchedRef.current = matchingSub.id;
    handleMatch(auto.match.student_id, `Auto-matched to ${auto.match.full_name} (${auto.confidence}%)`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchingSub?.id, matches, matchesLoading]);


  const handleCreateAndMatch = async () => {
    if (!matchingSub) return;
    const { first_name, last_name, date_of_birth, email, branch_id, gender, current_belt } = newStudent;
    if (!first_name.trim() || !last_name.trim() || !date_of_birth || !email.trim() || !branch_id) {
      toast.error('First name, last name, DOB, email and branch are required');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error('Invalid email');
      return;
    }
    if (new Date(date_of_birth) > new Date()) {
      toast.error('DOB cannot be in the future');
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
        email: email.trim(),
        branch_id,
        gender: gender || undefined,
        current_belt: current_belt || undefined,
        status: 'active',
      });
      await matchSeminarSubmission(matchingSub.id, student.id);
      toast.success('Student created and matched');
      setMatchingSub(null);
      setSearchTerm('');
      setShowCreate(false);
      invalidate();
    } catch (e: any) {
      toast.error(e.message || 'Failed to create student');
    } finally {
      setCreating(false);
    }
  };

  const handleImport = async (sub: PendingSeminarSubmission) => {
    setBusyId(sub.id);
    try {
      if (!sub.matched_student_id) {
        await importSeminarSubmissionStudent(sub.id, verifiedBy);
      }
      await createSeminarInvoice(sub.id, verifiedBy);
      toast.success('Submission verified and invoice generated');
      invalidate();
    } catch (e: any) {
      toast.error(e.message || 'Failed to import');
    } finally {
      setBusyId(null);
    }
  };

  // Scan: auto-link confident matches, then import anything verified + matched.
  const [autoErrors, setAutoErrors] = useState<Record<string, string>>({});
  const [scanning, setScanning] = useState(false);

  const runScan = React.useCallback(async (rows: PendingSeminarSubmission[]) => {
    if (!rows.length) return;
    setScanning(true);
    try {
      const matchRes = await runAutoMatchSweep('seminar-submissions', rows, {
        getId: (s) => s.id,
        needsMatch: (s) => !s.matched_student_id,
        fetchMatches: (s) => findSeminarSubmissionStudentMatches(s.id),
        match: (s, c) => matchSeminarSubmission(s.id, c.student_id),
      });

      const importRows = rows.map((s) =>
        matchRes.matchedIds.includes(s.id) ? { ...s, matched_student_id: 'matched' } : s,
      ) as PendingSeminarSubmission[];

      const importRes = await runAutoImportSweep('seminar-submissions', importRows, {
        getId: (s) => s.id,
        isReady: (s) => s.status === 'verified' && !!s.matched_student_id,
        run: (s) => createSeminarInvoice(s.id, verifiedBy),
      });

      const errors = { ...matchRes.errors, ...importRes.errors };
      if (Object.keys(errors).length) setAutoErrors((p) => ({ ...p, ...errors }));
      if (matchRes.matchedIds.length || importRes.importedIds.length) {
        toast.success(`Matched ${matchRes.matchedIds.length}, imported ${importRes.importedIds.length}`);
        invalidate();
      }
    } finally {
      setScanning(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifiedBy]);

  React.useEffect(() => {
    void runScan(submissions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissions]);

  const handleRescan = () => {
    clearAutoMatchAttempts('seminar-submissions');
    clearAutoImportAttempts('seminar-submissions');
    setAutoErrors({});
    void runScan(submissions);
  };

  const handleSaveEdit = async () => {
    if (!editingSub) return;
    setBusyId(editingSub.id);
    try {
      await updateSeminarSubmissionDetails(editingSub.id, {
        first_name: editDraft.first_name || '',
        last_name: editDraft.last_name || '',
        email: editDraft.email || null,
        date_of_birth: editDraft.date_of_birth || null,
        current_belt: editDraft.current_belt || null,
        branch_id: editDraft.branch_id || undefined,
      });
      toast.success('Details updated');
      setEditingSub(null);
      invalidate();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingSub) return;
    setBusyId(rejectingSub.id);
    try {
      await rejectSeminarSubmission(rejectingSub.id, rejectReason.trim() || 'Rejected', verifiedBy);
      toast.success('Submission rejected');
      setRejectingSub(null);
      setRejectReason('');
      invalidate();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject submission');
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading) return null;
  if (submissions.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <GraduationCap className="h-4 w-4" />
          Seminar Registrations
          <Badge variant="secondary">{submissions.length}</Badge>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto h-7 gap-1.5"
            onClick={handleRescan}
            disabled={scanning}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Scanning…' : 'Scan & match'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {submissions.map((sub) => (
          <div key={sub.id} className="border rounded-md p-3 space-y-2 bg-background">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-0.5 text-sm">
                <div className="font-semibold">
                  {sub.student_name}{' '}
                  <span className="text-xs text-muted-foreground font-normal">{sub.reference_number}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {sub.email || '—'} · DOB {sub.date_of_birth ? formatDate(sub.date_of_birth) : '—'} · Belt {sub.current_belt || '—'}
                </div>
                <div className="text-xs">{sub.branch_name || sub.branch_id}</div>
                <div className="text-xs mt-1">
                  <span className="font-medium">{sub.package_label}</span>
                  {sub.session_dates?.length ? (
                    <span className="text-muted-foreground"> · {sub.session_dates.map(d => formatDate(d)).join(', ')}</span>
                  ) : null}
                </div>
                <div className="text-xs">
                  Amount: <span className="font-medium">${Number(sub.amount || 0).toFixed(2)}</span> · {sub.payment_method.replace('_', ' ')}
                  {' · '}submitted {formatDateTime(sub.created_at)}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {sub.status === 'verified' ? (
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Verified</Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pending</Badge>
                )}
                {sub.matched_student_id ? (
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Matched</Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Unmatched</Badge>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 items-start">
              {sub.proof_url && (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Proof</div>
                  <SignedImagePreview src={sub.proof_url} label="Proof of payment" alt="Proof" />
                </div>
              )}
            </div>

            {autoErrors[sub.id] && (
              <div className="text-xs text-destructive">Automatic import failed: {autoErrors[sub.id]}</div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={() => setMatchingSub(sub)} disabled={busyId === sub.id}>
                <UserSearch className="w-3.5 h-3.5 mr-1" />
                {sub.matched_student_id ? 'Re-match' : 'Match Student'}
              </Button>
              <Button size="sm" onClick={() => handleImport(sub)} disabled={busyId === sub.id || !sub.matched_student_id}>
                <CheckCircle className="w-3.5 h-3.5 mr-1" />
                {sub.status === 'verified' ? 'Import as Invoice' : 'Verify & Import'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditingSub(sub)} disabled={busyId === sub.id}>
                <Pencil className="w-3.5 h-3.5 mr-1" />
                Edit details
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setRejectingSub(sub)} disabled={busyId === sub.id}>
                <XCircle className="w-3.5 h-3.5 mr-1" />
                Reject
              </Button>
            </div>
          </div>
        ))}
      </CardContent>

      {/* Match dialog */}
      <Dialog open={!!matchingSub} onOpenChange={(o) => { if (!o) { setMatchingSub(null); setSearchTerm(''); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Match student — {matchingSub?.student_name}</DialogTitle>
          </DialogHeader>
          {matchingSub && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">
                Submission: {matchingSub.email || '—'} · DOB {matchingSub.date_of_birth ? formatDate(matchingSub.date_of_birth) : '—'} · {matchingSub.branch_name}
              </div>

              <div>
                <Label className="text-xs">Suggested matches</Label>
                {matchesLoading && <div className="text-xs text-muted-foreground">Loading…</div>}
                {!matchesLoading && matches.length === 0 && (
                  <div className="text-xs text-muted-foreground">No fuzzy matches found.</div>
                )}
                <div className="space-y-1 mt-1">
                  {matches.map((m: SeminarStudentMatch) => (
                    <div key={m.student_id} className="flex items-center justify-between gap-2 border rounded p-2 text-sm">
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {m.full_name} <span className="text-xs text-muted-foreground">{m.student_number}</span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {m.email || '—'} · DOB {m.date_of_birth ? formatDate(m.date_of_birth) : '—'} · {m.current_belt || '—'}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{m.reason ? `${m.reason} · ` : ''}{toConfidence(m.score)}% match</div>
                      </div>
                      <Button size="sm" onClick={() => handleMatch(m.student_id)}>Use</Button>
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
                          {s.email || '—'} · DOB {s.date_of_birth ? formatDate(s.date_of_birth) : '—'} · {s.current_belt || '—'}
                        </div>
                      </div>
                      <Button size="sm" onClick={() => handleMatch(s.id)}>Use</Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <Label className="text-xs">No matching student?</Label>
                    <div className="text-xs text-muted-foreground">Create one from the submission details.</div>
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
                      <Label className="text-xs">Email *</Label>
                      <Input type="email" className="h-8" value={newStudent.email}
                        onChange={(e) => setNewStudent(s => ({ ...s, email: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-xs">Branch *</Label>
                      <Select value={newStudent.branch_id}
                        onValueChange={(v) => setNewStudent(s => ({ ...s, branch_id: v }))}>
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
                      <Select value={newStudent.gender}
                        onValueChange={(v) => setNewStudent(s => ({ ...s, gender: v }))}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Optional" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {newStudent.current_belt && (
                      <div className="sm:col-span-2 text-xs text-muted-foreground">
                        Current belt from submission: <span className="font-medium">{newStudent.current_belt}</span>
                      </div>
                    )}
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
          )}
        </DialogContent>
      </Dialog>

      {/* Edit details dialog */}
      <Dialog open={!!editingSub} onOpenChange={(o) => { if (!o) setEditingSub(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit submission details</DialogTitle>
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
              <Label className="text-xs">Current belt</Label>
              <Input className="h-8" value={editDraft.current_belt || ''}
                onChange={(e) => setEditDraft(d => ({ ...d, current_belt: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSub(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={busyId === editingSub?.id}>
              <CheckCircle className="w-3.5 h-3.5 mr-1" />Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectingSub} onOpenChange={(o) => { if (!o) { setRejectingSub(null); setRejectReason(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject submission</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingSub(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!!busyId}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PublicSeminarSubmissionApprovals;
