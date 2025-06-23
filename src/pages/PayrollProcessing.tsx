
import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Calculator, Users, DollarSign, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const PayrollProcessing = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState('2024-12');
  const [selectedYear, setSelectedYear] = useState('2024');

  // Mock data for payroll processing
  const [employees] = useState([
    { 
      id: 'EMP001', 
      name: 'John Tan', 
      department: 'Engineering',
      basicSalary: 4500,
      allowances: 300,
      deductions: 200,
      netPay: 4600,
      status: 'Pending'
    },
    { 
      id: 'EMP002', 
      name: 'Mary Ng', 
      department: 'Marketing',
      basicSalary: 4000,
      allowances: 250,
      deductions: 150,
      netPay: 4100,
      status: 'Processed'
    },
    { 
      id: 'EMP003', 
      name: 'David Lim', 
      department: 'Sales',
      basicSalary: 3800,
      allowances: 200,
      deductions: 180,
      netPay: 3820,
      status: 'Pending'
    }
  ]);

  const steps = [
    { id: 1, title: 'Select Period', description: 'Choose payroll period' },
    { id: 2, title: 'Payment Summary', description: 'Review payment details' },
    { id: 3, title: 'Process Payroll', description: 'Finalize and process' }
  ];

  const totalGrossPay = employees.reduce((sum, emp) => sum + emp.basicSalary + emp.allowances, 0);
  const totalNetPay = employees.reduce((sum, emp) => sum + emp.netPay, 0);
  const totalDeductions = employees.reduce((sum, emp) => sum + emp.deductions, 0);

  const handleNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleProcessPayroll = () => {
    toast('Payroll processed successfully');
    // Reset to step 1 after processing
    setCurrentStep(1);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Year</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2022">2022</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Month</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024-01">January 2024</SelectItem>
                    <SelectItem value="2024-02">February 2024</SelectItem>
                    <SelectItem value="2024-03">March 2024</SelectItem>
                    <SelectItem value="2024-04">April 2024</SelectItem>
                    <SelectItem value="2024-05">May 2024</SelectItem>
                    <SelectItem value="2024-06">June 2024</SelectItem>
                    <SelectItem value="2024-07">July 2024</SelectItem>
                    <SelectItem value="2024-08">August 2024</SelectItem>
                    <SelectItem value="2024-09">September 2024</SelectItem>
                    <SelectItem value="2024-10">October 2024</SelectItem>
                    <SelectItem value="2024-11">November 2024</SelectItem>
                    <SelectItem value="2024-12">December 2024</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900">Selected Period</h4>
              <p className="text-blue-700">
                Processing payroll for {new Date(selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Employees</p>
                      <p className="text-2xl font-bold">{employees.length}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Gross Pay</p>
                      <p className="text-2xl font-bold">S${totalGrossPay.toFixed(2)}</p>
                    </div>
                    <Calculator className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Net Pay</p>
                      <p className="text-2xl font-bold">S${totalNetPay.toFixed(2)}</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Payment Summary Details</CardTitle>
                <CardDescription>Review individual employee payments for {new Date(selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Basic Salary</TableHead>
                      <TableHead>Allowances</TableHead>
                      <TableHead>Deductions</TableHead>
                      <TableHead>Net Pay</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">{employee.name}</TableCell>
                        <TableCell>{employee.department}</TableCell>
                        <TableCell>S${employee.basicSalary.toFixed(2)}</TableCell>
                        <TableCell>S${employee.allowances.toFixed(2)}</TableCell>
                        <TableCell>S${employee.deductions.toFixed(2)}</TableCell>
                        <TableCell className="font-medium">S${employee.netPay.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={employee.status === 'Processed' ? 'default' : 'secondary'}>
                            {employee.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-gray-600">Total Gross Pay</p>
                    <p className="text-xl font-bold text-green-600">S${totalGrossPay.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Deductions</p>
                    <p className="text-xl font-bold text-red-600">S${totalDeductions.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Net Pay</p>
                    <p className="text-xl font-bold text-blue-600">S${totalNetPay.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center p-8">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Ready to Process Payroll</h3>
              <p className="text-gray-600 mb-6">
                All calculations have been completed. Click the button below to finalize and process payroll for {new Date(selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.
              </p>
              <div className="bg-yellow-50 p-4 rounded-lg mb-6">
                <p className="text-yellow-800 text-sm">
                  <strong>Warning:</strong> Once processed, payroll data cannot be modified. Please ensure all information is correct.
                </p>
              </div>
              <Button onClick={handleProcessPayroll} className="px-8">
                Process Payroll
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Process Payroll</h2>
              <p className="text-gray-600">Process monthly payroll with step-by-step guidance</p>
            </div>

            {/* Progress Steps */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  {steps.map((step, index) => (
                    <div key={step.id} className="flex items-center">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                        currentStep >= step.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {currentStep > step.id ? <CheckCircle className="w-5 h-5" /> : step.id}
                      </div>
                      <div className="ml-3">
                        <p className={`text-sm font-medium ${
                          currentStep >= step.id ? 'text-blue-600' : 'text-gray-600'
                        }`}>
                          {step.title}
                        </p>
                        <p className="text-xs text-gray-500">{step.description}</p>
                      </div>
                      {index < steps.length - 1 && (
                        <ArrowRight className="w-4 h-4 text-gray-400 mx-4" />
                      )}
                    </div>
                  ))}
                </div>
                <Progress value={(currentStep / steps.length) * 100} className="w-full" />
              </CardContent>
            </Card>

            {/* Step Content */}
            <Card>
              <CardHeader>
                <CardTitle>{steps[currentStep - 1]?.title}</CardTitle>
                <CardDescription>{steps[currentStep - 1]?.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {renderStepContent()}
              </CardContent>
            </Card>

            {/* Navigation Buttons */}
            <div className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={handlePrevStep}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              {currentStep < 3 ? (
                <Button onClick={handleNextStep}>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <div /> // Empty div to maintain layout
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PayrollProcessing;
