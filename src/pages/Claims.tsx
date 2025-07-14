import React from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';

const Claims = () => {
  

  return (
    <AuthGuard>
      <ResponsiveLayout>
        <div>Claims Page</div>
      </ResponsiveLayout>
    </AuthGuard>
  );
};

export default Claims;
