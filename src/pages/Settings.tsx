
import React from 'react';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SuperadminManager from '@/components/admin/SuperadminManager';
import EmployeeModuleSettings from '@/components/employee/EmployeeModuleSettings';
import PublicHolidayManagement from '@/components/settings/PublicHolidayManagement';
import BulkUserCreationManager from '@/components/admin/BulkUserCreationManager';
import { useAuth } from '@/contexts/AuthContext';

const Settings = () => {
  const { user } = useAuth();

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

  return (
    <ResponsiveLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600">Manage system configuration and user access</p>
        </div>

        <Tabs defaultValue="user-management" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="user-management">User Management</TabsTrigger>
            <TabsTrigger value="auth-users">Auth Users</TabsTrigger>
            <TabsTrigger value="employee-modules">Employee Modules</TabsTrigger>
            <TabsTrigger value="holidays">Public Holidays</TabsTrigger>
          </TabsList>

          <TabsContent value="user-management" className="mt-6">
            <SuperadminManager />
          </TabsContent>

          <TabsContent value="auth-users" className="mt-6">
            <BulkUserCreationManager />
          </TabsContent>

          <TabsContent value="employee-modules" className="mt-6">
            <EmployeeModuleSettings />
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
