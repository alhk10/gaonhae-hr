
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Plus, Search, X } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const Employees = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [employees, setEmployees] = useState([
    { name: 'John Tan', id: 'EMP002', dept: 'Engineering', role: 'Senior Developer', employmentType: 'Full-Time', nextIncrement: 'S$9,000', incrementDate: '2025-01-01' },
    { name: 'Mary Ng', id: 'EMP003', dept: 'Marketing', role: 'Marketing Manager', employmentType: 'Full-Time', nextIncrement: 'S$8,500', incrementDate: '2025-02-01' },
    { name: 'David Lim', id: 'EMP004', dept: 'HR', role: 'HR Executive', employmentType: 'Part-Time', nextIncrement: 'S$7,000', incrementDate: '2025-03-01' },
    { name: 'Alice Wong', id: 'EMP005', dept: 'Operations', role: 'Casual Instructor', employmentType: 'Casual', nextIncrement: 'N/A', incrementDate: 'N/A' },
  ]);

  const handleViewDetails = (employeeName: string, employeeId: string) => {
    navigate(`/employees/${employeeId}`);
  };

  const handleAddEmployee = () => {
    setShowAddForm(true);
  };

  const handleSubmitNewEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    toast("Employee added successfully");
    setShowAddForm(false);
  };

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.dept.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fullTimeEmployees = filteredEmployees.filter(emp => emp.employmentType === 'Full-Time' || emp.employmentType === 'Part-Time');
  const casualEmployees = filteredEmployees.filter(emp => emp.employmentType === 'Casual');

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
                        <input type="text" className="w-full p-2 border border-gray-300 rounded-lg" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Employee ID</label>
                        <input type="text" className="w-full p-2 border border-gray-300 rounded-lg" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <input type="email" className="w-full p-2 border border-gray-300 rounded-lg" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                        <input type="tel" className="w-full p-2 border border-gray-300 rounded-lg" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                        <select className="w-full p-2 border border-gray-300 rounded-lg" required>
                          <option value="">Select Department</option>
                          <option value="Engineering">Engineering</option>
                          <option value="Marketing">Marketing</option>
                          <option value="HR">HR</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                        <input type="text" className="w-full p-2 border border-gray-300 rounded-lg" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Employment Type</label>
                        <select className="w-full p-2 border border-gray-300 rounded-lg" required>
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
                    <CardDescription>{fullTimeEmployees.length} total employees</CardDescription>
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
                      {fullTimeEmployees.map((employee) => (
                        <div key={employee.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{employee.name}</p>
                            <p className="text-sm text-gray-600">{employee.id} • {employee.dept} • {employee.role} • {employee.employmentType}</p>
                            <p className="text-xs text-gray-500">Next Increment: {employee.nextIncrement} on {employee.incrementDate}</p>
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

              <TabsContent value="casual">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="w-5 h-5" />
                      <span>Casual Employees</span>
                    </CardTitle>
                    <CardDescription>{casualEmployees.length} total employees</CardDescription>
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
                      {casualEmployees.map((employee) => (
                        <div key={employee.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{employee.name}</p>
                            <p className="text-sm text-gray-600">{employee.id} • {employee.dept} • {employee.role} • {employee.employmentType}</p>
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
