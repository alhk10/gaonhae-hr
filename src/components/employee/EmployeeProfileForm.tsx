import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getEmployeeById, updateEmployee } from '@/services/employeeService';
import { EmployeeProfile } from '@/types/employee';

const EmployeeProfileForm = () => {
  const { user, userrole } = useAuth();
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    email: '',
    phone: '',
    address: '',
    bankName: '',
    bankAccount: ''
  });

  useEffect(() => {
    const loadEmployeeData = async () => {
      try {
        if (!user?.employeeId) {
          console.error('No employee ID found for current user');
          toast.error('Unable to load profile: No employee ID found');
          return;
        }

        console.log('Loading employee data for ID:', user.employeeId);
        const employeeData = await getEmployeeById(user.employeeId);
        
        if (employeeData) {
          console.log('Employee data loaded:', employeeData);
          setEmployee(employeeData);
          setFormData({
            name: employeeData.name || '',
            display_name: employeeData.display_name || employeeData.name || '',
            email: employeeData.email || '',
            phone: employeeData.phone || '',
            address: employeeData.address || '',
            bankName: employeeData.bankName || '',
            bankAccount: employeeData.bankAccount || ''
          });
        } else {
          console.error('Employee data not found for ID:', user.employeeId);
          toast.error('Employee profile not found');
        }
      } catch (error) {
        console.error('Error loading employee data:', error);
        toast.error('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    loadEmployeeData();
  }, [user?.employeeId]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      if (!employee || !user?.employeeId) {
        toast.error('Unable to save: Missing employee data');
        return;
      }

      setSaving(true);
      
      // Only allow superadmins to change the name
      const updatedEmployeeData: any = {
        display_name: formData.display_name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        bankName: formData.bankName,
        bankAccount: formData.bankAccount
      };

      // Only include name if user is superadmin
      if (userrole === 'superadmin') {
        updatedEmployeeData.name = formData.name;
      }

      console.log('Updating employee with data:', updatedEmployeeData);
      await updateEmployee(employee.id, updatedEmployeeData);
      
      setEmployee({
        ...employee,
        ...updatedEmployeeData,
        // Keep original name if not superadmin
        name: userrole === 'superadmin' ? formData.name : employee.name
      });
      
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-600">Employee profile not found</p>
        </CardContent>
      </Card>
    );
  }

  // Verify the logged-in user matches the profile being viewed
  if (user?.employeeId !== employee.id) {
    console.error('Profile access denied: User ID mismatch', {
      userEmployeeId: user?.employeeId,
      profileEmployeeId: employee.id
    });
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-600">Access denied: Profile mismatch</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter your full name"
                disabled={userrole !== 'superadmin'}
                className={userrole !== 'superadmin' ? 'bg-gray-100 text-gray-600' : ''}
              />
              {userrole !== 'superadmin' && (
                <p className="text-xs text-gray-500 mt-1">
                  Only administrators can modify the full name
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => handleInputChange('display_name', e.target.value)}
                placeholder="Enter display name"
              />
              <p className="text-xs text-gray-500 mt-1">
                This name will be used when displaying your profile
              </p>
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter your email address"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Enter your phone number"
              />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Enter your address"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Employee ID</Label>
              <Input value={employee.id} disabled />
            </div>
            <div>
              <Label>NRIC</Label>
              <Input value={employee.nric} disabled />
            </div>
            <div>
              <Label>Position</Label>
              <Input value={employee.position || 'Not specified'} disabled />
            </div>
            <div>
              <Label>Branch</Label>
              <Input value={employee.branch || 'Not specified'} disabled />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Banking Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                value={formData.bankName}
                onChange={(e) => handleInputChange('bankName', e.target.value)}
                placeholder="Enter your bank name"
              />
            </div>
            <div>
              <Label htmlFor="bankAccount">Bank Account Number</Label>
              <Input
                id="bankAccount"
                value={formData.bankAccount}
                onChange={(e) => handleInputChange('bankAccount', e.target.value)}
                placeholder="Enter your account number"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};

export default EmployeeProfileForm;
