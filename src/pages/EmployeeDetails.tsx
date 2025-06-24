
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, User, Mail, Phone, MapPin, Calendar, DollarSign, FileText, CreditCard, Upload, Edit, Key, Plus, Trash2, Download } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { calculateCPF, calculateAge } from '@/utils/cpfCalculations';
import { getEmployeeById } from '@/data/employeeData';
import { EmployeeProfile } from '@/types/employee';

const EmployeeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [employeeData, setEmployeeData] = useState<EmployeeProfile | null>(null);
  const [employeeModules, setEmployeeModules] = useState({
    payroll: true,
    leaveManagement: true,
    claims: true,
    attendance: true,
    slotBooking: false,
    adminAccess: false
  });

  useEffect(() => {
    console.log('Loading employee with ID:', id);
    
    if (id) {
      const employee = getEmployeeById(id);
      if (employee) {
        console.log('Found employee data:', employee);
        setEmployeeData(employee);
      } else {
        console.log('Employee not found, redirecting...');
        toast("Employee not found");
        navigate('/employees');
      }
    }
  }, [id, navigate]);

  // System allowances and deductions from settings
  const systemAllowances = [
    { id: 1, name: 'Transport Allowance', type: 'Monthly', amount: '200' },
    { id: 2, name: 'Meal Allowance', type: 'Monthly', amount: '150' },
    { id: 3, name: 'Performance Bonus', type: 'One-time', amount: '500' }
  ];

  const systemDeductions = [
    { id: 1, name: 'Insurance Premium', type: 'Monthly', amount: '100' },
    { id: 2, name: 'Union Fees', type: 'Monthly', amount: '25' }
  ];

  // Mock payslips data
  const payslips = [
    { month: 'December 2024', netPay: 7100, status: 'Paid', date: '2024-12-01' },
    { month: 'November 2024', netPay: 7100, status: 'Paid', date: '2024-11-01' },
    { month: 'October 2024', netPay: 7100, status: 'Paid', date: '2024-10-01' }
  ];

  // Mock leave data
  const leaveRecords = [
    { type: 'Annual Leave', startDate: '2024-12-20', endDate: '2024-12-22', days: 3, status: 'Approved' },
    { type: 'Medical Leave', startDate: '2024-11-15', endDate: '2024-11-16', days: 2, status: 'Approved' },
    { type: 'Annual Leave', startDate: '2024-10-10', endDate: '2024-10-12', days: 3, status: 'Pending' }
  ];

  const branches = ['Headquarters', 'Balmoral', 'Jurong West', 'Kembangan', 'Yishun', 'Bukit Merah', 'Engineering', 'Marketing', 'HR', 'Operations', 'Teaching'];
  const roles = ['Senior Instructor', 'Instructor', 'Junior Instructor', 'Casual Instructor', 'Administrative Manager', 'Administrative Assistant', 'General Manager', 'Partner', 'Senior Partner', 'Senior Developer', 'Marketing Manager', 'HR Executive', 'Operations Assistant', 'Casual Teacher'];
  const employmentTypes = ['Full-Time', 'Part-Time', 'Casual', 'Contract'];
  const residencyStatuses = [
    'Singapore Citizen',
    'Permanent Resident Year 1',
    'Permanent Resident Year 2',
    'Work Permit',
    'S Pass',
    'Employment Pass'
  ];

  // Return loading if employee data is not loaded
  if (!employeeData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="text-center">
              <p>Loading employee details...</p>
              <p className="text-sm text-gray-500 mt-2">Employee ID: {id}</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Calculate salary for CPF (use baseSalary for full-time, hourlyRate for casual)
  const salaryForCPF = employeeData.type === 'Full-Time' ? 
    (employeeData.baseSalary || 0) : 
    ((employeeData.hourlyRate || 0) * 120); // Assume 120 hours for casual employees

  const age = calculateAge(employeeData.dateOfBirth);
  const cpfCalculation = calculateCPF(salaryForCPF, employeeData.residencyStatus, age);

  const handleInputChange = (field: keyof EmployeeProfile, value: any) => {
    setEmployeeData(prev => prev ? ({
      ...prev,
      [field]: value
    }) : null);
  };

  const handleEdit = () => {
    if (isEditing) {
      console.log('Saving employee data:', employeeData);
      toast("Employee details updated successfully");
    }
    setIsEditing(!isEditing);
  };

  const handleResetPassword = () => {
    toast("Password reset to default 'password'");
  };

  const addAllowanceFromSystem = (systemAllowance: any) => {
    if (!employeeData) return;
    
    const newAllowance = {
      id: Date.now(),
      name: systemAllowance.name,
      amount: parseInt(systemAllowance.amount),
      type: 'Fixed' as const
    };
    
    const updatedAllowances = [...employeeData.allowances, newAllowance];
    setEmployeeData({
      ...employeeData,
      allowances: updatedAllowances
    });
    toast(`Added ${systemAllowance.name}`);
  };

  const addDeductionFromSystem = (systemDeduction: any) => {
    if (!employeeData) return;
    
    const newDeduction = {
      id: Date.now(),
      name: systemDeduction.name,
      amount: parseInt(systemDeduction.amount),
      type: 'Fixed' as const
    };
    
    const updatedDeductions = [...employeeData.deductions, newDeduction];
    setEmployeeData({
      ...employeeData,
      deductions: updatedDeductions
    });
    toast(`Added ${systemDeduction.name}`);
  };

  const removeAllowance = (id: number) => {
    if (!employeeData) return;
    
    const updatedAllowances = employeeData.allowances.filter(a => a.id !== id);
    setEmployeeData({
      ...employeeData,
      allowances: updatedAllowances
    });
    toast("Allowance removed");
  };

  const removeDeduction = (id: number) => {
    if (!employeeData) return;
    
    const updatedDeductions = employeeData.deductions.filter(d => d.id !== id);
    setEmployeeData({
      ...employeeData,
      deductions: updatedDeductions
    });
    toast("Deduction removed");
  };

  const handleModuleChange = (module: string, enabled: boolean) => {
    setEmployeeModules(prev => ({
      ...prev,
      [module]: enabled
    }));
    toast(`${module} access ${enabled ? 'enabled' : 'disabled'} for employee`);
  };

  const downloadPayslip = (month: string) => {
    toast(`Downloaded payslip for ${month}`);
  };

  // Generate mock email from name
  const generateEmail = (name: string) => {
    return name.toLowerCase().replace(' ', '.') + '@company.sg';
  };

  // Generate mock phone from ID
  const generatePhone = (id: string) => {
    const numPart = id.replace(/[A-Z]/g, '');
    return `+65 9${numPart.padStart(3, '0')} ${Math.floor(Math.random() * 9000 + 1000)}`;
  };

  // Generate mock address
  const generateAddress = () => {
    const streets = ['Orchard Road', 'Marina Bay', 'Jurong East', 'Tampines', 'Woodlands'];
    const street = streets[Math.floor(Math.random() * streets.length)];
    const unit = `#${Math.floor(Math.random() * 20 + 1).toString().padStart(2, '0')}-${Math.floor(Math.random() * 50 + 1).toString().padStart(2, '0')}`;
    const postal = Math.floor(Math.random() * 900000 + 100000);
    return `${Math.floor(Math.random() * 999 + 1)} ${street}, ${unit}, Singapore ${postal}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button variant="outline" onClick={() => navigate('/employees')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Employees
                </Button>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Employee Details</h2>
                  <p className="text-gray-600">View and manage employee information</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={handleResetPassword}>
                  <Key className="w-4 h-4 mr-2" />
                  Reset Password
                </Button>
                <Button onClick={handleEdit} className="flex items-center space-x-2">
                  <Edit className="w-4 h-4" />
                  <span>{isEditing ? 'Save Changes' : 'Edit Details'}</span>
                </Button>
              </div>
            </div>

            <Tabs defaultValue="personal" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="personal">Personal & Work Info</TabsTrigger>
                <TabsTrigger value="payroll">Payroll History</TabsTrigger>
                <TabsTrigger value="leave">Leave Records</TabsTrigger>
                <TabsTrigger value="modules">Access Modules</TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-6">
                {/* Personal Information Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                          alt={employeeData.name}
                          className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Full Name</label>
                        {isEditing ? (
                          <input 
                            type="text" 
                            value={employeeData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                          />
                        ) : (
                          <p className="text-lg text-gray-900">{employeeData.name}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Employee ID</label>
                        <p className="text-lg text-gray-900">{employeeData.id}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">NRIC/FIN</label>
                        {isEditing ? (
                          <input 
                            type="text" 
                            value={employeeData.nric}
                            onChange={(e) => handleInputChange('nric', e.target.value)}
                            className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                          />
                        ) : (
                          <p className="text-lg text-gray-900">{employeeData.nric}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Date of Birth</label>
                        {isEditing ? (
                          <input 
                            type="date" 
                            value={employeeData.dateOfBirth}
                            onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                            className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                          />
                        ) : (
                          <p className="text-lg text-gray-900">{employeeData.dateOfBirth}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Residency Status</label>
                        {isEditing ? (
                          <select 
                            value={employeeData.residencyStatus}
                            onChange={(e) => handleInputChange('residencyStatus', e.target.value)}
                            className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                          >
                            {residencyStatuses.map(status => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-lg text-gray-900">{employeeData.residencyStatus}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Email (Login Email)</label>
                        <p className="text-lg text-gray-900">{generateEmail(employeeData.name)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Phone</label>
                        <p className="text-lg text-gray-900">{generatePhone(employeeData.id)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Address</label>
                        <p className="text-lg text-gray-900">{generateAddress()}</p>
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
                        {isEditing ? (
                          <select 
                            value={employeeData.department || ''}
                            onChange={(e) => handleInputChange('department', e.target.value)}
                            className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                          >
                            {branches.map(branch => (
                              <option key={branch} value={branch}>{branch}</option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-lg text-gray-900">{employeeData.department || 'Not specified'}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Position</label>
                        {isEditing ? (
                          <Select value={employeeData.position || ''} onValueChange={(value) => handleInputChange('position', value)}>
                            <SelectTrigger className="w-full mt-1">
                              <SelectValue placeholder="Select position" />
                            </SelectTrigger>
                            <SelectContent>
                              {roles.map(role => (
                                <SelectItem key={role} value={role}>{role}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-lg text-gray-900">{employeeData.position || 'Not specified'}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Employment Type</label>
                        {isEditing ? (
                          <select 
                            value={employeeData.type}
                            onChange={(e) => handleInputChange('type', e.target.value)}
                            className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                          >
                            {employmentTypes.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        ) : (
                          <Badge variant="secondary">{employeeData.type}</Badge>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Payment Type</label>
                        <p className="text-lg text-gray-900">
                          {employeeData.type === 'Full-Time' ? 'Per Month' : 'Per Hour'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>CPF Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Base Salary/Rate</label>
                        <p className="text-lg text-gray-900">
                          S${employeeData.type === 'Full-Time' ? 
                            (employeeData.baseSalary || 0).toLocaleString() : 
                            `${employeeData.hourlyRate || 0}/hour`}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Employee CPF ({(cpfCalculation.employeeCPF / salaryForCPF * 100).toFixed(1)}%)</label>
                        <p className="text-lg text-gray-900">S${cpfCalculation.employeeCPF.toLocaleString()}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Employer CPF ({(cpfCalculation.employerCPF / salaryForCPF * 100).toFixed(1)}%)</label>
                        <p className="text-lg text-gray-900">S${cpfCalculation.employerCPF.toLocaleString()}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Total CPF</label>
                        <p className="text-lg font-bold text-gray-900">S${cpfCalculation.totalCPF.toLocaleString()}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Allowances and Deductions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Fixed Allowances</span>
                        <div className="relative group">
                          <Button size="sm">
                            <Plus className="w-4 h-4" />
                          </Button>
                          <div className="absolute right-0 top-8 hidden group-hover:block bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10 w-48">
                            {systemAllowances.map((allowance) => (
                              <button
                                key={allowance.id}
                                onClick={() => addAllowanceFromSystem(allowance)}
                                className="block w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm"
                              >
                                {allowance.name} (S${allowance.amount})
                              </button>
                            ))}
                          </div>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {employeeData.allowances.map((allowance) => (
                        <div key={allowance.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium text-sm">{allowance.name}</p>
                            <p className="text-sm text-gray-600">S${allowance.amount}</p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => removeAllowance(allowance.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Fixed Deductions</span>
                        <div className="relative group">
                          <Button size="sm">
                            <Plus className="w-4 h-4" />
                          </Button>
                          <div className="absolute right-0 top-8 hidden group-hover:block bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10 w-48">
                            {systemDeductions.map((deduction) => (
                              <button
                                key={deduction.id}
                                onClick={() => addDeductionFromSystem(deduction)}
                                className="block w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm"
                              >
                                {deduction.name} (S${deduction.amount})
                              </button>
                            ))}
                          </div>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {employeeData.deductions.map((deduction) => (
                        <div key={deduction.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium text-sm">{deduction.name}</p>
                            <p className="text-sm text-gray-600">S${deduction.amount}</p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => removeDeduction(deduction.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                {/* Payment Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <CreditCard className="w-5 h-5" />
                      <span>Payment Details</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Bank Name</label>
                        <p className="text-lg text-gray-900">{employeeData.bankName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Bank Account</label>
                        <p className="text-lg text-gray-900">{employeeData.bankAccount}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payroll">
                <Card>
                  <CardHeader>
                    <CardTitle>Payroll History</CardTitle>
                    <CardDescription>All payslips for this employee</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {payslips.map((payslip, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{payslip.month}</p>
                            <p className="text-sm text-gray-600">Net Pay: S${payslip.netPay.toLocaleString()} • {payslip.status}</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => downloadPayslip(payslip.month)}>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="leave">
                <Card>
                  <CardHeader>
                    <CardTitle>Leave Records</CardTitle>
                    <CardDescription>All leave applications and their status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {leaveRecords.map((leave, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{leave.type}</p>
                            <p className="text-sm text-gray-600">
                              {leave.startDate} to {leave.endDate} • {leave.days} days
                            </p>
                          </div>
                          <Badge variant={leave.status === 'Approved' ? 'default' : 'secondary'}>
                            {leave.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="modules">
                <Card>
                  <CardHeader>
                    <CardTitle>Access Modules</CardTitle>
                    <CardDescription>Control which modules this employee can access</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-600">Payroll</label>
                      <input 
                        type="checkbox" 
                        checked={employeeModules.payroll}
                        onChange={(e) => handleModuleChange('payroll', e.target.checked)}
                        className="rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-600">Leave Management</label>
                      <input 
                        type="checkbox" 
                        checked={employeeModules.leaveManagement}
                        onChange={(e) => handleModuleChange('leaveManagement', e.target.checked)}
                        className="rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-600">Claims</label>
                      <input 
                        type="checkbox" 
                        checked={employeeModules.claims}
                        onChange={(e) => handleModuleChange('claims', e.target.checked)}
                        className="rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-600">Attendance</label>
                      <input 
                        type="checkbox" 
                        checked={employeeModules.attendance}
                        onChange={(e) => handleModuleChange('attendance', e.target.checked)}
                        className="rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-600">Slot Booking</label>
                      <input 
                        type="checkbox" 
                        checked={employeeModules.slotBooking}
                        onChange={(e) => handleModuleChange('slotBooking', e.target.checked)}
                        className="rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-600">Admin Access</label>
                      <input 
                        type="checkbox" 
                        checked={employeeModules.adminAccess}
                        onChange={(e) => handleModuleChange('adminAccess', e.target.checked)}
                        className="rounded"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
};

export default EmployeeDetails;
