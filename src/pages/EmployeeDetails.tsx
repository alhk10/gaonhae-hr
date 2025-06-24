import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAllEmployees, employeeDatabase, getEmployeeById } from '@/data/employeeData';
import { EmployeeProfile } from '@/types/employee';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { toast } from 'sonner';
import AdminAccessManager from '@/components/employee/AdminAccessManager';

const EmployeeDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (id) {
      const emp = getEmployeeById(id);
      if (emp) {
        setEmployee(emp);
      } else {
        toast.error('Employee not found');
      }
    }
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEmployee(prev => ({ ...prev, [name]: value }));
  };

  const handleAllowanceChange = (index: number, field: string, value: any) => {
    const updatedAllowances = [...employee.allowances];
    updatedAllowances[index][field] = value;
    setEmployee({ ...employee, allowances: updatedAllowances });
  };

  const handleDeductionChange = (index: number, field: string, value: any) => {
    const updatedDeductions = [...employee.deductions];
    updatedDeductions[index][field] = value;
    setEmployee({ ...employee, deductions: updatedDeductions });
  };

  const handleSave = () => {
    if (employee) {
      // Update the employee in the database
      employeeDatabase[employee.id] = { ...employee };
      setIsEditing(false);
      toast.success('Employee details updated successfully');
    }
  };

  if (!employee) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Employee Details</h1>
                <p className="text-gray-600">Manage employee information and settings</p>
              </div>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave}>
                      Save Changes
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditing(true)}>
                    Edit Employee
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      type="text"
                      id="name"
                      name="name"
                      value={employee.name}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nric">NRIC</Label>
                    <Input
                      type="text"
                      id="nric"
                      name="nric"
                      value={employee.nric}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      type="date"
                      id="dateOfBirth"
                      name="dateOfBirth"
                      value={employee.dateOfBirth}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="residencyStatus">Residency Status</Label>
                    <Input
                      type="text"
                      id="residencyStatus"
                      name="residencyStatus"
                      value={employee.residencyStatus}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Employment Details Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Employment Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select disabled={!isEditing} value={employee.type} onValueChange={(value) => setEmployee({ ...employee, type: value as 'Full-Time' | 'Casual' })}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Full-Time">Full-Time</SelectItem>
                        <SelectItem value="Casual">Casual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      type="text"
                      id="department"
                      name="department"
                      value={employee.department || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position">Position</Label>
                    <Input
                      type="text"
                      id="position"
                      name="position"
                      value={employee.position || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Payment Information Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="baseSalary">Base Salary</Label>
                    <Input
                      type="number"
                      id="baseSalary"
                      name="baseSalary"
                      value={employee.baseSalary || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentType">Payment Type</Label>
                    <Select disabled={!isEditing} value={employee.paymentType} onValueChange={(value) => setEmployee({ ...employee, paymentType: value as 'Monthly' | 'Hourly' | 'Daily' })}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select payment type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="Hourly">Hourly</SelectItem>
                        <SelectItem value="Daily">Daily</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankAccount">Bank Account</Label>
                    <Input
                      type="text"
                      id="bankAccount"
                      name="bankAccount"
                      value={employee.bankAccount}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input
                      type="text"
                      id="bankName"
                      name="bankName"
                      value={employee.bankName}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Contact Information Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      type="text"
                      id="phone"
                      name="phone"
                      value={employee.phone || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      type="text"
                      id="address"
                      name="address"
                      value={employee.address || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      type="email"
                      id="email"
                      name="email"
                      value={employee.email || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Allowances Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Allowances</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {employee.allowances.map((allowance, index) => (
                    <div key={index} className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor={`allowanceName-${index}`}>Name</Label>
                        <Input
                          type="text"
                          id={`allowanceName-${index}`}
                          value={allowance.name}
                          onChange={(e) => handleAllowanceChange(index, 'name', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`allowanceAmount-${index}`}>Amount</Label>
                        <Input
                          type="number"
                          id={`allowanceAmount-${index}`}
                          value={allowance.amount}
                          onChange={(e) => handleAllowanceChange(index, 'amount', parseFloat(e.target.value))}
                          disabled={!isEditing}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`allowanceType-${index}`}>Type</Label>
                        <Input
                          type="text"
                          id={`allowanceType-${index}`}
                          value={allowance.type || ''}
                          onChange={(e) => handleAllowanceChange(index, 'type', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Deductions Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Deductions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {employee.deductions.map((deduction, index) => (
                    <div key={index} className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor={`deductionName-${index}`}>Name</Label>
                        <Input
                          type="text"
                          id={`deductionName-${index}`}
                          value={deduction.name}
                          onChange={(e) => handleDeductionChange(index, 'name', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`deductionAmount-${index}`}>Amount</Label>
                        <Input
                          type="number"
                          id={`deductionAmount-${index}`}
                          value={deduction.amount}
                          onChange={(e) => handleDeductionChange(index, 'amount', parseFloat(e.target.value))}
                          disabled={!isEditing}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`deductionType-${index}`}>Type</Label>
                        <Input
                          type="text"
                          id={`deductionType-${index}`}
                          value={deduction.type || ''}
                          onChange={(e) => handleDeductionChange(index, 'type', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Admin Access Permissions */}
              <AdminAccessManager
                adminAccess={employee.adminAccess}
                onAdminAccessChange={(permissions) => setEmployee({ ...employee, adminAccess: permissions })}
                isEditing={isEditing}
              />

              {/* Certificates Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Certificates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {employee.certificates && employee.certificates.length > 0 ? (
                    employee.certificates.map((certificate, index) => (
                      <div key={index} className="border rounded-md p-4">
                        <p className="font-semibold">{certificate.name}</p>
                        <p>File Name: {certificate.fileName}</p>
                        <p>Upload Date: {certificate.uploadDate}</p>
                        <p>File Size: {certificate.fileSize} KB</p>
                        <p>File Type: {certificate.fileType}</p>
                      </div>
                    ))
                  ) : (
                    <p>No certificates uploaded.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default EmployeeDetails;
