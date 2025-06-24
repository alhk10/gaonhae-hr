import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DollarSign, Calendar, Play, ArrowLeft, Users, Clock, Edit, Save, X } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

interface Employee {
  id: string;
  name: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: string;
}

interface CasualEmployee {
  id: string;
  name: string;
  hourlyRate: number;
  hoursWorked: number;
  totalPay: number;
  status: string;
}

const PaymentSummary = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const periodId = searchParams.get('period');

  const [fullTimeEmployees, setFullTimeEmployees] = useState<Employee[]>([
    { id: 'EMP001', name: 'John Tan', basicSalary: 8500, allowances: 350, deductions: 100, netSalary: 7100, status: 'Pending' },
    { id: 'EMP002', name: 'Mary Ng', basicSalary: 7200, allowances: 200, deductions: 50, netSalary: 6200, status: 'Pending' },
    { id: 'EMP003', name: 'David Lim', basicSalary: 6800, allowances: 250, deductions: 75, netSalary: 5900, status: 'Pending' },
  ]);

  const [casualEmployees, setCasualEmployees] = useState<CasualEmployee[]>([
    { id: 'CAS001', name: 'Alice Wong', hourlyRate: 25, hoursWorked: 120, totalPay: 3000, status: 'Pending' },
    { id: 'CAS002', name: 'Bob Chen', hourlyRate: 22, hoursWorked: 100, totalPay: 2200, status: 'Pending' },
    { id: 'CAS003', name: 'Sarah Lee', hourlyRate: 28, hoursWorked: 80, totalPay: 2240, status: 'Pending' },
  ]);

  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editingCasual, setEditingCasual] = useState<CasualEmployee | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleProcessPayroll = () => {
    const queryParam = periodId ? `?period=${periodId}` : '';
    navigate(`/payroll-processing${queryParam}`);
  };

  const handleEmployeeDetails = (employeeId: string) => {
    navigate(`/employees/${employeeId}`);
  };

  const handleEditFullTimeEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setEditingCasual(null);
    setIsEditDialogOpen(true);
  };

  const handleEditCasualEmployee = (employee: CasualEmployee) => {
    setEditingCasual(employee);
    setEditingEmployee(null);
    setIsEditDialogOpen(true);
  };

  const handleSaveFullTimeEmployee = () => {
    if (editingEmployee) {
      const netSalary = editingEmployee.basicSalary + editingEmployee.allowances - editingEmployee.deductions;
      const updatedEmployee = { ...editingEmployee, netSalary };
      
      setFullTimeEmployees(prev => prev.map(emp => 
        emp.id === editingEmployee.id ? updatedEmployee : emp
      ));
      setIsEditDialogOpen(false);
      setEditingEmployee(null);
      toast("Employee payroll updated successfully");
    }
  };

  const handleSaveCasualEmployee = () => {
    if (editingCasual) {
      const totalPay = editingCasual.hourlyRate * editingCasual.hoursWorked;
      const updatedEmployee = { ...editingCasual, totalPay };
      
      setCasualEmployees(prev => prev.map(emp => 
        emp.id === editingCasual.id ? updatedEmployee : emp
      ));
      setIsEditDialogOpen(false);
      setEditingCasual(null);
      toast("Casual employee payroll updated successfully");
    }
  };

  const totalFullTimeAmount = fullTimeEmployees.reduce((sum, emp) => sum + emp.netSalary, 0);
  const totalCasualAmount = casualEmployees.reduce((sum, emp) => sum + emp.totalPay, 0);

  const currentPeriod = periodId ? `Payroll Period ${periodId}` : 'December 2024';

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
                  <h2 className="text-2xl font-bold text-gray-900">Monthly Payroll Summary</h2>
                  <p className="text-gray-600">{currentPeriod} payroll overview</p>
                </div>
              </div>
              <Button className="flex items-center space-x-2" onClick={handleProcessPayroll}>
                <Play className="w-4 h-4" />
                <span>Process Payroll</span>
              </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Full-Time</p>
                      <p className="text-2xl font-bold text-gray-900">S${totalFullTimeAmount.toLocaleString()}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Casual</p>
                      <p className="text-2xl font-bold text-gray-900">S${totalCasualAmount.toLocaleString()}</p>
                    </div>
                    <Clock className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Amount</p>
                      <p className="text-2xl font-bold text-gray-900">S${(totalFullTimeAmount + totalCasualAmount).toLocaleString()}</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Processing Date</p>
                      <p className="text-2xl font-bold text-gray-900">Dec 31</p>
                    </div>
                    <Calendar className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="fulltime" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="fulltime">Full-Time Employees</TabsTrigger>
                <TabsTrigger value="casual">Casual Employees</TabsTrigger>
              </TabsList>

              <TabsContent value="fulltime">
                <Card>
                  <CardHeader>
                    <CardTitle>Full-Time Employee Payroll</CardTitle>
                    <CardDescription>Monthly salary summary for full-time employees</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee Name</TableHead>
                          <TableHead>Employee ID</TableHead>
                          <TableHead>Basic Salary</TableHead>
                          <TableHead>Allowances</TableHead>
                          <TableHead>Deductions</TableHead>
                          <TableHead>Net Salary</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fullTimeEmployees.map((employee) => (
                          <TableRow key={employee.id}>
                            <TableCell className="font-medium">{employee.name}</TableCell>
                            <TableCell>{employee.id}</TableCell>
                            <TableCell>S${employee.basicSalary.toLocaleString()}</TableCell>
                            <TableCell>S${employee.allowances}</TableCell>
                            <TableCell>S${employee.deductions}</TableCell>
                            <TableCell className="font-bold">S${employee.netSalary.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{employee.status}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleEmployeeDetails(employee.id)}
                                >
                                  View Details
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleEditFullTimeEmployee(employee)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="casual">
                <Card>
                  <CardHeader>
                    <CardTitle>Casual Employee Payroll</CardTitle>
                    <CardDescription>Monthly payment summary for casual employees</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee Name</TableHead>
                          <TableHead>Employee ID</TableHead>
                          <TableHead>Hourly Rate</TableHead>
                          <TableHead>Hours Worked</TableHead>
                          <TableHead>Total Pay</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {casualEmployees.map((employee) => (
                          <TableRow key={employee.id}>
                            <TableCell className="font-medium">{employee.name}</TableCell>
                            <TableCell>{employee.id}</TableCell>
                            <TableCell>S${employee.hourlyRate}/hr</TableCell>
                            <TableCell>{employee.hoursWorked}h</TableCell>
                            <TableCell className="font-bold">S${employee.totalPay.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{employee.status}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleEmployeeDetails(employee.id)}
                                >
                                  View Details
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleEditCasualEmployee(employee)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Edit Employee Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>
                    Edit {editingEmployee ? 'Full-Time' : 'Casual'} Employee Payroll
                  </DialogTitle>
                  <DialogDescription>
                    Update the payroll details for {editingEmployee?.name || editingCasual?.name}
                  </DialogDescription>
                </DialogHeader>
                
                {editingEmployee && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Basic Salary</label>
                      <Input
                        type="number"
                        value={editingEmployee.basicSalary}
                        onChange={(e) => setEditingEmployee({
                          ...editingEmployee,
                          basicSalary: parseFloat(e.target.value) || 0
                        })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Allowances</label>
                      <Input
                        type="number"
                        value={editingEmployee.allowances}
                        onChange={(e) => setEditingEmployee({
                          ...editingEmployee,
                          allowances: parseFloat(e.target.value) || 0
                        })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Deductions</label>
                      <Input
                        type="number"
                        value={editingEmployee.deductions}
                        onChange={(e) => setEditingEmployee({
                          ...editingEmployee,
                          deductions: parseFloat(e.target.value) || 0
                        })}
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                      <Button onClick={handleSaveFullTimeEmployee}>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  </div>
                )}

                {editingCasual && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Hourly Rate</label>
                      <Input
                        type="number"
                        value={editingCasual.hourlyRate}
                        onChange={(e) => setEditingCasual({
                          ...editingCasual,
                          hourlyRate: parseFloat(e.target.value) || 0
                        })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Hours Worked</label>
                      <Input
                        type="number"
                        value={editingCasual.hoursWorked}
                        onChange={(e) => setEditingCasual({
                          ...editingCasual,
                          hoursWorked: parseFloat(e.target.value) || 0
                        })}
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                      <Button onClick={handleSaveCasualEmployee}>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PaymentSummary;
