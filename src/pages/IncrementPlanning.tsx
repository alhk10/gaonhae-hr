
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Trash2, Check } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { getEmployees } from '@/services/employeeService';
import { EmployeeProfile } from '@/types/employee';

interface IncrementPlan {
  employeeId: string;
  employeeName: string;
  currentSalary: number;
  nextIncrement: number;
  incrementDate: string;
  status: 'draft' | 'approved';
}

const IncrementPlanning = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [incrementPlans, setIncrementPlans] = useState<IncrementPlan[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setIsLoading(true);
      const employeeData = await getEmployees();
      
      // Filter only full-time employees with salaries
      const fullTimeEmployees = employeeData.filter(emp => 
        emp.type === 'Full-Time' && emp.baseSalary && emp.baseSalary > 0
      );
      
      setEmployees(fullTimeEmployees);
      
      // Initialize with some sample increment plans
      const samplePlans: IncrementPlan[] = fullTimeEmployees.slice(0, 2).map(emp => ({
        employeeId: emp.id,
        employeeName: emp.name,
        currentSalary: emp.baseSalary || 0,
        nextIncrement: Math.round((emp.baseSalary || 0) * 0.1), // 10% increment
        incrementDate: '2025-01-01',
        status: 'draft'
      }));
      
      setIncrementPlans(samplePlans);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast("Error loading employee data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEmployee = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return;

    const existingPlan = incrementPlans.find(plan => plan.employeeId === employeeId);
    if (existingPlan) {
      toast("Employee already added to increment planning");
      return;
    }

    const newPlan: IncrementPlan = {
      employeeId: employee.id,
      employeeName: employee.name,
      currentSalary: employee.baseSalary || 0,
      nextIncrement: Math.round((employee.baseSalary || 0) * 0.1),
      incrementDate: '2025-01-01',
      status: 'draft'
    };

    setIncrementPlans([...incrementPlans, newPlan]);
    toast(`Added ${employee.name} to increment planning`);
  };

  const handleRemovePlan = (employeeId: string) => {
    setIncrementPlans(incrementPlans.filter(plan => plan.employeeId !== employeeId));
    toast("Removed from increment planning");
  };

  const handleIncrementChange = (employeeId: string, newIncrement: number) => {
    setIncrementPlans(incrementPlans.map(plan => 
      plan.employeeId === employeeId 
        ? { ...plan, nextIncrement: newIncrement }
        : plan
    ));
  };

  const handleDateChange = (employeeId: string, newDate: string) => {
    setIncrementPlans(incrementPlans.map(plan => 
      plan.employeeId === employeeId 
        ? { ...plan, incrementDate: newDate }
        : plan
    ));
  };

  const handleSaveDraft = () => {
    toast("Increment planning saved as draft");
  };

  const handleApprove = () => {
    setIncrementPlans(incrementPlans.map(plan => ({ ...plan, status: 'approved' })));
    toast("Salary increment planning approved successfully");
  };

  const availableEmployees = employees.filter(emp => 
    !incrementPlans.some(plan => plan.employeeId === emp.id)
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading employee data...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" onClick={() => navigate('/payroll')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Payroll
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Increment Planning</h1>
                  <p className="text-gray-600">Plan salary increments for employees</p>
                </div>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>Salary Increment Planning</span>
                </CardTitle>
                <CardDescription>Review and approve salary increments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <h3 className="text-lg font-medium mb-3">Add Employees</h3>
                  <div className="flex flex-wrap gap-2">
                    {availableEmployees.map(employee => (
                      <Button
                        key={employee.id}
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddEmployee(employee.id)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
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
                    {incrementPlans.length > 0 ? (
                      incrementPlans.map((plan) => (
                        <TableRow key={plan.employeeId}>
                          <TableCell className="font-medium">{plan.employeeName}</TableCell>
                          <TableCell>S${plan.currentSalary.toLocaleString()}</TableCell>
                          <TableCell>
                            <input
                              type="number"
                              value={plan.nextIncrement}
                              onChange={(e) => handleIncrementChange(plan.employeeId, Number(e.target.value))}
                              className="w-24 p-1 border rounded text-center"
                              min="0"
                            />
                          </TableCell>
                          <TableCell>
                            <input
                              type="date"
                              value={plan.incrementDate}
                              onChange={(e) => handleDateChange(plan.employeeId, e.target.value)}
                              className="p-1 border rounded"
                            />
                          </TableCell>
                          <TableCell>
                            <Badge variant={plan.status === 'approved' ? 'default' : 'secondary'}>
                              {plan.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemovePlan(plan.employeeId)}
                              disabled={plan.status === 'approved'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-500">
                          No increment plans created yet. Add employees to start planning.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {incrementPlans.length > 0 && (
                  <div className="flex justify-end space-x-3 mt-6">
                    <Button 
                      variant="outline" 
                      onClick={handleSaveDraft}
                      disabled={incrementPlans.every(plan => plan.status === 'approved')}
                    >
                      Save Draft
                    </Button>
                    <Button 
                      onClick={handleApprove}
                      disabled={incrementPlans.every(plan => plan.status === 'approved')}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Approve Planning
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default IncrementPlanning;
