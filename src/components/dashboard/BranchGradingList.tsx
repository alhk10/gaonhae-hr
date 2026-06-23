/**
 * Branch Grading List Component
 * Shows active students with invoices for a term, enriched grading data.
 * Pre-filtered by branch ID from props.
 *
 * UX:
 *  - Sorted by grading slot date asc; unassigned slots float to the top.
 *  - Compact 1-line desktop rows.
 *  - Ready checkbox is always interactive and autosaves immediately.
 *  - Multi-select + Bulk Edit dialog replaces the old "Mass Edit" mode.
 *  - The pencil icon on each row opens the same Bulk Edit dialog with that
 *    single student preselected.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getAllTermsForBranch, type Term } from '@/services/termCalendarService';
import { backfillOrphanGradingRegistrationsForBranch } from '@/services/invoiceService';
import { confirmBeltAndCertificate } from '@/services/gradingService';
import { formatBeltLevel, isFoundationToBlackTip, getNextBeltLevel, getDoubleBeltLevel, BELT_LEVELS_ARRAY } from '@/constants/beltLevels';

const beltRank = (belt: string | null | undefined): number => {
  if (!belt) return -1;
  const i = BELT_LEVELS_ARRAY.indexOf(belt);
  return i === -1 ? 9999 : i;
};
import { createGradingDeletionRequest } from '@/services/gradingDeletionRequestService';
import { Award, FileText, Loader2, User, Trash2, Eye, Pencil, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import GradingStudentDetailDialog from '@/components/sales/GradingStudentDetailDialog';
import GradingBulkEditDialog, { type BulkEditStudent } from '@/components/grading/GradingBulkEditDialog';
import { InlineScorecardCell, InlineBmiCell } from '@/components/grading/InlineScorecardCell';
import { ScorecardColumnHeader, AddScorecardColumnHeader } from '@/components/grading/ScorecardColumnHeader';
import { listColumns, scorecardColumnsKey } from '@/services/gradingScorecardColumnService';
import { downloadGradingCertificatePDF, generateBulkGradingCertificatesPDFAsync, type GradingCertificateInput } from '@/utils/gradingCertificatePDFGenerator';
import { generateGradingPrepPDF } from '@/utils/gradingPrepPDFGenerator';
import { useBranches } from '@/hooks/useBranches';
import type { ScorecardRow } from '@/constants/scorecardLabels';
import { format } from 'date-fns';
import { formatDate } from '@/utils/dateFormat';

interface GradingListStudent {
  student_id: string;
  student_name: string;
  current_belt: string | null;
  target_belt: string | null;
  invoice_status: string;
  invoice_id: string;
  ready_for_grading: boolean;
  result: 'pass' | 'fail' | 'double' | 'confirmed' | null;
  result_manual_override: boolean;
  certificate_issued: boolean;
  certificate_ii_issued: boolean;
  registration_id: string | null;
  lessons_attended: number;
  grading_paid: 'paid' | 'unpaid' | 'n/a';
  term_paid: string;
  grading_slot_title: string | null;
  grading_slot_date: string | null;
  grading_slot_id: string | null;
  scorecard: ScorecardRow[];
  student_status?: string | null;
  date_of_birth?: string | null;
}

type CompletionFilter = 'all' | 'missing' | 'ready_print' | 'yet_to_receive';

// Required scorecard fields. Kyorugi/Balchagi are alternatives — lower belts use
// Balchagi, higher belts use Kyorugi. Either counts as the sparring field.
const SCORECARD_REQUIRED_REGEXES = [/height/i, /weight/i, /poomsae/i] as const;
const SPARRING_REGEXES = [/kyorugi/i, /balchagi/i] as const;

const isScorecardFieldFilled = (scorecard: ScorecardRow[], rx: RegExp): boolean => {
  const v = (scorecard.find(r => rx.test(r.label))?.value || '').trim();
  return v !== '' && v !== '-';
};

const getCompleteness = (s: { scorecard: ScorecardRow[]; result: string | null }) => {
  const allFilled =
    SCORECARD_REQUIRED_REGEXES.every(rx => isScorecardFieldFilled(s.scorecard, rx)) &&
    SPARRING_REGEXES.some(rx => isScorecardFieldFilled(s.scorecard, rx));
  const hasResult = !!s.result;
  return { allFilled, hasResult };
};

/** Phase 1 — only Morley (AU) gets the AU certificate template. */
const MORLEY_BRANCH_ID = 'BR1768967806476';

interface BranchGradingListProps {
  branchId: string;
  onStudentClick?: (studentId: string) => void;
}

const RESULT_LABELS: Record<string, string> = {
  double: 'Double',
  pass: 'Pass',
  fail: 'Fail',
  confirmed: 'Confirmed',
};

const getTermPaidBadgeVariant = (status: string): 'success' | 'destructive' | 'secondary' | 'default' => {
  switch (status) {
    case 'paid':
    case 'verified': return 'success';
    case 'overdue':
    case 'unpaid': return 'destructive';
    default: return 'secondary';
  }
};

const getTermPaidLabel = (status: string): string => {
  switch (status) {
    case 'paid': return 'Paid';
    case 'verified': return 'Verified';
    case 'unpaid': return 'Unpaid';
    case 'overdue': return 'Overdue';
    case 'draft': return 'Draft';
    case 'sent': return 'Sent';
    case 'partial': return 'Partial';
    case 'partially_paid': return 'Partial';
    default: return status || '-';
  }
};

const BranchGradingList: React.FC<BranchGradingListProps> = ({ branchId, onStudentClick }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { branches } = useBranches();

  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [detailStudent, setDetailStudent] = useState<{ id: string; name: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkStudentIds, setBulkStudentIds] = useState<string[] | null>(null);
  const [completionFilter, setCompletionFilter] = useState<CompletionFilter>('all');

  const isMorley = branchId === MORLEY_BRANCH_ID;

  // Available grading slots for this branch (used in dialog and slot lookup)
  const { data: availableSlots = [] } = useQuery({
    queryKey: ['grading-slots-available', branchId],
    queryFn: async () => {
      if (!branchId) return [];
      const { data, error } = await supabase
        .from('grading_slots')
        .select('id, title, grading_date')
        .eq('branch_id', branchId)
        .order('grading_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!branchId
  });

  // Scorecard columns for the current term + branch (Morley/AU only — others won't show columns)
  const { data: scorecardColumns = [] } = useQuery({
    queryKey: ['grading-scorecard-columns', selectedTerm, branchId],
    queryFn: () => listColumns(selectedTerm, branchId),
    enabled: !!branchId && !!selectedTerm && isMorley,
  });
  const { data: branchTerms = [] } = useQuery<Term[]>({
    queryKey: ['terms-grading-list', branchId],
    queryFn: () => getAllTermsForBranch(branchId),
    enabled: !!branchId
  });

  // Term ids that should appear in the term selector
  const { data: invoicedTermIds = [] } = useQuery<string[]>({
    queryKey: ['grading-list-invoiced-terms', branchId],
    queryFn: async () => {
      if (!branchId) return [];
      const termIds = new Set<string>();

      const { data: lessonProducts } = await supabase
        .from('products')
        .select('id')
        .eq('is_lesson', true);
      const lessonProductIds = (lessonProducts || []).map(p => p.id);
      if (lessonProductIds.length > 0) {
        const { data: items } = await supabase
          .from('invoice_items')
          .select(`metadata, invoices!inner(branch_id, status)`)
          .in('product_id', lessonProductIds)
          .eq('invoices.branch_id', branchId)
          .in('invoices.status', ['draft', 'sent', 'unpaid', 'partial', 'partially_paid', 'overdue', 'paid', 'verified']);

        (items || []).forEach((it: any) => {
          const md = it.metadata as Record<string, any> | null;
          const tid = md?.term_id || md?.term_ids?.[0];
          if (tid) termIds.add(tid);
        });
      }

      const { data: branchInvoices } = await supabase
        .from('invoices')
        .select('student_id')
        .eq('branch_id', branchId);
      const branchStudentIds = [...new Set((branchInvoices || []).map((i: any) => i.student_id).filter(Boolean))];
      if (branchStudentIds.length > 0) {
        const { data: regs } = await supabase
          .from('grading_registrations')
          .select('term_id, student_id')
          .in('student_id', branchStudentIds)
          .not('term_id', 'is', null);
        (regs || []).forEach((r: any) => { if (r.term_id) termIds.add(r.term_id); });
      }

      return Array.from(termIds);
    },
    enabled: !!branchId
  });

  const availableTerms = React.useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const invoicedSet = new Set(invoicedTermIds);
    const filtered = branchTerms.filter(t => t.start_date <= today || invoicedSet.has(t.id));
    return [...filtered].sort((a, b) => b.start_date.localeCompare(a.start_date));
  }, [branchTerms, invoicedTermIds]);

  React.useEffect(() => {
    if (branchId && availableTerms.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const currentTerm = availableTerms.find(t => t.start_date <= today && t.end_date >= today);
      if (currentTerm) {
        setSelectedTerm(currentTerm.id);
      } else {
        const invoicedSet = new Set(invoicedTermIds);
        const mostRecentWithInvoices = availableTerms.find(t => invoicedSet.has(t.id));
        setSelectedTerm(mostRecentWithInvoices?.id || availableTerms[0].id);
      }
    } else {
      setSelectedTerm('');
    }
    setSelectedIds(new Set());
  }, [branchId, availableTerms, invoicedTermIds]);

  const selectedTermData = availableTerms.find(t => t.id === selectedTerm) || branchTerms.find(t => t.id === selectedTerm);

  const todayStr = new Date().toISOString().split('T')[0];
  const termStarted = !!(selectedTermData?.start_date && selectedTermData.start_date <= todayStr);

  // Fire-and-forget self-heal: backfill orphan grading registrations in the background.
  // Doesn't block the list from rendering. Refreshes the list silently if anything was repaired.
  React.useEffect(() => {
    if (!branchId) return;
    let cancelled = false;
    (async () => {
      try {
        const repaired = await backfillOrphanGradingRegistrationsForBranch(branchId);
        if (!cancelled && repaired > 0) {
          queryClient.invalidateQueries({ queryKey: ['grading-list-students', branchId] });
        }
      } catch {
        /* non-fatal */
      }
    })();
    return () => { cancelled = true; };
  }, [branchId, queryClient]);

  const { data: students = [], isLoading } = useQuery<GradingListStudent[]>({
    queryKey: ['grading-list-students', branchId, selectedTerm],
    queryFn: async () => {
      if (!branchId || !selectedTerm) return [];

      const { data: regs, error: regErr } = await supabase
        .from('grading_registrations')
        .select('id, student_id, current_belt, target_belt, ready_for_grading, result, result_manual_override, certificate_issued, certificate_ii_issued, invoice_item_id, grading_slot_id, term_id, scorecard')
        .eq('term_id', selectedTerm);
      if (regErr) throw regErr;
      const registrations = regs || [];

      const { data: lessonProducts } = await supabase
        .from('products')
        .select('id')
        .eq('is_lesson', true);
      const lessonProductIds = (lessonProducts || []).map(p => p.id);

      let lessonInvoicedItems: any[] = [];
      if (lessonProductIds.length > 0) {
        const { data: items } = await supabase
          .from('invoice_items')
          .select(`metadata, invoices!inner(id, status, student_id, branch_id)`)
          .in('product_id', lessonProductIds)
          .eq('invoices.branch_id', branchId)
          .in('invoices.status', ['draft', 'sent', 'unpaid', 'partial', 'partially_paid', 'overdue', 'paid', 'verified']);
        lessonInvoicedItems = (items || []).filter((it: any) => {
          const md = it.metadata as Record<string, any> | null;
          return md?.term_id === selectedTerm;
        });
      }
      const lessonInvoicedStudentIds = [...new Set(
        lessonInvoicedItems.map((it: any) => (it.invoices as any).student_id).filter(Boolean)
      )];

      const regStudentIds = registrations.map(r => r.student_id);
      const candidateStudentIds = [...new Set([...regStudentIds, ...lessonInvoicedStudentIds])];
      if (candidateStudentIds.length === 0) return [];

      const { data: studentsData } = await supabase
        .from('students')
        .select('id, first_name, last_name, current_belt, status, date_of_birth')
        .in('id', candidateStudentIds);
      const studentMap = (studentsData || []).reduce((acc: Record<string, any>, s) => {
        acc[s.id] = s;
        return acc;
      }, {});
      const activeStudentIds = Object.keys(studentMap);
      if (activeStudentIds.length === 0) return [];

      const { data: branchInvoices } = await supabase
        .from('invoices')
        .select('id, student_id, status')
        .in('student_id', activeStudentIds)
        .eq('branch_id', branchId);
      const studentToBranchInvoices: Record<string, Array<{ id: string; status: string }>> = {};
      (branchInvoices || []).forEach((i: any) => {
        if (!studentToBranchInvoices[i.student_id]) studentToBranchInvoices[i.student_id] = [];
        studentToBranchInvoices[i.student_id].push({ id: i.id, status: i.status });
      });
      const branchScopedStudentIds = Object.keys(studentToBranchInvoices);
      if (branchScopedStudentIds.length === 0) return [];

      const branchScopedRegs = registrations.filter(r => branchScopedStudentIds.includes(r.student_id));

      const studentToTermLessonInvoice: Record<string, { id: string; status: string }> = {};
      lessonInvoicedItems.forEach((it: any) => {
        const inv = it.invoices as any;
        if (!branchScopedStudentIds.includes(inv.student_id)) return;
        if (!studentToTermLessonInvoice[inv.student_id]) {
          studentToTermLessonInvoice[inv.student_id] = { id: inv.id, status: inv.status };
        }
      });

      const slotIds = [...new Set(branchScopedRegs.filter(r => r.grading_slot_id).map(r => r.grading_slot_id!))];
      const invoiceItemIds = branchScopedRegs.filter(r => r.invoice_item_id).map(r => r.invoice_item_id!);

      const [attendanceResult, slotsResult, gradingItemsResult] = await Promise.all([
        selectedTermData ? supabase
          .from('class_attendance')
          .select('student_id')
          .in('student_id', branchScopedStudentIds)
          .eq('branch_id', branchId)
          .eq('status', 'present')
          .gte('class_date', selectedTermData.start_date)
          .lte('class_date', selectedTermData.end_date) : Promise.resolve({ data: [] as any[] }),
        slotIds.length > 0
          ? supabase.from('grading_slots').select('id, title, grading_date').in('id', slotIds)
          : Promise.resolve({ data: [] as any[] }),
        invoiceItemIds.length > 0
          ? supabase
              .from('invoice_items')
              .select('id, invoice_id, invoices!inner(id, status)')
              .in('id', invoiceItemIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const attendanceCountMap: Record<string, number> = {};
      ((attendanceResult.data as any[]) || []).forEach((a: any) => {
        attendanceCountMap[a.student_id] = (attendanceCountMap[a.student_id] || 0) + 1;
      });

      const slotMap: Record<string, any> = {};
      ((slotsResult.data as any[]) || []).forEach((s: any) => { slotMap[s.id] = s; });

      const gradingItemStatusMap: Record<string, string> = {};
      ((gradingItemsResult.data as any[]) || []).forEach((ii: any) => {
        gradingItemStatusMap[ii.id] = (ii.invoices as any)?.status || 'draft';
      });

      const result: GradingListStudent[] = [];
      const seen = new Set<string>();

      for (const reg of branchScopedRegs) {
        if (seen.has(reg.student_id)) continue;
        const student = studentMap[reg.student_id];
        if (!student) continue;
        seen.add(reg.student_id);

        const slot = reg.grading_slot_id ? slotMap[reg.grading_slot_id] : null;

        let gradingPaid: 'paid' | 'unpaid' | 'n/a' = 'n/a';
        if (reg.invoice_item_id && gradingItemStatusMap[reg.invoice_item_id]) {
          const st = gradingItemStatusMap[reg.invoice_item_id];
          gradingPaid = (st === 'paid' || st === 'verified') ? 'paid' : 'unpaid';
        }

        const termLessonInv = studentToTermLessonInvoice[reg.student_id];
        const fallbackInv = studentToBranchInvoices[reg.student_id]?.[0];
        const repInv = termLessonInv || fallbackInv;

        result.push({
          student_id: reg.student_id,
          student_name: `${student.first_name} ${student.last_name}`,
          current_belt: student.current_belt || reg.current_belt,
          target_belt: reg.target_belt || null,
          invoice_status: repInv?.status || 'draft',
          invoice_id: repInv?.id || '',
          ready_for_grading: reg.ready_for_grading || false,
          result: (reg.result as any) || null,
          result_manual_override: (reg as any).result_manual_override || false,
          certificate_issued: reg.certificate_issued || false,
          certificate_ii_issued: reg.certificate_ii_issued || false,
          registration_id: reg.id || null,
          lessons_attended: attendanceCountMap[reg.student_id] || 0,
          grading_paid: gradingPaid,
          term_paid: repInv?.status || 'draft',
          grading_slot_title: slot?.title || null,
          grading_slot_date: slot?.grading_date || null,
          grading_slot_id: reg.grading_slot_id || null,
          scorecard: Array.isArray((reg as any).scorecard)
            ? ((reg as any).scorecard as any[]).map((r: any) => ({ label: String(r?.label ?? ''), value: String(r?.value ?? '') }))
            : [],
          student_status: student.status || null,
          date_of_birth: student.date_of_birth || null,
        });
      }

      for (const studentId of branchScopedStudentIds) {
        if (seen.has(studentId)) continue;
        const student = studentMap[studentId];
        if (!student) continue;
        const termLessonInv = studentToTermLessonInvoice[studentId];
        if (!termLessonInv) continue;
        seen.add(studentId);

        result.push({
          student_id: studentId,
          student_name: `${student.first_name} ${student.last_name}`,
          current_belt: student.current_belt,
          target_belt: null,
          invoice_status: termLessonInv.status,
          invoice_id: termLessonInv.id,
          ready_for_grading: false,
          result: null,
          result_manual_override: false,
          certificate_issued: false,
          certificate_ii_issued: false,
          registration_id: null,
          lessons_attended: attendanceCountMap[studentId] || 0,
          grading_paid: 'n/a',
          term_paid: termLessonInv.status,
          grading_slot_title: null,
          grading_slot_date: null,
          grading_slot_id: null,
          scorecard: [],
          student_status: student.status || null,
          date_of_birth: student.date_of_birth || null,
        });
      }

      // Sort: belt asc (lowest first), then age asc (youngest first = DOB desc), then name
      result.sort((a, b) => {
        const beltCmp = beltRank(a.current_belt) - beltRank(b.current_belt);
        if (beltCmp !== 0) return beltCmp;
        const aDob = a.date_of_birth || '';
        const bDob = b.date_of_birth || '';
        if (aDob !== bDob) return bDob.localeCompare(aDob);
        return a.student_name.localeCompare(b.student_name);
      });
      return result;
    },
    enabled: !!branchId && !!selectedTerm
  });

  // Apply All / Missing Details / Ready for Printing filter to the rendered list
  const displayedStudents = useMemo(() => {
    if (completionFilter === 'all') return students;
    return students.filter(s => {
      const { allFilled, hasResult } = getCompleteness(s);
      const readyForPrinting = allFilled && hasResult;
      if (completionFilter === 'missing') return !allFilled;
      if (completionFilter === 'ready_print') return readyForPrinting;
      // yet_to_receive: ready for printing, pass/double, certificate not yet confirmed
      if (!readyForPrinting) return false;
      if (s.result !== 'pass' && s.result !== 'double') return false;
      const received = s.result === 'double'
        ? (s.certificate_issued && s.certificate_ii_issued)
        : s.certificate_issued;
      return !received;
    });
  }, [students, completionFilter]);

  // Display Ready: DB flag OR (term started AND no result yet)
  const displayReady = useCallback((student: GradingListStudent) => {
    if (student.ready_for_grading) return true;
    if (termStarted && !student.result) return true;
    return false;
  }, [termStarted]);

  // Inline autosave for the Ready checkbox
  const toggleReadyMutation = useMutation({
    mutationFn: async ({ student, next }: { student: GradingListStudent; next: boolean }) => {
      if (student.registration_id) {
        const { error } = await supabase
          .from('grading_registrations')
          .update({ ready_for_grading: next })
          .eq('id', student.registration_id);
        if (error) throw error;
      } else {
        const { getNextBeltLevel } = await import('@/constants/beltLevels');
        const currentBelt = student.current_belt || 'White';
        const nextBelt = getNextBeltLevel(currentBelt) || currentBelt;
        const { error } = await supabase
          .from('grading_registrations')
          .insert([{
            student_id: student.student_id,
            current_belt: currentBelt,
            target_belt: nextBelt,
            grading_slot_id: null,
            ready_for_grading: next,
            result: null,
            term_id: selectedTerm || null,
          }]);
        if (error) throw error;
      }
    },
    onMutate: async ({ student, next }) => {
      // Optimistic update so the tick reflects immediately
      const key = ['grading-list-students', branchId, selectedTerm];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<GradingListStudent[]>(key);
      queryClient.setQueryData<GradingListStudent[]>(key, (old) =>
        (old || []).map(s => s.student_id === student.student_id ? { ...s, ready_for_grading: next } : s)
      );
      return { previous };
    },
    onError: (err: Error, _vars, ctx) => {
      const key = ['grading-list-students', branchId, selectedTerm];
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
      toast.error(err.message || 'Failed to update Ready');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['grading-list-students', branchId, selectedTerm] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ registrationId, studentId, studentName }: { registrationId: string; studentId: string; studentName: string }) => {
      await createGradingDeletionRequest(registrationId, studentId, studentName);
    },
    onSuccess: () => toast.success('Deletion request submitted for superadmin approval'),
    onError: (error: Error) => toast.error(error.message || 'Failed to submit deletion request'),
  });

  /**
   * Generate and download a certificate PDF immediately using the row's
   * saved scorecard JSON (no dialog). Cert I uses the target belt (next
   * promotion); Cert II is only used for "double" promotions and uses the
   * belt after that. Only enabled for the Morley (AU) branch in Phase 1,
   * and only for the Foundation → Black Tip range.
   */
  // Pending certificate request awaiting payment-reminder confirmation.
  const [pendingCert, setPendingCert] = useState<{ student: GradingListStudent; certificateNumber: 1 | 2 } | null>(null);

  // Pending "confirm receipt of belt + certificate" target.
  const [confirmBeltTarget, setConfirmBeltTarget] = useState<GradingListStudent | null>(null);
  const confirmBeltMutation = useMutation({
    mutationFn: async (student: GradingListStudent) => {
      if (!student.registration_id) throw new Error('No grading registration found');
      if (!student.current_belt) throw new Error('Student has no current belt recorded');
      const isDouble = student.result === 'double';
      return confirmBeltAndCertificate({
        registrationId: student.registration_id,
        studentId: student.student_id,
        currentBelt: student.current_belt,
        isDouble,
        country: 'Australia',
      });
    },
    onSuccess: ({ newBelt }, student) => {
      toast.success(`Belt updated to ${formatBeltLevel(newBelt)} for ${student.student_name}`);
      queryClient.invalidateQueries({ queryKey: ['grading-list-students', branchId, selectedTerm] });
      queryClient.invalidateQueries({ queryKey: ['grading-list-students', branchId] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to confirm belt & certificate'),
  });

  /** Actually generate and download the certificate PDF. */
  const runCertificate = (student: GradingListStudent, certificateNumber: 1 | 2) => {
    // Certificate prints the belt the student PASSED FROM (their pre-grading belt).
    // Cert I = current_belt. Cert II = next belt up (only meaningful for double passes,
    // representing the intermediate belt also passed FROM on the way to a double promotion).
    const baseBelt = student.current_belt || '';
    const beltAchieved = certificateNumber === 2
      ? getNextBeltLevel(baseBelt, 'Australia')
      : baseBelt;
    if (!beltAchieved) {
      toast.error('Student has no current belt recorded');
      return;
    }
    if (!student.grading_slot_date) {
      toast.error('Grading date missing — cannot generate certificate');
      return;
    }
    const safeName = student.student_name.replace(/[^\w\-]+/g, '_');
    const safeBelt = beltAchieved.replace(/[^\w\-]+/g, '_');
    const dateStr = format(new Date(student.grading_slot_date), 'yyyy-MM-dd');
    downloadGradingCertificatePDF(
      {
        studentName: student.student_name,
        beltAchieved,
        gradingDate: student.grading_slot_date,
        scorecard: student.scorecard,
        result: student.result === 'pass' || student.result === 'double' || student.result === 'fail' ? student.result : null,
        columnOrder: scorecardColumns.map(c => c.label),
      },
      `Certificate_${safeName}_${safeBelt}_${dateStr}.pdf`,
    );
    toast.success('Certificate generated');
  };

  /**
   * Validate then either prompt a payment-reminder confirmation (if the
   * grading invoice is not yet paid) or download immediately.
   */
  const handleViewCertificate = (student: GradingListStudent, certificateNumber: 1 | 2) => {
    if (!isMorley) {
      toast.info('Certificate template pending for this branch');
      return;
    }
    if (!student.registration_id) {
      toast.error('No grading registration found for this student');
      return;
    }
    if (student.grading_paid !== 'paid') {
      setPendingCert({ student, certificateNumber });
      return;
    }
    runCertificate(student, certificateNumber);
  };

  // ---- Bulk certificate print ---------------------------------------------
  const [pendingBulkPrint, setPendingBulkPrint] = useState<{ inputs: GradingCertificateInput[]; unpaidNames: string[] } | null>(null);

  const buildBulkInputs = (rows: GradingListStudent[]): { inputs: GradingCertificateInput[]; eligibleStudents: GradingListStudent[]; skipped: number } => {
    const inputs: GradingCertificateInput[] = [];
    const eligibleStudents: GradingListStudent[] = [];
    let skipped = 0;
    rows.forEach(student => {
      const beltInRange = isFoundationToBlackTip(student.current_belt);
      const result = student.result;
      const isPass = result === 'pass';
      const isDouble = result === 'double';
      if (!beltInRange || (!isPass && !isDouble) || !student.grading_slot_date) { skipped += 1; return; }
      const baseBelt = student.current_belt || '';
      if (!baseBelt) { skipped += 1; return; }
      inputs.push({
        studentName: student.student_name,
        beltAchieved: baseBelt,
        gradingDate: student.grading_slot_date,
        scorecard: student.scorecard,
        result: isDouble ? 'double' : 'pass',
        columnOrder: scorecardColumns.map(c => c.label),
      });
      if (isDouble) {
        const secondBelt = getNextBeltLevel(baseBelt, 'Australia');
        if (secondBelt) {
          inputs.push({
            studentName: student.student_name,
            beltAchieved: secondBelt,
            gradingDate: student.grading_slot_date,
            scorecard: student.scorecard,
            result: 'double',
            columnOrder: scorecardColumns.map(c => c.label),
          });
        }
      }
      eligibleStudents.push(student);
    });
    return { inputs, eligibleStudents, skipped };
  };

  const [bulkPrinting, setBulkPrinting] = useState(false);

  const runBulkDownload = async (inputs: GradingCertificateInput[]) => {
    if (bulkPrinting) return;
    setBulkPrinting(true);
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const toastId = 'bulk-cert-progress';
    const total = inputs.length;
    toast.loading(`Generating certificates… 0 / ${total} (0%)`, { id: toastId });
    try {
      const doc = await generateBulkGradingCertificatesPDFAsync(inputs, (done, t) => {
        const pct = Math.round((done / t) * 100);
        toast.loading(`Generating certificates… ${done} / ${t} (${pct}%)`, { id: toastId });
      });
      doc.save(`Certificates_Bulk_${dateStr}.pdf`);
      toast.success(`Generated ${total} certificate${total === 1 ? '' : 's'}`, { id: toastId });
    } catch (err) {
      console.error('Bulk certificate generation failed:', err);
      toast.error('Failed to generate certificates', { id: toastId });
    } finally {
      setBulkPrinting(false);
    }
  };

  const handleBulkPrintCertificates = () => {
    if (!isMorley) { toast.info('Certificate template pending for this branch'); return; }
    const selectedStudents = students.filter(s => selectedIds.has(s.student_id));
    if (selectedStudents.length === 0) { toast.info('No students selected'); return; }
    const { inputs, eligibleStudents, skipped } = buildBulkInputs(selectedStudents);
    if (inputs.length === 0) {
      toast.error('No selected students are eligible for certificates (require pass or double).');
      return;
    }
    const unpaidNames = eligibleStudents.filter(s => s.grading_paid !== 'paid').map(s => s.student_name);
    if (skipped > 0) toast.info(`${skipped} student${skipped === 1 ? '' : 's'} skipped (not pass/double or missing data)`);
    if (unpaidNames.length > 0) {
      setPendingBulkPrint({ inputs, unpaidNames });
      return;
    }
    runBulkDownload(inputs);
  };

  const allVisibleSelected = displayedStudents.length > 0 && displayedStudents.every(s => selectedIds.has(s.student_id));
  const someVisibleSelected = displayedStudents.some(s => selectedIds.has(s.student_id));
  const toggleAll = () => {
    setSelectedIds(prev => {
      if (allVisibleSelected) return new Set();
      const next = new Set(prev);
      displayedStudents.forEach(s => next.add(s.student_id));
      return next;
    });
  };
  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Compute the students passed to the bulk dialog (single-row pencil overrides selection)
  const bulkTargetStudents: BulkEditStudent[] = React.useMemo(() => {
    const ids = bulkStudentIds ?? Array.from(selectedIds);
    return students
      .filter(s => ids.includes(s.student_id))
      .map(s => ({
        student_id: s.student_id,
        student_name: s.student_name,
        registration_id: s.registration_id,
        current_belt: s.current_belt,
        grading_paid: s.grading_paid,
        ready_for_grading: s.ready_for_grading,
        result: s.result,
      }));
  }, [bulkStudentIds, selectedIds, students]);

  const renderSlotInline = (s: GradingListStudent) => {
    if (!s.grading_slot_date && !s.grading_slot_title) return <span className="text-muted-foreground">Not Assigned</span>;
    return (
      <span>
        {s.grading_slot_title || 'Slot'}{s.grading_slot_date ? ` · ${formatDate(new Date(s.grading_slot_date))}` : ''}
      </span>
    );
  };

  const cellCls = 'py-1 px-2 text-xs align-middle';
  const headCls = 'h-8 px-2 text-xs';
  // Frozen column helpers — Student stays at left edge, Cert/Cert II/Actions at right edge.
  const stickyLeftHead = 'sticky left-0 z-20 bg-card';
  const stickyLeftCell = 'sticky left-0 z-10 bg-background';
  const stickyRightHead = (offset: string) => `sticky z-20 bg-card ${offset}`;
  const stickyRightCell = (offset: string) => `sticky z-10 bg-background ${offset}`;
  const showScorecard = isMorley && scorecardColumns.length >= 0;
  const hasHeight = scorecardColumns.some(c => /height/i.test(c.label));
  const hasWeight = scorecardColumns.some(c => /weight/i.test(c.label));
  const showBmi = hasHeight && hasWeight;
  const rowsKey = ['grading-list-students', branchId, selectedTerm];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <CardTitle>Students for Grading</CardTitle>
              <div className="w-48">
                <Select value={selectedTerm} onValueChange={(v) => { setSelectedTerm(v); setSelectedIds(new Set()); setCompletionFilter('all'); }}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select Term" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTerms.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Tabs value={completionFilter} onValueChange={(v) => { setCompletionFilter(v as CompletionFilter); setSelectedIds(new Set()); }}>
                <TabsList className="h-8">
                  <TabsTrigger value="all" className="text-xs h-6 px-2">All</TabsTrigger>
                  <TabsTrigger value="missing" className="text-xs h-6 px-2">Missing Details</TabsTrigger>
                  <TabsTrigger value="ready_print" className="text-xs h-6 px-2">Ready for Printing</TabsTrigger>
                  <TabsTrigger value="yet_to_receive" className="text-xs h-6 px-2">Yet to Receive</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="flex gap-2">
              {selectedIds.size > 0 && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkPrintCertificates}
                    disabled={!isMorley || bulkPrinting}
                    title={!isMorley ? 'Template pending for this branch' : (bulkPrinting ? 'Generating…' : 'Print certificates for selected students')}
                  >
                    <Printer className="w-4 h-4 mr-1" />
                    {bulkPrinting ? 'Generating…' : `Print Certificates (${selectedIds.size})`}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => { setBulkStudentIds(null); setBulkOpen(true); }}
                  >
                    <Pencil className="w-4 h-4 mr-1" />
                    Bulk Edit ({selectedIds.size})
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedTerm ? (
            <div className="text-center py-8 text-muted-foreground">Please select a term to view students.</div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active students found with invoices for this term.
            </div>
          ) : displayedStudents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {completionFilter === 'missing'
                ? 'No students with missing details — all good!'
                : 'No students ready for printing yet.'}
            </div>
          ) : (
            <>
              {/* Desktop compact 1-line table */}
              <div className="overflow-x-auto hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={`${headCls} w-[36px]`}>
                        <Checkbox
                          checked={allVisibleSelected ? true : (someVisibleSelected ? 'indeterminate' as any : false)}
                          onCheckedChange={toggleAll}
                          aria-label="Select all"
                        />
                      </TableHead>
                      <TableHead className={`${headCls} min-w-[150px] ${stickyLeftHead}`}>Student</TableHead>
                      <TableHead className={`${headCls} w-[80px]`}>Belt</TableHead>
                      <TableHead className={`${headCls} w-[60px] text-center`}>Lessons</TableHead>
                      <TableHead className={`${headCls} w-[60px] text-center`}>Ready</TableHead>
                      <TableHead className={`${headCls} w-[80px]`}>Term</TableHead>
                      <TableHead className={`${headCls} w-[80px]`}>Grading</TableHead>
                      <TableHead className={`${headCls} min-w-[160px]`}>Slot</TableHead>
                      <TableHead className={`${headCls} w-[90px]`}>Result</TableHead>
                      {showScorecard && scorecardColumns.map(col => (
                        <TableHead key={col.id} className={`${headCls} w-[34px] p-0 align-bottom text-center`}>
                          <ScorecardColumnHeader
                            termId={selectedTerm}
                            branchId={branchId}
                            label={col.label}
                            rowsInvalidateKey={rowsKey}
                          />
                        </TableHead>
                      ))}
                      {showBmi && (
                        <TableHead className={`${headCls} w-[60px] text-center`}>BMI</TableHead>
                      )}
                      {showScorecard && (
                        <TableHead className={`${headCls} w-[80px]`}>
                          <AddScorecardColumnHeader
                            termId={selectedTerm}
                            branchId={branchId}
                            rowsInvalidateKey={rowsKey}
                          />
                        </TableHead>
                      )}
                      <TableHead className={`${headCls} w-[90px] text-center ${stickyRightHead('right-0')}`}>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedStudents.map((student) => {
                      const result = student.result;
                      const ready = displayReady(student);
                      const isSelected = selectedIds.has(student.student_id);
                      // Phase 1 cert eligibility: pass/double + Foundation→Black Tip range.
                      // Non-Morley branches still see the icon (disabled with tooltip).
                      const beltInRange = isFoundationToBlackTip(student.target_belt || student.current_belt);
                      const canViewCertificate = (result === 'pass' || result === 'double') && beltInRange;
                      const canViewCertificateII = result === 'double' && beltInRange;
                      const certDisabled = !isMorley;
                      const certTitle = certDisabled ? 'Template pending for this branch' : 'Generate certificate';
                      const isDoubleResult = result === 'double';
                      const beltConfirmEligible = (result === 'pass' || result === 'double')
                        && isFoundationToBlackTip(student.current_belt)
                        && !!student.current_belt
                        && !!student.registration_id;
                      const beltAlreadyConfirmed = isDoubleResult
                        ? (student.certificate_issued && student.certificate_ii_issued)
                        : student.certificate_issued;

                      return (
                        <TableRow key={student.student_id} className={isSelected ? 'bg-accent/30' : undefined}>
                          <TableCell className={cellCls}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleOne(student.student_id)}
                              aria-label={`Select ${student.student_name}`}
                            />
                          </TableCell>
                          <TableCell className={`${cellCls} ${stickyLeftCell} ${isSelected ? 'bg-accent/30' : ''}`}>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="link"
                                className="p-0 h-auto font-medium text-xs max-w-[180px] truncate inline-flex items-center"
                                onClick={() => onStudentClick ? onStudentClick(student.student_id) : navigate(`/parties/student/${student.student_id}`)}
                              >
                                <User className="w-3 h-3 mr-1 shrink-0" />
                                <span className="truncate">{student.student_name}</span>
                              </Button>
                              {student.student_status && student.student_status !== 'active' && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 capitalize border-amber-400 text-amber-700">
                                  {student.student_status}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className={cellCls}>
                            {student.current_belt ? (
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                {formatBeltLevel(student.current_belt)}
                              </Badge>
                            ) : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell className={`${cellCls} text-center font-medium`}>{student.lessons_attended}</TableCell>
                          <TableCell className={`${cellCls} text-center`}>
                            <Checkbox
                              checked={ready}
                              disabled={toggleReadyMutation.isPending}
                              onCheckedChange={(checked) => toggleReadyMutation.mutate({ student, next: !!checked })}
                              aria-label="Ready for grading"
                            />
                          </TableCell>
                          <TableCell className={cellCls}>
                            <Badge variant={getTermPaidBadgeVariant(student.term_paid)} className="text-[10px] px-1 py-0">
                              {getTermPaidLabel(student.term_paid)}
                            </Badge>
                          </TableCell>
                          <TableCell className={cellCls}>
                            <Badge
                              variant={student.grading_paid === 'paid' ? 'success' : student.grading_paid === 'unpaid' ? 'destructive' : 'secondary'}
                              className="text-[10px] px-1 py-0"
                            >
                              {student.grading_paid === 'paid' ? 'Paid' : student.grading_paid === 'unpaid' ? 'Unpaid' : 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell
                            className={`${cellCls} truncate max-w-[220px] whitespace-nowrap cursor-pointer hover:bg-accent/50 transition-colors`}
                            onClick={() => { setBulkStudentIds([student.student_id]); setBulkOpen(true); }}
                            title="Click to change slot"
                          >
                            {renderSlotInline(student)}
                          </TableCell>
                          <TableCell
                            className={`${cellCls} cursor-pointer hover:bg-accent/50 transition-colors`}
                            onClick={() => { setBulkStudentIds([student.student_id]); setBulkOpen(true); }}
                            title={student.result_manual_override ? 'Click to change result (manually set)' : 'Click to change result (auto-calculated)'}
                          >
                            {result ? (
                              <span className="inline-flex items-center gap-1">
                                <Badge variant={result === 'pass' || result === 'double' ? 'success' : result === 'fail' ? 'destructive' : 'secondary'} className="text-[10px] px-1 py-0">
                                  {RESULT_LABELS[result] || result}
                                </Badge>
                                {!student.result_manual_override && (
                                  <span className="text-[9px] text-muted-foreground">auto</span>
                                )}
                              </span>
                            ) : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          {showScorecard && scorecardColumns.map(col => (
                            <TableCell key={col.id} className={`${cellCls} px-1 text-center text-xs tabular-nums`}>
                              <InlineScorecardCell
                                registrationId={student.registration_id}
                                label={col.label}
                                scorecard={student.scorecard}
                                invalidateKey={rowsKey}
                              />
                            </TableCell>
                          ))}
                          {showBmi && (
                            <TableCell className={`${cellCls} text-center`}>
                              <InlineBmiCell scorecard={student.scorecard} />
                            </TableCell>
                          )}
                          {showScorecard && <TableCell className={cellCls}></TableCell>}
                          <TableCell className={`${cellCls} ${stickyRightCell('right-0')} ${isSelected ? 'bg-accent/30' : ''}`}>
                            <div className="flex gap-0.5 justify-center">
                              {canViewCertificate && (
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={certDisabled} title={certDisabled ? certTitle : 'View Certificate'} onClick={() => handleViewCertificate(student, 1)}>
                                  <FileText className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              {canViewCertificateII && (
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-primary" disabled={certDisabled} title={certDisabled ? certTitle : 'View Certificate II'} onClick={() => handleViewCertificate(student, 2)}>
                                  <FileText className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              {beltConfirmEligible && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={`h-6 w-6 p-0 ${beltAlreadyConfirmed ? 'text-muted-foreground' : 'text-green-600 hover:text-green-700'}`}
                                  disabled={beltAlreadyConfirmed || confirmBeltMutation.isPending}
                                  title={beltAlreadyConfirmed ? 'Belt and certificate already confirmed' : 'Confirm receipt of belt & certificate'}
                                  onClick={() => setConfirmBeltTarget(student)}
                                >
                                  {confirmBeltMutation.isPending && confirmBeltMutation.variables?.student_id === student.student_id
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <Award className="w-3.5 h-3.5" />}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden space-y-1.5">
                {displayedStudents.map((student) => {
                  const ready = displayReady(student);
                  const isSelected = selectedIds.has(student.student_id);
                  const result = student.result;
                  const isDoubleResult = result === 'double';
                  const beltConfirmEligible = (result === 'pass' || result === 'double')
                    && isFoundationToBlackTip(student.current_belt)
                    && !!student.current_belt
                    && !!student.registration_id;
                  const beltAlreadyConfirmed = isDoubleResult
                    ? (student.certificate_issued && student.certificate_ii_issued)
                    : student.certificate_issued;
                  return (
                    <div
                      key={student.student_id}
                      className={`rounded-lg px-2 py-1.5 ${isSelected ? 'bg-accent/30' : 'bg-muted/50'}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleOne(student.student_id)}
                            className="h-3.5 w-3.5"
                            aria-label={`Select ${student.student_name}`}
                          />
                          <span
                            className="font-bold text-xs truncate cursor-pointer"
                            onClick={() => onStudentClick ? onStudentClick(student.student_id) : navigate(`/parties/student/${student.student_id}`)}
                          >
                            {student.student_name}
                          </span>
                          {student.current_belt && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">
                              {formatBeltLevel(student.current_belt)}
                            </Badge>
                          )}
                          {student.student_status && student.student_status !== 'active' && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0 capitalize border-amber-400 text-amber-700">
                              {student.student_status}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Checkbox
                            checked={ready}
                            disabled={toggleReadyMutation.isPending}
                            onCheckedChange={(checked) => toggleReadyMutation.mutate({ student, next: !!checked })}
                            className="h-3.5 w-3.5"
                            aria-label="Ready"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => setDetailStudent({ id: student.student_id, name: student.student_name })}
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          {beltConfirmEligible && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-6 w-6 p-0 ${beltAlreadyConfirmed ? 'text-muted-foreground' : 'text-green-600 hover:text-green-700'}`}
                              disabled={beltAlreadyConfirmed || confirmBeltMutation.isPending}
                              title={beltAlreadyConfirmed ? 'Belt and certificate already confirmed' : 'Confirm receipt of belt & certificate'}
                              onClick={() => setConfirmBeltTarget(student)}
                            >
                              <Award className="w-3 h-3" />
                            </Button>
                          )}
                          {student.registration_id && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  <Trash2 className="w-3 h-3 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Request Deletion</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will submit a deletion request for {student.student_name}'s grading registration.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMutation.mutate({ registrationId: student.registration_id!, studentId: student.student_id, studentName: student.student_name })}
                                  >
                                    Submit
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                        <span className="text-muted-foreground">{student.lessons_attended} lessons</span>
                        <Badge variant={getTermPaidBadgeVariant(student.term_paid)} className="text-[10px] px-1.5 py-0">
                          {getTermPaidLabel(student.term_paid)}
                        </Badge>
                        <Badge
                          variant={student.grading_paid === 'paid' ? 'success' : student.grading_paid === 'unpaid' ? 'destructive' : 'secondary'}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {student.grading_paid === 'paid' ? 'Paid' : student.grading_paid === 'unpaid' ? 'Unpaid' : 'N/A'}
                        </Badge>
                      </div>

                      <div
                        className="flex items-center gap-2 mt-0.5 text-[11px] cursor-pointer rounded hover:bg-accent/50 transition-colors -mx-1 px-1 py-0.5"
                        onClick={() => { setBulkStudentIds([student.student_id]); setBulkOpen(true); }}
                        title="Tap to change slot/result"
                      >
                        <span className="text-muted-foreground truncate">
                          {student.grading_slot_title || student.grading_slot_date
                            ? `${student.grading_slot_title || 'Slot'}${student.grading_slot_date ? ` · ${formatDate(new Date(student.grading_slot_date))}` : ''}`
                            : 'No slot'}
                        </span>
                        {result ? (
                          <span className="inline-flex items-center gap-1 shrink-0">
                            <Badge variant={result === 'pass' || result === 'double' ? 'success' : result === 'fail' ? 'destructive' : 'secondary'} className="text-[10px] px-1.5 py-0">
                              {RESULT_LABELS[result] || result}
                            </Badge>
                            {!student.result_manual_override && (
                              <span className="text-[9px] text-muted-foreground">auto</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground shrink-0">No result</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <GradingBulkEditDialog
        open={bulkOpen}
        onOpenChange={(o) => {
          setBulkOpen(o);
          if (!o) {
            setBulkStudentIds(null);
            // Clear multi-select after a successful multi-row apply
            if (bulkStudentIds === null) setSelectedIds(new Set());
          }
        }}
        students={bulkTargetStudents}
        availableSlots={availableSlots}
        selectedTermId={selectedTerm}
        termStarted={termStarted}
        invalidateKeys={[['grading-list-students', branchId, selectedTerm]]}
      />

      {selectedTermData && (
        <GradingStudentDetailDialog
          open={!!detailStudent}
          onOpenChange={(open) => { if (!open) setDetailStudent(null); }}
          studentId={detailStudent?.id || null}
          studentName={detailStudent?.name || ''}
          branchId={branchId}
          termId={selectedTerm}
          termStartDate={selectedTermData.start_date}
          termEndDate={selectedTermData.end_date}
        />
      )}

      {/* Payment-reminder confirmation before downloading the certificate. */}
      <AlertDialog open={!!pendingCert} onOpenChange={(o) => { if (!o) setPendingCert(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Grading fee not yet paid</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCert?.student.student_name}'s grading invoice is currently{' '}
              <span className="font-semibold uppercase">
                {pendingCert?.student.grading_paid === 'unpaid'
                  ? (pendingCert?.student.invoice_status || 'unpaid')
                  : (pendingCert?.student.grading_paid || 'n/a')}
              </span>
              . Please remind the parent to settle the grading fee.
              <br /><br />
              Do you still want to download the certificate now?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingCert) runCertificate(pendingCert.student, pendingCert.certificateNumber);
                setPendingCert(null);
              }}
            >
              Download Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk certificate print: payment-reminder confirmation. */}
      <AlertDialog open={!!pendingBulkPrint} onOpenChange={(o) => { if (!o) setPendingBulkPrint(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Some grading fees not yet paid</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <div>The following students have unpaid grading fees:</div>
                <ul className="list-disc pl-5 max-h-40 overflow-y-auto text-sm">
                  {pendingBulkPrint?.unpaidNames.map(n => <li key={n}>{n}</li>)}
                </ul>
                <div>Do you still want to print all eligible certificates now?</div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingBulkPrint) runBulkDownload(pendingBulkPrint.inputs);
                setPendingBulkPrint(null);
              }}
            >
              Print Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm receipt of belt & certificate. */}
      <AlertDialog open={!!confirmBeltTarget} onOpenChange={(o) => { if (!o) setConfirmBeltTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm belt &amp; certificate received</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmBeltTarget && (() => {
                const isDouble = confirmBeltTarget.result === 'double';
                const cur = confirmBeltTarget.current_belt || '';
                const next = isDouble
                  ? getDoubleBeltLevel(cur, 'Australia')
                  : getNextBeltLevel(cur, 'Australia');
                return (
                  <>
                    Confirm that <span className="font-semibold">{confirmBeltTarget.student_name}</span> has received their belt and certificate{isDouble ? 's' : ''}.
                    <br /><br />
                    Their current belt will be updated from{' '}
                    <span className="font-semibold">{formatBeltLevel(cur)}</span> to{' '}
                    <span className="font-semibold">{next ? formatBeltLevel(next) : '—'}</span>
                    {isDouble && ' (double promotion — skips one belt)'}.
                    <br /><br />
                    This cannot be undone from this screen.
                  </>
                );
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmBeltTarget) confirmBeltMutation.mutate(confirmBeltTarget);
                setConfirmBeltTarget(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default BranchGradingList;
