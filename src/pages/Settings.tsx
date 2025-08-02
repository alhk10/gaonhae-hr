
import React, { useState, useEffect } from 'react';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SuperadminManager from '@/components/admin/SuperadminManager';
import EmployeeModuleSettings from '@/components/employee/EmployeeModuleSettings';
import PublicHolidayManagement from '@/components/settings/PublicHolidayManagement';
import SystemAllowanceDeductionManagement from '@/components/settings/SystemAllowanceDeductionManagement';
import BulkUserCreationManager from '@/components/admin/BulkUserCreationManager';
import AuthenticationMonitor from '@/components/admin/AuthenticationMonitor';
import { useAuth } from '@/contexts/AuthContext';
import { getEmployees } from '@/services/employeeService';
import { EmployeeProfile } from '@/types/employee';

const Settings = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [showEmployeeSettings, setShowEmployeeSettings] = useState(false);

  // Only superadmins can access settings
  if (user?.role !== 'superadmin') {
    return (
      <ResponsiveLayout>
        <div className="p-6">
          <div className="text-center text-gray-500">
            Access denied. Only superadmins can access system settings.
          </div>
        </div>
      </ResponsiveLayout>
    );
  }

  const handleEmployeesUpdate = async () => {
    try {
      const employeeData = await getEmployees();
      setEmployees(employeeData);
    } catch (error) {
      console.error('Settings: Error fetching employees:', error);
    }
  };

  useEffect(() => {
    handleEmployeesUpdate();
  }, []);

  return (
    <ResponsiveLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600">Manage system configuration and user access</p>
        </div>

        <Tabs defaultValue="auth-monitor" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="auth-monitor">Auth Monitor</TabsTrigger>
            <TabsTrigger value="auth-users">Auth Users</TabsTrigger>
            <TabsTrigger value="user-management">User Management</TabsTrigger>
            <TabsTrigger value="employee-modules">Employee Modules</TabsTrigger>
            <TabsTrigger value="system-allowances">System Allowances</TabsTrigger>
            <TabsTrigger value="holidays">Public Holidays</TabsTrigger>
          </TabsList>

          <TabsContent value="auth-monitor" className="mt-6">
            <AuthenticationMonitor />
          </TabsContent>

          <TabsContent value="auth-users" className="mt-6">
            <BulkUserCreationManager />
          </TabsContent>

          <TabsContent value="user-management" className="mt-6">
            <SuperadminManager />
          </TabsContent>

          <TabsContent value="employee-modules" className="mt-6">
            <EmployeeModuleSettings 
              open={showEmployeeSettings}
              onOpenChange={setShowEmployeeSettings}
              employees={employees}
              onEmployeesUpdate={handleEmployeesUpdate}
            />
          </TabsContent>

          <TabsContent value="system-allowances" className="mt-6">
            <SystemAllowanceDeductionManagement />
          </TabsContent>

          <TabsContent value="holidays" className="mt-6">
            <PublicHolidayManagement />
          </TabsContent>
        </Tabs>
      </div>
    </ResponsiveLayout>
  );
};

export default Settings;
