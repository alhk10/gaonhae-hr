
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Calendar, Download, TrendingUp, Eye } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const Payroll = () => {
  const navigate = useNavigate();

  const handleProcessPayroll = () => {
    navigate('/payroll-processing');
  };

  const handleIncrementPlanning = () => {
    navigate('/increment-planning');
  };

  const handlePaymentSummary = () => {
    // Navigate to payment processing summary
    toast("Opening Payment Processing Summary");
  };

  const handleDownload = (month: string) => {
    // Create a proper PDF blob with payslip template
    const payslipContent = `
PAYSLIP FOR ${month.toUpperCase()}

COMPANY NAME: ABC Learning Centre Pte Ltd
COMPANY ADDRESS: 123 Main Street, Singapore 123456

EMPLOYEE DETAILS:
Name: John Tan
Employee ID: EMP001
NRIC/FIN: S1234567A
Department: Engineering
Position: Senior Developer

PAY PERIOD: ${month}

EARNINGS:
Basic Salary                S$ 8,500.00
Transport Allowance         S$   200.00
Meal Allowance             S$   150.00
                          ___________
Gross Earnings             S$ 8,850.00

DEDUCTIONS:
CPF (Employee 20%)         S$ 1,770.00
Income Tax                 S$   100.00
Insurance                  S$    50.00
                          ___________
Total Deductions           S$ 1,920.00

                          ___________
NET PAY                    S$ 6,930.00

BANK TRANSFER DETAILS:
Bank: DBS Bank
Account Number: 1234-567890

This payslip is computer generated and does not require signature.
For queries, please contact HR Department.
    `;

    // Create and download the PDF
    const blob = new Blob([payslipContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payslip-${month.replace(' ', '-').toLowerCase()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast(`Downloaded payslip for ${month}`);
  };

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
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline"
                  className="flex items-center space-x-2" 
                  onClick={handlePaymentSummary}
                >
                  <Eye className="w-4 h-4" />
                  <span>Payment Summary</span>
                </Button>
                <Button 
                  variant="outline"
                  className="flex items-center space-x-2" 
                  onClick={handleIncrementPlanning}
                >
                  <TrendingUp className="w-4 h-4" />
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Amount Approved</p>
                      <p className="text-2xl font-bold text-gray-900">S$245,680</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Earnings (Year)</p>
                      <p className="text-2xl font-bold text-gray-900">S$2,948,160</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Next Run</p>
                      <p className="text-2xl font-bold text-gray-900">3 days</p>
                    </div>
                    <Calendar className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Payroll Runs</CardTitle>
                <CardDescription>Latest payroll processing history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { month: 'December 2024', amount: 'S$245,680', status: 'Completed', date: '2024-12-01' },
                    { month: 'November 2024', amount: 'S$248,920', status: 'Completed', date: '2024-11-01' },
                    { month: 'October 2024', amount: 'S$252,100', status: 'Completed', date: '2024-10-01' },
                  ].map((run, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{run.month}</p>
                        <p className="text-sm text-gray-600">{run.amount} • {run.date}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-green-600 text-sm font-medium">{run.status}</span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDownload(run.month)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download PDF
                        </Button>
                      </div>
                    </div>
                  ))}
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
