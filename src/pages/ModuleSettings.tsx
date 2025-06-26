
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Settings, Save, Shield, Users, Calendar, DollarSign, FileText, Clock, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

interface ModuleConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  category: 'core' | 'advanced' | 'reporting';
}

const ModuleSettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [modules, setModules] = useState<ModuleConfig[]>([
    {
      id: 'employees',
      name: 'Employee Management',
      description: 'Manage employee profiles, personal information, and organizational structure',
      icon: <Users className="w-5 h-5" />,
      enabled: true,
      category: 'core'
    },
    {
      id: 'payroll',  
      name: 'Payroll Processing',
      description: 'Process monthly payroll, calculate salaries, and manage payment distributions',
      icon: <DollarSign className="w-5 h-5" />,
      enabled: true,
      category: 'core'
    },
    {
      id: 'leave',
      name: 'Leave Management',
      description: 'Handle leave applications, approvals, and leave balance tracking',
      icon: <Calendar className="w-5 h-5" />,
      enabled: true,
      category: 'core'
    },
    {
      id: 'claims',
      name: 'Claims Processing',
      description: 'Manage expense claims, reimbursements, and approval workflows',
      icon: <FileText className="w-5 h-5" />,
      enabled: true,
      category: 'advanced'
    },
    {
      id: 'attendance',
      name: 'Attendance Tracking',
      description: 'Track employee attendance, working hours, and generate reports',
      icon: <Clock className="w-5 h-5" />,
      enabled: true,
      category: 'advanced'
    },
    {
      id: 'slotBooking',
      name: 'Slot Booking',
      description: 'Manage appointment slots, bookings, and scheduling for services',
      icon: <BookOpen className="w-5 h-5" />,
      enabled: true,
      category: 'advanced'
    }
  ]);

  const [isSaving, setIsSaving] = useState(false);

  // Redirect if not superadmin
  useEffect(() => {
    if (user && user.role !== 'superadmin') {
      navigate('/');
      toast.error('Access denied. Superadmin privileges required.');
    }
  }, [user, navigate]);

  // Load module settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('moduleSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setModules(prevModules => 
          prevModules.map(module => ({
            ...module,
            enabled: parsed[module.id] !== undefined ? parsed[module.id] : module.enabled
          }))
        );
      } catch (error) {
        console.error('Error loading module settings:', error);
      }
    }
  }, []);

  const handleModuleToggle = (moduleId: string) => {
    setModules(prevModules =>
      prevModules.map(module =>
        module.id === moduleId ? { ...module, enabled: !module.enabled } : module
      )
    );
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const settings = modules.reduce((acc, module) => {
        acc[module.id] = module.enabled;
        return acc;
      }, {} as Record<string, boolean>);

      localStorage.setItem('moduleSettings', JSON.stringify(settings));
      toast.success('Module settings saved successfully');
    } catch (error) {
      console.error('Error saving module settings:', error);
      toast.error('Failed to save module settings');
    } finally {
      setIsSaving(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'core':
        return 'bg-blue-100 text-blue-800';
      case 'advanced':
        return 'bg-purple-100 text-purple-800';
      case 'reporting':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const groupedModules = modules.reduce((acc, module) => {
    if (!acc[module.category]) {
      acc[module.category] = [];
    }
    acc[module.category].push(module);
    return acc;
  }, {} as Record<string, ModuleConfig[]>);

  if (user?.role !== 'superadmin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        {!isMobile && <Sidebar />}
        <main className="flex-1 p-3 md:p-6 overflow-auto">
          <div className="space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm" 
                  onClick={() => navigate('/employees')}
                  className="p-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <Settings className="w-6 h-6 text-blue-600" />
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900">Module Settings</h1>
                    <Badge className="bg-red-100 text-red-800 text-xs">
                      <Shield className="w-3 h-3 mr-1" />
                      Superadmin Only
                    </Badge>
                  </div>
                  <p className="text-sm md:text-base text-gray-600">Configure which HR modules are active in your system</p>
                </div>
              </div>
              <Button 
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="flex items-center space-x-2 w-full sm:w-auto"
                size={isMobile ? "lg" : "default"}
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
              </Button>
            </div>

            <div className="space-y-4 md:space-y-6">
              {Object.entries(groupedModules).map(([category, categoryModules]) => (
                <Card key={category}>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg md:text-xl capitalize flex items-center space-x-2">
                      <span>{category} Modules</span>
                      <Badge className={getCategoryColor(category)} variant="secondary">
                        {categoryModules.length} modules
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {categoryModules.map((module) => (
                        <div key={module.id} className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className="mt-1 text-blue-600">
                              {module.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className="font-semibold text-gray-900 text-sm md:text-base">{module.name}</h3>
                                <Badge 
                                  variant={module.enabled ? "default" : "secondary"}
                                  className="text-xs"
                                >
                                  {module.enabled ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                              <p className="text-xs md:text-sm text-gray-600 break-words">{module.description}</p>
                            </div>
                          </div>
                          <div className="ml-4 flex-shrink-0">
                            <Switch
                              checked={module.enabled}
                              onCheckedChange={() => handleModuleToggle(module.id)}
                              disabled={module.id === 'employees'} // Keep employee management always enabled
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg md:text-xl">System Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Modules:</span>
                        <span className="font-medium">{modules.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Active Modules:</span>
                        <span className="font-medium text-green-600">{modules.filter(m => m.enabled).length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Inactive Modules:</span>
                        <span className="font-medium text-red-600">{modules.filter(m => !m.enabled).length}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Core Modules:</span>
                        <span className="font-medium">{groupedModules.core?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Advanced Modules:</span>
                        <span className="font-medium">{groupedModules.advanced?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Last Updated:</span>
                        <span className="font-medium">{new Date().toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ModuleSettings;
