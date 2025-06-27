
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Calendar, Download, TrendingUp, Eye, Users, Clock, Plus, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { usePayroll } from '@/contexts/PayrollContext';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

const Payroll = () => {
  const navigate = useNavigate();
  const { payrollState, calculatePayrollTotal, setPayrollStatus, isLoading } = usePayroll();

  const handleProcessPayroll = () => {
    if (payrollState.fullTimeEmployees.length === 0 && payrollState.casualEmployees.length === 0) {
      toast('No employees found. Please add employees before processing payroll.');
      return;
    }
    navigate('/payroll-processing');
  };

  const handleIncrementPlanning = () => {
    navigate('/increment-planning');
  };

  const handlePaymentSummary = () => {
    navigate('/payment-summary');
  };

  const handleAddEmployees = () => {
    navigate('/employees');
  };

  const generatePDF = (month: string) => {
    if (payrollState.fullTimeEmployees.length === 0 && payrollState.casualEmployees.length === 0) {
      toast('No employees found. Cannot generate payroll report.');
      return;
    }

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
              `<tr><td>${emp.name}</td><td>S$ ${(emp.baseSalary || 0).toLocaleString()}</td><td>S$ ${(emp.allowances || 0).toLocaleString()}</td><td>S$ ${(emp.cpf || 0).toLocaleString()}</td><td>S$ ${(emp.total || 0).toLocaleString()}</td></tr>`
            ).join('')}
        </table>
    </div>
    
    <div class="section">
        <h3>CASUAL EMPLOYEES</h3>
        <table>
            <tr><th>Name</th><th>Payment Type</th><th>Rate</th><th>Hours/Days</th><th>Total</th></tr>
            ${payrollState.casualEmployees.map(emp => {
              const rate = emp.hourlyRate || emp.dailyRate || emp.baseSalary || 0;
              const workAmount = emp.hoursWorked || emp.daysWorked || 0;
              const rateDisplay = emp.hourlyRate ? `S$ ${rate.toFixed(2)}/hr` : 
                                emp.dailyRate ? `S$ ${rate.toFixed(2)}/day` : 
                                `S$ ${rate.toFixed(2)}/month`;
              return `<tr><td>${emp.name}</td><td>${emp.paymentType || 'Monthly'}</td><td>${rateDisplay}</td><td>${workAmount}</td><td>S$ ${(emp.totalPay || 0).toLocaleString()}</td></tr>`;
            }).join('')}
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading payroll data...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const currentTotal = calculatePayrollTotal();
  const yearlyTotal = currentTotal * 12;
  const totalEmployees = payrollState.fullTimeEmployees.length + payrollState.casualEmployees.length;
  const hasEmployees = totalEmployees > 0;

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
                  disabled={!hasEmployees}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Process Payroll</span>
                </Button>
              </div>
            </div>

            {!hasEmployees && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No employees found in the database. Please add employees before processing payroll.
                  <Button 
                    variant="link" 
                    className="ml-2 p-0 h-auto text-blue-600"
                    onClick={handleAddEmployees}
                  >
                    Add Employees
                  </Button>
                </AlertDescription>
              </Alert>
            )}

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
                    {hasEmployees && payrollState.fullTimeEmployees.slice(0, 5).map((employee) => (
                      <div key={employee.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{employee.name}</p>
                          <p className="text-sm text-gray-600">
                            Base: S${(employee.baseSalary || 0).toLocaleString()} • 
                            Allowances: S${(employee.allowances || 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">S${(employee.total || 0).toLocaleString()}</p>
                          <p className="text-xs text-gray-500">+ S${(employee.cpf || 0).toLocaleString()} CPF</p>
                        </div>
                      </div>
                    ))}
                    {!hasEmployees && (
                      <div className="text-center py-8">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500 mb-3">No full-time employees found</p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleAddEmployees}
                          className="flex items-center space-x-2"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Employees</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Casual Employees</CardTitle>
                  <CardDescription>Payment details</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {hasEmployees && payrollState.casualEmployees.slice(0, 5).map((employee) => {
                      const rate = employee.hourlyRate || employee.dailyRate || employee.baseSalary || 0;
                      const workAmount = employee.hoursWorked || employee.daysWorked || 0;
                      const paymentType = employee.paymentType || 'Monthly';
                      
                      let rateDisplay = '';
                      if (paymentType === 'Hourly' && employee.hourlyRate) {
                        rateDisplay = `${workAmount}h @ S$${rate.toFixed(2)}/hr`;
                      } else if (paymentType === 'Daily' && employee.dailyRate) {
                        rateDisplay = `${workAmount} days @ S$${rate.toFixed(2)}/day`;
                      } else {
                        rateDisplay = `Monthly: S$${rate.toFixed(2)}`;
                      }

                      return (
                        <div key={employee.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{employee.name}</p>
                            <p className="text-sm text-gray-600">{rateDisplay}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900">S${(employee.totalPay || 0).toLocaleString()}</p>
                            <p className="text-xs text-gray-500">{paymentType}</p>
                          </div>
                        </div>
                      );
                    })}
                    {!hasEmployees && (
                      <div className="text-center py-8">
                        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500 mb-3">No casual employees found</p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleAddEmployees}
                          className="flex items-center space-x-2"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Employees</span>
                        </Button>
                      </div>
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
                    disabled={!hasEmployees}
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
                    disabled={!hasEmployees}
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
