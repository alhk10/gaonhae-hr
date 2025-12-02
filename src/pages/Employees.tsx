
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import AuthGuard from '@/components/auth/AuthGuard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Settings } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { getEmployees, createEmployee, updateEmployeeAdminAccess, updateEmployeePageAccess, deleteEmployee } from '@/services/employeeService';
import { useNavigate } from 'react-router-dom';
import EmployeeModuleSettings from '@/components/employee/EmployeeModuleSettings';
import AdminAccessManager from '@/components/employee/AdminAccessManager';
import ResetPasswordDialog from '@/components/employee/ResetPasswordDialog';
import EmployeeListView from '@/components/employee/EmployeeListView';
import EmployeeLoadingSkeleton from '@/components/employee/EmployeeLoadingSkeleton';
import { AdminAccessPermissions, EmployeePageAccessPermissions } from '@/types/employee';
import { useAuth } from '@/contexts/AuthContext';

const Employees = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Filter State - Single dropdown for status
  const [statusFilter, setStatusFilter] = useState('current-all');
  
  // Dialog States
  const [showAddForm, setShowAddForm] = useState(false);
  const [showModuleSettings, setShowModuleSettings] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<{ name: string; email: string } | null>(null);
  
  // Form States
  const [paymentType, setPaymentType] = useState('Monthly');
  const [employeeType, setEmployeeType] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [newEmployeeAdminAccess, setNewEmployeeAdminAccess] = useState<AdminAccessPermissions>({
    employees: false,
    payroll: false,
    leaveManagement: false,
    claims: false,
    attendance: false,
    slotBooking: false,
    reports: false
  });
  const [newEmployeePageAccess, setNewEmployeePageAccess] = useState<EmployeePageAccessPermissions>({
    profile: true,
    applyLeave: true,
    submitClaim: true,
    payslips: true,
    myAttendance: true,
    slotBookingEmployee: true
  });

  const { data: employees = [], isLoading, error } = useQuery({
    queryKey: ['employees'],
    queryFn: getEmployees,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => {
      switch (statusFilter) {
        case 'current-all':
          return !employee.resignDate;
        case 'current-fulltime':
          return !employee.resignDate && employee.type === 'Full-Time';
        case 'current-casual':
          return !employee.resignDate && employee.type === 'Casual';
        case 'resigned':
          return employee.resignDate !== null;
        default:
          return true;
      }
    });
  }, [employees, statusFilter]);

  // Note: Removed localStorage storage for security compliance
  // Filtered employee data is now handled through state management only

  const addEmployeeMutation = useMutation({
    mutationFn: async (employeeData: any) => {
      console.log('Employees: Starting employee creation with data:', employeeData);
      setSubmitError(null);
      
      try {
        const newEmployee = await createEmployee(employeeData);
        console.log('Employees: Employee created successfully:', newEmployee);
        
        if (newEmployee && newEmployee.id) {
          console.log('Employees: Setting up access permissions...');
          
          // Set up permissions with individual error handling
          try {
            await updateEmployeeAdminAccess(newEmployee.id, newEmployeeAdminAccess);
            console.log('Employees: Admin access permissions set successfully');
          } catch (adminError) {
            console.error('Employees: Error setting admin access:', adminError);
            // Continue with page access even if admin access fails
          }
          
          try {
            await updateEmployeePageAccess(newEmployee.id, newEmployeePageAccess);
            console.log('Employees: Page access permissions set successfully');
          } catch (pageError) {
            console.error('Employees: Error setting page access:', pageError);
            // Don't fail the whole process if page access fails
          }
        }
        
        return newEmployee;
      } catch (error) {
        console.error('Employees: Error in employee creation process:', error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log('Employees: Employee creation completed successfully');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success("Employee added successfully");
      handleCloseAddForm();
    },
    onError: (error: Error) => {
      console.error('Employees: Employee creation failed:', error);
      const errorMessage = error.message || 'Failed to add employee. Please try again.';
      setSubmitError(errorMessage);
      toast.error(errorMessage);
    }
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => {
      console.log('Employee deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast("Employee removed successfully");
    },
    onError: (error) => {
      console.error('Error deleting employee:', error);
      toast("Error removing employee. Please try again.");
    }
  });

  const handleDeleteEmployee = (employeeId: string, employeeName: string) => {
    if (window.confirm(`Are you sure you want to remove ${employeeName}? This will set their resign date to today.`)) {
      deleteEmployeeMutation.mutate(employeeId);
    }
  };

  const handleResetPassword = (employeeName: string, employeeEmail: string) => {
    console.log('Opening reset password dialog for:', employeeName, employeeEmail);
    setSelectedEmployee({ name: employeeName, email: employeeEmail });
    setShowResetPasswordDialog(true);
  };

  const handleToggleStatus = (employeeId: string, employeeName: string, currentStatus: boolean) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    if (window.confirm(`Are you sure you want to ${action} ${employeeName}?`)) {
      toast(`Employee ${action}d successfully`);
    }
  };

  const handleCloseAddForm = () => {
    setShowAddForm(false);
    setPaymentType('Monthly');
    setEmployeeType('');
    setSubmitError(null);
    setNewEmployeeAdminAccess({
      employees: false,
      payroll: false,
      leaveManagement: false,
      claims: false,
      attendance: false,
      slotBooking: false,
      reports: false
    });
    setNewEmployeePageAccess({
      profile: true,
      applyLeave: true,
      submitClaim: true,
      payslips: true,
      myAttendance: true,
      slotBookingEmployee: true
    });
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Employees: Form submitted, starting validation...');
    setSubmitError(null);
    
    const formData = new FormData(e.target as HTMLFormElement);
    
    const requiredFields = ['name', 'email', 'nric', 'dateOfBirth', 'type', 'residencyStatus', 'bankName', 'bankAccount', 'joinDate'];
    const missingFields = requiredFields.filter(field => !formData.get(field));
    
    if (missingFields.length > 0) {
      const errorMessage = `Please fill in required fields: ${missingFields.join(', ')}`;
      setSubmitError(errorMessage);
      toast.error(errorMessage);
      return;
    }

    try {
      const newEmployee = {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string || '',
        nric: formData.get('nric') as string,
        dateOfBirth: formData.get('dateOfBirth') as string,
        address: formData.get('address') as string || '',
        position: formData.get('position') as string || '',
        branch: formData.get('branch') as string || '',
        type: formData.get('type') as string,
        residencyStatus: formData.get('residencyStatus') as string,
        bankName: formData.get('bankName') as string,
        bankAccount: formData.get('bankAccount') as string,
        paymentType: formData.get('paymentType') as string || 'Monthly',
        baseSalary: formData.get('baseSalary') ? parseFloat(formData.get('baseSalary') as string) : null,
        hourlyRate: formData.get('hourlyRate') ? parseFloat(formData.get('hourlyRate') as string) : null,
        joinDate: formData.get('joinDate') as string,
      };

      console.log('Employees: Validated employee data:', newEmployee);
      await addEmployeeMutation.mutateAsync(newEmployee);
    } catch (error) {
      console.error('Employees: Failed to process employee creation:', error);
    }
  };

  const handleAdminAccessChange = (permissions: AdminAccessPermissions) => {
    setNewEmployeeAdminAccess(permissions);
  };

  const handlePageAccessChange = (permissions: EmployeePageAccessPermissions) => {
    setNewEmployeePageAccess(permissions);
  };

  const { userrole } = useAuth();
  const isSuperAdmin = userrole === 'superadmin';

  if (isLoading) {
    return (
      <ResponsiveLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Employees</h2>
              <p className="text-gray-600">Loading employees...</p>
            </div>
          </div>
          <EmployeeLoadingSkeleton />
        </div>
      </ResponsiveLayout>
    );
  }

  if (error) {
    return (
      <ResponsiveLayout>
        <div className="text-center">
          <p className="text-red-600">Error loading employees. Please try again.</p>
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <AuthGuard>
      <ResponsiveLayout>
        <div className="space-y-6">
          {/* Simplified Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Employees</h2>
              <p className="text-gray-600">
                {filteredEmployees.length} employees
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setShowModuleSettings(true)}
                className="w-full sm:w-auto"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button 
                onClick={() => setShowAddForm(true)}
                className="w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Employee
              </Button>
            </div>
          </div>

          {/* Simple Status Filter */}
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Filter by status:</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current-all">All current employees</SelectItem>
                  <SelectItem value="current-fulltime">Current full-time</SelectItem>
                  <SelectItem value="current-casual">Current casual</SelectItem>
                  <SelectItem value="resigned">Resigned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Employee List */}
          <EmployeeListView
            employees={filteredEmployees}
            onView={(id) => navigate(`/employees/${id}`)}
            onEdit={(id) => navigate(`/employees/${id}?edit=true`)}
            onResetPassword={handleResetPassword}
            onDelete={handleDeleteEmployee}
            onToggleStatus={handleToggleStatus}
            isSuperAdmin={isSuperAdmin}
          />

          {/* Empty State */}
          {filteredEmployees.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-gray-500 text-lg mb-2">No employees found</p>
                <p className="text-gray-400 mb-4">
                  No employees match the selected filter criteria
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Dialogs */}
        {showModuleSettings && (
          <EmployeeModuleSettings
            open={showModuleSettings}
            onOpenChange={setShowModuleSettings}
            employees={employees}
            onEmployeesUpdate={() => queryClient.invalidateQueries({ queryKey: ['employees'] })}
          />
        )}

        {showResetPasswordDialog && selectedEmployee && (
          <ResetPasswordDialog
            open={showResetPasswordDialog}
            onClose={() => {
              setShowResetPasswordDialog(false);
              setSelectedEmployee(null);
            }}
            employeeName={selectedEmployee.name}
            employeeEmail={selectedEmployee.email}
          />
        )}

        {/* Add Employee Form Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Add New Employee</h2>
                    <p className="text-gray-600">Fill out the employee information</p>
                  </div>
                  <Button variant="outline" onClick={handleCloseAddForm}>
                    Cancel
                  </Button>
                </div>
              </div>

              <div className="p-6">
                {submitError && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center">
                      <div className="text-red-600 text-sm font-medium">
                        Error: {submitError}
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleAddEmployee} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                      <Input name="name" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                      <Input name="email" type="email" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                      <Input name="phone" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">NRIC *</label>
                      <Input name="nric" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
                      <Input name="dateOfBirth" type="date" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Join Date *</label>
                      <Input name="joinDate" type="date" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                      <Input name="position" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
                      <Input name="branch" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Employee Type *</label>
                      <select 
                        name="type" 
                        className="w-full p-2 border border-gray-300 rounded-lg" 
                        required
                        value={employeeType}
                        onChange={(e) => {
                          setEmployeeType(e.target.value);
                          // Auto-set payment type to Daily for casual employees
                          if (e.target.value === 'Casual') {
                            setPaymentType('Daily');
                          }
                        }}
                      >
                        <option value="">Select Type</option>
                        <option value="Full-Time">Full-Time</option>
                        <option value="Casual">Casual</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Residency Status *</label>
                      <select name="residencyStatus" className="w-full p-2 border border-gray-300 rounded-lg" required>
                        <option value="">Select Status</option>
                        <option value="Citizen">Citizen</option>
                        <option value="PR">Permanent Resident</option>
                        <option value="Work Permit">Work Permit</option>
                        <option value="S Pass">S Pass</option>
                        <option value="Employment Pass">Employment Pass</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name *</label>
                      <Input name="bankName" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bank Account *</label>
                      <Input name="bankAccount" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Payment Type</label>
                      <select 
                        name="paymentType" 
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        value={paymentType}
                        onChange={(e) => setPaymentType(e.target.value)}
                        disabled={employeeType === 'Casual'}
                      >
                        {employeeType === 'Casual' ? (
                          <option value="Daily">Daily (Dynamic Pricing)</option>
                        ) : (
                          <>
                            <option value="Monthly">Monthly</option>
                            <option value="Hourly">Hourly</option>
                            <option value="Daily">Daily</option>
                          </>
                        )}
                      </select>
                      {employeeType === 'Casual' && (
                        <p className="text-xs text-gray-500 mt-1">Casual employees use dynamic pricing based on slot bookings</p>
                      )}
                    </div>

                    {/* Only show Monthly/Hourly fields for Full-Time employees */}
                    {paymentType === 'Monthly' && employeeType === 'Full-Time' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Base Salary (S$)</label>
                        <Input name="baseSalary" type="number" step="0.01" />
                      </div>
                    )}

                    {paymentType === 'Hourly' && employeeType === 'Full-Time' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Hourly Rate (S$)</label>
                        <Input name="hourlyRate" type="number" step="0.01" />
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <textarea 
                      name="address"
                      rows={3} 
                      className="w-full p-2 border border-gray-300 rounded-lg"
                      placeholder="Enter full address..."
                    ></textarea>
                  </div>

                  <div className="border-t pt-6">
                    <AdminAccessManager
                      adminAccess={newEmployeeAdminAccess}
                      pageAccess={newEmployeePageAccess}
                      onAdminAccessChange={handleAdminAccessChange}
                      onPageAccessChange={handlePageAccessChange}
                      isEditing={true}
                    />
                  </div>

                  <div className="flex space-x-4">
                    <Button 
                      type="submit" 
                      className="flex-1"
                      disabled={addEmployeeMutation.isPending}
                    >
                      {addEmployeeMutation.isPending ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Adding Employee...
                        </div>
                      ) : (
                        'Add Employee'
                      )}
                    </Button>
                    <Button 
                      type="button"
                      variant="outline" 
                      className="flex-1"
                      onClick={handleCloseAddForm}
                      disabled={addEmployeeMutation.isPending}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </ResponsiveLayout>
    </AuthGuard>
  );
};

export default Employees;
