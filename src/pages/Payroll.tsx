
import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, Download, FileText, Plus, Calendar } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const Payroll = () => {
  const [payrollRuns, setPayrollRuns] = useState([
    { id: 1, month: 'December 2024', status: 'Completed', employees: 15, total: 45000, date: '2024-12-01', type: 'Full-Time' },
    { id: 2, month: 'November 2024', status: 'Completed', employees: 15, total: 44500, date: '2024-11-01', type: 'Full-Time' },
    { id: 3, month: 'December 2024', status: 'Completed', employees: 8, total: 12000, date: '2024-12-01', type: 'Casual' },
    { id: 4, month: 'November 2024', status: 'Completed', employees: 8, total: 11500, date: '2024-11-01', type: 'Casual' },
  ]);

  const [isNewPayrollOpen, setIsNewPayrollOpen] = useState(false);

  const handleDownloadPDF = (id) => {
    // Create a simple PDF content
    const pdfContent = `
      PAYROLL SUMMARY REPORT
      
      Payroll Run ID: ${id}
      Generated: ${new Date().toLocaleDateString()}
      
      This is a sample PDF download for payroll run ${id}.
      In a real implementation, this would contain detailed payroll information.
    `;
    
    const blob = new Blob([pdfContent], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-run-${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast("PDF downloaded successfully");
  };

  const handleNewPayroll = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newPayroll = {
      id: Date.now(),
      month: formData.get('month') as string,
      status: 'Processing',
      employees: parseInt(formData.get('employees') as string),
      total: parseFloat(formData.get('total') as string),
      date: new Date().toISOString().split('T')[0],
      type: formData.get('type') as string
    };
    setPayrollRuns(prev => [newPayroll, ...prev]);
    setIsNewPayrollOpen(false);
    toast("New payroll run created");
  };

  const fullTimeRuns = payrollRuns.filter(run => run.type === 'Full-Time');
  const casualRuns = payrollRuns.filter(run => run.type === 'Casual');

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
                <p className="text-gray-600">Manage employee payroll and generate reports</p>
              </div>
              <Dialog open={isNewPayrollOpen} onOpenChange={setIsNewPayrollOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    New Payroll Run
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>New Payroll Run</DialogTitle>
                    <DialogDescription>Create a new payroll processing run.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleNewPayroll}>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="month">Month/Year</Label>
                        <Input name="month" placeholder="e.g., January 2024" required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="type">Employee Type</Label>
                        <Select name="type" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select employee type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Full-Time">Full-Time</SelectItem>
                            <SelectItem value="Casual">Casual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="employees">Number of Employees</Label>
                        <Input name="employees" type="number" placeholder="15" required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="total">Total Amount (S$)</Label>
                        <Input name="total" type="number" step="0.01" placeholder="45000.00" required />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsNewPayrollOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Create Payroll Run</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Total Employees</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">23</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>This Month's Payroll</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">S$57,000</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Processing Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="default">Completed</Badge>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Next Due Date</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">Jan 2</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5" />
                  <span>Payroll Summary</span>
                </CardTitle>
                <CardDescription>Recent payroll runs and processing history</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="full-time" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="full-time">Full-Time Employees</TabsTrigger>
                    <TabsTrigger value="casual">Casual Employees</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="full-time" className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Month</TableHead>
                          <TableHead>Employees</TableHead>
                          <TableHead>Total Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fullTimeRuns.map((run) => (
                          <TableRow key={run.id}>
                            <TableCell className="font-medium">{run.month}</TableCell>
                            <TableCell>{run.employees}</TableCell>
                            <TableCell>S${run.total.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant={run.status === 'Completed' ? 'default' : 'secondary'}>
                                {run.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button variant="outline" size="sm">
                                  <FileText className="w-4 h-4 mr-1" />
                                  View
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleDownloadPDF(run.id)}>
                                  <Download className="w-4 h-4 mr-1" />
                                  PDF
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>
                  
                  <TabsContent value="casual" className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Month</TableHead>
                          <TableHead>Employees</TableHead>
                          <TableHead>Total Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {casualRuns.map((run) => (
                          <TableRow key={run.id}>
                            <TableCell className="font-medium">{run.month}</TableCell>
                            <TableCell>{run.employees}</TableCell>
                            <TableCell>S${run.total.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant={run.status === 'Completed' ? 'default' : 'secondary'}>
                                {run.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button variant="outline" size="sm">
                                  <FileText className="w-4 h-4 mr-1" />
                                  View
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleDownloadPDF(run.id)}>
                                  <Download className="w-4 h-4 mr-1" />
                                  PDF
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Payroll;
