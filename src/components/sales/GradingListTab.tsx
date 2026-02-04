/**
 * Grading List Tab Component
 * Shows students invoiced for current term with grading status tracking
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getActiveTermsForSelection, type Term } from '@/services/termCalendarService';
import { getNextBeltLevel, getDoubleBeltLevel, formatBeltLevel } from '@/constants/beltLevels';
import { FileText, Loader2, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
}

interface Branch {
  id: string;
  name: string;
}

const RESULT_OPTIONS = [
  { value: '', label: 'Select...' },
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
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

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
  }, [selectedBranch, branchTerms]);

  // Fetch students with lesson invoices for selected term
  const { data: students = [], isLoading } = useQuery<GradingListStudent[]>({
    queryKey: ['grading-list-students', selectedBranch, selectedTerm, paymentFilter],
    queryFn: async () => {
      if (!selectedBranch || !selectedTerm) return [];

      // Get lesson products (is_lesson = true)
      const { data: lessonProducts } = await supabase
        .from('products')
        .select('id')
        .eq('is_lesson', true);
      
      const lessonProductIds = (lessonProducts || []).map(p => p.id);
      if (lessonProductIds.length === 0) return [];

      // Get invoice items with term_id in metadata
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
        .eq('invoices.branch_id', selectedBranch);

      if (itemsError) throw itemsError;

      // Filter by term_id in metadata
      const termItems = (invoiceItems || []).filter(item => {
        const metadata = item.metadata as Record<string, any> | null;
        return metadata?.term_id === selectedTerm;
      });

      if (termItems.length === 0) return [];

      // Get unique student IDs
      const studentIds = [...new Set(termItems.map(item => (item.invoices as any).student_id))];

      // Fetch students
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, first_name, last_name, current_belt')
        .in('id', studentIds);

      // Fetch existing grading registrations for these students in this term
      // We'll store term-level readiness info separately or use a simple approach
      const { data: registrations } = await supabase
        .from('grading_registrations')
        .select('id, student_id, ready_for_grading, result, certificate_issued, certificate_ii_issued')
        .in('student_id', studentIds);

      const studentMap = (studentsData || []).reduce((acc, s) => {
        acc[s.id] = s;
        return acc;
      }, {} as Record<string, any>);

      const regMap = (registrations || []).reduce((acc, r) => {
        // Use the most recent registration per student
        if (!acc[r.student_id]) {
          acc[r.student_id] = r;
        }
        return acc;
      }, {} as Record<string, any>);

      // Build the result list - dedupe by student
      const studentResultMap = new Map<string, GradingListStudent>();
      
      for (const item of termItems) {
        const invoice = item.invoices as any;
        const studentId = invoice.student_id;
        
        // Skip if already processed this student
        if (studentResultMap.has(studentId)) continue;
        
        const student = studentMap[studentId];
        const reg = regMap[studentId];
        
        if (student) {
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
            registration_id: reg?.id || null
          });
        }
      }

      let result = Array.from(studentResultMap.values());

      // Apply payment filter
      if (paymentFilter === 'paid') {
        result = result.filter(s => s.invoice_status === 'paid');
      } else if (paymentFilter === 'unpaid') {
        result = result.filter(s => s.invoice_status !== 'paid');
      }

      // Sort by name
      result.sort((a, b) => a.student_name.localeCompare(b.student_name));

      return result;
    },
    enabled: !!selectedBranch && !!selectedTerm
  });

  // Mutation to update ready for grading
  const updateReadyMutation = useMutation({
    mutationFn: async ({ studentId, isReady }: { studentId: string; isReady: boolean }) => {
      const student = students.find(s => s.student_id === studentId);
      if (!student) return;

      if (student.registration_id) {
        // Update existing registration
        const { error } = await supabase
          .from('grading_registrations')
          .update({ ready_for_grading: isReady })
          .eq('id', student.registration_id);
        if (error) throw error;
      } else {
        // Need to create a registration - we need a grading slot
        // For now, just show a message that they need to be registered to a grading slot first
        throw new Error('Student must be registered to a grading slot first');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grading-list-students'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update ready status');
    }
  });

  // Mutation to update result
  const updateResultMutation = useMutation({
    mutationFn: async ({ studentId, result }: { studentId: string; result: string | null }) => {
      const student = students.find(s => s.student_id === studentId);
      if (!student) return;

      if (student.registration_id) {
        const { error } = await supabase
          .from('grading_registrations')
          .update({ result: result || null })
          .eq('id', student.registration_id);
        if (error) throw error;
      } else {
        throw new Error('Student must be registered to a grading slot first');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grading-list-students'] });
      toast.success('Result updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update result');
    }
  });

  // Calculate new current belt based on result
  const getNewCurrentBelt = (currentBelt: string | null, result: string | null): string | null => {
    if (!currentBelt || !result) return null;
    
    switch (result) {
      case 'fail':
      case 'confirmed':
        return currentBelt; // Same belt
      case 'pass':
        return getNextBeltLevel(currentBelt); // Next belt
      case 'double':
        return getDoubleBeltLevel(currentBelt); // Skip one belt
      default:
        return null;
    }
  };

  const handleViewCertificate = (studentId: string, certificateNumber: 1 | 2) => {
    toast.info(`Certificate ${certificateNumber === 2 ? 'II ' : ''}generation coming soon`);
  };

  const selectedTermData = terms.find(t => t.id === selectedTerm);

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
              <Select value={selectedTerm} onValueChange={setSelectedTerm} disabled={!selectedBranch}>
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
            
            <div className="w-40">
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Payment Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
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
              ? `${students.length} student${students.length !== 1 ? 's' : ''} with class invoices for ${selectedTermData.name}`
              : 'Select a branch and term to view students'}
          </CardDescription>
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
              No students found with class invoices for this term.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead className="w-[120px]">Current Belt</TableHead>
                    <TableHead className="w-[100px]">Class Invoice</TableHead>
                    <TableHead className="w-[80px] text-center">Ready</TableHead>
                    <TableHead className="w-[140px]">Result</TableHead>
                    <TableHead className="w-[130px]">New Current Belt</TableHead>
                    <TableHead className="w-[100px]">Certificate</TableHead>
                    <TableHead className="w-[100px]">Certificate II</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => {
                    const newBelt = getNewCurrentBelt(student.current_belt, student.result);
                    const canViewCertificate = student.result === 'pass' || student.result === 'double' || student.result === 'confirmed';
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
                        <TableCell>
                          <Badge 
                            className={student.invoice_status === 'paid' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                            }
                          >
                            {student.invoice_status === 'paid' ? 'Paid' : 'Unpaid'}
                          </Badge>
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
                          <Select
                            value={student.result || ''}
                            onValueChange={(value) => {
                              updateResultMutation.mutate({
                                studentId: student.student_id,
                                result: value || null
                              });
                            }}
                            disabled={!student.registration_id || updateResultMutation.isPending}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              {RESULT_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {newBelt ? (
                            <Badge variant="secondary">
                              {formatBeltLevel(newBelt)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!canViewCertificate}
                            onClick={() => handleViewCertificate(student.student_id, 1)}
                          >
                            <FileText className="w-3 h-3 mr-1" />
                            View
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!canViewCertificateII}
                            onClick={() => handleViewCertificate(student.student_id, 2)}
                          >
                            <FileText className="w-3 h-3 mr-1" />
                            View
                          </Button>
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

export default GradingListTab;