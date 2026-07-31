import React from 'react';
import { useNavigate } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import BranchDashboardView from '@/components/dashboard/BranchDashboardView';
import PortalSwitcher from '@/components/dashboard/PortalSwitcher';
import { usePortalOptions } from '@/hooks/usePortalOptions';
import { UserType } from '@/types/auth';

const BranchDashboardPage = () => {
  const navigate = useNavigate();
  const { options, setActiveUserType } = usePortalOptions();

  const handleChange = (type: UserType) => {
    setActiveUserType(type);
    if (type !== 'branch') {
      navigate('/');
    }
  };

  return (
    <ResponsiveLayout>
      <PortalSwitcher options={options} value="branch" onChange={handleChange} />
      <BranchDashboardView />
    </ResponsiveLayout>
  );
};

export default BranchDashboardPage;
