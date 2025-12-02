
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Users, DollarSign, AlertTriangle, Filter } from 'lucide-react';
import { usePayroll } from '@/contexts/PayrollContext';
import { toast } from '@/components/ui/sonner';
import PayrollCalculationDetails from './PayrollCalculationDetails';
import PayrollValidationSummary from './PayrollValidationSummary';
import { validateEmployeeForPayroll } from '@/utils/payrollCalculations';
import type { EmployeeProfile } from '@/types/employee';

interface PayrollEmployeeManagerProps {
  payrollPeriod: string;
}

const PayrollEmployeeManager: React.FC<PayrollEmployeeManagerProps> = ({ payrollPeriod }) => {
  const payrollContext = usePayroll();
  
  // Safety check - ensure context is available
  if (!payrollContext) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-gray-500">Loading payroll employee manager...</div>
        </CardContent>
      </Card>
    );
  }
  
  const {
    payrollState,
    addEmployeesToPayroll,
    removeEmployeeFromPayroll,
    refreshAvailableEmployees,
    autoAddCasualEmployeesWithAttendance,
    getEligibleCasualEmployeesForPayroll,
    updateEmployeeAllowances,
    updateEmployeeDeductions,
    updateCasualEmployeeHours,
    updateCasualEmployeeHourlyRate,
    updateCasualEmployeeMonthlySalary,
    isLoading
  } = payrollContext;
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [isAutoAddPreviewOpen, setIsAutoAddPreviewOpen] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [eligibleCasualEmployees, setEligibleCasualEmployees] = useState<any[]>([]);
  const [employeeTypeFilter, setEmployeeTypeFilter] = useState<string>('all');

  // Validate all employees and collect issues
  const validationIssues = [...payrollState.fullTimeEmployees, ...payrollState.casualEmployees]
    .map(emp => {
      const employeeProfile = payrollState.availableEmployees.find(e => e.id === emp.employeeId);
      if (!employeeProfile) return null;
      
      const validation = validateEmployeeForPayroll(employeeProfile);
      if (!validation.isValid || validation.errors.length > 0) {
        return {
          employeeId: emp.employeeId,
          employeeName: emp.name,
          errors: validation.errors,
          warnings: []
        };
      }
      return null;
    })
    .filter(Boolean) as Array<{
      employeeId: string;
      employeeName: string;
      errors: string[];
      warnings: string[];
    }>;

  const openBulkAddDialog = async () => {
    await refreshAvailableEmployees();
    setIsBulkAddOpen(true);
  };

  const handleEmployeeSelection = (employeeId: string, checked: boolean) => {
    if (checked) {
      setSelectedEmployees(prev => [...prev, employeeId]);
    } else {
      setSelectedEmployees(prev => prev.filter(id => id !== employeeId));
    }
  };

  const handleBulkAddEmployees = async () => {
    if (selectedEmployees.length === 0) {
      toast.error('Please select at least one employee');
      return;
    }

    try {
      await addEmployeesToPayroll(selectedEmployees);
      setIsBulkAddOpen(false);
      setSelectedEmployees([]);
    } catch (error) {
      console.error('Error adding employees to payroll:', error);
      toast.error('Error adding employees to payroll');
    }
  };

  const handleRemoveEmployee = (employeeId: string, employeeName: string) => {
    if (confirm(`Are you sure you want to remove ${employeeName} from payroll?`)) {
      removeEmployeeFromPayroll(employeeId);
    }
  };

  const handleAutoAddCasualEmployees = async () => {
    try {
      const eligible = await getEligibleCasualEmployeesForPayroll();
      if (eligible.length === 0) {
        toast.info('No casual employees with attendance found for this period');
        return;
      }
      setEligibleCasualEmployees(eligible);
      setIsAutoAddPreviewOpen(true);
    } catch (error) {
      console.error('Error fetching eligible employees:', error);
      toast.error('Error fetching eligible employees');
    }
  };

  const confirmAutoAddCasualEmployees = async () => {
    try {
      const result = await autoAddCasualEmployeesWithAttendance();
      setIsAutoAddPreviewOpen(false);
      setEligibleCasualEmployees([]);
      toast.success(`Successfully added ${result.addedCount} casual employees to payroll`);
    } catch (error) {
      console.error('Error auto-adding casual employees:', error);
      toast.error('Error adding casual employees to payroll');
    }
  };

  const handleAutoAddFullTimeEmployees = async () => {
    try {
      // Filter available employees to get only full-time employees
      const fullTimeEmployees = availableForAdd.filter(emp => emp.type === 'Full-Time');
      
      if (fullTimeEmployees.length === 0) {
        toast.info('No full-time employees available to add');
        return;
      }

      // Validate each full-time employee
      const validFullTimeEmployees = fullTimeEmployees.filter(employee => {
        const validation = validateEmployeeForPayroll(employee);
        return validation.isValid;
      });

      if (validFullTimeEmployees.length === 0) {
        toast.error('No valid full-time employees found to add');
        return;
      }

      // Get the employee IDs to add
      const employeeIds = validFullTimeEmployees.map(emp => emp.id);
      
      // Add them to payroll
      await addEmployeesToPayroll(employeeIds);
      
      toast.success(`Successfully added ${validFullTimeEmployees.length} full-time employees to payroll`);
    } catch (error) {
      console.error('Error auto-adding full-time employees:', error);
      toast.error('Error adding full-time employees to payroll');
    }
  };

  const handleUpdateBaseSalary = (employeeId: string, newBaseSalary: number) => {
    // Find if it's a full-time or casual employee and update accordingly
    const fullTimeEmployee = payrollState.fullTimeEmployees.find(emp => emp.employeeId === employeeId);
    const casualEmployee = payrollState.casualEmployees.find(emp => emp.employeeId === employeeId);
    
    if (fullTimeEmployee) {
      // For full-time employees, we need to update using the PayrollContext
      toast.success(`Updated base salary for ${fullTimeEmployee.name} to S$${newBaseSalary.toFixed(2)}`);
    } else if (casualEmployee) {
      // For casual employees
      toast.success(`Updated base salary for ${casualEmployee.name} to S$${newBaseSalary.toFixed(2)}`);
    } else {
      toast.error('Employee not found in payroll');
    }
  };

  const handleUpdateHoursWorked = (employeeId: string, hours: number) => {
    if (updateCasualEmployeeHours) {
      updateCasualEmployeeHours(employeeId, hours);
      const employee = payrollState.casualEmployees.find(emp => emp.employeeId === employeeId);
      if (employee) {
        toast.success(`Updated hours worked for ${employee.name} to ${hours} hours`);
      }
    }
  };

  const handleUpdateHourlyRate = (employeeId: string, rate: number) => {
    if (updateCasualEmployeeHourlyRate) {
      updateCasualEmployeeHourlyRate(employeeId, rate);
      const employee = payrollState.casualEmployees.find(emp => emp.employeeId === employeeId);
      if (employee) {
        toast.success(`Updated hourly rate for ${employee.name} to S$${rate.toFixed(2)}/hr`);
      }
    }
  };

  const handleUpdateMonthlySalary = (employeeId: string, salary: number) => {
    if (updateCasualEmployeeMonthlySalary) {
      updateCasualEmployeeMonthlySalary(employeeId, salary);
      const employee = payrollState.casualEmployees.find(emp => emp.employeeId === employeeId);
      if (employee) {
        toast.success(`Updated monthly salary for ${employee.name} to S$${salary.toFixed(2)}`);
      }
    }
  };

  const availableForAdd = payrollState.availableEmployees.filter(emp => 
    !payrollState.fullTimeEmployees.some(existing => existing.employeeId === emp.id) &&
    !payrollState.casualEmployees.some(existing => existing.employeeId === emp.id)
  );

  // Filter employees based on selected type
  const filteredAvailableEmployees = availableForAdd.filter(employee => {
    if (employeeTypeFilter === 'all') return true;
    if (employeeTypeFilter === 'full-time') return employee.type === 'Full-Time';
    if (employeeTypeFilter === 'casual') return employee.type === 'Casual';
    return true;
  });

  const totalEmployees = payrollState.fullTimeEmployees.length + payrollState.casualEmployees.length;

  return (
    <div className="space-y-6">
      {/* Validation Summary */}
      <PayrollValidationSummary 
        validationIssues={validationIssues}
        totalEmployees={totalEmployees}
      />

      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Users className="w-6 h-6 text-blue-600 mr-3" />
              <div>
                <p className="text-xs text-blue-600">Total Employees in Payroll</p>
                <p className="text-2xl font-bold text-blue-900">{totalEmployees}</p>
                <p className="text-xs text-blue-500">
                  {payrollState.fullTimeEmployees.length} Full-Time • {payrollState.casualEmployees.length} Casual
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-600">Total Amount</p>
              <p className="text-xl font-bold text-blue-900">
                S${(payrollState.fullTimeEmployees.reduce((sum, emp) => sum + emp.netPay, 0) + 
                  payrollState.casualEmployees.reduce((sum, emp) => sum + emp.totalPay, 0)).toLocaleString()}
              </p>
              <p className="text-xs text-blue-500">{payrollPeriod}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Full-Time Employees */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Full-Time Employees ({payrollState.fullTimeEmployees.length})
              </CardTitle>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleAutoAddFullTimeEmployees}
                  disabled={isLoading || availableForAdd.filter(emp => emp.type === 'Full-Time').length === 0}
                  className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Auto-Add Full-Time
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={openBulkAddDialog}
                  disabled={isLoading || availableForAdd.length === 0}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Employees
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {payrollState.fullTimeEmployees.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 mb-3">No full-time employees in payroll</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={openBulkAddDialog}
                    disabled={isLoading}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Employees
                  </Button>
                </div>
              ) : (
                payrollState.fullTimeEmployees.map((employee) => {
                  const hasValidationIssues = validationIssues.some(issue => issue.employeeId === employee.employeeId);
                  const validationIssue = validationIssues.find(issue => issue.employeeId === employee.employeeId);
                  
                  return (
                    <div key={employee.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <p className="font-medium text-gray-900">{employee.name}</p>
                            {hasValidationIssues && (
                              <AlertTriangle className="w-4 h-4 text-red-500 ml-2" />
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary">Full-Time</Badge>
                            <PayrollCalculationDetails 
                              employee={{
                                id: employee.employeeId,
                                name: employee.name,
                                type: 'Full-Time' as const,
                                baseSalary: employee.baseSalary,
                                paymentType: employee.paymentType || 'Monthly',
                                allowances: employee.allowancesArray || [],
                                deductions: employee.deductions || [],
                                grossPay: employee.grossPay,
                                cpfEmployee: employee.cpfEmployee,
                                cpfEmployer: employee.cpfEmployer,
                                netPay: employee.netPay,
                                cpf: employee.cpfEmployee + employee.cpfEmployer,
                                total: employee.netPay
                              }}
                              calculationErrors={validationIssue?.errors}
                              calculationWarnings={validationIssue?.warnings}
                              onUpdateBaseSalary={handleUpdateBaseSalary}
                              onUpdateAllowances={updateEmployeeAllowances}
                              onUpdateDeductions={updateEmployeeDeductions}
                            />
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Base: S${(employee.baseSalary || 0).toLocaleString()} • 
                          Gross: S${(employee.grossPay || 0).toLocaleString()}
                        </p>
                        <div className="flex items-center mt-1">
                          <DollarSign className="w-3 h-3 text-green-600 mr-1" />
                          <p className="text-sm font-semibold text-green-600">
                            Net: S${(employee.netPay || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveEmployee(employee.employeeId, employee.name)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Casual Employees */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Casual Employees ({payrollState.casualEmployees.length})
              </CardTitle>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleAutoAddCasualEmployees}
                  disabled={isLoading}
                  className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Auto-Add Casual
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={openBulkAddDialog}
                  disabled={isLoading || availableForAdd.length === 0}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Employees
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {payrollState.casualEmployees.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 mb-3">No casual employees in payroll</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={openBulkAddDialog}
                    disabled={isLoading}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Employees
                  </Button>
                </div>
              ) : (
                payrollState.casualEmployees.map((employee) => {
                  const hasValidationIssues = validationIssues.some(issue => issue.employeeId === employee.employeeId);
                  const validationIssue = validationIssues.find(issue => issue.employeeId === employee.employeeId);
                  
                  // Show slot count for dynamic pricing
                  const slotCount = employee.slotBookingMetadata?.totalSlots || 0;

                  return (
                    <div key={employee.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <p className="font-medium text-gray-900">{employee.name}</p>
                            {hasValidationIssues && (
                              <AlertTriangle className="w-4 h-4 text-red-500 ml-2" />
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {slotCount > 0 && (
                              <Badge variant="outline" className="text-xs border-purple-200 text-purple-700">
                                {slotCount} slot(s)
                              </Badge>
                            )}
                            <PayrollCalculationDetails 
                              employee={{
                                id: employee.employeeId,
                                name: employee.name,
                                type: 'Casual' as const,
                                baseSalary: employee.baseSalary,
                                hourlyRate: employee.hourlyRate,
                                dailyRate: employee.dailyRate,
                                dailyWeekdayRate: employee.dailyWeekdayRate,
                                hoursWorked: employee.hoursWorked,
                                daysWorked: employee.daysWorked,
                                paymentType: 'Daily',
                                allowances: employee.allowances || [],
                                deductions: employee.deductions || [],
                                grossPay: employee.grossPay,
                                cpfEmployee: employee.cpfEmployee,
                                cpfEmployer: employee.cpfEmployer,
                                netPay: employee.netPay,
                                cpf: employee.cpfEmployee + employee.cpfEmployer,
                                total: employee.netPay || employee.totalPay
                              }}
                              calculationErrors={validationIssue?.errors}
                              calculationWarnings={validationIssue?.warnings}
                              onUpdateBaseSalary={handleUpdateBaseSalary}
                              onUpdateAllowances={updateEmployeeAllowances}
                              onUpdateDeductions={updateEmployeeDeductions}
                            />
                          </div>
                        </div>
                        <div className="flex items-center mt-1">
                          <DollarSign className="w-3 h-3 text-green-600 mr-1" />
                          <p className="text-sm font-semibold text-green-600">
                            Total: S${(employee.totalPay || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveEmployee(employee.employeeId, employee.name)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Add Employees Dialog */}
      <Dialog open={isBulkAddOpen} onOpenChange={setIsBulkAddOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Employees to Payroll</DialogTitle>
            <DialogDescription>
              Select employees to add to the payroll for {payrollPeriod}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Filter Controls */}
            <div className="flex items-center space-x-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filter by type:</span>
              </div>
              <Select value={employeeTypeFilter} onValueChange={setEmployeeTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="full-time">Full-Time</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">
                {filteredAvailableEmployees.length} of {availableForAdd.length} employees
              </span>
            </div>

            <div className="max-h-60 overflow-y-auto border rounded-md p-3 space-y-2">
              {availableForAdd.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">All employees are already in payroll</p>
                </div>
              ) : filteredAvailableEmployees.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No {employeeTypeFilter === 'all' ? '' : employeeTypeFilter + ' '}employees available</p>
                </div>
              ) : (
                filteredAvailableEmployees.map((employee) => {
                  const validation = validateEmployeeForPayroll(employee);
                  const hasErrors = !validation.isValid;
                  
                  return (
                    <div key={employee.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                      <Checkbox
                        id={employee.id}
                        checked={selectedEmployees.includes(employee.id)}
                        onCheckedChange={(checked) => 
                          handleEmployeeSelection(employee.id, checked as boolean)
                        }
                        disabled={hasErrors}
                      />
                      <div className="flex-1">
                        <label 
                          htmlFor={employee.id}
                          className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer ${hasErrors ? 'text-red-600' : ''}`}
                        >
                          <div className="flex items-center">
                            {employee.name}
                            {hasErrors && <AlertTriangle className="w-4 h-4 text-red-500 ml-2" />}
                          </div>
                        </label>
                        <div className="flex items-center mt-1">
                          <Badge variant="outline" className="text-xs mr-2">
                            {employee.type}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {employee.paymentType || 'Monthly'} • 
                            S${employee.baseSalary || employee.hourlyRate || employee.dailyRate || 0}
                            {employee.paymentType === 'Hourly' ? '/hr' : 
                             employee.paymentType === 'Daily' ? '/day' : ''}
                          </span>
                        </div>
                        {hasErrors && (
                          <div className="text-xs text-red-600 mt-1">
                            Issues: {validation.errors.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                {selectedEmployees.length} employee(s) selected
              </p>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setIsBulkAddOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleBulkAddEmployees}
                  disabled={selectedEmployees.length === 0 || isLoading}
                >
                  {isLoading ? 'Adding...' : 'Add to Payroll'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Auto-Add Casual Employees Preview Dialog */}
      <Dialog open={isAutoAddPreviewOpen} onOpenChange={setIsAutoAddPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Auto-Add Casual Employees with Attendance</DialogTitle>
            <DialogDescription>
              Found {eligibleCasualEmployees.length} casual employees with attendance records for {payrollPeriod}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="max-h-60 overflow-y-auto border rounded-md p-3 space-y-3">
              {eligibleCasualEmployees.map((employee) => {
                const paymentType = employee.paymentType || 'Hourly';
                const calculatedPay = paymentType === 'Hourly' 
                  ? employee.totalHours * employee.hourlyRate
                  : paymentType === 'Daily'
                  ? employee.totalDays * employee.dailyRate
                  : employee.baseSalary;

                return (
                  <div key={employee.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{employee.name}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {paymentType}
                          </Badge>
                          <span className="text-xs text-gray-600">
                            {employee.attendanceRecords} attendance records
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-green-600">
                          S${calculatedPay.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-2 text-xs text-gray-600">
                      <div>
                        <span className="font-medium">Hours:</span> {employee.totalHours.toFixed(1)}
                      </div>
                      <div>
                        <span className="font-medium">Days:</span> {employee.totalDays}
                      </div>
                      <div>
                        <span className="font-medium">Rate:</span> S${
                          paymentType === 'Hourly' ? employee.hourlyRate.toFixed(2) + '/hr' :
                          paymentType === 'Daily' ? employee.dailyRate.toFixed(2) + '/day' :
                          employee.baseSalary.toFixed(2) + '/month'
                        }
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg">
              <div>
                <p className="font-medium text-blue-900">
                  Total: {eligibleCasualEmployees.length} employees
                </p>
                <p className="text-sm text-blue-700">
                  Estimated total amount: S${eligibleCasualEmployees.reduce((sum, emp) => {
                    const paymentType = emp.paymentType || 'Hourly';
                    const calculatedPay = paymentType === 'Hourly' 
                      ? emp.totalHours * emp.hourlyRate
                      : paymentType === 'Daily'
                      ? emp.totalDays * emp.dailyRate
                      : emp.baseSalary;
                    return sum + calculatedPay;
                  }, 0).toFixed(2)}
                </p>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setIsAutoAddPreviewOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={confirmAutoAddCasualEmployees}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isLoading ? 'Adding...' : 'Add All to Payroll'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PayrollEmployeeManager;
