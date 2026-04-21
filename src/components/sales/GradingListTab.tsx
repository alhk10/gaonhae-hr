/**
 * Grading List Tab Component
 * Shows active students with paid term invoices, enriched grading data
 * Mass-editable: changes are tracked locally and saved in batch
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
import { getActiveTermsForSelection, type Term } from '@/services/termCalendarService';
import { formatBeltLevel } from '@/constants/beltLevels';
import { createGradingDeletionRequest } from '@/services/gradingDeletionRequestService';
import { FileText, Loader2, User, Trash2, Eye, Save, Undo2, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import GradingStudentDetailDialog from './GradingStudentDetailDialog';
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
  grading_slot_title: string | null;
  grading_slot_date: string | null;
  grading_slot_id: string | null;
}

interface Branch {
  id: string;
  name: string;
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

const GradingListTab: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [detailStudent, setDetailStudent] = useState<{ id: string; name: string } | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Record<string, PendingChange>>({});
  const [isEditMode, setIsEditMode] = useState(false);

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  // Fetch available grading slots for the selected branch
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

  // Fetch branches
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

  // Fetch terms
  const { data: terms = [] } = useQuery<Term[]>({
    queryKey: ['terms-grading-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('term_calendars')
        .select('*')
        .eq('is_active', true)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return (data || []).map(t => ({
        ...t,
        branch_name: '',
        breaks: [],
      })) as Term[];
    }
  });

  // Fetch term_ids that have at least one lesson invoice OR grading registration for the selected branch
  const { data: invoicedTermIds = [] } = useQuery<string[]>({
    queryKey: ['grading-list-invoiced-terms', selectedBranch],
    queryFn: async () => {
      if (!selectedBranch) return [];

      const termIds = new Set<string>();

      // 1) Lesson-invoice based term ids (existing behaviour)
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
          .eq('invoices.branch_id', selectedBranch)
          .in('invoices.status', ['draft', 'sent', 'unpaid', 'partial', 'partially_paid', 'overdue', 'paid', 'verified']);

        (items || []).forEach((it: any) => {
          const md = it.metadata as Record<string, any> | null;
          const tid = md?.term_id || md?.term_ids?.[0];
          if (tid) termIds.add(tid);
        });
      }

      // 2) Grading-registration based term ids (new): include any term that has
      // a registration whose student has any invoice at this branch.
      const { data: branchInvoices } = await supabase
        .from('invoices')
        .select('student_id')
        .eq('branch_id', selectedBranch);
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

  // Get terms for selected branch: past + current + future terms with invoices
  const branchTerms = useMemo(() => {
    if (!selectedBranch) return [];
    const today = new Date().toISOString().split('T')[0];
    const invoicedSet = new Set(invoicedTermIds);
    const filtered = terms
      .filter(t => t.branch_id === selectedBranch)
      .filter(t => t.start_date <= today || invoicedSet.has(t.id));
    return [...filtered].sort((a, b) => b.start_date.localeCompare(a.start_date));
  }, [terms, selectedBranch, invoicedTermIds]);

  // Auto-select: prefer current term, else most recent term with invoices, else most recent
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
    setPendingChanges({});
  }, [selectedBranch, branchTerms, invoicedTermIds]);

  const selectedTermData = terms.find(t => t.id === selectedTerm);

  // Fetch grading registrations for the selected term & branch (registration-driven)
  const { data: students = [], isLoading } = useQuery<GradingListStudent[]>({
    queryKey: ['grading-list-students', selectedBranch, selectedTerm],
    queryFn: async () => {
      if (!selectedBranch || !selectedTerm) return [];

      // 1) Registrations for this term
      const { data: regs, error: regErr } = await supabase
        .from('grading_registrations')
        .select('id, student_id, current_belt, target_belt, ready_for_grading, result, certificate_issued, certificate_ii_issued, invoice_item_id, grading_slot_id, term_id')
        .eq('term_id', selectedTerm);
      if (regErr) throw regErr;
      const registrations = regs || [];
      if (registrations.length === 0) return [];

      const regStudentIds = [...new Set(registrations.map(r => r.student_id))];

      // 2) Active students only
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, first_name, last_name, current_belt, status')
        .in('id', regStudentIds)
        .ilike('status', 'active');
      const studentMap = (studentsData || []).reduce((acc: Record<string, any>, s) => {
        acc[s.id] = s;
        return acc;
      }, {});
      const activeStudentIds = Object.keys(studentMap);
      if (activeStudentIds.length === 0) return [];

      // 3) Branch scoping: keep only students who have ANY invoice at this branch.
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
      if (branchScopedRegs.length === 0) return [];

      // 4) Parallel: attendance counts, slot info, grading-paid lookup via invoice_item_id
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
          .from('grading_slots')
          .select('id, title, grading_date')
          .in('id', slotIds) : Promise.resolve({ data: [] }),
        invoiceItemIds.length > 0 ? supabase
          .from('invoice_items')
          .select('id, invoice_id, invoices!inner(id, status, branch_id)')
          .in('id', invoiceItemIds) : Promise.resolve({ data: [] }),
      ]);

      const attendanceCountMap: Record<string, number> = {};
      (attendanceResult.data || []).forEach((a: any) => {
        attendanceCountMap[a.student_id] = (attendanceCountMap[a.student_id] || 0) + 1;
      });

      const slotMap: Record<string, any> = {};
      (slotsResult.data || []).forEach((s: any) => { slotMap[s.id] = s; });

      // Map invoice_item_id -> { status, invoice_id }
      const itemToInvoice: Record<string, { status: string; invoice_id: string }> = {};
      (gradingItemsResult.data || []).forEach((ii: any) => {
        const inv = ii.invoices as any;
        itemToInvoice[ii.id] = { status: inv?.status || 'draft', invoice_id: inv?.id || ii.invoice_id };
      });

      // 5) Fallback grading-paid lookup: for registrations missing invoice_item_id,
      // search any invoice item at this branch with metadata.grading_slot_id matching.
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
          // Prefer paid/verified; otherwise keep first encountered
          const status = (it.invoices as any)?.status || 'draft';
          const existing = fallbackByStudent[studentId];
          if (!existing || (['paid', 'verified'].includes(status) && !['paid', 'verified'].includes(existing.status))) {
            fallbackByStudent[studentId] = { status, invoice_id: (it.invoices as any).id };
          }
        });
      }

      // 6) Build list (one row per registration; first registration per student wins)
      const studentResultMap = new Map<string, GradingListStudent>();
      for (const reg of branchScopedRegs) {
        if (studentResultMap.has(reg.student_id)) continue;
        const student = studentMap[reg.student_id];
        if (!student) continue;

        const slot = reg.grading_slot_id ? slotMap[reg.grading_slot_id] : null;

        // Resolve grading paid + invoice id
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

        // invoice_id fallback: any branch invoice for this student
        const fallbackInvoice = studentToBranchInvoices[reg.student_id]?.[0];
        const invoiceId = gradingInvoiceId || fallbackInvoice?.id || '';
        const invoiceStatus = gradingInvoiceId
          ? (itemToInvoice[reg.invoice_item_id || '']?.status || fallbackByStudent[reg.student_id]?.status || '')
          : (fallbackInvoice?.status || '');

        studentResultMap.set(reg.student_id, {
          student_id: reg.student_id,
          student_name: `${student.first_name} ${student.last_name}`,
          current_belt: reg.current_belt || student.current_belt,
          invoice_status: invoiceStatus,
          invoice_id: invoiceId,
          ready_for_grading: reg.ready_for_grading || false,
          result: reg.result || null,
          certificate_issued: reg.certificate_issued || false,
          certificate_ii_issued: reg.certificate_ii_issued || false,
          registration_id: reg.id,
          lessons_attended: attendanceCountMap[reg.student_id] || 0,
          grading_paid: gradingPaid,
          grading_slot_title: slot?.title || null,
          grading_slot_date: slot?.grading_date || null,
          grading_slot_id: reg.grading_slot_id || null,
        });
      }

      const result = Array.from(studentResultMap.values());
      result.sort((a, b) => a.student_name.localeCompare(b.student_name));
      return result;
    },
    enabled: !!selectedBranch && !!selectedTerm
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
          // Update existing registration
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
          // Create new registration for students without one
          const insertData = {
            student_id: studentId,
            current_belt: student.current_belt || 'white',
            target_belt: student.current_belt || 'white',
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

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="w-48">
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-64">
              <Select value={selectedTerm} onValueChange={(v) => { setSelectedTerm(v); setPendingChanges({}); }} disabled={!selectedBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Term" />
                </SelectTrigger>
                <SelectContent>
                  {branchTerms.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Students for Grading</CardTitle>
              <CardDescription>
                {selectedTermData 
                  ? `${students.length} active student${students.length !== 1 ? 's' : ''} with paid invoices for ${selectedTermData.name}`
                  : 'Select a branch and term to view students'}
              </CardDescription>
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
          {!selectedBranch || !selectedTerm ? (
            <div className="text-center py-8 text-muted-foreground">
              Please select a branch and term to view students.
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active students found with paid class invoices for this term.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead className="w-[120px]">Current Belt</TableHead>
                    <TableHead className="w-[80px] text-center">Lessons</TableHead>
                    <TableHead className="w-[80px] text-center">Ready</TableHead>
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
                            onClick={() => navigate(`/parties/student/${student.student_id}`)}
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
                              disabled={false}
                            />
                          ) : (
                            <span className={effectiveReady ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                              {effectiveReady ? '✓' : '-'}
                            </span>
                          )}
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewCertificate(student.student_id, 1)}
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {canViewCertificateII ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewCertificate(student.student_id, 2)}
                            >
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
          )}
        </CardContent>
      </Card>

      {/* Sticky save bar at bottom when changes exist */}
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
          branchId={selectedBranch}
          termId={selectedTerm}
          termStartDate={selectedTermData.start_date}
          termEndDate={selectedTermData.end_date}
        />
      )}
    </div>
  );
};

export default GradingListTab;
