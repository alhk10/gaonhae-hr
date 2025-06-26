
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Settings, Edit, Trash2, Eye } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { getEmployees, addEmployee } from '@/services/employeeService';
import { useNavigate } from 'react-router-dom';
import EditEmployeeForm from '@/components/employee/EditEmployeeForm';
import EmployeeModuleSettings from '@/components/employee/EmployeeModuleSettings';

const Employees = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [showModuleSettings, setShowModuleSettings] = useState(false);

  const { data: employees = [], isLoading, error } = useQuery({
    queryKey: ['employees'],
    queryFn: getEmployees,
    staleTime: 5 * 60 * 1000,
  });

  const addEmployeeMutation = useMutation({
    mutationFn: addEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast("Employee added successfully");
      setShowAddForm(false);
    },
    onError: (error) => {
      console.error('Error adding employee:', error);
      toast("Error adding employee. Please try again.");
    }
  });

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const newEmployee = {
      id: `EMP${Date.now()}`,
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      nric: formData.get('nric') as string,
      date_of_birth: formData.get('dateOfBirth') as string,
      address: formData.get('address') as string,
      position: formData.get('position') as string,
      department: formData.get('department') as string,
      type: formData.get('type') as string,
      residency_status: formData.get('residencyStatus') as string,
      bank_name: formData.get('bankName') as string,
      bank_account: formData.get('bankAccount') as string,
      payment_type: formData.get('paymentType') as string,
      base_salary: formData.get('baseSalary') ? parseFloat(formData.get('baseSalary') as string) : null,
      hourly_rate: formData.get('hourlyRate') ? parseFloat(formData.get('hourlyRate') as string) : null,
      daily_rate: formData.get('dailyRate') ? parseFloat(formData.get('dailyRate') as string) : null,
      join_date: formData.get('joinDate') as string,
    };

    addEmployeeMutation.mutate(newEmployee);
  };

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading employees...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="text-center">
              <p className="text-red-600">Error loading employees. Please try again.</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (showAddForm) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Add New Employee</h2>
                  <p className="text-gray-600">Fill out the employee information</p>
                </div>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  Back to Employees
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Employee Information</CardTitle>
                  <CardDescription>Enter the details for the new employee</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddEmployee} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                        <Input name="name" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                        <Input name="email" type="email" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                        <Input name="phone" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">NRIC *</label>
                        <Input name="nric" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
                        <Input name="dateOfBirth" type="date" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Join Date *</label>
                        <Input name="joinDate" type="date" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                        <Input name="position" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                        <Input name="department" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Employee Type *</label>
                        <select name="type" className="w-full p-2 border border-gray-300 rounded-lg" required>
                          <option value="">Select Type</option>
                          <option value="Full-time">Full-time</option>
                          <option value="Part-time">Part-time</option>
                          <option value="Casual">Casual</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Residency Status *</label>
                        <select name="residencyStatus" className="w-full p-2 border border-gray-300 rounded-lg" required>
                          <option value="">Select Status</option>
                          <option value="Citizen">Citizen</option>
                          <option value="PR">Permanent Resident</option>
                          <option value="Work Permit">Work Permit</option>
                          <option value="S Pass">S Pass</option>
                          <option value="Employment Pass">Employment Pass</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name *</label>
                        <Input name="bankName" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Bank Account *</label>
                        <Input name="bankAccount" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Payment Type</label>
                        <select name="paymentType" className="w-full p-2 border border-gray-300 rounded-lg">
                          <option value="">Select Payment Type</option>
                          <option value="Monthly">Monthly</option>
                          <option value="Hourly">Hourly</option>
                          <option value="Daily">Daily</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Base Salary</label>
                        <Input name="baseSalary" type="number" step="0.01" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Hourly Rate</label>
                        <Input name="hourlyRate" type="number" step="0.01" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Daily Rate</label>
                        <Input name="dailyRate" type="number" step="0.01" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                      <textarea 
                        name="address"
                        rows={3} 
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        placeholder="Enter full address..."
                      ></textarea>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={addEmployeeMutation.isPending}
                    >
                      {addEmployeeMutation.isPending ? 'Adding Employee...' : 'Add Employee'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
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
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Employee Management</h2>
                <p className="text-gray-600">Manage your workforce efficiently</p>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowModuleSettings(true)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Module Settings
                </Button>
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Employee
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>All Employees ({employees.length})</span>
                  <div className="flex items-center space-x-2">
                    <Search className="w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search employees..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-64"
                    />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium text-gray-600">Employee ID</th>
                        <th className="text-left p-3 font-medium text-gray-600">Name</th>
                        <th className="text-left p-3 font-medium text-gray-600">Email</th>
                        <th className="text-left p-3 font-medium text-gray-600">Position</th>
                        <th className="text-left p-3 font-medium text-gray-600">Department</th>
                        <th className="text-left p-3 font-medium text-gray-600">Type</th>
                        <th className="text-left p-3 font-medium text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.map((employee) => (
                        <tr key={employee.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-mono text-sm">{employee.id}</td>
                          <td className="p-3 font-medium">{employee.name}</td>
                          <td className="p-3 text-sm text-gray-600">{employee.email}</td>
                          <td className="p-3 text-sm">{employee.position || 'Not specified'}</td>
                          <td className="p-3 text-sm">{employee.department || 'Not specified'}</td>
                          <td className="p-3">
                            <Badge variant={employee.type === 'Full-time' ? 'default' : 'secondary'}>
                              {employee.type}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="flex space-x-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/employees/${employee.id}`)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingEmployee(employee)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {editingEmployee && (
        <EditEmployeeForm
          employee={editingEmployee}
          onClose={() => setEditingEmployee(null)}
        />
      )}

      {showModuleSettings && (
        <EmployeeModuleSettings
          onClose={() => setShowModuleSettings(false)}
        />
      )}
    </div>
  );
};

export default Employees;
