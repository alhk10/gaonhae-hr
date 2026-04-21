/**
 * Casual Employee Details Page
 * Comprehensive view of casual employee information with sections for:
 * - Contact Information
 * - Qualifications & Certifications
 * - Claims History
 * - Slot Booking History
 * - Attendance History
 * - Payroll History
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import AuthGuard from '@/components/auth/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/sonner';
import { getEmployeeById, updateEmployee, deleteEmployee } from '@/services/employeeService';
import { getEmployeeSlotBookings } from '@/services/slotBookingService';
import { createSingleSupabaseAuthUser } from '@/services/bulkUserCreationService';
import { EmployeeProfile } from '@/types/employee';
import { ArrowLeft, User, Award, FileText, Calendar, Briefcase, Clock } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AdminAccessManager from '@/components/employee/AdminAccessManager';
import LocationExceptionManager from '@/components/employee/LocationExceptionManager';
import EmployeeQualificationsManager from '@/components/employee/EmployeeQualificationsManager';
import { updateEmployeeAdminAccess, updateEmployeePageAccess } from '@/services/employeeService';
import EmployeeClaimHistory from '@/components/employee/EmployeeClaimHistory';
import EmployeePayrollHistory from '@/components/employee/EmployeePayrollHistory';
import SlotBookingHistory from '@/components/employee/SlotBookingHistory';
import { AdminAccessPermissions, EmployeePageAccessPermissions, EmployeeQualifications } from '@/types/employee';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/utils/dateFormat';

const CasualEmployeeDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, userrole } = useAuth();
  const isSuperAdmin = userrole === 'superadmin';
  const [searchParams, setSearchParams] = useSearchParams();

  const [isEditing, setIsEditing] = useState(false);
  const [employeeData, setEmployeeData] = useState<EmployeeProfile | null>(null);
  const [authAccountStatus, setAuthAccountStatus] = useState<'checking' | 'exists' | 'missing' | 'error'>('checking');
  const [isEmailConfirmed, setIsEmailConfirmed] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState('contact');
  const [adminAccess, setAdminAccess] = useState<AdminAccessPermissions>({
    employees: false,
    payroll: false,
    leaveManagement: false,
    claims: false,
    attendance: false,
    slotBooking: false,
    reports: false
  });
  const [pageAccess, setPageAccess] = useState<EmployeePageAccessPermissions>({
    profile: true,
    applyLeave: true,
    submitClaim: true,
    payslips: true,
    myAttendance: true,
    slotBookingEmployee: true
    cctvMonitoring: false
  });
  const [qualifications, setQualifications] = useState<EmployeeQualifications>({});

  // Check for edit parameter on load
  useEffect(() => {
    const editParam = searchParams.get('edit');
    if (editParam === 'true') {
      setIsEditing(true);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const { data: employee, isLoading, error } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => getEmployeeById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  // Load slot bookings for this employee
  const { data: slotBookings = [], isLoading: slotBookingsLoading } = useQuery({
    queryKey: ['employee-slot-bookings', id],
    queryFn: () => getEmployeeSlotBookings(id!),
    enabled: !!id && activeTab === 'slots',
    staleTime: 5 * 60 * 1000,
  });

  // Check auth account status
  const checkAuthAccountStatus = async (email: string) => {
    if (!email) {
      setAuthAccountStatus('missing');
      return;
    }

    try {
      setAuthAccountStatus('checking');
      const { data, error } = await supabase.functions.invoke('auth-admin', {
        body: { action: 'check_user', email }
      });
      
      if (error || (data as any)?.error) {
        console.error('Error checking auth account:', error || (data as any)?.error);
        setAuthAccountStatus('error');
        return;
      }

      const userExists = Boolean((data as any)?.exists);
      setAuthAccountStatus(userExists ? 'exists' : 'missing');
      setIsEmailConfirmed((data as any)?.confirmed || false);
    } catch (error) {
      console.error('Error checking auth account:', error);
      setAuthAccountStatus('error');
    }
  };

  useEffect(() => {
    if (employee) {
      // Redirect if this is not a casual employee
      if (employee.type !== 'Casual') {
        navigate(`/parties/fulltime/${id}`);
        return;
      }
      
      setEmployeeData(employee);
      setAdminAccess(employee.adminAccess || {
        employees: false,
        payroll: false,
        leaveManagement: false,
        claims: false,
        attendance: false,
        slotBooking: false,
        reports: false
      });
      setPageAccess(employee.pageAccess || {
        profile: true,
        applyLeave: true,
        submitClaim: true,
        payslips: true,
        myAttendance: true,
        slotBookingEmployee: true
        cctvMonitoring: false
      });
      setQualifications(employee.qualifications || {});
      
      if (isSuperAdmin && employee.email) {
        checkAuthAccountStatus(employee.email);
      }
    }
  }, [employee, isSuperAdmin, id, navigate]);

  const updateEmployeeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EmployeeProfile }) => updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast("Employee updated successfully");
      setIsEditing(false);
    },
    onError: (error) => {
      console.error('Error updating employee:', error);
      toast("Error updating employee. Please try again.");
    }
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast("Employee removed successfully");
      navigate('/parties');
    },
    onError: (error) => {
      console.error('Error deleting employee:', error);
      toast("Error removing employee. Please try again.");
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEmployeeData((prevData) => ({
      ...prevData,
      [name]: value,
    } as EmployeeProfile));
  };

  const handleDateChange = (name: string, date: Date | undefined) => {
    setEmployeeData((prevData) => ({
      ...prevData,
      [name]: date ? format(date, 'yyyy-MM-dd') : null,
    } as EmployeeProfile));
  };

  const handleAdminAccessChange = (permissions: AdminAccessPermissions) => {
    setAdminAccess(permissions);
  };

  const handlePageAccessChange = (permissions: EmployeePageAccessPermissions) => {
    setPageAccess(permissions);
  };

  const handleUpdateEmployee = async () => {
    if (!employeeData) return;

    try {
      const emailChanged = employee?.email !== employeeData.email;
      const oldEmail = employee?.email;
      const newEmail = employeeData.email;

      await updateEmployeeMutation.mutateAsync({
        id: employeeData.id,
        data: { ...employeeData, qualifications }
      });
      await updateEmployeeAdminAccess(employeeData.id, adminAccess);
      await updateEmployeePageAccess(employeeData.id, pageAccess);
      
      if (emailChanged && oldEmail && newEmail && authAccountStatus === 'exists') {
        try {
          const { data: upd, error: funcErr } = await supabase.functions.invoke('auth-admin', {
            body: { action: 'update_email', oldEmail, newEmail }
          });

          if (funcErr || (upd as any)?.error) {
            toast.error('Employee updated but failed to sync auth account email.');
          } else {
            toast.success('Employee and auth account email updated successfully');
            checkAuthAccountStatus(newEmail);
          }
        } catch (syncError) {
          toast.error('Employee updated but auth account email sync failed');
        }
      }
    } catch (error) {
      console.error('Failed to update employee:', error);
    }
  };

  const handleDeleteEmployee = () => {
    if (window.confirm(`Are you sure you want to remove ${employeeData?.display_name || employeeData?.name}? This will set their resign date to today.`)) {
      deleteEmployeeMutation.mutate(id!);
    }
  };

  const handleCreateAuthAccount = async () => {
    if (!employee?.email || !employee?.name) {
      toast.error("Employee must have an email and name to create auth account");
      return;
    }

    try {
      const success = await createSingleSupabaseAuthUser(employee.email, employee.name);
      if (success) {
        toast.success(`Auth account created for ${employee.email}. Password reset email sent.`);
        checkAuthAccountStatus(employee.email);
      } else {
        toast.error("Failed to create auth account.");
      }
    } catch (error: any) {
      console.error('Error creating auth account:', error);
      toast.error("Failed to create auth account. Please try again later.");
    }
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <ResponsiveLayout>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading employee details...</p>
            </div>
          </div>
        </ResponsiveLayout>
      </AuthGuard>
    );
  }

  if (error || !employeeData) {
    return (
      <AuthGuard>
        <ResponsiveLayout>
          <div className="text-center">
            <p className="text-destructive">Error loading employee details. Please try again.</p>
          </div>
        </ResponsiveLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <ResponsiveLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/parties')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-foreground">{employeeData.display_name || employeeData.name}</h2>
                  <Badge variant="secondary">Casual</Badge>
                  {isSuperAdmin && (
                    <>
                      <Badge 
                        variant={
                          authAccountStatus === 'exists' ? 'default' : 
                          authAccountStatus === 'missing' ? 'destructive' : 
                          authAccountStatus === 'checking' ? 'secondary' : 
                          'outline'
                        }
                      >
                        {authAccountStatus === 'exists' ? '✓ Auth Account' : 
                         authAccountStatus === 'missing' ? '✗ No Auth Account' : 
                         authAccountStatus === 'checking' ? 'Checking...' : 
                         'Auth Check Error'}
                      </Badge>
                      {authAccountStatus === 'exists' && (
                        <Badge variant={isEmailConfirmed ? 'default' : 'secondary'}>
                          {isEmailConfirmed ? '✓ Email Verified' : '⚠ Email Unverified'}
                        </Badge>
                      )}
                    </>
                  )}
                </div>
                <p className="text-muted-foreground">Casual Employee Details</p>
              </div>
            </div>
            <div className="flex space-x-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => {
                    setIsEditing(false);
                    queryClient.invalidateQueries({ queryKey: ['employee', id] });
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateEmployee} disabled={updateEmployeeMutation.isPending}>
                    {updateEmployeeMutation.isPending ? 'Updating...' : 'Update Employee'}
                  </Button>
                </>
              ) : (
                <>
                  {isSuperAdmin && (
                    <>
                      <Button variant="secondary" onClick={handleCreateAuthAccount}>
                        Create Auth Account
                      </Button>
                      <Button variant="destructive" onClick={handleDeleteEmployee} disabled={deleteEmployeeMutation.isPending}>
                        {deleteEmployeeMutation.isPending ? 'Deleting...' : 'Remove Employee'}
                      </Button>
                    </>
                  )}
                  <Button onClick={() => setIsEditing(true)}>
                    Edit Employee
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Tabbed Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-flex">
              <TabsTrigger value="contact" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Contact</span>
              </TabsTrigger>
              <TabsTrigger value="qualifications" className="flex items-center gap-2">
                <Award className="w-4 h-4" />
                <span className="hidden sm:inline">Qualifications</span>
              </TabsTrigger>
              <TabsTrigger value="claims" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Claims</span>
              </TabsTrigger>
              <TabsTrigger value="slots" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">Slot Booking</span>
              </TabsTrigger>
              <TabsTrigger value="attendance" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="hidden sm:inline">Attendance</span>
              </TabsTrigger>
              <TabsTrigger value="payroll" className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                <span className="hidden sm:inline">Payroll</span>
              </TabsTrigger>
            </TabsList>

            {/* Contact Information Tab */}
            <TabsContent value="contact" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="first_name">First Name</Label>
                      <Input
                        id="first_name"
                        name="first_name"
                        value={employeeData.first_name || employeeData.name?.split(' ')[0] || ''}
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase();
                          setEmployeeData(prev => ({
                            ...prev!,
                            first_name: value,
                            name: `${value} ${prev?.last_name || prev?.name?.split(' ').slice(1).join(' ') || ''}`.trim()
                          }));
                        }}
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <Label htmlFor="last_name">Last Name</Label>
                      <Input
                        id="last_name"
                        name="last_name"
                        value={employeeData.last_name || employeeData.name?.split(' ').slice(1).join(' ') || ''}
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase();
                          setEmployeeData(prev => ({
                            ...prev!,
                            last_name: value,
                            name: `${prev?.first_name || prev?.name?.split(' ')[0] || ''} ${value}`.trim()
                          }));
                        }}
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <Label htmlFor="display_name">Display Name</Label>
                      <Input
                        id="display_name"
                        name="display_name"
                        value={employeeData.display_name || ''}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        placeholder={employeeData.name || ''}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={employeeData.email || ''}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        name="phone"
                        value={employeeData.phone || ''}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <Label htmlFor="nric">NRIC</Label>
                      <Input
                        id="nric"
                        name="nric"
                        value={employeeData.nric || ''}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <Label htmlFor="dateOfBirth">Date of Birth</Label>
                      <DatePicker
                        onSelect={(date) => handleDateChange('dateOfBirth', date)}
                        selected={employeeData.dateOfBirth ? new Date(employeeData.dateOfBirth) : undefined}
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <Label htmlFor="joinDate">Join Date</Label>
                      <DatePicker
                        onSelect={(date) => handleDateChange('joinDate', date)}
                        selected={employeeData.joinDate ? new Date(employeeData.joinDate) : undefined}
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <Label htmlFor="resignDate">Resign Date</Label>
                      <DatePicker
                        onSelect={(date) => handleDateChange('resignDate', date)}
                        selected={employeeData.resignDate ? new Date(employeeData.resignDate) : undefined}
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <Label htmlFor="position">Position</Label>
                      <Input
                        id="position"
                        name="position"
                        value={employeeData.position || ''}
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase();
                          setEmployeeData(prev => ({
                            ...prev!,
                            position: value
                          }));
                        }}
                        disabled={!isEditing}
                        placeholder="e.g., CASUAL INSTRUCTOR"
                      />
                    </div>
                    <div>
                      <Label htmlFor="branch">Branch</Label>
                      <Input
                        id="branch"
                        name="branch"
                        value={employeeData.branch || ''}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <Label htmlFor="residencyStatus">Residency Status</Label>
                      <Select
                        value={employeeData.residencyStatus || ''}
                        onValueChange={(value) => handleInputChange({ target: { name: 'residencyStatus', value } } as any)}
                        disabled={!isEditing}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Citizen">Citizen</SelectItem>
                          <SelectItem value="PR">Permanent Resident</SelectItem>
                          <SelectItem value="Work Permit">Work Permit</SelectItem>
                          <SelectItem value="S Pass">S Pass</SelectItem>
                          <SelectItem value="Employment Pass">Employment Pass</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="bankName">Bank Name</Label>
                      <Input
                        id="bankName"
                        name="bankName"
                        value={employeeData.bankName || ''}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <Label htmlFor="bankAccount">Bank Account</Label>
                      <Input
                        id="bankAccount"
                        name="bankAccount"
                        value={employeeData.bankAccount || ''}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <Label>Payment Type</Label>
                      <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
                        Dynamic Pricing
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Pay calculated from slot bookings and qualifications</p>
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="address">Address</Label>
                      <textarea
                        id="address"
                        name="address"
                        rows={3}
                        className="w-full p-2 border border-input rounded-lg bg-background"
                        value={employeeData.address || ''}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>

                  {isEditing && (
                    <div className="border-t pt-6">
                      <AdminAccessManager
                        adminAccess={adminAccess}
                        pageAccess={pageAccess}
                        onAdminAccessChange={handleAdminAccessChange}
                        onPageAccessChange={handlePageAccessChange}
                        isEditing={isEditing}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Location Exception */}
              {isSuperAdmin && (
                <LocationExceptionManager
                  employeeId={employeeData.id}
                  employeeName={employeeData.display_name || employeeData.name}
                />
              )}
            </TabsContent>

            {/* Qualifications Tab */}
            <TabsContent value="qualifications" className="space-y-6">
              <EmployeeQualificationsManager
                qualifications={qualifications}
                onChange={setQualifications}
                disabled={!isEditing}
              />
            </TabsContent>

            {/* Claims History Tab */}
            <TabsContent value="claims" className="space-y-6">
              <EmployeeClaimHistory 
                employeeId={employeeData.id} 
                employeeName={employeeData.display_name || employeeData.name} 
              />
            </TabsContent>

            {/* Slot Booking History Tab */}
            <TabsContent value="slots" className="space-y-6">
              <SlotBookingHistory 
                employeeId={employeeData.id} 
                employeeName={employeeData.display_name || employeeData.name} 
              />
            </TabsContent>

            {/* Attendance History Tab */}
            <TabsContent value="attendance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Attendance History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Casual employee attendance is tracked through slot bookings. Clock-in/out records are captured for each approved slot.
                    </p>
                    
                    {slotBookingsLoading ? (
                      <div className="animate-pulse space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-12 bg-muted rounded"></div>
                        ))}
                      </div>
                    ) : slotBookings.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No attendance records found</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Clock In</TableHead>
                            <TableHead>Clock Out</TableHead>
                            <TableHead>Hours Worked</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {slotBookings
                            .filter((b: any) => b.clock_in || b.clock_out)
                            .slice(0, 20)
                            .map((booking: any) => {
                              const clockIn = booking.clock_in ? new Date(booking.clock_in) : null;
                              const clockOut = booking.clock_out ? new Date(booking.clock_out) : null;
                              const hoursWorked = clockIn && clockOut 
                                ? ((clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60)).toFixed(1)
                                : '-';
                              
                              return (
                                <TableRow key={booking.id}>
                                  <TableCell className="font-medium">
                                    {formatDate(new Date(booking.date))}
                                  </TableCell>
                                  <TableCell>
                                    {clockIn ? clockIn.toLocaleTimeString('en-SG', { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    }) : '-'}
                                  </TableCell>
                                  <TableCell>
                                    {clockOut ? clockOut.toLocaleTimeString('en-SG', { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    }) : '-'}
                                  </TableCell>
                                  <TableCell>{hoursWorked} hrs</TableCell>
                                  <TableCell>
                                    <Badge variant={booking.status === 'approved' ? 'default' : 'secondary'}>
                                      {clockIn && clockOut ? 'Completed' : clockIn ? 'In Progress' : 'Pending'}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payroll History Tab */}
            <TabsContent value="payroll" className="space-y-6">
              <EmployeePayrollHistory 
                employeeId={employeeData.id} 
                employeeName={employeeData.display_name || employeeData.name} 
              />
            </TabsContent>
          </Tabs>
        </div>
      </ResponsiveLayout>
    </AuthGuard>
  );
};

export default CasualEmployeeDetails;
