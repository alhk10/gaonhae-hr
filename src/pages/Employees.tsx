
import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Search, Plus, UserCheck, UserX, Building2, Phone, Mail, Calendar, MapPin, Eye, Database } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { getEmployees, getFullTimeEmployees, getCasualEmployees, getActiveEmployeeCount } from '@/services/employeeService';
import { getBranches } from '@/services/settingsService';
import { seedEmployeeData } from '@/utils/seedEmployeeData';
import type { EmployeeProfile } from '@/types/employee';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

const Employees = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  const [isSeeding, setIsSeeding] = useState(false);

  // Fetch data from Supabase
  const { data: allEmployees = [], isLoading: isLoadingAll, error: allError, refetch: refetchAll } = useQuery({
    queryKey: ['employees', 'all'],
    queryFn: getEmployees,
    retry: 2,
    retryDelay: 1000,
  });

  const { data: fullTimeEmployees = [], isLoading: isLoadingFullTime, error: fullTimeError, refetch: refetchFullTime } = useQuery({
    queryKey: ['employees', 'full-time'],
    queryFn: getFullTimeEmployees,
    retry: 2,
    retryDelay: 1000,
  });

  const { data: casualEmployees = [], isLoading: isLoadingCasual, error: casualError, refetch: refetchCasual } = useQuery({
    queryKey: ['employees', 'casual'],
    queryFn: getCasualEmployees,
    retry: 2,
    retryDelay: 1000,
  });

  const { data: activeEmployeeCount = 0, refetch: refetchCount } = useQuery({
    queryKey: ['employees', 'count'],
    queryFn: getActiveEmployeeCount,
    retry: 2,
    retryDelay: 1000,
  });

  const branches = getBranches();

  const handleAddEmployee = () => {
    navigate('/employees/new');
  };

  const handleViewEmployee = (employeeId: string) => {
    navigate(`/employees/${employeeId}`);
  };

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      await seedEmployeeData();
      toast.success("Sample employee data added successfully!");
      // Refetch all data
      refetchAll();
      refetchFullTime();
      refetchCasual();
      refetchCount();
    } catch (error) {
      console.error('Error seeding data:', error);
      toast.error("Failed to add sample data. Please try again.");
    } finally {
      setIsSeeding(false);
    }
  };

  const getEmployeesToDisplay = () => {
    let employees: EmployeeProfile[] = [];
    
    switch (activeTab) {
      case 'full-time':
        employees = fullTimeEmployees;
        break;
      case 'casual':
        employees = casualEmployees;
        break;
      default:
        employees = allEmployees;
        break;
    }

    // Filter by search term
    if (searchTerm) {
      employees = employees.filter(emp => 
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.position?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by branch
    if (selectedBranch !== 'all') {
      employees = employees.filter(emp => 
        emp.branch === selectedBranch || emp.department === selectedBranch
      );
    }

    return employees;
  };

  const employeesToDisplay = getEmployeesToDisplay();
  const isLoading = isLoadingAll || isLoadingFullTime || isLoadingCasual;
  const hasErrors = allError || fullTimeError || casualError;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-3 md:p-6 overflow-auto">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading employees...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (hasErrors) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-3 md:p-6 overflow-auto">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-red-500 mb-4">
                  <Users className="w-16 h-16 mx-auto mb-2" />
                  <p className="text-lg font-medium">Error Loading Employees</p>
                  <p className="text-sm text-gray-600 mt-2">
                    There was an issue fetching employee data from the database.
                  </p>
                </div>
                <div className="space-x-4">
                  <Button onClick={() => window.location.reload()}>
                    Retry
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleSeedData}
                    disabled={isSeeding}
                  >
                    <Database className="w-4 h-4 mr-2" />
                    {isSeeding ? 'Adding Sample Data...' : 'Add Sample Data'}
                  </Button>
                </div>
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
        <main className="flex-1 p-3 md:p-6 overflow-auto">
          <div className="space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">Employee Management</h2>
                <p className="text-sm md:text-base text-gray-600">Manage your workforce and employee information</p>
              </div>
              <div className="flex gap-2">
                {(allEmployees.length === 0 && !isLoading) && (
                  <Button 
                    variant="outline" 
                    onClick={handleSeedData}
                    disabled={isSeeding}
                  >
                    <Database className="w-4 h-4 mr-2" />
                    {isSeeding ? 'Adding...' : 'Add Sample Data'}
                  </Button>
                )}
                <Button 
                  className="flex items-center space-x-2 w-full sm:w-auto" 
                  onClick={handleAddEmployee}
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Employee</span>
                </Button>
              </div>
            </div>

            {/* Employee Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <Card>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Active</p>
                      <p className="text-2xl font-bold text-gray-900">{activeEmployeeCount}</p>
                    </div>
                    <Users className="w-6 h-6 md:w-8 md:h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Full-Time</p>
                      <p className="text-2xl font-bold text-gray-900">{fullTimeEmployees.length}</p>
                    </div>
                    <UserCheck className="w-6 h-6 md:w-8 md:h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Casual</p>
                      <p className="text-2xl font-bold text-gray-900">{casualEmployees.length}</p>
                    </div>
                    <UserX className="w-6 h-6 md:w-8 md:h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Departments</p>
                      <p className="text-2xl font-bold text-gray-900">{branches.length}</p>
                    </div>
                    <Building2 className="w-6 h-6 md:w-8 md:h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search employees by name, ID, email, or position..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
              >
                <option value="all">All Branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.name}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Employee Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All Employees ({allEmployees.length})</TabsTrigger>
                <TabsTrigger value="full-time">Full-Time ({fullTimeEmployees.length})</TabsTrigger>
                <TabsTrigger value="casual">Casual ({casualEmployees.length})</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg md:text-xl">
                      {activeTab === 'all' ? 'All Employees' : 
                       activeTab === 'full-time' ? 'Full-Time Employees' : 
                       'Casual Employees'}
                    </CardTitle>
                    <CardDescription>
                      {employeesToDisplay.length} employee(s) found
                      {searchTerm && ` matching "${searchTerm}"`}
                      {selectedBranch !== 'all' && ` in ${selectedBranch}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {employeesToDisplay.map((employee) => (
                        <Card key={employee.id} className="p-4 hover:shadow-md transition-shadow">
                          <div className="space-y-3">
                            {/* Header with name and type */}
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3">
                                  <h3 className="font-medium text-gray-900 text-lg">{employee.name}</h3>
                                  <Badge variant={employee.type === 'Full-Time' ? 'default' : 'secondary'}>
                                    {employee.type}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600">{employee.id}</p>
                                <p className="text-sm text-gray-600">{employee.position}</p>
                              </div>
                              <Button 
                                size="sm" 
                                onClick={() => handleViewEmployee(employee.id)}
                                className="w-full sm:w-auto"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </Button>
                            </div>

                            {/* Contact and employment details */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-gray-600">
                              {employee.email && (
                                <div className="flex items-center space-x-2">
                                  <Mail className="w-4 h-4 flex-shrink-0" />
                                  <span className="break-all">{employee.email}</span>
                                </div>
                              )}
                              {employee.phone && (
                                <div className="flex items-center space-x-2">
                                  <Phone className="w-4 h-4 flex-shrink-0" />
                                  <span>{employee.phone}</span>
                                </div>
                              )}
                              <div className="flex items-center space-x-2">
                                <MapPin className="w-4 h-4 flex-shrink-0" />
                                <span>{employee.branch || employee.department || 'Not specified'}</span>
                              </div>
                              {employee.joinDate && (
                                <div className="flex items-center space-x-2">
                                  <Calendar className="w-4 h-4 flex-shrink-0" />
                                  <span>Joined: {format(new Date(employee.joinDate), 'MMM dd, yyyy')}</span>
                                </div>
                              )}
                            </div>

                            {/* Salary information */}
                            <div className="text-sm">
                              {employee.type === 'Full-Time' && employee.baseSalary && (
                                <span className="font-medium">Base Salary: <span className="text-green-600">S${employee.baseSalary.toLocaleString()}/month</span></span>
                              )}
                              {employee.type === 'Casual' && employee.hourlyRate && (
                                <span className="font-medium">Hourly Rate: <span className="text-green-600">S${employee.hourlyRate}/hr</span></span>
                              )}
                              {employee.paymentType === 'Daily' && employee.dailyWeekdayRate && (
                                <span className="font-medium">Daily Rate: <span className="text-green-600">S${employee.dailyWeekdayRate}/day (weekday)</span></span>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                      
                      {employeesToDisplay.length === 0 && allEmployees.length === 0 && (
                        <div className="text-center py-8">
                          <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                          <p className="text-gray-500 mb-4">No employees found in the system</p>
                          <div className="space-x-4">
                            <Button onClick={handleAddEmployee}>
                              <Plus className="w-4 h-4 mr-2" />
                              Add First Employee
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={handleSeedData}
                              disabled={isSeeding}
                            >
                              <Database className="w-4 h-4 mr-2" />
                              {isSeeding ? 'Adding Sample Data...' : 'Add Sample Data'}
                            </Button>
                          </div>
                        </div>
                      )}

                      {employeesToDisplay.length === 0 && allEmployees.length > 0 && (
                        <div className="text-center py-8">
                          <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                          <p className="text-gray-500">
                            {searchTerm || selectedBranch !== 'all' 
                              ? 'No employees found matching your criteria' 
                              : 'No employees found'
                            }
                          </p>
                        </div>
                      )}
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
