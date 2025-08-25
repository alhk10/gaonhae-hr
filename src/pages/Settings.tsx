
import React, { useState, useEffect } from 'react';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SuperadminManager from '@/components/admin/SuperadminManager';
import EmployeeModuleSettings from '@/components/employee/EmployeeModuleSettings';
import PublicHolidayManagement from '@/components/settings/PublicHolidayManagement';
import SystemAllowanceDeductionManagement from '@/components/settings/SystemAllowanceDeductionManagement';
import BulkUserCreationManager from '@/components/admin/BulkUserCreationManager';
import BranchManagement from '@/components/settings/BranchManagement';

import { useAuth } from '@/contexts/AuthContext';
import { getEmployees } from '@/services/employeeService';
import { EmployeeProfile } from '@/types/employee';

const Settings = () => {
  const { userrole, isLoading, user, userDetails } = useAuth();
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [showEmployeeSettings, setShowEmployeeSettings] = useState(false);

  // Handle employees update - defined before useEffect
  const handleEmployeesUpdate = async () => {
    try {
      const employeeData = await getEmployees();
      setEmployees(employeeData);
    } catch (error) {
      console.error('Settings: Error fetching employees:', error);
    }
  };

  // All hooks must be called before any conditional returns
  useEffect(() => {
    handleEmployeesUpdate();
  }, []);

  // Show loading while auth is being resolved
  if (isLoading) {
    return (
      <ResponsiveLayout>
        <div className="p-6">
          <div className="text-center text-gray-500">
            Loading...
          </div>
        </div>
      </ResponsiveLayout>
    );
  }

  // Only superadmins can access settings
  if (userrole !== 'superadmin') {
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

        <Tabs defaultValue="auth-users" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="auth-users">Auth Users</TabsTrigger>
            <TabsTrigger value="user-management">User Management</TabsTrigger>
            <TabsTrigger value="employee-modules">Employee Modules</TabsTrigger>
            <TabsTrigger value="system-allowances">System Allowances</TabsTrigger>
            <TabsTrigger value="holidays">Public Holidays</TabsTrigger>
            <TabsTrigger value="branch-management">Branch Management</TabsTrigger>
          </TabsList>


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

          <TabsContent value="branch-management" className="mt-6">
            <BranchManagement />
          </TabsContent>
        </Tabs>
      </div>
    </ResponsiveLayout>
  );
};

export default Settings;
