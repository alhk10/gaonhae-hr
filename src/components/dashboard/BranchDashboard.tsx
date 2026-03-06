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
  DollarSign,
  Edit,
  Trash2,
  ShieldCheck,
  ExternalLink,
  Settings
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subMonths, isSameDay, startOfMonth, endOfMonth } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { toast } from 'sonner';
import { 
  getPendingRequestsByBranch, 
  approveRequest, 
  rejectRequest 
} from '@/services/studentUpdateRequestService';
import { useAuth } from '@/contexts/AuthContext';
import BranchWeeklyTimetable from './BranchWeeklyTimetable';
import BranchGradingList from './BranchGradingList';
import BranchCasualSchedule from './BranchCasualSchedule';
import CreateInvoiceDialog from '@/components/sales/CreateInvoiceDialog';
import CreatePaymentDialog from '@/components/sales/CreatePaymentDialog';
import ViewEditInvoiceDialog from '@/components/sales/ViewEditInvoiceDialog';
import ViewEditPaymentDialog from '@/components/sales/ViewEditPaymentDialog';
import { deleteInvoice } from '@/services/invoiceService';
import { createInvoiceDeletionRequest } from '@/services/invoiceDeletionRequestService';
import { deletePayment } from '@/services/paymentService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
import BranchClassTypeAgeSettings from './BranchClassTypeAgeSettings';
import { Student } from '@/services/studentService';
import NoticeManagementTab from '@/components/notices/NoticeManagementTab';
import BranchInventoryTab from './BranchInventoryTab';
import StudentRegistrationApprovals from './StudentRegistrationApprovals';
import NegativeInventoryAlert from './NegativeInventoryAlert';

interface BranchDashboardProps {
  branchId: string;
}

const BranchDashboard: React.FC<BranchDashboardProps> = ({ branchId }) => {
  const { user, userrole } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('students');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('unpaid');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentDetailsOpen, setStudentDetailsOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [invoiceDialogMode, setInvoiceDialogMode] = useState<'view' | 'edit'>('view');
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [paymentDialogMode, setPaymentDialogMode] = useState<'view' | 'edit'>('view');
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'invoice' | 'payment'; id: string; label: string } | null>(null);
  const [classTypeSettingsOpen, setClassTypeSettingsOpen] = useState(false);
  const [invoiceDateFilter, setInvoiceDateFilter] = useState<Date | undefined>(undefined);
  const [invoiceNameFilter, setInvoiceNameFilter] = useState('');
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

  // Fetch invoices for this branch with student names (last 6 months)
  const sixMonthsAgo = subMonths(new Date(), 6);
  const { data: invoices = [] } = useQuery({
    queryKey: ['branch-invoices', branchId, invoiceStatusFilter, 'last-6-months'],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select('*, students(first_name, last_name)')
        .eq('branch_id', branchId)
        .gte('created_at', sixMonthsAgo.toISOString())
        .order('created_at', { ascending: false });

      if (invoiceStatusFilter === 'unpaid') {
        query = query.in('status', ['draft', 'sent', 'unpaid', 'partial', 'overdue']);
      } else if (invoiceStatusFilter === 'paid') {
        query = query.in('status', ['paid', 'verified']);
      } else if (invoiceStatusFilter === 'cancelled') {
        query = query.eq('status', 'cancelled');
      } else if (invoiceStatusFilter === 'replaced') {
        query = query.eq('status', 'replaced');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!branchId,
  });

  // Fetch payments for this branch's invoices
  const { data: payments = [] } = useQuery({
    queryKey: ['branch-payments', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, invoices!inner(invoice_number, branch_id, students(first_name, last_name))')
        .eq('invoices.branch_id', branchId)
        .order('payment_date', { ascending: false });
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

  // Fetch grading list count and paid count (students with lesson invoices for current term)
  const { data: gradingMetrics = { total: 0, paid: 0 } } = useQuery({
    queryKey: ['grading-list-count', branchId, currentTerm?.id],
    queryFn: async () => {
      if (!currentTerm) return { total: 0, paid: 0 };
      
      // Get grading registrations with invoice info for this term's grading slots
      const { data: registrations } = await supabase
        .from('grading_registrations')
        .select(`
          id,
          student_id,
          invoice_item_id,
          grading_slots!inner (
            branch_id
          )
        `)
        .not('grading_slot_id', 'is', null);

      if (!registrations || registrations.length === 0) return { total: 0, paid: 0 };

      // Filter by branch
      const branchRegs = registrations.filter(
        r => (r.grading_slots as any)?.branch_id === branchId
      );

      // Get unique students (total)
      const allStudentIds = new Set(branchRegs.map(r => r.student_id));
      const total = allStudentIds.size;

      // Get invoice_item_ids to check payment status
      const itemIds = branchRegs
        .filter(r => r.invoice_item_id)
        .map(r => r.invoice_item_id as string);

      if (itemIds.length === 0) return { total, paid: 0 };

      // Check which invoice items belong to paid invoices
      const { data: paidItems } = await supabase
        .from('invoice_items')
        .select('id, invoices!inner(status, student_id)')
        .in('id', itemIds)
        .eq('invoices.status', 'paid');

      const paidStudentIds = new Set(
        (paidItems || []).map(item => (item.invoices as any).student_id)
      );

      return { total, paid: paidStudentIds.size };
    },
    enabled: !!branchId && !!currentTerm,
  });

  const gradingListCount = gradingMetrics.total;
  const gradingPaidCount = gradingMetrics.paid;

  // Check if casual employees have bookings this month
  const { data: hasCasualBookings = false } = useQuery({
    queryKey: ['casual-bookings-exists', branchId],
    queryFn: async () => {
      const now = new Date();
      const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
      const { count, error } = await supabase
        .from('slot_bookings' as any)
        .select('id', { count: 'exact', head: true })
        .eq('branch_id', branchId)
        .eq('status', 'approved')
        .gte('booking_date', monthStart)
        .lte('booking_date', monthEnd);
      if (error) return false;
      return (count || 0) > 0;
    },
    enabled: !!branchId,
  });

  const activeStudentsCount = activeStudentIds.length;
  const branchCurrency = branch?.currency || 'SGD';

  const unverifiedPayments = payments.filter(
    (p: any) => !p.is_verified && p.proof_of_payment_url && p.payment_method !== 'cash'
  );


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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'invoice') {
        if (userrole !== 'superadmin') {
          await createInvoiceDeletionRequest(deleteTarget.id);
          toast.success('Deletion request submitted for superadmin approval');
        } else {
          await deleteInvoice(deleteTarget.id);
          toast.success('Invoice deleted');
        }
      } else {
        await deletePayment(deleteTarget.id);
        toast.success('Payment deleted');
      }
      queryClient.invalidateQueries({ queryKey: ['branch-invoices', branchId] });
      queryClient.invalidateQueries({ queryKey: ['branch-payments', branchId] });
      queryClient.invalidateQueries({ queryKey: ['outstanding-invoices', branchId] });
    } catch (error: any) {
      toast.error(error?.message || `Failed to delete ${deleteTarget.type}`);
    } finally {
      setDeleteTarget(null);
    }
  };

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['branch-invoices', branchId] });
    queryClient.invalidateQueries({ queryKey: ['branch-payments', branchId] });
    queryClient.invalidateQueries({ queryKey: ['outstanding-invoices', branchId] });
  };

  return (
    <div className="space-y-6">
      <NegativeInventoryAlert branchId={branchId} />
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-2xl font-bold text-foreground">
          {branch?.name || 'Loading...'} Dashboard
        </h2>
        <Button variant="outline" size="sm" onClick={() => setClassTypeSettingsOpen(true)}>
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </Button>
      </div>

      {/* Class Type Age Settings Dialog */}
      <BranchClassTypeAgeSettings
        open={classTypeSettingsOpen}
        onOpenChange={setClassTypeSettingsOpen}
        branchId={branchId}
        branchName={branch?.name || ''}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="timetable" className="text-xs sm:text-sm">Weekly Timetable</TabsTrigger>
          <TabsTrigger value="students" className="text-xs sm:text-sm">Students ({activeStudentsCount})</TabsTrigger>
          <TabsTrigger value="invoices" className="text-xs sm:text-sm">Invoice & Payment ({formatCurrency(outstandingAmount, branchCurrency)})</TabsTrigger>
          <TabsTrigger value="grading" className="text-xs sm:text-sm">Grading ({gradingPaidCount}/{gradingListCount})</TabsTrigger>
          {hasCasualBookings && (
            <TabsTrigger value="casual-schedule" className="text-xs sm:text-sm">Casual Schedule</TabsTrigger>
          )}
          <TabsTrigger value="inventory" className="text-xs sm:text-sm">Inventory</TabsTrigger>
          <TabsTrigger value="notices" className="text-xs sm:text-sm">Notices</TabsTrigger>
          {(pendingRequests.length > 0 || unverifiedPayments.length > 0) && (
            <TabsTrigger value="approvals" className="text-xs sm:text-sm bg-orange-100 text-orange-700 font-semibold data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              Approvals ({pendingRequests.length + unverifiedPayments.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="students" className="space-y-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs sm:text-sm"
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-2 sm:px-3 text-xs sm:text-sm shrink-0">
                  <Filter className="w-3.5 h-3.5 mr-1" />
                  Filter
                  {statusFilter !== 'all' && (
                    <Badge variant="secondary" className="ml-1 text-[10px] px-1">{statusFilter}</Badge>
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="h-8 px-2 sm:px-3 text-xs sm:text-sm shrink-0">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span className="hidden sm:inline">Add Student/Trial</span>
                  <span className="sm:hidden">Add</span>
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
                    <div
                      key={student.id}
                      className="px-2 py-1.5 sm:px-3 sm:py-2 flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 hover:bg-muted/50 cursor-pointer text-sm"
                      onClick={() => {
                        setSelectedStudent(student as Student);
                        setStudentDetailsOpen(true);
                      }}
                    >
                      {/* Line 1: Name + badges */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-semibold uppercase tracking-wide truncate text-xs sm:text-sm sm:w-48 sm:shrink-0">
                          {student.first_name} {student.last_name}
                        </span>
                        <Badge variant={student.current_belt ? 'default' : 'outline'} className="text-[10px] sm:text-xs shrink-0">
                          {student.current_belt || 'No belt'}
                        </Badge>
                        <Badge variant={student.status === 'Active' ? 'default' : 'secondary'} className="text-[10px] sm:text-xs capitalize shrink-0">
                          {student.status}
                        </Badge>
                      </div>
                      {/* Line 2: Contact info */}
                      <div className="flex items-center gap-2 text-muted-foreground text-[11px] sm:text-xs sm:flex-1 min-w-0">
                        <span className="truncate">{student.phone || '—'}</span>
                        <span className="hidden sm:inline">·</span>
                        <span className="truncate">{student.email || '—'}</span>
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
            branchId={branchId}
            onStudentUpdated={() => {
              queryClient.invalidateQueries({ queryKey: ['branch-students', branchId] });
            }}
            onViewInvoice={(invoiceId) => {
              setStudentDetailsOpen(false);
              setSelectedInvoiceId(invoiceId);
              setInvoiceDialogMode('view');
              setInvoiceDialogOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader className="px-3 py-3 sm:px-6 sm:py-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-sm sm:text-base">Invoices & Payments</CardTitle>
                <div className="flex gap-1.5 sm:gap-2 items-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 text-xs">
                        <Filter className="w-3.5 h-3.5 mr-1" />
                        {invoiceStatusFilter === 'unpaid' ? 'Unpaid' : invoiceStatusFilter === 'paid' ? 'Paid' : invoiceStatusFilter === 'cancelled' ? 'Cancelled' : 'Replaced'}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Invoice Status</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setInvoiceStatusFilter('unpaid')}>Unpaid</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setInvoiceStatusFilter('paid')}>Paid</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setInvoiceStatusFilter('cancelled')}>Cancelled</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setInvoiceStatusFilter('replaced')}>Replaced</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <CreateInvoiceDialog
                    trigger={
                      <Button size="sm" className="h-7 text-xs">
                        <FileText className="w-3.5 h-3.5 mr-1" />
                        <span className="hidden sm:inline">Create Invoice</span>
                        <span className="sm:hidden">Create</span>
                      </Button>
                    }
                    branchId={branchId}
                    onInvoiceCreated={() => {
                      queryClient.invalidateQueries({ queryKey: ['branch-invoices', branchId] });
                      queryClient.invalidateQueries({ queryKey: ['outstanding-invoices', branchId] });
                    }}
                  />
                </div>
              </div>
              {/* Name & Date filter row */}
              <div className="flex items-center gap-1.5 mt-2">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                  <Input
                    placeholder="Search name..."
                    value={invoiceNameFilter}
                    onChange={(e) => setInvoiceNameFilter(e.target.value)}
                    className="pl-8 h-7 text-xs"
                  />
                </div>
                <DatePicker
                  selected={invoiceDateFilter}
                  onSelect={setInvoiceDateFilter}
                  placeholder="Date"
                  className="h-7 text-xs w-[130px] sm:w-[160px]"
                />
                {(invoiceNameFilter || invoiceDateFilter) && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs px-2 shrink-0" onClick={() => { setInvoiceNameFilter(''); setInvoiceDateFilter(undefined); }}>
                    Clear
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Invoices Section */}
              <div>
                
                {(() => {
                  const filteredInvoices = invoices.filter((invoice: any) => {
                    const studentName = invoice.students
                      ? `${invoice.students.first_name} ${invoice.students.last_name}`
                      : '';
                    const matchesName = !invoiceNameFilter || studentName.toLowerCase().includes(invoiceNameFilter.toLowerCase());
                    const matchesDate = !invoiceDateFilter || isSameDay(new Date(invoice.created_at), invoiceDateFilter);
                    return matchesName && matchesDate;
                  });
                  return filteredInvoices.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No invoices found</p>
                  ) : (
                    <div className="space-y-1.5">
                      {filteredInvoices.map((invoice: any) => {
                        const studentName = invoice.students
                          ? `${invoice.students.first_name} ${invoice.students.last_name}`.toUpperCase()
                          : 'Unknown';
                        return (
                          <div key={invoice.id} className="px-2 py-1.5 bg-muted/50 rounded-lg">
                            {/* Line 1: Student name, amount, status, actions */}
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-xs truncate min-w-0">{studentName}</span>
                              <span className="font-medium text-xs whitespace-nowrap ml-auto">${invoice.total_amount?.toFixed(2)}</span>
                              <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'} className="text-[10px] px-1 h-4 shrink-0">
                                {invoice.status}
                              </Badge>
                              <div className="flex items-center shrink-0">
                                <Button variant="ghost" size="icon" className="h-6 w-6" title="View" onClick={() => { setSelectedInvoiceId(invoice.id); setInvoiceDialogMode('view'); setInvoiceDialogOpen(true); }}>
                                  <Eye className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6" title="Edit" onClick={() => { setSelectedInvoiceId(invoice.id); setInvoiceDialogMode('edit'); setInvoiceDialogOpen(true); }}>
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" title="Delete" onClick={() => setDeleteTarget({ type: 'invoice', id: invoice.id, label: invoice.invoice_number })}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                            {/* Line 2: Invoice number + date */}
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span>{invoice.invoice_number}</span>
                              <span>·</span>
                              <span>{format(new Date(invoice.created_at), 'dd MMM yyyy')}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

            </CardContent>
          </Card>

        </TabsContent>

        <TabsContent value="notices" className="mt-4">
          <NoticeManagementTab role="branch" branchId={branchId} userEmail={user?.email || ''} />
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4">
          {/* Payment Verification Section */}
          {unverifiedPayments.length > 0 && (
            <div className="border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-orange-600" />
                <h4 className="font-medium text-foreground">Payment Verification</h4>
                <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                  {unverifiedPayments.length} pending
                </Badge>
              </div>
              <div className="space-y-2">
                {unverifiedPayments.map((payment: any) => (
                  <div key={payment.id} className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                    <a href={payment.proof_of_payment_url} target="_blank" rel="noopener noreferrer" className="shrink-0 w-[100px] sm:w-[252px] rounded border overflow-hidden hover:opacity-80 transition-opacity cursor-pointer">
                      <img src={payment.proof_of_payment_url} alt="Payment proof" className="w-full h-auto object-contain" />
                    </a>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">{payment.invoices?.invoice_number || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">
                        {payment.invoices?.students ? `${payment.invoices.students.first_name} ${payment.invoices.students.last_name}` : 'Unknown'}{' '}
                        · ${payment.amount?.toFixed(2)} · {format(new Date(payment.payment_date), 'dd MMM yyyy')} ·{' '}
                        <span className="capitalize">{payment.payment_method?.replace('_', ' ')}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" className="text-xs h-7" onClick={async () => {
                        try {
                          const { error: paymentError } = await supabase.from('payments').update({ is_verified: true, verified_by: user?.employeeId || null, verified_at: new Date().toISOString() }).eq('id', payment.id);
                          if (paymentError) throw paymentError;
                          if (payment.invoice_id) {
                            const { error: invoiceError } = await supabase.from('invoices').update({ status: 'verified' }).eq('id', payment.invoice_id).eq('status', 'paid');
                            if (invoiceError) throw invoiceError;
                          }
                          queryClient.invalidateQueries({ queryKey: ['branch-payments', branchId] });
                          queryClient.invalidateQueries({ queryKey: ['branch-invoices', branchId] });
                          toast.success('Payment verified successfully');
                        } catch (error) {
                          toast.error('Failed to verify payment');
                        }
                      }}>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verify
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <StudentRegistrationApprovals branchId={branchId} />

          {pendingRequests.length > 0 && (
            <Card>
              <CardContent className="pt-6">
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
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="grading">
          <BranchGradingList branchId={branchId} />
        </TabsContent>

        <TabsContent value="casual-schedule">
          <BranchCasualSchedule branchId={branchId} />
        </TabsContent>
        <TabsContent value="timetable">
          <BranchWeeklyTimetable branchId={branchId} />
        </TabsContent>
        <TabsContent value="inventory">
          <BranchInventoryTab branchId={branchId} />
        </TabsContent>
      </Tabs>

      {/* Invoice View/Edit Dialog */}
      {selectedInvoiceId && (
        <ViewEditInvoiceDialog
          invoiceId={selectedInvoiceId}
          open={invoiceDialogOpen}
          onOpenChange={(open) => { setInvoiceDialogOpen(open); if (!open) setSelectedInvoiceId(null); }}
          onInvoiceUpdated={refreshData}
          initialMode={invoiceDialogMode}
        />
      )}

      {/* Payment View/Edit Dialog */}
      {selectedPaymentId && (
        <ViewEditPaymentDialog
          paymentId={selectedPaymentId}
          open={paymentDialogOpen}
          onOpenChange={(open) => { setPaymentDialogOpen(open); if (!open) setSelectedPaymentId(null); }}
          onPaymentUpdated={refreshData}
          initialMode={paymentDialogMode}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.type === 'invoice' && userrole !== 'superadmin' ? 'Request Deletion?' : `Delete ${deleteTarget?.type}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === 'invoice' && userrole !== 'superadmin'
                ? `This will submit a deletion request for invoice "${deleteTarget?.label}" to the superadmin for approval.`
                : `Are you sure you want to delete ${deleteTarget?.type} "${deleteTarget?.label}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteTarget?.type === 'invoice' && userrole !== 'superadmin' ? 'Submit Request' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BranchDashboard;
