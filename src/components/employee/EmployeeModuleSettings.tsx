
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { EmployeeProfile } from '@/types/employee';
import { updateEmployeeAdminAccess, updateEmployeePageAccess } from '@/services/employeeService';
import { useIsMobile } from '@/hooks/use-mobile';

interface ExtendedAdminAccessPermissions {
  employees: boolean;
  payroll: boolean;
  leaveManagement: boolean;
  claims: boolean;
  attendance: boolean;
  slotBooking: boolean;
  profile: boolean;
  applyLeave: boolean;
  submitClaim: boolean;
  payslips: boolean;
  myAttendance: boolean;
  slotBookingEmployee: boolean;
}

interface EmployeeModuleSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: EmployeeProfile[];
  onEmployeesUpdate: () => void;
}

const EmployeeModuleSettings: React.FC<EmployeeModuleSettingsProps> = ({
  open,
  onOpenChange,
  employees,
  onEmployeesUpdate
}) => {
  const isMobile = useIsMobile();
  const [employeePermissions, setEmployeePermissions] = useState<{[key: string]: ExtendedAdminAccessPermissions}>({});
  const [isLoading, setIsLoading] = useState(false);
  const [employeeTypeFilter, setEmployeeTypeFilter] = useState<string>('all');

  const adminModules = [
    { key: 'employees', label: 'Employee Management', description: 'View and manage employee records' },
    { key: 'payroll', label: 'Payroll Management', description: 'Process payroll and manage salaries' },
    { key: 'leaveManagement', label: 'Leave Management', description: 'Approve and manage leave requests' },
    { key: 'claims', label: 'Claims Management', description: 'Review and approve expense claims' },
    { key: 'attendance', label: 'Attendance Management', description: 'Monitor and manage employee attendance' },
    { key: 'slotBooking', label: 'Slot Booking Admin', description: 'Manage booking slots and schedules' }
  ];

  const employeePages = [
    { key: 'profile', label: 'Profile', description: 'Access to employee profile page' },
    { key: 'applyLeave', label: 'Apply Leave', description: 'Submit leave applications' },
    { key: 'submitClaim', label: 'Submit Claim', description: 'Submit expense claims' },
    { key: 'payslips', label: 'Payslips', description: 'View and download payslips' },
    { key: 'myAttendance', label: 'My Attendance', description: 'View personal attendance records' },
    { key: 'slotBookingEmployee', label: 'Slot Booking', description: 'Book appointment slots' }
  ];

  // Filter employees based on the selected type
  const filteredEmployees = employees.filter(employee => {
    if (employeeTypeFilter === 'all') return true;
    return employee.type.toLowerCase() === employeeTypeFilter.toLowerCase();
  });

  useEffect(() => {
    if (open && employees.length > 0) {
      console.log('EmployeeModuleSettings: Initializing permissions for employees:', employees.length);
      const permissions: {[key: string]: ExtendedAdminAccessPermissions} = {};
      employees.forEach(emp => {
        console.log('EmployeeModuleSettings: Setting permissions for employee:', emp.id, emp.name, emp.adminAccess, emp.pageAccess);
        permissions[emp.id] = {
          employees: emp.adminAccess?.employees || false,
          payroll: emp.adminAccess?.payroll || false,
          leaveManagement: emp.adminAccess?.leaveManagement || false,
          claims: emp.adminAccess?.claims || false,
          attendance: emp.adminAccess?.attendance || false,
          slotBooking: emp.adminAccess?.slotBooking || false,
          profile: emp.pageAccess?.profile ?? true,
          applyLeave: emp.pageAccess?.applyLeave ?? true,
          submitClaim: emp.pageAccess?.submitClaim ?? true,
          payslips: emp.pageAccess?.payslips ?? true,
          myAttendance: emp.pageAccess?.myAttendance ?? true,
          slotBookingEmployee: emp.pageAccess?.slotBookingEmployee ?? true
        };
      });
      setEmployeePermissions(permissions);
      console.log('EmployeeModuleSettings: Initialized permissions:', permissions);
    }
  }, [open, employees]);

  const handlePermissionChange = (employeeId: string, moduleKey: string, checked: boolean) => {
    console.log('EmployeeModuleSettings: Permission change:', employeeId, moduleKey, checked);
    setEmployeePermissions(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [moduleKey]: checked
      }
    }));
  };

  const handleSaveChanges = async () => {
    console.log('EmployeeModuleSettings: Saving changes for permissions:', employeePermissions);
    setIsLoading(true);
    try {
      const updatePromises = Object.entries(employeePermissions).map(async ([employeeId, permissions]) => {
        console.log('EmployeeModuleSettings: Updating permissions for employee:', employeeId, permissions);
        
        // Update admin permissions
        const adminPermissions = {
          employees: permissions.employees,
          payroll: permissions.payroll,
          leaveManagement: permissions.leaveManagement,
          claims: permissions.claims,
          attendance: permissions.attendance,
          slotBooking: permissions.slotBooking,
          reports: false
        };
        
        // Update page permissions
        const pagePermissions = {
          profile: permissions.profile,
          applyLeave: permissions.applyLeave,
          submitClaim: permissions.submitClaim,
          payslips: permissions.payslips,
          myAttendance: permissions.myAttendance,
          slotBookingEmployee: permissions.slotBookingEmployee
        };
        
        await Promise.all([
          updateEmployeeAdminAccess(employeeId, adminPermissions),
          updateEmployeePageAccess(employeeId, pagePermissions)
        ]);
      });
      
      await Promise.all(updatePromises);
      
      toast({
        title: "Success",
        description: "Employee module permissions updated successfully",
      });
      
      onEmployeesUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('EmployeeModuleSettings: Error updating employee permissions:', error);
      toast({
        title: "Error",
        description: "Failed to update employee permissions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getAdminPermissionCount = (employeeId: string) => {
    const permissions = employeePermissions[employeeId];
    if (!permissions) return 0;
    return adminModules.filter(module => permissions[module.key as keyof ExtendedAdminAccessPermissions]).length;
  };

  const getEmployeePermissionCount = (employeeId: string) => {
    const permissions = employeePermissions[employeeId];
    if (!permissions) return 0;
    return employeePages.filter(page => permissions[page.key as keyof ExtendedAdminAccessPermissions]).length;
  };

  const renderPermissionTable = (modules: typeof adminModules, type: 'admin' | 'employee') => {
    if (isMobile) {
      return (
        <ScrollArea className="h-[400px] w-full">
          <div className="p-4 space-y-4">
            {filteredEmployees.map((employee) => (
              <Card key={employee.id} className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">{employee.name}</h3>
                    </div>
                    <Badge variant="secondary" className="text-xs ml-2 flex-shrink-0">
                      {type === 'admin' ? getAdminPermissionCount(employee.id) : getEmployeePermissionCount(employee.id)}/{modules.length}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {modules.map(module => (
                      <div key={module.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${employee.id}-${module.key}`}
                          checked={employeePermissions[employee.id]?.[module.key as keyof ExtendedAdminAccessPermissions] || false}
                          onCheckedChange={(checked) => 
                            handlePermissionChange(employee.id, module.key, checked as boolean)
                          }
                        />
                        <label 
                          htmlFor={`${employee.id}-${module.key}`}
                          className="text-xs cursor-pointer truncate flex-1"
                        >
                          {module.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      );
    }

    return (
      <ScrollArea className="h-[400px] w-full">
        <div className="min-w-full">
          <Table className="w-full">
            <TableHeader className="sticky top-0 bg-white z-10 border-b">
              <TableRow>
                <TableHead className="w-[200px] p-2 border-r bg-gray-50 sticky left-0 z-20">
                  <div className="font-semibold text-sm">Employee Name</div>
                </TableHead>
                <TableHead className="w-16 text-center p-1 border-r bg-gray-50">
                  <div className="text-xs font-semibold">Total</div>
                </TableHead>
                {modules.map(module => (
                  <TableHead key={module.key} className="min-w-[140px] text-center p-1 border-r bg-gray-50">
                    <div className="flex flex-col items-center space-y-1">
                      <span className="text-xs font-medium leading-tight text-center break-words px-1">
                        {module.label}
                      </span>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow key={employee.id} className="hover:bg-gray-50">
                  <TableCell className="p-2 border-r w-[200px] sticky left-0 bg-white z-10">
                    <div className="font-medium text-sm truncate" title={employee.name}>
                      {employee.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-center p-1 border-r">
                    <Badge variant="secondary" className="text-xs whitespace-nowrap">
                      {type === 'admin' ? getAdminPermissionCount(employee.id) : getEmployeePermissionCount(employee.id)}/{modules.length}
                    </Badge>
                  </TableCell>
                  {modules.map(module => (
                    <TableCell key={module.key} className="text-center p-1 border-r">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={employeePermissions[employee.id]?.[module.key as keyof ExtendedAdminAccessPermissions] || false}
                          onCheckedChange={(checked) => 
                            handlePermissionChange(employee.id, module.key, checked as boolean)
                          }
                        />
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>
    );
  };

  console.log('EmployeeModuleSettings: Rendering with employees:', employees.length, 'filtered employees:', filteredEmployees.length, 'permissions:', Object.keys(employeePermissions).length);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="text-lg md:text-xl">Employee Module Settings</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-6 pt-4 flex-shrink-0 space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Filter by Employee Type:</label>
                <Select value={employeeTypeFilter} onValueChange={setEmployeeTypeFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    <SelectItem value="full-time">Full-Time</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-gray-600">
                Showing {filteredEmployees.length} of {employees.length} employees
              </div>
            </div>
          </div>

          <div className="flex-1 px-6 min-h-0 overflow-hidden">
            <Tabs defaultValue="admin" className="flex flex-col h-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="admin">Admin Modules</TabsTrigger>
                <TabsTrigger value="employee">Employee Pages</TabsTrigger>
              </TabsList>
              
              <TabsContent value="admin" className="flex-1 min-h-0">
                <Card className="h-full flex flex-col">
                  <CardHeader className="pb-3 flex-shrink-0">
                    <CardTitle className="text-sm md:text-base">Admin Module Permissions</CardTitle>
                    <p className="text-xs text-gray-600">Control access to administrative functions</p>
                  </CardHeader>
                  <CardContent className="flex-1 min-h-0 p-0">
                    {renderPermissionTable(adminModules, 'admin')}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="employee" className="flex-1 min-h-0">
                <Card className="h-full flex flex-col">
                  <CardHeader className="pb-3 flex-shrink-0">
                    <CardTitle className="text-sm md:text-base">Employee Page Permissions</CardTitle>
                    <p className="text-xs text-gray-600">Control access to employee self-service pages</p>
                  </CardHeader>
                  <CardContent className="flex-1 min-h-0 p-0">
                    {renderPermissionTable(employeePages, 'employee')}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center p-6 border-t bg-white flex-shrink-0 gap-4 mt-auto">
            <div className="text-sm text-gray-600 text-center sm:text-left">
              Managing permissions for {filteredEmployees.length} employees
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)} 
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveChanges} 
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeModuleSettings;
