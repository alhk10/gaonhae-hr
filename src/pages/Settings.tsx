
import React, { useState, useEffect } from 'react';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SuperadminManager from '@/components/admin/SuperadminManager';
import EmployeeModuleSettings from '@/components/employee/EmployeeModuleSettings';
import PublicHolidayManagement from '@/components/settings/PublicHolidayManagement';
import SystemAllowanceDeductionManagement from '@/components/settings/SystemAllowanceDeductionManagement';
import BulkUserCreationManager from '@/components/admin/BulkUserCreationManager';
import BranchManagement from '@/components/settings/BranchManagement';
import BranchAccessManagement from '@/components/settings/BranchAccessManagement';
import EducationResourcesManagement from '@/components/settings/EducationResourcesManagement';
import { NotificationSettingsManagement } from '@/components/settings/NotificationSettingsManagement';
import { TermCalendarManagement } from '@/components/settings/TermCalendarManagement';
import { BranchTimetableManagement } from '@/components/settings/BranchTimetableManagement';
import DuplicateStudentsManager from '@/components/settings/DuplicateStudentsManager';

import { useAuth } from '@/contexts/AuthContext';
import { getEmployees } from '@/services/employeeService';
import { EmployeeProfile } from '@/types/employee';

const Settings = () => {
  const { userrole, isLoading, user, userDetails } = useAuth();
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [showEmployeeSettings, setShowEmployeeSettings] = useState(false);

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

  if (isLoading) {
    return (
      <ResponsiveLayout>
        <div className="p-6">
          <div className="text-center text-gray-500">Loading...</div>
        </div>
      </ResponsiveLayout>
    );
  }

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
          <TabsList className="flex flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="auth-users">Auth Users</TabsTrigger>
            <TabsTrigger value="user-management">User Mgmt</TabsTrigger>
            <TabsTrigger value="employee-modules">Emp Modules</TabsTrigger>
            <TabsTrigger value="branch-access">Branch Access</TabsTrigger>
            <TabsTrigger value="system-allowances">Allowances</TabsTrigger>
            <TabsTrigger value="holidays">Holidays</TabsTrigger>
            <TabsTrigger value="branch-management">Branches</TabsTrigger>
            <TabsTrigger value="timetable">Timetable</TabsTrigger>
            <TabsTrigger value="terms">Terms</TabsTrigger>
            <TabsTrigger value="education">Education</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="duplicates">Duplicates</TabsTrigger>
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

          <TabsContent value="branch-access" className="mt-6">
            <BranchAccessManagement />
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

          <TabsContent value="timetable" className="mt-6">
            <BranchTimetableManagement />
          </TabsContent>

          <TabsContent value="terms" className="mt-6">
            <TermCalendarManagement />
          </TabsContent>

          <TabsContent value="education" className="mt-6">
            <EducationResourcesManagement />
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <NotificationSettingsManagement />
          </TabsContent>

          <TabsContent value="duplicates" className="mt-6">
            <DuplicateStudentsManager />
          </TabsContent>
        </Tabs>
      </div>
    </ResponsiveLayout>
  );
};

export default Settings;
