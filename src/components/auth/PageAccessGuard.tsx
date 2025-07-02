
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getEmployees } from '@/services/employeeService';
import { EmployeeProfile } from '@/types/employee';

interface PageAccessGuardProps {
  children: React.ReactNode;
  requiredPermission: keyof EmployeeProfile['pageAccess'];
  fallback?: React.ReactNode;
}

const PageAccessGuard: React.FC<PageAccessGuardProps> = ({ 
  children, 
  requiredPermission,
  fallback = (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
        <p className="text-gray-600">You don't have permission to access this page.</p>
        <p className="text-sm text-gray-500">Please contact your administrator if you believe this is an error.</p>
      </div>
    </div>
  )
}) => {
  const { user } = useAuth();
  const [currentEmployee, setCurrentEmployee] = useState<EmployeeProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      console.log('PageAccessGuard: Checking access for permission:', requiredPermission);
      console.log('PageAccessGuard: Current user:', user);
      
      // Superadmin and manager have access to all pages
      if (user?.role === 'superadmin' || user?.role === 'manager') {
        console.log('PageAccessGuard: Superadmin/Manager access granted');
        setHasAccess(true);
        setIsLoading(false);
        return;
      }

      // For employees, check page access permissions
      if (user?.email && user?.role === 'employee') {
        try {
          const employees = await getEmployees();
          const employee = employees.find(emp => emp.email === user.email);
          
          console.log('PageAccessGuard: Found employee:', employee?.name);
          console.log('PageAccessGuard: Employee page access:', employee?.pageAccess);
          
          setCurrentEmployee(employee || null);
          
          if (employee?.pageAccess) {
            const hasPermission = employee.pageAccess[requiredPermission];
            console.log(`PageAccessGuard: Permission ${requiredPermission}:`, hasPermission);
            setHasAccess(hasPermission || false);
          } else {
            console.log('PageAccessGuard: No page access permissions found');
            setHasAccess(false);
          }
        } catch (error) {
          console.error('PageAccessGuard: Error checking permissions:', error);
          setHasAccess(false);
        }
      } else {
        console.log('PageAccessGuard: No valid user found');
        setHasAccess(false);
      }
      
      setIsLoading(false);
    };

    checkAccess();
  }, [user, requiredPermission]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default PageAccessGuard;
