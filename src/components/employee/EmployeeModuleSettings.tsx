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

  const modules = [
    { key: 'employees', label: 'Employee Management', description: 'View and manage employee records', category: 'admin' },
    { key: 'payroll', label: 'Payroll Management', description: 'Process payroll and manage salaries', category: 'admin' },
    { key: 'leaveManagement', label: 'Leave Management', description: 'Approve and manage leave requests', category: 'admin' },
    { key: 'claims', label: 'Claims Management', description: 'Review and approve expense claims', category: 'admin' },
    { key: 'attendance', label: 'Attendance Management', description: 'Monitor and manage employee attendance', category: 'admin' },
    { key: 'slotBooking', label: 'Slot Booking Admin', description: 'Manage booking slots and schedules', category: 'admin' }
  ];

  const employeePages = [
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
          profile: true,
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
      const updatePromises = Object.entries(employeePermissions).map(([employeeId, permissions]) => {
        console.log('EmployeeModuleSettings: Updating permissions for employee:', employeeId, permissions);
        const adminPermissions = {
          employees: permissions.employees,
          payroll: permissions.payroll,
          leaveManagement: permissions.leaveManagement,
          claims: permissions.claims,
          attendance: permissions.attendance,
          slotBooking: permissions.slotBooking,
          reports: false
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

  const allModules = [...modules, ...employeePages];

  console.log('EmployeeModuleSettings: Rendering with employees:', employees.length, 'permissions:', Object.keys(employeePermissions).length);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${isMobile ? 'max-w-[95vw] h-[95vh]' : 'max-w-[95vw] max-h-[90vh]'} overflow-hidden flex flex-col`}>
        <DialogHeader>
          <DialogTitle className="text-lg md:text-xl">Employee Module Settings</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col h-full space-y-4 min-h-0">
          <Card className="flex-shrink-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm md:text-base">Module Permissions Overview</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-600">Admin Modules:</div>
                <div className="flex flex-wrap gap-1 md:gap-2 text-xs">
                  {modules.map(module => (
                    <div key={module.key} className="flex items-center space-x-1 bg-blue-50 px-2 py-1 rounded text-[10px] md:text-xs">
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                      <span className="truncate">{isMobile ? module.key : module.label}</span>
                    </div>
                  ))}
                </div>
                <div className="text-xs font-medium text-gray-600 mt-3">Employee Pages:</div>
                <div className="flex flex-wrap gap-1 md:gap-2 text-xs">
                  {employeePages.map(page => (
                    <div key={page.key} className="flex items-center space-x-1 bg-green-50 px-2 py-1 rounded text-[10px] md:text-xs">
                      <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                      <span className="truncate">{isMobile ? page.key : page.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex-1 min-h-0 border rounded-lg">
            <ScrollArea className="h-full">
              {isMobile ? (
                /* Mobile Card Layout */
                <div className="p-4 space-y-4">
                  {employees.map((employee) => (
                    <Card key={employee.id} className="p-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-sm">{employee.name}</h3>
                            <p className="text-xs text-gray-500">{employee.id}</p>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {getEmployeePermissionCount(employee.id)}/{allModules.length}
                          </Badge>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-xs font-medium text-blue-600 mb-2">Admin Modules</h4>
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
                                    className="text-xs cursor-pointer truncate"
                                  >
                                    {module.key}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-xs font-medium text-green-600 mb-2">Employee Pages</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {employeePages.map(page => (
                                <div key={page.key} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`${employee.id}-${page.key}`}
                                    checked={employeePermissions[employee.id]?.[page.key as keyof ExtendedAdminAccessPermissions] || false}
                                    onCheckedChange={(checked) => 
                                      handlePermissionChange(employee.id, page.key, checked as boolean)
                                    }
                                  />
                                  <label 
                                    htmlFor={`${employee.id}-${page.key}`}
                                    className="text-xs cursor-pointer truncate"
                                  >
                                    {page.key}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                /* Desktop Table Layout */
                <div className="min-w-max">
                  <Table className="w-full">
                    <TableHeader className="sticky top-0 bg-white z-10 border-b">
                      <TableRow>
                        <TableHead className="w-48 p-3 border-r bg-gray-50">
                          <div className="font-semibold">Employee</div>
                        </TableHead>
                        <TableHead className="w-20 text-center p-2 border-r bg-gray-50">
                          <div className="text-xs font-semibold">Total</div>
                        </TableHead>
                        {allModules.map(module => (
                          <TableHead key={module.key} className="w-20 text-center p-2 border-r bg-gray-50">
                            <div className="flex flex-col items-center space-y-1">
                              <span className="text-xs font-medium leading-tight text-center max-w-16 break-words">
                                {module.label}
                              </span>
                              <div className={`w-2 h-2 rounded-full ${module.category === 'admin' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.map((employee) => (
                        <TableRow key={employee.id} className="hover:bg-gray-50">
                          <TableCell className="p-3 border-r">
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{employee.name}</span>
                              <span className="text-xs text-gray-500">{employee.id}</span>
                              <span className="text-xs text-gray-400">{employee.email || 'No email'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center p-2 border-r">
                            <Badge variant="secondary" className="text-xs">
                              {getEmployeePermissionCount(employee.id)}/{allModules.length}
                            </Badge>
                          </TableCell>
                          {allModules.map(module => (
                            <TableCell key={module.key} className="text-center p-2 border-r">
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
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center pt-4 border-t bg-white flex-shrink-0 gap-4">
            <div className="text-sm text-gray-600 text-center sm:text-left">
              Managing permissions for {employees.length} employees
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
