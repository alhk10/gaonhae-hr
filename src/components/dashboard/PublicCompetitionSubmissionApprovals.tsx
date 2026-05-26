import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CheckCircle, XCircle, UserSearch, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { SignedImage } from '@/components/common/SignedMedia';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatDate } from '@/utils/dateFormat';
import {
  getPendingCompetitionSubmissions,
  findCompetitionSubmissionStudentMatches,
  matchCompetitionSubmission,
  importCompetitionSubmission,
  rejectCompetitionSubmission,
  type PendingCompetitionSubmission,
  type CompetitionStudentMatch,
} from '@/services/competitionPaymentSubmissionService';

interface Props {
  branchId?: string;
}

const PublicCompetitionSubmissionApprovals: React.FC<Props> = ({ branchId }) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const verifiedBy = user?.employeeId || user?.email || 'system';

  const [matchingSub, setMatchingSub] = useState<PendingCompetitionSubmission | null>(null);
  const [rejectingSub, setRejectingSub] = useState<PendingCompetitionSubmission | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['pending-competition-submissions', branchId],
    queryFn: () => getPendingCompetitionSubmissions(branchId),
    refetchInterval: 60_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['pending-competition-submissions'] });
    qc.invalidateQueries({ queryKey: ['pending-competition-submissions-count'] });
    qc.invalidateQueries({ queryKey: ['public-competition-list'] });
  };

  const { data: matches = [], isFetching: matchesLoading } = useQuery({
    queryKey: ['competition-submission-matches', matchingSub?.id],
    queryFn: () => findCompetitionSubmissionStudentMatches(matchingSub!.id),
    enabled: !!matchingSub,
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ['competition-submission-student-search', searchTerm],
    queryFn: async () => {
      if (searchTerm.trim().length < 2) return [];
      const term = `%${searchTerm.trim()}%`;
      const { data } = await supabase
        .from('students')
        .select('id, student_number, first_name, last_name, email, date_of_birth, branch_id, current_belt')
        .or(`first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term},student_number.ilike.${term}`)
        .limit(20);
      return (data || []).map((s: any) => ({
        student_id: s.id,
        student_number: s.student_number,
        full_name: `${s.first_name || ''} ${s.last_name || ''}`.trim().toUpperCase(),
        email: s.email,
        date_of_birth: s.date_of_birth,
        branch_id: s.branch_id,
        current_belt: s.current_belt,
        score: 0,
        reason: 'manual search',
      })) as CompetitionStudentMatch[];
    },
    enabled: !!matchingSub && searchTerm.trim().length >= 2,
  });

  const handleMatchAndImport = async (studentId: string) => {
    if (!matchingSub) return;
    setBusyId(matchingSub.id);
    try {
      await matchCompetitionSubmission(matchingSub.id, studentId);
      await importCompetitionSubmission(matchingSub.id, verifiedBy);
      toast.success('Competition registration approved and invoice generated');
      setMatchingSub(null);
      setSearchTerm('');
      invalidate();
    } catch (err: any) {
      toast.error(err.message || 'Failed to import submission');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingSub) return;
    setBusyId(rejectingSub.id);
    try {
      await rejectCompetitionSubmission(rejectingSub.id, rejectReason || 'Rejected', verifiedBy);
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
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4" />
            Competition Registrations
            <Badge variant="secondary">{submissions.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {submissions.map((sub) => (
            <div key={sub.id} className="border rounded-md p-3 space-y-2 bg-background">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="font-medium text-sm">
                    {sub.student_name}
                    <span className="text-muted-foreground font-normal"> · {sub.branch_name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground space-x-2">
                    {sub.email && <span>{sub.email}</span>}
                    {sub.date_of_birth && <span>DOB {formatDate(sub.date_of_birth)}</span>}
                    {sub.current_belt && <span>· {sub.current_belt}</span>}
                  </div>
                  <div className="text-xs">
                    Ref: <span className="font-mono">{sub.reference_number}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(sub.category_names || []).map((n) => (
                      <Badge key={n} variant="outline" className="text-[10px]">{n}</Badge>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">${Number(sub.amount || 0).toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground capitalize">{sub.payment_method.replace('_', ' ')}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 items-start">
                {sub.proof_url && (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Proof</div>
                    <SignedImage src={sub.proof_url} className="h-20 w-auto rounded border" alt="Proof" />
                  </div>
                )}
                {sub.certificate_url && (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Certificate</div>
                    <SignedImage src={sub.certificate_url} className="h-20 w-auto rounded border" alt="Certificate" />
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => setMatchingSub(sub)}
                  disabled={busyId === sub.id}
                >
                  <UserSearch className="h-3 w-3 mr-1" />
                  Match &amp; Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRejectingSub(sub)}
                  disabled={busyId === sub.id}
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Match dialog */}
      <Dialog open={!!matchingSub} onOpenChange={(o) => { if (!o) { setMatchingSub(null); setSearchTerm(''); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Match to student profile</DialogTitle>
          </DialogHeader>
          {matchingSub && (
            <div className="space-y-3">
              <div className="text-sm border-b pb-2">
                <div className="font-medium">{matchingSub.student_name}</div>
                <div className="text-xs text-muted-foreground">
                  {matchingSub.email} · DOB {matchingSub.date_of_birth ? formatDate(matchingSub.date_of_birth) : '—'} · {matchingSub.current_belt || '—'}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Search students manually</Label>
                <Input
                  placeholder="Search by name, email, or student #"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">
                  {searchTerm.trim().length >= 2 ? 'Search results' : 'Suggested matches'}
                </div>
                {matchesLoading && <div className="text-xs text-muted-foreground">Loading...</div>}
                {(searchTerm.trim().length >= 2 ? searchResults : matches).map((m) => (
                  <div key={m.student_id} className="flex items-center justify-between gap-2 border rounded-md p-2 text-sm">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {m.full_name}
                        {m.student_number && <span className="text-xs text-muted-foreground ml-2">#{m.student_number}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {m.email || '—'} · DOB {m.date_of_birth ? formatDate(m.date_of_birth) : '—'} · {m.current_belt || '—'}
                      </div>
                      {m.reason && <div className="text-[10px] text-muted-foreground">{m.reason}</div>}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleMatchAndImport(m.student_id)}
                      disabled={busyId === matchingSub.id}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Match &amp; Approve
                    </Button>
                  </div>
                ))}
                {(searchTerm.trim().length >= 2 ? searchResults : matches).length === 0 && !matchesLoading && (
                  <div className="text-xs text-muted-foreground">No matches found.</div>
                )}
              </div>
            </div>
          )}
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
    </>
  );
};

export default PublicCompetitionSubmissionApprovals;
