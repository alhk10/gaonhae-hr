import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, Calendar, Play, ArrowLeft, Users, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const PaymentSummary = () => {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState('December 2024');
  const [currentStep, setCurrentStep] = useState(1);

  const months = [
    'January 2024', 'February 2024', 'March 2024', 'April 2024',
    'May 2024', 'June 2024', 'July 2024', 'August 2024',
    'September 2024', 'October 2024', 'November 2024', 'December 2024'
  ];

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

  const handleProcessPayroll = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
      toast(`Step ${currentStep + 1} completed`);
    } else {
      navigate('/payroll-processing');
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleEmployeeDetails = (employeeId: string) => {
    navigate(`/employees/${employeeId}`);
  };

  const totalFullTimeAmount = fullTimeEmployees.reduce((sum, emp) => sum + emp.netSalary, 0);
  const totalCasualAmount = casualEmployees.reduce((sum, emp) => sum + emp.totalPay, 0);

  const getStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Full-Time</p>
                      <p className="text-2xl font-bold text-gray-900">S${totalFullTimeAmount.toLocaleString()}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Casual</p>
                      <p className="text-2xl font-bold text-gray-900">S${totalCasualAmount.toLocaleString()}</p>
                    </div>
                    <Clock className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Amount</p>
                      <p className="text-2xl font-bold text-gray-900">S${(totalFullTimeAmount + totalCasualAmount).toLocaleString()}</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Processing Date</p>
                      <p className="text-2xl font-bold text-gray-900">Dec 31</p>
                    </div>
                    <Calendar className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="fulltime" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="fulltime">Full-Time Employees</TabsTrigger>
                <TabsTrigger value="casual">Casual Employees</TabsTrigger>
              </TabsList>

              <TabsContent value="fulltime">
                <Card>
                  <CardHeader>
                    <CardTitle>Full-Time Employee Payroll</CardTitle>
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
                    <CardTitle>Casual Employee Payroll</CardTitle>
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
          </div>
        );
      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Review & Approve</CardTitle>
              <CardDescription>Review payroll calculations before final processing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-800">Review Required</h4>
                  <p className="text-sm text-yellow-700">Please review all calculations before proceeding to final processing.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white border rounded-lg p-4">
                    <h5 className="font-medium">Total Full-Time</h5>
                    <p className="text-2xl font-bold text-blue-600">S${totalFullTimeAmount.toLocaleString()}</p>
                  </div>
                  <div className="bg-white border rounded-lg p-4">
                    <h5 className="font-medium">Total Casual</h5>
                    <p className="text-2xl font-bold text-green-600">S${totalCasualAmount.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Final Processing</CardTitle>
              <CardDescription>Execute payroll processing and generate payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-800">Ready for Processing</h4>
                  <p className="text-sm text-green-700">All checks completed. Ready to execute payroll processing.</p>
                </div>
                <div className="bg-white border rounded-lg p-4">
                  <h5 className="font-medium">Final Amount</h5>
                  <p className="text-3xl font-bold text-purple-600">S${(totalFullTimeAmount + totalCasualAmount).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
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
                <Button variant="outline" onClick={() => navigate('/payroll')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Payroll
                </Button>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Payroll Processing</h2>
                  <p className="text-gray-600">Process payroll for {selectedMonth}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month} value={month}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-center space-x-8 mb-8">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step}
                  </div>
                  <span className={`ml-2 text-sm ${
                    step <= currentStep ? 'text-blue-600 font-medium' : 'text-gray-500'
                  }`}>
                    Step {step}
                  </span>
                  {step < 3 && (
                    <div className={`w-16 h-0.5 ml-4 ${
                      step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>

            {getStepContent()}

            <div className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={handlePreviousStep}
                disabled={currentStep === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              <Button onClick={handleProcessPayroll}>
                {currentStep === 3 ? (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Execute Processing
                  </>
                ) : (
                  <>
                    Next Step
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PaymentSummary;
