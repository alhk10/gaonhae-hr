
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, Search, X, Trash2, UserX } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { getEmployees, createEmployee, deleteEmployee, updateEmployeeResignDate } from '@/services/employeeService';
import { EmployeeProfile } from '@/types/employee';

const Employees = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state for new employee
  const [newEmployee, setNewEmployee] = useState({
    fullName: '',
    nric: '',
    dateOfBirth: '',
    residencyStatus: '',
    email: '',
    phone: '',
    address: '',
    branch: '',
    position: '',
    employmentType: 'Full-Time',
    paymentType: 'Monthly',
    baseSalary: '',
    hourlyRate: '',
    dailyRate: '',
    bankName: '',
    bankAccount: ''
  });

  const positions = ['Senior Instructor', 'Instructor', 'Junior Instructor', 'Casual Instructor', 'Administrative Manager', 'Administrative Assistant', 'General Manager', 'Partner', 'Senior Partner', 'Senior Developer', 'Marketing Manager', 'HR Executive'];
  const branches = ['Main Branch', 'North Branch', 'South Branch', 'East Branch', 'West Branch'];
  const residencyStatuses = ['Singapore Citizen', 'Permanent Resident Year 1', 'Permanent Resident Year 2', 'Work Permit', 'S Pass', 'Employment Pass'];
  const bankNames = ['DBS/POSB', 'UOB', 'OCBC', 'HSBC', 'Citibank', 'Maybank', 'SCB', 'Trustbank'];

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const data = await getEmployees();
      setEmployees(data);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast("Error loading employees. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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

  const validateForm = () => {
    const requiredFields = ['fullName', 'email', 'dateOfBirth', 'residencyStatus', 'phone', 'employmentType', 'position', 'paymentType'];
    for (const field of requiredFields) {
      if (!newEmployee[field as keyof typeof newEmployee]) {
        toast(`${field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} is required`);
        return false;
      }
    }
    return true;
  };

  const handleSubmitNewEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const employeeData = {
        name: newEmployee.fullName,
        nric: newEmployee.nric,
        dateOfBirth: newEmployee.dateOfBirth,
        residencyStatus: newEmployee.residencyStatus,
        type: newEmployee.employmentType as 'Full-Time' | 'Casual',
        baseSalary: newEmployee.baseSalary ? parseFloat(newEmployee.baseSalary) : undefined,
        hourlyRate: newEmployee.hourlyRate ? parseFloat(newEmployee.hourlyRate) : undefined,
        dailyRate: newEmployee.dailyRate ? parseFloat(newEmployee.dailyRate) : undefined,
        paymentType: newEmployee.paymentType as 'Monthly' | 'Hourly' | 'Daily',
        bankName: newEmployee.bankName,
        bankAccount: newEmployee.bankAccount,
        branch: newEmployee.branch,
        position: newEmployee.position,
        phone: newEmployee.phone,
        address: newEmployee.address,
        email: newEmployee.email
      };

      await createEmployee(employeeData);
      toast("Employee created successfully!");
      setShowAddForm(false);
      
      // Reset form
      setNewEmployee({
        fullName: '',
        nric: '',
        dateOfBirth: '',
        residencyStatus: '',
        email: '',
        phone: '',
        address: '',
        branch: '',
        position: '',
        employmentType: 'Full-Time',
        paymentType: 'Monthly',
        baseSalary: '',
        hourlyRate: '',
        dailyRate: '',
        bankName: '',
        bankAccount: ''
      });

      // Refresh employee list
      fetchEmployees();
    } catch (error) {
      console.error('Error creating employee:', error);
      toast("Error creating employee. Please try again.");
    }
  };

  const handleDeleteEmployee = async (employeeId: string, employeeName: string) => {
    if (window.confirm(`Are you sure you want to delete ${employeeName}? This action cannot be undone.`)) {
      try {
        await deleteEmployee(employeeId);
        toast("Employee deleted successfully!");
        fetchEmployees();
      } catch (error) {
        console.error('Error deleting employee:', error);
        toast("Error deleting employee. Please try again.");
      }
    }
  };

  const handleResignEmployee = async (employeeId: string, employeeName: string) => {
    const resignDate = prompt(`Enter resign date for ${employeeName} (YYYY-MM-DD):`);
    if (resignDate) {
      try {
        await updateEmployeeResignDate(employeeId, resignDate);
        toast("Employee resign date updated successfully!");
        fetchEmployees();
      } catch (error) {
        console.error('Error updating resign date:', error);
        toast("Error updating resign date. Please try again.");
      }
    }
  };

  // Separate active and resigned employees
  const activeEmployees = employees.filter(emp => !emp.resignDate);
  const resignedEmployees = employees.filter(emp => emp.resignDate);

  // Further separate by type
  const activeFullTimeEmployees = activeEmployees.filter(emp => emp.type === 'Full-Time');
  const activeCasualEmployees = activeEmployees.filter(emp => emp.type === 'Casual');

  // Filter employees based on search term
  const filterEmployees = (employees: EmployeeProfile[]) => {
    return employees.filter(employee =>
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (employee.branch && employee.branch.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const filteredActiveFullTimeEmployees = filterEmployees(activeFullTimeEmployees);
  const filteredActiveCasualEmployees = filterEmployees(activeCasualEmployees);
  const filteredResignedEmployees = filterEmployees(resignedEmployees);

  if (loading) {
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="text" 
                          value={newEmployee.fullName}
                          onChange={(e) => handleInputChange('fullName', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg" 
                          required 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">NRIC/FIN</label>
                        <input 
                          type="text" 
                          value={newEmployee.nric}
                          onChange={(e) => handleInputChange('nric', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Date of Birth <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="date" 
                          value={newEmployee.dateOfBirth}
                          onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg" 
                          required 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Residency Status <span className="text-red-500">*</span>
                        </label>
                        <Select value={newEmployee.residencyStatus} onValueChange={(value) => handleInputChange('residencyStatus', value)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select residency status" />
                          </SelectTrigger>
                          <SelectContent>
                            {residencyStatuses.map(status => (
                              <SelectItem key={status} value={status}>{status}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="email" 
                          value={newEmployee.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg" 
                          required 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Contact Number <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="tel" 
                          value={newEmployee.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg" 
                          required 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                        <input 
                          type="text" 
                          value={newEmployee.address}
                          onChange={(e) => handleInputChange('address', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
                        <Select value={newEmployee.branch} onValueChange={(value) => handleInputChange('branch', value)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select branch" />
                          </SelectTrigger>
                          <SelectContent>
                            {branches.map(branch => (
                              <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Position <span className="text-red-500">*</span>
                        </label>
                        <Select value={newEmployee.position} onValueChange={(value) => handleInputChange('position', value)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select position" />
                          </SelectTrigger>
                          <SelectContent>
                            {positions.map(position => (
                              <SelectItem key={position} value={position}>{position}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Employment Type <span className="text-red-500">*</span>
                        </label>
                        <Select value={newEmployee.employmentType} onValueChange={(value) => handleInputChange('employmentType', value)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select employment type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Full-Time">Full-Time</SelectItem>
                            <SelectItem value="Casual">Casual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Type <span className="text-red-500">*</span>
                        </label>
                        <Select value={newEmployee.paymentType} onValueChange={(value) => handleInputChange('paymentType', value)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select payment type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Monthly">Monthly</SelectItem>
                            <SelectItem value="Hourly">Hourly</SelectItem>
                            <SelectItem value="Daily">Daily</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {newEmployee.paymentType === 'Monthly' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Base Salary</label>
                          <input 
                            type="number" 
                            value={newEmployee.baseSalary}
                            onChange={(e) => handleInputChange('baseSalary', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg" 
                            step="0.01"
                          />
                        </div>
                      )}
                      {newEmployee.paymentType === 'Hourly' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Hourly Rate</label>
                          <input 
                            type="number" 
                            value={newEmployee.hourlyRate}
                            onChange={(e) => handleInputChange('hourlyRate', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg" 
                            step="0.01"
                          />
                        </div>
                      )}
                      {newEmployee.paymentType === 'Daily' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Daily Rate</label>
                          <input 
                            type="number" 
                            value={newEmployee.dailyRate}
                            onChange={(e) => handleInputChange('dailyRate', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg" 
                            step="0.01"
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                        <Select value={newEmployee.bankName} onValueChange={(value) => handleInputChange('bankName', value)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select bank" />
                          </SelectTrigger>
                          <SelectContent>
                            {bankNames.map(bank => (
                              <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Bank Account</label>
                        <input 
                          type="text" 
                          value={newEmployee.bankAccount}
                          onChange={(e) => handleInputChange('bankAccount', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg" 
                        />
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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="fulltime">Full-Time</TabsTrigger>
                <TabsTrigger value="casual">Casual</TabsTrigger>
                <TabsTrigger value="resigned">Resigned</TabsTrigger>
              </TabsList>

              <TabsContent value="fulltime">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="w-5 h-5" />
                      <span>Full-Time Employees</span>
                    </CardTitle>
                    <CardDescription>{filteredActiveFullTimeEmployees.length} active employees</CardDescription>
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
                      {filteredActiveFullTimeEmployees.map((employee) => (
                        <div key={employee.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{employee.name}</p>
                            <p className="text-sm text-gray-600">
                              {employee.id} • {employee.branch} • {employee.position} • {employee.type}
                            </p>
                            <p className="text-xs text-gray-500">
                              Base Salary: S${employee.baseSalary}/month
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleViewDetails(employee.name, employee.id)}
                            >
                              View Details
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleResignEmployee(employee.id, employee.name)}
                            >
                              <UserX className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => handleDeleteEmployee(employee.id, employee.name)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
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
                    <CardDescription>{filteredActiveCasualEmployees.length} active employees</CardDescription>
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
                      {filteredActiveCasualEmployees.map((employee) => (
                        <div key={employee.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{employee.name}</p>
                            <p className="text-sm text-gray-600">
                              {employee.id} • {employee.branch} • {employee.position} • {employee.type}
                            </p>
                            <p className="text-xs text-gray-500">
                              {employee.hourlyRate ? `Hourly Rate: S$${employee.hourlyRate}/hour` : 
                               employee.dailyRate ? `Daily Rate: S$${employee.dailyRate}/day` : 'Rate not set'}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleViewDetails(employee.name, employee.id)}
                            >
                              View Details
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleResignEmployee(employee.id, employee.name)}
                            >
                              <UserX className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => handleDeleteEmployee(employee.id, employee.name)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="resigned">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <UserX className="w-5 h-5" />
                      <span>Resigned Employees</span>
                    </CardTitle>
                    <CardDescription>{filteredResignedEmployees.length} resigned employees</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search resigned employees..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      {filteredResignedEmployees.map((employee) => (
                        <div key={employee.id} className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{employee.name}</p>
                            <p className="text-sm text-gray-600">
                              {employee.id} • {employee.branch} • {employee.position} • {employee.type}
                            </p>
                            <p className="text-xs text-red-600">
                              Resigned on: {employee.resignDate}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleViewDetails(employee.name, employee.id)}
                            >
                              View Details
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => handleDeleteEmployee(employee.id, employee.name)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
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
