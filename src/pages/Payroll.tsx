
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Calendar, Download, TrendingUp, Eye, Users, Clock } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { usePayroll } from '@/contexts/PayrollContext';
import { Badge } from '@/components/ui/badge';

const Payroll = () => {
  const navigate = useNavigate();
  const { payrollState, calculatePayrollTotal, setPayrollStatus } = usePayroll();

  const handleProcessPayroll = () => {
    navigate('/payroll-processing');
  };

  const handleIncrementPlanning = () => {
    navigate('/increment-planning');
  };

  const handlePaymentSummary = () => {
    navigate('/payment-summary');
  };

  const generatePDF = (month: string) => {
    const pdfContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Payroll Summary - ${month}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
        .section { margin: 20px 0; }
        .row { display: flex; justify-content: space-between; margin: 5px 0; }
        .total { font-weight: bold; border-top: 1px solid #000; padding-top: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #000; padding: 8px; text-align: left; }
        th { background-color: #f0f0f0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>PAYROLL SUMMARY</h1>
        <h2>${month.toUpperCase()}</h2>
        <p>ABC Learning Centre Pte Ltd</p>
    </div>
    
    <div class="section">
        <h3>PAYROLL OVERVIEW</h3>
        <div class="row"><span>Total Employees:</span><span>${payrollState.fullTimeEmployees.length + payrollState.casualEmployees.length}</span></div>
        <div class="row"><span>Full-Time Employees:</span><span>${payrollState.fullTimeEmployees.length}</span></div>
        <div class="row"><span>Casual Employees:</span><span>${payrollState.casualEmployees.length}</span></div>
        <div class="row total"><span>Total Payroll Amount:</span><span>S$ ${calculatePayrollTotal().toLocaleString()}</span></div>
    </div>
    
    <div class="section">
        <h3>FULL-TIME EMPLOYEES</h3>
        <table>
            <tr><th>Name</th><th>Base Salary</th><th>Allowances</th><th>CPF</th><th>Total</th></tr>
            ${payrollState.fullTimeEmployees.map(emp => 
              `<tr><td>${emp.name}</td><td>S$ ${emp.baseSalary.toLocaleString()}</td><td>S$ ${emp.allowances.toLocaleString()}</td><td>S$ ${emp.cpf.toLocaleString()}</td><td>S$ ${emp.total.toLocaleString()}</td></tr>`
            ).join('')}
        </table>
    </div>
    
    <div class="section">
        <h3>CASUAL EMPLOYEES</h3>
        <table>
            <tr><th>Name</th><th>Hours</th><th>Rate</th><th>Gross Pay</th><th>Total</th></tr>
            ${payrollState.casualEmployees.map(emp => 
              `<tr><td>${emp.name}</td><td>${emp.hoursWorked}</td><td>S$ ${emp.hourlyRate.toFixed(2)}</td><td>S$ ${(emp.hourlyRate * emp.hoursWorked).toLocaleString()}</td><td>S$ ${emp.totalPay.toLocaleString()}</td></tr>`
            ).join('')}
        </table>
    </div>
</body>
</html>
    `;

    const blob = new Blob([pdfContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payroll-summary-${month.replace(' ', '-').toLowerCase()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast(`Downloaded payroll summary for ${month}`);
  };

  const currentTotal = calculatePayrollTotal();
  const yearlyTotal = currentTotal * 12;
  const totalEmployees = payrollState.fullTimeEmployees.length + payrollState.casualEmployees.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Payroll Management</h2>
                <p className="text-gray-600">Process and manage employee payroll</p>
                <div className="flex items-center space-x-4 mt-2">
                  <Badge variant={payrollState.status === 'completed' ? 'default' : 'secondary'}>
                    {payrollState.status.charAt(0).toUpperCase() + payrollState.status.slice(1)}
                  </Badge>
                  <p className="text-sm text-gray-500">
                    Period: {payrollState.currentPeriod} | Last Updated: {payrollState.lastUpdated.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline"
                  className="flex items-center space-x-2" 
                  onClick={handleIncrementPlanning}
                >
                  <TrendingUp className="w-4 h-4"  />
                  <span>Increment Planning</span>
                </Button>
                <Button 
                  className="flex items-center space-x-2" 
                  onClick={handleProcessPayroll}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Process Payroll</span>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Current Total</p>
                      <p className="text-2xl font-bold text-gray-900">S${currentTotal.toLocaleString()}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {payrollState.currentPeriod}
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Employees</p>
                      <p className="text-2xl font-bold text-gray-900">{totalEmployees}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {payrollState.fullTimeEmployees.length} FT + {payrollState.casualEmployees.length} Casual
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Estimated Yearly</p>
                      <p className="text-2xl font-bold text-gray-900">S${yearlyTotal.toLocaleString()}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Based on current rates
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Next Processing</p>
                      <p className="text-2xl font-bold text-gray-900">3 days</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Due date
                      </p>
                    </div>
                    <Clock className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Full-Time Employees</CardTitle>
                  <CardDescription>Current payroll breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {payrollState.fullTimeEmployees.slice(0, 5).map((employee) => (
                      <div key={employee.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{employee.name}</p>
                          <p className="text-sm text-gray-600">
                            Base: S${employee.baseSalary.toLocaleString()} • 
                            Allowances: S${employee.allowances.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">S${employee.total.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">+ S${employee.cpf.toLocaleString()} CPF</p>
                        </div>
                      </div>
                    ))}
                    {payrollState.fullTimeEmployees.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">No full-time employees</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Casual Employees</CardTitle>
                  <CardDescription>Hours and payments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {payrollState.casualEmployees.slice(0, 5).map((employee) => (
                      <div key={employee.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{employee.name}</p>
                          <p className="text-sm text-gray-600">
                            {employee.hoursWorked}h @ S${employee.hourlyRate.toFixed(2)}/hr
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">S${employee.totalPay.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">{employee.daysWorked} days</p>
                        </div>
                      </div>
                    ))}
                    {payrollState.casualEmployees.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">No casual employees</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Payroll Actions</CardTitle>
                <CardDescription>Quick actions for payroll management</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    variant="outline" 
                    className="flex items-center space-x-2"
                    onClick={handlePaymentSummary}
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Payment Summary</span>
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex items-center space-x-2"
                    onClick={() => generatePDF(payrollState.currentPeriod)}
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Report</span>
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex items-center space-x-2"
                    onClick={() => {
                      setPayrollStatus('processing');
                      toast('Payroll status updated to processing');
                    }}
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Mark as Processing</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Payroll;
