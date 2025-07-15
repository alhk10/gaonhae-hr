import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Users, DollarSign, AlertTriangle } from 'lucide-react';
import { usePayroll } from '@/contexts/PayrollContext';
import { toast } from '@/components/ui/sonner';
import PayrollCalculationDetails from './PayrollCalculationDetails';
import PayrollValidationSummary from './PayrollValidationSummary';
import { validateEmployeeForPayroll } from '@/utils/payrollCalculations';

interface PayrollEmployeeManagerProps {
  payrollPeriod: string;
}

const PayrollEmployeeManager: React.FC<PayrollEmployeeManagerProps> = ({ payrollPeriod }) => {
  const { payrollState, addEmployeesToPayroll, removeEmployeeFromPayroll, refreshAvailableEmployees, isLoading } = usePayroll();
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  // Validate all employees and collect issues
  const validationIssues = [...payrollState.fullTimeEmployees, ...payrollState.casualEmployees]
    .map(emp => {
      const employeeProfile = payrollState.availableEmployees.find(e => e.id === emp.id);
      if (!employeeProfile) return null;
      
      const validation = validateEmployeeForPayroll(employeeProfile);
      if (!validation.isValid || validation.errors.length > 0) {
        return {
          employeeId: emp.id,
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

  const availableForAdd = payrollState.availableEmployees.filter(emp => 
    !payrollState.fullTimeEmployees.some(existing => existing.id === emp.id) &&
    !payrollState.casualEmployees.some(existing => existing.id === emp.id)
  );

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
                  const hasValidationIssues = validationIssues.some(issue => issue.employeeId === employee.id);
                  const validationIssue = validationIssues.find(issue => issue.employeeId === employee.id);
                  
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
                              employee={employee}
                              calculationErrors={validationIssue?.errors}
                              calculationWarnings={validationIssue?.warnings}
                            />
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Base: S${(employee.basicSalary || 0).toLocaleString()} • 
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
                        onClick={() => handleRemoveEmployee(employee.id, employee.name)}
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
                  const hasValidationIssues = validationIssues.some(issue => issue.employeeId === employee.id);
                  const validationIssue = validationIssues.find(issue => issue.employeeId === employee.id);
                  
                  const paymentType = employee.paymentType || 'Hourly';
                  const rateDisplay = paymentType === 'Hourly' 
                    ? `${employee.hoursWorked}h @ S$${(employee.hourlyRate || 0).toFixed(2)}/hr`
                    : paymentType === 'Daily'
                    ? `${employee.daysWorked || 0} days @ S$${(employee.dailyRate || 0).toFixed(2)}/day`
                    : `Monthly: S$${(employee.baseSalary || 0).toFixed(2)}`;

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
                            <Badge variant="outline">{paymentType}</Badge>
                            <PayrollCalculationDetails 
                              employee={employee}
                              calculationErrors={validationIssue?.errors}
                              calculationWarnings={validationIssue?.warnings}
                            />
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{rateDisplay}</p>
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
                        onClick={() => handleRemoveEmployee(employee.id, employee.name)}
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
            <div className="max-h-60 overflow-y-auto border rounded-md p-3 space-y-2">
              {(payrollState.availableEmployees || []).filter(emp => 
                !payrollState.fullTimeEmployees.some(existing => existing.id === emp.id) &&
                !payrollState.casualEmployees.some(existing => existing.id === emp.id)
              ).length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">All employees are already in payroll</p>
                </div>
              ) : (
                (payrollState.availableEmployees || []).filter(emp => 
                  !payrollState.fullTimeEmployees.some(existing => existing.id === emp.id) &&
                  !payrollState.casualEmployees.some(existing => existing.id === emp.id)
                ).map((employee) => {
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
    </div>
  );
};

export default PayrollEmployeeManager;
