
import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Edit } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { getEmployeeById } from '@/data/employeeData';

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  
  // Mock current user - in real app this would come from auth context
  const currentUserId = 'EMP001';
  const employeeData = getEmployeeById(currentUserId);

  const handleEdit = () => {
    if (isEditing) {
      toast("Profile updated successfully");
    }
    setIsEditing(!isEditing);
  };

  if (!employeeData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="text-center">
              <p>Employee data not found</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
                <p className="text-gray-600">View and update your profile information</p>
              </div>
              <Button onClick={handleEdit} className="flex items-center space-x-2">
                <Edit className="w-4 h-4" />
                <span>{isEditing ? 'Save Changes' : 'Edit Profile'}</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="w-5 h-5" />
                    <span>Personal Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-center mb-4">
                    <img 
                      src="/placeholder.svg" 
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Full Name</label>
                    <p className="text-lg text-gray-900">{employeeData.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Employee ID</label>
                    <p className="text-lg text-gray-900">{employeeData.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">NRIC/FIN</label>
                    <p className="text-lg text-gray-900">{employeeData.nric}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <p className="text-lg text-gray-900">{employeeData.email || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Phone</label>
                    {isEditing ? (
                      <input 
                        type="tel" 
                        value={employeeData.phone || ''}
                        className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                        placeholder="Enter phone number"
                      />
                    ) : (
                      <p className="text-lg text-gray-900">{employeeData.phone || 'Not specified'}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Address</label>
                    {isEditing ? (
                      <textarea 
                        value={employeeData.address || ''}
                        className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                        rows={2}
                        placeholder="Enter address"
                      />
                    ) : (
                      <p className="text-lg text-gray-900">{employeeData.address || 'Not specified'}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Work Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Department</label>
                    <p className="text-lg text-gray-900">{employeeData.department || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Position</label>
                    <p className="text-lg text-gray-900">{employeeData.position || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Employment Type</label>
                    <p className="text-lg text-gray-900">{employeeData.type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Date of Birth</label>
                    <p className="text-lg text-gray-900">{employeeData.dateOfBirth}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Residency Status</label>
                    <p className="text-lg text-gray-900">{employeeData.residencyStatus}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Bank Details</label>
                    <p className="text-lg text-gray-900">{employeeData.bankName}</p>
                    <p className="text-sm text-gray-600">{employeeData.bankAccount}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Profile;
