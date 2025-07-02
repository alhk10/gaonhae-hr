
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/auth/LoginForm';
import PasswordChangeModal from '@/components/auth/PasswordChangeModal';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import SuperadminDashboard from '@/components/dashboard/SuperadminDashboard';
import ManagerDashboard from '@/components/dashboard/ManagerDashboard';
import EmployeeDashboard from '@/components/dashboard/EmployeeDashboard';

const Index = () => {
  const { user, requiresPasswordChange, isLoading } = useAuth();

  console.log('Index: Rendering with state:', { 
    user: !!user, 
    userEmail: user?.email,
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
        <PasswordChangeModal open={true} />
      </div>
    );
  }

  console.log('Index: User authenticated, showing dashboard for role:', user.role);

  const renderDashboard = () => {
    switch (user.role) {
      case 'superadmin':
        return <SuperadminDashboard />;
      case 'manager':
        return <ManagerDashboard />;
      case 'employee':
        return <EmployeeDashboard />;
      default:
        return <div>Invalid user role: {user.role}</div>;
    }
  };

  return (
    <ResponsiveLayout>
      {renderDashboard()}
    </ResponsiveLayout>
  );
};

export default Index;
