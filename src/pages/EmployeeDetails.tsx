import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import AuthGuard from '@/components/auth/AuthGuard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { getEmployeeById, updateEmployee, deleteEmployee } from '@/services/employeeService';
import { createSingleSupabaseAuthUser } from '@/services/bulkUserCreationService';
import { EmployeeProfile } from '@/types/employee';
import { Calendar } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AdminAccessManager from '@/components/employee/AdminAccessManager';
import LocationExceptionManager from '@/components/employee/LocationExceptionManager';
import AllowanceDeductionManager from '@/components/employee/AllowanceDeductionManager';
import EmployeeQualificationsManager from '@/components/employee/EmployeeQualificationsManager';
import { updateEmployeeAdminAccess, updateEmployeePageAccess } from '@/services/employeeService';
import EmployeeClaimHistory from '@/components/employee/EmployeeClaimHistory';
import EmployeeLeaveHistory from '@/components/employee/EmployeeLeaveHistory';
import EmployeePayrollHistory from '@/components/employee/EmployeePayrollHistory';
import { AdminAccessPermissions, EmployeePageAccessPermissions, EmployeeQualifications } from '@/types/employee';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const EmployeeDetails = () => {
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
  });
  const [qualifications, setQualifications] = useState<EmployeeQualifications>({});

  // Check for edit parameter on load
  useEffect(() => {
    const editParam = searchParams.get('edit');
    if (editParam === 'true') {
      setIsEditing(true);
      // Remove the edit parameter from URL after setting state
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const { data: employee, isLoading, error } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => getEmployeeById(id!),
    enabled: !!id,
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
      });
      setQualifications(employee.qualifications || {});
      
      // Check auth account status if user is superadmin
      if (isSuperAdmin && employee.email) {
        checkAuthAccountStatus(employee.email);
      }
    }
  }, [employee, isSuperAdmin]);

  const updateEmployeeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EmployeeProfile }) => updateEmployee(id, data),
    onSuccess: () => {
      console.log('Employee updated successfully');
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
      console.log('Employee deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast("Employee removed successfully");
      navigate('/employees');
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
      // Check if email has changed
      const emailChanged = employee?.email !== employeeData.email;
      const oldEmail = employee?.email;
      const newEmail = employeeData.email;

      // Update employee data
      await updateEmployeeMutation.mutateAsync({
        id: employeeData.id,
        data: { ...employeeData, qualifications }
      });
      await updateEmployeeAdminAccess(employeeData.id, adminAccess);
      await updateEmployeePageAccess(employeeData.id, pageAccess);
      
      // If email changed and auth account exists, update auth account email
      if (emailChanged && oldEmail && newEmail && authAccountStatus === 'exists') {
        try {
          console.log(`Syncing auth account email from ${oldEmail} to ${newEmail}`);
          
          // Update auth account email via Edge Function
          const { data: upd, error: funcErr } = await supabase.functions.invoke('auth-admin', {
            body: { action: 'update_email', oldEmail, newEmail }
          });

          if (funcErr || (upd as any)?.error) {
            console.error('Error updating auth email:', funcErr || (upd as any)?.error);
            toast.error('Employee updated but failed to sync auth account email. Please update manually.');
          } else {
            toast.success('Employee and auth account email updated successfully');
            // Recheck auth status
            checkAuthAccountStatus(newEmail);
          }
        } catch (syncError) {
          console.error('Error syncing auth email:', syncError);
          toast.error('Employee updated but auth account email sync failed');
        }
      } else {
        console.log('Employee updated successfully with access permissions');
      }
    } catch (error) {
      console.error('Failed to update employee:', error);
    }
  };

  const handleDeleteEmployee = () => {
    if (window.confirm(`Are you sure you want to remove ${employeeData?.name}? This will set their resign date to today.`)) {
      deleteEmployeeMutation.mutate(id!);
    }
  };

  const handleAllowanceDeductionUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ['employee', id] });
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
        // Recheck auth status after creation
        checkAuthAccountStatus(employee.email);
      } else {
        toast.error("Failed to create auth account. The user may already exist or there's a rate limit issue. Please wait a few minutes and try again.");
      }
    } catch (error: any) {
      console.error('Error creating auth account:', error);
      const errorMessage = error?.message || '';
      if (errorMessage.includes('rate') || errorMessage.includes('429')) {
        toast.error("Too many attempts. Please wait a few minutes before trying again.");
      } else if (errorMessage.includes('already') || errorMessage.includes('exist')) {
        toast.info("Auth account already exists for this email.");
        checkAuthAccountStatus(employee.email);
      } else {
        toast.error("Failed to create auth account. Please try again later.");
      }
    }
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <ResponsiveLayout>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading employee details...</p>
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
            <p className="text-red-600">Error loading employee details. Please try again.</p>
          </div>
        </ResponsiveLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <ResponsiveLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-900">{employeeData.name}</h2>
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
                      <Badge 
                        variant={isEmailConfirmed ? 'default' : 'secondary'}
                      >
                        {isEmailConfirmed ? '✓ Email Verified' : '⚠ Email Unverified'}
                      </Badge>
                    )}
                  </>
                )}
              </div>
              <p className="text-gray-600">Employee Details</p>
            </div>
            <div>
              {isEditing ? (
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => {
                    setIsEditing(false);
                    queryClient.invalidateQueries({ queryKey: ['employee', id] });
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateEmployee} disabled={updateEmployeeMutation.isPending}>
                    {updateEmployeeMutation.isPending ? 'Updating...' : 'Update Employee'}
                  </Button>
                </div>
              ) : (
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => navigate('/employees')}>
                    Back to Employees
                  </Button>
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
                </div>
              )}
            </div>
          </div>

          <Card>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={employeeData.name || ''}
                    onChange={handleInputChange}
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
                  <div className="relative">
                    <DatePicker
                      onSelect={(date) => handleDateChange('dateOfBirth', date)}
                      selected={employeeData.dateOfBirth ? new Date(employeeData.dateOfBirth) : undefined}
                      disabled={!isEditing}
                    />
                    <Calendar className="absolute top-2 right-2 w-4 h-4 text-gray-500" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="joinDate">Join Date</Label>
                  <div className="relative">
                    <DatePicker
                      onSelect={(date) => handleDateChange('joinDate', date)}
                      selected={employeeData.joinDate ? new Date(employeeData.joinDate) : undefined}
                      disabled={!isEditing}
                    />
                    <Calendar className="absolute top-2 right-2 w-4 h-4 text-gray-500" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="resignDate">Resign Date</Label>
                  <div className="relative">
                    <DatePicker
                      onSelect={(date) => handleDateChange('resignDate', date)}
                      selected={employeeData.resignDate ? new Date(employeeData.resignDate) : undefined}
                      disabled={!isEditing}
                    />
                    <Calendar className="absolute top-2 right-2 w-4 h-4 text-gray-500" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    name="position"
                    value={employeeData.position || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
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
                  <Label htmlFor="type">Employee Type</Label>
                  <Select
                    value={employeeData.type || ''}
                    onValueChange={(value) => handleInputChange({ target: { name: 'type', value } } as any)}
                    disabled={!isEditing}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Full-Time">Full-Time</SelectItem>
                      <SelectItem value="Casual">Casual</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <Label htmlFor="paymentType">Payment Type</Label>
                  {employeeData.type === 'Full-Time' ? (
                    <Select
                      value={employeeData.paymentType || 'Monthly'}
                      onValueChange={(value) => handleInputChange({ target: { name: 'paymentType', value } } as any)}
                      disabled={!isEditing}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select payment type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="Hourly">Hourly</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
                      Dynamic Pricing
                    </div>
                  )}
                </div>
                {employeeData.type === 'Full-Time' && employeeData.paymentType === 'Monthly' && (
                  <div>
                    <Label htmlFor="baseSalary">Base Salary (S$)</Label>
                    <Input
                      id="baseSalary"
                      name="baseSalary"
                      type="number"
                      step="0.01"
                      value={employeeData.baseSalary?.toString() || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                )}
                {employeeData.type === 'Full-Time' && employeeData.paymentType === 'Hourly' && (
                  <div>
                    <Label htmlFor="hourlyRate">Hourly Rate (S$)</Label>
                    <Input
                      id="hourlyRate"
                      name="hourlyRate"
                      type="number"
                      step="0.01"
                      value={employeeData.hourlyRate?.toString() || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                )}
                {employeeData.type === 'Casual' && (
                  <>
                    <div className="md:col-span-2 p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Casual employees use dynamic pricing based on slot bookings
                      </p>
                    </div>
                  </>
                )}
                <div className="md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <textarea
                    id="address"
                    name="address"
                    rows={3}
                    className="w-full p-2 border border-gray-300 rounded-lg"
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

        {/* Qualifications & Certifications */}
        <EmployeeQualificationsManager
          qualifications={qualifications}
          onChange={setQualifications}
          disabled={!isEditing}
        />

        {/* Allowances & Deductions Management */}
        <Card>
            <CardContent className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Allowances & Deductions</h3>
              <AllowanceDeductionManager
                employeeId={employeeData.id}
                onUpdate={handleAllowanceDeductionUpdate}
              />
            </CardContent>
          </Card>

          {/* Location Exception Management - Only visible to superadmins */}
          {isSuperAdmin && (
            <LocationExceptionManager
              employeeId={employeeData.id}
              employeeName={employeeData.name}
            />
          )}

          {/* History Sections */}
          <div className="space-y-6 mt-8">
            <EmployeeClaimHistory 
              employeeId={employeeData.id} 
              employeeName={employeeData.name} 
            />
            
            <EmployeeLeaveHistory 
              employeeId={employeeData.id} 
              employeeName={employeeData.name} 
            />
            
            <EmployeePayrollHistory 
              employeeId={employeeData.id} 
              employeeName={employeeData.name} 
            />
          </div>
        </div>
      </ResponsiveLayout>
    </AuthGuard>
  );
};

export default EmployeeDetails;
