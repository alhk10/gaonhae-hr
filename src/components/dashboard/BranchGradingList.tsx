/**
 * Branch Grading List Component
 * Shows active students with paid term invoices, enriched grading data
 * Pre-filtered by branch ID from props
 */

import React, { useState, useMemo } from 'react';
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
import { removeGradingRegistration } from '@/services/gradingService';
import { FileText, Loader2, User, Pencil, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

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

interface BranchGradingListProps {
  branchId: string;
}

const RESULT_OPTIONS = [
  { value: 'double', label: 'Double' },
  { value: 'pass', label: 'Pass' },
  { value: 'fail', label: 'Fail' },
  { value: 'confirmed', label: 'Confirmed' },
];

const BranchGradingList: React.FC<BranchGradingListProps> = ({ branchId }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [selectedTerm, setSelectedTerm] = useState<string>('');

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
  }, [branchId, branchTerms]);

  const selectedTermData = terms.find(t => t.id === selectedTerm);

  // Fetch students with paid lesson invoices for selected term
  const { data: students = [], isLoading } = useQuery<GradingListStudent[]>({
    queryKey: ['grading-list-students', branchId, selectedTerm],
    queryFn: async () => {
      if (!branchId || !selectedTerm) return [];

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
        .eq('invoices.branch_id', branchId)
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
        .eq('status', 'Active');

      const activeStudentIds = (studentsData || []).map(s => s.id);
      if (activeStudentIds.length === 0) return [];

      // Parallel fetches
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

      // Count attendance per student
      const attendanceCountMap: Record<string, number> = {};
      attendanceRecords.forEach((a: any) => {
        attendanceCountMap[a.student_id] = (attendanceCountMap[a.student_id] || 0) + 1;
      });

      // Build registration map
      const regMap: Record<string, any> = {};
      registrations.forEach(r => {
        if (!regMap[r.student_id]) {
          regMap[r.student_id] = r;
        }
      });

      // Fetch grading slot info
      const slotIds = [...new Set(registrations.filter(r => r.grading_slot_id).map(r => r.grading_slot_id!))];
      let slotMap: Record<string, any> = {};
      if (slotIds.length > 0) {
        const { data: slots } = await supabase
          .from('grading_slots')
          .select('id, title, grading_date')
          .in('id', slotIds);
        (slots || []).forEach(s => { slotMap[s.id] = s; });
      }

      // Fetch grading paid status
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
    enabled: !!branchId && !!selectedTerm
  });

  // Mutation to update ready for grading
  const updateReadyMutation = useMutation({
    mutationFn: async ({ studentId, isReady }: { studentId: string; isReady: boolean }) => {
      const student = students.find(s => s.student_id === studentId);
      if (!student?.registration_id) throw new Error('Student must be registered to a grading slot first');
      const { error } = await supabase
        .from('grading_registrations')
        .update({ ready_for_grading: isReady })
        .eq('id', student.registration_id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['grading-list-students'] }),
    onError: (error: Error) => toast.error(error.message || 'Failed to update ready status'),
  });

  // Mutation to update result
  const updateResultMutation = useMutation({
    mutationFn: async ({ studentId, result }: { studentId: string; result: string | null }) => {
      const student = students.find(s => s.student_id === studentId);
      if (!student?.registration_id) throw new Error('Student must be registered to a grading slot first');
      const { error } = await supabase
        .from('grading_registrations')
        .update({ result: result || null })
        .eq('id', student.registration_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grading-list-students'] });
      toast.success('Result updated');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to update result'),
  });

  // Mutation to delete registration
  const deleteMutation = useMutation({
    mutationFn: async (registrationId: string) => {
      await removeGradingRegistration(registrationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grading-list-students'] });
      toast.success('Registration deleted');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to delete registration'),
  });

  const handleViewCertificate = (studentId: string, certificateNumber: 1 | 2) => {
    toast.info(`Certificate ${certificateNumber === 2 ? 'II ' : ''}generation coming soon`);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="w-64">
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
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
          <CardTitle>Students for Grading</CardTitle>
          <CardDescription>
            {selectedTermData 
              ? `${students.length} active student${students.length !== 1 ? 's' : ''} with paid invoices for ${selectedTermData.name}`
              : 'Select a term to view students'}
          </CardDescription>
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
                    const canViewCertificate = student.result === 'pass' || student.result === 'confirmed';
                    const canViewCertificateII = student.result === 'double';
                    
                    return (
                      <TableRow key={student.student_id}>
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
                          <Checkbox
                            checked={student.ready_for_grading}
                            onCheckedChange={(checked) => {
                              updateReadyMutation.mutate({
                                studentId: student.student_id,
                                isReady: !!checked
                              });
                            }}
                            disabled={!student.registration_id || updateReadyMutation.isPending}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={student.grading_paid === 'paid' ? 'success' : student.grading_paid === 'unpaid' ? 'destructive' : 'secondary'}
                          >
                            {student.grading_paid === 'paid' ? 'Paid' : student.grading_paid === 'unpaid' ? 'Unpaid' : 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {student.grading_slot_title || student.grading_slot_date ? (
                            <span className="text-sm">
                              {student.grading_slot_title || 'Slot'} - {student.grading_slot_date ? format(new Date(student.grading_slot_date), 'dd MMM yyyy') : ''}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">Not Assigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={student.result || 'none'}
                            onValueChange={(value) => {
                              updateResultMutation.mutate({
                                studentId: student.student_id,
                                result: value === 'none' ? null : value
                              });
                            }}
                            disabled={!student.registration_id || updateResultMutation.isPending}
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
                              onClick={() => navigate(`/parties/student/${student.student_id}`)}
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
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
                                    <AlertDialogTitle>Delete Registration</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete the grading registration for {student.student_name}? This cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteMutation.mutate(student.registration_id!)}
                                    >
                                      Delete
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
    </div>
  );
};

export default BranchGradingList;
