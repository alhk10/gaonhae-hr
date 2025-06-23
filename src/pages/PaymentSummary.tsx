
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, ArrowLeft, Edit, Plus } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const PaymentSummary = () => {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState('December 2024');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newMonth, setNewMonth] = useState('');
  const [newYear, setNewYear] = useState('2024');

  const [payrollData, setPayrollData] = useState([
    { month: 'December 2024', totalAmount: 245680, employees: 24, status: 'In Progress' },
    { month: 'November 2024', totalAmount: 248920, employees: 24, status: 'Completed' },
    { month: 'October 2024', totalAmount: 252100, employees: 24, status: 'Completed' },
  ]);

  const handleEditPayroll = (month: string) => {
    navigate('/payroll-processing', { state: { month } });
  };

  const handleViewDetails = (month: string) => {
    setSelectedMonth(month);
    toast(`Viewing details for ${month}`);
  };

  const handleAddMonth = () => {
    if (!newMonth || !newYear) {
      toast('Please select both month and year');
      return;
    }

    const monthYear = `${newMonth} ${newYear}`;
    
    // Check if month already exists
    if (payrollData.some(item => item.month === monthYear)) {
      toast('This month already exists');
      return;
    }

    const newPayrollEntry = {
      month: monthYear,
      totalAmount: 0,
      employees: 24,
      status: 'Draft'
    };

    setPayrollData([newPayrollEntry, ...payrollData]);
    setIsAddDialogOpen(false);
    setNewMonth('');
    setNewYear('2024');
    toast(`Added ${monthYear} to payroll summary`);
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = ['2024', '2025', '2026'];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
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
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Month
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Month</DialogTitle>
                    <DialogDescription>
                      Add a new month to the payroll summary.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="month">Month</Label>
                      <Select value={newMonth} onValueChange={setNewMonth}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select month" />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((month) => (
                            <SelectItem key={month} value={month}>
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="year">Year</Label>
                      <Select value={newYear} onValueChange={setNewYear}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((year) => (
                            <SelectItem key={year} value={year}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddMonth}>
                      Add Month
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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
                          <Badge 
                            variant={
                              payroll.status === 'Completed' ? 'default' : 
                              payroll.status === 'In Progress' ? 'secondary' : 
                              'outline'
                            }
                          >
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
