
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

  console.log('Index: Rendering with state:', { 
    user: !!user, 
    userEmail: user?.email,
    userrole,
    userType,
    requiresPasswordChange, 
    isLoading,
    linkedStudentsCount: linkedStudents?.length,
    selectedStudentId
  });

  // Add error boundary logging
  React.useEffect(() => {
    console.log('Index: Component mounted');
    return () => {
      console.log('Index: Component unmounted');
    };
  }, []);

  React.useEffect(() => {
    console.log('Index: Auth state changed:', { user: !!user, userrole, userType, isLoading });
  }, [user, userrole, userType, isLoading]);

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

  console.log('Index: User authenticated, showing dashboard for role:', userrole, 'type:', userType);

  const renderDashboard = () => {
    try {
      console.log('Index: Starting dashboard render for role:', userrole, 'type:', userType);
      
      // Students get their own dashboard without sidebar
      if (userType === 'student') {
        console.log('Index: Loading StudentDashboard for student user', { 
          linkedStudentsCount: linkedStudents?.length,
          selectedStudentId 
        });
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
      
      let dashboard;
      switch (userrole) {
        case 'superadmin':
          console.log('Index: Loading DashboardSwitcher for superadmin');
          dashboard = <DashboardSwitcher />;
          break;
        case 'admin':
          console.log('Index: Loading ManagerDashboard');
          dashboard = <ManagerDashboard />;
          break;
        case 'employee':
          console.log('Index: Loading EmployeeDashboard');
          dashboard = <EmployeeDashboard />;
          break;
        default:
          console.log('Index: Unknown role, defaulting to employee dashboard');
          dashboard = <EmployeeDashboard />;
      }
      
      console.log('Index: Dashboard component created successfully');
      return dashboard;
      
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

  // Students get a simplified layout without sidebar
  if (userType === 'student') {
    return (
      <div className="min-h-screen bg-gray-50">
        {renderDashboard()}
      </div>
    );
  }

  try {
    console.log('Index: Starting ResponsiveLayout render');
    return (
      <ResponsiveLayout>
        {renderDashboard()}
      </ResponsiveLayout>
    );
  } catch (error) {
    console.error('Index: Error in ResponsiveLayout:', error);
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
