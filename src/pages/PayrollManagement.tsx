
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Calendar, Plus, Edit, Eye, Trash2, Download } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useForm } from 'react-hook-form';

interface PayrollPeriod {
  id: string;
  periodName: string;
  startDate: string;
  endDate: string;
  payDate: string;
  status: 'draft' | 'processing' | 'approved' | 'paid' | 'completed';
  totalAmount: number;
  employeeCount: number;
  createdAt: string;
}

const PayrollManagement = () => {
  const navigate = useNavigate();
  const [payrollPeriods, setPayrollPeriods] = useState<PayrollPeriod[]>([
    {
      id: 'PAY001',
      periodName: 'December 2024',
      startDate: '2024-12-01',
      endDate: '2024-12-31',
      payDate: '2024-12-31',
      status: 'processing',
      totalAmount: 45540,
      employeeCount: 6,
      createdAt: '2024-12-01'
    },
    {
      id: 'PAY002',
      periodName: 'November 2024',
      startDate: '2024-11-01',
      endDate: '2024-11-30',
      payDate: '2024-11-30',
      status: 'completed',
      totalAmount: 43200,
      employeeCount: 5,
      createdAt: '2024-11-01'
    },
    {
      id: 'PAY003',
      periodName: 'October 2024',
      startDate: '2024-10-01',
      endDate: '2024-10-31',
      payDate: '2024-10-31',
      status: 'completed',
      totalAmount: 41800,
      employeeCount: 5,
      createdAt: '2024-10-01'
    }
  ]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState<PayrollPeriod | null>(null);

  const form = useForm({
    defaultValues: {
      periodName: '',
      startDate: '',
      endDate: '',
      payDate: ''
    }
  });

  const handleCreatePayroll = (data: any) => {
    const newPayroll: PayrollPeriod = {
      id: `PAY${String(payrollPeriods.length + 1).padStart(3, '0')}`,
      periodName: data.periodName,
      startDate: data.startDate,
      endDate: data.endDate,
      payDate: data.payDate,
      status: 'draft',
      totalAmount: 0,
      employeeCount: 0,
      createdAt: new Date().toISOString().split('T')[0]
    };

    setPayrollPeriods(prev => [newPayroll, ...prev]);
    setIsDialogOpen(false);
    form.reset();
    toast("New payroll period created successfully");
  };

  const handleEditPayroll = (payroll: PayrollPeriod) => {
    setEditingPayroll(payroll);
    form.setValue('periodName', payroll.periodName);
    form.setValue('startDate', payroll.startDate);
    form.setValue('endDate', payroll.endDate);
    form.setValue('payDate', payroll.payDate);
    setIsDialogOpen(true);
  };

  const handleUpdatePayroll = (data: any) => {
    if (editingPayroll) {
      setPayrollPeriods(prev => prev.map(p => 
        p.id === editingPayroll.id 
          ? { ...p, ...data }
          : p
      ));
      setIsDialogOpen(false);
      setEditingPayroll(null);
      form.reset();
      toast("Payroll period updated successfully");
    }
  };

  const handleDeletePayroll = (id: string) => {
    setPayrollPeriods(prev => prev.filter(p => p.id !== id));
    toast("Payroll period deleted successfully");
  };

  const handleViewPayroll = (payrollId: string) => {
    navigate(`/payment-summary?period=${payrollId}`);
  };

  const handleProcessPayroll = (payrollId: string) => {
    navigate(`/payroll-processing?period=${payrollId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'processing': return 'default';
      case 'approved': return 'default';
      case 'paid': return 'default';
      case 'completed': return 'default';
      default: return 'secondary';
    }
  };

  const onSubmit = (data: any) => {
    if (editingPayroll) {
      handleUpdatePayroll(data);
    } else {
      handleCreatePayroll(data);
    }
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
                <p className="text-gray-600">Create and manage payroll periods</p>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center space-x-2" onClick={() => {
                    setEditingPayroll(null);
                    form.reset();
                  }}>
                    <Plus className="w-4 h-4" />
                    <span>New Payroll Period</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingPayroll ? 'Edit Payroll Period' : 'Create New Payroll Period'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingPayroll ? 'Update the payroll period details' : 'Set up a new payroll period for processing'}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="periodName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Period Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., January 2025" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="payDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pay Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">
                          {editingPayroll ? 'Update' : 'Create'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5" />
                  <span>Payroll Periods</span>
                </CardTitle>
                <CardDescription>Manage all payroll periods and their processing status</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Pay Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Employees</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollPeriods.map((payroll) => (
                      <TableRow key={payroll.id}>
                        <TableCell className="font-medium">{payroll.periodName}</TableCell>
                        <TableCell>{payroll.startDate}</TableCell>
                        <TableCell>{payroll.endDate}</TableCell>
                        <TableCell>{payroll.payDate}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(payroll.status)}>
                            {payroll.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{payroll.employeeCount}</TableCell>
                        <TableCell>S${payroll.totalAmount.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewPayroll(payroll.id)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditPayroll(payroll)}
                              disabled={payroll.status === 'completed'}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {payroll.status === 'draft' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleProcessPayroll(payroll.id)}
                              >
                                Process
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeletePayroll(payroll.id)}
                              disabled={payroll.status !== 'draft'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PayrollManagement;
