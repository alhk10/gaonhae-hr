
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DollarSign, Calendar, Play, ArrowLeft, Users, Clock, Plus } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const PaymentSummary = () => {
  const navigate = useNavigate();
  const [selectedPayroll, setSelectedPayroll] = useState('2024-12');
  const [isNewPayrollOpen, setIsNewPayrollOpen] = useState(false);
  const [newPayrollPeriod, setNewPayrollPeriod] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  // Year-to-date payroll data
  const payrollHistory = [
    { 
      id: '2024-12', 
      period: 'December 2024', 
      status: 'Current', 
      totalAmount: 26540, 
      employeeCount: 6,
      processedDate: null 
    },
    { 
      id: '2024-11', 
      period: 'November 2024', 
      status: 'Completed', 
      totalAmount: 25890, 
      employeeCount: 6,
      processedDate: '2024-11-30' 
    },
    { 
      id: '2024-10', 
      period: 'October 2024', 
      status: 'Completed', 
      totalAmount: 26100, 
      employeeCount: 6,
      processedDate: '2024-10-31' 
    },
    { 
      id: '2024-09', 
      period: 'September 2024', 
      status: 'Completed', 
      totalAmount: 25750, 
      employeeCount: 6,
      processedDate: '2024-09-30' 
    },
    { 
      id: '2024-08', 
      period: 'August 2024', 
      status: 'Completed', 
      totalAmount: 26200, 
      employeeCount: 6,
      processedDate: '2024-08-31' 
    },
  ];

  const currentPayroll = payrollHistory.find(p => p.id === selectedPayroll);

  const fullTimeEmployees = [
    { id: 'EMP001', name: 'John Tan', basicSalary: 8500, allowances: 350, deductions: 100, netSalary: 7100, status: 'Pending' },
    { id: 'EMP002', name: 'Mary Ng', basicSalary: 7200, allowances: 200, deductions: 50, netSalary: 6200, status: 'Pending' },
    { id: 'EMP003', name: 'David Lim', basicSalary: 6800, allowances: 250, deductions: 75, netSalary: 5900, status: 'Pending' },
  ];

  const casualEmployees = [
    { id: 'CAS001', name: 'Alice Wong', hourlyRate: 25, hoursWorked: 120, totalPay: 3000, status: 'Pending' },
    { id: 'CAS002', name: 'Bob Chen', hourlyRate: 22, hoursWorked: 100, totalPay: 2200, status: 'Pending' },
    { id: 'CAS003', name: 'Sarah Lee', hourlyRate: 28, hoursWorked: 80, totalPay: 2240, status: 'Pending' },
  ];

  const allEmployees = [
    ...fullTimeEmployees.map(emp => ({ id: emp.id, name: emp.name, type: 'Full-Time' })),
    ...casualEmployees.map(emp => ({ id: emp.id, name: emp.name, type: 'Casual' }))
  ];

  const handleProcessPayroll = () => {
    navigate('/payroll-processing');
  };

  const handleEmployeeDetails = (employeeId: string) => {
    navigate(`/employees/${employeeId}`);
  };

  const handleCreateNewPayroll = () => {
    if (!newPayrollPeriod || selectedEmployees.length === 0) {
      toast('Please select a payroll period and at least one employee');
      return;
    }

    // Create new payroll logic would go here
    toast(`New payroll created for ${newPayrollPeriod} with ${selectedEmployees.length} employees`);
    setIsNewPayrollOpen(false);
    setNewPayrollPeriod('');
    setSelectedEmployees([]);
  };

  const handleEmployeeSelection = (employeeId: string, checked: boolean) => {
    if (checked) {
      setSelectedEmployees([...selectedEmployees, employeeId]);
    } else {
      setSelectedEmployees(selectedEmployees.filter(id => id !== employeeId));
    }
  };

  const totalFullTimeAmount = fullTimeEmployees.reduce((sum, emp) => sum + emp.netSalary, 0);
  const totalCasualAmount = casualEmployees.reduce((sum, emp) => sum + emp.totalPay, 0);
  const yearToDateTotal = payrollHistory.reduce((sum, payroll) => sum + payroll.totalAmount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button variant="outline" onClick={() => navigate('/payroll')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Payroll
                </Button>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Payroll Summary - Year to Date</h2>
                  <p className="text-gray-600">Manage and view payroll history for 2024</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Dialog open={isNewPayrollOpen} onOpenChange={setIsNewPayrollOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex items-center space-x-2">
                      <Plus className="w-4 h-4" />
                      <span>Add New Payroll</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create New Payroll</DialogTitle>
                      <DialogDescription>
                        Select the payroll period and employees to include in the new payroll.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          Payroll Period
                        </label>
                        <Select value={newPayrollPeriod} onValueChange={setNewPayrollPeriod}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payroll period" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2025-01">January 2025</SelectItem>
                            <SelectItem value="2025-02">February 2025</SelectItem>
                            <SelectItem value="2025-03">March 2025</SelectItem>
                            <SelectItem value="2025-04">April 2025</SelectItem>
                            <SelectItem value="2025-05">May 2025</SelectItem>
                            <SelectItem value="2025-06">June 2025</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          Select Employees ({selectedEmployees.length} selected)
                        </label>
                        <div className="max-h-60 overflow-y-auto border rounded-md p-3 space-y-2">
                          {allEmployees.map((employee) => (
                            <div key={employee.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={employee.id}
                                checked={selectedEmployees.includes(employee.id)}
                                onCheckedChange={(checked) => 
                                  handleEmployeeSelection(employee.id, checked as boolean)
                                }
                              />
                              <label 
                                htmlFor={employee.id}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer"
                              >
                                {employee.name} ({employee.type})
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setIsNewPayrollOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateNewPayroll}>
                          Create Payroll
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button className="flex items-center space-x-2" onClick={handleProcessPayroll}>
                  <Play className="w-4 h-4" />
                  <span>Process Current Payroll</span>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Year to Date Total</p>
                      <p className="text-2xl font-bold text-gray-900">S${yearToDateTotal.toLocaleString()}</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Current Period</p>
                      <p className="text-2xl font-bold text-gray-900">S${currentPayroll?.totalAmount.toLocaleString()}</p>
                    </div>
                    <Calendar className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Payroll Periods</p>
                      <p className="text-2xl font-bold text-gray-900">{payrollHistory.length}</p>
                    </div>
                    <Clock className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Employees</p>
                      <p className="text-2xl font-bold text-gray-900">{allEmployees.length}</p>
                    </div>
                    <Users className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Payroll History - 2024</CardTitle>
                <CardDescription>Year-to-date payroll summary</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Employees</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Processed Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollHistory.map((payroll) => (
                      <TableRow key={payroll.id}>
                        <TableCell className="font-medium">{payroll.period}</TableCell>
                        <TableCell>
                          <Badge variant={payroll.status === 'Current' ? 'default' : 'secondary'}>
                            {payroll.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{payroll.employeeCount}</TableCell>
                        <TableCell className="font-bold">S${payroll.totalAmount.toLocaleString()}</TableCell>
                        <TableCell>{payroll.processedDate || '-'}</TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedPayroll(payroll.id)}
                          >
                            {payroll.id === selectedPayroll ? 'Viewing' : 'View Details'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {currentPayroll && (
              <Tabs defaultValue="fulltime" className="space-y-6">
                <div className="flex items-center justify-between">
                  <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="fulltime">Full-Time Employees</TabsTrigger>
                    <TabsTrigger value="casual">Casual Employees</TabsTrigger>
                  </TabsList>
                  <p className="text-sm text-gray-600">
                    Showing details for: <span className="font-semibold">{currentPayroll.period}</span>
                  </p>
                </div>

                <TabsContent value="fulltime">
                  <Card>
                    <CardHeader>
                      <CardTitle>Full-Time Employee Payroll - {currentPayroll.period}</CardTitle>
                      <CardDescription>Monthly salary summary for full-time employees</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Employee Name</TableHead>
                            <TableHead>Employee ID</TableHead>
                            <TableHead>Basic Salary</TableHead>
                            <TableHead>Allowances</TableHead>
                            <TableHead>Deductions</TableHead>
                            <TableHead>Net Salary</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fullTimeEmployees.map((employee) => (
                            <TableRow key={employee.id}>
                              <TableCell className="font-medium">{employee.name}</TableCell>
                              <TableCell>{employee.id}</TableCell>
                              <TableCell>S${employee.basicSalary.toLocaleString()}</TableCell>
                              <TableCell>S${employee.allowances}</TableCell>
                              <TableCell>S${employee.deductions}</TableCell>
                              <TableCell className="font-bold">S${employee.netSalary.toLocaleString()}</TableCell>
                              <TableCell>
                                <Badge variant="secondary">{employee.status}</Badge>
                              </TableCell>
                              <TableCell>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleEmployeeDetails(employee.id)}
                                >
                                  View Details
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="casual">
                  <Card>
                    <CardHeader>
                      <CardTitle>Casual Employee Payroll - {currentPayroll.period}</CardTitle>
                      <CardDescription>Monthly payment summary for casual employees</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Employee Name</TableHead>
                            <TableHead>Employee ID</TableHead>
                            <TableHead>Hourly Rate</TableHead>
                            <TableHead>Hours Worked</TableHead>
                            <TableHead>Total Pay</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {casualEmployees.map((employee) => (
                            <TableRow key={employee.id}>
                              <TableCell className="font-medium">{employee.name}</TableCell>
                              <TableCell>{employee.id}</TableCell>
                              <TableCell>S${employee.hourlyRate}/hr</TableCell>
                              <TableCell>{employee.hoursWorked}h</TableCell>
                              <TableCell className="font-bold">S${employee.totalPay.toLocaleString()}</TableCell>
                              <TableCell>
                                <Badge variant="secondary">{employee.status}</Badge>
                              </TableCell>
                              <TableCell>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleEmployeeDetails(employee.id)}
                                >
                                  View Details
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default PaymentSummary;
