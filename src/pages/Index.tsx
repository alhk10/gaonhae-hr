
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/auth/LoginForm';
import LoggedOutPage from '@/components/auth/LoggedOutPage';
import PasswordChangeModal from '@/components/auth/PasswordChangeModal';
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
    console.log('Index: Showing enhanced loading state');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <div className="mt-4 text-gray-600">
            <p className="text-lg font-medium">Loading your workspace...</p>
            <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
          </div>
        </div>
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
    try {
      switch (userrole) {
        case 'superadmin':
          return <SuperadminDashboard />;
        case 'admin':
          return <ManagerDashboard />;
        case 'employee':
          return <EmployeeDashboard />;
        default:
          console.log('Index: Unknown role, defaulting to employee dashboard');
          return <EmployeeDashboard />;
      }
    } catch (error) {
      console.error('Index: Error rendering dashboard:', error);
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center text-red-600">
            <p className="text-lg font-medium">Something went wrong</p>
            <p className="text-sm mt-2">Please try refreshing the page</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
  };

  return (
    <ResponsiveLayout>
      {renderDashboard()}
    </ResponsiveLayout>
  );
};

export default Index;
