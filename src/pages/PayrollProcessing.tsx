
import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Save, Check, ArrowLeft, CreditCard, FileText } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useNavigate } from 'react-router-dom';

interface PayrollEmployee {
  id: string;
  name: string;
  nric: string;
  dateOfBirth: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
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
      basicSalary: 8500, 
      allowances: 500, 
      deductions: 200, 
      netSalary: 8800,
      bankAccount: '1234-567890',
      bankName: 'DBS Bank',
      status: 'draft'
    },
    { 
      id: 'EMP002', 
      name: 'Mary Ng', 
      nric: 'S2345678B',
      dateOfBirth: '1988-08-22',
      basicSalary: 7200, 
      allowances: 300, 
      deductions: 150, 
      netSalary: 7350,
      bankAccount: '2345-678901',
      bankName: 'OCBC Bank',
      status: 'draft'
    },
  ]);

  const handleSaveDraft = () => {
    toast("Payroll draft saved successfully");
  };

  const handleApprovePayroll = () => {
    setEmployees(prev => prev.map(emp => ({ ...emp, status: 'approved' as const })));
    setCurrentStep('payment');
    toast("Payroll approved. Moving to payment processing.");
  };

  const handleProcessPayment = () => {
    setEmployees(prev => prev.map(emp => ({ ...emp, status: 'paid' as const })));
    setCurrentStep('cpf');
    toast("Payments processed. Moving to CPF submission.");
  };

  const handleCPFSubmission = () => {
    setEmployees(prev => prev.map(emp => ({ ...emp, status: 'cpf_submitted' as const })));
    toast("CPF contributions submitted. Payroll process completed.");
    navigate('/payroll');
  };

  const renderProcessingStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <DollarSign className="w-5 h-5" />
          <span>Payroll Processing</span>
        </CardTitle>
        <CardDescription>Review employee salaries, allowances and deductions</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Basic Salary</TableHead>
              <TableHead>Allowances</TableHead>
              <TableHead>Deductions</TableHead>
              <TableHead>Net Salary</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell className="font-medium">{employee.name}</TableCell>
                <TableCell>S${employee.basicSalary.toLocaleString()}</TableCell>
                <TableCell>S${employee.allowances.toLocaleString()}</TableCell>
                <TableCell>S${employee.deductions.toLocaleString()}</TableCell>
                <TableCell className="font-bold">S${employee.netSalary.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant="outline">{employee.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={handleSaveDraft}>
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
          <Button onClick={handleApprovePayroll}>
            <Check className="w-4 h-4 mr-2" />
            Approve Payroll
          </Button>
        </div>
      </CardContent>
    </Card>
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
              <TableHead>Net Salary</TableHead>
              <TableHead>Bank Name</TableHead>
              <TableHead>Bank Account</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell className="font-medium">{employee.name}</TableCell>
                <TableCell>S${employee.netSalary.toLocaleString()}</TableCell>
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
        <div className="flex justify-end mt-4">
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
              <TableHead>Gross Salary</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell className="font-medium">{employee.name}</TableCell>
                <TableCell>{employee.nric}</TableCell>
                <TableCell>{employee.dateOfBirth}</TableCell>
                <TableCell>S${(employee.basicSalary + employee.allowances).toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant={employee.status === 'cpf_submitted' ? 'default' : 'secondary'}>
                    {employee.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex justify-end mt-4">
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
              <Button variant="outline" onClick={() => navigate('/payroll')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Payroll
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
