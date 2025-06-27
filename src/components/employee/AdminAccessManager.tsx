
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { AdminAccessPermissions } from '@/types/employee';

interface AdminAccessManagerProps {
  adminAccess: AdminAccessPermissions | undefined;
  onAdminAccessChange: (permissions: AdminAccessPermissions) => void;
  isEditing: boolean;
}

const AdminAccessManager: React.FC<AdminAccessManagerProps> = ({
  adminAccess,
  onAdminAccessChange,
  isEditing
}) => {
  const permissions = [
    { key: 'employees', label: 'Employee Access', description: 'Access to view and manage employee information' },
    { key: 'payroll', label: 'Payroll Access', description: 'Access to view and process payroll information' },
    { key: 'leaveManagement', label: 'Leave Management Access', description: 'Access to review and approve leave requests' },
    { key: 'claims', label: 'Claims Access', description: 'Access to review and approve expense claims' },
    { key: 'attendance', label: 'Attendance Access', description: 'Access to view and monitor employee attendance' },
    { key: 'slotBooking', label: 'Slot Booking Access', description: 'Access to manage booking slots and schedules' },
    { key: 'reports', label: 'Reports Access', description: 'Access to view system reports and analytics' }
  ];

  const handlePermissionChange = (permissionKey: string, checked: boolean) => {
    const updatedPermissions = {
      ...adminAccess,
      [permissionKey]: checked
    };
    onAdminAccessChange(updatedPermissions);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employee Permissions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {permissions.map((permission) => (
          <div key={permission.key} className="flex items-start space-x-3">
            <Checkbox
              id={permission.key}
              checked={adminAccess?.[permission.key as keyof AdminAccessPermissions] || false}
              onCheckedChange={(checked) => 
                handlePermissionChange(permission.key, checked as boolean)
              }
              disabled={!isEditing}
            />
            <div className="flex-1">
              <label
                htmlFor={permission.key}
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
          <p className="text-sm text-muted-foreground">No employee permissions assigned.</p>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default AdminAccessManager;
