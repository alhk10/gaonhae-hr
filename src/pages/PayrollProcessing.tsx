import React, { useState } from 'react';
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
import { calculateCPF } from '@/utils/cpfCalculations';

interface PayrollEmployee {
  id: string;
  name: string;
  nric: string;
  dateOfBirth: string;
  residencyStatus: string;
  basicSalary: number;
  allowances: { name: string; amount: number }[];
  deductions: { name: string; amount: number }[];
  employeeCPF: number;
  employerCPF: number;
  netSalary: number;
  bankAccount: string;
  bankName: string;
  status: 'draft' | 'approved' | 'paid' | 'cpf_submitted';
}

interface CasualEmployee {
  id: string;
  name: string;
  nric: string;
  dateOfBirth: string;
  residencyStatus: string;
  hourlyRate: number;
  hoursWorked: number;
  daysWorked: number;
  totalPay: number;
  employeeCPF: number;
  employerCPF: number;
  bankAccount: string;
  bankName: string;
  status: 'draft' | 'approved' | 'paid' | 'cpf_submitted';
}

const PayrollProcessing = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<'processing' | 'payment' | 'cpf'>('processing');
  const [employees, setEmployees] = useState<PayrollEmployee[]>([
    { 
      id: 'EMP001', 
      name: 'John Tan', 
      nric: 'S1234567A',
      dateOfBirth: '1990-05-15',
      residencyStatus: 'Singapore Citizen',
      basicSalary: 8500, 
      allowances: [
        { name: 'Transport Allowance', amount: 200 },
        { name: 'Meal Allowance', amount: 150 }
      ],
      deductions: [
        { name: 'Insurance', amount: 100 }
      ],
      employeeCPF: 0,
      employerCPF: 0,
      netSalary: 0,
      bankAccount: '1234-567890',
      bankName: 'DBS Bank',
      status: 'draft'
    },
    { 
      id: 'EMP002', 
      name: 'Mary Ng', 
      nric: 'S2345678B',
      dateOfBirth: '1988-08-22',
      residencyStatus: 'Permanent Resident Year 2',
      basicSalary: 7200, 
      allowances: [
        { name: 'Transport Allowance', amount: 200 }
      ],
      deductions: [
        { name: 'Insurance', amount: 50 }
      ],
      employeeCPF: 0,
      employerCPF: 0,
      netSalary: 0,
      bankAccount: '2345-678901',
      bankName: 'OCBC Bank',
      status: 'draft'
    },
  ]);

  const [casualEmployees, setCasualEmployees] = useState<CasualEmployee[]>([
    {
      id: 'CAS001',
      name: 'Alice Wong',
      nric: 'S3456789C',
      dateOfBirth: '1995-03-10',
      residencyStatus: 'Singapore Citizen',
      hourlyRate: 25,
      hoursWorked: 120,
      daysWorked: 15,
      totalPay: 0,
      employeeCPF: 0,
      employerCPF: 0,
      bankAccount: '3456-789012',
      bankName: 'UOB Bank',
      status: 'draft'
    },
    {
      id: 'CAS002', 
      name: 'Bob Chen',
      nric: 'S4567890D',
      dateOfBirth: '1992-11-25',
      residencyStatus: 'Permanent Resident Year 1',
      hourlyRate: 22,
      hoursWorked: 100,
      daysWorked: 12,
      totalPay: 0,
      employeeCPF: 0,
      employerCPF: 0,
      bankAccount: '4567-890123',
      bankName: 'DBS Bank',
      status: 'draft'
    },
    {
      id: 'CAS003',
      name: 'Sarah Lee',
      nric: 'S5678901E',
      dateOfBirth: '1993-07-18',
      residencyStatus: 'Singapore Citizen',
      hourlyRate: 28,
      hoursWorked: 80,
      daysWorked: 10,
      totalPay: 0,
      employeeCPF: 0,
      employerCPF: 0,
      bankAccount: '5678-901234',
      bankName: 'OCBC Bank',
      status: 'draft'
    }
  ]);

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

  // Calculate CPF and net salary for each employee
  React.useEffect(() => {
    setEmployees(prev => prev.map(emp => {
      const totalAllowances = emp.allowances.reduce((sum, a) => sum + a.amount, 0);
      const totalDeductions = emp.deductions.reduce((sum, d) => sum + d.amount, 0);
      const grossSalary = emp.basicSalary + totalAllowances;
      
      const cpfCalc = calculateCPF(grossSalary, emp.residencyStatus);
      const netSalary = grossSalary - cpfCalc.employeeCPF - totalDeductions;
      
      return {
        ...emp,
        employeeCPF: cpfCalc.employeeCPF,
        employerCPF: cpfCalc.employerCPF,
        netSalary: netSalary
      };
    }));

    setCasualEmployees(prev => prev.map(emp => {
      const totalPay = emp.hourlyRate * emp.hoursWorked;
      const cpfCalc = calculateCPF(totalPay, emp.residencyStatus);
      
      return {
        ...emp,
        totalPay: totalPay - cpfCalc.employeeCPF,
        employeeCPF: cpfCalc.employeeCPF,
        employerCPF: cpfCalc.employerCPF
      };
    }));
  }, []);

  const updateEmployeeSalary = (employeeId: string, newSalary: number) => {
    setEmployees(prev => prev.map(emp => {
      if (emp.id === employeeId) {
        const totalAllowances = emp.allowances.reduce((sum, a) => sum + a.amount, 0);
        const totalDeductions = emp.deductions.reduce((sum, d) => sum + d.amount, 0);
        const grossSalary = newSalary + totalAllowances;
        
        const cpfCalc = calculateCPF(grossSalary, emp.residencyStatus);
        const netSalary = grossSalary - cpfCalc.employeeCPF - totalDeductions;
        
        return {
          ...emp,
          basicSalary: newSalary,
          employeeCPF: cpfCalc.employeeCPF,
          employerCPF: cpfCalc.employerCPF,
          netSalary: netSalary
        };
      }
      return emp;
    }));
  };

  const addAllowance = (employeeId: string, allowanceName: string) => {
    const systemAllowance = systemAllowances.find(a => a.name === allowanceName);
    const amount = systemAllowance?.type === 'Fixed' ? parseFloat(systemAllowance.amount) : 0;
    
    setEmployees(prev => prev.map(emp => 
      emp.id === employeeId 
        ? { ...emp, allowances: [...emp.allowances, { name: allowanceName, amount }] }
        : emp
    ));
  };

  const removeAllowance = (employeeId: string, index: number) => {
    setEmployees(prev => prev.map(emp => 
      emp.id === employeeId 
        ? { ...emp, allowances: emp.allowances.filter((_, i) => i !== index) }
        : emp
    ));
  };

  const addDeduction = (employeeId: string, deductionName: string) => {
    const systemDeduction = systemDeductions.find(d => d.name === deductionName);
    const amount = systemDeduction?.type === 'Fixed' ? parseFloat(systemDeduction.amount) : 0;
    
    setEmployees(prev => prev.map(emp => 
      emp.id === employeeId 
        ? { ...emp, deductions: [...emp.deductions, { name: deductionName, amount }] }
        : emp
    ));
  };

  const removeDeduction = (employeeId: string, index: number) => {
    setEmployees(prev => prev.map(emp => 
      emp.id === employeeId 
        ? { ...emp, deductions: emp.deductions.filter((_, i) => i !== index) }
        : emp
    ));
  };

  const updateCasualEmployeeHours = (employeeId: string, newHours: number) => {
    setCasualEmployees(prev => prev.map(emp => {
      if (emp.id === employeeId) {
        const totalPay = emp.hourlyRate * newHours;
        const cpfCalc = calculateCPF(totalPay, emp.residencyStatus);
        
        return {
          ...emp,
          hoursWorked: newHours,
          totalPay: totalPay - cpfCalc.employeeCPF,
          employeeCPF: cpfCalc.employeeCPF,
          employerCPF: cpfCalc.employerCPF
        };
      }
      return emp;
    }));
  };

  const updateCasualEmployeeRate = (employeeId: string, newRate: number) => {
    setCasualEmployees(prev => prev.map(emp => {
      if (emp.id === employeeId) {
        const totalPay = newRate * emp.hoursWorked;
        const cpfCalc = calculateCPF(totalPay, emp.residencyStatus);
        
        return {
          ...emp,
          hourlyRate: newRate,
          totalPay: totalPay - cpfCalc.employeeCPF,
          employeeCPF: cpfCalc.employeeCPF,
          employerCPF: cpfCalc.employerCPF
        };
      }
      return emp;
    }));
  };

  const handleSaveDraft = () => {
    localStorage.setItem('payrollDraft', JSON.stringify({ employees, casualEmployees }));
    toast("Payroll draft saved successfully");
  };

  const handleApprovePayroll = () => {
    setEmployees(prev => prev.map(emp => ({ ...emp, status: 'approved' as const })));
    setCasualEmployees(prev => prev.map(emp => ({ ...emp, status: 'approved' as const })));
    setCurrentStep('payment');
    toast("Payroll approved. Moving to payment processing.");
  };

  const handleProcessPayment = () => {
    setEmployees(prev => prev.map(emp => ({ ...emp, status: 'paid' as const })));
    setCasualEmployees(prev => prev.map(emp => ({ ...emp, status: 'paid' as const })));
    setCurrentStep('cpf');
    toast("Payments processed. Moving to CPF submission.");
  };

  const handleCPFSubmission = () => {
    setEmployees(prev => prev.map(emp => ({ ...emp, status: 'cpf_submitted' as const })));
    setCasualEmployees(prev => prev.map(emp => ({ ...emp, status: 'cpf_submitted' as const })));
    toast("CPF contributions submitted. Payroll process completed.");
    navigate('/payroll');
  };

  const handleBackStep = () => {
    if (currentStep === 'payment') {
      setCurrentStep('processing');
    } else if (currentStep === 'cpf') {
      setCurrentStep('payment');
    }
  };

  const renderProcessingStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5" />
            <span>Full-Time Employees</span>
          </CardTitle>
          <CardDescription>Review full-time employee salaries, allowances and deductions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {employees.map((employee) => (
              <div key={employee.id} className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-4">{employee.name}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Basic Salary</h4>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        value={employee.basicSalary}
                        onChange={(e) => updateEmployeeSalary(employee.id, parseFloat(e.target.value) || 0)}
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
                      {employee.allowances.map((allowance, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span>{allowance.name}: S${allowance.amount}</span>
                          <Button size="sm" variant="ghost" onClick={() => removeAllowance(employee.id, index)}>
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
                      {employee.deductions.map((deduction, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span>{deduction.name}: S${deduction.amount}</span>
                          <Button size="sm" variant="ghost" onClick={() => removeDeduction(employee.id, index)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">CPF</h4>
                    <div className="space-y-1 text-sm">
                      <div>Employee CPF: S${employee.employeeCPF.toFixed(2)}</div>
                      <div>Employer CPF: S${employee.employerCPF.toFixed(2)}</div>
                      <div className="font-medium">Total CPF: S${(employee.employeeCPF + employee.employerCPF).toFixed(2)}</div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <p className="font-bold text-lg">Net Salary: S${employee.netSalary.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5" />
            <span>Casual Employees</span>
          </CardTitle>
          <CardDescription>Review casual employee hourly rates and hours worked</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {casualEmployees.map((employee) => (
              <div key={employee.id} className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-4">{employee.name}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Hourly Rate</h4>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        value={employee.hourlyRate}
                        onChange={(e) => updateCasualEmployeeRate(employee.id, parseFloat(e.target.value) || 0)}
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
                        onChange={(e) => updateCasualEmployeeHours(employee.id, parseFloat(e.target.value) || 0)}
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
                    <h4 className="font-medium mb-2">CPF</h4>
                    <div className="space-y-1 text-sm">
                      <div>Employee CPF: S${employee.employeeCPF.toFixed(2)}</div>
                      <div>Employer CPF: S${employee.employerCPF.toFixed(2)}</div>
                      <div className="font-medium">Total CPF: S${(employee.employeeCPF + employee.employerCPF).toFixed(2)}</div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <p className="font-bold text-lg">Total Pay: S${employee.totalPay.toFixed(2)}</p>
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
            {employees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell className="font-medium">{employee.name}</TableCell>
                <TableCell>Full-Time</TableCell>
                <TableCell>S${employee.netSalary.toFixed(2)}</TableCell>
                <TableCell>{employee.bankName}</TableCell>
                <TableCell>{employee.bankAccount}</TableCell>
                <TableCell>
                  <Badge variant={employee.status === 'paid' ? 'default' : 'secondary'}>
                    {employee.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {casualEmployees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell className="font-medium">{employee.name}</TableCell>
                <TableCell>Casual</TableCell>
                <TableCell>S${employee.totalPay.toFixed(2)}</TableCell>
                <TableCell>{employee.bankName}</TableCell>
                <TableCell>{employee.bankAccount}</TableCell>
                <TableCell>
                  <Badge variant={employee.status === 'paid' ? 'default' : 'secondary'}>
                    {employee.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
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
              <TableHead>Date of Birth</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Basic/Hourly</TableHead>
              <TableHead>Gross Pay</TableHead>
              <TableHead>Employee CPF</TableHead>
              <TableHead>Employer CPF</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => {
              const totalAllowances = employee.allowances.reduce((sum, a) => sum + a.amount, 0);
              const grossSalary = employee.basicSalary + totalAllowances;
              return (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>{employee.nric}</TableCell>
                  <TableCell>{employee.dateOfBirth}</TableCell>
                  <TableCell>Full-Time</TableCell>
                  <TableCell>S${employee.basicSalary.toFixed(2)}</TableCell>
                  <TableCell>S${grossSalary.toFixed(2)}</TableCell>
                  <TableCell>S${employee.employeeCPF.toFixed(2)}</TableCell>
                  <TableCell>S${employee.employerCPF.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={employee.status === 'cpf_submitted' ? 'default' : 'secondary'}>
                      {employee.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {casualEmployees.map((employee) => {
              const grossPay = employee.hourlyRate * employee.hoursWorked;
              return (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>{employee.nric}</TableCell>
                  <TableCell>{employee.dateOfBirth}</TableCell>
                  <TableCell>Casual</TableCell>
                  <TableCell>S${employee.hourlyRate.toFixed(2)}/hr</TableCell>
                  <TableCell>S${grossPay.toFixed(2)}</TableCell>
                  <TableCell>S${employee.employeeCPF.toFixed(2)}</TableCell>
                  <TableCell>S${employee.employerCPF.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={employee.status === 'cpf_submitted' ? 'default' : 'secondary'}>
                      {employee.status}
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
                <p className="text-gray-600">Step {currentStep === 'processing' ? '1' : currentStep === 'payment' ? '2' : '3'} of 3</p>
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
