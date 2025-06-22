
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Calendar, Download, TrendingUp } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const Payroll = () => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcessPayroll = () => {
    navigate('/payroll-processing');
  };

  const handleIncrementPlanning = () => {
    navigate('/increment-planning');
  };

  const handleDownload = (month: string, amount: string) => {
    // Generate a sample payslip PDF content
    const pdfContent = `
COMPANY PAYSLIP - ${month}

Employee: John Tan
Employee ID: EMP001
Period: ${month}

EARNINGS:
Basic Salary: S$8,500.00
Allowances: S$500.00
Gross Pay: S$9,000.00

DEDUCTIONS:
CPF (Employee): S$900.00
Tax: S$100.00
Total Deductions: S$1,000.00

NET PAY: S$8,000.00

Bank Transfer Details:
Bank: DBS Bank
Account: 1234-567890
`;

    const element = document.createElement('a');
    const file = new Blob([pdfContent], {type: 'application/pdf'});
    element.href = URL.createObjectURL(file);
    element.download = `payslip-${month.replace(' ', '-').toLowerCase()}.pdf`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    toast(`Downloaded payslip PDF for ${month}`);
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
                  onClick={handleIncrementPlanning}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Increment Planning</span>
                </Button>
                <Button 
                  className="flex items-center space-x-2" 
                  onClick={handleProcessPayroll}
                  disabled={isProcessing}
                >
                  <Calendar className="w-4 h-4" />
                  <span>{isProcessing ? 'Processing...' : 'Process Payroll'}</span>
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
                          onClick={() => handleDownload(run.month, run.amount)}
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
