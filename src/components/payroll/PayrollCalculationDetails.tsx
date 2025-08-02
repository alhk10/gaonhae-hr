import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calculator, Eye, AlertTriangle, Info, Edit, Check, X, Plus, Trash2 } from 'lucide-react';
import type { PayrollEmployee, CasualEmployeePayroll, EmployeeAllowance, EmployeeDeduction } from '@/types/employee';
import { formatCurrency } from '@/utils/payrollCalculations';

interface PayrollCalculationDetailsProps {
  employee: PayrollEmployee | CasualEmployeePayroll;
  calculationErrors?: string[];
  calculationWarnings?: string[];
  onUpdateBaseSalary?: (employeeId: string, baseSalary: number) => void;
  onUpdateAllowances?: (employeeId: string, allowances: EmployeeAllowance[]) => void;
  onUpdateDeductions?: (employeeId: string, deductions: EmployeeDeduction[]) => void;
  onUpdateHoursWorked?: (employeeId: string, hours: number) => void;
  onUpdateHourlyRate?: (employeeId: string, rate: number) => void;
}

export const PayrollCalculationDetails: React.FC<PayrollCalculationDetailsProps> = ({ 
  employee, 
  calculationErrors = [], 
  calculationWarnings = [],
  onUpdateBaseSalary,
  onUpdateAllowances,
  onUpdateDeductions,
  onUpdateHoursWorked,
  onUpdateHourlyRate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditingBaseSalary, setIsEditingBaseSalary] = useState(false);
  const [editedBaseSalary, setEditedBaseSalary] = useState(employee.baseSalary || 0);
  const [isEditingHoursWorked, setIsEditingHoursWorked] = useState(false);
  const [editedHoursWorked, setEditedHoursWorked] = useState((employee as any).hoursWorked || 0);
  const [isEditingHourlyRate, setIsEditingHourlyRate] = useState(false);
  const [editedHourlyRate, setEditedHourlyRate] = useState((employee as any).hourlyRate || 0);
  const [editingAllowanceId, setEditingAllowanceId] = useState<string | null>(null);
  const [editingDeductionId, setEditingDeductionId] = useState<string | null>(null);
  const [isAddingAllowance, setIsAddingAllowance] = useState(false);
  const [isAddingDeduction, setIsAddingDeduction] = useState(false);
  const [editedAllowances, setEditedAllowances] = useState<{[key: string]: {name: string, amount: number}}>({});
  const [editedDeductions, setEditedDeductions] = useState<{[key: string]: {name: string, amount: number}}>({});
  const [newAllowance, setNewAllowance] = useState({name: '', amount: 0});
  const [newDeduction, setNewDeduction] = useState({name: '', amount: 0});

  const isCasual = 'hoursWorked' in employee;

  const handleSaveBaseSalary = useCallback(() => {
    if (editedBaseSalary !== employee.baseSalary && onUpdateBaseSalary) {
      onUpdateBaseSalary(employee.id, editedBaseSalary);
    }
    setIsEditingBaseSalary(false);
  }, [editedBaseSalary, employee.baseSalary, employee.id, onUpdateBaseSalary]);

  const handleCancelEdit = useCallback(() => {
    setEditedBaseSalary(employee.baseSalary || 0);
    setIsEditingBaseSalary(false);
  }, [employee.baseSalary]);

  const handleSaveHoursWorked = useCallback(() => {
    if (editedHoursWorked !== (employee as any).hoursWorked && onUpdateHoursWorked) {
      onUpdateHoursWorked(employee.id, editedHoursWorked);
    }
    setIsEditingHoursWorked(false);
  }, [editedHoursWorked, (employee as any).hoursWorked, employee.id, onUpdateHoursWorked]);

  const handleCancelHoursWorkedEdit = useCallback(() => {
    setEditedHoursWorked((employee as any).hoursWorked || 0);
    setIsEditingHoursWorked(false);
  }, [(employee as any).hoursWorked]);

  const handleSaveHourlyRate = useCallback(() => {
    if (editedHourlyRate !== (employee as any).hourlyRate && onUpdateHourlyRate) {
      onUpdateHourlyRate(employee.id, editedHourlyRate);
    }
    setIsEditingHourlyRate(false);
  }, [editedHourlyRate, (employee as any).hourlyRate, employee.id, onUpdateHourlyRate]);

  const handleCancelHourlyRateEdit = useCallback(() => {
    setEditedHourlyRate((employee as any).hourlyRate || 0);
    setIsEditingHourlyRate(false);
  }, [(employee as any).hourlyRate]);

  const handleEditAllowance = useCallback((allowance: EmployeeAllowance) => {
    setEditedAllowances({
      ...editedAllowances,
      [allowance.id]: { name: allowance.name, amount: allowance.amount }
    });
    setEditingAllowanceId(allowance.id);
  }, [editedAllowances]);

  const handleSaveAllowance = useCallback((allowanceId: string) => {
    const editedData = editedAllowances[allowanceId];
    if (!editedData || !onUpdateAllowances) return;

    const updatedAllowances = employee.allowances.map(a => 
      a.id === allowanceId 
        ? { ...a, name: editedData.name, amount: editedData.amount }
        : a
    );
    onUpdateAllowances(employee.id, updatedAllowances);
    setEditingAllowanceId(null);
  }, [editedAllowances, employee.allowances, employee.id, onUpdateAllowances]);

  const handleCancelAllowanceEdit = useCallback((allowanceId: string) => {
    const { [allowanceId]: removed, ...rest } = editedAllowances;
    setEditedAllowances(rest);
    setEditingAllowanceId(null);
  }, [editedAllowances]);

  const handleDeleteAllowance = useCallback((allowanceId: string) => {
    if (!onUpdateAllowances) return;
    const updatedAllowances = employee.allowances.filter(a => a.id !== allowanceId);
    onUpdateAllowances(employee.id, updatedAllowances);
  }, [employee.allowances, employee.id, onUpdateAllowances]);

  const handleAddAllowance = useCallback(() => {
    if (!onUpdateAllowances || !newAllowance.name.trim()) return;
    
    const updatedAllowances = [
      ...employee.allowances,
      {
        id: Date.now().toString(),
        name: newAllowance.name,
        amount: newAllowance.amount,
        type: 'Manual' as const
      }
    ];
    onUpdateAllowances(employee.id, updatedAllowances);
    setNewAllowance({name: '', amount: 0});
    setIsAddingAllowance(false);
  }, [employee.allowances, employee.id, newAllowance, onUpdateAllowances]);

  const handleEditDeduction = useCallback((deduction: EmployeeDeduction) => {
    setEditedDeductions({
      ...editedDeductions,
      [deduction.id]: { name: deduction.name, amount: deduction.amount }
    });
    setEditingDeductionId(deduction.id);
  }, [editedDeductions]);

  const handleSaveDeduction = useCallback((deductionId: string) => {
    const editedData = editedDeductions[deductionId];
    if (!editedData || !onUpdateDeductions) return;

    const updatedDeductions = employee.deductions.map(d => 
      d.id === deductionId 
        ? { ...d, name: editedData.name, amount: editedData.amount }
        : d
    );
    onUpdateDeductions(employee.id, updatedDeductions);
    setEditingDeductionId(null);
  }, [editedDeductions, employee.deductions, employee.id, onUpdateDeductions]);

  const handleCancelDeductionEdit = useCallback((deductionId: string) => {
    const { [deductionId]: removed, ...rest } = editedDeductions;
    setEditedDeductions(rest);
    setEditingDeductionId(null);
  }, [editedDeductions]);

  const handleDeleteDeduction = useCallback((deductionId: string) => {
    if (!onUpdateDeductions) return;
    const updatedDeductions = employee.deductions.filter(d => d.id !== deductionId);
    onUpdateDeductions(employee.id, updatedDeductions);
  }, [employee.deductions, employee.id, onUpdateDeductions]);

  const handleAddDeduction = useCallback(() => {
    if (!onUpdateDeductions || !newDeduction.name.trim()) return;
    
    const updatedDeductions = [
      ...employee.deductions,
      {
        id: Date.now().toString(),
        name: newDeduction.name,
        amount: newDeduction.amount,
        type: 'Manual' as const
      }
    ];
    onUpdateDeductions(employee.id, updatedDeductions);
    setNewDeduction({name: '', amount: 0});
    setIsAddingDeduction(false);
  }, [employee.deductions, employee.id, newDeduction, onUpdateDeductions]);

  const renderFullTimeDetails = (emp: PayrollEmployee) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium text-sm text-gray-600 mb-2">Income</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between items-center">
              <span>Base Salary:</span>
              <div className="flex items-center space-x-2">
                {isEditingBaseSalary ? (
                  <div className="flex items-center space-x-1">
                    <Input
                      type="number"
                      value={editedBaseSalary}
                      onChange={(e) => setEditedBaseSalary(Number(e.target.value))}
                      className="w-24 h-6 text-xs"
                      step="0.01"
                    />
                    <Button size="sm" variant="ghost" onClick={handleSaveBaseSalary} className="h-6 w-6 p-0">
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-6 w-6 p-0">
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1">
                    <span>{formatCurrency(emp.baseSalary || 0)}</span>
                    {onUpdateBaseSalary && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => setIsEditingBaseSalary(true)}
                        className="h-6 w-6 p-0"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-between">
              <span>Allowances:</span>
              <span>{formatCurrency(typeof emp.allowances === 'number' ? emp.allowances : (Array.isArray(emp.allowances) ? emp.allowances.reduce((sum, a) => sum + a.amount, 0) : 0))}</span>
            </div>
            <div className="flex justify-between font-medium border-t pt-1">
              <span>Gross Pay:</span>
              <span>{formatCurrency(emp.grossPay || 0)}</span>
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="font-medium text-sm text-gray-600 mb-2">Deductions</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Employee CPF:</span>
              <span>{formatCurrency(emp.cpfEmployee || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Other Deductions:</span>
              <span>{formatCurrency(Array.isArray(emp.deductions) ? emp.deductions.reduce((sum, d) => sum + d.amount, 0) : 0)}</span>
            </div>
            <div className="flex justify-between font-medium border-t pt-1">
              <span>Total Deductions:</span>
              <span>{formatCurrency((emp.cpfEmployee || 0) + (Array.isArray(emp.deductions) ? emp.deductions.reduce((sum, d) => sum + d.amount, 0) : 0))}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="border-t pt-4">
        <div className="flex justify-between items-center">
          <span className="font-medium">Net Pay:</span>
          <span className="font-bold text-lg text-green-600">{formatCurrency(emp.netPay || 0)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600 mt-1">
          <span>Employer CPF:</span>
          <span>{formatCurrency(emp.cpfEmployer || 0)}</span>
        </div>
      </div>
    </div>
  );

  const renderCasualDetails = (emp: CasualEmployeePayroll) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium text-sm text-gray-600 mb-2">Work Details</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Payment Type:</span>
              <span>{emp.paymentType}</span>
            </div>
            {emp.paymentType === 'Hourly' && (
              <>
                <div className="flex justify-between items-center">
                  <span>Hours Worked:</span>
                  <div className="flex items-center space-x-2">
                    {isEditingHoursWorked ? (
                      <div className="flex items-center space-x-1">
                        <Input
                          type="number"
                          value={editedHoursWorked}
                          onChange={(e) => setEditedHoursWorked(Number(e.target.value))}
                          className="w-20 h-6 text-xs"
                          step="0.1"
                          min="0"
                        />
                        <Button size="sm" variant="ghost" onClick={handleSaveHoursWorked} className="h-6 w-6 p-0">
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleCancelHoursWorkedEdit} className="h-6 w-6 p-0">
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1">
                        <span>{emp.hoursWorked || 0}</span>
                        {onUpdateHoursWorked && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => setIsEditingHoursWorked(true)}
                            className="h-6 w-6 p-0"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span>Hourly Rate:</span>
                  <div className="flex items-center space-x-2">
                    {isEditingHourlyRate ? (
                      <div className="flex items-center space-x-1">
                        <Input
                          type="number"
                          value={editedHourlyRate}
                          onChange={(e) => setEditedHourlyRate(Number(e.target.value))}
                          className="w-24 h-6 text-xs"
                          step="0.01"
                          min="0"
                        />
                        <Button size="sm" variant="ghost" onClick={handleSaveHourlyRate} className="h-6 w-6 p-0">
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleCancelHourlyRateEdit} className="h-6 w-6 p-0">
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1">
                        <span>{formatCurrency(emp.hourlyRate || 0)}</span>
                        {onUpdateHourlyRate && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => setIsEditingHourlyRate(true)}
                            className="h-6 w-6 p-0"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
            {emp.paymentType === 'Daily' && (
              <>
                <div className="flex justify-between">
                  <span>Days Worked:</span>
                  <span>{emp.daysWorked || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Daily Rate:</span>
                  <span>{formatCurrency(emp.dailyRate || 0)}</span>
                </div>
              </>
            )}
          </div>
        </div>
        
        <div>
          <h4 className="font-medium text-sm text-gray-600 mb-2">Calculation</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Base Pay:</span>
              <span>{formatCurrency(emp.totalPay || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Employee CPF:</span>
              <span>{formatCurrency(emp.employeeCPF || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Employer CPF:</span>
              <span>{formatCurrency(emp.employerCPF || 0)}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="border-t pt-4">
        <div className="flex justify-between items-center">
          <span className="font-medium">Total Pay:</span>
          <span className="font-bold text-lg text-green-600">{formatCurrency(emp.totalPay || 0)}</span>
        </div>
      </div>
    </div>
  );

  const hasIssues = calculationErrors.length > 0 || calculationWarnings.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-auto p-1">
          <Eye className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Calculator className="w-5 h-5 mr-2" />
            Payroll Calculation Details - {employee.name}
          </DialogTitle>
          <DialogDescription>
            Detailed breakdown of payroll calculations for this employee
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Employee Type Badge */}
          <div className="flex items-center space-x-2">
            <Badge variant="outline">
              {isCasual ? `Casual - ${(employee as CasualEmployeePayroll).paymentType}` : 'Full-Time'}
            </Badge>
            {hasIssues && (
              <Badge variant="outline" className="text-amber-600 border-amber-200">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Has Issues
              </Badge>
            )}
          </div>

          {/* Calculation Details */}
          {isCasual ? renderCasualDetails(employee as CasualEmployeePayroll) : renderFullTimeDetails(employee as PayrollEmployee)}

          {/* Allowances Breakdown */}
          <Card className="bg-gray-50">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Allowances Breakdown</CardTitle>
              {onUpdateAllowances && !isAddingAllowance && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsAddingAllowance(true)}
                  className="h-6 w-6 p-0"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {employee.allowances && employee.allowances.map((allowance) => (
                  <div key={allowance.id} className="flex items-center justify-between text-sm group">
                    {editingAllowanceId === allowance.id ? (
                      <div className="flex items-center gap-2 w-full">
                        <Input 
                          value={editedAllowances[allowance.id]?.name || ''} 
                          onChange={(e) => setEditedAllowances({
                            ...editedAllowances,
                            [allowance.id]: { 
                              ...editedAllowances[allowance.id], 
                              name: e.target.value 
                            }
                          })}
                          className="h-6 text-xs flex-1"
                          placeholder="Allowance name"
                        />
                        <Input 
                          type="number" 
                          value={editedAllowances[allowance.id]?.amount || 0} 
                          onChange={(e) => setEditedAllowances({
                            ...editedAllowances,
                            [allowance.id]: { 
                              ...editedAllowances[allowance.id], 
                              amount: parseFloat(e.target.value) || 0 
                            }
                          })}
                          className="h-6 text-xs w-20"
                          step="0.01"
                        />
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleSaveAllowance(allowance.id)}
                          className="h-6 w-6 p-0 text-green-600"
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleCancelAllowanceEdit(allowance.id)}
                          className="h-6 w-6 p-0 text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span>{allowance.name}:</span>
                        <div className="flex items-center gap-1">
                          <span>{formatCurrency(allowance.amount)}</span>
                          {onUpdateAllowances && (
                            <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleEditAllowance(allowance)}
                                className="h-4 w-4 p-0"
                              >
                                <Edit className="w-2 h-2" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleDeleteAllowance(allowance.id)}
                                className="h-4 w-4 p-0 text-red-600"
                              >
                                <Trash2 className="w-2 h-2" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
                
                {isAddingAllowance && (
                  <div className="flex items-center gap-2 border-t pt-2">
                    <Input 
                      value={newAllowance.name} 
                      onChange={(e) => setNewAllowance({...newAllowance, name: e.target.value})}
                      className="h-6 text-xs flex-1"
                      placeholder="Allowance name"
                    />
                    <Input 
                      type="number" 
                      value={newAllowance.amount} 
                      onChange={(e) => setNewAllowance({...newAllowance, amount: parseFloat(e.target.value) || 0})}
                      className="h-6 text-xs w-20"
                      step="0.01"
                      placeholder="Amount"
                    />
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleAddAllowance}
                      className="h-6 w-6 p-0 text-green-600"
                    >
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setIsAddingAllowance(false);
                        setNewAllowance({name: '', amount: 0});
                      }}
                      className="h-6 w-6 p-0 text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
                
                {(!employee.allowances || employee.allowances.length === 0) && !isAddingAllowance && (
                  <div className="text-xs text-gray-500 italic">No allowances</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Deductions Breakdown */}
          <Card className="bg-gray-50">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Deductions Breakdown</CardTitle>
              {onUpdateDeductions && !isAddingDeduction && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsAddingDeduction(true)}
                  className="h-6 w-6 p-0"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {employee.deductions && employee.deductions.map((deduction) => (
                  <div key={deduction.id} className="flex items-center justify-between text-sm group">
                    {editingDeductionId === deduction.id ? (
                      <div className="flex items-center gap-2 w-full">
                        <Input 
                          value={editedDeductions[deduction.id]?.name || ''} 
                          onChange={(e) => setEditedDeductions({
                            ...editedDeductions,
                            [deduction.id]: { 
                              ...editedDeductions[deduction.id], 
                              name: e.target.value 
                            }
                          })}
                          className="h-6 text-xs flex-1"
                          placeholder="Deduction name"
                        />
                        <Input 
                          type="number" 
                          value={editedDeductions[deduction.id]?.amount || 0} 
                          onChange={(e) => setEditedDeductions({
                            ...editedDeductions,
                            [deduction.id]: { 
                              ...editedDeductions[deduction.id], 
                              amount: parseFloat(e.target.value) || 0 
                            }
                          })}
                          className="h-6 text-xs w-20"
                          step="0.01"
                        />
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleSaveDeduction(deduction.id)}
                          className="h-6 w-6 p-0 text-green-600"
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleCancelDeductionEdit(deduction.id)}
                          className="h-6 w-6 p-0 text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span>{deduction.name}:</span>
                        <div className="flex items-center gap-1">
                          <span>{formatCurrency(deduction.amount)}</span>
                          {onUpdateDeductions && (
                            <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleEditDeduction(deduction)}
                                className="h-4 w-4 p-0"
                              >
                                <Edit className="w-2 h-2" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleDeleteDeduction(deduction.id)}
                                className="h-4 w-4 p-0 text-red-600"
                              >
                                <Trash2 className="w-2 h-2" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
                
                {isAddingDeduction && (
                  <div className="flex items-center gap-2 border-t pt-2">
                    <Input 
                      value={newDeduction.name} 
                      onChange={(e) => setNewDeduction({...newDeduction, name: e.target.value})}
                      className="h-6 text-xs flex-1"
                      placeholder="Deduction name"
                    />
                    <Input 
                      type="number" 
                      value={newDeduction.amount} 
                      onChange={(e) => setNewDeduction({...newDeduction, amount: parseFloat(e.target.value) || 0})}
                      className="h-6 text-xs w-20"
                      step="0.01"
                      placeholder="Amount"
                    />
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleAddDeduction}
                      className="h-6 w-6 p-0 text-green-600"
                    >
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setIsAddingDeduction(false);
                        setNewDeduction({name: '', amount: 0});
                      }}
                      className="h-6 w-6 p-0 text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
                
                {(!employee.deductions || employee.deductions.length === 0) && !isAddingDeduction && (
                  <div className="text-xs text-gray-500 italic">No deductions</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Validation Issues */}
          {calculationErrors.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-800 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Calculation Errors
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="text-sm text-red-700 space-y-1">
                  {calculationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {calculationWarnings.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-yellow-800 flex items-center">
                  <Info className="w-4 h-4 mr-1" />
                  Calculation Warnings
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="text-sm text-yellow-700 space-y-1">
                  {calculationWarnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PayrollCalculationDetails;