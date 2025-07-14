import React from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';

const Attendance = () => {
  return (
    <AuthGuard>
      <ResponsiveLayout>
        <div>
          <h1>Attendance</h1>
          <p>This is the attendance page.</p>
        </div>
      </ResponsiveLayout>
    </AuthGuard>
  );
};

export default Attendance;
