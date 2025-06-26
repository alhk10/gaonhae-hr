
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { EmployeeProfile } from '@/types/employee';
import { updateEmployeeAdminAccess } from '@/services/employeeService';

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
  const [employeePermissions, setEmployeePermissions] = useState<{[key: string]: ExtendedAdminAccessPermissions}>({});
  const [isLoading, setIsLoading] = useState(false);

  const modules = [
    { key: 'employees', label: 'Employee Management', description: 'View and manage employee records', category: 'admin' },
    { key: 'payroll', label: 'Payroll Management', description: 'Process payroll and manage salaries', category: 'admin' },
    { key: 'leaveManagement', label: 'Leave Management', description: 'Approve and manage leave requests', category: 'admin' },
    { key: 'claims', label: 'Claims Management', description: 'Review and approve expense claims', category: 'admin' },
    { key: 'attendance', label: 'Attendance Management', description: 'Monitor and manage employee attendance', category: 'admin' },
    { key: 'slotBooking', label: 'Slot Booking Admin', description: 'Manage booking slots and schedules', category: 'admin' },
    { key: 'profile', label: 'Profile', description: 'Access to employee profile page', category: 'employee' },
    { key: 'applyLeave', label: 'Apply Leave', description: 'Submit leave applications', category: 'employee' },
    { key: 'submitClaim', label: 'Submit Claim', description: 'Submit expense claims', category: 'employee' },
    { key: 'payslips', label: 'Payslips', description: 'View and download payslips', category: 'employee' },
    { key: 'myAttendance', label: 'My Attendance', description: 'View personal attendance records', category: 'employee' },
    { key: 'slotBookingEmployee', label: 'Slot Booking', description: 'Book appointment slots', category: 'employee' }
  ];

  useEffect(() => {
    if (open && employees.length > 0) {
      console.log('EmployeeModuleSettings: Initializing permissions for employees:', employees.length);
      // Initialize permissions state with current employee permissions
      const permissions: {[key: string]: ExtendedAdminAccessPermissions} = {};
      employees.forEach(emp => {
        console.log('EmployeeModuleSettings: Setting permissions for employee:', emp.id, emp.name, emp.adminAccess);
        permissions[emp.id] = {
          employees: emp.adminAccess?.employees || false,
          payroll: emp.adminAccess?.payroll || false,
          leaveManagement: emp.adminAccess?.leaveManagement || false,
          claims: emp.adminAccess?.claims || false,
          attendance: emp.adminAccess?.attendance || false,
          slotBooking: emp.adminAccess?.slotBooking || false,
          profile: true, // Default employee permissions
          applyLeave: true,
          submitClaim: true,
          payslips: true,
          myAttendance: true,
          slotBookingEmployee: true
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
      // Update each employee's permissions (only admin permissions are stored in DB)
      const updatePromises = Object.entries(employeePermissions).map(([employeeId, permissions]) => {
        console.log('EmployeeModuleSettings: Updating permissions for employee:', employeeId, permissions);
        const adminPermissions = {
          employees: permissions.employees,
          payroll: permissions.payroll,
          leaveManagement: permissions.leaveManagement,
          claims: permissions.claims,
          attendance: permissions.attendance,
          slotBooking: permissions.slotBooking,
          reports: false // Remove reports
        };
        return updateEmployeeAdminAccess(employeeId, adminPermissions);
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

  const getEmployeePermissionCount = (employeeId: string) => {
    const permissions = employeePermissions[employeeId];
    if (!permissions) return 0;
    return Object.values(permissions).filter(Boolean).length;
  };

  console.log('EmployeeModuleSettings: Rendering with employees:', employees.length, 'permissions:', Object.keys(employeePermissions).length);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Employee Module Settings</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col h-full space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Module Permissions Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-600">Admin Modules:</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  {modules.filter(m => m.category === 'admin').map(module => (
                    <div key={module.key} className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="truncate">{module.label}</span>
                    </div>
                  ))}
                </div>
                <div className="text-xs font-medium text-gray-600 mt-3">Employee Pages:</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  {modules.filter(m => m.category === 'employee').map(module => (
                    <div key={module.key} className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="truncate">{module.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <ScrollArea className="flex-1 max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48">Employee</TableHead>
                  <TableHead className="w-20 text-center">Permissions</TableHead>
                  {modules.map(module => (
                    <TableHead key={module.key} className="w-24 text-center">
                      <div className="flex flex-col items-center space-y-1">
                        <span className="text-xs font-medium leading-tight text-center">{module.label}</span>
                        <div className={`w-2 h-2 rounded-full ${module.category === 'admin' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{employee.name}</span>
                        <span className="text-xs text-gray-500">{employee.id}</span>
                        <span className="text-xs text-gray-400">{employee.email || 'No email'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="text-xs">
                        {getEmployeePermissionCount(employee.id)}/{modules.length}
                      </Badge>
                    </TableCell>
                    {modules.map(module => (
                      <TableCell key={module.key} className="text-center">
                        <Checkbox
                          checked={employeePermissions[employee.id]?.[module.key as keyof ExtendedAdminAccessPermissions] || false}
                          onCheckedChange={(checked) => 
                            handlePermissionChange(employee.id, module.key, checked as boolean)
                          }
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {employees.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No employees found</p>
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-between items-center pt-4 border-t bg-white">
            <div className="text-sm text-gray-600">
              Managing permissions for {employees.length} employees
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleSaveChanges} disabled={isLoading}>
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
