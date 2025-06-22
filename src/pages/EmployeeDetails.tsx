import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, User, Mail, Phone, MapPin, Calendar, DollarSign, FileText, CreditCard, Upload, Edit } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const EmployeeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);

  // Mock employee data - in real app this would come from API
  const employee = {
    id: id,
    name: 'John Tan',
    email: 'john.tan@company.sg',
    phone: '+65 9123 4567',
    address: '123 Orchard Road, #12-34, Singapore 238874',
    nric: 'S1234567A',
    dateOfBirth: '1990-05-15',
    photo: '/placeholder.svg',
    department: 'Engineering',
    role: 'Senior Developer',
    location: 'Singapore Office',
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
    status: 'Active'
  };

  const handleEdit = () => {
    setIsEditing(!isEditing);
    if (isEditing) {
      toast("Employee details updated successfully");
    }
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
              <Button onClick={handleEdit} className="flex items-center space-x-2">
                <Edit className="w-4 h-4" />
                <span>{isEditing ? 'Save Changes' : 'Edit Details'}</span>
              </Button>
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
                    <label className="text-sm font-medium text-gray-600">Department</label>
                    <p className="text-lg text-gray-900">{employee.department}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Role</label>
                    <p className="text-lg text-gray-900">{employee.role}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Work Location</label>
                    <p className="text-lg text-gray-900">{employee.location}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Join Date</label>
                    <p className="text-lg text-gray-900">{employee.joinDate}</p>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CreditCard className="w-5 h-5" />
                    <span>Payment Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                </CardContent>
              </Card>
            </div>

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
          </div>
        </main>
      </div>
    </div>
  );
};

export default EmployeeDetails;
