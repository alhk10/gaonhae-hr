
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { updateEmployee } from '@/services/employeeService';
import { EmployeeProfile } from '@/types/employee';

interface EditEmployeeFormProps {
  employee: EmployeeProfile;
  onSave: (updatedEmployee: EmployeeProfile) => void;
  onCancel: () => void;
}

const EditEmployeeForm: React.FC<EditEmployeeFormProps> = ({ employee, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: employee.name,
    nric: employee.nric,
    dateOfBirth: employee.dateOfBirth,
    residencyStatus: employee.residencyStatus,
    type: employee.type,
    baseSalary: employee.baseSalary || '',
    hourlyRate: employee.hourlyRate || '',
    dailyRate: employee.dailyRate || '',
    paymentType: employee.paymentType || 'Monthly',
    bankName: employee.bankName,
    bankAccount: employee.bankAccount,
    branch: employee.branch || '',
    position: employee.position || '',
    phone: employee.phone || '',
    address: employee.address || '',
    email: employee.email || ''
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      console.log('Updating employee:', employee.id, formData);
      
      const updateData = {
        ...formData,
        baseSalary: formData.baseSalary ? Number(formData.baseSalary) : null,
        hourlyRate: formData.hourlyRate ? Number(formData.hourlyRate) : null,
        dailyRate: formData.dailyRate ? Number(formData.dailyRate) : null,
      };

      await updateEmployee(employee.id, updateData);
      
      const updatedEmployee: EmployeeProfile = {
        ...employee,
        ...updateData,
        baseSalary: updateData.baseSalary || undefined,
        hourlyRate: updateData.hourlyRate || undefined,
        dailyRate: updateData.dailyRate || undefined,
      };
      
      onSave(updatedEmployee);
      toast("Employee details updated successfully");
    } catch (error) {
      console.error('Error updating employee:', error);
      toast("Error updating employee details");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Personal Information</h3>
            
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="nric">NRIC/FIN</Label>
              <Input
                id="nric"
                value={formData.nric}
                onChange={(e) => handleInputChange('nric', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="residencyStatus">Residency Status</Label>
              <Select value={formData.residencyStatus} onValueChange={(value) => handleInputChange('residencyStatus', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Singapore Citizen">Singapore Citizen</SelectItem>
                  <SelectItem value="Permanent Resident Year 1">Permanent Resident Year 1</SelectItem>
                  <SelectItem value="Permanent Resident Year 2">Permanent Resident Year 2</SelectItem>
                  <SelectItem value="Work Permit">Work Permit</SelectItem>
                  <SelectItem value="S Pass">S Pass</SelectItem>
                  <SelectItem value="Employment Pass">Employment Pass</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Work Information</h3>
            
            <div>
              <Label htmlFor="branch">Branch</Label>
              <Input
                id="branch"
                value={formData.branch}
                onChange={(e) => handleInputChange('branch', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => handleInputChange('position', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="type">Employment Type</Label>
              <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Full-Time">Full-Time</SelectItem>
                  <SelectItem value="Casual">Casual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="paymentType">Payment Type</Label>
              <Select value={formData.paymentType} onValueChange={(value) => handleInputChange('paymentType', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Hourly">Hourly</SelectItem>
                  <SelectItem value="Daily">Daily</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.paymentType === 'Monthly' && (
              <div>
                <Label htmlFor="baseSalary">Base Salary (S$)</Label>
                <Input
                  id="baseSalary"
                  type="number"
                  value={formData.baseSalary}
                  onChange={(e) => handleInputChange('baseSalary', e.target.value)}
                />
              </div>
            )}

            {formData.paymentType === 'Hourly' && (
              <div>
                <Label htmlFor="hourlyRate">Hourly Rate (S$)</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  value={formData.hourlyRate}
                  onChange={(e) => handleInputChange('hourlyRate', e.target.value)}
                />
              </div>
            )}

            {formData.paymentType === 'Daily' && (
              <div>
                <Label htmlFor="dailyRate">Daily Rate (S$)</Label>
                <Input
                  id="dailyRate"
                  type="number"
                  value={formData.dailyRate}
                  onChange={(e) => handleInputChange('dailyRate', e.target.value)}
                />
              </div>
            )}

            <div>
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                value={formData.bankName}
                onChange={(e) => handleInputChange('bankName', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="bankAccount">Bank Account</Label>
              <Input
                id="bankAccount"
                value={formData.bankAccount}
                onChange={(e) => handleInputChange('bankAccount', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};

export default EditEmployeeForm;
