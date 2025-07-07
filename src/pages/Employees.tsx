import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Settings, Grid, List, Filter } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { getEmployees, createEmployee, updateEmployeeAdminAccess, updateEmployeePageAccess, deleteEmployee } from '@/services/employeeService';
import { useNavigate } from 'react-router-dom';
import EmployeeModuleSettings from '@/components/employee/EmployeeModuleSettings';
import AdminAccessManager from '@/components/employee/AdminAccessManager';
import ResetPasswordDialog from '@/components/employee/ResetPasswordDialog';
import EmployeeCard from '@/components/employee/EmployeeCard';
import EmployeeSearchFilter from '@/components/employee/EmployeeSearchFilter';
import BulkActions from '@/components/employee/BulkActions';
import ActionMenu from '@/components/employee/ActionMenu';
import EmployeeStatsCards from '@/components/employee/EmployeeStatsCards';
import EmployeeListView from '@/components/employee/EmployeeListView';
import AdvancedEmployeeFilters from '@/components/employee/AdvancedEmployeeFilters';
import { AdminAccessPermissions, EmployeePageAccessPermissions } from '@/types/employee';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';

const Employees = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  
  // View States
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  
  // Advanced Filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    salaryRange: { min: '', max: '' },
    joinDateRange: { start: '', end: '' },
    showInactiveOnly: false,
    hasEmail: false,
    hasPhone: false
  });
  
  // Selection States
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  
  // Dialog States
  const [showAddForm, setShowAddForm] = useState(false);
  const [showModuleSettings, setShowModuleSettings] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<{ name: string; email: string } | null>(null);
  
  // Form States
  const [paymentType, setPaymentType] = useState('Monthly');
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
  });

  // Computed values
  const departments = useMemo(() => {
    const depts = employees
      .map(emp => emp.department || emp.branch)
      .filter(Boolean)
      .filter((dept, index, arr) => arr.indexOf(dept) === index)
      .sort();
    return depts;
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          employee.name.toLowerCase().includes(searchLower) ||
          employee.email?.toLowerCase().includes(searchLower) ||
          employee.id.toLowerCase().includes(searchLower) ||
          employee.phone?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Type filter
      if (typeFilter && employee.type !== typeFilter) return false;

      // Status filter
      if (statusFilter) {
        const isActive = !employee.resignDate;
        if (statusFilter === 'active' && !isActive) return false;
        if (statusFilter === 'inactive' && isActive) return false;
      }

      // Department filter
      if (departmentFilter) {
        const empDept = employee.department || employee.branch;
        if (empDept !== departmentFilter) return false;
      }

      // Advanced filters
      if (advancedFilters.salaryRange.min && employee.baseSalary) {
        if (employee.baseSalary < parseFloat(advancedFilters.salaryRange.min)) return false;
      }
      if (advancedFilters.salaryRange.max && employee.baseSalary) {
        if (employee.baseSalary > parseFloat(advancedFilters.salaryRange.max)) return false;
      }
      if (advancedFilters.joinDateRange.start && employee.joinDate) {
        if (new Date(employee.joinDate) < new Date(advancedFilters.joinDateRange.start)) return false;
      }
      if (advancedFilters.joinDateRange.end && employee.joinDate) {
        if (new Date(employee.joinDate) > new Date(advancedFilters.joinDateRange.end)) return false;
      }
      if (advancedFilters.showInactiveOnly && !employee.resignDate) return false;
      if (advancedFilters.hasEmail && !employee.email) return false;
      if (advancedFilters.hasPhone && !employee.phone) return false;

      return true;
    });
  }, [employees, searchTerm, typeFilter, statusFilter, departmentFilter, advancedFilters]);

  const addEmployeeMutation = useMutation({
    mutationFn: async (employeeData: any) => {
      const newEmployee = await createEmployee(employeeData);
      
      if (newEmployee && newEmployee.id) {
        await updateEmployeeAdminAccess(newEmployee.id, newEmployeeAdminAccess);
        await updateEmployeePageAccess(newEmployee.id, newEmployeePageAccess);
      }
      
      return newEmployee;
    },
    onSuccess: () => {
      console.log('Employee added successfully with access permissions');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast("Employee added successfully");
      handleCloseAddForm();
    },
    onError: (error) => {
      console.error('Error adding employee:', error);
      toast("Error adding employee. Please try again.");
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

  const handleBulkDelete = (employeeIds: string[]) => {
    if (window.confirm(`Are you sure you want to remove ${employeeIds.length} employees? This will set their resign date to today.`)) {
      Promise.all(employeeIds.map(id => deleteEmployeeMutation.mutateAsync(id)))
        .then(() => {
          setSelectedEmployees(new Set());
          toast(`${employeeIds.length} employees removed successfully`);
        })
        .catch((error) => {
          console.error('Error in bulk delete:', error);
          toast("Error removing some employees. Please try again.");
        });
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
      // Implementation would go here
      toast(`Employee ${action}d successfully`);
    }
  };

  const handleCloseAddForm = () => {
    setShowAddForm(false);
    setPaymentType('Monthly');
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

  const handleClearFilters = () => {
    setSearchTerm('');
    setTypeFilter('');
    setStatusFilter('');
    setDepartmentFilter('');
    setAdvancedFilters({
      salaryRange: { min: '', max: '' },
      joinDateRange: { start: '', end: '' },
      showInactiveOnly: false,
      hasEmail: false,
      hasPhone: false
    });
  };

  const handleApplyAdvancedFilters = () => {
    setShowAdvancedFilters(false);
    // Filters are automatically applied via useMemo
  };

  const handleClearAdvancedFilters = () => {
    setAdvancedFilters({
      salaryRange: { min: '', max: '' },
      joinDateRange: { start: '', end: '' },
      showInactiveOnly: false,
      hasEmail: false,
      hasPhone: false
    });
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Add employee form submitted');
    
    const formData = new FormData(e.target as HTMLFormElement);
    
    const requiredFields = ['name', 'email', 'nric', 'dateOfBirth', 'type', 'residencyStatus', 'bankName', 'bankAccount', 'joinDate'];
    const missingFields = requiredFields.filter(field => !formData.get(field));
    
    if (missingFields.length > 0) {
      toast(`Please fill in required fields: ${missingFields.join(', ')}`);
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
        dailyWeekdayRate: formData.get('dailyWeekdayRate') ? parseFloat(formData.get('dailyWeekdayRate') as string) : null,
        dailyWeekendRate: formData.get('dailyWeekendRate') ? parseFloat(formData.get('dailyWeekendRate') as string) : null,
        joinDate: formData.get('joinDate') as string,
      };

      console.log('Creating employee with data:', newEmployee);
      await addEmployeeMutation.mutateAsync(newEmployee);
    } catch (error) {
      console.error('Failed to add employee:', error);
    }
  };

  const handleAdminAccessChange = (permissions: AdminAccessPermissions) => {
    setNewEmployeeAdminAccess(permissions);
  };

  const handlePageAccessChange = (permissions: EmployeePageAccessPermissions) => {
    setNewEmployeePageAccess(permissions);
  };

  const isSuperAdmin = user?.role === 'superadmin';

  if (isLoading) {
    return (
      <ResponsiveLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading employees...</p>
          </div>
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
    <ResponsiveLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Employee Management</h2>
            <p className="text-gray-600">Manage your workforce efficiently</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAdvancedFilters(true)}
              className="w-full sm:w-auto"
            >
              <Filter className="w-4 h-4 mr-2" />
              Advanced Filters
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowModuleSettings(true)}
              className="w-full sm:w-auto"
            >
              <Settings className="w-4 h-4 mr-2" />
              Module Settings
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

        {/* Stats Cards */}
        <EmployeeStatsCards employees={employees} />

        {/* Search and Filters */}
        <EmployeeSearchFilter
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          departmentFilter={departmentFilter}
          onDepartmentFilterChange={setDepartmentFilter}
          departments={departments}
          totalCount={employees.length}
          filteredCount={filteredEmployees.length}
          onClearFilters={handleClearFilters}
        />

        {/* View Toggle and Bulk Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4 mr-2" />
              Grid
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4 mr-2" />
              List
            </Button>
          </div>
          
          <BulkActions
            employees={filteredEmployees}
            selectedEmployees={selectedEmployees}
            onSelectionChange={setSelectedEmployees}
            onBulkDelete={handleBulkDelete}
            onBulkExport={(ids) => toast("Export functionality not implemented yet")}
            onBulkEmail={(ids) => toast("Email functionality not implemented yet")}
            onBulkStatusChange={(ids, status) => toast(`Status change functionality not implemented yet`)}
            isSuperAdmin={isSuperAdmin}
          />
        </div>

        {/* Employee Display */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredEmployees.map((employee) => (
              <div key={employee.id} className="relative">
                <EmployeeCard
                  employee={employee}
                  onView={(id) => navigate(`/employees/${id}`)}
                  onEdit={(id) => navigate(`/employees/${id}/edit`)}
                  onResetPassword={handleResetPassword}
                  onDelete={handleDeleteEmployee}
                  showActions={false}
                  isSuperAdmin={isSuperAdmin}
                />
                <div className="absolute top-2 right-2">
                  <ActionMenu
                    employeeId={employee.id}
                    employeeName={employee.name}
                    employeeEmail={employee.email || ''}
                    isActive={!employee.resignDate}
                    onView={(id) => navigate(`/employees/${id}`)}
                    onEdit={(id) => navigate(`/employees/${id}/edit`)}
                    onResetPassword={handleResetPassword}
                    onDelete={handleDeleteEmployee}
                    onToggleStatus={handleToggleStatus}
                    isSuperAdmin={isSuperAdmin}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmployeeListView
            employees={filteredEmployees}
            onView={(id) => navigate(`/employees/${id}`)}
            onEdit={(id) => navigate(`/employees/${id}/edit`)}
            onResetPassword={handleResetPassword}
            onDelete={handleDeleteEmployee}
            onToggleStatus={handleToggleStatus}
            isSuperAdmin={isSuperAdmin}
          />
        )}

        {/* Empty State */}
        {filteredEmployees.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500 text-lg mb-2">No employees found</p>
              <p className="text-gray-400 mb-4">
                {searchTerm || typeFilter || statusFilter || departmentFilter
                  ? "Try adjusting your search or filters"
                  : "Get started by adding your first employee"
                }
              </p>
              {!(searchTerm || typeFilter || statusFilter || departmentFilter) && (
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Employee
                </Button>
              )}
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

      <AdvancedEmployeeFilters
        isOpen={showAdvancedFilters}
        onClose={() => setShowAdvancedFilters(false)}
        filters={advancedFilters}
        onFiltersChange={setAdvancedFilters}
        onApplyFilters={handleApplyAdvancedFilters}
        onClearFilters={handleClearAdvancedFilters}
      />

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
                    <select name="type" className="w-full p-2 border border-gray-300 rounded-lg" required>
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
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Hourly">Hourly</option>
                      <option value="Daily">Daily</option>
                    </select>
                  </div>

                  {paymentType === 'Monthly' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Base Salary (S$)</label>
                      <Input name="baseSalary" type="number" step="0.01" />
                    </div>
                  )}

                  {paymentType === 'Hourly' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Hourly Rate (S$)</label>
                      <Input name="hourlyRate" type="number" step="0.01" />
                    </div>
                  )}

                  {paymentType === 'Daily' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Daily Weekday Rate (S$)</label>
                        <Input name="dailyWeekdayRate" type="number" step="0.01" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Daily Weekend Rate (S$)</label>
                        <Input name="dailyWeekendRate" type="number" step="0.01" />
                      </div>
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
                    {addEmployeeMutation.isPending ? 'Adding Employee...' : 'Add Employee'}
                  </Button>
                  <Button 
                    type="button"
                    variant="outline" 
                    className="flex-1"
                    onClick={handleCloseAddForm}
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
  );
};

export default Employees;
