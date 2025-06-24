
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
    navigate('/payment-summary');
  };

  const handleIncrementPlanning = () => {
    navigate('/increment-planning');
  };

  const handlePaymentSummary = () => {
    navigate('/payment-summary');
  };

  const generatePDF = (month: string) => {
    // Create a proper PDF-like structure with better formatting
    const pdfContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Payslip - ${month}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
        .section { margin: 20px 0; }
        .row { display: flex; justify-content: space-between; margin: 5px 0; }
        .total { font-weight: bold; border-top: 1px solid #000; padding-top: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>PAYSLIP</h1>
        <h2>${month.toUpperCase()}</h2>
        <p>ABC Learning Centre Pte Ltd</p>
        <p>123 Main Street, Singapore 123456</p>
    </div>
    
    <div class="section">
        <h3>EMPLOYEE DETAILS</h3>
        <div class="row"><span>Name:</span><span>John Tan</span></div>
        <div class="row"><span>Employee ID:</span><span>EMP001</span></div>
        <div class="row"><span>NRIC/FIN:</span><span>S1234567A</span></div>
        <div class="row"><span>Department:</span><span>Engineering</span></div>
        <div class="row"><span>Position:</span><span>Senior Developer</span></div>
    </div>
    
    <div class="section">
        <h3>EARNINGS</h3>
        <div class="row"><span>Basic Salary</span><span>S$ 8,500.00</span></div>
        <div class="row"><span>Transport Allowance</span><span>S$ 200.00</span></div>
        <div class="row"><span>Meal Allowance</span><span>S$ 150.00</span></div>
        <div class="row total"><span>Gross Earnings</span><span>S$ 8,850.00</span></div>
    </div>
    
    <div class="section">
        <h3>DEDUCTIONS</h3>
        <div class="row"><span>Employee CPF (20%)</span><span>S$ 1,700.00</span></div>
        <div class="row"><span>Employer CPF (17%)</span><span>S$ 1,445.00</span></div>
        <div class="row"><span>Insurance</span><span>S$ 50.00</span></div>
        <div class="row total"><span>Total Deductions</span><span>S$ 1,750.00</span></div>
    </div>
    
    <div class="section">
        <div class="row total" style="font-size: 18px;"><span>NET PAY</span><span>S$ 7,100.00</span></div>
    </div>
    
    <div class="section">
        <h3>PAYMENT DETAILS</h3>
        <div class="row"><span>Bank:</span><span>DBS Bank</span></div>
        <div class="row"><span>Account Number:</span><span>1234-567890</span></div>
    </div>
    
    <div class="section" style="text-align: center; margin-top: 50px;">
        <p><em>This payslip is computer generated and does not require signature.</em></p>
        <p><em>For queries, please contact HR Department.</em></p>
    </div>
</body>
</html>
    `;

    // Create a blob with HTML content and simulate PDF download
    const blob = new Blob([pdfContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payslip-${month.replace(' ', '-').toLowerCase()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast(`Downloaded payslip for ${month} (HTML format - will display as PDF in browser)`);
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
                          onClick={() => generatePDF(run.month)}
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
