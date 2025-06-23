
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Eye, ArrowLeft, Edit } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const PaymentSummary = () => {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState('December 2024');

  const payrollData = [
    { month: 'December 2024', totalAmount: 245680, employees: 24, status: 'In Progress' },
    { month: 'November 2024', totalAmount: 248920, employees: 24, status: 'Completed' },
    { month: 'October 2024', totalAmount: 252100, employees: 24, status: 'Completed' },
  ];

  const handleEditPayroll = (month: string) => {
    navigate('/payroll-processing', { state: { month } });
  };

  const handleViewDetails = (month: string) => {
    setSelectedMonth(month);
    toast(`Viewing details for ${month}`);
  };

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
                <h2 className="text-2xl font-bold text-gray-900">Payment Summary</h2>
                <p className="text-gray-600">View payroll processing summary</p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Payroll Summary</CardTitle>
                <CardDescription>Overview of payroll processing for each month</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Employees</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollData.map((payroll) => (
                      <TableRow key={payroll.month}>
                        <TableCell className="font-medium">{payroll.month}</TableCell>
                        <TableCell>S${payroll.totalAmount.toLocaleString()}</TableCell>
                        <TableCell>{payroll.employees}</TableCell>
                        <TableCell>
                          <Badge variant={payroll.status === 'Completed' ? 'default' : 'secondary'}>
                            {payroll.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(payroll.month)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditPayroll(payroll.month)}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Details for {selectedMonth}</CardTitle>
                <CardDescription>Employee breakdown for the selected month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  Select a month above to view detailed breakdown
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PaymentSummary;
