import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, User, Mail, Phone, MapPin, Calendar, DollarSign, FileText, CreditCard, Upload, Edit, Key, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const EmployeeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [allowances, setAllowances] = useState([
    { id: 1, name: 'Transport Allowance', amount: 200 },
    { id: 2, name: 'Meal Allowance', amount: 150 }
  ]);
  const [deductions, setDeductions] = useState([
    { id: 1, name: 'Insurance', amount: 100 }
  ]);
  const [employeeModules, setEmployeeModules] = useState({
    payroll: true,
    leaveManagement: true,
    claims: true,
    attendance: true,
    slotBooking: false
  });

  const employee = {
    id: id,
    name: 'John Tan',
    email: 'john.tan@company.sg',
    phone: '+65 9123 4567',
    address: '123 Orchard Road, #12-34, Singapore 238874',
    nric: 'S1234567A',
    dateOfBirth: '1990-05-15',
    photo: '/placeholder.svg',
    department: 'Headquarters',
    role: 'Senior Instructor',
    joinDate: '2022-03-15',
    employmentType: 'Full-Time',
    paymentType: 'Per Month',
    salary: 'S$8,500',
    lastAdjustment: '2024-01-01',
    nextIncrement: 'S$9,000',
    incrementDate: '2025-01-01',
    bankAccount: '1234-567890',
    bankName: 'DBS Bank',
    paynow: '+65 9123 4567',
    annualLeave: 21,
    medicalLeave: 14,
    status: 'Active',
    resignationDate: ''
  };

  const branches = ['Headquarters', 'Balmoral', 'Jurong West', 'Kembangan', 'Yishun', 'Bukit Merah'];
  const roles = ['Senior Instructor', 'Instructor', 'Junior Instructor', 'Casual Instructor', 'Administrative Manager', 'Administrative Assistant'];

  const handleEdit = () => {
    setIsEditing(!isEditing);
    if (isEditing) {
      toast("Employee details updated successfully");
    }
  };

  const handleResetPassword = () => {
    toast("Password reset to default 'password'");
  };

  const addAllowance = () => {
    const newAllowance = {
      id: Date.now(),
      name: 'New Allowance',
      amount: 0
    };
    setAllowances([...allowances, newAllowance]);
  };

  const removeAllowance = (id: number) => {
    setAllowances(allowances.filter(a => a.id !== id));
    toast("Allowance removed");
  };

  const addDeduction = () => {
    const newDeduction = {
      id: Date.now(),
      name: 'New Deduction',
      amount: 0
    };
    setDeductions([...deductions, newDeduction]);
  };

  const removeDeduction = (id: number) => {
    setDeductions(deductions.filter(d => d.id !== id));
    toast("Deduction removed");
  };

  const handleModuleChange = (module, enabled) => {
    setEmployeeModules(prev => ({
      ...prev,
      [module]: enabled
    }));
    toast(`${module} access ${enabled ? 'enabled' : 'disabled'} for employee`);
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
                      src={employee.photo} 
                      alt={employee.name}
                      className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Full Name</label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        defaultValue={employee.name}
                        className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                      />
                    ) : (
                      <p className="text-lg text-gray-900">{employee.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Employee ID</label>
                    <p className="text-lg text-gray-900">{employee.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">NRIC/FIN</label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        defaultValue={employee.nric}
                        className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                      />
                    ) : (
                      <p className="text-lg text-gray-900">{employee.nric}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Date of Birth</label>
                    {isEditing ? (
                      <input 
                        type="date" 
                        defaultValue={employee.dateOfBirth}
                        className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                      />
                    ) : (
                      <p className="text-lg text-gray-900">{employee.dateOfBirth}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    {isEditing ? (
                      <input 
                        type="email" 
                        defaultValue={employee.email}
                        className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                      />
                    ) : (
                      <p className="text-lg text-gray-900">{employee.email}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Phone</label>
                    {isEditing ? (
                      <input 
                        type="tel" 
                        defaultValue={employee.phone}
                        className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                      />
                    ) : (
                      <p className="text-lg text-gray-900">{employee.phone}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Address</label>
                    {isEditing ? (
                      <textarea 
                        defaultValue={employee.address}
                        className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                        rows={3}
                      />
                    ) : (
                      <p className="text-lg text-gray-900">{employee.address}</p>
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
                    {isEditing ? (
                      <select 
                        defaultValue={employee.department}
                        className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                      >
                        {branches.map(branch => (
                          <option key={branch} value={branch}>{branch}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-lg text-gray-900">{employee.department}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Role</label>
                    {isEditing ? (
                      <select 
                        defaultValue={employee.role}
                        className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                      >
                        {roles.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-lg text-gray-900">{employee.role}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Join Date</label>
                    {isEditing ? (
                      <input 
                        type="date" 
                        defaultValue={employee.joinDate}
                        className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                      />
                    ) : (
                      <p className="text-lg text-gray-900">{employee.joinDate}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Resignation Date</label>
                    {isEditing ? (
                      <input 
                        type="date" 
                        defaultValue={employee.resignationDate}
                        className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                      />
                    ) : (
                      <p className="text-lg text-gray-900">{employee.resignationDate || 'N/A'}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Employment Type</label>
                    <Badge variant="secondary">{employee.employmentType}</Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Payment Type</label>
                    <p className="text-lg text-gray-900">{employee.paymentType}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Leave Allowances</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Annual Leave</label>
                    <p className="text-lg text-gray-900">{employee.annualLeave} days</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Medical Leave</label>
                    <p className="text-lg text-gray-900">{employee.medicalLeave} days</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Fixed Allowances</span>
                    <Button size="sm" onClick={addAllowance}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {allowances.map((allowance) => (
                    <div key={allowance.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <input 
                          type="text" 
                          defaultValue={allowance.name}
                          className="font-medium text-sm bg-transparent border-none p-0"
                        />
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
                    <Button size="sm" onClick={addDeduction}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {deductions.map((deduction) => (
                    <div key={deduction.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <input 
                          type="text" 
                          defaultValue={deduction.name}
                          className="font-medium text-sm bg-transparent border-none p-0"
                        />
                        <p className="text-sm text-gray-600">S${deduction.amount}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => removeDeduction(deduction.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <DollarSign className="w-5 h-5" />
                    <span>Salary Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Current Salary</label>
                    <p className="text-lg text-gray-900">{employee.salary}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Last Adjustment</label>
                    <p className="text-lg text-gray-900">{employee.lastAdjustment}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Next Increment</label>
                    <p className="text-lg text-gray-900">{employee.nextIncrement}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Increment Date</label>
                    <p className="text-lg text-gray-900">{employee.incrementDate}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="w-5 h-5" />
                  <span>Payment Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Bank Name</label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        defaultValue={employee.bankName}
                        className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                      />
                    ) : (
                      <p className="text-lg text-gray-900">{employee.bankName}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Bank Account</label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        defaultValue={employee.bankAccount}
                        className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                      />
                    ) : (
                      <p className="text-lg text-gray-900">{employee.bankAccount}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">PayNow</label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        defaultValue={employee.paynow}
                        className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                      />
                    ) : (
                      <p className="text-lg text-gray-900">{employee.paynow}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Documents & Certificates</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">Upload documents and certificates</p>
                  <Button variant="outline" className="mt-2">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Files
                  </Button>
                </div>
              </CardContent>
            </Card>

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
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default EmployeeDetails;
