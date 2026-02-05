import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import AuthGuard from '@/components/auth/AuthGuard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Settings, Users, Briefcase, Clock, Star } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/sonner';
import { getEmployees, createEmployee, updateEmployeeAdminAccess, updateEmployeePageAccess, deleteEmployee } from '@/services/employeeService';
import { getStudents, getTrials, Student } from '@/services/studentService';
import { useNavigate } from 'react-router-dom';
import EmployeeModuleSettings from '@/components/employee/EmployeeModuleSettings';
import AdminAccessManager from '@/components/employee/AdminAccessManager';
import ResetPasswordDialog from '@/components/employee/ResetPasswordDialog';
import EmployeeListView from '@/components/employee/EmployeeListView';
import EmployeeLoadingSkeleton from '@/components/employee/EmployeeLoadingSkeleton';
import StudentManagementList from '@/components/sales/StudentManagementList';
import TrialManagementList from '@/components/sales/TrialManagementList';
import AddStudentDialog from '@/components/sales/AddStudentDialog';
import AddTrialDialog from '@/components/sales/AddTrialDialog';
import { AdminAccessPermissions, EmployeePageAccessPermissions } from '@/types/employee';
import { useAuth } from '@/contexts/AuthContext';
import { useSalesModuleAccess } from '@/hooks/useSalesModuleAccess';

const PartyManagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, userrole } = useAuth();
  const { hasAccess: hasSalesAccess } = useSalesModuleAccess();
  
  // Tab State
  const [activeTab, setActiveTab] = useState('students');
  
  // Filter State - Single dropdown for status
  const [statusFilter, setStatusFilter] = useState('current-all');
  
  // Dialog States
  const [showAddForm, setShowAddForm] = useState(false);
  const [showModuleSettings, setShowModuleSettings] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [showAddStudentDialog, setShowAddStudentDialog] = useState(false);
  const [showAddTrialDialog, setShowAddTrialDialog] = useState(false);
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

  // Student search state
  const [studentSearch, setStudentSearch] = useState('');
  const [studentPage, setStudentPage] = useState(1);

  // Check user permissions for employee tabs
  const isSuperAdmin = userrole === 'superadmin';
  
  // Load current employee to check position
  const { data: employees = [], isLoading: isEmployeesLoading, error: employeesError } = useQuery({
    queryKey: ['employees'],
    queryFn: getEmployees,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Get current employee for position check
  const currentEmployee = useMemo(() => {
    if (!user?.email) return null;
    return employees.find(emp => emp.email === user.email);
  }, [employees, user?.email]);

  const isSeniorPartner = currentEmployee?.position?.toLowerCase() === 'senior partner';
  const canViewEmployeeTabs = isSuperAdmin || isSeniorPartner;

  // Load students
  const { data: studentsData, isLoading: isStudentsLoading } = useQuery({
    queryKey: ['students', studentPage, studentSearch],
    queryFn: () => getStudents(studentPage, 20, studentSearch),
    staleTime: 5 * 60 * 1000,
  });

  // Load trials
  const { data: trialsData } = useQuery({
    queryKey: ['trials'],
    queryFn: () => getTrials(1, 100),
    staleTime: 5 * 60 * 1000,
  });

  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => {
      // First filter by employee type based on active tab
      const typeMatch = activeTab === 'fulltime' 
        ? employee.type === 'Full-Time'
        : activeTab === 'casual' 
          ? employee.type === 'Casual'
          : true;

      if (!typeMatch) return false;

      // Then filter by status
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
  }, [employees, statusFilter, activeTab]);

  const addEmployeeMutation = useMutation({
    mutationFn: async (employeeData: any) => {
      console.log('PartyManagement: Starting employee creation with data:', employeeData);
      setSubmitError(null);
      
      try {
        const newEmployee = await createEmployee(employeeData);
        console.log('PartyManagement: Employee created successfully:', newEmployee);
        
        if (newEmployee && newEmployee.id) {
          console.log('PartyManagement: Setting up access permissions...');
          
          try {
            await updateEmployeeAdminAccess(newEmployee.id, newEmployeeAdminAccess);
            console.log('PartyManagement: Admin access permissions set successfully');
          } catch (adminError) {
            console.error('PartyManagement: Error setting admin access:', adminError);
          }
          
          try {
            await updateEmployeePageAccess(newEmployee.id, newEmployeePageAccess);
            console.log('PartyManagement: Page access permissions set successfully');
          } catch (pageError) {
            console.error('PartyManagement: Error setting page access:', pageError);
          }
        }
        
        return newEmployee;
      } catch (error) {
        console.error('PartyManagement: Error in employee creation process:', error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log('PartyManagement: Employee creation completed successfully');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success("Party added successfully");
      handleCloseAddForm();
    },
    onError: (error: Error) => {
      console.error('PartyManagement: Employee creation failed:', error);
      const errorMessage = error.message || 'Failed to add party. Please try again.';
      setSubmitError(errorMessage);
      toast.error(errorMessage);
    }
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => {
      console.log('Employee deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast("Party removed successfully");
    },
    onError: (error) => {
      console.error('Error deleting employee:', error);
      toast("Error removing party. Please try again.");
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
      toast(`Party ${action}d successfully`);
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
    console.log('PartyManagement: Form submitted, starting validation...');
    setSubmitError(null);
    
    const formData = new FormData(e.target as HTMLFormElement);
    
    const requiredFields = ['first_name', 'email', 'nric', 'dateOfBirth', 'type', 'residencyStatus', 'bankName', 'bankAccount', 'joinDate'];
    const missingFields = requiredFields.filter(field => !formData.get(field));
    
    if (missingFields.length > 0) {
      const errorMessage = `Please fill in required fields: ${missingFields.join(', ')}`;
      setSubmitError(errorMessage);
      toast.error(errorMessage);
      return;
    }

    try {
      const firstName = (formData.get('first_name') as string || '').toUpperCase();
      const lastName = (formData.get('last_name') as string || '').toUpperCase();
      const fullName = `${firstName} ${lastName}`.trim();
      
      const newEmployee = {
        first_name: firstName,
        last_name: lastName || null,
        name: fullName,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string || '',
        nric: (formData.get('nric') as string || '').toUpperCase(),
        dateOfBirth: formData.get('dateOfBirth') as string,
        address: (formData.get('address') as string || '').toUpperCase(),
        position: (formData.get('position') as string || '').toUpperCase(),
        branch: formData.get('branch') as string || '',
        type: formData.get('type') as string,
        residencyStatus: formData.get('residencyStatus') as string,
        bankName: (formData.get('bankName') as string || '').toUpperCase(),
        bankAccount: (formData.get('bankAccount') as string || '').toUpperCase(),
        paymentType: formData.get('paymentType') as string || 'Monthly',
        baseSalary: formData.get('baseSalary') ? parseFloat(formData.get('baseSalary') as string) : null,
        hourlyRate: formData.get('hourlyRate') ? parseFloat(formData.get('hourlyRate') as string) : null,
        joinDate: formData.get('joinDate') as string,
      };

      console.log('PartyManagement: Validated employee data:', newEmployee);
      await addEmployeeMutation.mutateAsync(newEmployee);
    } catch (error) {
      console.error('PartyManagement: Failed to process employee creation:', error);
    }
  };

  const handleAdminAccessChange = (permissions: AdminAccessPermissions) => {
    setNewEmployeeAdminAccess(permissions);
  };

  const handlePageAccessChange = (permissions: EmployeePageAccessPermissions) => {
    setNewEmployeePageAccess(permissions);
  };

  const handleAddParty = (type: 'student' | 'fulltime' | 'casual' | 'trial') => {
    if (type === 'student') {
      setShowAddStudentDialog(true);
    } else if (type === 'trial') {
      setShowAddTrialDialog(true);
    } else {
      setEmployeeType(type === 'fulltime' ? 'Full-Time' : 'Casual');
      setPaymentType(type === 'casual' ? 'Daily' : 'Monthly');
      setShowAddForm(true);
    }
  };

  const handleStudentClick = (studentId: string) => {
    navigate(`/parties/student/${studentId}`);
  };

  const handleEmployeeView = (id: string) => {
    const employee = employees.find(emp => emp.id === id);
    if (employee) {
      const partyType = employee.type === 'Full-Time' ? 'fulltime' : 'casual';
      navigate(`/parties/${partyType}/${id}`);
    }
  };

  const handleEmployeeEdit = (id: string) => {
    const employee = employees.find(emp => emp.id === id);
    if (employee) {
      const partyType = employee.type === 'Full-Time' ? 'fulltime' : 'casual';
      navigate(`/parties/${partyType}/${id}?edit=true`);
    }
  };

  const isLoading = isEmployeesLoading || isStudentsLoading;

  if (isLoading && !studentsData && employees.length === 0) {
    return (
      <ResponsiveLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Party Management</h2>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
          <EmployeeLoadingSkeleton />
        </div>
      </ResponsiveLayout>
    );
  }

  if (employeesError) {
    return (
      <ResponsiveLayout>
        <div className="text-center">
          <p className="text-destructive">Error loading data. Please try again.</p>
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <AuthGuard>
      <ResponsiveLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-foreground">Party Management</h2>
            <div className="flex flex-col sm:flex-row gap-2">
              {canViewEmployeeTabs && (
                <Button
                  variant="outline"
                  onClick={() => setShowModuleSettings(true)}
                  className="w-full sm:w-auto"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Party
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleAddParty('trial')}>
                    <Star className="w-4 h-4 mr-2" />
                    Add Trial
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAddParty('student')}>
                    <Users className="w-4 h-4 mr-2" />
                    Add Student
                  </DropdownMenuItem>
                  {canViewEmployeeTabs && (
                    <>
                      <DropdownMenuItem onClick={() => handleAddParty('fulltime')}>
                        <Briefcase className="w-4 h-4 mr-2" />
                        Add Full-time Employee
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAddParty('casual')}>
                        <Clock className="w-4 h-4 mr-2" />
                        Add Casual Employee
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
              <TabsTrigger value="trials" className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                <span>Trials</span>
                <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                  {trialsData?.total || 0}
                </span>
              </TabsTrigger>
              <TabsTrigger value="students" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Students</span>
                <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                  {studentsData?.total || 0}
                </span>
              </TabsTrigger>
              {canViewEmployeeTabs && (
                <>
                  <TabsTrigger value="fulltime" className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    <span>Full-time</span>
                    <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {employees.filter(e => e.type === 'Full-Time' && !e.resignDate).length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="casual" className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>Casual</span>
                    <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {employees.filter(e => e.type === 'Casual' && !e.resignDate).length}
                    </span>
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            {/* Trials Tab */}
            <TabsContent value="trials" className="space-y-4">
              <TrialManagementList />
            </TabsContent>

            {/* Students Tab */}
            <TabsContent value="students" className="space-y-4">
              <StudentManagementList />
            </TabsContent>

            {/* Full-time Employees Tab */}
            {canViewEmployeeTabs && (
              <TabsContent value="fulltime" className="space-y-4">
                {/* Status Filter */}
                <div className="bg-card p-4 rounded-lg border">
                  <div className="flex items-center space-x-4">
                    <label className="text-sm font-medium text-foreground">Filter by status:</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="current-all">All current employees</SelectItem>
                        <SelectItem value="resigned">Resigned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Employee List */}
                <EmployeeListView
                  employees={filteredEmployees}
                  onView={handleEmployeeView}
                  onEdit={handleEmployeeEdit}
                  onResetPassword={handleResetPassword}
                  onDelete={handleDeleteEmployee}
                  onToggleStatus={handleToggleStatus}
                  isSuperAdmin={isSuperAdmin}
                />

                {/* Empty State */}
                {filteredEmployees.length === 0 && (
                  <Card>
                    <CardContent className="text-center py-12">
                      <p className="text-muted-foreground text-lg mb-2">No full-time employees found</p>
                      <p className="text-muted-foreground/70 mb-4">
                        No employees match the selected filter criteria
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            )}

            {/* Casual Employees Tab */}
            {canViewEmployeeTabs && (
              <TabsContent value="casual" className="space-y-4">
                {/* Status Filter */}
                <div className="bg-card p-4 rounded-lg border">
                  <div className="flex items-center space-x-4">
                    <label className="text-sm font-medium text-foreground">Filter by status:</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="current-all">All current employees</SelectItem>
                        <SelectItem value="resigned">Resigned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Employee List */}
                <EmployeeListView
                  employees={filteredEmployees}
                  onView={handleEmployeeView}
                  onEdit={handleEmployeeEdit}
                  onResetPassword={handleResetPassword}
                  onDelete={handleDeleteEmployee}
                  onToggleStatus={handleToggleStatus}
                  isSuperAdmin={isSuperAdmin}
                />

                {/* Empty State */}
                {filteredEmployees.length === 0 && (
                  <Card>
                    <CardContent className="text-center py-12">
                      <p className="text-muted-foreground text-lg mb-2">No casual employees found</p>
                      <p className="text-muted-foreground/70 mb-4">
                        No employees match the selected filter criteria
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            )}
          </Tabs>
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
            <div className="bg-card rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-card border-b p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">
                      Add New {employeeType === 'Full-Time' ? 'Full-time' : 'Casual'} Employee
                    </h2>
                    <p className="text-muted-foreground">Fill out the employee information</p>
                  </div>
                  <Button variant="outline" onClick={handleCloseAddForm}>
                    Cancel
                  </Button>
                </div>
              </div>

              <div className="p-6">
                {submitError && (
                  <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <div className="flex items-center">
                      <div className="text-destructive text-sm font-medium">
                        Error: {submitError}
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleAddEmployee} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">First Name *</label>
                      <Input 
                        name="first_name" 
                        required 
                        onChange={(e) => { e.target.value = e.target.value.toUpperCase(); }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Last Name</label>
                      <Input 
                        name="last_name" 
                        onChange={(e) => { e.target.value = e.target.value.toUpperCase(); }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Email *</label>
                      <Input name="email" type="email" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Phone</label>
                      <Input name="phone" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">NRIC *</label>
                      <Input 
                        name="nric" 
                        required 
                        onChange={(e) => { e.target.value = e.target.value.toUpperCase(); }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Date of Birth *</label>
                      <Input name="dateOfBirth" type="date" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Join Date *</label>
                      <Input name="joinDate" type="date" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Position</label>
                      <Input 
                        name="position" 
                        onChange={(e) => { e.target.value = e.target.value.toUpperCase(); }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Branch</label>
                      <Input name="branch" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Employee Type *</label>
                      <input type="hidden" name="type" value={employeeType} />
                      <div className="w-full p-2 border border-input rounded-lg bg-muted text-muted-foreground">
                        {employeeType}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Residency Status *</label>
                      <select name="residencyStatus" className="w-full p-2 border border-input rounded-lg bg-background" required>
                        <option value="">Select Status</option>
                        <option value="Citizen">Citizen</option>
                        <option value="PR">Permanent Resident</option>
                        <option value="Work Permit">Work Permit</option>
                        <option value="S Pass">S Pass</option>
                        <option value="Employment Pass">Employment Pass</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Bank Name *</label>
                      <Input 
                        name="bankName" 
                        required 
                        onChange={(e) => { e.target.value = e.target.value.toUpperCase(); }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Bank Account *</label>
                      <Input 
                        name="bankAccount" 
                        required 
                        onChange={(e) => { e.target.value = e.target.value.toUpperCase(); }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Address</label>
                      <Input 
                        name="address" 
                        onChange={(e) => { e.target.value = e.target.value.toUpperCase(); }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Payment Type</label>
                      <input type="hidden" name="paymentType" value={paymentType} />
                      <div className="w-full p-2 border border-input rounded-lg bg-muted text-muted-foreground">
                        {employeeType === 'Casual' ? 'Dynamic Pricing' : paymentType}
                      </div>
                      {employeeType === 'Casual' && (
                        <p className="text-xs text-muted-foreground mt-1">Pay calculated from slot bookings and qualifications</p>
                      )}
                    </div>

                    {/* Only show Monthly/Hourly fields for Full-Time employees */}
                    {paymentType === 'Monthly' && employeeType === 'Full-Time' && (
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Base Salary (S$)</label>
                        <Input name="baseSalary" type="number" step="0.01" />
                      </div>
                    )}

                    {paymentType === 'Hourly' && employeeType === 'Full-Time' && (
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Hourly Rate (S$)</label>
                        <Input name="hourlyRate" type="number" step="0.01" />
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Address</label>
                    <textarea 
                      name="address"
                      rows={3} 
                      className="w-full p-2 border border-input rounded-lg bg-background"
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
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
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

        {/* Add Student Dialog */}
        <AddStudentDialog
          open={showAddStudentDialog}
          onOpenChange={setShowAddStudentDialog}
          onStudentAdded={() => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            setShowAddStudentDialog(false);
          }}
        />

        {/* Add Trial Dialog */}
        <AddTrialDialog
          open={showAddTrialDialog}
          onOpenChange={setShowAddTrialDialog}
          onTrialAdded={() => {
            queryClient.invalidateQueries({ queryKey: ['trials'] });
            setShowAddTrialDialog(false);
          }}
        />
      </ResponsiveLayout>
    </AuthGuard>
  );
};

export default PartyManagement;
