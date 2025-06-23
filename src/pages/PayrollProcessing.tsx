
import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner';

const PayrollProcessing = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [payrollData, setPayrollData] = useState([
    { id: 1, name: 'John Tan', basicSalary: 5000, allowances: 500, overtime: 200, deductions: 150, residencyStatus: 'Citizen', age: 35 },
    { id: 2, name: 'Mary Ng', basicSalary: 6000, allowances: 600, overtime: 150, deductions: 200, residencyStatus: 'PR', age: 42 },
    { id: 3, name: 'David Lim', basicSalary: 4500, allowances: 400, overtime: 100, deductions: 100, residencyStatus: 'Citizen', age: 28 },
  ]);

  const calculateCPF = (grossSalary, residencyStatus, age) => {
    let employeeContribution = 0;
    let employerContribution = 0;

    if (residencyStatus === 'Citizen' || residencyStatus === 'PR') {
      if (age <= 55) {
        employeeContribution = Math.min(0.2 * grossSalary, 1200);
        employerContribution = Math.min(0.17 * grossSalary, 1020);
      } else if (age <= 60) {
        employeeContribution = Math.min(0.115 * grossSalary, 690);
        employerContribution = Math.min(0.13 * grossSalary, 780);
      } else if (age <= 65) {
        employeeContribution = Math.min(0.075 * grossSalary, 450);
        employerContribution = Math.min(0.09 * grossSalary, 540);
      } else {
        employeeContribution = Math.min(0.05 * grossSalary, 300);
        employerContribution = Math.min(0.075 * grossSalary, 450);
      }
    }

    return { employee: employeeContribution, employer: employerContribution };
  };

  const handleCellEdit = (employeeId, columnKey, value) => {
    setPayrollData(prev => prev.map(employee =>
      employee.id === employeeId ? { ...employee, [columnKey]: value } : employee
    ));
  };

  const handleProcessPayroll = () => {
    toast("Payroll processed successfully");
  };

  const paymentColumns = [
    { key: 'employee', label: 'Employee' },
    { key: 'basicSalary', label: 'Basic Salary (S$)', editable: true },
    { key: 'allowances', label: 'Allowances (S$)', editable: true },
    { key: 'overtime', label: 'Overtime (S$)', editable: true },
    { key: 'deductions', label: 'Deductions (S$)', editable: true },
    { key: 'grossPay', label: 'Gross Pay (S$)' },
    { key: 'netPay', label: 'Net Pay (S$)' }
  ];

  const cpfColumns = [
    { key: 'employee', label: 'Employee' },
    { key: 'basicSalary', label: 'Basic Salary (S$)' },
    { key: 'allowances', label: 'Allowances (S$)' },
    { key: 'cpfContribution', label: 'Total CPF (S$)' }
  ];

  const renderEditableCell = (employee, column) => {
    if (!column.editable) {
      if (column.key === 'grossPay') {
        return `${(employee.basicSalary + employee.allowances + employee.overtime - employee.deductions).toFixed(2)}`;
      }
      if (column.key === 'netPay') {
        const gross = employee.basicSalary + employee.allowances + employee.overtime - employee.deductions;
        const cpf = calculateCPF(employee.basicSalary + employee.allowances, employee.residencyStatus, employee.age);
        return `${(gross - cpf.employee).toFixed(2)}`;
      }
      return employee[column.key];
    }

    return (
      <Input
        type="number"
        step="0.01"
        value={employee[column.key] || 0}
        onChange={(e) => handleCellEdit(employee.id, column.key, parseFloat(e.target.value) || 0)}
        className="w-full"
      />
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payroll Processing</CardTitle>
                <CardDescription>Process payroll in three easy steps</CardDescription>
              </CardHeader>
              <CardContent>
                {currentStep === 1 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>1. Employee Details</CardTitle>
                      <CardDescription>Review and update employee details</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Basic Salary (S$)</TableHead>
                            <TableHead>Allowances (S$)</TableHead>
                            <TableHead>Overtime (S$)</TableHead>
                            <TableHead>Deductions (S$)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payrollData.map((employee) => (
                            <TableRow key={employee.id}>
                              <TableCell>{employee.name}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={employee.basicSalary}
                                  onChange={(e) => handleCellEdit(employee.id, 'basicSalary', parseFloat(e.target.value))}
                                  className="w-full"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={employee.allowances}
                                  onChange={(e) => handleCellEdit(employee.id, 'allowances', parseFloat(e.target.value))}
                                  className="w-full"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={employee.overtime}
                                  onChange={(e) => handleCellEdit(employee.id, 'overtime', parseFloat(e.target.value))}
                                  className="w-full"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={employee.deductions}
                                  onChange={(e) => handleCellEdit(employee.id, 'deductions', parseFloat(e.target.value))}
                                  className="w-full"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <Button onClick={() => setCurrentStep(2)} className="mt-4">
                        Next: Payment Processing
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {currentStep === 2 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>2. Payment Processing</CardTitle>
                      <CardDescription>Review and process employee payments</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {paymentColumns.map((column) => (
                              <TableHead key={column.key}>{column.label}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payrollData.map((employee) => (
                            <TableRow key={employee.id}>
                              {paymentColumns.map((column) => (
                                <TableCell key={column.key}>
                                  {column.key === 'employee' ? employee.name : renderEditableCell(employee, column)}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="flex justify-between mt-6">
                        <Button variant="outline" onClick={() => setCurrentStep(1)}>
                          Previous
                        </Button>
                        <Button onClick={() => setCurrentStep(3)}>
                          Next: CPF Submission
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {currentStep === 3 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>3. CPF Contribution Submission</CardTitle>
                      <CardDescription>Review CPF contributions for submission</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {cpfColumns.map((column) => (
                              <TableHead key={column.key}>{column.label}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payrollData.map((employee) => {
                            const cpf = calculateCPF(employee.basicSalary + employee.allowances, employee.residencyStatus, employee.age);
                            return (
                              <TableRow key={employee.id}>
                                <TableCell>{employee.name}</TableCell>
                                <TableCell>{employee.basicSalary.toFixed(2)}</TableCell>
                                <TableCell>{employee.allowances.toFixed(2)}</TableCell>
                                <TableCell>{(cpf.employee + cpf.employer).toFixed(2)}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                      <div className="flex justify-between mt-6">
                        <Button variant="outline" onClick={() => setCurrentStep(2)}>
                          Previous
                        </Button>
                        <Button onClick={handleProcessPayroll}>
                          Complete Payroll Processing
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PayrollProcessing;
