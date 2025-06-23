import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, User, Mail, Phone, Building, BadgeInfo, Wallet, Settings, MapPin } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const EmployeeDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [employee, setEmployee] = useState({
    id: '1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '123-456-7890',
    address: '123 Main St, Singapore',
    position: 'Software Engineer',
    department: 'Technology',
    salary: 8000,
    employmentType: 'Full-Time',
    startDate: '2022-01-01',
    endDate: '',
    bankName: 'DBS',
    bankAccount: '123-456-789',
    cpfNumber: 'S1234567A',
    residencyStatus: 'Citizen',
    age: 30,
    managerAccess: {
      payroll: false,
      leave: false,
      claims: false,
      attendance: false,
      slotBooking: false
    },
    adminAccess: {
      payroll: false,
      leave: false,
      claims: false,
      attendance: false,
      slotBooking: false
    }
  });

  useEffect(() => {
    // Fetch employee data based on ID
    // For now, using mock data
    console.log('Fetching employee data for ID:', id);
  }, [id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEmployee(prev => ({ ...prev, [name]: value }));
  };

  const handleAccessChange = (moduleId, accessType, checked) => {
    setEmployee(prev => ({
      ...prev,
      [`${accessType}Access`]: {
        ...prev[`${accessType}Access`],
        [moduleId]: checked
      }
    }));
  };

  const handleUpdateEmployee = () => {
    // Implement update logic here
    toast("Employee details updated");
  };

  const accessModules = [
    { id: 'payroll', name: 'Payroll Management', managerAccess: employee.managerAccess?.payroll || false, adminAccess: employee.adminAccess?.payroll || false },
    { id: 'leave', name: 'Leave Management', managerAccess: employee.managerAccess?.leave || false, adminAccess: employee.adminAccess?.leave || false },
    { id: 'claims', name: 'Claims Management', managerAccess: employee.managerAccess?.claims || false, adminAccess: employee.adminAccess?.claims || false },
    { id: 'attendance', name: 'Attendance Management', managerAccess: employee.managerAccess?.attendance || false, adminAccess: employee.adminAccess?.attendance || false },
    { id: 'slotBooking', name: 'Slot Booking', managerAccess: employee.managerAccess?.slotBooking || false, adminAccess: employee.adminAccess?.slotBooking || false }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src="https://github.com/shadcn.png" alt="Avatar" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{employee.name}</h2>
                <p className="text-gray-600">{employee.position} - {employee.department}</p>
              </div>
            </div>

            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>Personal Information</span>
                </CardTitle>
                <CardDescription>View and update employee personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</Label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <Input
                        type="email"
                        name="email"
                        id="email"
                        value={employee.email}
                        onChange={handleInputChange}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" aria-hidden="true" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</Label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <Input
                        type="tel"
                        name="phone"
                        id="phone"
                        value={employee.phone}
                        onChange={handleInputChange}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-gray-400" aria-hidden="true" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="address" className="block text-sm font-medium text-gray-700">Address</Label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <Input
                        type="text"
                        name="address"
                        id="address"
                        value={employee.address}
                        onChange={handleInputChange}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <MapPin className="h-5 w-5 text-gray-400" aria-hidden="true" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Employment Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building className="w-5 h-5" />
                  <span>Employment Information</span>
                </CardTitle>
                <CardDescription>View and update employment details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="position" className="block text-sm font-medium text-gray-700">Position</Label>
                    <Input
                      type="text"
                      name="position"
                      id="position"
                      value={employee.position}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <Label htmlFor="department" className="block text-sm font-medium text-gray-700">Department</Label>
                    <Input
                      type="text"
                      name="department"
                      id="department"
                      value={employee.department}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <Label htmlFor="salary" className="block text-sm font-medium text-gray-700">Salary (S$)</Label>
                    <Input
                      type="number"
                      name="salary"
                      id="salary"
                      value={employee.salary}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <Label htmlFor="employmentType" className="block text-sm font-medium text-gray-700">Employment Type</Label>
                    <Select
                      name="employmentType"
                      onValueChange={(value) => handleInputChange({ target: { name: 'employmentType', value } })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select employment type" defaultValue={employee.employmentType} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Full-Time">Full-Time</SelectItem>
                        <SelectItem value="Part-Time">Part-Time</SelectItem>
                        <SelectItem value="Contract">Contract</SelectItem>
                        <SelectItem value="Casual">Casual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Start Date</Label>
                    <Input
                      type="date"
                      name="startDate"
                      id="startDate"
                      value={employee.startDate}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate" className="block text-sm font-medium text-gray-700">End Date (if applicable)</Label>
                    <Input
                      type="date"
                      name="endDate"
                      id="endDate"
                      value={employee.endDate}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payroll Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Wallet className="w-5 h-5" />
                  <span>Payroll Information</span>
                </CardTitle>
                <CardDescription>View and update payroll details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bankName" className="block text-sm font-medium text-gray-700">Bank Name</Label>
                    <Input
                      type="text"
                      name="bankName"
                      id="bankName"
                      value={employee.bankName}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bankAccount" className="block text-sm font-medium text-gray-700">Bank Account</Label>
                    <Input
                      type="text"
                      name="bankAccount"
                      id="bankAccount"
                      value={employee.bankAccount}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cpfNumber" className="block text-sm font-medium text-gray-700">CPF Number</Label>
                    <Input
                      type="text"
                      name="cpfNumber"
                      id="cpfNumber"
                      value={employee.cpfNumber}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <Label htmlFor="residencyStatus" className="block text-sm font-medium text-gray-700">Residency Status</Label>
                    <Select
                      name="residencyStatus"
                      onValueChange={(value) => handleInputChange({ target: { name: 'residencyStatus', value } })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select residency status" defaultValue={employee.residencyStatus} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Citizen">Citizen</SelectItem>
                        <SelectItem value="Permanent Resident">Permanent Resident</SelectItem>
                        <SelectItem value="Foreigner">Foreigner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="age" className="block text-sm font-medium text-gray-700">Age</Label>
                    <Input
                      type="number"
                      name="age"
                      id="age"
                      value={employee.age}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Access Modules */}
            <Card>
              <CardHeader>
                <CardTitle>Access Modules</CardTitle>
                <CardDescription>Configure system access permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="font-medium">Module</div>
                    <div className="font-medium text-center">Manager Access</div>
                    <div className="font-medium text-center">Admin Access</div>
                  </div>
                  {accessModules.map((module) => (
                    <div key={module.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      <div>{module.name}</div>
                      <div className="flex justify-center">
                        <input
                          type="checkbox"
                          checked={module.managerAccess}
                          onChange={(e) => handleAccessChange(module.id, 'manager', e.target.checked)}
                          className="w-4 h-4"
                        />
                      </div>
                      <div className="flex justify-center">
                        <input
                          type="checkbox"
                          checked={module.adminAccess}
                          onChange={(e) => handleAccessChange(module.id, 'admin', e.target.checked)}
                          className="w-4 h-4"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateEmployee}>
                Update Employee
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default EmployeeDetails;
