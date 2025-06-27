import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DollarSign, Save, Check, ArrowLeft, CreditCard, FileText, Plus, Trash2, Edit } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useNavigate } from 'react-router-dom';
import { usePayroll } from '@/contexts/PayrollContext';
import { getEmployeeById } from '@/services/employeeService';
import { getEmployeeClaims, type Claim } from '@/services/claimsService';
import AddAllowanceDialog from '@/components/employee/AddAllowanceDialog';
import AddDeductionDialog from '@/components/employee/AddDeductionDialog';
import { AllowanceDeduction } from '@/types/employee';

const PayrollProcessing = () => {
  const navigate = useNavigate();
  const { 
    payrollState, 
    updateEmployeeSalary,
    updateEmployeeAllowances,
    updateEmployeeDeductions,
    updateCasualEmployeeHours,
    setPayrollStatus,
    savePayrollDraft
  } = usePayroll();
  
  const [currentStep, setCurrentStep] = useState<'processing' | 'payment' | 'cpf'>('processing');
  const [editingAllowance, setEditingAllowance] = useState<{employeeId: string, allowance: any} | null>(null);
  const [editingDeduction, setEditingDeduction] = useState<{employeeId: string, deduction: any} | null>(null);
  const [employeeClaims, setEmployeeClaims] = useState<{[key: string]: Claim[]}>({});
  const [showAddAllowanceDialog, setShowAddAllowanceDialog] = useState<{show: boolean, employeeId: string}>({show: false, employeeId: ''});
  const [showAddDeductionDialog, setShowAddDeductionDialog] = useState<{show: boolean, employeeId: string}>({show: false, employeeId: ''});

  // Load employee claims data
  useEffect(() => {
    const loadEmployeeClaims = async () => {
      const claimsData: {[key: string]: Claim[]} = {};
      
      for (const emp of [...payrollState.fullTimeEmployees, ...payrollState.casualEmployees]) {
        try {
          const claims = await getEmployeeClaims(emp.id);
          claimsData[emp.id] = claims;
        } catch (error) {
          console.error(`Error loading claims for employee ${emp.id}:`, error);
          claimsData[emp.id] = [];
        }
      }
      
      setEmployeeClaims(claimsData);
      console.log('Loaded employee claims:', claimsData);
    };

    if (payrollState.fullTimeEmployees.length > 0 || payrollState.casualEmployees.length > 0) {
      loadEmployeeClaims();
    }
  }, [payrollState.fullTimeEmployees, payrollState.casualEmployees]);

  // Log current state for debugging
  useEffect(() => {
    console.log('PayrollProcessing - Current state:', payrollState);
  }, [payrollState]);

  const handleSalaryChange = (employeeId: string, newSalary: number) => {
    console.log(`Updating salary for ${employeeId}: ${newSalary}`);
    updateEmployeeSalary(employeeId, newSalary);
  };

  const handleHoursChange = (employeeId: string, newHours: number) => {
    console.log(`Updating hours for ${employeeId}: ${newHours}`);
    updateCasualEmployeeHours(employeeId, newHours);
  };

  const handleRateChange = (employeeId: string, newRate: number) => {
    console.log(`Updating rate for ${employeeId}: ${newRate}`);
    const employee = payrollState.casualEmployees.find(emp => emp.id === employeeId);
    if (employee) {
      updateCasualEmployeeHours(employeeId, employee.hoursWorked, newRate);
    }
  };

  const handleAddAllowance = (employeeId: string, allowance: AllowanceDeduction) => {
    const empData = getEmployeeById(employeeId);
    if (!empData) return;
    
    const newAllowances = [
      ...empData.allowances.map(a => ({ name: a.name, amount: a.amount })),
      { name: allowance.name, amount: allowance.amount }
    ];
    
    updateEmployeeAllowances(employeeId, newAllowances);
    toast(`Added ${allowance.name} allowance`);
  };

  const handleAddDeduction = (employeeId: string, deduction: AllowanceDeduction) => {
    const empData = getEmployeeById(employeeId);
    if (!empData) return;
    
    const newDeductions = [
      ...empData.deductions.map(d => ({ name: d.name, amount: d.amount })),
      { name: deduction.name, amount: deduction.amount }
    ];
    
    updateEmployeeDeductions(employeeId, newDeductions);
    toast(`Added ${deduction.name} deduction`);
  };

  const removeAllowance = (employeeId: string, allowanceName: string) => {
    const empData = getEmployeeById(employeeId);
    if (!empData) return;
    
    const newAllowances = empData.allowances
      .filter(a => a.name !== allowanceName)
      .map(a => ({ name: a.name, amount: a.amount }));
    
    updateEmployeeAllowances(employeeId, newAllowances);
    toast(`Removed ${allowanceName} allowance`);
  };

  const editAllowance = (employeeId: string, allowanceName: string, newAmount: number) => {
    const empData = getEmployeeById(employeeId);
    if (!empData) return;
    
    const newAllowances = empData.allowances.map(a => 
      a.name === allowanceName ? { name: a.name, amount: newAmount } : { name: a.name, amount: a.amount }
    );
    
    updateEmployeeAllowances(employeeId, newAllowances);
    setEditingAllowance(null);
    toast(`Updated ${allowanceName} allowance`);
  };

  const removeDeduction = (employeeId: string, deductionName: string) => {
    const empData = getEmployeeById(employeeId);
    if (!empData) return;
    
    const newDeductions = empData.deductions
      .filter(d => d.name !== deductionName)
      .map(d => ({ name: d.name, amount: d.amount }));
    
    updateEmployeeDeductions(employeeId, newDeductions);
    toast(`Removed ${deductionName} deduction`);
  };

  const editDeduction = (employeeId: string, deductionName: string, newAmount: number) => {
    const empData = getEmployeeById(employeeId);
    if (!empData) return;
    
    const newDeductions = empData.deductions.map(d => 
      d.name === deductionName ? { name: d.name, amount: newAmount } : { name: d.name, amount: d.amount }
    );
    
    updateEmployeeDeductions(employeeId, newDeductions);
    setEditingDeduction(null);
    toast(`Updated ${deductionName} deduction`);
  };

  const getApprovedClaimsTotal = (employeeId: string): number => {
    const claims = employeeClaims[employeeId] || [];
    return claims
      .filter(claim => claim.status === 'Approved')
      .reduce((sum, claim) => sum + claim.amount, 0);
  };

  const handleSaveDraft = () => {
    savePayrollDraft();
    toast("Payroll draft saved successfully");
  };

  const handleApprovePayroll = () => {
    setPayrollStatus('approved');
    setCurrentStep('payment');
    toast("Payroll approved. Moving to payment processing.");
  };

  const handleProcessPayment = () => {
    setPayrollStatus('paid');
    setCurrentStep('cpf');
    toast("Payments processed. Moving to CPF submission.");
  };

  const handleCPFSubmission = () => {
    setPayrollStatus('completed');
    toast("CPF contributions submitted. Payroll process completed.");
    navigate('/payroll');
  };

  const handleBackStep = () => {
    if (currentStep === 'payment') {
      setCurrentStep('processing');
      setPayrollStatus('draft');
    } else if (currentStep === 'cpf') {
      setCurrentStep('payment');
      setPayrollStatus('approved');
    }
  };

  const renderProcessingStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5" />
            <span>Full-Time Employees ({payrollState.fullTimeEmployees.length})</span>
          </CardTitle>
          <CardDescription>Review full-time employee salaries, allowances, deductions, and claims</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {payrollState.fullTimeEmployees.map((employee) => {
              const empData = getEmployeeById(employee.id);
              const approvedClaims = getApprovedClaimsTotal(employee.id);
              const totalAllowances = employee.allowances.reduce((sum, a) => sum + a.amount, 0);
              const totalDeductions = employee.deductions.reduce((sum, d) => sum + d.amount, 0);
              
              return (
                <div key={employee.id} className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-4">{employee.name}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Basic Salary</h4>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          value={employee.baseSalary}
                          onChange={(e) => handleSalaryChange(employee.id, parseFloat(e.target.value) || 0)}
                          className="w-full"
                        />
                        <Edit className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">Allowances</h4>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowAddAllowanceDialog({show: true, employeeId: employee.id})}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="space-y-1">
                        {employee.allowances.map((allowance, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span 
                              className="cursor-pointer hover:text-blue-600"
                              onClick={() => setEditingAllowance({employeeId: employee.id, allowance})}
                            >
                              {allowance.name}: S${allowance.amount}
                            </span>
                            <Button size="sm" variant="ghost" onClick={() => removeAllowance(employee.id, allowance.name)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">Deductions</h4>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowAddDeductionDialog({show: true, employeeId: employee.id})}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="space-y-1">
                        {employee.deductions.map((deduction, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span 
                              className="cursor-pointer hover:text-blue-600"
                              onClick={() => setEditingDeduction({employeeId: employee.id, deduction})}
                            >
                              {deduction.name}: S${deduction.amount}
                            </span>
                            <Button size="sm" variant="ghost" onClick={() => removeDeduction(employee.id, deduction.name)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Claims</h4>
                      <div className="space-y-1 text-sm">
                        <div className="font-medium text-green-600">
                          Approved: S${approvedClaims.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {(employeeClaims[employee.id] || []).filter(c => c.status === 'Approved').length} claims
                        </div>
                        <div className="text-xs text-gray-400">
                          (Not subject to CPF)
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Summary</h4>
                      <div className="space-y-1 text-sm">
                        <div>Allowances: S${totalAllowances.toFixed(2)}</div>
                        <div>Deductions: S${totalDeductions.toFixed(2)}</div>
                        <div>Claims: S${approvedClaims.toFixed(2)}</div>
                        <div>CPF: S${employee.cpfEmployer.toFixed(2)}</div>
                        <div className="font-medium">Net: S${(employee.netPay + approvedClaims).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5" />
            <span>Casual Employees ({payrollState.casualEmployees.length})</span>
          </CardTitle>
          <CardDescription>Review casual employee payment rates, work periods, and claims</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {payrollState.casualEmployees.map((employee) => {
              const approvedClaims = getApprovedClaimsTotal(employee.id);
              const empData = getEmployeeById(employee.id);
              const totalAllowances = employee.allowances.reduce((sum, a) => sum + a.amount, 0);
              const totalDeductions = employee.deductions.reduce((sum, d) => sum + d.amount, 0);
              
              return (
                <div key={employee.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">{employee.name}</h3>
                    <Badge variant="outline">{employee.paymentType} Payment</Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Payment Rate</h4>
                      {employee.paymentType === 'Hourly' && (
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            value={employee.hourlyRate}
                            onChange={(e) => handleRateChange(employee.id, parseFloat(e.target.value) || 0)}
                            className="w-full"
                          />
                          <span className="text-sm text-gray-500">/hr</span>
                        </div>
                      )}
                      {employee.paymentType === 'Daily' && (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              value={employee.dailyWeekdayRate || employee.dailyRate}
                              onChange={(e) => {
                                // Handle weekday rate change
                              }}
                              className="w-full"
                              placeholder="Weekday"
                            />
                            <span className="text-xs text-gray-500">Weekday</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              value={employee.dailyWeekendRate || employee.dailyRate}
                              onChange={(e) => {
                                // Handle weekend rate change
                              }}
                              className="w-full"
                              placeholder="Weekend"
                            />
                            <span className="text-xs text-gray-500">Weekend</span>
                          </div>
                        </div>
                      )}
                      {employee.paymentType === 'Monthly' && (
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            value={employee.baseSalary || 0}
                            onChange={(e) => handleSalaryChange(employee.id, parseFloat(e.target.value) || 0)}
                            className="w-full"
                          />
                          <span className="text-sm text-gray-500">/month</span>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Work Period</h4>
                      <div className="space-y-1 text-sm">
                        {employee.paymentType === 'Hourly' && (
                          <div>
                            <Input
                              type="number"
                              value={employee.hoursWorked}
                              onChange={(e) => handleHoursChange(employee.id, parseFloat(e.target.value) || 0)}
                              className="w-full"
                            />
                            <span className="text-xs text-gray-500">Hours worked</span>
                          </div>
                        )}
                        {employee.paymentType === 'Daily' && (
                          <div>
                            <div>{employee.daysWorked} days</div>
                            <div className="text-xs text-gray-500">From attendance</div>
                          </div>
                        )}
                        {employee.paymentType === 'Monthly' && (
                          <div>
                            <div>Monthly</div>
                            <div className="text-xs text-gray-500">Fixed monthly salary</div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">Allowances</h4>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowAddAllowanceDialog({show: true, employeeId: employee.id})}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="space-y-1">
                        {employee.allowances.map((allowance, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span>{allowance.name}: S${allowance.amount}</span>
                            <Button size="sm" variant="ghost" onClick={() => removeAllowance(employee.id, allowance.name)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">Deductions</h4>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowAddDeductionDialog({show: true, employeeId: employee.id})}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="space-y-1">
                        {employee.deductions.map((deduction, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span>{deduction.name}: S${deduction.amount}</span>
                            <Button size="sm" variant="ghost" onClick={() => removeDeduction(employee.id, deduction.name)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Claims</h4>
                      <div className="space-y-1 text-sm">
                        <div className="font-medium text-green-600">
                          Approved: S${approvedClaims.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {(employeeClaims[employee.id] || []).filter(c => c.status === 'Approved').length} claims
                        </div>
                        <div className="text-xs text-gray-400">
                          (Not subject to CPF)
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Summary</h4>
                      <div className="space-y-1 text-sm">
                        <div>Gross: S${employee.grossPay.toFixed(2)}</div>
                        <div>Allowances: S${totalAllowances.toFixed(2)}</div>
                        <div>Deductions: S${totalDeductions.toFixed(2)}</div>
                        <div>Employee CPF: S${employee.employeeCPF.toFixed(2)}</div>
                        <div>Employer CPF: S${employee.employerCPF.toFixed(2)}</div>
                        <div>Claims: S${approvedClaims.toFixed(2)}</div>
                        <div className="font-medium">Total Pay: S${(employee.totalPay + approvedClaims).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={handleSaveDraft}>
          <Save className="w-4 h-4 mr-2" />
          Save Draft
        </Button>
        <Button onClick={handleApprovePayroll}>
          <Check className="w-4 h-4 mr-2" />
          Approve Payroll
        </Button>
      </div>
    </div>
  );

  const renderPaymentStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="w-5 h-5" />
          <span>Payment Processing</span>
        </CardTitle>
        <CardDescription>Process payments to employee bank accounts</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Payment Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Claims</TableHead>
              <TableHead>Bank Name</TableHead>
              <TableHead>Bank Account</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payrollState.fullTimeEmployees.map((employee) => {
              const empData = getEmployeeById(employee.id);
              const approvedClaims = getApprovedClaimsTotal(employee.id);
              return (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>Full-Time</TableCell>
                  <TableCell>{employee.paymentType}</TableCell>
                  <TableCell>S${(employee.netPay + approvedClaims).toFixed(2)}</TableCell>
                  <TableCell>S${approvedClaims.toFixed(2)}</TableCell>
                  <TableCell>{empData?.bankName}</TableCell>
                  <TableCell>{empData?.bankAccount}</TableCell>
                  <TableCell>
                    <Badge variant={payrollState.status === 'paid' || payrollState.status === 'completed' ? 'default' : 'secondary'}>
                      {payrollState.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {payrollState.casualEmployees.map((employee) => {
              const empData = getEmployeeById(employee.id);
              const approvedClaims = getApprovedClaimsTotal(employee.id);
              return (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>Casual</TableCell>
                  <TableCell>{employee.paymentType}</TableCell>
                  <TableCell>S${(employee.totalPay + approvedClaims).toFixed(2)}</TableCell>
                  <TableCell>S${approvedClaims.toFixed(2)}</TableCell>
                  <TableCell>{empData?.bankName}</TableCell>
                  <TableCell>{empData?.bankAccount}</TableCell>
                  <TableCell>
                    <Badge variant={payrollState.status === 'paid' || payrollState.status === 'completed' ? 'default' : 'secondary'}>
                      {payrollState.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="flex justify-between mt-4">
          <Button variant="outline" onClick={handleBackStep}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button onClick={handleProcessPayment}>
            <CreditCard className="w-4 h-4 mr-2" />
            Process Payments
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderCPFStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="w-5 h-5" />
          <span>CPF Contribution Submission</span>
        </CardTitle>
        <CardDescription>Submit CPF contributions for employees (Claims are not subject to CPF)</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee Name</TableHead>
              <TableHead>NRIC/FIN</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Payment Type</TableHead>
              <TableHead>Basic/Rate</TableHead>
              <TableHead>Gross Pay</TableHead>
              <TableHead>Claims (Non-CPF)</TableHead>
              <TableHead>Employee CPF</TableHead>
              <TableHead>Employer CPF</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payrollState.fullTimeEmployees.map((employee) => {
              const empData = getEmployeeById(employee.id);
              const totalAllowances = employee.allowances.reduce((sum, a) => sum + a.amount, 0);
              const grossSalary = (employee.baseSalary || 0) + totalAllowances;
              const approvedClaims = getApprovedClaimsTotal(employee.id);
              return (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>{empData?.nric}</TableCell>
                  <TableCell>Full-Time</TableCell>
                  <TableCell>{employee.paymentType}</TableCell>
                  <TableCell>S${(employee.baseSalary || 0).toFixed(2)}</TableCell>
                  <TableCell>S${grossSalary.toFixed(2)}</TableCell>
                  <TableCell>S${approvedClaims.toFixed(2)}</TableCell>
                  <TableCell>S${employee.cpfEmployee.toFixed(2)}</TableCell>
                  <TableCell>S${employee.cpfEmployer.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={payrollState.status === 'completed' ? 'default' : 'secondary'}>
                      {payrollState.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {payrollState.casualEmployees.map((employee) => {
              const empData = getEmployeeById(employee.id);
              const approvedClaims = getApprovedClaimsTotal(employee.id);
              let rateDisplay = '';
              if (employee.paymentType === 'Hourly') {
                rateDisplay = `S${(employee.hourlyRate || 0).toFixed(2)}/hr`;
              } else if (employee.paymentType === 'Daily') {
                rateDisplay = `S${(employee.dailyWeekdayRate || employee.dailyRate || 0).toFixed(2)}/day`;
              } else {
                rateDisplay = `S${(employee.baseSalary || 0).toFixed(2)}/month`;
              }
              
              return (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>{empData?.nric}</TableCell>
                  <TableCell>Casual</TableCell>
                  <TableCell>{employee.paymentType}</TableCell>
                  <TableCell>{rateDisplay}</TableCell>
                  <TableCell>S${employee.grossPay.toFixed(2)}</TableCell>
                  <TableCell>S${approvedClaims.toFixed(2)}</TableCell>
                  <TableCell>S${employee.employeeCPF.toFixed(2)}</TableCell>
                  <TableCell>S${employee.employerCPF.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={payrollState.status === 'completed' ? 'default' : 'secondary'}>
                      {payrollState.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="flex justify-between mt-4">
          <Button variant="outline" onClick={handleBackStep}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button onClick={handleCPFSubmission}>
            <FileText className="w-4 h-4 mr-2" />
            Submit CPF Contributions
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Payroll Processing</h1>
                <p className="text-gray-600">Process payroll for {payrollState.currentPeriod}</p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={
                  currentStep === 'processing' ? 'default' : 
                  currentStep === 'payment' ? 'secondary' : 'outline'
                }>
                  Processing
                </Badge>
                <Badge variant={
                  currentStep === 'payment' ? 'default' : 
                  currentStep === 'cpf' ? 'secondary' : 'outline'
                }>
                  Payment
                </Badge>
                <Badge variant={currentStep === 'cpf' ? 'default' : 'outline'}>
                  CPF
                </Badge>
              </div>
            </div>

            {currentStep === 'processing' && renderProcessingStep()}
            {currentStep === 'payment' && renderPaymentStep()}
            {currentStep === 'cpf' && renderCPFStep()}
          </div>

          {/* Dialogs */}
          <AddAllowanceDialog
            open={showAddAllowanceDialog.show}
            onOpenChange={(open) => setShowAddAllowanceDialog({show: open, employeeId: ''})}
            onAdd={(allowance) => handleAddAllowance(showAddAllowanceDialog.employeeId, allowance)}
          />

          <AddDeductionDialog
            open={showAddDeductionDialog.show}
            onOpenChange={(open) => setShowAddDeductionDialog({show: open, employeeId: ''})}
            onAdd={(deduction) => handleAddDeduction(showAddDeductionDialog.employeeId, deduction)}
          />

          {/* Edit Allowance Dialog */}
          <Dialog open={!!editingAllowance} onOpenChange={() => setEditingAllowance(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Allowance</DialogTitle>
                <DialogDescription>
                  Update the amount for {editingAllowance?.allowance.name}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  type="number"
                  defaultValue={editingAllowance?.allowance.amount}
                  onChange={(e) => {
                    if (editingAllowance) {
                      editingAllowance.allowance.amount = parseFloat(e.target.value) || 0;
                    }
                  }}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingAllowance(null)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  if (editingAllowance) {
                    editAllowance(
                      editingAllowance.employeeId,
                      editingAllowance.allowance.name,
                      editingAllowance.allowance.amount
                    );
                  }
                }}>
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Deduction Dialog */}
          <Dialog open={!!editingDeduction} onOpenChange={() => setEditingDeduction(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Deduction</DialogTitle>
                <DialogDescription>
                  Update the amount for {editingDeduction?.deduction.name}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  type="number"
                  defaultValue={editingDeduction?.deduction.amount}
                  onChange={(e) => {
                    if (editingDeduction) {
                      editingDeduction.deduction.amount = parseFloat(e.target.value) || 0;
                    }
                  }}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingDeduction(null)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  if (editingDeduction) {
                    editDeduction(
                      editingDeduction.employeeId,
                      editingDeduction.deduction.name,
                      editingDeduction.deduction.amount
                    );
                  }
                }}>
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
};

export default PayrollProcessing;
