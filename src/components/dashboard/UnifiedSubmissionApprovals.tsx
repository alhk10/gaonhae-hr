/**
 * One combined list of every public payment submission that still needs
 * matching or verification: grading, competition, seminar, school fees and
 * uniforms & guards. Each row keeps the actions its own source supports.
 */
import React, { useMemo, useState } from 'react';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CheckCircle, XCircle, UserSearch, Pencil, UserPlus, RefreshCw, ListFilter, ArrowUpDown, Inbox, ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { SignedImagePreview } from '@/components/common/SignedImagePreview';
import { useAuth } from '@/contexts/AuthContext';
import { MatchHistoryDialog } from '@/components/dashboard/MatchHistoryDialog';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import { getBranches } from '@/services/settingsService';
import { getProofScanMap } from '@/services/proofScanLookupService';
import { createStudent } from '@/services/studentService';
import { isFutureDateOnly } from '@/utils/birthDate';
import { sortSubmissionsByAction } from '@/utils/submissionApprovalSort';
import { pickAutoMatch, toConfidence } from '@/utils/submissionMatchConfidence';
import { runAutoMatchSweep, clearAutoMatchAttempts } from '@/utils/submissionAutoMatch';
import { runAutoImportSweep, clearAutoImportAttempts, tryAutoImport } from '@/utils/submissionAutoImport';
import { recordMatchEvent, rememberMatch, type MatchScope } from '@/services/submissionMatchHistoryService';
import {
  SUBMISSION_SOURCES,
  getSourceAdapter,
  searchStudentsForMatch,
  subjectOfRow,
  type SubmissionTypeKey,
  type UnifiedMatchCandidate,
  type UnifiedSubmissionRow,
} from '@/services/submissionApprovalSources';

interface Props {
  branchId?: string;
}

const TYPE_BADGE: Record<SubmissionTypeKey, string> = {
  grading: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  competition: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
  seminar: 'bg-teal-100 text-teal-800 hover:bg-teal-100',
  school_fees: 'bg-sky-100 text-sky-800 hover:bg-sky-100',
  guards: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
};

const UnifiedSubmissionApprovals: React.FC<Props> = ({ branchId }) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const actor = user?.employeeId || user?.email || 'system';

  const [typeFilter, setTypeFilter] = useState<'all' | SubmissionTypeKey>('all');
  const [search, setSearch] = useState('');
  const [sortPriority, setSortPriority] = useState<'unmatched' | 'unverified'>('unmatched');
  const [newestFirst, setNewestFirst] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [autoErrors, setAutoErrors] = useState<Record<string, string>>({});
  const [scanning, setScanning] = useState(false);

  const [matchingRow, setMatchingRow] = useState<UnifiedSubmissionRow | null>(null);
  const [rejectingRow, setRejectingRow] = useState<UnifiedSubmissionRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [editingRow, setEditingRow] = useState<UnifiedSubmissionRow | null>(null);
  const [editDraft, setEditDraft] = useState<{
    first_name: string; last_name: string; email: string; date_of_birth: string; current_belt: string; branch_id: string;
  }>({ first_name: '', last_name: '', email: '', date_of_birth: '', current_belt: '', branch_id: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newStudent, setNewStudent] = useState({
    first_name: '', last_name: '', date_of_birth: '', email: '', branch_id: '', gender: '', current_belt: '',
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches-for-unified-approvals'],
    queryFn: getBranches,
  });

  const { data: proofScans = {} } = useQuery({
    queryKey: ['submission-proof-scans'],
    queryFn: getProofScanMap,
    refetchInterval: 60_000,
  });

  const sourceQueries = useQueries({
    queries: SUBMISSION_SOURCES.map((source) => ({
      queryKey: source.queryKey(branchId),
      queryFn: () => source.fetch(branchId),
      refetchInterval: 60_000,
    })),
  });

  const isLoading = sourceQueries.some((q) => q.isLoading);

  /** All outstanding rows, normalised to one shape. */
  const allRows = useMemo(() => {
    const rows: UnifiedSubmissionRow[] = [];
    SUBMISSION_SOURCES.forEach((source, i) => {
      const items = (sourceQueries[i]?.data as unknown[]) || [];
      items.forEach((item) => {
        try {
          rows.push(source.toRow(item));
        } catch {
          /* a malformed row must never break the whole list */
        }
      });
    });
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceQueries.map((q) => q.dataUpdatedAt).join(',')]);

  const countsByType = useMemo(() => {
    const counts: Record<string, number> = {};
    allRows.forEach((r) => { counts[r.type] = (counts[r.type] || 0) + 1; });
    return counts;
  }, [allRows]);

  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = allRows.filter((r) => {
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (!term) return true;
      return [r.name, r.reference, r.email, r.branchName].filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
    return sortSubmissionsByAction(
      filtered.map((r) => ({ ...r, created_at: r.createdAt })),
      {
        priority: sortPriority,
        newestFirst,
        isUnmatched: (r) => !r.matchedStudentId,
        isUnverified: (r) => !r.verified,
      },
    );
  }, [allRows, typeFilter, search, sortPriority, newestFirst]);

  const invalidate = (type?: SubmissionTypeKey) => {
    const sources = type ? [getSourceAdapter(type)] : SUBMISSION_SOURCES;
    sources.forEach((s) => s.invalidateKeys.forEach((key) => qc.invalidateQueries({ queryKey: [key] })));
  };

  /* ------------------------------ matching ------------------------------ */

  const matchAdapter = matchingRow ? getSourceAdapter(matchingRow.type) : null;

  const { data: matches = [], isFetching: matchesLoading } = useQuery({
    queryKey: ['unified-submission-matches', matchingRow?.type, matchingRow?.id],
    queryFn: () => matchAdapter!.findMatches(matchingRow!.raw) as Promise<UnifiedMatchCandidate[]>,
    enabled: !!matchingRow,
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ['unified-submission-student-search', searchTerm],
    queryFn: () => searchStudentsForMatch(searchTerm),
    enabled: !!matchingRow && searchTerm.trim().length >= 2,
  });

  React.useEffect(() => {
    if (!matchingRow) return;
    setNewStudent({
      first_name: matchingRow.firstName,
      last_name: matchingRow.lastName,
      date_of_birth: matchingRow.dateOfBirth || '',
      email: matchingRow.email || '',
      branch_id: matchingRow.branchId || '',
      gender: '',
      current_belt: matchingRow.belt || '',
    });
    setShowCreate(false);
  }, [matchingRow]);

  React.useEffect(() => {
    if (!editingRow) return;
    setEditDraft({
      first_name: editingRow.firstName,
      last_name: editingRow.lastName,
      email: editingRow.email || '',
      date_of_birth: editingRow.dateOfBirth || '',
      current_belt: editingRow.belt || '',
      branch_id: editingRow.branchId || '',
    });
  }, [editingRow]);

  const handleMatch = async (studentId: string, autoLabel?: string) => {
    if (!matchingRow || !matchAdapter) return;
    const row = matchingRow;
    const adapter = matchAdapter;
    setBusyId(row.id);
    try {
      await adapter.match(row.raw, studentId, actor);
      await recordMatchEvent({
        scope: adapter.historyScope as MatchScope,
        submissionId: row.id,
        studentId,
        previousStudentId: row.matchedStudentId || null,
        method: autoLabel ? 'auto' : 'manual',
        actor,
      });
      if (!autoLabel) {
        // Remember every manual pick so the same person matches automatically next time.
        const suggested = (matches as UnifiedMatchCandidate[])[0]?.student_id;
        await rememberMatch({
          subject: subjectOfRow(row),
          preferredStudentId: studentId,
          blockedStudentId: suggested && suggested !== studentId ? suggested : null,
          actor,
        });
      }
      toast.success(autoLabel || 'Student matched');
      if (row.verified && row.supportsImport && adapter.importInvoice && !adapter.matchCreatesInvoice) {
        const res = await tryAutoImport(() => adapter.importInvoice!(row.raw, actor));
        if (res.imported) toast.success('Verified submission imported as invoice');
        else if (res.error) toast.error(`Matched, but import failed: ${res.error}`);
      }
      setMatchingRow(null);
      setSearchTerm('');
      invalidate(row.type);
    } catch (e: any) {
      toast.error(e.message || 'Failed to match student');
    } finally {
      setBusyId(null);
    }
  };

  // Auto-link the top suggestion when it is confident and clearly ahead.
  const autoMatchedRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!matchingRow || !matchAdapter || matchesLoading) return;
    if (autoMatchedRef.current === matchingRow.id) return;
    const auto = pickAutoMatch(matches as UnifiedMatchCandidate[], {
      maxScore: matchAdapter.maxScore,
      subject: subjectOfRow(matchingRow),
    });
    if (!auto) return;
    autoMatchedRef.current = matchingRow.id;
    void handleMatch(auto.match.student_id, `Auto-matched to ${auto.match.full_name} (${auto.confidence}%)`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchingRow?.id, matches, matchesLoading]);

  const handleCreateAndMatch = async () => {
    if (!matchingRow || !matchAdapter) return;
    const { first_name, last_name, date_of_birth, email, branch_id, gender, current_belt } = newStudent;
    if (!first_name.trim() || !last_name.trim() || !date_of_birth || !branch_id) {
      toast.error('First name, last name, DOB and branch are required');
      return;
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error('Invalid email');
      return;
    }
    if (isFutureDateOnly(date_of_birth)) {
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
      await matchAdapter.match(matchingRow.raw, student.id, actor);
      toast.success('Student created and matched');
      setMatchingRow(null);
      setSearchTerm('');
      setShowCreate(false);
      invalidate(matchingRow.type);
    } catch (e: any) {
      toast.error(e.message || 'Failed to create student');
    } finally {
      setCreating(false);
    }
  };

  /* --------------------------- row level actions ------------------------- */

  const handleVerify = async (row: UnifiedSubmissionRow) => {
    const adapter = getSourceAdapter(row.type);
    if (!adapter.verify) return;
    setBusyId(row.id);
    try {
      await adapter.verify(row.raw, actor);
      toast.success('Payment verified');
      invalidate(row.type);
    } catch (e: any) {
      toast.error(e.message || 'Failed to verify');
    } finally {
      setBusyId(null);
    }
  };

  const handleImport = async (row: UnifiedSubmissionRow) => {
    const adapter = getSourceAdapter(row.type);
    if (!adapter.importInvoice) return;
    if (!row.matchedStudentId) {
      toast.error('Match a student before importing');
      return;
    }
    if (!row.verified) {
      toast.error('Verify the payment before creating an invoice');
      return;
    }
    setBusyId(row.id);
    try {
      await adapter.importInvoice(row.raw, actor);
      toast.success('Submission imported as paid invoice');
      invalidate(row.type);
    } catch (e: any) {
      toast.error(e.message || 'Failed to import');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingRow) return;
    const adapter = getSourceAdapter(rejectingRow.type);
    setBusyId(rejectingRow.id);
    try {
      await adapter.reject(rejectingRow.raw, rejectReason.trim() || 'Rejected', actor);
      toast.success('Submission rejected');
      setRejectingRow(null);
      setRejectReason('');
      invalidate(rejectingRow.type);
    } catch (e: any) {
      toast.error(e.message || 'Failed to reject');
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingRow) return;
    const adapter = getSourceAdapter(editingRow.type);
    if (!adapter.updateDetails) return;
    setBusyId(editingRow.id);
    try {
      await adapter.updateDetails(editingRow.raw, {
        first_name: editDraft.first_name,
        last_name: editDraft.last_name,
        email: editDraft.email,
        date_of_birth: editDraft.date_of_birth || null,
        current_belt: editDraft.current_belt,
        branch_id: editDraft.branch_id || undefined,
      });
      toast.success('Details updated');
      setEditingRow(null);
      invalidate(editingRow.type);
    } catch (e: any) {
      toast.error(e.message || 'Failed to update');
    } finally {
      setBusyId(null);
    }
  };

  /* ------------------------------- sweeps -------------------------------- */

  const runScan = React.useCallback(async () => {
    if (!allRows.length) return;
    setScanning(true);
    try {
      let matched = 0;
      let imported = 0;
      const errors: Record<string, string> = {};

      for (const source of SUBMISSION_SOURCES) {
        const rows = allRows.filter((r) => r.type === source.key);
        if (!rows.length) continue;

        const matchRes = await runAutoMatchSweep(source.autoScope, rows, {
          getId: (r) => r.id,
          needsMatch: (r) => !r.matchedStudentId,
          fetchMatches: (r) => source.findMatches(r.raw),
          match: (r, candidate) => source.match(r.raw, candidate.student_id, actor),
          matchStudent: (r, studentId) => source.match(r.raw, studentId, actor),
          maxScore: source.maxScore,
          getSubject: (r) => subjectOfRow(r),
          historyScope: source.historyScope as MatchScope,
          actor,
        });
        matched += matchRes.matchedIds.length;
        Object.assign(errors, matchRes.errors);

        if (source.importInvoice) {
          // Sources whose match step already creates the invoice must not be imported again.
          const importRows = source.matchCreatesInvoice
            ? rows.filter((r) => !matchRes.matchedIds.includes(r.id))
            : rows.map((r) =>
                matchRes.matchedIds.includes(r.id) ? { ...r, matchedStudentId: r.matchedStudentId || 'matched' } : r,
              );
          const importRes = await runAutoImportSweep(source.autoScope, importRows, {
            getId: (r) => r.id,
            isReady: (r) => r.verified && !!r.matchedStudentId,
            run: (r) => source.importInvoice!(r.raw, actor),
          });
          imported += importRes.importedIds.length;
          Object.assign(errors, importRes.errors);
        }
      }

      if (Object.keys(errors).length) setAutoErrors((p) => ({ ...p, ...errors }));
      if (matched || imported) {
        toast.success(`Matched ${matched}, imported ${imported}`);
        invalidate();
      }
    } finally {
      setScanning(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRows, actor]);

  React.useEffect(() => {
    void runScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRows]);

  const handleRescan = () => {
    SUBMISSION_SOURCES.forEach((s) => {
      clearAutoMatchAttempts(s.autoScope);
      clearAutoImportAttempts(s.autoScope);
    });
    setAutoErrors({});
    void runScan();
  };

  if (isLoading) return null;
  if (allRows.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg flex flex-wrap items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          Public submissions — needs matching or verification
          <Badge variant="secondary">{allRows.length}</Badge>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto h-7 gap-1.5"
            onClick={() => setSortPriority((v) => (v === 'unmatched' ? 'unverified' : 'unmatched'))}
            title={`Switch to ${sortPriority === 'unmatched' ? 'unverified' : 'unmatched'} first`}
          >
            <ListFilter className="h-3.5 w-3.5" />
            {sortPriority === 'unmatched' ? 'Unmatched first' : 'Unverified first'}
          </Button>
          <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={() => setNewestFirst((v) => !v)}>
            <ArrowUpDown className="h-3.5 w-3.5" />
            {newestFirst ? 'Newest first' : 'Oldest first'}
          </Button>
          <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={handleRescan} disabled={scanning}>
            <RefreshCw className={`h-3.5 w-3.5 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Scanning…' : 'Scan & match'}
          </Button>
          <MatchHistoryDialog />
        </CardTitle>

        <div className="flex flex-wrap items-center gap-1.5 pt-2">
          <Button
            size="sm"
            variant={typeFilter === 'all' ? 'default' : 'outline'}
            className="h-7 text-xs"
            onClick={() => setTypeFilter('all')}
          >
            All <Badge variant="secondary" className="ml-1.5 text-[10px]">{allRows.length}</Badge>
          </Button>
          {SUBMISSION_SOURCES.map((s) => (
            <Button
              key={s.key}
              size="sm"
              variant={typeFilter === s.key ? 'default' : 'outline'}
              className="h-7 text-xs"
              onClick={() => setTypeFilter(s.key)}
            >
              {s.label}
              <Badge variant="secondary" className="ml-1.5 text-[10px]">{countsByType[s.key] || 0}</Badge>
            </Button>
          ))}
          <Input
            placeholder="Search name, reference or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 w-full sm:w-64 text-xs"
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {visibleRows.length === 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-6 justify-center">
            <Inbox className="h-4 w-4" /> Nothing matches this filter.
          </div>
        )}

        {visibleRows.map((row) => {
          const adapter = getSourceAdapter(row.type);
          return (
            <div key={`${row.type}-${row.id}`} className="border rounded-md p-3 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-0.5 text-sm min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge className={`text-[10px] ${TYPE_BADGE[row.type]}`}>{row.typeLabel}</Badge>
                    <span className="font-semibold">{row.name || '—'}</span>
                    <span className="text-xs text-muted-foreground font-normal">{row.reference}</span>
                  </div>
                  <div className="text-xs text-muted-foreground break-words">
                    {row.email || '—'} · DOB {row.dateOfBirth ? formatDate(row.dateOfBirth) : '—'} · Belt {row.belt || '—'}
                  </div>
                  <div className="text-xs">
                    {row.branchName || row.branchId || '—'}
                    {row.detail ? ` · ${row.detail}` : ''}
                  </div>
                  <div className="text-xs">
                    Amount: <span className="font-medium">${row.amount.toFixed(2)}</span>
                    {row.paymentMethod ? ` · ${row.paymentMethod}` : ''}
                    {' · '}submitted {formatDateTime(row.createdAt)}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {row.verified ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Verified</Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pending</Badge>
                  )}
                  {row.matchedStudentId ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Matched</Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Unmatched</Badge>
                  )}
                  {(() => {
                    const scan = proofScans[`${row.type}-${row.id}`];
                    if (!scan) return null;
                    if (scan.status === 'match') {
                      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Screenshot ${scan.amount?.toFixed(2)} ✓</Badge>;
                    }
                    if (scan.status === 'mismatch') {
                      return (
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                          Screenshot {scan.amount !== null ? `$${scan.amount.toFixed(2)}` : 'amount unclear'}
                        </Badge>
                      );
                    }
                    return <Badge variant="secondary">Screenshot unreadable</Badge>;
                  })()}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {row.proofUrl && (
                  <SignedImagePreview
                    src={row.proofUrl}
                    label="Proof of payment"
                    alt="Proof of payment"
                    thumbClassName="max-h-48 rounded border hover:opacity-80 transition"
                  />
                )}
                {row.extraImages.map((img) => (
                  <SignedImagePreview
                    key={img.url}
                    src={img.url}
                    label={img.label}
                    alt={img.label}
                    thumbClassName="max-h-48 rounded border hover:opacity-80 transition"
                  />
                ))}
              </div>

              {autoErrors[row.id] && (
                <div className="text-xs text-destructive">Automatic import failed: {autoErrors[row.id]}</div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => setMatchingRow(row)} disabled={busyId === row.id}>
                  <UserSearch className="w-3.5 h-3.5 mr-1" />
                  {row.matchedStudentId ? 'Re-match' : 'Match Student'}
                </Button>
                {!row.verified && adapter.verify && (
                  <Button size="sm" variant="outline" onClick={() => handleVerify(row)} disabled={busyId === row.id}>
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    Verify payment
                  </Button>
                )}
                {row.supportsImport && (
                  <Button
                    size="sm"
                    onClick={() => handleImport(row)}
                    disabled={busyId === row.id || !row.matchedStudentId || !row.verified}
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    Import as Invoice
                  </Button>
                )}
                {adapter.updateDetails && (
                  <Button size="sm" variant="outline" onClick={() => setEditingRow(row)} disabled={busyId === row.id}>
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    Edit details
                  </Button>
                )}
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
            <DialogTitle>Match student — {matchingRow?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              {matchingRow?.typeLabel} · {matchingRow?.email || '—'} · DOB{' '}
              {matchingRow?.dateOfBirth ? formatDate(matchingRow.dateOfBirth) : '—'} ·{' '}
              {matchingRow?.branchName || matchingRow?.branchId || '—'}
            </div>

            <div>
              <Label className="text-xs">Suggested matches</Label>
              {matchesLoading && <div className="text-xs text-muted-foreground">Loading…</div>}
              {!matchesLoading && matches.length === 0 && (
                <div className="text-xs text-muted-foreground">No fuzzy matches found.</div>
              )}
              <div className="space-y-1 mt-1">
                {(matches as UnifiedMatchCandidate[]).map((m) => (
                  <div key={m.student_id} className="flex items-center justify-between gap-2 border rounded p-2 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {m.full_name} <span className="text-xs text-muted-foreground">{m.student_number}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {m.email || '—'} · DOB {m.date_of_birth ? formatDate(m.date_of_birth) : '—'} · {m.current_belt || '—'}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {m.reason ? `${m.reason} · ` : ''}
                        {toConfidence(m.score, matchAdapter?.maxScore)}% match
                      </div>
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
                {(searchResults as any[]).map((s) => (
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
                      onChange={(e) => setNewStudent((s) => ({ ...s, first_name: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Last name *</Label>
                    <Input className="h-8" value={newStudent.last_name}
                      onChange={(e) => setNewStudent((s) => ({ ...s, last_name: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Date of birth *</Label>
                    <Input type="date" className="h-8" value={newStudent.date_of_birth}
                      onChange={(e) => setNewStudent((s) => ({ ...s, date_of_birth: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input type="email" className="h-8" value={newStudent.email}
                      onChange={(e) => setNewStudent((s) => ({ ...s, email: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Branch *</Label>
                    <Select value={newStudent.branch_id} onValueChange={(v) => setNewStudent((s) => ({ ...s, branch_id: v }))}>
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
                    <Select value={newStudent.gender} onValueChange={(v) => setNewStudent((s) => ({ ...s, gender: v }))}>
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
            <DialogTitle>Edit submission details</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">First name</Label>
              <Input className="h-8" value={editDraft.first_name}
                onChange={(e) => setEditDraft((d) => ({ ...d, first_name: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Last name</Label>
              <Input className="h-8" value={editDraft.last_name}
                onChange={(e) => setEditDraft((d) => ({ ...d, last_name: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Date of birth</Label>
              <Input type="date" className="h-8" value={editDraft.date_of_birth}
                onChange={(e) => setEditDraft((d) => ({ ...d, date_of_birth: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" className="h-8" value={editDraft.email}
                onChange={(e) => setEditDraft((d) => ({ ...d, email: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Branch</Label>
              <Select value={editDraft.branch_id} onValueChange={(v) => setEditDraft((d) => ({ ...d, branch_id: v }))}>
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
              <Input className="h-8" value={editDraft.current_belt}
                onChange={(e) => setEditDraft((d) => ({ ...d, current_belt: e.target.value }))} />
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
            <DialogTitle>Reject submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="unified-reject-reason" className="text-xs">Reason</Label>
            <Textarea id="unified-reject-reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} />
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

export default UnifiedSubmissionApprovals;
