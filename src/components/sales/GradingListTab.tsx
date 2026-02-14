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
import { format } from 'date-fns';
import GradingStudentDetailDialog from './GradingStudentDetailDialog';

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
    queryFn: getActiveTermsForSelection
  });

  // Get terms for selected branch
  const branchTerms = useMemo(() => {
    if (!selectedBranch) return [];
    return terms.filter(t => t.branch_id === selectedBranch);
  }, [terms, selectedBranch]);

  // Auto-select current term when branch changes
  React.useEffect(() => {
    if (selectedBranch && branchTerms.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const currentTerm = branchTerms.find(t => t.start_date <= today && t.end_date >= today);
      if (currentTerm) {
        setSelectedTerm(currentTerm.id);
      } else if (branchTerms.length > 0) {
        setSelectedTerm(branchTerms[0].id);
      }
    } else {
      setSelectedTerm('');
    }
    setPendingChanges({});
  }, [selectedBranch, branchTerms]);

  const selectedTermData = terms.find(t => t.id === selectedTerm);

  // Fetch students with paid lesson invoices for selected term
  const { data: students = [], isLoading } = useQuery<GradingListStudent[]>({
    queryKey: ['grading-list-students', selectedBranch, selectedTerm],
    queryFn: async () => {
      if (!selectedBranch || !selectedTerm) return [];

      // Get lesson products
      const { data: lessonProducts } = await supabase
        .from('products')
        .select('id')
        .eq('is_lesson', true);
      
      const lessonProductIds = (lessonProducts || []).map(p => p.id);
      if (lessonProductIds.length === 0) return [];

      // Get invoice items with term_id in metadata, only paid invoices
      const { data: invoiceItems, error: itemsError } = await supabase
        .from('invoice_items')
        .select(`
          id,
          invoice_id,
          metadata,
          invoices!inner (
            id,
            status,
            student_id,
            branch_id
          )
        `)
        .in('product_id', lessonProductIds)
        .eq('invoices.branch_id', selectedBranch)
        .eq('invoices.status', 'paid');

      if (itemsError) throw itemsError;

      // Filter by term_id in metadata
      const termItems = (invoiceItems || []).filter(item => {
        const metadata = item.metadata as Record<string, any> | null;
        return metadata?.term_id === selectedTerm;
      });

      if (termItems.length === 0) return [];

      // Get unique student IDs
      const studentIds = [...new Set(termItems.map(item => (item.invoices as any).student_id))];

      // Fetch active students only
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, first_name, last_name, current_belt, status')
        .in('id', studentIds)
        .ilike('status', 'active');

      const activeStudentIds = (studentsData || []).map(s => s.id);
      if (activeStudentIds.length === 0) return [];

      // Parallel fetches: registrations, attendance counts, grading slot info
      const [regResult, attendanceResult] = await Promise.all([
        supabase
          .from('grading_registrations')
          .select('id, student_id, ready_for_grading, result, certificate_issued, certificate_ii_issued, invoice_item_id, grading_slot_id')
          .in('student_id', activeStudentIds),
        // Get attendance counts for the term date range
        selectedTermData ? supabase
          .from('class_attendance')
          .select('student_id')
          .in('student_id', activeStudentIds)
          .eq('branch_id', selectedBranch)
          .eq('status', 'present')
          .gte('class_date', selectedTermData.start_date)
          .lte('class_date', selectedTermData.end_date) : Promise.resolve({ data: [] }),
      ]);

      const registrations = regResult.data || [];
      const attendanceRecords = attendanceResult.data || [];

      // Count attendance per student
      const attendanceCountMap: Record<string, number> = {};
      attendanceRecords.forEach((a: any) => {
        attendanceCountMap[a.student_id] = (attendanceCountMap[a.student_id] || 0) + 1;
      });

      // Build registration map (most recent per student)
      const regMap: Record<string, any> = {};
      registrations.forEach(r => {
        if (!regMap[r.student_id]) {
          regMap[r.student_id] = r;
        }
      });

      // Fetch grading slot info for registrations that have slot_id
      const slotIds = [...new Set(registrations.filter(r => r.grading_slot_id).map(r => r.grading_slot_id!))];
      let slotMap: Record<string, any> = {};
      if (slotIds.length > 0) {
        const { data: slots } = await supabase
          .from('grading_slots')
          .select('id, title, grading_date')
          .in('id', slotIds);
        (slots || []).forEach(s => { slotMap[s.id] = s; });
      }

      // Fetch grading paid status via invoice_item_id -> invoice_items -> invoices
      const invoiceItemIds = registrations.filter(r => r.invoice_item_id).map(r => r.invoice_item_id!);
      let gradingPaidMap: Record<string, string> = {}; // student_id -> 'paid' | 'unpaid'
      if (invoiceItemIds.length > 0) {
        const { data: gradingInvItems } = await supabase
          .from('invoice_items')
          .select('id, invoice_id, invoices!inner(id, status)')
          .in('id', invoiceItemIds);
        const itemToStatus: Record<string, string> = {};
        (gradingInvItems || []).forEach((ii: any) => {
          itemToStatus[ii.id] = (ii.invoices as any)?.status || 'draft';
        });
        registrations.forEach(r => {
          if (r.invoice_item_id && itemToStatus[r.invoice_item_id]) {
            gradingPaidMap[r.student_id] = itemToStatus[r.invoice_item_id] === 'paid' ? 'paid' : 'unpaid';
          }
        });
      }

      const studentMap = (studentsData || []).reduce((acc, s) => {
        acc[s.id] = s;
        return acc;
      }, {} as Record<string, any>);

      // Build result list
      const studentResultMap = new Map<string, GradingListStudent>();
      
      for (const item of termItems) {
        const invoice = item.invoices as any;
        const studentId = invoice.student_id;
        if (studentResultMap.has(studentId)) continue;
        
        const student = studentMap[studentId];
        if (!student) continue;

        const reg = regMap[studentId];
        const slot = reg?.grading_slot_id ? slotMap[reg.grading_slot_id] : null;

        studentResultMap.set(studentId, {
          student_id: studentId,
          student_name: `${student.first_name} ${student.last_name}`,
          current_belt: student.current_belt,
          invoice_status: invoice.status,
          invoice_id: invoice.id,
          ready_for_grading: reg?.ready_for_grading || false,
          result: reg?.result || null,
          certificate_issued: reg?.certificate_issued || false,
          certificate_ii_issued: reg?.certificate_ii_issued || false,
          registration_id: reg?.id || null,
          lessons_attended: attendanceCountMap[studentId] || 0,
          grading_paid: (gradingPaidMap[studentId] as 'paid' | 'unpaid') || 'n/a',
          grading_slot_title: slot?.title || null,
          grading_slot_date: slot?.grading_date || null,
          grading_slot_id: reg?.grading_slot_id || null,
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
            grading_slot_id: changes.grading_slot_id || 'placeholder',
            ready_for_grading: changes.ready_for_grading || false,
            result: changes.result || null,
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
                              disabled={false}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Not Assigned</SelectItem>
                                {availableSlots.map(slot => (
                                  <SelectItem key={slot.id} value={slot.id}>
                                    {slot.title || 'Slot'} - {slot.grading_date ? format(new Date(slot.grading_date), 'dd MMM yyyy') : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            effectiveSlot ? (
                              <span className="text-sm">
                                {effectiveSlot.title || 'Slot'} - {effectiveSlot.grading_date ? format(new Date(effectiveSlot.grading_date), 'dd MMM yyyy') : ''}
                              </span>
                            ) : student.grading_slot_title || student.grading_slot_date ? (
                              <span className="text-sm">
                                {student.grading_slot_title || 'Slot'} - {student.grading_slot_date ? format(new Date(student.grading_slot_date), 'dd MMM yyyy') : ''}
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
                              disabled={false}
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
