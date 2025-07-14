import React from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';

const LeaveManagement = () => {
  return (
    <AuthGuard>
      <ResponsiveLayout>
        <div>
          <h1>Leave Management</h1>
          <p>Manage employee leave requests and settings here.</p>
        </div>
      </ResponsiveLayout>
    </AuthGuard>
  );
};

export default LeaveManagement;
