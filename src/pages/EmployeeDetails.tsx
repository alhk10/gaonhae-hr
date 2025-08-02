import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import AuthGuard from '@/components/auth/AuthGuard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner';
import { getEmployeeById, updateEmployee, deleteEmployee } from '@/services/employeeService';
import { EmployeeProfile } from '@/types/employee';
import { Calendar } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AdminAccessManager from '@/components/employee/AdminAccessManager';
import LocationExceptionManager from '@/components/employee/LocationExceptionManager';
import { updateEmployeeAdminAccess, updateEmployeePageAccess } from '@/services/employeeService';
import { AdminAccessPermissions, EmployeePageAccessPermissions } from '@/types/employee';
import { useAuth } from '@/contexts/AuthContext';

const EmployeeDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [isEditing, setIsEditing] = useState(false);
  const [employeeData, setEmployeeData] = useState<EmployeeProfile | null>(null);
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
    }
  }, [employee]);

  const updateEmployeeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EmployeeProfile }) => updateEmployee(id, data),
    onSuccess: () => {
      console.log('Employee updated successfully');
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
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
      await updateEmployeeMutation.mutateAsync({
        id: employeeData.id,
        data: employeeData
      });
      await updateEmployeeAdminAccess(employeeData.id, adminAccess);
      await updateEmployeePageAccess(employeeData.id, pageAccess);
      console.log('Employee updated successfully with access permissions');
    } catch (error) {
      console.error('Failed to update employee:', error);
    }
  };

  const handleDeleteEmployee = () => {
    if (window.confirm(`Are you sure you want to remove ${employeeData?.name}? This will set their resign date to today.`)) {
      deleteEmployeeMutation.mutate(id!);
    }
  };

  const isSuperAdmin = user?.role === 'superadmin';

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
              <h2 className="text-2xl font-bold text-gray-900">{employeeData.name}</h2>
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
                    <Button variant="destructive" onClick={handleDeleteEmployee} disabled={deleteEmployeeMutation.isPending}>
                      {deleteEmployeeMutation.isPending ? 'Deleting...' : 'Remove Employee'}
                    </Button>
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
                  <Select
                    value={employeeData.paymentType || ''}
                    onValueChange={(value) => handleInputChange({ target: { name: 'paymentType', value } } as any)}
                    disabled={!isEditing}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select payment type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                      <SelectItem value="Hourly">Hourly</SelectItem>
                      <SelectItem value="Daily">Daily</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {employeeData.paymentType === 'Monthly' && (
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
                {employeeData.paymentType === 'Hourly' && (
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
                {employeeData.paymentType === 'Daily' && (
                  <>
                    <div>
                      <Label htmlFor="dailyWeekdayRate">Daily Weekday Rate (S$)</Label>
                      <Input
                        id="dailyWeekdayRate"
                        name="dailyWeekdayRate"
                        type="number"
                        step="0.01"
                        value={employeeData.dailyWeekdayRate?.toString() || ''}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <Label htmlFor="dailyWeekendRate">Daily Weekend Rate (S$)</Label>
                      <Input
                        id="dailyWeekendRate"
                        name="dailyWeekendRate"
                        type="number"
                        step="0.01"
                        value={employeeData.dailyWeekendRate?.toString() || ''}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                      />
                    </div>
                  </>
                )}
              </div>

              <div>
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

          {/* Location Exception Management - Only visible to superadmins */}
          {isSuperAdmin && (
            <LocationExceptionManager
              employeeId={employeeData.id}
              employeeName={employeeData.name}
            />
          )}
        </div>
      </ResponsiveLayout>
    </AuthGuard>
  );
};

export default EmployeeDetails;
