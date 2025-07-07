
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import LeaveEncashmentManager from '@/components/leave/LeaveEncashmentManager';
import EmployeeEncashmentHistory from '@/components/leave/EmployeeEncashmentHistory';

const LeaveEncashment = () => {
  const { user } = useAuth();

  return (
    <ResponsiveLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Leave Encashment</h1>
          <p className="text-gray-600 mt-2">
            {user?.role === 'superadmin' 
              ? 'Manage leave encashment for all employees'
              : 'View your leave encashment history'
            }
          </p>
        </div>

        {user?.role === 'superadmin' ? (
          <LeaveEncashmentManager />
        ) : (
          <EmployeeEncashmentHistory employeeId={user?.id || ''} />
        )}
      </div>
    </ResponsiveLayout>
  );
};

export default LeaveEncashment;
