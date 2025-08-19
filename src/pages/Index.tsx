
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/auth/LoginForm';
import LoggedOutPage from '@/components/auth/LoggedOutPage';
import PasswordChangeModal from '@/components/auth/PasswordChangeModal';
import SystemStatus from '@/components/SystemStatus';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import SuperadminDashboard from '@/components/dashboard/SuperadminDashboard';
import ManagerDashboard from '@/components/dashboard/ManagerDashboard';
import EmployeeDashboard from '@/components/dashboard/EmployeeDashboard';

const Index = () => {
  const { user, userrole, requiresPasswordChange, isLoading, login } = useAuth();

  console.log('Index: Rendering with state:', { 
    user: !!user, 
    userEmail: user?.email,
    userrole,
    requiresPasswordChange, 
    isLoading 
  });

  if (isLoading) {
    console.log('Index: Showing loading state');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    console.log('Index: No user found, showing login form');
    return <LoginForm />;
  }

  if (requiresPasswordChange) {
    console.log('Index: User requires password change, showing modal');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <PasswordChangeModal />
      </div>
    );
  }

  console.log('Index: User authenticated, showing dashboard for role:', userrole);

  const renderDashboard = () => {
    switch (userrole) {
      case 'superadmin':
        return <SuperadminDashboard />;
      case 'admin':
        return <ManagerDashboard />;
      case 'employee':
        return <EmployeeDashboard />;
      default:
        return <EmployeeDashboard />;
    }
  };

  return (
    <ResponsiveLayout>
      <SystemStatus />
      {renderDashboard()}
    </ResponsiveLayout>
  );
};

export default Index;
