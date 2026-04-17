
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DollarSign, Calendar, Play, ArrowLeft, Users, Clock, Plus, Eye, Edit, Shield, AlertTriangle } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import PayrollViewDialog from '@/components/payroll/PayrollViewDialog';
import PayrollEditDialog from '@/components/payroll/PayrollEditDialog';
import PayrollHistoryActions from '@/components/payroll/PayrollHistoryActions';
import { getEmployees } from '@/services/employeeService';
import { getAllPayrollRecords, savePayrollRecord, getEmployeePayrollData, deletePayrollRecord, updatePayrollLockStatus, type PayrollRecord } from '@/services/payrollService';
import { formatDate } from '@/utils/dateFormat';

interface EmployeeOption {
  id: string;
  name: string;
  type: string;
}

const PaymentSummary = () => {
  const navigate = useNavigate();
  const { user, userrole } = useAuth();
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [payrollHistory, setPayrollHistory] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewPayrollOpen, setIsNewPayrollOpen] = useState(false);
  const [newPayrollPeriod, setNewPayrollPeriod] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [viewPayroll, setViewPayroll] = useState<PayrollRecord | null>(null);
  const [editPayroll, setEditPayroll] = useState<PayrollRecord | null>(null);

  const isSuperAdmin = userrole === 'superadmin';

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        console.log('Loading employees and payroll records from Supabase...');
        
        // Load employees from Supabase
        const employeesData = await getEmployees();
        console.log('Loaded employees from Supabase:', employeesData);
        setEmployees(employeesData.map(emp => ({
          id: emp.id,
          name: emp.name,
          type: emp.type
        })));

        // Load payroll records from Supabase
        const payrollRecords = await getAllPayrollRecords();
        console.log('Loaded payroll records from Supabase:', payrollRecords);
        setPayrollHistory(payrollRecords);
        
      } catch (error) {
        console.error('Error loading data from Supabase:', error);
        toast.error('Error loading data from Supabase');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleProcessPayroll = () => {
    navigate('/payroll');
  };

  const handleViewPayroll = (payrollId: string) => {
    const payroll = payrollHistory.find(p => p.id === payrollId);
    setViewPayroll(payroll || null);
  };

  const handleEditPayroll = (payrollId: string) => {
    const payroll = payrollHistory.find(p => p.id === payrollId);
    setEditPayroll(payroll || null);
  };

  const handleLockToggle = async (recordId: string, isLocked: boolean) => {
    try {
      // Lock/unlock payroll
      await updatePayrollLockStatus(recordId, isLocked);
      
      // Update local state
      setPayrollHistory(prev => 
        prev.map(p => p.id === recordId ? { ...p, isLocked } : p)
      );
      
      toast.success(`Payroll ${isLocked ? 'locked' : 'unlocked'} successfully`);
    } catch (error) {
      console.error(`Error ${isLocked ? 'locking' : 'unlocking'} payroll:`, error);
      toast.error(`Error ${isLocked ? 'locking' : 'unlocking'} payroll record`);
    }
  };

  const handleDeletePayroll = async (payrollId: string) => {
    if (!isSuperAdmin) {
      toast.error('Only super administrators can delete payroll records.');
      return;
    }
    
    try {
      // Deleting payroll record
      
      // Find the record for logging
      const recordToDelete = payrollHistory.find(p => p.id === payrollId);
      if (recordToDelete && recordToDelete.isLocked) {
        toast.error('Cannot delete locked payroll record. Please unlock it first.');
        return;
      }
      
      // Show loading state
      const loadingToast = toast.loading('Deleting payroll record from Supabase...');
      
      // Delete from Supabase
      await deletePayrollRecord(payrollId);
      
      // Dismiss loading toast
      toast.dismiss(loadingToast);
      
      // Remove from UI state immediately
      setPayrollHistory(prev => {
        const updated = prev.filter(p => p.id !== payrollId);
        console.log(`✅ Removed payroll from UI. Records count: ${prev.length} -> ${updated.length}`);
        return updated;
      });
      
      console.log(`🎉 Payroll ${payrollId} successfully deleted`);
      toast.success('Payroll record deleted successfully from Supabase');
      
    } catch (error) {
      console.error('💥 Error deleting payroll:', error);
      
      let errorMessage = 'Error deleting payroll record from Supabase';
      
      if (error instanceof Error) {
        if (error.message.includes('locked')) {
          errorMessage = 'Cannot delete locked payroll record. Please unlock it first.';
        } else {
          errorMessage = `Deletion failed: ${error.message}`;
        }
      }
      
      toast.error(errorMessage);
    }
  };

  const handleSavePayroll = (updatedPayroll: PayrollRecord) => {
    setPayrollHistory(prev => 
      prev.map(p => p.id === updatedPayroll.id ? updatedPayroll : p)
    );
    toast.success('Payroll updated successfully');
  };

  const handleCreateNewPayroll = async () => {
    if (!newPayrollPeriod || selectedEmployees.length === 0) {
      toast.error('Please select a payroll period and at least one employee');
      return;
    }

    try {
      console.log('Creating new payroll for employees:', selectedEmployees);
      
      // Generate payroll data for each selected employee
      for (const employeeId of selectedEmployees) {
        const payrollData = await getEmployeePayrollData(employeeId, newPayrollPeriod);
        const year = new Date().getFullYear();
        
        await savePayrollRecord(employeeId, newPayrollPeriod, payrollData);
        console.log(`Saved payroll record for employee ${employeeId} for ${newPayrollPeriod}`);
      }

      // Reload payroll records
      const updatedRecords = await getAllPayrollRecords();
      setPayrollHistory(updatedRecords);
      
      toast.success(`New payroll created for ${newPayrollPeriod} with ${selectedEmployees.length} employees`);
      setIsNewPayrollOpen(false);
      setNewPayrollPeriod('');
      setSelectedEmployees([]);
    } catch (error) {
      console.error('Error creating new payroll:', error);
      toast.error('Error creating new payroll');
    }
  };

  const handleEmployeeSelection = (employeeId: string, checked: boolean) => {
    if (checked) {
      setSelectedEmployees([...selectedEmployees, employeeId]);
    } else {
      setSelectedEmployees(selectedEmployees.filter(id => id !== employeeId));
    }
  };

  // Calculate totals from actual Supabase data
  const yearToDateTotal = payrollHistory.reduce((sum, payroll) => {
    if (payroll.payrollData?.netSalary) {
      return sum + payroll.payrollData.netSalary;
    }
    return sum;
  }, 0);

  const currentMonthRecords = payrollHistory.filter(p => 
    p.month === 'December 2024' // Current month
  );
  const currentTotal = currentMonthRecords.reduce((sum, payroll) => {
    if (payroll.payrollData?.netSalary) {
      return sum + payroll.payrollData.netSalary;
    }
    return sum;
  }, 0);

  const lockedPayrollsCount = payrollHistory.filter(p => p.isLocked).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading payroll data from Supabase...</p>
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
                <Button variant="outline" onClick={() => navigate('/payroll')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Payroll
                </Button>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Payroll Summary - Year to Date</h2>
                  <p className="text-gray-600">Manage and view payroll history from Supabase ({employees.length} employees loaded)</p>
                </div>
              </div>
              <Button className="flex items-center space-x-2" onClick={handleProcessPayroll}>
                <Play className="w-4 h-4" />
                <span>Process Current Payroll</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Year to Date Total</p>
                      <p className="text-2xl font-bold text-gray-900">S${yearToDateTotal.toLocaleString()}</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Current Period</p>
                      <p className="text-2xl font-bold text-gray-900">S${currentTotal.toLocaleString()}</p>
                    </div>
                    <Calendar className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Payroll Records</p>
                      <p className="text-2xl font-bold text-gray-900">{payrollHistory.length}</p>
                    </div>
                    <Clock className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Employees</p>
                      <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
                    </div>
                    <Users className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
               <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Locked Payrolls</p>
                      <p className="text-2xl font-bold text-gray-900">{lockedPayrollsCount}</p>
                    </div>
                    <Shield className="w-8 h-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {isSuperAdmin && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-amber-900">Super Administrator Access</h3>
                    <p className="text-sm text-amber-700 mt-1">
                      You have elevated privileges to delete payroll records. All data is synchronized with Supabase.
                      Make sure records are unlocked before attempting deletion.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Payroll History from Supabase</CardTitle>
                    <CardDescription>All payroll records are stored and managed in Supabase</CardDescription>
                  </div>
                  <Dialog open={isNewPayrollOpen} onOpenChange={setIsNewPayrollOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex items-center space-x-2">
                        <Plus className="w-4 h-4" />
                        <span>Add New Payroll</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Create New Payroll</DialogTitle>
                        <DialogDescription>
                          Select the payroll period and employees to include in the new payroll.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">
                            Payroll Period
                          </label>
                          <Select value={newPayrollPeriod} onValueChange={setNewPayrollPeriod}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select payroll period" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="January 2025">January 2025</SelectItem>
                              <SelectItem value="February 2025">February 2025</SelectItem>
                              <SelectItem value="March 2025">March 2025</SelectItem>
                              <SelectItem value="April 2025">April 2025</SelectItem>
                              <SelectItem value="May 2025">May 2025</SelectItem>
                              <SelectItem value="June 2025">June 2025</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">
                            Select Employees ({selectedEmployees.length} selected)
                          </label>
                          <div className="max-h-60 overflow-y-auto border rounded-md p-3 space-y-2">
                            {employees.map((employee) => (
                              <div key={employee.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={employee.id}
                                  checked={selectedEmployees.includes(employee.id)}
                                  onCheckedChange={(checked) => 
                                    handleEmployeeSelection(employee.id, checked as boolean)
                                  }
                                />
                                <label 
                                  htmlFor={employee.id}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer"
                                >
                                  {employee.name} ({employee.type})
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setIsNewPayrollOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleCreateNewPayroll}>
                            Create Payroll
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {payrollHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No payroll records found in Supabase</p>
                    <p className="text-sm text-gray-400 mt-2">Create a new payroll to get started</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Net Salary</TableHead>
                        <TableHead>Gross Salary</TableHead>
                        <TableHead>CPF Total</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrollHistory.map((payroll) => (
                        <TableRow key={payroll.id}>
                          <TableCell className="font-medium">{payroll.employeeId}</TableCell>
                          <TableCell>{payroll.month}</TableCell>
                          <TableCell className="font-bold">
                            S${payroll.payrollData?.netSalary?.toLocaleString() || '0'}
                          </TableCell>
                          <TableCell>
                            S${payroll.payrollData?.grossSalary?.toLocaleString() || '0'}
                          </TableCell>
                          <TableCell>
                            S${payroll.payrollData?.totalCPF?.toLocaleString() || '0'}
                          </TableCell>
                          <TableCell>
                            {formatDate(new Date(payroll.createdAt))}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleViewPayroll(payroll.id)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEditPayroll(payroll.id)}
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Edit
                              </Button>
                              <PayrollHistoryActions
                                record={payroll}
                                onLockToggle={handleLockToggle}
                                onDelete={handleDeletePayroll}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <PayrollViewDialog 
        payroll={viewPayroll}
        isOpen={!!viewPayroll}
        onClose={() => setViewPayroll(null)}
      />

      <PayrollEditDialog 
        payroll={editPayroll}
        isOpen={!!editPayroll}
        onClose={() => setEditPayroll(null)}
        onSave={handleSavePayroll}
      />
    </div>
  );
};

export default PaymentSummary;
