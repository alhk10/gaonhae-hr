import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, Save, Check, ArrowLeft, CreditCard, FileText, Plus, Trash2, Edit } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useNavigate } from 'react-router-dom';
import { usePayroll } from '@/contexts/PayrollContext';
import { getEmployeeById } from '@/data/employeeData';

const PayrollProcessing = () => {
  const navigate = useNavigate();
  const { 
    payrollState, 
    updateEmployeeSalary,
    updateEmployeeAllowances,
    updateEmployeeDeductions,
    updateCasualEmployeeHours,
    setPayrollStatus,
    savePayrollDraft
  } = usePayroll();
  
  const [currentStep, setCurrentStep] = useState<'processing' | 'payment' | 'cpf'>('processing');
  
  const [systemAllowances] = useState([
    { name: 'Transport Allowance', type: 'Fixed', amount: '200' },
    { name: 'Meal Allowance', type: 'Fixed', amount: '150' },
    { name: 'Performance Bonus', type: 'Percentage', amount: '10' },
    { name: 'Overtime', type: 'Manual', amount: '' }
  ]);

  const [systemDeductions] = useState([
    { name: 'Insurance Premium', type: 'Fixed', amount: '100' },
    { name: 'Union Dues', type: 'Percentage', amount: '2' },
    { name: 'Loan Deduction', type: 'Manual', amount: '' }
  ]);

  // Log current state for debugging
  useEffect(() => {
    console.log('PayrollProcessing - Current state:', payrollState);
  }, [payrollState]);

  const handleSalaryChange = (employeeId: string, newSalary: number) => {
    console.log(`Updating salary for ${employeeId}: ${newSalary}`);
    updateEmployeeSalary(employeeId, newSalary);
  };

  const handleHoursChange = (employeeId: string, newHours: number) => {
    console.log(`Updating hours for ${employeeId}: ${newHours}`);
    updateCasualEmployeeHours(employeeId, newHours);
  };

  const handleRateChange = (employeeId: string, newRate: number) => {
    console.log(`Updating rate for ${employeeId}: ${newRate}`);
    const employee = payrollState.casualEmployees.find(emp => emp.id === employeeId);
    if (employee) {
      updateCasualEmployeeHours(employeeId, employee.hoursWorked, newRate);
    }
  };

  const addAllowance = (employeeId: string, allowanceName: string) => {
    const empData = getEmployeeById(employeeId);
    if (!empData) return;
    
    const systemAllowance = systemAllowances.find(a => a.name === allowanceName);
    const amount = systemAllowance?.type === 'Fixed' ? parseFloat(systemAllowance.amount) : 0;
    
    const newAllowances = [
      ...empData.allowances.map(a => ({ name: a.name, amount: a.amount })),
      { name: allowanceName, amount }
    ];
    
    updateEmployeeAllowances(employeeId, newAllowances);
  };

  const removeAllowance = (employeeId: string, allowanceName: string) => {
    const empData = getEmployeeById(employeeId);
    if (!empData) return;
    
    const newAllowances = empData.allowances
      .filter(a => a.name !== allowanceName)
      .map(a => ({ name: a.name, amount: a.amount }));
    
    updateEmployeeAllowances(employeeId, newAllowances);
  };

  const addDeduction = (employeeId: string, deductionName: string) => {
    const empData = getEmployeeById(employeeId);
    if (!empData) return;
    
    const systemDeduction = systemDeductions.find(d => d.name === deductionName);
    const amount = systemDeduction?.type === 'Fixed' ? parseFloat(systemDeduction.amount) : 0;
    
    const newDeductions = [
      ...empData.deductions.map(d => ({ name: d.name, amount: d.amount })),
      { name: deductionName, amount }
    ];
    
    updateEmployeeDeductions(employeeId, newDeductions);
  };

  const removeDeduction = (employeeId: string, deductionName: string) => {
    const empData = getEmployeeById(employeeId);
    if (!empData) return;
    
    const newDeductions = empData.deductions
      .filter(d => d.name !== deductionName)
      .map(d => ({ name: d.name, amount: a.amount }));
    
    updateEmployeeDeductions(employeeId, newDeductions);
  };

  const handleSaveDraft = () => {
    savePayrollDraft();
    toast("Payroll draft saved successfully");
  };

  const handleApprovePayroll = () => {
    setPayrollStatus('approved');
    setCurrentStep('payment');
    toast("Payroll approved. Moving to payment processing.");
  };

  const handleProcessPayment = () => {
    setPayrollStatus('paid');
    setCurrentStep('cpf');
    toast("Payments processed. Moving to CPF submission.");
  };

  const handleCPFSubmission = () => {
    setPayrollStatus('completed');
    toast("CPF contributions submitted. Payroll process completed.");
    navigate('/payroll');
  };

  const handleBackStep = () => {
    if (currentStep === 'payment') {
      setCurrentStep('processing');
      setPayrollStatus('draft');
    } else if (currentStep === 'cpf') {
      setCurrentStep('payment');
      setPayrollStatus('approved');
    }
  };

  const renderProcessingStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5" />
            <span>Full-Time Employees ({payrollState.fullTimeEmployees.length})</span>
          </CardTitle>
          <CardDescription>Review full-time employee salaries, allowances and deductions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {payrollState.fullTimeEmployees.map((employee) => {
              const empData = getEmployeeById(employee.id);
              return (
                <div key={employee.id} className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-4">{employee.name}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Basic Salary</h4>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          value={employee.baseSalary}
                          onChange={(e) => handleSalaryChange(employee.id, parseFloat(e.target.value) || 0)}
                          className="w-full"
                        />
                        <Edit className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">Allowances</h4>
                        <Select onValueChange={(value) => addAllowance(employee.id, value)}>
                          <SelectTrigger className="w-8 h-8 p-0">
                            <Plus className="w-4 h-4" />
                          </SelectTrigger>
                          <SelectContent>
                            {systemAllowances.map((allowance) => (
                              <SelectItem key={allowance.name} value={allowance.name}>
                                {allowance.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        {empData?.allowances.map((allowance, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span>{allowance.name}: S${allowance.amount}</span>
                            <Button size="sm" variant="ghost" onClick={() => removeAllowance(employee.id, allowance.name)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">Deductions</h4>
                        <Select onValueChange={(value) => addDeduction(employee.id, value)}>
                          <SelectTrigger className="w-8 h-8 p-0">
                            <Plus className="w-4 h-4" />
                          </SelectTrigger>
                          <SelectContent>
                            {systemDeductions.map((deduction) => (
                              <SelectItem key={deduction.name} value={deduction.name}>
                                {deduction.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        {empData?.deductions.map((deduction, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span>{deduction.name}: S${deduction.amount}</span>
                            <Button size="sm" variant="ghost" onClick={() => removeDeduction(employee.id, deduction.name)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Summary</h4>
                      <div className="space-y-1 text-sm">
                        <div>Allowances: S${employee.allowances.toFixed(2)}</div>
                        <div>Deductions: S${employee.deductions.toFixed(2)}</div>
                        <div>CPF: S${employee.cpf.toFixed(2)}</div>
                        <div className="font-medium">Net: S${employee.total.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5" />
            <span>Casual Employees ({payrollState.casualEmployees.length})</span>
          </CardTitle>
          <CardDescription>Review casual employee hourly rates and hours worked</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {payrollState.casualEmployees.map((employee) => (
              <div key={employee.id} className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-4">{employee.name}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Hourly Rate</h4>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        value={employee.hourlyRate}
                        onChange={(e) => handleRateChange(employee.id, parseFloat(e.target.value) || 0)}
                        className="w-full"
                      />
                      <Edit className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Hours Worked</h4>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        value={employee.hoursWorked}
                        onChange={(e) => handleHoursChange(employee.id, parseFloat(e.target.value) || 0)}
                        className="w-full"
                      />
                      <Edit className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Days Worked</h4>
                    <div className="text-sm">
                      <div>{employee.daysWorked} days</div>
                      <div className="text-gray-500">From slot bookings</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Summary</h4>
                    <div className="space-y-1 text-sm">
                      <div>Employee CPF: S${employee.employeeCPF.toFixed(2)}</div>
                      <div>Employer CPF: S${employee.employerCPF.toFixed(2)}</div>
                      <div className="font-medium">Total Pay: S${employee.totalPay.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={handleSaveDraft}>
          <Save className="w-4 h-4 mr-2" />
          Save Draft
        </Button>
        <Button onClick={handleApprovePayroll}>
          <Check className="w-4 h-4 mr-2" />
          Approve Payroll
        </Button>
      </div>
    </div>
  );

  const renderPaymentStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="w-5 h-5" />
          <span>Payment Processing</span>
        </CardTitle>
        <CardDescription>Process payments to employee bank accounts</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Bank Name</TableHead>
              <TableHead>Bank Account</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payrollState.fullTimeEmployees.map((employee) => {
              const empData = getEmployeeById(employee.id);
              return (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>Full-Time</TableCell>
                  <TableCell>S${employee.total.toFixed(2)}</TableCell>
                  <TableCell>{empData?.bankName}</TableCell>
                  <TableCell>{empData?.bankAccount}</TableCell>
                  <TableCell>
                    <Badge variant={payrollState.status === 'paid' || payrollState.status === 'completed' ? 'default' : 'secondary'}>
                      {payrollState.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {payrollState.casualEmployees.map((employee) => {
              const empData = getEmployeeById(employee.id);
              return (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>Casual</TableCell>
                  <TableCell>S${employee.totalPay.toFixed(2)}</TableCell>
                  <TableCell>{empData?.bankName}</TableCell>
                  <TableCell>{empData?.bankAccount}</TableCell>
                  <TableCell>
                    <Badge variant={payrollState.status === 'paid' || payrollState.status === 'completed' ? 'default' : 'secondary'}>
                      {payrollState.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="flex justify-between mt-4">
          <Button variant="outline" onClick={handleBackStep}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button onClick={handleProcessPayment}>
            <CreditCard className="w-4 h-4 mr-2" />
            Process Payments
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderCPFStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="w-5 h-5" />
          <span>CPF Contribution Submission</span>
        </CardTitle>
        <CardDescription>Submit CPF contributions for employees</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee Name</TableHead>
              <TableHead>NRIC/FIN</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Basic/Hourly</TableHead>
              <TableHead>Gross Pay</TableHead>
              <TableHead>Employee CPF</TableHead>
              <TableHead>Employer CPF</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payrollState.fullTimeEmployees.map((employee) => {
              const empData = getEmployeeById(employee.id);
              const grossSalary = employee.baseSalary + employee.allowances;
              return (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>{empData?.nric}</TableCell>
                  <TableCell>Full-Time</TableCell>
                  <TableCell>S${employee.baseSalary.toFixed(2)}</TableCell>
                  <TableCell>S${grossSalary.toFixed(2)}</TableCell>
                  <TableCell>S${(grossSalary * 0.20).toFixed(2)}</TableCell>
                  <TableCell>S${employee.cpf.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={payrollState.status === 'completed' ? 'default' : 'secondary'}>
                      {payrollState.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {payrollState.casualEmployees.map((employee) => {
              const empData = getEmployeeById(employee.id);
              const grossPay = employee.hourlyRate * employee.hoursWorked;
              return (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>{empData?.nric}</TableCell>
                  <TableCell>Casual</TableCell>
                  <TableCell>S${employee.hourlyRate.toFixed(2)}/hr</TableCell>
                  <TableCell>S${grossPay.toFixed(2)}</TableCell>
                  <TableCell>S${employee.employeeCPF.toFixed(2)}</TableCell>
                  <TableCell>S${employee.employerCPF.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={payrollState.status === 'completed' ? 'default' : 'secondary'}>
                      {payrollState.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="flex justify-between mt-4">
          <Button variant="outline" onClick={handleBackStep}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button onClick={handleCPFSubmission}>
            <FileText className="w-4 h-4 mr-2" />
            Submit CPF Contributions
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => navigate('/payment-summary')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Payment Summary
              </Button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Payroll Processing</h2>
                <p className="text-gray-600">
                  Step {currentStep === 'processing' ? '1' : currentStep === 'payment' ? '2' : '3'} of 3 | 
                  Period: {payrollState.currentPeriod} | 
                  Total: S${payrollState.totalAmount.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex space-x-4 mb-6">
              <Badge variant={currentStep === 'processing' ? 'default' : 'outline'}>1. Processing</Badge>
              <Badge variant={currentStep === 'payment' ? 'default' : 'outline'}>2. Payment</Badge>
              <Badge variant={currentStep === 'cpf' ? 'default' : 'outline'}>3. CPF Submission</Badge>
            </div>

            {currentStep === 'processing' && renderProcessingStep()}
            {currentStep === 'payment' && renderPaymentStep()}
            {currentStep === 'cpf' && renderCPFStep()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default PayrollProcessing;
