
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, Search, X } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { getAllEmployees, getFullTimeEmployees, getCasualEmployees } from '@/data/employeeData';
import { EmployeeProfile } from '@/types/employee';

const Employees = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Get employees from centralized database
  const allEmployees = getAllEmployees();
  const fullTimeEmployees = getFullTimeEmployees();
  const casualEmployees = getCasualEmployees();

  // Form state for new employee
  const [newEmployee, setNewEmployee] = useState({
    fullName: '',
    employeeId: '',
    email: '',
    phone: '',
    department: '',
    role: '',
    employmentType: ''
  });

  const roles = ['Senior Instructor', 'Instructor', 'Junior Instructor', 'Casual Instructor', 'Administrative Manager', 'Administrative Assistant', 'General Manager', 'Partner', 'Senior Partner', 'Senior Developer', 'Marketing Manager', 'HR Executive'];

  const handleViewDetails = (employeeName: string, employeeId: string) => {
    navigate(`/employees/${employeeId}`);
  };

  const handleAddEmployee = () => {
    setShowAddForm(true);
  };

  const handleInputChange = (field: string, value: string) => {
    setNewEmployee(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmitNewEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Adding new employee:', newEmployee);
    
    // Note: In a real application, this would save to a database
    // For now, we'll show a success message but the data won't persist
    toast("Employee added successfully (Note: Data will not persist in this demo)");
    setShowAddForm(false);
    
    // Reset form
    setNewEmployee({
      fullName: '',
      employeeId: '',
      email: '',
      phone: '',
      department: '',
      role: '',
      employmentType: ''
    });
  };

  // Filter employees based on search term
  const filterEmployees = (employees: EmployeeProfile[]) => {
    return employees.filter(employee =>
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (employee.department && employee.department.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const filteredFullTimeEmployees = filterEmployees(fullTimeEmployees);
  const filteredCasualEmployees = filterEmployees(casualEmployees);

  // Helper function to get next increment info (mock data for display)
  const getIncrementInfo = (employee: EmployeeProfile) => {
    if (employee.type === 'Casual') {
      return { nextIncrement: 'N/A', incrementDate: 'N/A' };
    }
    return { 
      nextIncrement: 'TBD', 
      incrementDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] 
    };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Employee Management</h2>
                <p className="text-gray-600">Manage all employees and their information</p>
              </div>
              <Button className="flex items-center space-x-2" onClick={handleAddEmployee}>
                <Plus className="w-4 h-4" />
                <span>Add Employee</span>
              </Button>
            </div>

            {showAddForm && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Add New Employee</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitNewEmployee} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                        <input 
                          type="text" 
                          value={newEmployee.fullName}
                          onChange={(e) => handleInputChange('fullName', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg" 
                          required 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Employee ID</label>
                        <input 
                          type="text" 
                          value={newEmployee.employeeId}
                          onChange={(e) => handleInputChange('employeeId', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg" 
                          required 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <input 
                          type="email" 
                          value={newEmployee.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg" 
                          required 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                        <input 
                          type="tel" 
                          value={newEmployee.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg" 
                          required 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                        <select 
                          value={newEmployee.department}
                          onChange={(e) => handleInputChange('department', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg" 
                          required
                        >
                          <option value="">Select Department</option>
                          <option value="Engineering">Engineering</option>
                          <option value="Marketing">Marketing</option>
                          <option value="HR">HR</option>
                          <option value="Operations">Operations</option>
                          <option value="Teaching">Teaching</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                        <Select value={newEmployee.role} onValueChange={(value) => handleInputChange('role', value)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map(role => (
                              <SelectItem key={role} value={role}>{role}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Employment Type</label>
                        <select 
                          value={newEmployee.employmentType}
                          onChange={(e) => handleInputChange('employmentType', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg" 
                          required
                        >
                          <option value="">Select Employment Type</option>
                          <option value="Full-Time">Full-Time</option>
                          <option value="Part-Time">Part-Time</option>
                          <option value="Casual">Casual</option>
                          <option value="Contract">Contract</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Add Employee</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <Tabs defaultValue="fulltime" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="fulltime">Full-Time</TabsTrigger>
                <TabsTrigger value="casual">Casual</TabsTrigger>
              </TabsList>

              <TabsContent value="fulltime">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="w-5 h-5" />
                      <span>Full-Time Employees</span>
                    </CardTitle>
                    <CardDescription>{filteredFullTimeEmployees.length} total employees</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search employees..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      {filteredFullTimeEmployees.map((employee) => {
                        const incrementInfo = getIncrementInfo(employee);
                        return (
                          <div key={employee.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900">{employee.name}</p>
                              <p className="text-sm text-gray-600">
                                {employee.id} • {employee.department} • {employee.position} • {employee.type}
                              </p>
                              <p className="text-xs text-gray-500">
                                Next Increment: {incrementInfo.nextIncrement} on {incrementInfo.incrementDate}
                              </p>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleViewDetails(employee.name, employee.id)}
                            >
                              View Details
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="casual">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="w-5 h-5" />
                      <span>Casual Employees</span>
                    </CardTitle>
                    <CardDescription>{filteredCasualEmployees.length} total employees</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search employees..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      {filteredCasualEmployees.map((employee) => (
                        <div key={employee.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{employee.name}</p>
                            <p className="text-sm text-gray-600">
                              {employee.id} • {employee.department} • {employee.position} • {employee.type}
                            </p>
                            <p className="text-xs text-gray-500">Hourly Rate: S${employee.hourlyRate}/hour</p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleViewDetails(employee.name, employee.id)}
                          >
                            View Details
                          </Button>
                        </div>
                      ))}
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

export default Employees;
