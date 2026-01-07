import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getEmployees } from '@/services/employeeService';
import { EmployeeProfile } from '@/types/employee';

interface PositionAccessGuardProps {
  children: React.ReactNode;
  allowedPositions: string[];
  requireBranch?: boolean; // If true, employee must have a branch tagged
  fallback?: React.ReactNode;
}

const PositionAccessGuard: React.FC<PositionAccessGuardProps> = ({ 
  children, 
  allowedPositions,
  requireBranch = false,
  fallback
}) => {
  const { user, userrole, isLoading: authLoading } = useAuth();
  const [currentEmployee, setCurrentEmployee] = useState<EmployeeProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      console.log('PositionAccessGuard: Checking access for positions:', allowedPositions);
      
      if (authLoading) {
        console.log('PositionAccessGuard: AuthContext still loading, waiting...');
        setIsLoading(true);
        return;
      }
      
      if (!user) {
        console.log('PositionAccessGuard: No user found');
        setHasAccess(false);
        setIsLoading(false);
        return;
      }
      
      // Superadmin always has access
      if (userrole === 'superadmin') {
        console.log('PositionAccessGuard: Superadmin access granted');
        setHasAccess(true);
        setIsLoading(false);
        return;
      }

      // For other users, check position
      if (user?.email) {
        try {
          const employees = await getEmployees();
          const employee = employees.find(emp => emp.email === user.email);
          
          setCurrentEmployee(employee || null);
          
          if (employee) {
            const normalizedPosition = employee.position?.toLowerCase() || '';
            const isAllowedPosition = allowedPositions.some(
              pos => normalizedPosition === pos.toLowerCase()
            );
            
            console.log('PositionAccessGuard: Employee position check:', {
              position: employee.position,
              isAllowedPosition,
              requireBranch,
              department: employee.department
            });
            
            if (isAllowedPosition) {
              // If branch is required, check department
              if (requireBranch) {
                const hasBranch = employee.department && 
                  employee.department !== 'Main Office' && 
                  employee.department.trim() !== '';
                setHasAccess(hasBranch);
              } else {
                setHasAccess(true);
              }
            } else {
              setHasAccess(false);
            }
          } else {
            console.log('PositionAccessGuard: No employee found for user');
            setHasAccess(false);
          }
        } catch (error) {
          console.error('PositionAccessGuard: Error checking permissions:', error);
          setHasAccess(false);
        }
      } else {
        setHasAccess(false);
      }
      
      setIsLoading(false);
    };

    checkAccess();
  }, [user, allowedPositions, userrole, authLoading, requireBranch]);

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
    const accessDeniedFallback = !user ? (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Authentication Required</h2>
          <p className="text-gray-600">Please log in to access this page.</p>
        </div>
      </div>
    ) : (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
          <p className="text-gray-600">This page is restricted to Partners and Senior Partners only.</p>
          <p className="text-sm text-gray-500">Please contact your administrator if you believe this is an error.</p>
        </div>
      </div>
    );
    
    return <>{fallback || accessDeniedFallback}</>;
  }

  return <>{children}</>;
};

export default PositionAccessGuard;
