
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/auth/LoginForm';
import PasswordChangeModal from '@/components/auth/PasswordChangeModal';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import SuperadminDashboard from '@/components/dashboard/SuperadminDashboard';
import ManagerDashboard from '@/components/dashboard/ManagerDashboard';
import EmployeeDashboard from '@/components/dashboard/EmployeeDashboard';

const Index = () => {
  const { user, requiresPasswordChange } = useAuth();

  if (!user) {
    return <LoginForm />;
  }

  // Show password change modal if required
  if (requiresPasswordChange) {
    return <PasswordChangeModal open={true} />;
  }

  const renderDashboard = () => {
    switch (user.role) {
      case 'superadmin':
        return <SuperadminDashboard />;
      case 'manager':
        return <ManagerDashboard />;
      case 'employee':
        return <EmployeeDashboard />;
      default:
        return <div>Invalid user role</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          {renderDashboard()}
        </main>
      </div>
    </div>
  );
};

export default Index;
