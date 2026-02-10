import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  CheckCircle,
  XCircle,
  Filter,
  Plus,
  Eye,
  FileText,
  DollarSign
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { 
  getPendingRequestsByBranch, 
  approveRequest, 
  rejectRequest 
} from '@/services/studentUpdateRequestService';
import { useAuth } from '@/contexts/AuthContext';
import BranchWeeklyTimetable from './BranchWeeklyTimetable';
import BranchGradingList from './BranchGradingList';
import CreateInvoiceDialog from '@/components/sales/CreateInvoiceDialog';
import CreatePaymentDialog from '@/components/sales/CreatePaymentDialog';

import StudentDetailsDialog from './StudentDetailsDialog';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { getCurrentTerm } from '@/services/termCalendarService';
import { formatCurrency } from '@/utils/currencyUtils';

import { Student } from '@/services/studentService';

interface BranchDashboardProps {
  branchId: string;
}

const BranchDashboard: React.FC<BranchDashboardProps> = ({ branchId }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('students');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentDetailsOpen, setStudentDetailsOpen] = useState(false);
  // Fetch branch info
  const { data: branch } = useQuery({
    queryKey: ['branch', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('id', branchId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!branchId,
  });

  // Fetch students for this branch
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['branch-students', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('branch_id', branchId)
        .order('first_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!branchId,
  });

  // Fetch invoices for this branch
  const { data: invoices = [] } = useQuery({
    queryKey: ['branch-invoices', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!branchId,
  });

  // Fetch pending update requests
  const { data: pendingRequests = [], refetch: refetchRequests } = useQuery({
    queryKey: ['pending-requests', branchId],
    queryFn: () => getPendingRequestsByBranch(branchId),
    enabled: !!branchId,
  });

  // Fetch current term for this branch
  const { data: currentTerm } = useQuery({
    queryKey: ['current-term', branchId],
    queryFn: () => getCurrentTerm(branchId),
    enabled: !!branchId,
  });

  // Fetch active students (students who have paid invoices this term)
  const { data: activeStudentIds = [] } = useQuery({
    queryKey: ['active-students-paid', branchId, currentTerm?.id],
    queryFn: async () => {
      if (!currentTerm) return [];
      
      const { data: paidInvoices } = await supabase
        .from('invoices')
        .select('student_id')
        .eq('branch_id', branchId)
        .eq('status', 'paid')
        .gte('issue_date', currentTerm.start_date)
        .lte('issue_date', currentTerm.end_date);
      
      const uniqueStudentIds = [...new Set((paidInvoices || []).map(inv => inv.student_id))];
      return uniqueStudentIds;
    },
    enabled: !!branchId && !!currentTerm,
  });

  // Fetch outstanding invoice amount for current term
  const { data: outstandingAmount = 0 } = useQuery({
    queryKey: ['outstanding-invoices', branchId, currentTerm?.id],
    queryFn: async () => {
      if (!currentTerm) return 0;
      
      const { data: unpaidInvoices } = await supabase
        .from('invoices')
        .select('balance_due')
        .eq('branch_id', branchId)
        .in('status', ['unpaid', 'partial', 'draft', 'sent', 'overdue'])
        .gte('issue_date', currentTerm.start_date)
        .lte('issue_date', currentTerm.end_date);
      
      return (unpaidInvoices || []).reduce((sum, inv) => sum + (inv.balance_due || 0), 0);
    },
    enabled: !!branchId && !!currentTerm,
  });

  // Fetch grading list count (students with lesson invoices for current term)
  const { data: gradingListCount = 0 } = useQuery({
    queryKey: ['grading-list-count', branchId, currentTerm?.id],
    queryFn: async () => {
      if (!currentTerm) return 0;
      
      // Get lesson products
      const { data: lessonProducts } = await supabase
        .from('products')
        .select('id')
        .eq('is_lesson', true);
      
      const lessonProductIds = (lessonProducts || []).map(p => p.id);
      if (lessonProductIds.length === 0) return 0;

      // Get invoice items with lesson products for this branch
      const { data: invoiceItems } = await supabase
        .from('invoice_items')
        .select(`
          metadata,
          invoices!inner (
            student_id,
            branch_id
          )
        `)
        .in('product_id', lessonProductIds)
        .eq('invoices.branch_id', branchId);

      // Filter by term_id in metadata and get unique student count
      const studentIds = new Set<string>();
      (invoiceItems || []).forEach(item => {
        const metadata = item.metadata as Record<string, any> | null;
        if (metadata?.term_id === currentTerm.id) {
          studentIds.add((item.invoices as any).student_id);
        }
      });

      return studentIds.size;
    },
    enabled: !!branchId && !!currentTerm,
  });

  const activeStudentsCount = activeStudentIds.length;
  const branchCurrency = branch?.currency || 'SGD';


  const filteredStudents = students.filter(student => {
    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) ||
           student.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || student.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleApproveRequest = async (requestId: string) => {
    if (!user?.employeeId) return;
    
    const success = await approveRequest(requestId, user.employeeId);
    if (success) {
      toast.success('Changes approved and applied');
      refetchRequests();
    } else {
      toast.error('Failed to approve changes');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!user?.employeeId) return;
    
    const success = await rejectRequest(requestId, user.employeeId, 'Rejected by branch manager');
    if (success) {
      toast.success('Request rejected');
      refetchRequests();
    } else {
      toast.error('Failed to reject request');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          {branch?.name || 'Loading...'} Dashboard
        </h2>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="timetable">Weekly Timetable</TabsTrigger>
          <TabsTrigger value="students">Students ({activeStudentsCount})</TabsTrigger>
          <TabsTrigger value="invoices">Invoice & Payment ({formatCurrency(outstandingAmount, branchCurrency)})</TabsTrigger>
          <TabsTrigger value="grading">Grading List ({gradingListCount})</TabsTrigger>
          <TabsTrigger value="approvals">Pending Approvals ({pendingRequests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                  {statusFilter !== 'all' && (
                    <Badge variant="secondary" className="ml-2">{statusFilter}</Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                  All Students
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('Active')}>
                  Active
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('Inactive')}>
                  Inactive
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('Trial')}>
                  Trial
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex-1" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Student/Trial
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate('/parties?tab=students&action=add')}>
                  Add New Student
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/parties?tab=trials&action=add')}>
                  Add New Trial
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Card>
            <CardContent className="p-0">
              {studentsLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No students found
                </div>
              ) : (
                <div className="divide-y">
                  {filteredStudents.slice(0, 20).map((student) => (
                    <div key={student.id} className="p-4 flex items-center justify-between hover:bg-muted/50">
                      <div>
                        <p className="font-medium">
                          {student.first_name} {student.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {student.email || 'No email'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={student.current_belt ? 'default' : 'secondary'}>
                          {student.current_belt || 'No belt'}
                        </Badge>
                        <Badge variant={student.status === 'Active' ? 'default' : 'secondary'}>
                          {student.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedStudent(student as Student);
                            setStudentDetailsOpen(true);
                          }}
                          title="View student details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Student Details Dialog */}
          <StudentDetailsDialog
            open={studentDetailsOpen}
            onOpenChange={setStudentDetailsOpen}
            student={selectedStudent}
            onStudentUpdated={() => {
              queryClient.invalidateQueries({ queryKey: ['branch-students', branchId] });
            }}
          />
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle>Invoices & Payments</CardTitle>
                  <CardDescription>Last 20 invoices for this branch</CardDescription>
                </div>
                <div className="flex gap-2">
                  <CreateInvoiceDialog
                    trigger={
                      <Button size="sm">
                        <FileText className="w-4 h-4 mr-2" />
                        Create Invoice
                      </Button>
                    }
                    onInvoiceCreated={() => {
                      queryClient.invalidateQueries({ queryKey: ['branch-invoices', branchId] });
                      queryClient.invalidateQueries({ queryKey: ['outstanding-invoices', branchId] });
                    }}
                  />
                  <CreatePaymentDialog
                    trigger={
                      <Button size="sm" variant="outline">
                        <DollarSign className="w-4 h-4 mr-2" />
                        Record Payment
                      </Button>
                    }
                    onPaymentCreated={() => {
                      queryClient.invalidateQueries({ queryKey: ['branch-invoices', branchId] });
                      queryClient.invalidateQueries({ queryKey: ['outstanding-invoices', branchId] });
                    }}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No invoices found</p>
              ) : (
                <div className="space-y-3">
                  {invoices.slice(0, 20).map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{invoice.invoice_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(invoice.created_at), 'dd MMM yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${invoice.total_amount?.toFixed(2)}</p>
                        <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                          {invoice.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals">
          <Card>
            <CardHeader>
              <CardTitle>Pending Student Update Requests</CardTitle>
              <CardDescription>Review and approve student profile changes</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No pending requests</p>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map((request) => (
                    <Card key={request.id} className="border-orange-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{request.student_name}</p>
                            <p className="text-sm text-muted-foreground">
                              Requested {format(new Date(request.requested_at), 'dd MMM yyyy HH:mm')}
                            </p>
                            <div className="mt-2">
                              <p className="text-sm font-medium">Requested Changes:</p>
                              <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto max-w-md">
                                {JSON.stringify(request.requested_changes, null, 2)}
                              </pre>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600"
                              onClick={() => handleApproveRequest(request.id)}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600"
                              onClick={() => handleRejectRequest(request.id)}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grading">
          <BranchGradingList branchId={branchId} />
        </TabsContent>


        <TabsContent value="timetable">
          <BranchWeeklyTimetable branchId={branchId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BranchDashboard;
