
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/auth/LoginForm';
import LoggedOutPage from '@/components/auth/LoggedOutPage';
import PasswordChangeModal from '@/components/auth/PasswordChangeModal';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import DashboardSwitcher from '@/components/dashboard/DashboardSwitcher';
import ManagerDashboard from '@/components/dashboard/ManagerDashboard';
import EmployeeDashboard from '@/components/dashboard/EmployeeDashboard';
import StudentDashboard from '@/components/dashboard/StudentDashboard';
import StudentSwitcher from '@/components/dashboard/StudentSwitcher';
import { logger } from '@/utils/logger';

const Index = () => {
  const { 
    user, 
    userrole, 
    userType, 
    requiresPasswordChange, 
    isLoading, 
    login,
    linkedStudents,
    selectedStudentId,
    setSelectedStudent
  } = useAuth();

  logger.debug('Index: Rendering', { user: !!user, userrole, userType, isLoading });

  if (isLoading) {
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
    return <LoginForm />;
  }

  if (requiresPasswordChange) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <PasswordChangeModal />
      </div>
    );
  }

  const renderDashboard = () => {
    try {
      // Students get their own dashboard without sidebar
      if (userType === 'student') {
        return (
          <>
            <StudentSwitcher
              linkedStudents={linkedStudents}
              selectedStudentId={selectedStudentId}
              onSelectStudent={setSelectedStudent}
            />
            <StudentDashboard studentId={selectedStudentId || undefined} />
          </>
        );
      }
      
      switch (userrole) {
        case 'superadmin':
          return <DashboardSwitcher />;
        case 'admin':
          return <ManagerDashboard />;
        case 'employee':
        default:
          return <EmployeeDashboard />;
      }
    } catch (error) {
      logger.error('Index: Error rendering dashboard:', error);
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

  // Students get a simplified layout without sidebar
  if (userType === 'student') {
    return (
      <div className="min-h-screen bg-gray-50">
        {renderDashboard()}
      </div>
    );
  }

  try {
    return (
      <ResponsiveLayout>
        {renderDashboard()}
      </ResponsiveLayout>
    );
  } catch (error) {
    logger.error('Index: Error in ResponsiveLayout:', error);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-red-600">
          <p className="text-lg font-medium">Layout Error</p>
          <p className="text-sm mt-2">Error: {error instanceof Error ? error.message : 'Unknown error'}</p>
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

export default Index;
