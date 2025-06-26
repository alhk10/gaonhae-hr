
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { EmployeeProfile, AdminAccessPermissions } from '@/types/employee';
import { updateEmployeeAdminAccess } from '@/services/employeeService';

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
  const [employeePermissions, setEmployeePermissions] = useState<{[key: string]: AdminAccessPermissions}>({});
  const [isLoading, setIsLoading] = useState(false);

  const modules = [
    { key: 'employees', label: 'Employee Management', description: 'View and manage employee records' },
    { key: 'payroll', label: 'Payroll Management', description: 'Process payroll and manage salaries' },
    { key: 'leaveManagement', label: 'Leave Management', description: 'Approve and manage leave requests' },
    { key: 'claims', label: 'Claims Management', description: 'Review and approve expense claims' },
    { key: 'attendance', label: 'Attendance Management', description: 'Monitor and manage employee attendance' },
    { key: 'slotBooking', label: 'Slot Booking Admin', description: 'Manage booking slots and schedules' },
    { key: 'reports', label: 'Reports', description: 'Access to system reports and analytics' }
  ];

  useEffect(() => {
    if (open) {
      // Initialize permissions state with current employee permissions
      const permissions: {[key: string]: AdminAccessPermissions} = {};
      employees.forEach(emp => {
        permissions[emp.id] = emp.adminAccess || {
          employees: false,
          payroll: false,
          leaveManagement: false,
          claims: false,
          attendance: false,
          slotBooking: false,
          reports: false
        };
      });
      setEmployeePermissions(permissions);
    }
  }, [open, employees]);

  const handlePermissionChange = (employeeId: string, moduleKey: string, checked: boolean) => {
    setEmployeePermissions(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [moduleKey]: checked
      }
    }));
  };

  const handleSaveChanges = async () => {
    setIsLoading(true);
    try {
      // Update each employee's permissions
      const updatePromises = Object.entries(employeePermissions).map(([employeeId, permissions]) => 
        updateEmployeeAdminAccess(employeeId, permissions)
      );
      
      await Promise.all(updatePromises);
      
      toast({
        title: "Success",
        description: "Employee module permissions updated successfully",
      });
      
      onEmployeesUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating employee permissions:', error);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Employee Module Settings</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col h-full space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Module Permissions Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                {modules.map(module => (
                  <div key={module.key} className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="truncate">{module.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <ScrollArea className="flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48">Employee</TableHead>
                  <TableHead className="w-20 text-center">Permissions</TableHead>
                  {modules.map(module => (
                    <TableHead key={module.key} className="w-32 text-center">
                      <div className="flex flex-col items-center space-y-1">
                        <span className="text-xs font-medium">{module.label}</span>
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
                        <span className="text-xs text-gray-400">{employee.email}</span>
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
                          checked={employeePermissions[employee.id]?.[module.key as keyof AdminAccessPermissions] || false}
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
          </ScrollArea>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveChanges} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeModuleSettings;
