/**
 * Branch Grading List Component
 * Shows active students with invoices for a term, enriched grading data
 * Pre-filtered by branch ID from props
 * Mass-editable: changes are tracked locally and saved in batch
 */

import React, { useState, useMemo, useCallback } from 'react';
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
import { formatBeltLevel } from '@/constants/beltLevels';
import { createGradingDeletionRequest } from '@/services/gradingDeletionRequestService';
import { FileText, Loader2, User, Trash2, Eye, Save, Undo2, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import GradingStudentDetailDialog from '@/components/sales/GradingStudentDetailDialog';
import { formatDate } from '@/utils/dateFormat';

interface GradingListStudent {
  student_id: string;
  student_name: string;
  current_belt: string | null;
  invoice_status: string;
  invoice_id: string;
  ready_for_grading: boolean;
  result: 'pass' | 'fail' | 'double' | 'confirmed' | null;
  certificate_issued: boolean;
  certificate_ii_issued: boolean;
  registration_id: string | null;
  lessons_attended: number;
  grading_paid: 'paid' | 'unpaid' | 'n/a';
  term_paid: string;
  grading_slot_title: string | null;
  grading_slot_date: string | null;
  grading_slot_id: string | null;
}

interface BranchGradingListProps {
  branchId: string;
  onStudentClick?: (studentId: string) => void;
}

interface PendingChange {
  ready_for_grading?: boolean;
  result?: string | null;
  grading_slot_id?: string | null;
}

const RESULT_OPTIONS = [
  { value: 'double', label: 'Double' },
  { value: 'pass', label: 'Pass' },
  { value: 'fail', label: 'Fail' },
  { value: 'confirmed', label: 'Confirmed' },
];

const getTermPaidBadgeVariant = (status: string): "success" | "destructive" | "secondary" | "default" => {
  switch (status) {
    case 'paid': return 'success';
    case 'overdue':
    case 'unpaid': return 'destructive';
    case 'draft':
    case 'sent':
    case 'partial':
    case 'partially_paid':
    default: return 'secondary';
  }
};

const getTermPaidLabel = (status: string): string => {
  switch (status) {
    case 'paid': return 'Paid';
    case 'unpaid': return 'Unpaid';
    case 'overdue': return 'Overdue';
    case 'draft': return 'Draft';
    case 'sent': return 'Sent';
    case 'partial': return 'Partial';
    case 'partially_paid': return 'Partially Paid';
    default: return status;
  }
};

const BranchGradingList: React.FC<BranchGradingListProps> = ({ branchId, onStudentClick }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [detailStudent, setDetailStudent] = useState<{ id: string; name: string } | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Record<string, PendingChange>>({});
  const [isEditMode, setIsEditMode] = useState(false);

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  // Fetch available grading slots for the branch
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

  // Fetch all terms for this branch (including past)
  const { data: branchTerms = [] } = useQuery<Term[]>({
    queryKey: ['terms-grading-list', branchId],
    queryFn: () => getAllTermsForBranch(branchId),
    enabled: !!branchId
  });

  // Fetch term_ids that should appear in the term selector for this branch:
  //  • any term referenced by a lesson invoice item at this branch (next-term opt-ins)
  //  • any term referenced by a grading_registrations row for a student who has any invoice at this branch
  const { data: invoicedTermIds = [] } = useQuery<string[]>({
    queryKey: ['grading-list-invoiced-terms', branchId],
    queryFn: async () => {
      if (!branchId) return [];
      const termIds = new Set<string>();

      // 1) Lesson-invoice-driven term ids
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

      // 2) Registration-driven term ids (covers grading invoices whose lesson item belongs to a different term)
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

  // Show past + current + every future term that has at least one lesson invoice
  const availableTerms = React.useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const invoicedSet = new Set(invoicedTermIds);
    const filtered = branchTerms.filter(t => t.start_date <= today || invoicedSet.has(t.id));
    return [...filtered].sort((a, b) => b.start_date.localeCompare(a.start_date));
  }, [branchTerms, invoicedTermIds]);

  // Auto-select: prefer current term, else most recent term with invoices, else most recent past term
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
    setPendingChanges({});
  }, [branchId, availableTerms, invoicedTermIds]);

  const selectedTermData = availableTerms.find(t => t.id === selectedTerm) || branchTerms.find(t => t.id === selectedTerm);

  // Union-driven grading list: `grading_registrations` for the selected term ∪
  // every student with a lesson invoice item for that term at this branch.
  // Lesson-invoice-only students appear with no registration_id; editing
  // (toggle Ready / assign slot / set result) creates a registration on save.
  const { data: students = [], isLoading } = useQuery<GradingListStudent[]>({
    queryKey: ['grading-list-students', branchId, selectedTerm],
    queryFn: async () => {
      if (!branchId || !selectedTerm) return [];

      // 1) Registrations for this term (Source A)
      const { data: regs, error: regErr } = await supabase
        .from('grading_registrations')
        .select('id, student_id, current_belt, target_belt, ready_for_grading, result, certificate_issued, certificate_ii_issued, invoice_item_id, grading_slot_id, term_id')
        .eq('term_id', selectedTerm);
      if (regErr) throw regErr;
      const registrations = regs || [];

      // 2) Lesson-invoiced students for this term + branch (Source B)
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

      // Union of candidate student ids
      const regStudentIds = registrations.map(r => r.student_id);
      const candidateStudentIds = [...new Set([...regStudentIds, ...lessonInvoicedStudentIds])];
      if (candidateStudentIds.length === 0) return [];

      // 3) Active students only
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

      // 4) Branch scoping: keep only students with at least one invoice at this branch
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

      // 5) Per-student lesson invoice for this term (drives `term_paid` + invoice_id)
      const studentToTermLessonInvoice: Record<string, { id: string; status: string }> = {};
      lessonInvoicedItems.forEach((it: any) => {
        const inv = it.invoices as any;
        if (!branchScopedStudentIds.includes(inv.student_id)) return;
        if (!studentToTermLessonInvoice[inv.student_id]) {
          studentToTermLessonInvoice[inv.student_id] = { id: inv.id, status: inv.status };
        }
      });

      // 6) Parallel enrichment: attendance counts, slot info, grading-paid lookup
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

      // 7) Build rows: registrations first (preserve manual data), then any
      // lesson-invoiced students who don't yet have a registration.
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
          current_belt: reg.current_belt || student.current_belt,
          invoice_status: repInv?.status || 'draft',
          invoice_id: repInv?.id || '',
          ready_for_grading: reg.ready_for_grading || false,
          result: (reg.result as any) || null,
          certificate_issued: reg.certificate_issued || false,
          certificate_ii_issued: reg.certificate_ii_issued || false,
          registration_id: reg.id || null,
          lessons_attended: attendanceCountMap[reg.student_id] || 0,
          grading_paid: gradingPaid,
          term_paid: repInv?.status || 'draft',
          grading_slot_title: slot?.title || null,
          grading_slot_date: slot?.grading_date || null,
          grading_slot_id: reg.grading_slot_id || null,
        });
      }

      // Lesson-invoice-only students (no registration row)
      for (const studentId of branchScopedStudentIds) {
        if (seen.has(studentId)) continue;
        const student = studentMap[studentId];
        if (!student) continue;
        const termLessonInv = studentToTermLessonInvoice[studentId];
        if (!termLessonInv) continue; // only show if they have a lesson invoice for this term
        seen.add(studentId);

        result.push({
          student_id: studentId,
          student_name: `${student.first_name} ${student.last_name}`,
          current_belt: student.current_belt,
          invoice_status: termLessonInv.status,
          invoice_id: termLessonInv.id,
          ready_for_grading: false,
          result: null,
          certificate_issued: false,
          certificate_ii_issued: false,
          registration_id: null,
          lessons_attended: attendanceCountMap[studentId] || 0,
          grading_paid: 'n/a',
          term_paid: termLessonInv.status,
          grading_slot_title: null,
          grading_slot_date: null,
          grading_slot_id: null,
        });
      }

      result.sort((a, b) => a.student_name.localeCompare(b.student_name));
      return result;
    },
    enabled: !!branchId && !!selectedTerm
  });

  // Get effective value for a field (pending change or original)
  const getEffectiveReady = useCallback((student: GradingListStudent) => {
    const change = pendingChanges[student.student_id];
    return change?.ready_for_grading !== undefined ? change.ready_for_grading : student.ready_for_grading;
  }, [pendingChanges]);

  const getEffectiveResult = useCallback((student: GradingListStudent) => {
    const change = pendingChanges[student.student_id];
    return change?.result !== undefined ? change.result : student.result;
  }, [pendingChanges]);

  const getEffectiveSlot = useCallback((student: GradingListStudent) => {
    const change = pendingChanges[student.student_id];
    return change?.grading_slot_id !== undefined ? change.grading_slot_id : student.grading_slot_id;
  }, [pendingChanges]);

  const hasStudentChange = useCallback((studentId: string) => {
    return !!pendingChanges[studentId];
  }, [pendingChanges]);

  // Track local changes
  const setLocalReady = (studentId: string, isReady: boolean, originalValue: boolean) => {
    setPendingChanges(prev => {
      const existing = prev[studentId] || {};
      const updated = { ...existing, ready_for_grading: isReady };
      if (isReady === originalValue && updated.result === undefined && updated.grading_slot_id === undefined) {
        const { [studentId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [studentId]: updated };
    });
  };

  const setLocalResult = (studentId: string, result: string | null, originalValue: string | null) => {
    setPendingChanges(prev => {
      const existing = prev[studentId] || {};
      const updated = { ...existing, result };
      if (result === originalValue && updated.ready_for_grading === undefined && updated.grading_slot_id === undefined) {
        const { [studentId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [studentId]: updated };
    });
  };

  const setLocalSlot = (studentId: string, slotId: string | null, originalValue: string | null) => {
    setPendingChanges(prev => {
      const existing = prev[studentId] || {};
      const updated = { ...existing, grading_slot_id: slotId };
      if (slotId === originalValue && updated.ready_for_grading === undefined && updated.result === undefined) {
        const { [studentId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [studentId]: updated };
    });
  };

  // Batch save mutation
  const batchSaveMutation = useMutation({
    mutationFn: async () => {
      const operations: Promise<any>[] = [];
      
      for (const [studentId, changes] of Object.entries(pendingChanges)) {
        const student = students.find(s => s.student_id === studentId);
        if (!student) continue;
        
        if (student.registration_id) {
          const updateData: Record<string, any> = {};
          if (changes.ready_for_grading !== undefined) updateData.ready_for_grading = changes.ready_for_grading;
          if (changes.result !== undefined) updateData.result = changes.result;
          if (changes.grading_slot_id !== undefined) updateData.grading_slot_id = changes.grading_slot_id;
          
          if (Object.keys(updateData).length > 0) {
            operations.push(
              supabase
                .from('grading_registrations')
                .update(updateData)
                .eq('id', student.registration_id)
                .then(({ error }) => { if (error) throw error; }) as Promise<any>
            );
          }
        } else {
          const { getNextBeltLevel } = await import('@/constants/beltLevels');
          const currentBelt = student.current_belt || 'White';
          const nextBelt = getNextBeltLevel(currentBelt) || currentBelt;
          const insertData = {
            student_id: studentId,
            current_belt: currentBelt,
            target_belt: nextBelt,
            grading_slot_id: changes.grading_slot_id || null,
            ready_for_grading: changes.ready_for_grading || false,
            result: changes.result || null,
            term_id: selectedTerm || null,
          } as const;
          operations.push(
            supabase
              .from('grading_registrations')
              .insert([insertData])
              .then(({ error }) => { if (error) throw error; }) as Promise<any>
          );
        }
      }
      
      await Promise.all(operations);
    },
    onSuccess: () => {
      setPendingChanges({});
      queryClient.invalidateQueries({ queryKey: ['grading-list-students'] });
      toast.success(`Saved changes for ${Object.keys(pendingChanges).length} student(s)`);
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to save changes'),
  });

  // Mutation to request deletion (requires superadmin approval)
  const deleteMutation = useMutation({
    mutationFn: async ({ registrationId, studentId, studentName }: { registrationId: string; studentId: string; studentName: string }) => {
      await createGradingDeletionRequest(registrationId, studentId, studentName);
    },
    onSuccess: () => {
      toast.success('Deletion request submitted for superadmin approval');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to submit deletion request'),
  });

  const handleViewCertificate = (studentId: string, certificateNumber: 1 | 2) => {
    toast.info(`Certificate ${certificateNumber === 2 ? 'II ' : ''}generation coming soon`);
  };

  const renderSlotDisplay = (student: GradingListStudent) => {
    const effectiveSlotId = getEffectiveSlot(student);
    const effectiveSlot = availableSlots.find(s => s.id === effectiveSlotId);
    if (effectiveSlot) {
      return `${effectiveSlot.title || 'Slot'} - ${effectiveSlot.grading_date ? formatDate(new Date(effectiveSlot.grading_date)) : ''}`;
    }
    if (student.grading_slot_title || student.grading_slot_date) {
      return `${student.grading_slot_title || 'Slot'} - ${student.grading_slot_date ? formatDate(new Date(student.grading_slot_date)) : ''}`;
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Students Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <CardTitle>Students for Grading</CardTitle>
              <div className="w-48">
                <Select value={selectedTerm} onValueChange={(v) => { setSelectedTerm(v); setPendingChanges({}); }}>
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
            </div>
            <div className="flex gap-2">
              <Button
                variant={isEditMode ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setIsEditMode(!isEditMode);
                  if (isEditMode) setPendingChanges({});
                }}
              >
                <Pencil className="w-4 h-4 mr-1" />
                {isEditMode ? 'Exit Edit' : 'Mass Edit'}
              </Button>
              {hasPendingChanges && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPendingChanges({})}
                    disabled={batchSaveMutation.isPending}
                  >
                    <Undo2 className="w-4 h-4 mr-1" />
                    Discard ({Object.keys(pendingChanges).length})
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => batchSaveMutation.mutate()}
                    disabled={batchSaveMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-1" />
                    {batchSaveMutation.isPending ? 'Saving...' : `Save All (${Object.keys(pendingChanges).length})`}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedTerm ? (
            <div className="text-center py-8 text-muted-foreground">
              Please select a term to view students.
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active students found with invoices for this term.
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="overflow-x-auto hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead className="w-[120px]">Current Belt</TableHead>
                      <TableHead className="w-[80px] text-center">Lessons</TableHead>
                      <TableHead className="w-[80px] text-center">Ready</TableHead>
                      <TableHead className="w-[100px]">Term Paid</TableHead>
                      <TableHead className="w-[100px]">Grading Paid</TableHead>
                      <TableHead className="w-[160px]">Grading Slot</TableHead>
                      <TableHead className="w-[140px]">Result</TableHead>
                      <TableHead className="w-[90px]">Certificate</TableHead>
                      <TableHead className="w-[100px]">Certificate II</TableHead>
                      <TableHead className="w-[90px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => {
                      const effectiveResult = getEffectiveResult(student);
                      const effectiveReady = getEffectiveReady(student);
                      const effectiveSlotId = getEffectiveSlot(student);
                      const effectiveSlot = availableSlots.find(s => s.id === effectiveSlotId);
                      const isChanged = hasStudentChange(student.student_id);
                      const canViewCertificate = effectiveResult === 'pass' || effectiveResult === 'confirmed';
                      const canViewCertificateII = effectiveResult === 'double';
                      
                      return (
                        <TableRow key={student.student_id} className={isChanged ? 'bg-accent/30' : undefined}>
                          <TableCell>
                            <Button
                              variant="link"
                              className="p-0 h-auto font-medium"
              onClick={() => onStudentClick ? onStudentClick(student.student_id) : navigate(`/parties/student/${student.student_id}`)}
                            >
                              <User className="w-3 h-3 mr-1" />
                              {student.student_name}
                            </Button>
                          </TableCell>
                          <TableCell>
                            {student.current_belt ? (
                              <Badge variant="outline">
                                {formatBeltLevel(student.current_belt)}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {student.lessons_attended}
                          </TableCell>
                          <TableCell className="text-center">
                            {isEditMode ? (
                              <Checkbox
                                checked={effectiveReady}
                                onCheckedChange={(checked) => {
                                  setLocalReady(student.student_id, !!checked, student.ready_for_grading);
                                }}
                              />
                            ) : (
                              <span className={`text-[11px] ${effectiveReady ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
                                {effectiveReady ? '✓' : '-'}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getTermPaidBadgeVariant(student.term_paid)}>
                              {getTermPaidLabel(student.term_paid)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={student.grading_paid === 'paid' ? 'success' : student.grading_paid === 'unpaid' ? 'destructive' : 'secondary'}
                            >
                              {student.grading_paid === 'paid' ? 'Paid' : student.grading_paid === 'unpaid' ? 'Unpaid' : 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {isEditMode ? (
                              <Select
                                value={effectiveSlotId || 'none'}
                                onValueChange={(value) => {
                                  setLocalSlot(student.student_id, value === 'none' ? null : value, student.grading_slot_id);
                                }}
                                disabled={student.grading_paid !== 'paid'}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Not Assigned</SelectItem>
                                  {availableSlots.map(slot => (
                                    <SelectItem key={slot.id} value={slot.id}>
                                      {slot.title || 'Slot'} - {slot.grading_date ? formatDate(new Date(slot.grading_date)) : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              effectiveSlot ? (
                                <span className="text-sm">
                                  {effectiveSlot.title || 'Slot'} - {effectiveSlot.grading_date ? formatDate(new Date(effectiveSlot.grading_date)) : ''}
                                </span>
                              ) : student.grading_slot_title || student.grading_slot_date ? (
                                <span className="text-sm">
                                  {student.grading_slot_title || 'Slot'} - {student.grading_slot_date ? formatDate(new Date(student.grading_slot_date)) : ''}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-sm">Not Assigned</span>
                              )
                            )}
                          </TableCell>
                          <TableCell>
                            {isEditMode ? (
                              <Select
                                value={effectiveResult || 'none'}
                                onValueChange={(value) => {
                                  setLocalResult(student.student_id, value === 'none' ? null : value, student.result);
                                }}
                                disabled={student.grading_paid !== 'paid'}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Clear</SelectItem>
                                  {RESULT_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              effectiveResult ? (
                                <Badge variant={effectiveResult === 'pass' || effectiveResult === 'double' ? 'success' : effectiveResult === 'fail' ? 'destructive' : 'secondary'}>
                                  {RESULT_OPTIONS.find(o => o.value === effectiveResult)?.label || effectiveResult}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )
                            )}
                          </TableCell>
                          <TableCell>
                            {canViewCertificate ? (
                              <Button variant="ghost" size="sm" onClick={() => handleViewCertificate(student.student_id, 1)}>
                                <FileText className="w-4 h-4" />
                              </Button>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {canViewCertificateII ? (
                              <Button variant="ghost" size="sm" onClick={() => handleViewCertificate(student.student_id, 2)}>
                                <FileText className="w-4 h-4" />
                              </Button>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDetailStudent({ id: student.student_id, name: student.student_name })}
                                title="View Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                              {student.registration_id && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" title="Delete Registration">
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

              {/* Mobile 3-line layout */}
              <div className="sm:hidden space-y-1.5">
                {students.map((student) => {
                  const effectiveResult = getEffectiveResult(student);
                  const effectiveReady = getEffectiveReady(student);
                  const isChanged = hasStudentChange(student.student_id);
                  const slotDisplay = renderSlotDisplay(student);

                  return (
                    <div
                      key={student.student_id}
                      className={`rounded-lg px-2 py-1.5 ${isChanged ? 'bg-accent/30' : 'bg-muted/50'}`}
                    >
                      {/* Line 1: Name, Belt, Ready, Actions */}
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
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
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {isEditMode ? (
                            <Checkbox
                              checked={effectiveReady}
                              onCheckedChange={(checked) => {
                                setLocalReady(student.student_id, !!checked, student.ready_for_grading);
                              }}
                              className="h-3.5 w-3.5"
                            />
                          ) : (
                            <span className={`text-[11px] ${effectiveReady ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
                              {effectiveReady ? '✓' : ''}
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => setDetailStudent({ id: student.student_id, name: student.student_name })}
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
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

                      {/* Line 2: Lessons, Term Paid, Grading Paid */}
                      <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                        <span className="text-muted-foreground">{student.lessons_attended} lessons</span>
                        <Badge variant={getTermPaidBadgeVariant(student.term_paid)} className="text-[10px] px-1.5 py-0">
                          Term: {getTermPaidLabel(student.term_paid)}
                        </Badge>
                        <Badge
                          variant={student.grading_paid === 'paid' ? 'success' : student.grading_paid === 'unpaid' ? 'destructive' : 'secondary'}
                          className="text-[10px] px-1.5 py-0"
                        >
                          Grading: {student.grading_paid === 'paid' ? 'Paid' : student.grading_paid === 'unpaid' ? 'Unpaid' : 'N/A'}
                        </Badge>
                      </div>

                      {/* Line 3: Grading Slot, Result */}
                      <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                        <span className="text-muted-foreground truncate">
                          {slotDisplay || 'No slot'}
                        </span>
                        {effectiveResult ? (
                          <Badge
                            variant={effectiveResult === 'pass' || effectiveResult === 'double' ? 'success' : effectiveResult === 'fail' ? 'destructive' : 'secondary'}
                            className="text-[10px] px-1.5 py-0 shrink-0"
                          >
                            {RESULT_OPTIONS.find(o => o.value === effectiveResult)?.label || effectiveResult}
                          </Badge>
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

      {/* Sticky save bar */}
      {hasPendingChanges && (
        <div className="sticky bottom-4 z-10 flex justify-center">
          <div className="bg-primary text-primary-foreground rounded-lg px-6 py-3 shadow-lg flex items-center gap-4">
            <span className="text-sm font-medium">{Object.keys(pendingChanges).length} unsaved change(s)</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPendingChanges({})}
              disabled={batchSaveMutation.isPending}
            >
              Discard
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => batchSaveMutation.mutate()}
              disabled={batchSaveMutation.isPending}
            >
              <Save className="w-4 h-4 mr-1" />
              {batchSaveMutation.isPending ? 'Saving...' : 'Save All'}
            </Button>
          </div>
        </div>
      )}

      {/* Student Detail Dialog */}
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
    </div>
  );
};

export default BranchGradingList;
