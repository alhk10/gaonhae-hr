
import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Save, Check, ArrowLeft } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useNavigate } from 'react-router-dom';

interface Employee {
  id: string;
  name: string;
  department: string;
  currentSalary: number;
  nextIncrement: number;
  incrementDate: string;
  status: 'pending' | 'approved' | 'draft';
}

const IncrementPlanning = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([
    { id: 'EMP001', name: 'John Tan', department: 'Engineering', currentSalary: 8500, nextIncrement: 9000, incrementDate: '2025-01-01', status: 'draft' },
    { id: 'EMP002', name: 'Mary Ng', department: 'Marketing', currentSalary: 7200, nextIncrement: 7600, incrementDate: '2025-02-01', status: 'pending' },
    { id: 'EMP003', name: 'David Lim', department: 'HR', currentSalary: 6800, nextIncrement: 7200, incrementDate: '2025-03-01', status: 'approved' },
  ]);

  const handleSalaryChange = (id: string, field: 'nextIncrement' | 'incrementDate', value: string | number) => {
    setEmployees(prev => 
      prev.map(emp => 
        emp.id === id 
          ? { ...emp, [field]: value, status: 'draft' as const }
          : emp
      )
    );
  };

  const handleSaveDraft = () => {
    toast("Draft saved successfully");
  };

  const handleApproveIncrement = (id: string) => {
    setEmployees(prev => 
      prev.map(emp => 
        emp.id === id 
          ? { ...emp, status: 'approved' }
          : emp
      )
    );
    // Update employee details with new increment
    toast(`Increment approved for employee ${id}. Employee details updated.`);
  };

  const handleApproveAll = () => {
    setEmployees(prev => 
      prev.map(emp => ({ ...emp, status: 'approved' as const }))
    );
    toast("All increments approved successfully. Employee details updated.");
  };

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
                  <h2 className="text-2xl font-bold text-gray-900">Increment Planning</h2>
                  <p className="text-gray-600">Plan and approve salary increments for employees</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={handleSaveDraft}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Draft
                </Button>
                <Button onClick={handleApproveAll}>
                  <Check className="w-4 h-4 mr-2" />
                  Approve All
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>Employee Increment Planning</span>
                </CardTitle>
                <CardDescription>Review and update salary increments for all employees</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
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
                        <TableCell>{employee.department}</TableCell>
                        <TableCell>S${employee.currentSalary.toLocaleString()}</TableCell>
                        <TableCell>
                          <input
                            type="number"
                            value={employee.nextIncrement}
                            onChange={(e) => handleSalaryChange(employee.id, 'nextIncrement', parseInt(e.target.value))}
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
                          <Badge variant={
                            employee.status === 'approved' ? 'default' :
                            employee.status === 'pending' ? 'secondary' : 'outline'
                          }>
                            {employee.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {employee.status !== 'approved' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleApproveIncrement(employee.id)}
                            >
                              Approve
                            </Button>
                          )}
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

export default IncrementPlanning;
