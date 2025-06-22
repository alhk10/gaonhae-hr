
import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Download, Calendar } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const Payslips = () => {
  const handleDownloadPayslip = (month: string) => {
    // Simulate file download
    const element = document.createElement('a');
    const file = new Blob([`Payslip - ${month}\nEmployee: Tan Wei Ming\nSalary: S$8,500`], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `payslip-${month.replace(' ', '-').toLowerCase()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    toast(`Downloaded payslip for ${month}`);
  };

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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Current Month Salary</p>
                      <p className="text-2xl font-bold text-gray-900">S$8,500</p>
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
                      <p className="text-2xl font-bold text-gray-900">S$102,000</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">CPF Contributions (Year)</p>
                      <p className="text-2xl font-bold text-gray-900">S$35,700</p>
                    </div>
                    <Calendar className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Payslip History</CardTitle>
                <CardDescription>Download your payslips for the past months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { month: 'December 2024', amount: 'S$8,500', date: '2024-12-31' },
                    { month: 'November 2024', amount: 'S$8,500', date: '2024-11-30' },
                    { month: 'October 2024', amount: 'S$8,500', date: '2024-10-31' },
                    { month: 'September 2024', amount: 'S$8,500', date: '2024-09-30' },
                  ].map((payslip, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{payslip.month}</p>
                        <p className="text-sm text-gray-600">{payslip.amount} • {payslip.date}</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDownloadPayslip(payslip.month)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
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
