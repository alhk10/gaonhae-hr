
import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { Settings, Save } from 'lucide-react';
import { Navigate } from 'react-router-dom';

interface ModuleSettings {
  payroll: boolean;
  leaveManagement: boolean;
  claims: boolean;
  attendance: boolean;
  slotBooking: boolean;
  reports: boolean;
  employeeManagement: boolean;
}

const ModuleSettings = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  // Redirect if not superadmin
  if (user?.role !== 'superadmin') {
    return <Navigate to="/" replace />;
  }

  const [settings, setSettings] = useState<ModuleSettings>({
    payroll: true,
    leaveManagement: true,
    claims: true,
    attendance: true,
    slotBooking: true,
    reports: true,
    employeeManagement: true,
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = (module: keyof ModuleSettings) => {
    setSettings(prev => ({
      ...prev,
      [module]: !prev[module]
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // In a real implementation, this would save to the database
      console.log('Saving module settings:', settings);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Module settings saved successfully');
    } catch (error) {
      console.error('Error saving module settings:', error);
      toast.error('Failed to save module settings');
    } finally {
      setIsSaving(false);
    }
  };

  const modules = [
    {
      key: 'employeeManagement' as keyof ModuleSettings,
      title: 'Employee Management',
      description: 'Manage employee profiles, add/edit employee information'
    },
    {
      key: 'payroll' as keyof ModuleSettings,
      title: 'Payroll Module',
      description: 'Process payroll, manage salaries and CPF calculations'
    },
    {
      key: 'leaveManagement' as keyof ModuleSettings,
      title: 'Leave Management',
      description: 'Handle leave requests, approvals and leave balance tracking'
    },
    {
      key: 'claims' as keyof ModuleSettings,
      title: 'Claims Management',
      description: 'Process employee claims for medical, transport and other expenses'
    },
    {
      key: 'attendance' as keyof ModuleSettings,
      title: 'Attendance Tracking',
      description: 'Track employee attendance, clock in/out and work hours'
    },
    {
      key: 'slotBooking' as keyof ModuleSettings,
      title: 'Slot Booking',
      description: 'Manage facility bookings and resource scheduling'
    },
    {
      key: 'reports' as keyof ModuleSettings,
      title: 'Reports & Analytics',
      description: 'Generate reports and view HR analytics dashboard'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        {!isMobile && <Sidebar />}
        <main className="flex-1 p-3 md:p-6 overflow-auto">
          <div className="space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Settings className="w-6 h-6" />
                  Module Settings
                </h2>
                <p className="text-sm md:text-base text-gray-600">
                  Configure which HR modules are available to users
                </p>
              </div>
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="flex items-center space-x-2 w-full sm:w-auto"
                size={isMobile ? "lg" : "default"}
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>HR System Modules</CardTitle>
                <CardDescription>
                  Enable or disable specific modules for all users. Disabled modules will not be accessible through the navigation menu.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {modules.map((module) => (
                  <div key={module.key} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{module.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                    </div>
                    <div className="ml-4">
                      <Switch
                        checked={settings[module.key]}
                        onCheckedChange={() => handleToggle(module.key)}
                        aria-label={`Toggle ${module.title}`}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
                <CardDescription>Current system configuration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Modules</p>
                    <p className="text-lg text-gray-900">
                      {Object.values(settings).filter(Boolean).length} of {modules.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">System Version</p>
                    <p className="text-lg text-gray-900">v1.0.0</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ModuleSettings;
