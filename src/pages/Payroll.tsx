import React from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';

const Payroll = () => {
  // Replace this with your actual Payroll component content
  return (
    <AuthGuard>
      <ResponsiveLayout>
        <div>
          <h1>Payroll</h1>
          <p>This is the payroll page content.</p>
        </div>
      </ResponsiveLayout>
    </AuthGuard>
  );
};

export default Payroll;
