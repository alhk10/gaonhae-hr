import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  GraduationCap, 
  DollarSign, 
  Calendar, 
  AlertCircle,
  Edit,
  Save,
  X,
  LogOut,
  FileText,
  Loader2,
  CreditCard,
  
} from 'lucide-react';
import CreatePaymentDialog from '@/components/sales/CreatePaymentDialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { createUpdateRequest, getStudentRequests } from '@/services/studentUpdateRequestService';

import { getActiveTermsForSelection } from '@/services/termCalendarService';
import { getGradingSlots } from '@/services/gradingService';
import { useAuth } from '@/contexts/AuthContext';
import StudentMyClassSchedule from './StudentMyClassSchedule';
import QuickActionsSection from './QuickActionsSection';

import PaySchoolFeesDialog from './PaySchoolFeesDialog';
import PayGradingDialog from './PayGradingDialog';
import { downloadInvoicePDF, InvoiceData, InvoiceItem } from '@/utils/invoicePDFGenerator';
import UnpaidInvoiceReminderDialog from './UnpaidInvoiceReminderDialog';
import { useIsMobile } from '@/hooks/use-mobile';

interface StudentDashboardProps {
  studentId?: string;
  isSimulated?: boolean;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ studentId: propStudentId, isSimulated = false }) => {
  const { user, userDetails, logout, linkedStudents } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Record<string, any>>({});
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
  const [showSchoolFeesDialog, setShowSchoolFeesDialog] = useState(false);
  const [showGradingDialog, setShowGradingDialog] = useState(false);
  const [showUnpaidReminder, setShowUnpaidReminder] = useState(false);

  // Priority: propStudentId > user.studentId > userDetails.id
  const studentId = propStudentId || user?.studentId || userDetails?.id;
  const hasMultipleStudents = linkedStudents && linkedStudents.length > 1;
  
  console.log('StudentDashboard: Initializing with', { 
    propStudentId, 
    userStudentId: user?.studentId, 
    userDetailsId: userDetails?.id,
    resolvedStudentId: studentId,
    linkedStudentsCount: linkedStudents?.length,
    hasMultipleStudents
  });

  // Fetch student data
  const { data: student, isLoading: studentLoading } = useQuery({
    queryKey: ['student', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!studentId,
  });

  // Fetch student invoices
  const { data: invoices = [] } = useQuery({
    queryKey: ['student-invoices', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!studentId,
  });

  // Fetch student entitlements
  const { data: entitlements = [] } = useQuery({
    queryKey: ['student-entitlements', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entitlements')
        .select('*')
        .eq('student_id', studentId)
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!studentId,
  });

  // Fetch pending update requests
  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['student-update-requests', studentId],
    queryFn: () => getStudentRequests(studentId!),
    enabled: !!studentId,
  });


  // Fetch available terms for PaySchoolFeesDialog
  const { data: availableTerms = [] } = useQuery({
    queryKey: ['available-terms-for-student', student?.branch_id],
    queryFn: async () => {
      if (!student?.branch_id) return [];
      const terms = await getActiveTermsForSelection();
      return terms.filter(t => t.branch_id === student.branch_id);
    },
    enabled: !!student?.branch_id,
  });

  // Fetch previous enrollment
  const { data: previousEnrollment } = useQuery({
    queryKey: ['student-previous-enrollment', studentId, student?.branch_id],
    queryFn: async () => {
      if (!student?.branch_id) return null;
      const { data } = await supabase
        .from('student_class_enrollments')
        .select('*')
        .eq('student_id', studentId!)
        .eq('branch_id', student.branch_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!student?.branch_id && !!studentId,
  });

  // Fetch grading slots
  const { data: gradingSlots = [] } = useQuery({
    queryKey: ['grading-slots-for-belt', student?.branch_id, student?.current_belt],
    queryFn: async () => {
      if (!student?.branch_id || !student?.current_belt) return [];
      const today = new Date().toISOString().split('T')[0];
      return getGradingSlots({
        branch_id: student.branch_id,
        status: 'active',
        from_date: today,
      });
    },
    enabled: !!student?.branch_id && !!student?.current_belt,
  });

  // Calculate stats
  const totalSessions = entitlements.reduce((sum, e) => sum + (e.sessions_remaining || 0), 0);
  const outstandingBalance = invoices
    .filter(inv => inv.status !== 'paid')
    .reduce((sum, inv) => sum + (inv.balance_due || 0), 0);

  const unpaidInvoices = invoices.filter(inv => inv.status !== 'paid' && inv.balance_due > 0);

  // Show unpaid invoice reminder when portal loads with unpaid invoices
  useEffect(() => {
    if (unpaidInvoices.length > 0 && !studentLoading) {
      setShowUnpaidReminder(true);
    }
  }, [studentLoading, invoices.length]);

  // Submit profile update request
  const submitUpdateMutation = useMutation({
    mutationFn: async (changes: Record<string, any>) => {
      if (!studentId) throw new Error('No student ID');
      return createUpdateRequest(studentId, changes);
    },
    onSuccess: () => {
      toast.success('Profile update request submitted for approval');
      setIsEditing(false);
      setEditedProfile({});
      queryClient.invalidateQueries({ queryKey: ['student-update-requests', studentId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to submit update request');
    },
  });

  const handleStartEdit = () => {
    setEditedProfile({
      phone: student?.phone || '',
      email: student?.email || '',
      address: student?.address || '',
      postal_code: student?.postal_code || '',
      emergency_contact_name: student?.emergency_contact_name || '',
      emergency_contact_phone: student?.emergency_contact_phone || '',
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedProfile({});
  };

  const handleSaveEdit = () => {
    // Only include changed fields
    const changes: Record<string, any> = {};
    Object.keys(editedProfile).forEach(key => {
      if (editedProfile[key] !== (student as any)?.[key]) {
        changes[key] = editedProfile[key];
      }
    });

    if (Object.keys(changes).length === 0) {
      toast.info('No changes to submit');
      return;
    }

    submitUpdateMutation.mutate(changes);
  };

  const hasPendingRequest = pendingRequests.some(r => r.status === 'pending');

  if (studentLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <GraduationCap className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Student not found</p>
        </CardContent>
      </Card>
    );
  }

  const handleLogout = async () => {
    await logout();
  };

  const handleViewPDF = async (invoiceId: string) => {
    try {
      setGeneratingPdfId(invoiceId);
      
      // Fetch full invoice data with items
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();
      
      if (invoiceError) throw invoiceError;
      
      // Fetch invoice items
      const { data: items, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId);
      
      if (itemsError) throw itemsError;
      
      // Get branch details to determine country for template matching
      const branchId = invoiceData.branch_id || student?.branch_id;
      let branchCountry = 'Singapore';
      
      if (branchId) {
        const { data: branchData } = await supabase
          .from('branches')
          .select('country')
          .eq('id', branchId)
          .single();
        if (branchData?.country) {
          branchCountry = branchData.country;
        }
      }

      // Find matching template by country code (same logic as admin page)
      const countryCode = branchCountry === 'Australia' ? 'AU' : 'SG';
      const { data: templates } = await supabase
        .from('invoice_templates')
        .select('letterhead_url, paynow_qr_url, country, default_notes, footer_text')
        .eq('country', countryCode)
        .eq('is_active', true)
        .limit(1);
      
      const template = templates?.[0] || null;

      // Collect term_ids and grading_slot_ids from items for additional info
      const termIds: string[] = [];
      const gradingSlotIds: string[] = [];
      
      items?.forEach(item => {
        const metadata = item.metadata as { term_id?: string; grading_slot_id?: string } | null;
        if (metadata?.term_id) termIds.push(metadata.term_id);
        if (metadata?.grading_slot_id) gradingSlotIds.push(metadata.grading_slot_id);
      });

      // Fetch term calendar data
      const termMap: Record<string, { name: string; start_date: string; end_date: string }> = {};
      if (termIds.length > 0) {
        const { data: termsData } = await supabase
          .from('term_calendars')
          .select('id, name, start_date, end_date')
          .in('id', termIds);
        
        termsData?.forEach(term => {
          termMap[term.id] = {
            name: term.name,
            start_date: term.start_date,
            end_date: term.end_date
          };
        });
      }

      // Fetch grading slot data
      const gradingMap: Record<string, { grading_date: string; start_time: string | null }> = {};
      if (gradingSlotIds.length > 0) {
        const { data: gradingData } = await supabase
          .from('grading_slots')
          .select('id, grading_date, start_time')
          .in('id', gradingSlotIds);
        
        gradingData?.forEach(slot => {
          gradingMap[slot.id] = {
            grading_date: slot.grading_date,
            start_time: slot.start_time
          };
        });
      }

      // Format date helpers (same as admin page)
      const formatShortDate = (dateStr: string) => {
        try {
          const date = new Date(dateStr);
          return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        } catch {
          return dateStr;
        }
      };

      const formatFullDate = (dateStr: string) => {
        try {
          const date = new Date(dateStr);
          return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch {
          return dateStr;
        }
      };

      const formatTime = (timeStr: string | null) => {
        if (!timeStr) return '';
        return timeStr.substring(0, 5);
      };
      
      // Build invoice data for PDF (matching admin page format)
      const pdfData: InvoiceData = {
        id: invoiceData.id,
        invoice_number: invoiceData.invoice_number,
        issue_date: invoiceData.issue_date,
        due_date: invoiceData.due_date,
        subtotal: invoiceData.subtotal || 0,
        tax_amount: invoiceData.tax_amount || 0,
        discount_amount: invoiceData.discount_amount || 0,
        total_amount: invoiceData.total_amount || 0,
        amount_paid: invoiceData.amount_paid || 0,
        balance_due: invoiceData.balance_due || 0,
        notes: invoiceData.notes,
        status: invoiceData.status,
        student: student ? {
          name: `${student.first_name} ${student.last_name}`,
          address: student.address,
          phone: student.phone,
          email: student.email,
        } : undefined,
        items: items?.map((item): InvoiceItem => {
          const metadata = item.metadata as { term_id?: string; grading_slot_id?: string } | null;
          let term_info: string | undefined;
          let grading_info: string | undefined;

          // Build term info string
          if (metadata?.term_id && termMap[metadata.term_id]) {
            const term = termMap[metadata.term_id];
            term_info = `${term.name} (${formatShortDate(term.start_date)} - ${formatShortDate(term.end_date)})`;
          }

          // Build grading info string
          if (metadata?.grading_slot_id && gradingMap[metadata.grading_slot_id]) {
            const slot = gradingMap[metadata.grading_slot_id];
            const timeStr = formatTime(slot.start_time);
            grading_info = timeStr 
              ? `${formatFullDate(slot.grading_date)} at ${timeStr}`
              : formatFullDate(slot.grading_date);
          }

          return {
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_amount: item.total_amount,
            tax_rate: item.tax_rate || 0,
            tax_amount: item.tax_amount || 0,
            metadata,
            term_info,
            grading_info
          };
        }) || [],
        template: template ? {
          letterhead_url: template.letterhead_url || undefined,
          paynow_qr_url: template.paynow_qr_url || undefined,
          country: template.country || undefined,
          default_notes: template.default_notes || undefined,
          footer_text: template.footer_text || undefined
        } : undefined,
      };
      
      await downloadInvoicePDF(pdfData);
      toast.success('Invoice PDF downloaded');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setGeneratingPdfId(null);
    }
  };

  return (
    <div className={`space-y-4 md:space-y-6 ${isMobile ? 'p-3' : 'p-6'} max-w-6xl mx-auto`}>
      {/* Header */}
      <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center justify-between'}`}>
        <div className="min-w-0">
          <h2 className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-foreground`}>
            {isMobile ? 'Student Portal' : `Student Portal - ${student.first_name} ${student.last_name}`}
          </h2>
          {isMobile && (
            <p className="text-sm font-medium text-foreground">{student.first_name} {student.last_name}</p>
          )}
          <p className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
            Manage your profile, view invoices, and track your progress
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isSimulated && (
            <Badge variant="outline">Viewing as Admin</Badge>
          )}
          {!isSimulated && (
            <Button variant="outline" size={isMobile ? 'sm' : 'default'} onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" />
              Logout
            </Button>
          )}
        </div>
      </div>

      {/* Pending Changes Alert */}
      {hasPendingRequest && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-800">Pending Profile Update</p>
                <p className="text-sm text-orange-700">
                  Your profile update is awaiting approval from the branch manager.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className={`${isMobile ? 'p-3' : 'p-6'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sessions Remaining</p>
                <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>{totalSessions}</p>
              </div>
              <div className="bg-blue-500 p-3 rounded-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className={`${isMobile ? 'p-3' : 'p-6'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Outstanding Balance</p>
                <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>${outstandingBalance.toFixed(2)}</p>
              </div>
              <div className={`${outstandingBalance > 0 ? 'bg-orange-500' : 'bg-green-500'} p-3 rounded-lg`}>
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className={`${isMobile ? 'p-3' : 'p-6'}`}>
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-muted-foreground">Current Belt</p>
                <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold truncate`}>{student.current_belt || 'Not set'}</p>
              </div>
              <div className="bg-purple-500 p-3 rounded-lg flex-shrink-0">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={`w-full flex-nowrap ${isMobile ? 'text-xs' : ''}`}>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="profile">{isMobile ? 'Profile' : 'My Profile'}</TabsTrigger>
          <TabsTrigger value="invoices">
            Invoices{invoices.filter(inv => inv.status !== 'paid').length > 0 && ` (${invoices.filter(inv => inv.status !== 'paid').length})`}
          </TabsTrigger>
          <TabsTrigger value="schedule">{isMobile ? 'My Classes' : 'My Classes'}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Quick Actions */}
          <QuickActionsSection
            studentId={studentId!}
            student={{
              id: student.id,
              first_name: student.first_name,
              last_name: student.last_name,
              branch_id: student.branch_id,
              current_belt: student.current_belt,
              date_of_birth: student.date_of_birth,
            }}
            onOpenSchoolFees={() => setShowSchoolFeesDialog(true)}
            onOpenGrading={() => setShowGradingDialog(true)}
            
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Quick Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Student Number</span>
                  <span className="font-medium">{student.student_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge>{student.status}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Enrolled Since</span>
                  <span className="font-medium">
                    {student.enrollment_date ? format(new Date(student.enrollment_date), 'dd MMM yyyy') : 'N/A'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No invoices yet</p>
                ) : (
                  <div className="space-y-2">
                    {invoices.slice(0, 3).map((invoice) => {
                      const displayStatus = invoice.status === 'draft' ? 'unpaid' : invoice.status;
                      const isPaid = invoice.status === 'paid';
                      return (
                        <div key={invoice.id} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                          <div>
                            <p className="font-medium text-sm">{invoice.invoice_number}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(invoice.created_at), 'dd MMM yyyy')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p className="font-medium">${invoice.total_amount?.toFixed(2)}</p>
                              <Badge 
                                variant={isPaid ? 'default' : 'destructive'} 
                                className={`text-xs ${isPaid ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}
                              >
                                {displayStatus}
                              </Badge>
                            </div>
                            {!isPaid && invoice.balance_due > 0 && (
                              <CreatePaymentDialog
                                trigger={
                                  <Button variant="outline" size="sm">
                                    <CreditCard className="w-3 h-3" />
                                  </Button>
                                }
                                preSelectedInvoiceId={invoice.id}
                                onPaymentCreated={() => queryClient.invalidateQueries({ queryKey: ['student-invoices', studentId] })}
                                isStudentPortal={true}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="profile">
          <Card>
            <CardHeader className={`flex ${isMobile ? 'flex-col gap-3' : 'flex-row items-center justify-between'}`}>
              <div>
                <CardTitle>My Profile</CardTitle>
                <CardDescription>
                  {isEditing 
                    ? 'Edit your profile details. Changes will be submitted for approval.'
                    : 'View and update your personal information'}
                </CardDescription>
              </div>
              {!isEditing ? (
                <Button onClick={handleStartEdit} disabled={hasPendingRequest} size={isMobile ? 'sm' : 'default'}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <div className={`flex gap-2 ${isMobile ? 'flex-col' : ''}`}>
                  <Button variant="outline" onClick={handleCancelEdit} size={isMobile ? 'sm' : 'default'}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSaveEdit} disabled={submitUpdateMutation.isPending} size={isMobile ? 'sm' : 'default'}>
                    <Save className="w-4 h-4 mr-2" />
                    {isMobile ? 'Submit' : 'Submit for Approval'}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  <Input value={student.first_name || ''} disabled />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input value={student.last_name || ''} disabled />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input 
                    value={isEditing ? editedProfile.email : (student.email || '')} 
                    disabled={!isEditing}
                    onChange={(e) => setEditedProfile({ ...editedProfile, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input 
                    value={isEditing ? editedProfile.phone : (student.phone || '')} 
                    disabled={!isEditing}
                    onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Address</Label>
                  <Textarea 
                    value={isEditing ? editedProfile.address : (student.address || '')} 
                    disabled={!isEditing}
                    onChange={(e) => setEditedProfile({ ...editedProfile, address: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Postal Code</Label>
                  <Input 
                    value={isEditing ? editedProfile.postal_code : (student.postal_code || '')} 
                    disabled={!isEditing}
                    onChange={(e) => setEditedProfile({ ...editedProfile, postal_code: e.target.value })}
                  />
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-3">Emergency Contact</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Contact Name</Label>
                    <Input 
                      value={isEditing ? editedProfile.emergency_contact_name : (student.emergency_contact_name || '')} 
                      disabled={!isEditing}
                      onChange={(e) => setEditedProfile({ ...editedProfile, emergency_contact_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Contact Phone</Label>
                    <Input 
                      value={isEditing ? editedProfile.emergency_contact_phone : (student.emergency_contact_phone || '')} 
                      disabled={!isEditing}
                      onChange={(e) => setEditedProfile({ ...editedProfile, emergency_contact_phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>My Invoices</CardTitle>
              <CardDescription>View all your invoices and payment history</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No invoices found</p>
              ) : (
                <div className="space-y-3">
                  {invoices.map((invoice) => {
                    const displayStatus = invoice.status === 'draft' ? 'unpaid' : invoice.status;
                    const isPaid = invoice.status === 'paid';
                    return (
                      <div key={invoice.id} className={`flex items-center justify-between ${isMobile ? 'p-2 gap-2' : 'p-4'} border rounded-lg`}>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{invoice.invoice_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(invoice.created_at), 'dd MMM yyyy')}
                          </p>
                        </div>
                          <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-3'} flex-shrink-0`}>
                          <div className="text-right">
                            <p className="font-medium">${invoice.total_amount?.toFixed(2)}</p>
                            <Badge 
                              variant={isPaid ? 'default' : 'destructive'} 
                              className={isPaid ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}
                            >
                              {displayStatus}
                            </Badge>
                          </div>
                          {!isPaid && invoice.balance_due > 0 && (
                            <CreatePaymentDialog
                              trigger={
                                <Button variant="default" size="sm">
                                  <CreditCard className="w-4 h-4 mr-1" />
                                  Pay
                                </Button>
                              }
                              preSelectedInvoiceId={invoice.id}
                              onPaymentCreated={() => queryClient.invalidateQueries({ queryKey: ['student-invoices', studentId] })}
                              isStudentPortal={true}
                            />
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewPDF(invoice.id)}
                            disabled={generatingPdfId === invoice.id}
                          >
                            {generatingPdfId === invoice.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <StudentMyClassSchedule 
            studentId={studentId!} 
            branchId={student?.branch_id} 
          />
        </TabsContent>

      </Tabs>

      {/* Dialogs */}
      {showSchoolFeesDialog && (
        <PaySchoolFeesDialog
          open={showSchoolFeesDialog}
          onOpenChange={setShowSchoolFeesDialog}
          studentId={studentId!}
          student={{
            id: student.id,
            first_name: student.first_name,
            last_name: student.last_name,
            branch_id: student.branch_id,
            date_of_birth: student.date_of_birth,
          }}
          availableTerms={availableTerms}
          previousEnrollment={previousEnrollment}
        />
      )}

      {showGradingDialog && (
        <PayGradingDialog
          open={showGradingDialog}
          onOpenChange={setShowGradingDialog}
          studentId={studentId!}
          student={{
            id: student.id,
            first_name: student.first_name,
            last_name: student.last_name,
            branch_id: student.branch_id,
            current_belt: student.current_belt,
          }}
          gradingSlots={gradingSlots}
        />
      )}

      <UnpaidInvoiceReminderDialog
        open={showUnpaidReminder}
        onOpenChange={setShowUnpaidReminder}
        unpaidInvoices={unpaidInvoices}
        studentId={studentId!}
        onGoToInvoices={() => setActiveTab('invoices')}
      />
    </div>
  );
};

export default StudentDashboard;
