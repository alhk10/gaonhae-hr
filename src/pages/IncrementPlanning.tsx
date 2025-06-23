
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Save, Check, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

interface Employee {
  id: string;
  name: string;
  currentSalary: number;
  nextIncrement: number;
  incrementDate: string;
  status: 'draft' | 'approved';
}

const IncrementPlanning = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([
    { id: 'EMP001', name: 'John Tan', currentSalary: 8500, nextIncrement: 9000, incrementDate: '2025-01-01', status: 'draft' },
    { id: 'EMP002', name: 'Mary Ng', currentSalary: 7200, nextIncrement: 7800, incrementDate: '2025-02-01', status: 'draft' },
  ]);

  const [availableEmployees] = useState([
    { id: 'EMP003', name: 'David Lim', currentSalary: 6500 },
    { id: 'EMP004', name: 'Sarah Loh', currentSalary: 7000 },
  ]);

  const handleSalaryChange = (employeeId: string, field: 'nextIncrement' | 'incrementDate', value: string | number) => {
    setEmployees(prev => prev.map(emp => 
      emp.id === employeeId 
        ? { ...emp, [field]: value }
        : emp
    ));
  };

  const addEmployee = (employeeId: string) => {
    const employee = availableEmployees.find(emp => emp.id === employeeId);
    if (employee) {
      const newEmployee: Employee = {
        id: employee.id,
        name: employee.name,
        currentSalary: employee.currentSalary,
        nextIncrement: employee.currentSalary + 500,
        incrementDate: '2025-01-01',
        status: 'draft'
      };
      setEmployees(prev => [...prev, newEmployee]);
      toast(`Added ${employee.name} to increment planning`);
    }
  };

  const removeEmployee = (employeeId: string) => {
    setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
    toast("Employee removed from increment planning");
  };

  const handleSaveDraft = () => {
    toast("Increment planning draft saved successfully");
  };

  const handleApprove = () => {
    setEmployees(prev => prev.map(emp => ({ ...emp, status: 'approved' as const })));
    toast("Increment planning approved. Employee details will be updated.");
    // This would normally update the employee details in a real application
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
                <h2 className="text-2xl font-bold text-gray-900">Increment Planning</h2>
                <p className="text-gray-600">Plan salary increments for employees</p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>Salary Increment Planning</span>
                </CardTitle>
                <CardDescription>Review and approve salary increments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <h3 className="text-lg font-medium mb-2">Add Employees</h3>
                  <div className="flex flex-wrap gap-2">
                    {availableEmployees
                      .filter(emp => !employees.find(e => e.id === emp.id))
                      .map((employee) => (
                      <Button
                        key={employee.id}
                        variant="outline"
                        size="sm"
                        onClick={() => addEmployee(employee.id)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {employee.name}
                      </Button>
                    ))}
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee Name</TableHead>
                      <TableHead>Current Salary</TableHead>
                      <TableHead>Next Increment</TableHead>
                      <TableHead>Increment Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">{employee.name}</TableCell>
                        <TableCell>S${employee.currentSalary.toLocaleString()}</TableCell>
                        <TableCell>
                          <input
                            type="number"
                            value={employee.nextIncrement}
                            onChange={(e) => handleSalaryChange(employee.id, 'nextIncrement', Number(e.target.value))}
                            className="w-24 p-1 border border-gray-300 rounded"
                            disabled={employee.status === 'approved'}
                          />
                        </TableCell>
                        <TableCell>
                          <input
                            type="date"
                            value={employee.incrementDate}
                            onChange={(e) => handleSalaryChange(employee.id, 'incrementDate', e.target.value)}
                            className="p-1 border border-gray-300 rounded"
                            disabled={employee.status === 'approved'}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge variant={employee.status === 'approved' ? 'default' : 'secondary'}>
                            {employee.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {employee.status === 'draft' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeEmployee(employee.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex justify-end space-x-2 mt-4">
                  <Button variant="outline" onClick={handleSaveDraft}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Draft
                  </Button>
                  <Button onClick={handleApprove}>
                    <Check className="w-4 h-4 mr-2" />
                    Approve Planning
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default IncrementPlanning;
