
import React from 'react';
import PageAccessGuard from '@/components/auth/PageAccessGuard';
import EmployeeProfileForm from '@/components/employee/EmployeeProfileForm';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { useIsMobile } from '@/hooks/use-mobile';

const ProfileContent = () => {
  const isMobile = useIsMobile();

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className={`font-bold text-gray-900 ${isMobile ? 'text-xl' : 'text-2xl'}`}>My Profile</h2>
      </div>
      <div className={isMobile ? 'px-1' : ''}>
        <EmployeeProfileForm />
      </div>
    </div>
  );
};

const Profile = () => {
  return (
    <PageAccessGuard requiredPermission="profile">
      <ResponsiveLayout>
        <ProfileContent />
      </ResponsiveLayout>
    </PageAccessGuard>
  );
};

export default Profile;
