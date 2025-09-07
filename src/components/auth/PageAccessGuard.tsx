
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getEmployees } from '@/services/employeeService';
import { EmployeeProfile } from '@/types/employee';

interface PageAccessGuardProps {
  children: React.ReactNode;
  requiredPermission: keyof EmployeeProfile['pageAccess'] | keyof EmployeeProfile['adminAccess'];
  fallback?: React.ReactNode;
}

const PageAccessGuard: React.FC<PageAccessGuardProps> = ({ 
  children, 
  requiredPermission,
  fallback
}) => {
  const { user, userrole, isLoading: authLoading } = useAuth(); // Add authLoading
  const [currentEmployee, setCurrentEmployee] = useState<EmployeeProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      console.log('PageAccessGuard: Checking access for permission:', requiredPermission);
      console.log('PageAccessGuard: Current user:', {
        id: user?.id,
        email: user?.email,
        userrole: userrole,
        employeeId: user?.employeeId,
        authLoading: authLoading
      });
      
      // CRITICAL: Wait for AuthContext to finish loading first
      if (authLoading) {
        console.log('PageAccessGuard: AuthContext still loading, waiting...');
        setIsLoading(true);
        return;
      }
      
      // Check if user is authenticated first
      if (!user) {
        console.log('PageAccessGuard: No user found - authentication required');
        setHasAccess(false);
        setIsLoading(false);
        return;
      }
      
      // Superadmin has access to all pages
      if (userrole === 'superadmin') {
        console.log('PageAccessGuard: Superadmin access granted');
        setHasAccess(true);
        setIsLoading(false);
        return;
      }

      // CRITICAL: For Kim Hasung, check if he has admin role with slotBooking permission
      if (userrole === 'admin' && user.email === 'hasung534@gmail.com') {
        console.log('PageAccessGuard: 🚀 Kim Hasung admin access - checking slotBooking permission');
        
        // For slotBooking permission specifically, grant access to Kim Hasung admin
        if (requiredPermission === 'slotBooking') {
          console.log('PageAccessGuard: ✅ Kim Hasung granted slotBooking admin access');
          setHasAccess(true);
          setIsLoading(false);
          return;
        }
      }

      // For all other users (including managers), check specific permissions
      if (user?.email && user?.employeeId) {
        try {
          const employees = await getEmployees();
          // CRITICAL: Match by both email AND employeeId for security
          const employee = employees.find(emp => 
            emp.email === user.email && emp.id === user.employeeId
          );
          
          console.log('PageAccessGuard: Employee lookup result:', {
            found: !!employee,
            employeeName: employee?.name,
            employeeId: employee?.id,
            employeeEmail: employee?.email
          });
          
          setCurrentEmployee(employee || null);
          
          if (employee) {
            // CRITICAL: Verify user identity matches employee data
            if (employee.id !== user.employeeId || employee.email !== user.email) {
              console.error('PageAccessGuard: Identity mismatch detected!', {
                employeeId: employee.id,
                userEmployeeId: user.employeeId,
                employeeEmail: employee.email,
                userEmail: user.email
              });
              setHasAccess(false);
              setIsLoading(false);
              return;
            }

            console.log('PageAccessGuard: Employee page access:', employee.pageAccess);
            console.log('PageAccessGuard: Employee admin access:', employee.adminAccess);
            
            // Check both page access and admin access permissions
            let hasPermission = false;
            
            // Check page access permissions first
            if (employee.pageAccess && requiredPermission in employee.pageAccess) {
              hasPermission = employee.pageAccess[requiredPermission as keyof EmployeeProfile['pageAccess']] || false;
              console.log(`PageAccessGuard: Page permission ${requiredPermission}:`, hasPermission);
            }
            
            // If not found in page access, check admin access permissions
            if (!hasPermission && employee.adminAccess && requiredPermission in employee.adminAccess) {
              hasPermission = employee.adminAccess[requiredPermission as keyof EmployeeProfile['adminAccess']] || false;
              console.log(`PageAccessGuard: Admin permission ${requiredPermission}:`, hasPermission);
            }
            
            setHasAccess(hasPermission);
          } else {
            console.log('PageAccessGuard: No employee found for user');
            setHasAccess(false);
          }
        } catch (error) {
          console.error('PageAccessGuard: Error checking permissions:', error);
          setHasAccess(false);
        }
      } else {
        console.log('PageAccessGuard: No valid user found or missing employeeId');
        setHasAccess(false);
      }
      
      setIsLoading(false);
    };

    checkAccess();
  }, [user, requiredPermission, userrole, authLoading]); // Add userrole and authLoading to dependencies

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
    // Provide different messages based on authentication status
    const accessDeniedFallback = !user ? (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Authentication Required</h2>
          <p className="text-gray-600">Please log in to access this page.</p>
          <p className="text-sm text-gray-500">Your session may have expired.</p>
        </div>
      </div>
    ) : (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
          <p className="text-sm text-gray-500">Required permission: {requiredPermission}</p>
          <p className="text-sm text-gray-500">Please contact your administrator if you believe this is an error.</p>
        </div>
      </div>
    );
    
    return <>{fallback || accessDeniedFallback}</>;
  }

  return <>{children}</>;
};

export default PageAccessGuard;
