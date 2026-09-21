/**
 * Shows how payments ended up on student accounts: every automatic and manual
 * link, with who did it and when. Staff corrections are recorded here too.
 */
import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ChevronDown, ChevronUp, History, RotateCcw, Search } from 'lucide-react';
import { toast } from 'sonner';
import {
  correctSubmissionMatch, getMatchEventDetail, listMatchEvents, rememberMatch,
  type MatchEvent, type MatchEventDetail,
} from '@/services/submissionMatchHistoryService';
import { supabase } from '@/integrations/supabase/client';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import { useAuth } from '@/contexts/AuthContext';
import { searchStudentsForMatch } from '@/services/submissionApprovalSources';
import AddStudentDialog from '@/components/grading-list/AddStudentDialog';

interface Props {
  scope?: string;
  title?: string;
}

const useStudentNames = (events: MatchEvent[]) => {
  const ids = Array.from(
    new Set(events.flatMap((e) => [e.student_id, e.previous_student_id]).filter(Boolean) as string[]),
  );
  return useQuery({
    queryKey: ['match-history-students', ids.join(',')],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, student_number')
        .in('id', ids);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((s: any) => {
        map[s.id] = `${[s.first_name, s.last_name].filter(Boolean).join(' ')}${s.student_number ? ` (${s.student_number})` : ''}`;
      });
      return map;
    },
  });
};

export const MatchHistoryDialog: React.FC<Props> = ({ scope, title = 'Match history' }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [correcting, setCorrecting] = React.useState<MatchEvent | null>(null);
  const [replacementId, setReplacementId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['match-history', scope],
    enabled: open,
    queryFn: () => listMatchEvents({ scope, limit: 200 }),
  });
  const { data: names = {} } = useStudentNames(events);
  const { data: detail, isLoading: detailLoading, error: detailError } = useQuery({
    queryKey: ['match-history-detail', expandedId],
    enabled: !!expandedId,
    queryFn: () => getMatchEventDetail(expandedId as string),
  });
  const { data: replacementResults = [] } = useQuery({
    queryKey: ['match-history-student-search', search],
    enabled: !!correcting && !!detail?.invoice_id && search.trim().length >= 2,
    queryFn: () => searchStudentsForMatch(search),
  });

  const closeCorrection = () => {
    setCorrecting(null);
    setReplacementId(null);
    setSearch('');
  };

  const handleCorrection = async () => {
    if (!correcting || !detail) return;
    if (detail.invoice_id && !replacementId) {
      toast.error('Select the correct student');
      return;
    }
    setSaving(true);
    try {
      const actor = user?.employeeId || user?.email || 'superadmin';
      await correctSubmissionMatch({ eventId: correcting.id, newStudentId: replacementId, actor });
      const subject = {
        name: detail.submitted_name,
        dateOfBirth: detail.date_of_birth,
        email: detail.email,
        phone: detail.phone,
      };
      await rememberMatch({
        subject,
        preferredStudentId: replacementId,
        blockedStudentId: correcting.student_id,
        actor,
      });
      toast.success(detail.invoice_id ? 'Match and invoice moved' : 'Matching undone');
      closeCorrection();
      setExpandedId(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['match-history'] }),
        queryClient.invalidateQueries({ queryKey: ['pending-grading-submissions'] }),
        queryClient.invalidateQueries({ queryKey: ['pending-competition-submissions'] }),
        queryClient.invalidateQueries({ queryKey: ['pending-seminar-submissions'] }),
        queryClient.invalidateQueries({ queryKey: ['school-fees-pending-approvals'] }),
        queryClient.invalidateQueries({ queryKey: ['guards-purchase-approvals'] }),
      ]);
      window.dispatchEvent(new CustomEvent('submission-match-corrected'));
    } catch (error: any) {
      toast.error(error.message || 'Failed to correct matching');
    } finally {
      setSaving(false);
    }
  };

  const detailRows = (value: MatchEventDetail) => [
    ['Reference', value.reference],
    ['Submitted name', value.submitted_name],
    ['Date of birth', value.date_of_birth ? formatDate(value.date_of_birth) : null],
    ['Email', value.email],
    ['Contact', value.phone],
    ['Branch', value.branch_name || value.branch_id],
    ['Amount', value.amount == null ? null : `$${Number(value.amount).toFixed(2)}`],
    ['Payment', value.payment_method],
    ['Status', value.status],
    ['Invoice', value.invoice_number],
    ['Submitted', value.submitted_at ? formatDateTime(value.submitted_at) : null],
  ].filter((row): row is [string, string] => !!row[1]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
          <History className="h-3.5 w-3.5" /> Match history
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">{title}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : events.length === 0 ? (
          <p className="text-xs text-muted-foreground">No matches recorded yet.</p>
        ) : (
          <div className="space-y-1.5">
            {events.map((e) => {
              const expanded = expandedId === e.id;
              return (
                <div key={e.id} className="rounded border text-xs overflow-hidden">
                  <button
                    type="button"
                    className="w-full p-2 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-expanded={expanded}
                    onClick={() => setExpandedId(expanded ? null : e.id)}
                  >
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant={e.method === 'auto' ? 'secondary' : 'default'} className="text-[10px]">
                        {e.method === 'auto' ? 'Automatic' : 'Staff'}
                      </Badge>
                      {!scope && <span className="text-muted-foreground">{e.scope}</span>}
                      {e.confidence != null && <span className="text-muted-foreground">{Math.round(e.confidence)}%</span>}
                      <span className="text-muted-foreground ml-auto">{formatDateTime(e.created_at)}</span>
                      {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </div>
                    <p className="font-medium break-words">
                      {e.student_id ? names[e.student_id] || e.student_id : 'Unlinked'}
                    </p>
                    {e.previous_student_id && (
                      <p className="text-muted-foreground break-words">Moved from {names[e.previous_student_id] || e.previous_student_id}</p>
                    )}
                    {e.actor && <p className="text-muted-foreground break-words">By {e.actor}</p>}
                    {e.note && <p className="text-muted-foreground break-words">{e.note}</p>}
                  </button>
                  {expanded && (
                    <div className="border-t bg-muted/20 p-2.5 space-y-2">
                      {detailLoading && <p className="text-muted-foreground">Loading details…</p>}
                      {detailError && <p className="text-destructive">Could not load matching details.</p>}
                      {detail && (
                        <>
                          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                            {detailRows(detail).map(([label, value]) => (
                              <React.Fragment key={label}>
                                <dt className="text-muted-foreground">{label}</dt>
                                <dd className="font-medium break-all text-right">{value}</dd>
                              </React.Fragment>
                            ))}
                            <dt className="text-muted-foreground">Matched to</dt>
                            <dd className="font-medium break-words text-right">{e.student_id ? names[e.student_id] || e.student_id : 'Unmatched'}</dd>
                          </dl>
                          {detail.can_correct && e.student_id && (
                            <Button size="sm" variant="destructive" className="h-7 gap-1" onClick={() => setCorrecting(e)}>
                              <RotateCcw className="h-3.5 w-3.5" /> Undo matching
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>

      <AlertDialog open={!!correcting} onOpenChange={(next) => { if (!next) closeCorrection(); }}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>{detail?.invoice_id ? 'Move match and invoice' : 'Undo matching'}</AlertDialogTitle>
            <AlertDialogDescription>
              {detail?.invoice_id
                ? `Invoice ${detail.invoice_number || ''} and its linked records will move to the student you select. Payment, items, totals and verification stay unchanged.`
                : 'This submission will return to the unmatched list. The incorrect match will be blocked from automatic reuse.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {detail?.invoice_id && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search correct student" className="pl-8" />
              </div>
              <div className="max-h-56 overflow-y-auto space-y-1">
                {(replacementResults as any[]).map((student) => (
                  <Button
                    key={student.id}
                    type="button"
                    variant={replacementId === student.id ? 'secondary' : 'outline'}
                    className="w-full h-auto justify-start text-left py-2"
                    disabled={student.id === correcting?.student_id}
                    onClick={() => setReplacementId(student.id)}
                  >
                    <span className="min-w-0">
                      <span className="block font-medium break-words">{`${student.first_name || ''} ${student.last_name || ''}`.trim()}</span>
                      <span className="block text-xs text-muted-foreground">{student.student_number || '—'} · {student.email || '—'}</span>
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving || (!!detail?.invoice_id && !replacementId)}
              onClick={(event) => { event.preventDefault(); void handleCorrection(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? 'Saving…' : detail?.invoice_id ? 'Move invoice' : 'Undo matching'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default MatchHistoryDialog;
