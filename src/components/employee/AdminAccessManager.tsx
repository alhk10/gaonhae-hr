
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { AdminAccessPermissions, EmployeePageAccessPermissions } from '@/types/employee';

interface AdminAccessManagerProps {
  adminAccess: AdminAccessPermissions | undefined;
  pageAccess: EmployeePageAccessPermissions | undefined;
  onAdminAccessChange: (permissions: AdminAccessPermissions) => void;
  onPageAccessChange: (permissions: EmployeePageAccessPermissions) => void;
  isEditing: boolean;
}

const AdminAccessManager: React.FC<AdminAccessManagerProps> = ({
  adminAccess,
  pageAccess,
  onAdminAccessChange,
  onPageAccessChange,
  isEditing
}) => {
  const adminPermissions = [
    { key: 'employees', label: 'Employee Management', description: 'Manage employee records and data' },
    { key: 'payroll', label: 'Payroll Management', description: 'Process payroll and manage salaries' },
    { key: 'leaveManagement', label: 'Leave Management', description: 'Approve and manage leave requests' },
    { key: 'claims', label: 'Claims Management', description: 'Review and approve expense claims' },
    { key: 'attendance', label: 'Attendance Management', description: 'Monitor and manage employee attendance' },
    { key: 'slotBooking', label: 'Slot Booking Admin', description: 'Manage booking slots and schedules' },
    { key: 'reports', label: 'Reports', description: 'Access to system reports and analytics' }
  ];

  const pagePermissions = [
    { key: 'profile', label: 'Profile Access', description: 'View and edit personal profile information' },
    { key: 'applyLeave', label: 'Apply Leave', description: 'Submit leave applications and requests' },
    { key: 'submitClaim', label: 'Submit Claim', description: 'Submit expense claims and reimbursements' },
    { key: 'payslips', label: 'Payslips', description: 'View and download payslips and salary details' },
    { key: 'myAttendance', label: 'My Attendance', description: 'View personal attendance records and history' },
    { key: 'slotBookingEmployee', label: 'Slot Booking', description: 'Book and manage personal appointment slots' },
    { key: 'cctvMonitoring', label: 'CCTV Monitoring', description: 'View live CCTV streams for accessible branches' }
  ];

  const handleAdminPermissionChange = (permissionKey: string, checked: boolean) => {
    const updatedPermissions = {
      ...adminAccess,
      [permissionKey]: checked
    };
    onAdminAccessChange(updatedPermissions);
  };

  const handlePagePermissionChange = (permissionKey: string, checked: boolean) => {
    const updatedPermissions = {
      ...pageAccess,
      [permissionKey]: checked
    };
    onPageAccessChange(updatedPermissions);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Employee Page Access Permissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pagePermissions.map((permission) => (
            <div key={permission.key} className="flex items-start space-x-3">
              <Checkbox
                id={`page-${permission.key}`}
                checked={pageAccess?.[permission.key as keyof EmployeePageAccessPermissions] || false}
                onCheckedChange={(checked) => 
                  handlePagePermissionChange(permission.key, checked as boolean)
                }
                disabled={!isEditing}
              />
              <div className="flex-1">
                <label
                  htmlFor={`page-${permission.key}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {permission.label}
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  {permission.description}
                </p>
              </div>
            </div>
          ))}
          {!pageAccess || Object.keys(pageAccess).length === 0 ? (
            <p className="text-sm text-muted-foreground">No page access permissions assigned.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Admin Access Permissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {adminPermissions.map((permission) => (
            <div key={permission.key} className="flex items-start space-x-3">
              <Checkbox
                id={`admin-${permission.key}`}
                checked={adminAccess?.[permission.key as keyof AdminAccessPermissions] || false}
                onCheckedChange={(checked) => 
                  handleAdminPermissionChange(permission.key, checked as boolean)
                }
                disabled={!isEditing}
              />
              <div className="flex-1">
                <label
                  htmlFor={`admin-${permission.key}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {permission.label}
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  {permission.description}
                </p>
              </div>
            </div>
          ))}
          {!adminAccess || Object.keys(adminAccess).length === 0 ? (
            <p className="text-sm text-muted-foreground">No admin access permissions assigned.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAccessManager;
