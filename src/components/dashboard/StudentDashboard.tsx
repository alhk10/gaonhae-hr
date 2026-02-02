import React, { useState } from 'react';
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
  LogOut
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { createUpdateRequest, getStudentRequests } from '@/services/studentUpdateRequestService';
import { useAuth } from '@/contexts/AuthContext';
import StudentClassSchedule from './StudentClassSchedule';

interface StudentDashboardProps {
  studentId?: string;
  isSimulated?: boolean;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ studentId: propStudentId, isSimulated = false }) => {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Record<string, any>>({});

  // Use prop studentId or get from current user
  const studentId = propStudentId || user?.studentId;

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

  // Calculate stats
  const totalSessions = entitlements.reduce((sum, e) => sum + (e.sessions_remaining || 0), 0);
  const outstandingBalance = invoices
    .filter(inv => inv.status !== 'paid')
    .reduce((sum, inv) => sum + (inv.balance_due || 0), 0);

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

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Student Portal - {student.first_name} {student.last_name}
          </h2>
          <p className="text-muted-foreground">
            Manage your profile, view invoices, and track your progress
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSimulated && (
            <Badge variant="outline">Viewing as Admin</Badge>
          )}
          {!isSimulated && (
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
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
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sessions Remaining</p>
                <p className="text-2xl font-bold">{totalSessions}</p>
              </div>
              <div className="bg-blue-500 p-3 rounded-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Outstanding Balance</p>
                <p className="text-2xl font-bold">${outstandingBalance.toFixed(2)}</p>
              </div>
              <div className={`${outstandingBalance > 0 ? 'bg-orange-500' : 'bg-green-500'} p-3 rounded-lg`}>
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current Belt</p>
                <p className="text-2xl font-bold">{student.current_belt || 'Not set'}</p>
              </div>
              <div className="bg-purple-500 p-3 rounded-lg">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="profile">My Profile</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="schedule">Class Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
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
                    {invoices.slice(0, 3).map((invoice) => (
                      <div key={invoice.id} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                        <div>
                          <p className="font-medium text-sm">{invoice.invoice_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(invoice.created_at), 'dd MMM yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${invoice.total_amount?.toFixed(2)}</p>
                          <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'} className="text-xs">
                            {invoice.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="profile">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>My Profile</CardTitle>
                <CardDescription>
                  {isEditing 
                    ? 'Edit your profile details. Changes will be submitted for approval.'
                    : 'View and update your personal information'}
                </CardDescription>
              </div>
              {!isEditing ? (
                <Button onClick={handleStartEdit} disabled={hasPendingRequest}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCancelEdit}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSaveEdit} disabled={submitUpdateMutation.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    Submit for Approval
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
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
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

        <TabsContent value="schedule">
          <StudentClassSchedule 
            studentId={studentId!} 
            branchId={student?.branch_id} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudentDashboard;
