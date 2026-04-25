/**
 * Grading List Tab Component (Sales / Superadmin)
 *
 * UX matches BranchGradingList:
 *  - Sorted by grading slot date asc; unassigned slots float to the top.
 *  - Compact 1-line desktop rows.
 *  - Ready checkbox is always interactive and autosaves immediately.
 *  - Multi-select + Bulk Edit dialog replaces the old "Mass Edit" mode.
 *  - The pencil icon on each row opens the Bulk Edit dialog with that single
 *    student preselected.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { type Term } from '@/services/termCalendarService';
import { formatBeltLevel, isFoundationToBlackTip, getNextBeltLevel } from '@/constants/beltLevels';
import { createGradingDeletionRequest } from '@/services/gradingDeletionRequestService';
import { FileText, Loader2, User, Trash2, Eye, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import GradingStudentDetailDialog from './GradingStudentDetailDialog';
import GradingBulkEditDialog, { type BulkEditStudent } from '@/components/grading/GradingBulkEditDialog';
import { InlineScorecardCell, InlineBmiCell } from '@/components/grading/InlineScorecardCell';
import { ScorecardColumnHeader, AddScorecardColumnHeader } from '@/components/grading/ScorecardColumnHeader';
import { listColumns } from '@/services/gradingScorecardColumnService';
import { downloadGradingCertificatePDF } from '@/utils/gradingCertificatePDFGenerator';
import type { ScorecardRow } from '@/constants/scorecardLabels';
import { format } from 'date-fns';
import { formatDate } from '@/utils/dateFormat';

/** Phase 1 — only Morley (AU) gets the AU certificate template. */
const MORLEY_BRANCH_ID = 'BR1768967806476';

interface GradingListStudent {
  student_id: string;
  student_name: string;
  current_belt: string | null;
  target_belt: string | null;
  invoice_status: string;
  invoice_id: string;
  ready_for_grading: boolean;
  result: 'pass' | 'fail' | 'double' | 'confirmed' | null;
  certificate_issued: boolean;
  certificate_ii_issued: boolean;
  registration_id: string | null;
  lessons_attended: number;
  grading_paid: 'paid' | 'unpaid' | 'n/a';
  grading_slot_title: string | null;
  grading_slot_date: string | null;
  grading_slot_id: string | null;
  scorecard: ScorecardRow[];
}

interface Branch { id: string; name: string }

const RESULT_LABELS: Record<string, string> = {
  double: 'Double',
  pass: 'Pass',
  fail: 'Fail',
  confirmed: 'Confirmed',
};

const GradingListTab: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [detailStudent, setDetailStudent] = useState<{ id: string; name: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkStudentIds, setBulkStudentIds] = useState<string[] | null>(null);
  const isMorley = selectedBranch === MORLEY_BRANCH_ID;

  const { data: availableSlots = [] } = useQuery({
    queryKey: ['grading-slots-available', selectedBranch],
    queryFn: async () => {
      if (!selectedBranch) return [];
      const { data, error } = await supabase
        .from('grading_slots')
        .select('id, title, grading_date')
        .eq('branch_id', selectedBranch)
        .order('grading_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedBranch
  });

  // Scorecard columns for current term + branch (Morley/AU only in Phase 1)
  const { data: scorecardColumns = [] } = useQuery({
    queryKey: ['grading-scorecard-columns', selectedTerm, selectedBranch],
    queryFn: () => listColumns(selectedTerm, selectedBranch),
    enabled: !!selectedBranch && !!selectedTerm && isMorley,
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches-grading-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return (data || []).filter(b => !['Competition', 'Headquarters'].includes(b.name));
    }
  });

  const { data: terms = [] } = useQuery<Term[]>({
    queryKey: ['terms-grading-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('term_calendars')
        .select('*')
        .eq('is_active', true)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return (data || []).map(t => ({ ...t, branch_name: '', breaks: [] })) as Term[];
    }
  });

  const { data: invoicedTermIds = [] } = useQuery<string[]>({
    queryKey: ['grading-list-invoiced-terms', selectedBranch],
    queryFn: async () => {
      if (!selectedBranch) return [];
      const termIds = new Set<string>();

      const { data: lessonProducts } = await supabase
        .from('products').select('id').eq('is_lesson', true);
      const lessonProductIds = (lessonProducts || []).map(p => p.id);

      if (lessonProductIds.length > 0) {
        const { data: items } = await supabase
          .from('invoice_items')
          .select(`metadata, invoices!inner(branch_id, status)`)
          .in('product_id', lessonProductIds)
          .eq('invoices.branch_id', selectedBranch)
          .in('invoices.status', ['draft', 'sent', 'unpaid', 'partial', 'partially_paid', 'overdue', 'paid', 'verified']);

        (items || []).forEach((it: any) => {
          const md = it.metadata as Record<string, any> | null;
          const tid = md?.term_id || md?.term_ids?.[0];
          if (tid) termIds.add(tid);
        });
      }

      const { data: branchInvoices } = await supabase
        .from('invoices').select('student_id').eq('branch_id', selectedBranch);
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
    enabled: !!selectedBranch
  });

  const branchTerms = useMemo(() => {
    if (!selectedBranch) return [];
    const today = new Date().toISOString().split('T')[0];
    const invoicedSet = new Set(invoicedTermIds);
    const filtered = terms
      .filter(t => t.branch_id === selectedBranch)
      .filter(t => t.start_date <= today || invoicedSet.has(t.id));
    return [...filtered].sort((a, b) => b.start_date.localeCompare(a.start_date));
  }, [terms, selectedBranch, invoicedTermIds]);

  React.useEffect(() => {
    if (selectedBranch && branchTerms.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const currentTerm = branchTerms.find(t => t.start_date <= today && t.end_date >= today);
      if (currentTerm) {
        setSelectedTerm(currentTerm.id);
      } else {
        const invoicedSet = new Set(invoicedTermIds);
        const mostRecentWithInvoices = branchTerms.find(t => invoicedSet.has(t.id));
        setSelectedTerm(mostRecentWithInvoices?.id || branchTerms[0].id);
      }
    } else {
      setSelectedTerm('');
    }
    setSelectedIds(new Set());
  }, [selectedBranch, branchTerms, invoicedTermIds]);

  const selectedTermData = terms.find(t => t.id === selectedTerm);
  const todayStr = new Date().toISOString().split('T')[0];
  const termStarted = !!(selectedTermData?.start_date && selectedTermData.start_date <= todayStr);

  const { data: students = [], isLoading } = useQuery<GradingListStudent[]>({
    queryKey: ['grading-list-students', selectedBranch, selectedTerm],
    queryFn: async () => {
      if (!selectedBranch || !selectedTerm) return [];

      const { data: regs, error: regErr } = await supabase
        .from('grading_registrations')
        .select('id, student_id, current_belt, target_belt, ready_for_grading, result, certificate_issued, certificate_ii_issued, invoice_item_id, grading_slot_id, term_id, scorecard')
        .eq('term_id', selectedTerm);
      if (regErr) throw regErr;
      const registrations = regs || [];

      const { data: lessonProducts } = await supabase.from('products').select('id').eq('is_lesson', true);
      const lessonProductIds = (lessonProducts || []).map(p => p.id);

      let lessonInvoicedItems: any[] = [];
      if (lessonProductIds.length > 0) {
        const { data: items } = await supabase
          .from('invoice_items')
          .select(`metadata, invoices!inner(id, status, student_id, branch_id)`)
          .in('product_id', lessonProductIds)
          .eq('invoices.branch_id', selectedBranch)
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
        .select('id, first_name, last_name, current_belt, status')
        .in('id', candidateStudentIds)
        .ilike('status', 'active');
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
        .eq('branch_id', selectedBranch);
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
          .eq('branch_id', selectedBranch)
          .eq('status', 'present')
          .gte('class_date', selectedTermData.start_date)
          .lte('class_date', selectedTermData.end_date) : Promise.resolve({ data: [] }),
        slotIds.length > 0 ? supabase
          .from('grading_slots').select('id, title, grading_date').in('id', slotIds) : Promise.resolve({ data: [] }),
        invoiceItemIds.length > 0 ? supabase
          .from('invoice_items').select('id, invoice_id, invoices!inner(id, status, branch_id)').in('id', invoiceItemIds) : Promise.resolve({ data: [] }),
      ]);

      const attendanceCountMap: Record<string, number> = {};
      (attendanceResult.data || []).forEach((a: any) => {
        attendanceCountMap[a.student_id] = (attendanceCountMap[a.student_id] || 0) + 1;
      });

      const slotMap: Record<string, any> = {};
      (slotsResult.data || []).forEach((s: any) => { slotMap[s.id] = s; });

      const itemToInvoice: Record<string, { status: string; invoice_id: string }> = {};
      (gradingItemsResult.data || []).forEach((ii: any) => {
        const inv = ii.invoices as any;
        itemToInvoice[ii.id] = { status: inv?.status || 'draft', invoice_id: inv?.id || ii.invoice_id };
      });

      const regsMissingItem = branchScopedRegs.filter(r => !r.invoice_item_id && r.grading_slot_id);
      const fallbackByStudent: Record<string, { status: string; invoice_id: string }> = {};
      if (regsMissingItem.length > 0) {
        const fallbackSlotIds = [...new Set(regsMissingItem.map(r => r.grading_slot_id!))];
        const fallbackStudentIds = [...new Set(regsMissingItem.map(r => r.student_id))];
        const { data: fbItems } = await supabase
          .from('invoice_items')
          .select('id, metadata, invoices!inner(id, status, branch_id, student_id)')
          .in('invoices.student_id', fallbackStudentIds)
          .eq('invoices.branch_id', selectedBranch);
        (fbItems || []).forEach((it: any) => {
          const md = it.metadata as Record<string, any> | null;
          const sid = md?.grading_slot_id;
          if (!sid || !fallbackSlotIds.includes(sid)) return;
          const studentId = (it.invoices as any)?.student_id;
          if (!studentId) return;
          const status = (it.invoices as any)?.status || 'draft';
          const existing = fallbackByStudent[studentId];
          if (!existing || (['paid', 'verified'].includes(status) && !['paid', 'verified'].includes(existing.status))) {
            fallbackByStudent[studentId] = { status, invoice_id: (it.invoices as any).id };
          }
        });
      }

      const studentResultMap = new Map<string, GradingListStudent>();

      for (const reg of branchScopedRegs) {
        if (studentResultMap.has(reg.student_id)) continue;
        const student = studentMap[reg.student_id];
        if (!student) continue;

        const slot = reg.grading_slot_id ? slotMap[reg.grading_slot_id] : null;

        let gradingPaid: 'paid' | 'unpaid' | 'n/a' = 'n/a';
        let gradingInvoiceId: string | null = null;
        if (reg.invoice_item_id && itemToInvoice[reg.invoice_item_id]) {
          const info = itemToInvoice[reg.invoice_item_id];
          gradingPaid = ['paid', 'verified'].includes(info.status) ? 'paid' : 'unpaid';
          gradingInvoiceId = info.invoice_id;
        } else if (fallbackByStudent[reg.student_id]) {
          const info = fallbackByStudent[reg.student_id];
          gradingPaid = ['paid', 'verified'].includes(info.status) ? 'paid' : 'unpaid';
          gradingInvoiceId = info.invoice_id;
        }

        const fallbackInvoice = studentToBranchInvoices[reg.student_id]?.[0];
        const invoiceId = gradingInvoiceId || fallbackInvoice?.id || '';
        const invoiceStatus = gradingInvoiceId
          ? (itemToInvoice[reg.invoice_item_id || '']?.status || fallbackByStudent[reg.student_id]?.status || '')
          : (fallbackInvoice?.status || '');

        studentResultMap.set(reg.student_id, {
          student_id: reg.student_id,
          student_name: `${student.first_name} ${student.last_name}`,
          current_belt: reg.current_belt || student.current_belt,
          target_belt: reg.target_belt || null,
          invoice_status: invoiceStatus,
          invoice_id: invoiceId,
          ready_for_grading: reg.ready_for_grading || false,
          result: (reg.result as GradingListStudent['result']) || null,
          certificate_issued: reg.certificate_issued || false,
          certificate_ii_issued: reg.certificate_ii_issued || false,
          registration_id: reg.id,
          lessons_attended: attendanceCountMap[reg.student_id] || 0,
          grading_paid: gradingPaid,
          grading_slot_title: slot?.title || null,
          grading_slot_date: slot?.grading_date || null,
          grading_slot_id: reg.grading_slot_id || null,
          scorecard: Array.isArray((reg as any).scorecard)
            ? ((reg as any).scorecard as any[]).map((r: any) => ({ label: String(r?.label ?? ''), value: String(r?.value ?? '') }))
            : [],
        });
      }

      for (const studentId of branchScopedStudentIds) {
        if (studentResultMap.has(studentId)) continue;
        const student = studentMap[studentId];
        if (!student) continue;
        const termLessonInv = studentToTermLessonInvoice[studentId];
        if (!termLessonInv) continue;

        studentResultMap.set(studentId, {
          student_id: studentId,
          student_name: `${student.first_name} ${student.last_name}`,
          current_belt: student.current_belt,
          target_belt: null,
          invoice_status: termLessonInv.status,
          invoice_id: termLessonInv.id,
          ready_for_grading: false,
          result: null,
          certificate_issued: false,
          certificate_ii_issued: false,
          registration_id: null,
          lessons_attended: attendanceCountMap[studentId] || 0,
          grading_paid: 'n/a',
          grading_slot_title: null,
          grading_slot_date: null,
          grading_slot_id: null,
          scorecard: [],
        });
      }

      const result = Array.from(studentResultMap.values());
      // Sort: unassigned first, then by slot date asc, slot title, name
      result.sort((a, b) => {
        const aHas = !!a.grading_slot_date;
        const bHas = !!b.grading_slot_date;
        if (aHas !== bHas) return aHas ? 1 : -1;
        if (!aHas && !bHas) return a.student_name.localeCompare(b.student_name);
        const dateCmp = (a.grading_slot_date || '').localeCompare(b.grading_slot_date || '');
        if (dateCmp !== 0) return dateCmp;
        const titleCmp = (a.grading_slot_title || '').localeCompare(b.grading_slot_title || '');
        if (titleCmp !== 0) return titleCmp;
        return a.student_name.localeCompare(b.student_name);
      });
      return result;
    },
    enabled: !!selectedBranch && !!selectedTerm
  });

  const displayReady = useCallback((student: GradingListStudent) => {
    if (student.ready_for_grading) return true;
    if (termStarted && !student.result) return true;
    return false;
  }, [termStarted]);

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
      const key = ['grading-list-students', selectedBranch, selectedTerm];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<GradingListStudent[]>(key);
      queryClient.setQueryData<GradingListStudent[]>(key, (old) =>
        (old || []).map(s => s.student_id === student.student_id ? { ...s, ready_for_grading: next } : s)
      );
      return { previous };
    },
    onError: (err: Error, _vars, ctx) => {
      const key = ['grading-list-students', selectedBranch, selectedTerm];
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
      toast.error(err.message || 'Failed to update Ready');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['grading-list-students', selectedBranch, selectedTerm] });
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
   * Open the scorecard editor + AU certificate generator for a student.
   * Phase 1: only the Morley (AU) branch generates a real PDF; other branches
   * show a disabled button with a "template pending" tooltip.
   */
  // Pending certificate request awaiting payment-reminder confirmation.
  const [pendingCert, setPendingCert] = useState<{ student: GradingListStudent; certificateNumber: 1 | 2 } | null>(null);

  /** Actually generate and download the certificate PDF. */
  const runCertificate = (student: GradingListStudent, certificateNumber: 1 | 2) => {
    const baseBelt = student.target_belt || getNextBeltLevel(student.current_belt || '', 'AU');
    const beltAchieved = certificateNumber === 2
      ? getNextBeltLevel(baseBelt, 'AU')
      : baseBelt;
    if (!beltAchieved) {
      toast.error('Could not determine target belt');
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

  const allVisibleSelected = students.length > 0 && students.every(s => selectedIds.has(s.student_id));
  const someVisibleSelected = students.some(s => selectedIds.has(s.student_id));
  const toggleAll = () => {
    setSelectedIds(prev => {
      if (allVisibleSelected) return new Set();
      const next = new Set(prev);
      students.forEach(s => next.add(s.student_id));
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

  const bulkTargetStudents: BulkEditStudent[] = useMemo(() => {
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

  const stickyLeftHead = 'sticky left-0 z-20 bg-card';
  const stickyLeftCell = 'sticky left-0 z-10 bg-background';
  const stickyRightHead = (offset: string) => `sticky z-20 bg-card ${offset}`;
  const stickyRightCell = (offset: string) => `sticky z-10 bg-background ${offset}`;
  const showScorecard = isMorley && !!selectedTerm;
  const hasHeight = scorecardColumns.some(c => /height/i.test(c.label));
  const hasWeight = scorecardColumns.some(c => /weight/i.test(c.label));
  const showBmi = hasHeight && hasWeight;
  const rowsKey = ['grading-list-students', selectedBranch, selectedTerm];

  const cellCls = 'py-1 px-2 text-xs align-middle';
  const headCls = 'h-8 px-2 text-xs';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="w-48">
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger>
                <SelectContent>
                  {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-64">
              <Select value={selectedTerm} onValueChange={(v) => { setSelectedTerm(v); setSelectedIds(new Set()); }} disabled={!selectedBranch}>
                <SelectTrigger><SelectValue placeholder="Select Term" /></SelectTrigger>
                <SelectContent>
                  {branchTerms.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle>Students for Grading</CardTitle>
              <CardDescription>
                {selectedTermData
                  ? `${students.length} grading registration${students.length !== 1 ? 's' : ''} for ${selectedTermData.name}`
                  : 'Select a branch and term to view students'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {selectedIds.size > 0 && (
                <Button size="sm" onClick={() => { setBulkStudentIds(null); setBulkOpen(true); }}>
                  <Pencil className="w-4 h-4 mr-1" />
                  Bulk Edit ({selectedIds.size})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedBranch || !selectedTerm ? (
            <div className="text-center py-8 text-muted-foreground">Please select a branch and term to view students.</div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No grading registrations for this term yet.</div>
          ) : (
            <div className="overflow-x-auto">
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
                    <TableHead className={`${headCls} w-[80px]`}>Grading</TableHead>
                    <TableHead className={`${headCls} min-w-[160px]`}>Slot</TableHead>
                    <TableHead className={`${headCls} w-[90px]`}>Result</TableHead>
                    {showScorecard && scorecardColumns.map(col => (
                      <TableHead key={col.id} className={`${headCls} w-[88px]`}>
                        <ScorecardColumnHeader termId={selectedTerm} branchId={selectedBranch} label={col.label} rowsInvalidateKey={rowsKey} />
                      </TableHead>
                    ))}
                    {showBmi && (<TableHead className={`${headCls} w-[60px] text-center`}>BMI</TableHead>)}
                    {showScorecard && (
                      <TableHead className={`${headCls} w-[80px]`}>
                        <AddScorecardColumnHeader termId={selectedTerm} branchId={selectedBranch} rowsInvalidateKey={rowsKey} />
                      </TableHead>
                    )}
                    <TableHead className={`${headCls} w-[44px] text-center ${stickyRightHead('right-[154px]')}`}>Cert</TableHead>
                    <TableHead className={`${headCls} w-[44px] text-center ${stickyRightHead('right-[110px]')}`}>Cert II</TableHead>
                    <TableHead className={`${headCls} w-[110px] ${stickyRightHead('right-0')}`}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => {
                    const result = student.result;
                    const ready = displayReady(student);
                    const isSelected = selectedIds.has(student.student_id);
                    const beltInRange = isFoundationToBlackTip(student.target_belt || student.current_belt);
                    const canViewCertificate = (result === 'pass' || result === 'double') && beltInRange;
                    const canViewCertificateII = result === 'double' && beltInRange;
                    const certDisabled = !isMorley;
                    const certTitle = certDisabled ? 'Template pending for this branch' : 'Generate certificate';

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
                          <Button
                            variant="link"
                            className="p-0 h-auto font-medium text-xs max-w-[180px] truncate inline-flex items-center"
                            onClick={() => navigate(`/parties/student/${student.student_id}`)}
                          >
                            <User className="w-3 h-3 mr-1 shrink-0" />
                            <span className="truncate">{student.student_name}</span>
                          </Button>
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
                          <Badge
                            variant={student.grading_paid === 'paid' ? 'success' : student.grading_paid === 'unpaid' ? 'destructive' : 'secondary'}
                            className="text-[10px] px-1 py-0"
                          >
                            {student.grading_paid === 'paid' ? 'Paid' : student.grading_paid === 'unpaid' ? 'Unpaid' : 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell className={`${cellCls} truncate max-w-[220px] whitespace-nowrap`}>
                          {(student.grading_slot_title || student.grading_slot_date) ? (
                            <span>
                              {student.grading_slot_title || 'Slot'}{student.grading_slot_date ? ` · ${formatDate(new Date(student.grading_slot_date))}` : ''}
                            </span>
                          ) : <span className="text-muted-foreground">Not Assigned</span>}
                        </TableCell>
                        <TableCell className={cellCls}>
                          {result ? (
                            <Badge variant={result === 'pass' || result === 'double' ? 'success' : result === 'fail' ? 'destructive' : 'secondary'} className="text-[10px] px-1 py-0">
                              {RESULT_LABELS[result] || result}
                            </Badge>
                          ) : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        {showScorecard && scorecardColumns.map(col => (
                          <TableCell key={col.id} className={cellCls}>
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
                        {showScorecard && (<TableCell className={cellCls} />)}
                        <TableCell className={`${cellCls} text-center ${stickyRightCell('right-[154px]')} ${isSelected ? 'bg-accent/30' : ''}`}>
                          {canViewCertificate ? (
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={certDisabled} title={certTitle} onClick={() => handleViewCertificate(student, 1)}>
                              <FileText className="w-3.5 h-3.5" />
                            </Button>
                          ) : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className={`${cellCls} text-center ${stickyRightCell('right-[110px]')} ${isSelected ? 'bg-accent/30' : ''}`}>
                          {canViewCertificateII ? (
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={certDisabled} title={certTitle} onClick={() => handleViewCertificate(student, 2)}>
                              <FileText className="w-3.5 h-3.5" />
                            </Button>
                          ) : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className={`${cellCls} ${stickyRightCell('right-0')} ${isSelected ? 'bg-accent/30' : ''}`}>
                          <div className="flex gap-0.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => { setBulkStudentIds([student.student_id]); setBulkOpen(true); }}
                              title="Edit slot/result"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => setDetailStudent({ id: student.student_id, name: student.student_name })}
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            {student.registration_id && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Delete Registration">
                                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Request Deletion</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will submit a deletion request for {student.student_name}'s grading registration. A superadmin must approve it before it takes effect.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteMutation.mutate({ registrationId: student.registration_id!, studentId: student.student_id, studentName: student.student_name })}
                                    >
                                      Submit Request
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <GradingBulkEditDialog
        open={bulkOpen}
        onOpenChange={(o) => {
          setBulkOpen(o);
          if (!o) {
            const wasSingleRow = bulkStudentIds !== null;
            setBulkStudentIds(null);
            if (!wasSingleRow) setSelectedIds(new Set());
          }
        }}
        students={bulkTargetStudents}
        availableSlots={availableSlots}
        selectedTermId={selectedTerm}
        termStarted={termStarted}
        invalidateKeys={[['grading-list-students', selectedBranch, selectedTerm]]}
      />

      {selectedTermData && (
        <GradingStudentDetailDialog
          open={!!detailStudent}
          onOpenChange={(open) => { if (!open) setDetailStudent(null); }}
          studentId={detailStudent?.id || null}
          studentName={detailStudent?.name || ''}
          branchId={selectedBranch}
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

    </div>
  );
};

export default GradingListTab;
