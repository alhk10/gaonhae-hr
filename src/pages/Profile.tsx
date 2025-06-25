
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { User, Edit, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { getEmployeeById, updateEmployee } from '@/services/employeeService';
import { useAuth } from '@/contexts/AuthContext';
import { EmployeeProfile } from '@/types/employee';

const Profile = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [employeeData, setEmployeeData] = useState<EmployeeProfile | null>(null);
  const [formData, setFormData] = useState({
    phone: '',
    address: '',
    email: ''
  });

  useEffect(() => {
    const loadEmployeeData = async () => {
      if (!user?.id) return;
      
      try {
        setIsLoading(true);
        console.log('Profile: Loading employee data for user ID:', user.id);
        
        const data = await getEmployeeById(user.id);
        console.log('Profile: Employee data loaded:', data);
        
        if (data) {
          setEmployeeData(data);
          setFormData({
            phone: data.phone || '',
            address: data.address || '',
            email: data.email || ''
          });
        } else {
          console.error('Profile: No employee data found for user ID:', user.id);
          toast.error("Employee profile not found");
        }
      } catch (error) {
        console.error('Profile: Error loading employee data:', error);
        toast.error("Failed to load profile data");
      } finally {
        setIsLoading(false);
      }
    };

    loadEmployeeData();
  }, [user?.id]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!employeeData || !user?.id) return;

    try {
      setIsSaving(true);
      console.log('Profile: Saving employee data:', formData);
      
      const updatedData = {
        ...employeeData,
        phone: formData.phone,
        address: formData.address,
        email: formData.email
      };

      await updateEmployee(user.id, updatedData);
      
      // Update local state
      setEmployeeData(updatedData);
      setIsEditing(false);
      
      toast.success("Profile updated successfully");
      console.log('Profile: Employee data saved successfully');
    } catch (error) {
      console.error('Profile: Error saving employee data:', error);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = () => {
    if (isEditing) {
      handleSave();
    } else {
      setIsEditing(true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading profile...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!employeeData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="text-center">
              <p className="text-red-600">Employee profile not found</p>
              <p className="text-gray-600 mt-2">Please contact your administrator</p>
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
              <Button 
                onClick={handleEdit} 
                disabled={isSaving}
                className="flex items-center space-x-2"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Edit className="w-4 h-4" />
                )}
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
                    {isEditing ? (
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="mt-1"
                        placeholder="Enter email address"
                      />
                    ) : (
                      <p className="text-lg text-gray-900">{employeeData.email || 'Not specified'}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Phone</label>
                    {isEditing ? (
                      <Input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="mt-1"
                        placeholder="Enter phone number"
                      />
                    ) : (
                      <p className="text-lg text-gray-900">{employeeData.phone || 'Not specified'}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Address</label>
                    {isEditing ? (
                      <Textarea
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        className="mt-1"
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
                    <label className="text-sm font-medium text-gray-600">Branch</label>
                    <p className="text-lg text-gray-900">{employeeData.branch || 'Not specified'}</p>
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
                  {employeeData.paymentType && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Payment Type</label>
                      <p className="text-lg text-gray-900">{employeeData.paymentType}</p>
                    </div>
                  )}
                  {employeeData.baseSalary && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Base Salary</label>
                      <p className="text-lg text-gray-900">S${employeeData.baseSalary.toLocaleString()}</p>
                    </div>
                  )}
                  {employeeData.hourlyRate && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Hourly Rate</label>
                      <p className="text-lg text-gray-900">S${employeeData.hourlyRate}/hour</p>
                    </div>
                  )}
                  {employeeData.dailyRate && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Daily Rate</label>
                      <p className="text-lg text-gray-900">S${employeeData.dailyRate}/day</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Allowances and Deductions */}
            {(employeeData.allowances?.length > 0 || employeeData.deductions?.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {employeeData.allowances?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Allowances</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {employeeData.allowances.map((allowance) => (
                          <div key={allowance.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="font-medium">{allowance.name}</span>
                            <span className="text-green-600">+S${allowance.amount}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {employeeData.deductions?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Deductions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {employeeData.deductions.map((deduction) => (
                          <div key={deduction.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="font-medium">{deduction.name}</span>
                            <span className="text-red-600">-S${deduction.amount}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Profile;
