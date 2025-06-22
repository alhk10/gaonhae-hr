
import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Download, Calendar } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const Payslips = () => {
  const handleDownloadPayslip = (month: string) => {
    const payslipContent = `
PAYSLIP FOR ${month.toUpperCase()}

COMPANY NAME: ABC Learning Centre Pte Ltd
COMPANY ADDRESS: 123 Main Street, Singapore 123456

EMPLOYEE DETAILS:
Name: Tan Wei Ming
Employee ID: EMP001
NRIC/FIN: S1234567A
Department: Engineering
Position: Developer

PAY PERIOD: ${month}

EARNINGS:
Basic Salary                S$ 7,500.00
Transport Allowance         S$   200.00
Meal Allowance             S$   150.00
                          ___________
Gross Earnings             S$ 7,850.00

DEDUCTIONS:
CPF (Employee 20%)         S$ 1,570.00
Income Tax                 S$    80.00
Insurance                  S$    50.00
                          ___________
Total Deductions           S$ 1,700.00

                          ___________
NET PAY                    S$ 6,150.00

BANK TRANSFER DETAILS:
Bank: DBS Bank
Account Number: 1234-567890

CPF CONTRIBUTIONS:
Employee CPF (20%)         S$ 1,570.00
Employer CPF (17%)         S$ 1,334.50
Total CPF                  S$ 2,904.50

This payslip is computer generated and does not require signature.
For queries, please contact HR Department.
    `;

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

  const payslips = [
    { month: 'December 2024', netSalary: 'S$6,150', grossSalary: 'S$7,850', cpfContribution: 'S$2,904.50' },
    { month: 'November 2024', netSalary: 'S$6,150', grossSalary: 'S$7,850', cpfContribution: 'S$2,904.50' },
    { month: 'October 2024', netSalary: 'S$6,150', grossSalary: 'S$7,850', cpfContribution: 'S$2,904.50' },
    { month: 'September 2024', netSalary: 'S$6,150', grossSalary: 'S$7,850', cpfContribution: 'S$2,904.50' },
  ];

  const totalEarningsYear = payslips.reduce((sum, payslip) => {
    const amount = parseFloat(payslip.grossSalary.replace('S$', '').replace(',', ''));
    return sum + amount;
  }, 0);

  const totalCPFYear = payslips.reduce((sum, payslip) => {
    const amount = parseFloat(payslip.cpfContribution.replace('S$', '').replace(',', ''));
    return sum + amount;
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">My Payslips</h2>
              <p className="text-gray-600">View and download your payslips</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Earnings (Year)</p>
                      <p className="text-2xl font-bold text-gray-900">S${totalEarningsYear.toLocaleString()}</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">CPF Contributions (Year)</p>
                      <p className="text-2xl font-bold text-gray-900">S${totalCPFYear.toLocaleString()}</p>
                    </div>
                    <Calendar className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Payslips</CardTitle>
                <CardDescription>Download your monthly payslips</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {payslips.map((payslip, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{payslip.month}</p>
                        <p className="text-sm text-gray-600">
                          Net: {payslip.netSalary} • Gross: {payslip.grossSalary} • CPF: {payslip.cpfContribution}
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDownloadPayslip(payslip.month)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </Button>
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

export default Payslips;
