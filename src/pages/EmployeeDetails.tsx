
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Mail, Phone, MapPin } from 'lucide-react';

const EmployeeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Mock employee data - in real app this would come from API
  const employee = {
    id: id,
    name: 'John Tan',
    email: 'john.tan@company.sg',
    phone: '+65 9123 4567',
    department: 'Engineering',
    role: 'Senior Developer',
    location: 'Singapore Office',
    joinDate: '2022-03-15',
    salary: 'S$8,500',
    status: 'Active'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="w-5 h-5" />
                    <span>Personal Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Full Name</label>
                    <p className="text-lg text-gray-900">{employee.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Employee ID</label>
                    <p className="text-lg text-gray-900">{employee.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <p className="text-lg text-gray-900">{employee.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Phone</label>
                    <p className="text-lg text-gray-900">{employee.phone}</p>
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
