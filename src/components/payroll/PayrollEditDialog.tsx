
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from '@/components/ui/sonner';
import { CalendarIcon, Plus, X, Edit, Save, Calendar as CalendarLucide } from 'lucide-react';
import { format } from 'date-fns';
import { PayrollEmployee } from '@/types/employee';
import { getEmployees, getEmployeeById } from '@/services/employeeService';
import { calculateCPF, calculateAge } from '@/utils/cpfCalculations';
import { supabase } from '@/integrations/supabase/client';
import { PayrollRecord, savePayrollRecord } from '@/services/payrollService';
import { cn } from '@/lib/utils';
import EditAllowancesDialog from './EditAllowancesDialog';
import EditDeductionsDialog from './EditDeductionsDialog';
import { formatDate } from '@/utils/dateFormat';

interface PayrollEditDialogProps {
  payroll: PayrollRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedPayroll: PayrollRecord) => void;
}

const PayrollEditDialog = ({ payroll, isOpen, onClose, onSave }: PayrollEditDialogProps) => {
  const [employeeDetails, setEmployeeDetails] = useState<PayrollEmployee[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [payrollDate, setPayrollDate] = useState<Date>(new Date());
  const [editingCell, setEditingCell] = useState<{row: number, column: string} | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [allowancesDialogOpen, setAllowancesDialogOpen] = useState(false);
  const [deductionsDialogOpen, setDeductionsDialogOpen] = useState(false);
  const [selectedEmployeeIndex, setSelectedEmployeeIndex] = useState<number>(0);

  useEffect(() => {
    const loadData = async () => {
      if (payroll) {
        setLoading(true);
        try {
          // Set payroll date from existing record
          const [month, year] = payroll.month.split(' ');
          const monthIndex = new Date(`${month} 1, ${year}`).getMonth();
          setPayrollDate(new Date(payroll.year, monthIndex, 2)); // Set to 2nd of the month

          // Load all employees for adding functionality
          const allEmps = await getEmployees();
          setAllEmployees(allEmps);

          // Load current payroll employee
          const empData = await getEmployeeById(payroll.employeeId);
          if (!empData) {
            toast.error('Employee not found');
            return;
          }

          // Load allowances from database
          const { data: allowancesData } = await supabase
            .from('allowances')
            .select('*')
            .eq('employee_id', empData.id);
          
          // Load deductions from database
          const { data: deductionsData } = await supabase
            .from('deductions')
            .select('*')
            .eq('employee_id', empData.id);

          const allowances = allowancesData || [];
          const deductions = deductionsData || [];
          
          const employee = await createPayrollEmployee(empData, allowances, deductions);
          setEmployeeDetails([employee]);
        } catch (error) {
          console.error('Error loading employee details:', error);
          toast.error('Error loading employee details');
        } finally {
          setLoading(false);
        }
      }
    };

    loadData();
  }, [payroll]);

  const createPayrollEmployee = async (empData: any, allowances: any[], deductions: any[]) => {
    const totalAllowances = allowances.reduce((sum, allowance) => sum + Number(allowance.amount), 0);
    const totalDeductions = deductions.reduce((sum, deduction) => sum + Number(deduction.amount), 0);
    
    let cpfEmployee = 0;
    let cpfEmployer = 0;
    let grossPay = 0;
    let netPay = 0;

    if (empData.type === 'Full-Time' && empData.baseSalary) {
      const age = calculateAge(empData.dateOfBirth);
      grossPay = empData.baseSalary + totalAllowances;
      const cpfCalc = calculateCPF(grossPay, empData.residencyStatus, age);
      cpfEmployee = cpfCalc.employeeCPF;
      cpfEmployer = cpfCalc.employerCPF;
      netPay = grossPay - cpfEmployee - totalDeductions;
    } else if (empData.type === 'Casual') {
      const age = calculateAge(empData.dateOfBirth);
      
      if (empData.paymentType === 'Hourly' && empData.hourlyRate) {
        const hoursWorked = 120;
        grossPay = empData.hourlyRate * hoursWorked + totalAllowances;
      } else if (empData.paymentType === 'Monthly' && empData.baseSalary) {
        grossPay = empData.baseSalary + totalAllowances;
      } else {
        // Daily employees use dynamic pricing
        grossPay = (empData.baseSalary || 0) + totalAllowances;
      }
      
      const cpfCalc = calculateCPF(grossPay, empData.residencyStatus, age);
      cpfEmployee = cpfCalc.employeeCPF;
      cpfEmployer = cpfCalc.employerCPF;
      netPay = grossPay - cpfEmployee - totalDeductions;
    }

    const employee: PayrollEmployee = {
      id: empData.id,
      name: empData.name,
      type: empData.type,
      baseSalary: empData.baseSalary,
      hourlyRate: empData.hourlyRate,
      paymentType: empData.paymentType,
      allowances: allowances.map(a => ({ 
        id: a.id.toString(),
        name: a.name, 
        amount: Number(a.amount), 
        type: (a.type || 'Fixed') as 'Fixed' | 'Percentage' | 'Manual'
      })),
      deductions: deductions.map(d => ({ 
        id: d.id.toString(),
        name: d.name, 
        amount: Number(d.amount), 
        type: (d.type || 'Fixed') as 'Fixed' | 'Percentage' | 'Manual'
      })),
      grossPay,
      cpfEmployee,
      cpfEmployer,
      netPay,
      cpf: cpfEmployee,
      total: netPay
    };

    return employee;
  };

  const handleAddEmployee = async (employeeId: string) => {
    if (employeeDetails.find(emp => emp.id === employeeId)) {
      toast.error('Employee already added to payroll');
      return;
    }

    try {
      const empData = await getEmployeeById(employeeId);
      if (!empData) return;

      // Load allowances and deductions
      const { data: allowancesData } = await supabase
        .from('allowances')
        .select('*')
        .eq('employee_id', empData.id);
      
      const { data: deductionsData } = await supabase
        .from('deductions')
        .select('*')
        .eq('employee_id', empData.id);

      const allowances = allowancesData || [];
      const deductions = deductionsData || [];
      
      const newEmployee = await createPayrollEmployee(empData, allowances, deductions);
      setEmployeeDetails(prev => [...prev, newEmployee]);
      toast.success(`Added ${empData.name} to payroll`);
    } catch (error) {
      console.error('Error adding employee:', error);
      toast.error('Error adding employee to payroll');
    }
  };

  const handleRemoveEmployee = (employeeId: string) => {
    setEmployeeDetails(prev => prev.filter(emp => emp.id !== employeeId));
    toast.success('Employee removed from payroll');
  };

  const handleCellEdit = (rowIndex: number, column: string, currentValue: any) => {
    setEditingCell({ row: rowIndex, column });
    setEditValue(currentValue.toString());
  };

  const handleCellSave = async (rowIndex: number, column: string) => {
    const employee = employeeDetails[rowIndex];
    if (!employee) return;

    const numValue = parseFloat(editValue) || 0;

    try {
      // Update in database if it's a base value
      if (column === 'baseSalary' || column === 'hourlyRate') {
        const updateField = column === 'baseSalary' ? 'base_salary' : 'hourly_rate';
        
        const { error } = await supabase
          .from('employees')
          .update({ [updateField]: numValue })
          .eq('id', employee.id);

        if (error) throw error;
      }

      // Update local state and recalculate
      await recalculateEmployeePayroll(rowIndex, column, numValue);
      setEditingCell(null);
      toast.success('Value updated successfully');
    } catch (error) {
      console.error('Error updating value:', error);
      toast.error('Error updating value');
    }
  };

  const recalculateEmployeePayroll = async (rowIndex: number, column?: string, newValue?: number) => {
    setEmployeeDetails(prev => {
      const updated = [...prev];
      const emp = { ...updated[rowIndex] };
      
      if (column && newValue !== undefined) {
        if (column === 'baseSalary') emp.baseSalary = newValue;
        else if (column === 'hourlyRate') emp.hourlyRate = newValue;
      }

      // Recalculate payroll
      const totalAllowances = emp.allowances.reduce((sum, a) => sum + a.amount, 0);
      const totalDeductions = emp.deductions.reduce((sum, d) => sum + d.amount, 0);
      
      let grossPay = 0;
      if (emp.type === 'Full-Time') {
        grossPay = (emp.baseSalary || 0) + totalAllowances;
      } else if (emp.type === 'Casual') {
        if (emp.paymentType === 'Hourly') {
          grossPay = (emp.hourlyRate || 0) * 120 + totalAllowances;
        } else {
          grossPay = (emp.baseSalary || 0) + totalAllowances;
        }
      }

      const cpfCalc = calculateCPF(grossPay, 'Citizen', 30); // Default values for calculation
      emp.grossPay = grossPay;
      emp.cpfEmployee = cpfCalc.employeeCPF;
      emp.cpfEmployer = cpfCalc.employerCPF;
      emp.netPay = grossPay - cpfCalc.employeeCPF - totalDeductions;
      emp.cpf = cpfCalc.employeeCPF;
      emp.total = emp.netPay;

      updated[rowIndex] = emp;
      return updated;
    });
  };

  const handleAllowancesSave = async (allowances: any[]) => {
    const employee = employeeDetails[selectedEmployeeIndex];
    if (!employee) return;

    try {
      // Delete existing allowances
      await supabase
        .from('allowances')
        .delete()
        .eq('employee_id', employee.id);

      // Insert new allowances
      if (allowances.length > 0) {
        const { error } = await supabase
          .from('allowances')
          .insert(allowances.map(a => ({
            employee_id: employee.id,
            name: a.name,
            amount: a.amount,
            type: a.type
          })));

        if (error) throw error;
      }

      // Update local state
      setEmployeeDetails(prev => {
        const updated = [...prev];
        updated[selectedEmployeeIndex] = {
          ...updated[selectedEmployeeIndex],
          allowances: allowances
        };
        return updated;
      });

      // Recalculate payroll
      await recalculateEmployeePayroll(selectedEmployeeIndex);
      toast.success('Allowances updated successfully');
    } catch (error) {
      console.error('Error updating allowances:', error);
      toast.error('Error updating allowances');
    }
  };

  const handleDeductionsSave = async (deductions: any[]) => {
    const employee = employeeDetails[selectedEmployeeIndex];
    if (!employee) return;

    try {
      // Delete existing deductions
      await supabase
        .from('deductions')
        .delete()
        .eq('employee_id', employee.id);

      // Insert new deductions
      if (deductions.length > 0) {
        const { error } = await supabase
          .from('deductions')
          .insert(deductions.map(d => ({
            employee_id: employee.id,
            name: d.name,
            amount: d.amount,
            type: d.type
          })));

        if (error) throw error;
      }

      // Update local state
      setEmployeeDetails(prev => {
        const updated = [...prev];
        updated[selectedEmployeeIndex] = {
          ...updated[selectedEmployeeIndex],
          deductions: deductions
        };
        return updated;
      });

      // Recalculate payroll
      await recalculateEmployeePayroll(selectedEmployeeIndex);
      toast.success('Deductions updated successfully');
    } catch (error) {
      console.error('Error updating deductions:', error);
      toast.error('Error updating deductions');
    }
  };

  const openAllowancesDialog = (index: number) => {
    setSelectedEmployeeIndex(index);
    setAllowancesDialogOpen(true);
  };

  const openDeductionsDialog = (index: number) => {
    setSelectedEmployeeIndex(index);
    setDeductionsDialogOpen(true);
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setPayrollDate(date);
    }
  };

  const handleSave = async () => {
    if (!payroll) return;

    try {
      // Update payroll record with new date and employee data
      const updatedMonth = format(payrollDate, 'MMMM yyyy');
      const updatedYear = payrollDate.getFullYear();

      // Save each employee's payroll record
      for (const employee of employeeDetails) {
        const payrollData = {
          baseSalary: employee.baseSalary || 0,
          totalAllowances: employee.allowances.reduce((sum, a) => sum + a.amount, 0),
          totalDeductions: employee.deductions.reduce((sum, d) => sum + d.amount, 0),
          grossSalary: employee.grossPay,
          employeeCPF: employee.cpfEmployee,
          employerCPF: employee.cpfEmployer,
          totalCPF: employee.cpfEmployee + employee.cpfEmployer,
          approvedClaims: 0,
          netSalary: employee.netPay,
          allowances: employee.allowances,
          deductions: employee.deductions
        };

        await savePayrollRecord(employee.id, updatedMonth, payrollData);
      }

      // Create updated payroll record for the callback
      const mainEmployee = employeeDetails[0];
      if (mainEmployee) {
        const updatedPayroll: PayrollRecord = {
          ...payroll,
          month: updatedMonth,
          year: updatedYear,
          payrollData: {
            baseSalary: mainEmployee.baseSalary || 0,
            totalAllowances: mainEmployee.allowances.reduce((sum, a) => sum + a.amount, 0),
            totalDeductions: mainEmployee.deductions.reduce((sum, d) => sum + d.amount, 0),
            grossSalary: mainEmployee.grossPay,
            employeeCPF: mainEmployee.cpfEmployee,
            employerCPF: mainEmployee.cpfEmployer,
            totalCPF: mainEmployee.cpfEmployee + mainEmployee.cpfEmployer,
            approvedClaims: 0,
            netSalary: mainEmployee.netPay,
            allowances: mainEmployee.allowances,
            deductions: mainEmployee.deductions
          }
        };
        
        onSave(updatedPayroll);
      }
      
      toast.success('Payroll updated successfully');
      onClose();
    } catch (error) {
      console.error('Error saving payroll:', error);
      toast.error('Error saving payroll');
    }
  };

  if (!payroll) return null;

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading payroll data...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Edit Payroll - {format(payrollDate, 'MMMM yyyy')}
            </DialogTitle>
            <DialogDescription>
              Modify payroll details. Add/remove employees and edit values directly in the table.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 overflow-auto max-h-[70vh]">
            {/* Payroll Date Selector */}
            <div className="flex items-center space-x-4 bg-blue-50 p-4 rounded-lg">
              <CalendarLucide className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-900">Payroll Date:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !payrollDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {payrollDate ? formatDate(payrollDate) : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={payrollDate}
                    onSelect={handleDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Add Employee Section */}
            <div className="flex items-center space-x-4 bg-green-50 p-4 rounded-lg">
              <Plus className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-900">Add Employee:</span>
              <Select onValueChange={handleAddEmployee}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder="Select employee to add" />
                </SelectTrigger>
                <SelectContent>
                  {allEmployees
                    .filter(emp => !employeeDetails.find(existing => existing.id === emp.id))
                    .map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name} ({employee.type})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payroll Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-blue-900">Payroll Summary</h3>
                  <p className="text-blue-700">{employeeDetails.length} employee(s) in payroll</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-blue-600">Total Net Pay</p>
                  <p className="text-2xl font-bold text-blue-900">
                    S${employeeDetails.reduce((sum, emp) => sum + emp.netPay, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Employee Table */}
            <div className="bg-white border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Employee</TableHead>
                    <TableHead className="font-semibold">Payment Type</TableHead>
                    <TableHead className="font-semibold">Basic Rate/Salary</TableHead>
                    <TableHead className="font-semibold">Allowances</TableHead>
                    <TableHead className="font-semibold">Deductions</TableHead>
                    <TableHead className="font-semibold">CPF (Employee)</TableHead>
                    <TableHead className="font-semibold">CPF (Employer)</TableHead>
                    <TableHead className="font-semibold">Net Pay</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeDetails.map((employee, index) => (
                    <TableRow key={employee.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <p className="font-medium">{employee.name}</p>
                          <p className="text-xs text-gray-500">{employee.id}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{employee.paymentType || employee.type}</Badge>
                      </TableCell>
                      <TableCell>
                        {editingCell?.row === index && editingCell?.column === 'baseSalary' ? (
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-24"
                            />
                            <Button size="sm" onClick={() => handleCellSave(index, 'baseSalary')}>
                              <Save className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span>S${(employee.baseSalary || 0).toLocaleString()}</span>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleCellEdit(index, 'baseSalary', employee.baseSalary || 0)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {employee.allowances.length > 0 ? (
                            employee.allowances.map((allowance, idx) => (
                              <div key={idx} className="flex items-center justify-between">
                                <span className="text-sm">{allowance.name}</span>
                                <Badge variant="secondary" className="ml-2">
                                  S${allowance.amount}
                                </Badge>
                              </div>
                            ))
                          ) : (
                            <span className="text-sm text-gray-500">No allowances</span>
                          )}
                          <div className="border-t pt-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">
                                Total: S${employee.allowances.reduce((sum, a) => sum + a.amount, 0)}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openAllowancesDialog(index)}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {employee.deductions.length > 0 ? (
                            employee.deductions.map((deduction, idx) => (
                              <div key={idx} className="flex items-center justify-between">
                                <span className="text-sm">{deduction.name}</span>
                                <Badge variant="destructive" className="ml-2">
                                  S${deduction.amount}
                                </Badge>
                              </div>
                            ))
                          ) : (
                            <span className="text-sm text-gray-500">No deductions</span>
                          )}
                          <div className="border-t pt-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">
                                Total: S${employee.deductions.reduce((sum, d) => sum + d.amount, 0)}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDeductionsDialog(index)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">S${employee.cpfEmployee.toLocaleString()}</TableCell>
                      <TableCell className="font-medium">S${employee.cpfEmployer.toLocaleString()}</TableCell>
                      <TableCell className="font-bold text-green-600">S${employee.netPay.toLocaleString()}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveEmployee(employee.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex justify-end space-x-3 border-t pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Allowances Dialog */}
      {employeeDetails[selectedEmployeeIndex] && (
        <EditAllowancesDialog
          isOpen={allowancesDialogOpen}
          onClose={() => setAllowancesDialogOpen(false)}
          employeeName={employeeDetails[selectedEmployeeIndex].name}
          allowances={employeeDetails[selectedEmployeeIndex].allowances}
          onSave={handleAllowancesSave}
        />
      )}

      {/* Deductions Dialog */}
      {employeeDetails[selectedEmployeeIndex] && (
        <EditDeductionsDialog
          isOpen={deductionsDialogOpen}
          onClose={() => setDeductionsDialogOpen(false)}
          employeeName={employeeDetails[selectedEmployeeIndex].name}
          deductions={employeeDetails[selectedEmployeeIndex].deductions}
          onSave={handleDeductionsSave}
        />
      )}
    </>
  );
};

export default PayrollEditDialog;
