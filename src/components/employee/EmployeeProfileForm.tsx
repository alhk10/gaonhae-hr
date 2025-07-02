
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
  const { user } = useAuth();
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
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
          return;
        }

        const employeeData = await getEmployeeById(user.employeeId);
        if (employeeData) {
          setEmployee(employeeData);
          setFormData({
            name: employeeData.name || '',
            email: employeeData.email || '',
            phone: employeeData.phone || '',
            address: employeeData.address || '',
            bankName: employeeData.bankName || '',
            bankAccount: employeeData.bankAccount || ''
          });
        }
      } catch (error) {
        console.error('Error loading employee data:', error);
        toast('Failed to load profile data');
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
      if (!employee) return;

      setSaving(true);
      
      const updatedEmployeeData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        bankName: formData.bankName,
        bankAccount: formData.bankAccount
      };

      await updateEmployee(employee.id, updatedEmployeeData);
      
      setEmployee({
        ...employee,
        ...updatedEmployeeData
      });
      
      toast('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast('Failed to update profile');
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
              />
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
