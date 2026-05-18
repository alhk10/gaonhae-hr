import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CheckCircle, XCircle, UserSearch, ShieldCheck, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { SignedImage } from '@/components/common/SignedMedia';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getBranches } from '@/services/settingsService';
import { createStudent } from '@/services/studentService';
import {
  getPendingGradingSubmissions,
  findStudentMatches,
  matchGradingSubmission,
  importGradingSubmission,
  rejectGradingSubmission,
  type PendingGradingSubmission,
  type SubmissionStudentMatch,
} from '@/services/gradingPaymentSubmissionService';

interface Props {
  branchId?: string;
}

const PublicGradingSubmissionApprovals: React.FC<Props> = ({ branchId }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const verifiedBy = user?.employeeId || user?.email || 'system';

  const [matchingSub, setMatchingSub] = useState<PendingGradingSubmission | null>(null);
  const [rejectingSub, setRejectingSub] = useState<PendingGradingSubmission | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['pending-grading-submissions', branchId],
    queryFn: () => getPendingGradingSubmissions(branchId),
    refetchInterval: 60_000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['pending-grading-submissions'] });
    queryClient.invalidateQueries({ queryKey: ['pending-grading-submissions-count'] });
  };

  const { data: matches = [], isFetching: matchesLoading } = useQuery({
    queryKey: ['grading-submission-matches', matchingSub?.id],
    queryFn: () => findStudentMatches(matchingSub!.id),
    enabled: !!matchingSub,
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ['grading-submission-student-search', searchTerm, matchingSub?.branch_id],
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

  const handleMatch = async (studentId: string) => {
    if (!matchingSub) return;
    setBusyId(matchingSub.id);
    try {
      await matchGradingSubmission(matchingSub.id, studentId);
      toast.success('Student matched');
      setMatchingSub(null);
      setSearchTerm('');
      invalidate();
    } catch (e: any) {
      toast.error(e.message || 'Failed to match student');
    } finally {
      setBusyId(null);
    }
  };

  const handleImport = async (sub: PendingGradingSubmission) => {
    if (!sub.matched_student_id) {
      toast.error('Match a student before importing');
      return;
    }
    setBusyId(sub.id);
    try {
      await importGradingSubmission(sub.id, verifiedBy);
      toast.success('Submission imported as paid invoice');
      invalidate();
    } catch (e: any) {
      toast.error(e.message || 'Failed to import');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingSub) return;
    setBusyId(rejectingSub.id);
    try {
      await rejectGradingSubmission(rejectingSub.id, rejectReason.trim() || 'Rejected', verifiedBy);
      toast.success('Submission rejected');
      setRejectingSub(null);
      setRejectReason('');
      invalidate();
    } catch (e: any) {
      toast.error(e.message || 'Failed to reject');
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading) return null;
  if (submissions.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          Public Grading Submissions
          <Badge variant="secondary">{submissions.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {submissions.map((sub) => (
          <div key={sub.id} className="border rounded-md p-3 space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-0.5 text-sm">
                <div className="font-semibold">
                  {sub.student_name}{' '}
                  <span className="text-xs text-muted-foreground font-normal">
                    {sub.reference_number}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {sub.email} · DOB {sub.date_of_birth ? formatDate(sub.date_of_birth) : '—'} · Belt {sub.current_belt || '—'}
                </div>
                <div className="text-xs">
                  {sub.branch_name || sub.branch_id} · {sub.product_name || '—'}
                  {sub.slot_label ? ` · ${sub.slot_label}` : ''}
                </div>
                <div className="text-xs">
                  Amount: <span className="font-medium">${Number(sub.amount || 0).toFixed(2)}</span> · {sub.payment_method}
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

            {sub.proof_url && (
              <SignedImage src={sub.proof_url} alt="Proof of payment" className="max-h-48 rounded border" />
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMatchingSub(sub)}
                disabled={busyId === sub.id}
              >
                <UserSearch className="w-3.5 h-3.5 mr-1" />
                {sub.matched_student_id ? 'Re-match' : 'Match Student'}
              </Button>
              <Button
                size="sm"
                onClick={() => handleImport(sub)}
                disabled={busyId === sub.id || !sub.matched_student_id}
              >
                <CheckCircle className="w-3.5 h-3.5 mr-1" />
                {sub.status === 'verified' ? 'Import as Invoice' : 'Verify & Import'}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setRejectingSub(sub)}
                disabled={busyId === sub.id}
              >
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
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Submission: {matchingSub?.email} · DOB {matchingSub?.date_of_birth ? formatDate(matchingSub.date_of_birth) : '—'} · {matchingSub?.branch_name}
            </div>

            <div>
              <Label className="text-xs">Suggested matches</Label>
              {matchesLoading && <div className="text-xs text-muted-foreground">Loading…</div>}
              {!matchesLoading && matches.length === 0 && (
                <div className="text-xs text-muted-foreground">No fuzzy matches found.</div>
              )}
              <div className="space-y-1 mt-1">
                {matches.map((m: SubmissionStudentMatch) => (
                  <div key={m.student_id} className="flex items-center justify-between gap-2 border rounded p-2 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{m.full_name} <span className="text-xs text-muted-foreground">{m.student_number}</span></div>
                      <div className="text-xs text-muted-foreground truncate">
                        {m.email || '—'} · DOB {m.date_of_birth ? formatDate(m.date_of_birth) : '—'} · {m.branch_id} · {m.current_belt || '—'}
                      </div>
                      {m.reason && <div className="text-[11px] text-muted-foreground">{m.reason} · score {Number(m.score).toFixed(2)}</div>}
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
                        {s.email || '—'} · DOB {s.date_of_birth ? formatDate(s.date_of_birth) : '—'} · {s.branch_id} · {s.current_belt || '—'}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => handleMatch(s.id)}>Use</Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectingSub} onOpenChange={(o) => { if (!o) { setRejectingSub(null); setRejectReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-xs">Reason</Label>
            <Textarea id="reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingSub(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={busyId === rejectingSub?.id}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PublicGradingSubmissionApprovals;
