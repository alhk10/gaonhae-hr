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
import { getActiveTermsForSelection, type Term } from '@/services/termCalendarService';
import { formatBeltLevel } from '@/constants/beltLevels';
import { createGradingDeletionRequest } from '@/services/gradingDeletionRequestService';
import { FileText, Loader2, User, Trash2, Eye, Save, Undo2, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import GradingStudentDetailDialog from '@/components/sales/GradingStudentDetailDialog';

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
    default: return status;
  }
};

const BranchGradingList: React.FC<BranchGradingListProps> = ({ branchId }) => {
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

  // Fetch terms
  const { data: terms = [] } = useQuery<Term[]>({
    queryKey: ['terms-grading-list'],
    queryFn: getActiveTermsForSelection
  });

  // Get terms for selected branch
  const branchTerms = useMemo(() => {
    if (!branchId) return [];
    return terms.filter(t => t.branch_id === branchId);
  }, [terms, branchId]);

  // Auto-select current term when branch changes
  React.useEffect(() => {
    if (branchId && branchTerms.length > 0) {
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
  }, [branchId, branchTerms]);

  const selectedTermData = terms.find(t => t.id === selectedTerm);

  // Fetch students with invoices (all statuses except cancelled) for selected term
  const { data: students = [], isLoading } = useQuery<GradingListStudent[]>({
    queryKey: ['grading-list-students', branchId, selectedTerm],
    queryFn: async () => {
      if (!branchId || !selectedTerm) return [];

      const { data: lessonProducts } = await supabase
        .from('products')
        .select('id')
        .eq('is_lesson', true);
      
      const lessonProductIds = (lessonProducts || []).map(p => p.id);
      if (lessonProductIds.length === 0) return [];

      // Get invoice items — include all statuses except cancelled
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
        .eq('invoices.branch_id', branchId)
        .in('invoices.status', ['draft', 'sent', 'unpaid', 'partial', 'overdue', 'paid']);

      if (itemsError) throw itemsError;

      const termItems = (invoiceItems || []).filter(item => {
        const metadata = item.metadata as Record<string, any> | null;
        return metadata?.term_id === selectedTerm;
      });

      if (termItems.length === 0) return [];

      const studentIds = [...new Set(termItems.map(item => (item.invoices as any).student_id))];

      const { data: studentsData } = await supabase
        .from('students')
        .select('id, first_name, last_name, current_belt, status')
        .in('id', studentIds)
        .ilike('status', 'active');

      const activeStudentIds = (studentsData || []).map(s => s.id);
      if (activeStudentIds.length === 0) return [];

      const [regResult, attendanceResult] = await Promise.all([
        supabase
          .from('grading_registrations')
          .select('id, student_id, ready_for_grading, result, certificate_issued, certificate_ii_issued, invoice_item_id, grading_slot_id')
          .in('student_id', activeStudentIds),
        selectedTermData ? supabase
          .from('class_attendance')
          .select('student_id')
          .in('student_id', activeStudentIds)
          .eq('branch_id', branchId)
          .eq('status', 'present')
          .gte('class_date', selectedTermData.start_date)
          .lte('class_date', selectedTermData.end_date) : Promise.resolve({ data: [] }),
      ]);

      const registrations = regResult.data || [];
      const attendanceRecords = attendanceResult.data || [];

      const attendanceCountMap: Record<string, number> = {};
      attendanceRecords.forEach((a: any) => {
        attendanceCountMap[a.student_id] = (attendanceCountMap[a.student_id] || 0) + 1;
      });

      const regMap: Record<string, any> = {};
      registrations.forEach(r => {
        if (!regMap[r.student_id]) {
          regMap[r.student_id] = r;
        }
      });

      const slotIds = [...new Set(registrations.filter(r => r.grading_slot_id).map(r => r.grading_slot_id!))];
      let slotMap: Record<string, any> = {};
      if (slotIds.length > 0) {
        const { data: slots } = await supabase
          .from('grading_slots')
          .select('id, title, grading_date')
          .in('id', slotIds);
        (slots || []).forEach(s => { slotMap[s.id] = s; });
      }

      const invoiceItemIds = registrations.filter(r => r.invoice_item_id).map(r => r.invoice_item_id!);
      let gradingPaidMap: Record<string, string> = {};
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
          term_paid: invoice.status || 'draft',
          grading_slot_title: slot?.title || null,
          grading_slot_date: slot?.grading_date || null,
          grading_slot_id: reg?.grading_slot_id || null,
        });
      }

      const result = Array.from(studentResultMap.values());
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
          const insertData = {
            student_id: studentId,
            current_belt: student.current_belt || 'white',
            target_belt: student.current_belt || 'white',
            grading_slot_id: changes.grading_slot_id || null,
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

  const renderSlotDisplay = (student: GradingListStudent) => {
    const effectiveSlotId = getEffectiveSlot(student);
    const effectiveSlot = availableSlots.find(s => s.id === effectiveSlotId);
    if (effectiveSlot) {
      return `${effectiveSlot.title || 'Slot'} - ${effectiveSlot.grading_date ? format(new Date(effectiveSlot.grading_date), 'dd MMM yyyy') : ''}`;
    }
    if (student.grading_slot_title || student.grading_slot_date) {
      return `${student.grading_slot_title || 'Slot'} - ${student.grading_slot_date ? format(new Date(student.grading_slot_date), 'dd MMM yyyy') : ''}`;
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
                    {branchTerms.map(t => (
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
                            onClick={() => navigate(`/parties/student/${student.student_id}`)}
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
