import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { User, Edit, ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { getEmployeeById, updateEmployee } from '@/services/employeeService';
import { getBranches } from '@/services/settingsService';
import { EmployeeProfile, EmployeeAllowance, EmployeeDeduction } from '@/types/employee';
import { useIsMobile } from '@/hooks/use-mobile';
import EditEmployeeForm from '@/components/employee/EditEmployeeForm';

const EmployeeDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUsingAdvancedForm, setIsUsingAdvancedForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    nric: '',
    dateOfBirth: '',
    residencyStatus: '',
    type: '',
    baseSalary: '',
    hourlyRate: '',
    dailyWeekdayRate: '',
    dailyWeekendRate: '',
    paymentType: '',
    bankName: '',
    bankAccount: '',
    branch: '',
    position: '',
    phone: '',
    address: '',
    email: ''
  });

  const branches = getBranches();

  useEffect(() => {
    const loadEmployee = async () => {
      if (!id) {
        toast.error("Employee ID is missing");
        return;
      }

      try {
        setIsLoading(true);
        const employeeData = await getEmployeeById(id);
        if (employeeData) {
          setEmployee(employeeData);
          setFormData({
            name: employeeData.name,
            nric: employeeData.nric,
            dateOfBirth: employeeData.dateOfBirth,
            residencyStatus: employeeData.residencyStatus,
            type: employeeData.type,
            baseSalary: employeeData.baseSalary ? employeeData.baseSalary.toString() : '',
            hourlyRate: employeeData.hourlyRate ? employeeData.hourlyRate.toString() : '',
            dailyWeekdayRate: employeeData.dailyWeekdayRate ? employeeData.dailyWeekdayRate.toString() : '',
            dailyWeekendRate: employeeData.dailyWeekendRate ? employeeData.dailyWeekendRate.toString() : '',
            paymentType: employeeData.paymentType || '',
            bankName: employeeData.bankName,
            bankAccount: employeeData.bankAccount,
            branch: employeeData.branch || employeeData.department || '',
            position: employeeData.position || '',
            phone: employeeData.phone || '',
            address: employeeData.address || '',
            email: employeeData.email || ''
          });
        } else {
          toast.error("Employee not found");
        }
      } catch (error) {
        console.error("Error loading employee:", error);
        toast.error("Failed to load employee details");
      } finally {
        setIsLoading(false);
      }
    };

    loadEmployee();
  }, [id]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEdit = () => {
    if (isEditing) {
      handleSave();
    } else {
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!employee) return;

    try {
      setIsSaving(true);
      console.log('Saving employee with form data:', formData);
      
      // Validate required fields
      if (!formData.name.trim()) {
        toast("Please enter employee name");
        return;
      }
      
      if (!formData.position.trim()) {
        toast("Please select a position");
        return;
      }

      if (!formData.branch.trim()) {
        toast("Please select a branch");
        return;
      }
      
      // Validate salary based on payment type
      if (formData.paymentType === 'Monthly' && !formData.baseSalary.trim()) {
        toast("Please enter base salary for monthly payment");
        return;
      }
      
      if (formData.paymentType === 'Hourly' && !formData.hourlyRate.trim()) {
        toast("Please enter hourly rate for hourly payment");
        return;
      }
      
      if (formData.paymentType === 'Daily' && (!formData.dailyWeekdayRate.trim() || !formData.dailyWeekendRate.trim())) {
        toast("Please enter both weekday and weekend rates for daily payment");
        return;
      }
      
      // Convert string values to numbers with proper null handling
      const updateData = {
        ...formData,
        baseSalary: formData.baseSalary && formData.baseSalary.trim() !== '' ? Number(formData.baseSalary) : null,
        hourlyRate: formData.hourlyRate && formData.hourlyRate.trim() !== '' ? Number(formData.hourlyRate) : null,
        dailyWeekdayRate: formData.dailyWeekdayRate && formData.dailyWeekdayRate.trim() !== '' ? Number(formData.dailyWeekdayRate) : null,
        dailyWeekendRate: formData.dailyWeekendRate && formData.dailyWeekendRate.trim() !== '' ? Number(formData.dailyWeekendRate) : null,
      };

      console.log('Processed update data with converted numbers:', updateData);

      await updateEmployee(employee.id, updateData);
      
      const updatedEmployee: EmployeeProfile = {
        ...employee,
        ...updateData,
        type: updateData.type as 'Full-Time' | 'Casual',
        paymentType: updateData.paymentType as 'Monthly' | 'Hourly' | 'Daily',
        baseSalary: updateData.baseSalary || undefined,
        hourlyRate: updateData.hourlyRate || undefined,
        dailyWeekdayRate: updateData.dailyWeekdayRate || undefined,
        dailyWeekendRate: updateData.dailyWeekendRate || undefined,
      };
      
      console.log('Final updated employee object:', updatedEmployee);
      setEmployee(updatedEmployee);
      setIsEditing(false);
      toast("Employee details updated successfully");
    } catch (error) {
      console.error('Error updating employee:', error);
      toast("Error updating employee details");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          {!isMobile && <Sidebar />}
          <main className="flex-1 p-3 md:p-6 overflow-auto">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading employee details...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          {!isMobile && <Sidebar />}
          <main className="flex-1 p-3 md:p-6 overflow-auto">
            <div className="text-center">
              <p className="text-red-600">Employee not found</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (isUsingAdvancedForm) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          {!isMobile && <Sidebar />}
          <main className="flex-1 p-3 md:p-6 overflow-auto">
            <div className="space-y-4 md:space-y-6">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" onClick={() => navigate('/employees')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Employees
                </Button>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">Edit Employee Details</h2>
              </div>
              
              <EditEmployeeForm
                employee={employee}
                onSave={(updatedEmployee) => {
                  setEmployee(updatedEmployee);
                  setIsUsingAdvancedForm(false);
                  toast("Employee updated successfully");
                }}
                onCancel={() => setIsUsingAdvancedForm(false)}
              />
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
        {!isMobile && <Sidebar />}
        <main className="flex-1 p-3 md:p-6 overflow-auto">
          <div className="space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" onClick={() => navigate('/employees')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Employees
                </Button>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900">Employee Details</h2>
                  <p className="text-sm md:text-base text-gray-600">View and manage employee information</p>
                </div>
              </div>
              <div className="flex space-x-2">
                {!isEditing && (
                  <Button onClick={() => setIsUsingAdvancedForm(true)} variant="outline">
                    Advanced Edit
                  </Button>
                )}
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
                  <span>{isEditing ? 'Save Changes' : 'Edit Details'}</span>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center space-x-2 text-lg md:text-xl">
                    <User className="w-5 h-5" />
                    <span>Personal Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Full Name</Label>
                    {isEditing ? (
                      <Input
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-base md:text-lg text-gray-900 mt-1">{employee.name}</p>
                    )}
                  </div>

                  <div>
                    <Label>NRIC/FIN</Label>
                    {isEditing ? (
                      <Input
                        value={formData.nric}
                        onChange={(e) => handleInputChange('nric', e.target.value)}
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-base md:text-lg text-gray-900 mt-1">{employee.nric}</p>
                    )}
                  </div>

                  <div>
                    <Label>Date of Birth</Label>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-base md:text-lg text-gray-900 mt-1">{employee.dateOfBirth}</p>
                    )}
                  </div>

                  <div>
                    <Label>Residency Status</Label>
                    {isEditing ? (
                      <Select 
                        value={formData.residencyStatus} 
                        onValueChange={(value) => handleInputChange('residencyStatus', value)}
                      >
                        <SelectTrigger className="mt-1">
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
                    ) : (
                      <p className="text-base md:text-lg text-gray-900 mt-1">{employee.residencyStatus}</p>
                    )}
                  </div>

                  <div>
                    <Label>Email</Label>
                    {isEditing ? (
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-base md:text-lg text-gray-900 mt-1">{employee.email || 'Not specified'}</p>
                    )}
                  </div>

                  <div>
                    <Label>Phone</Label>
                    {isEditing ? (
                      <Input
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-base md:text-lg text-gray-900 mt-1">{employee.phone || 'Not specified'}</p>
                    )}
                  </div>

                  <div>
                    <Label>Address</Label>
                    {isEditing ? (
                      <Textarea
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        className="mt-1"
                        rows={3}
                      />
                    ) : (
                      <p className="text-base md:text-lg text-gray-900 mt-1">{employee.address || 'Not specified'}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg md:text-xl">Employment Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Employee ID</Label>
                    <p className="text-base md:text-lg text-gray-900 mt-1">{employee?.id}</p>
                  </div>

                  <div>
                    <Label>Branch</Label>
                    {isEditing ? (
                      <Select 
                        value={formData.branch} 
                        onValueChange={(value) => handleInputChange('branch', value)}
                      >
                        <SelectTrigger className="mt-1">
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
                    ) : (
                      <p className="text-base md:text-lg text-gray-900 mt-1">{employee?.branch || employee?.department || 'Not specified'}</p>
                    )}
                  </div>

                  <div>
                    <Label>Position</Label>
                    {isEditing ? (
                      <Select 
                        value={formData.position} 
                        onValueChange={(value) => handleInputChange('position', value)}
                      >
                        <SelectTrigger className="mt-1">
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
                    ) : (
                      <p className="text-base md:text-lg text-gray-900 mt-1">{employee.position || 'Not specified'}</p>
                    )}
                  </div>

                  <div>
                    <Label>Employment Type</Label>
                    {isEditing ? (
                      <Select 
                        value={formData.type} 
                        onValueChange={(value) => handleInputChange('type', value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Full-Time">Full-Time</SelectItem>
                          <SelectItem value="Casual">Casual</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-base md:text-lg text-gray-900 mt-1">{employee.type}</p>
                    )}
                  </div>

                  <div>
                    <Label>Payment Type</Label>
                    {isEditing ? (
                      <Select 
                        value={formData.paymentType} 
                        onValueChange={(value) => handleInputChange('paymentType', value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Monthly">Monthly</SelectItem>
                          <SelectItem value="Hourly">Hourly</SelectItem>
                          <SelectItem value="Daily">Daily</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-base md:text-lg text-gray-900 mt-1">{employee.paymentType || 'Not specified'}</p>
                    )}
                  </div>

                  {/* Show Base Salary for Monthly payment */}
                  {formData.paymentType === 'Monthly' && (
                    <div>
                      <Label>Base Salary (S$)</Label>
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.baseSalary}
                          onChange={(e) => handleInputChange('baseSalary', e.target.value)}
                          className="mt-1"
                          placeholder="Enter base salary"
                        />
                      ) : (
                        <p className="text-base md:text-lg text-gray-900 mt-1">
                          {employee.baseSalary ? `S$${employee.baseSalary.toLocaleString()}` : 'Not specified'}
                        </p>
                      )}
                    </div>
                  )}

                  {formData.paymentType === 'Hourly' && (
                    <div>
                      <Label>Hourly Rate (S$)</Label>
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.hourlyRate}
                          onChange={(e) => handleInputChange('hourlyRate', e.target.value)}
                          className="mt-1"
                          placeholder="Enter hourly rate"
                        />
                      ) : (
                        <p className="text-base md:text-lg text-gray-900 mt-1">
                          {employee.hourlyRate ? `S$${employee.hourlyRate}/hour` : 'Not specified'}
                        </p>
                      )}
                    </div>
                  )}

                  {formData.paymentType === 'Daily' && (
                    <>
                      <div>
                        <Label>Daily Weekday Rate (S$)</Label>
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.dailyWeekdayRate}
                            onChange={(e) => handleInputChange('dailyWeekdayRate', e.target.value)}
                            className="mt-1"
                            placeholder="Enter weekday rate"
                          />
                        ) : (
                          <p className="text-base md:text-lg text-gray-900 mt-1">
                            {employee.dailyWeekdayRate ? `S$${employee.dailyWeekdayRate}/day` : 'Not specified'}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label>Daily Weekend Rate (S$)</Label>
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.dailyWeekendRate}
                            onChange={(e) => handleInputChange('dailyWeekendRate', e.target.value)}
                            className="mt-1"
                            placeholder="Enter weekend rate"
                          />
                        ) : (
                          <p className="text-base md:text-lg text-gray-900 mt-1">
                            {employee.dailyWeekendRate ? `S$${employee.dailyWeekendRate}/day` : 'Not specified'}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg md:text-xl">Bank Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Bank Name</Label>
                  {isEditing ? (
                    <Input
                      value={formData.bankName}
                      onChange={(e) => handleInputChange('bankName', e.target.value)}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-base md:text-lg text-gray-900 mt-1">{employee.bankName}</p>
                  )}
                </div>

                <div>
                  <Label>Bank Account</Label>
                  {isEditing ? (
                    <Input
                      value={formData.bankAccount}
                      onChange={(e) => handleInputChange('bankAccount', e.target.value)}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-base md:text-lg text-gray-900 mt-1">{employee.bankAccount}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg md:text-xl">Allowances</CardTitle>
              </CardHeader>
              <CardContent>
                {employee.allowances && employee.allowances.length > 0 ? (
                  <div className="grid gap-4">
                    {employee.allowances.map((allowance: EmployeeAllowance) => (
                      <div key={allowance.id} className="border rounded-md p-4">
                        <p className="font-semibold">{allowance.name}</p>
                        <p>Amount: S${allowance.amount}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No allowances added.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg md:text-xl">Deductions</CardTitle>
              </CardHeader>
              <CardContent>
                {employee.deductions && employee.deductions.length > 0 ? (
                  <div className="grid gap-4">
                    {employee.deductions.map((deduction: EmployeeDeduction) => (
                      <div key={deduction.id} className="border rounded-md p-4">
                        <p className="font-semibold">{deduction.name}</p>
                        <p>Amount: S${deduction.amount}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No deductions added.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

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
  'Instructor',
  'Casual Instructor',
  'Training Assistant',
  'Part-time Staff',
  'Freelancer',
  'Consultant',
  'Other'
];

export default EmployeeDetails;
