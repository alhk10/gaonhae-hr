import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { updateEmployee } from '@/services/employeeService';
import { getBranches } from '@/services/settingsService';
import { EmployeeProfile, AllowanceDeduction } from '@/types/employee';
import { Plus, Trash2 } from 'lucide-react';
import AddAllowanceDialog from './AddAllowanceDialog';
import AddDeductionDialog from './AddDeductionDialog';
import { useAuth } from '@/contexts/AuthContext';

interface EditEmployeeFormProps {
  employee: EmployeeProfile;
  onSave: (updatedEmployee: EmployeeProfile) => void;
  onCancel: () => void;
}

// Common positions in Singapore companies
const POSITION_OPTIONS = [
  'Manager',
  'Assistant Manager',
  'Senior Executive',
  'Executive',
  'Senior Officer',
  'Officer',
  'Assistant',
  'Clerk',
  'Supervisor',
  'Team Leader',
  'Senior Specialist',
  'Specialist',
  'Analyst',
  'Senior Analyst',
  'Coordinator',
  'Administrator',
  'Receptionist',
  'Sales Executive',
  'Sales Manager',
  'Marketing Executive',
  'HR Executive',
  'HR Manager',
  'Finance Executive',
  'Finance Manager',
  'Operations Executive',
  'Operations Manager',
  'IT Support',
  'IT Manager',
  'Developer',
  'Senior Developer',
  'Project Manager',
  'Director',
  'Senior Director',
  'General Manager',
  'Senior Partner',
  'Other'
];

const EditEmployeeForm: React.FC<EditEmployeeFormProps> = ({ employee, onSave, onCancel }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: employee.name,
    nric: employee.nric,
    dateOfBirth: employee.dateOfBirth,
    residencyStatus: employee.residencyStatus,
    type: employee.type,
    baseSalary: employee.baseSalary || '',
    hourlyRate: employee.hourlyRate || '',
    dailyWeekdayRate: employee.dailyWeekdayRate || '',
    dailyWeekendRate: employee.dailyWeekendRate || '',
    paymentType: employee.paymentType || 'Monthly',
    bankName: employee.bankName,
    bankAccount: employee.bankAccount,
    branch: employee.branch || '',
    position: employee.position || '',
    phone: employee.phone || '',
    address: employee.address || '',
    email: employee.email || '',
    joinDate: employee.joinDate || ''
  });

  // Convert EmployeeAllowance[] to AllowanceDeduction[]
  const [allowances, setAllowances] = useState<AllowanceDeduction[]>(
    employee.allowances.map(a => ({ ...a, id: a.id }))
  );
  
  // Convert EmployeeDeduction[] to AllowanceDeduction[]
  const [deductions, setDeductions] = useState<AllowanceDeduction[]>(
    employee.deductions.map(d => ({ ...d, id: d.id }))
  );
  
  const [isSaving, setIsSaving] = useState(false);
  const [showAddAllowance, setShowAddAllowance] = useState(false);
  const [showAddDeduction, setShowAddDeduction] = useState(false);

  const branches = getBranches();

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddAllowance = (newAllowance: AllowanceDeduction) => {
    console.log('Adding new allowance:', newAllowance);
    setAllowances(prev => [...prev, newAllowance]);
    toast("New allowance added successfully");
  };

  const handleAddDeduction = (newDeduction: AllowanceDeduction) => {
    console.log('Adding new deduction:', newDeduction);
    setDeductions(prev => [...prev, newDeduction]);
    toast("New deduction added successfully");
  };

  const handleRemoveAllowance = (id: string) => {
    setAllowances(prev => prev.filter(item => item.id !== id));
    toast("Allowance removed");
  };

  const handleRemoveDeduction = (id: string) => {
    setDeductions(prev => prev.filter(item => item.id !== id));
    toast("Deduction removed");
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      console.log('Saving employee with allowances:', allowances, 'and deductions:', deductions);
      
      const updateData = {
        ...formData,
        baseSalary: formData.baseSalary ? Number(formData.baseSalary) : null,
        hourlyRate: formData.hourlyRate ? Number(formData.hourlyRate) : null,
        dailyWeekdayRate: formData.dailyWeekdayRate ? Number(formData.dailyWeekdayRate) : null,
        dailyWeekendRate: formData.dailyWeekendRate ? Number(formData.dailyWeekendRate) : null,
      };

      await updateEmployee(employee.id, updateData);
      
      const updatedEmployee: EmployeeProfile = {
        ...employee,
        ...updateData,
        baseSalary: updateData.baseSalary || undefined,
        hourlyRate: updateData.hourlyRate || undefined,
        dailyWeekdayRate: updateData.dailyWeekdayRate || undefined,
        dailyWeekendRate: updateData.dailyWeekendRate || undefined,
        // Convert back to EmployeeAllowance[] and EmployeeDeduction[]
        allowances: allowances.map(a => ({ ...a, id: a.id })),
        deductions: deductions.map(d => ({ ...d, id: d.id })),
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
              <Select value={formData.branch} onValueChange={(value) => handleInputChange('branch', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.name}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="position">Position</Label>
              <Select value={formData.position} onValueChange={(value) => handleInputChange('position', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a position" />
                </SelectTrigger>
                <SelectContent>
                  {POSITION_OPTIONS.map((position) => (
                    <SelectItem key={position} value={position}>
                      {position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            {/* Superadmin can edit join date */}
            {user?.role === 'superadmin' && (
              <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                <Label htmlFor="joinDate" className="text-blue-800 font-medium">Join Date</Label>
                <Input
                  id="joinDate"
                  type="date"
                  value={formData.joinDate}
                  onChange={(e) => handleInputChange('joinDate', e.target.value)}
                  className="mt-1 border-blue-300 focus:border-blue-500"
                />
                <p className="text-xs text-blue-600 mt-2 font-medium">
                  ⚠️ Join date affects leave entitlement calculations and pro-rating
                </p>
              </div>
            )}

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

            {/* Conditional Rate Fields */}
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
                  step="0.01"
                  value={formData.hourlyRate}
                  onChange={(e) => handleInputChange('hourlyRate', e.target.value)}
                />
              </div>
            )}

            {formData.paymentType === 'Daily' && (
              <>
                <div>
                  <Label htmlFor="dailyWeekdayRate">Daily Weekday Rate (S$)</Label>
                  <Input
                    id="dailyWeekdayRate"
                    type="number"
                    step="0.01"
                    value={formData.dailyWeekdayRate}
                    onChange={(e) => handleInputChange('dailyWeekdayRate', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="dailyWeekendRate">Daily Weekend Rate (S$)</Label>
                  <Input
                    id="dailyWeekendRate"
                    type="number"
                    step="0.01"
                    value={formData.dailyWeekendRate}
                    onChange={(e) => handleInputChange('dailyWeekendRate', e.target.value)}
                  />
                </div>
              </>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Allowances</h3>
              <Button size="sm" onClick={() => setShowAddAllowance(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {allowances.map((allowance) => (
                <div key={allowance.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{allowance.name}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemoveAllowance(allowance.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              {allowances.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  No allowances configured
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Deductions</h3>
              <Button size="sm" onClick={() => setShowAddDeduction(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {deductions.map((deduction) => (
                <div key={deduction.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{deduction.name}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemoveDeduction(deduction.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              {deductions.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  No deductions configured
                </div>
              )}
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

      <AddAllowanceDialog
        open={showAddAllowance}
        onOpenChange={setShowAddAllowance}
        onAdd={handleAddAllowance}
      />

      <AddDeductionDialog
        open={showAddDeduction}
        onOpenChange={setShowAddDeduction}
        onAdd={handleAddDeduction}
      />
    </div>
  );
};

export default EditEmployeeForm;
