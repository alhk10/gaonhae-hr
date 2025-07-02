
import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import PageAccessGuard from '@/components/auth/PageAccessGuard';
import EmployeeProfileForm from '@/components/employee/EmployeeProfileForm';

const ProfileContent = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
      </div>
      <EmployeeProfileForm />
    </div>
  );
};

const Profile = () => {
  return (
    <PageAccessGuard requiredPermission="profile">
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <ProfileContent />
          </main>
        </div>
      </div>
    </PageAccessGuard>
  );
};

export default Profile;
