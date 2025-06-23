
import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calculator, Users, DollarSign, Edit, Eye, Download, Settings } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const Payroll = () => {
  const [selectedMonth, setSelectedMonth] = useState('2024-12');
  const [selectedYear, setSelectedYear] = useState('2024');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  const [payrollData, setPayrollData] = useState([
    {
      id: 'EMP001',
      name: 'John Tan',
      department: 'Engineering',
      position: 'Senior Developer',
      basicSalary: 4500,
      allowances: 300,
      overtime: 150,
      deductions: 200,
      cpf: 810,
      netPay: 4750,
      status: 'Processed'
    },
    {
      id: 'EMP002',
      name: 'Mary Ng',
      department: 'Marketing',
      position: 'Marketing Manager',
      basicSalary: 4000,
      allowances: 250,
      overtime: 0,
      deductions: 150,
      cpf: 765,
      netPay: 4335,
      status: 'Processed'
    },
    {
      id: 'EMP003',
      name: 'David Lim',
      department: 'Sales',
      position: 'Sales Executive',
      basicSalary: 3800,
      allowances: 200,
      overtime: 100,
      deductions: 180,
      cpf: 738,
      netPay: 4182,
      status: 'Pending'
    }
  ]);

  const totalEmployees = payrollData.length;
  const totalGrossPay = payrollData.reduce((sum, emp) => sum + emp.basicSalary + emp.allowances + emp.overtime, 0);
  const totalNetPay = payrollData.reduce((sum, emp) => sum + emp.netPay, 0);
  const totalDeductions = payrollData.reduce((sum, emp) => sum + emp.deductions + emp.cpf, 0);

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee);
    setIsEditModalOpen(true);
  };

  const handleSaveEmployee = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const updatedEmployee = {
      ...editingEmployee,
      basicSalary: parseFloat(formData.get('basicSalary')),
      allowances: parseFloat(formData.get('allowances')) || 0,
      overtime: parseFloat(formData.get('overtime')) || 0,
      deductions: parseFloat(formData.get('deductions')) || 0,
    };

    // Recalculate CPF and Net Pay
    const grossPay = updatedEmployee.basicSalary + updatedEmployee.allowances + updatedEmployee.overtime;
    updatedEmployee.cpf = grossPay * 0.17; // 17% CPF (simplified calculation)
    updatedEmployee.netPay = grossPay - updatedEmployee.deductions - updatedEmployee.cpf;

    setPayrollData(prev => prev.map(emp => 
      emp.id === editingEmployee.id ? updatedEmployee : emp
    ));

    setIsEditModalOpen(false);
    setEditingEmployee(null);
    toast('Employee payroll updated successfully');
  };

  const monthYearOptions = [
    { value: '2024-12', label: 'December 2024' },
    { value: '2024-11', label: 'November 2024' },
    { value: '2024-10', label: 'October 2024' },
    { value: '2024-09', label: 'September 2024' },
    { value: '2024-08', label: 'August 2024' },
    { value: '2024-07', label: 'July 2024' },
    { value: '2024-06', label: 'June 2024' },
    { value: '2024-05', label: 'May 2024' },
    { value: '2024-04', label: 'April 2024' },
    { value: '2024-03', label: 'March 2024' },
    { value: '2024-02', label: 'February 2024' },
    { value: '2024-01', label: 'January 2024' },
  ];

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
                <p className="text-gray-600">Manage employee payroll and salary information</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="month-select" className="text-sm font-medium">
                    Payroll Period:
                  </Label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthYearOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalEmployees}</div>
                  <p className="text-xs text-muted-foreground">
                    Active employees
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Gross Pay</CardTitle>
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">S${totalGrossPay.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    Before deductions
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Deductions</CardTitle>
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">S${totalDeductions.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    CPF + Other deductions
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Net Pay</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">S${totalNetPay.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    Total payout
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Payroll Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calculator className="w-5 h-5" />
                  <span>Payroll Summary - {monthYearOptions.find(opt => opt.value === selectedMonth)?.label}</span>
                </CardTitle>
                <CardDescription>Detailed payroll breakdown for all employees</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Basic Salary</TableHead>
                      <TableHead>Allowances</TableHead>
                      <TableHead>Overtime</TableHead>
                      <TableHead>Deductions</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Net Pay</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollData.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{employee.name}</div>
                            <div className="text-sm text-gray-500">{employee.position}</div>
                          </div>
                        </TableCell>
                        <TableCell>{employee.department}</TableCell>
                        <TableCell>S${employee.basicSalary.toFixed(2)}</TableCell>
                        <TableCell>S${employee.allowances.toFixed(2)}</TableCell>
                        <TableCell>S${employee.overtime.toFixed(2)}</TableCell>
                        <TableCell>S${employee.deductions.toFixed(2)}</TableCell>
                        <TableCell>S${employee.cpf.toFixed(2)}</TableCell>
                        <TableCell className="font-medium">S${employee.netPay.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={employee.status === 'Processed' ? 'default' : 'secondary'}>
                            {employee.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditEmployee(employee)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Edit Employee Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Employee Payroll</DialogTitle>
                  <DialogDescription>
                    Update payroll information for {editingEmployee?.name}
                  </DialogDescription>
                </DialogHeader>
                {editingEmployee && (
                  <form onSubmit={handleSaveEmployee}>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="basicSalary">Basic Salary (S$)</Label>
                        <Input 
                          name="basicSalary" 
                          type="number" 
                          step="0.01"
                          defaultValue={editingEmployee.basicSalary}
                          required 
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="allowances">Allowances (S$)</Label>
                        <Input 
                          name="allowances" 
                          type="number" 
                          step="0.01"
                          defaultValue={editingEmployee.allowances}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="overtime">Overtime (S$)</Label>
                        <Input 
                          name="overtime" 
                          type="number" 
                          step="0.01"
                          defaultValue={editingEmployee.overtime}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="deductions">Other Deductions (S$)</Label>
                        <Input 
                          name="deductions" 
                          type="number" 
                          step="0.01"
                          defaultValue={editingEmployee.deductions}
                        />
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>CPF will be calculated automatically (17% of gross pay)</p>
                        <p>Net pay will be updated based on your changes</p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Save Changes</Button>
                    </DialogFooter>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Payroll;
