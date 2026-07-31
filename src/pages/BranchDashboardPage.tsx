import React from 'react';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import BranchDashboardView from '@/components/dashboard/BranchDashboardView';

const BranchDashboardPage = () => {
  return (
    <ResponsiveLayout>
      <BranchDashboardView />
    </ResponsiveLayout>
  );
};

export default BranchDashboardPage;
