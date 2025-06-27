import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DollarSign, Save, Check, ArrowLeft, CreditCard, FileText, Plus, Trash2, Edit, Users, Calculator } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useNavigate } from 'react-router-dom';
import { usePayroll } from '@/contexts/PayrollContext';
import { getEmployees, getEmployeeById } from '@/services/employeeService';
import { getEmployeeClaims, type Claim } from '@/services/claimsService';
import AddAllowanceDialog from '@/components/employee/AddAllowanceDialog';
import AddDeductionDialog from '@/components/employee/AddDeductionDialog';
import { AllowanceDeduction } from '@/types/employee';
import { supabase } from '@/integrations/supabase/client';

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
  const [employeeClaims, setEmployeeClaims] = useState<{[key: string]: Claim[]}>({});
  const [showAddAllowanceDialog, setShowAddAllowanceDialog] = useState<{show: boolean, employeeId: string}>({show: false, employeeId: ''});
  const [showAddDeductionDialog, setShowAddDeductionDialog] = useState<{show: boolean, employeeId: string}>({show: false, employeeId: ''});
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [employeeAllowances, setEmployeeAllowances] = useState<{[key: string]: any[]}>({});
  const [employeeDeductions, setEmployeeDeductions] = useState<{[key: string]: any[]}>({});
  const [loading, setLoading] = useState(true);

  // Load all employee data with allowances and deductions
  useEffect(() => {
    const loadAllEmployeeData = async () => {
      try {
        setLoading(true);
        console.log('Loading all employee data...');
        
        // Get all employees
        const employees = await getEmployees();
        setAllEmployees(employees);
        console.log('Loaded employees:', employees);

        // Load allowances and deductions for each employee
        const allowancesData: {[key: string]: any[]} = {};
        const deductionsData: {[key: string]: any[]} = {};
        const claimsData: {[key: string]: Claim[]} = {};

        for (const emp of employees) {
          // Load allowances
          const { data: empAllowances } = await supabase
            .from('allowances')
            .select('*')
            .eq('employee_id', emp.id);
          allowancesData[emp.id] = empAllowances || [];

          // Load deductions
          const { data: empDeductions } = await supabase
            .from('deductions')
            .select('*')
            .eq('employee_id', emp.id);
          deductionsData[emp.id] = empDeductions || [];

          // Load claims
          try {
            const claims = await getEmployeeClaims(emp.id);
            claimsData[emp.id] = claims;
          } catch (error) {
            console.error(`Error loading claims for employee ${emp.id}:`, error);
            claimsData[emp.id] = [];
          }
        }

        setEmployeeAllowances(allowancesData);
        setEmployeeDeductions(deductionsData);
        setEmployeeClaims(claimsData);
        
        console.log('Loaded allowances:', allowancesData);
        console.log('Loaded deductions:', deductionsData);
        console.log('Loaded claims:', claimsData);
      } catch (error) {
        console.error('Error loading employee data:', error);
        toast('Error loading employee data');
      } finally {
        setLoading(false);
      }
    };

    loadAllEmployeeData();
  }, []);

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
    const employee = allEmployees.find(emp => emp.id === employeeId);
    if (employee) {
      updateCasualEmployeeHours(employeeId, employee.hoursWorked || 0, newRate);
    }
  };

  const handleAddAllowance = async (employeeId: string, allowance: AllowanceDeduction) => {
    const empData = await getEmployeeById(employeeId);
    if (!empData) return;
    
    const newAllowances = [
      ...empData.allowances.map(a => ({ name: a.name, amount: a.amount })),
      { name: allowance.name, amount: allowance.amount }
    ];
    
    updateEmployeeAllowances(employeeId, newAllowances);
    toast(`Added ${allowance.name} allowance`);
  };

  const handleAddDeduction = async (employeeId: string, deduction: AllowanceDeduction) => {
    const empData = await getEmployeeById(employeeId);
    if (!empData) return;
    
    const newDeductions = [
      ...empData.deductions.map(d => ({ name: d.name, amount: d.amount })),
      { name: deduction.name, amount: deduction.amount }
    ];
    
    updateEmployeeDeductions(employeeId, newDeductions);
    toast(`Added ${deduction.name} deduction`);
  };

  const removeAllowance = async (employeeId: string, allowanceName: string) => {
    const empData = await getEmployeeById(employeeId);
    if (!empData) return;
    
    const newAllowances = empData.allowances
      .filter(a => a.name !== allowanceName)
      .map(a => ({ name: a.name, amount: a.amount }));
    
    updateEmployeeAllowances(employeeId, newAllowances);
    toast(`Removed ${allowanceName} allowance`);
  };

  const editAllowance = async (employeeId: string, allowanceName: string, newAmount: number) => {
    const empData = await getEmployeeById(employeeId);
    if (!empData) return;
    
    const newAllowances = empData.allowances.map(a => 
      a.name === allowanceName ? { name: a.name, amount: newAmount } : { name: a.name, amount: a.amount }
    );
    
    updateEmployeeAllowances(employeeId, newAllowances);
    setShowAddAllowanceDialog({show: false, employeeId: ''});
    toast(`Updated ${allowanceName} allowance`);
  };

  const removeDeduction = async (employeeId: string, deductionName: string) => {
    const empData = await getEmployeeById(employeeId);
    if (!empData) return;
    
    const newDeductions = empData.deductions
      .filter(d => d.name !== deductionName)
      .map(d => ({ name: d.name, amount: d.amount }));
    
    updateEmployeeDeductions(employeeId, newDeductions);
    toast(`Removed ${deductionName} deduction`);
  };

  const editDeduction = async (employeeId: string, deductionName: string, newAmount: number) => {
    const empData = await getEmployeeById(employeeId);
    if (!empData) return;
    
    const newDeductions = empData.deductions.map(d => 
      d.name === deductionName ? { name: d.name, amount: newAmount } : { name: d.name, amount: d.amount }
    );
    
    updateEmployeeDeductions(employeeId, newDeductions);
    setShowAddDeductionDialog({show: false, employeeId: ''});
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-lg text-gray-600">Loading payroll data...</p>
                <p className="text-sm text-gray-500">Please wait while we fetch employee information</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const renderProcessingStep = () => {
    const fullTimeEmployees = allEmployees.filter(emp => emp.type === 'Full-Time');
    const casualEmployees = allEmployees.filter(emp => emp.type === 'Casual');
    
    return (
      <div className="space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm text-blue-600">Total Employees</p>
                  <p className="text-2xl font-bold text-blue-900">{allEmployees.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="w-8 h-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm text-green-600">Total Payroll</p>
                  <p className="text-2xl font-bold text-green-900">
                    S${(payrollState.fullTimeEmployees.reduce((sum, emp) => sum + emp.netPay, 0) + 
                        payrollState.casualEmployees.reduce((sum, emp) => sum + emp.totalPay, 0)).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calculator className="w-8 h-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm text-purple-600">Total CPF</p>
                  <p className="text-2xl font-bold text-purple-900">
                    S${(payrollState.fullTimeEmployees.reduce((sum, emp) => sum + emp.cpfEmployer, 0) + 
                        payrollState.casualEmployees.reduce((sum, emp) => sum + emp.employerCPF, 0)).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Full-Time Employees */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
            <CardTitle className="flex items-center space-x-3 text-blue-900">
              <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                {fullTimeEmployees.length}
              </div>
              <span>Full-Time Employees</span>
            </CardTitle>
            <CardDescription className="text-blue-700">Review salaries, allowances, deductions, and claims for full-time staff</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {fullTimeEmployees.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Employee</TableHead>
                      <TableHead className="font-semibold">Basic Salary</TableHead>
                      <TableHead className="font-semibold">Allowances</TableHead>
                      <TableHead className="font-semibold">Deductions</TableHead>
                      <TableHead className="font-semibold">Claims</TableHead>
                      <TableHead className="font-semibold">CPF</TableHead>
                      <TableHead className="font-semibold">Net Pay</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fullTimeEmployees.map((employee) => {
                      const allowances = employeeAllowances[employee.id] || [];
                      const deductions = employeeDeductions[employee.id] || [];
                      const approvedClaims = getApprovedClaimsTotal(employee.id);
                      const totalAllowances = allowances.reduce((sum, a) => sum + Number(a.amount), 0);
                      const totalDeductions = deductions.reduce((sum, d) => sum + Number(d.amount), 0);
                      
                      return (
                        <TableRow key={employee.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 font-medium text-sm">
                                  {employee.name.split(' ').map((n: string) => n[0]).join('')}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium">{employee.name}</p>
                                <p className="text-xs text-gray-500">{employee.id}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-lg">
                              S${(employee.baseSalary || 0).toLocaleString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              {allowances.length > 0 ? (
                                <div>
                                  {allowances.map((allowance, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-green-50 px-2 py-1 rounded text-sm">
                                      <span className="text-green-700">{allowance.name}</span>
                                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                                        S${Number(allowance.amount).toLocaleString()}
                                      </Badge>
                                    </div>
                                  ))}
                                  <div className="border-t pt-2 font-medium">
                                    Total: S${totalAllowances.toLocaleString()}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-500 text-sm">No allowances</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              {deductions.length > 0 ? (
                                <div>
                                  {deductions.map((deduction, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-red-50 px-2 py-1 rounded text-sm">
                                      <span className="text-red-700">{deduction.name}</span>
                                      <Badge variant="destructive" className="bg-red-100 text-red-800">
                                        S${Number(deduction.amount).toLocaleString()}
                                      </Badge>
                                    </div>
                                  ))}
                                  <div className="border-t pt-2 font-medium">
                                    Total: S${totalDeductions.toLocaleString()}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-500 text-sm">No deductions</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-center">
                              <div className="bg-blue-50 px-3 py-2 rounded">
                                <span className="font-medium text-blue-900">S${approvedClaims.toFixed(2)}</span>
                                <p className="text-xs text-blue-600 mt-1">
                                  {(employeeClaims[employee.id] || []).filter(c => c.status === 'Approved').length} claims
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-center">
                              <div className="text-sm text-gray-600">Employer: S${((employee.baseSalary || 0) * 0.17).toFixed(2)}</div>
                              <div className="text-sm text-gray-600">Employee: S${((employee.baseSalary || 0) * 0.20).toFixed(2)}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-right">
                              <div className="text-xl font-bold text-green-600">
                                S${((employee.baseSalary || 0) + totalAllowances - totalDeductions - ((employee.baseSalary || 0) * 0.20) + approvedClaims).toLocaleString()}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">No full-time employees found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Casual Employees */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100">
            <CardTitle className="flex items-center space-x-3 text-purple-900">
              <div className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                {casualEmployees.length}
              </div>
              <span>Casual Employees</span>
            </CardTitle>
            <CardDescription className="text-purple-700">Review rates, work periods, allowances, and claims for casual staff</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {casualEmployees.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Employee</TableHead>
                      <TableHead className="font-semibold">Payment Type</TableHead>
                      <TableHead className="font-semibold">Rate</TableHead>
                      <TableHead className="font-semibold">Allowances</TableHead>
                      <TableHead className="font-semibold">Deductions</TableHead>
                      <TableHead className="font-semibold">Claims</TableHead>
                      <TableHead className="font-semibold">CPF</TableHead>
                      <TableHead className="font-semibold">Net Pay</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {casualEmployees.map((employee) => {
                      const allowances = employeeAllowances[employee.id] || [];
                      const deductions = employeeDeductions[employee.id] || [];
                      const approvedClaims = getApprovedClaimsTotal(employee.id);
                      const totalAllowances = allowances.reduce((sum, a) => sum + Number(a.amount), 0);
                      const totalDeductions = deductions.reduce((sum, d) => sum + Number(d.amount), 0);
                      
                      return (
                        <TableRow key={employee.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                <span className="text-purple-600 font-medium text-sm">
                                  {employee.name.split(' ').map((n: string) => n[0]).join('')}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium">{employee.name}</p>
                                <p className="text-xs text-gray-500">{employee.id}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-purple-200 text-purple-700">
                              {employee.paymentType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {employee.paymentType === 'Hourly' && (
                                <div className="font-medium">S${employee.hourlyRate}/hr</div>
                              )}
                              {employee.paymentType === 'Daily' && (
                                <div className="space-y-1">
                                  <div className="text-sm">WD: S${employee.dailyWeekdayRate || employee.dailyRate}</div>
                                  <div className="text-sm">WE: S${employee.dailyWeekendRate || employee.dailyRate}</div>
                                </div>
                              )}
                              {employee.paymentType === 'Monthly' && (
                                <div className="font-medium">S${employee.baseSalary}/month</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              {allowances.length > 0 ? (
                                <div>
                                  {allowances.map((allowance, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-green-50 px-2 py-1 rounded text-sm">
                                      <span className="text-green-700">{allowance.name}</span>
                                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                                        S${Number(allowance.amount).toLocaleString()}
                                      </Badge>
                                    </div>
                                  ))}
                                  <div className="border-t pt-2 font-medium">
                                    Total: S${totalAllowances.toLocaleString()}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-500 text-sm">No allowances</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              {deductions.length > 0 ? (
                                <div>
                                  {deductions.map((deduction, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-red-50 px-2 py-1 rounded text-sm">
                                      <span className="text-red-700">{deduction.name}</span>
                                      <Badge variant="destructive" className="bg-red-100 text-red-800">
                                        S${Number(deduction.amount).toLocaleString()}
                                      </Badge>
                                    </div>
                                  ))}
                                  <div className="border-t pt-2 font-medium">
                                    Total: S${totalDeductions.toLocaleString()}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-500 text-sm">No deductions</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-center">
                              <div className="bg-blue-50 px-3 py-2 rounded">
                                <span className="font-medium text-blue-900">S${approvedClaims.toFixed(2)}</span>
                                <p className="text-xs text-blue-600 mt-1">
                                  {(employeeClaims[employee.id] || []).filter(c => c.status === 'Approved').length} claims
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-center text-sm">
                              <div className="text-gray-600">Calculated based on gross pay</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-right">
                              <div className="text-xl font-bold text-green-600">
                                S${(2000 + totalAllowances - totalDeductions + approvedClaims).toLocaleString()}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">No casual employees found</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className="flex justify-end space-x-4 bg-white p-6 rounded-lg shadow-lg border">
          <Button variant="outline" onClick={handleSaveDraft} size="lg">
            <Save className="w-5 h-5 mr-2" />
            Save Draft
          </Button>
          <Button onClick={handleApprovePayroll} size="lg" className="bg-green-600 hover:bg-green-700">
            <Check className="w-5 h-5 mr-2" />
            Approve Payroll
          </Button>
        </div>
      </div>
    );
  };

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
              const approvedClaims = getApprovedClaimsTotal(employee.id);
              return (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>Full-Time</TableCell>
                  <TableCell>{employee.paymentType}</TableCell>
                  <TableCell>S${(employee.netPay + approvedClaims).toFixed(2)}</TableCell>
                  <TableCell>S${approvedClaims.toFixed(2)}</TableCell>
                  <TableCell>Loading...</TableCell>
                  <TableCell>Loading...</TableCell>
                  <TableCell>
                    <Badge variant={payrollState.status === 'paid' || payrollState.status === 'completed' ? 'default' : 'secondary'}>
                      {payrollState.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {payrollState.casualEmployees.map((employee) => {
              const approvedClaims = getApprovedClaimsTotal(employee.id);
              return (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>Casual</TableCell>
                  <TableCell>{employee.paymentType}</TableCell>
                  <TableCell>S${(employee.totalPay + approvedClaims).toFixed(2)}</TableCell>
                  <TableCell>S${approvedClaims.toFixed(2)}</TableCell>
                  <TableCell>Loading...</TableCell>
                  <TableCell>Loading...</TableCell>
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
              const totalAllowances = employee.allowances.reduce((sum, a) => sum + a.amount, 0);
              const grossSalary = (employee.baseSalary || 0) + totalAllowances;
              const approvedClaims = getApprovedClaimsTotal(employee.id);
              return (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>Loading...</TableCell>
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
                  <TableCell>Loading...</TableCell>
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
            <div className="bg-white p-6 rounded-lg shadow-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Payroll Processing</h1>
                  <p className="text-gray-600 mt-2">Process payroll for {payrollState.currentPeriod}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge variant={currentStep === 'processing' ? 'default' : 'secondary'} className="px-4 py-2">
                    1. Processing
                  </Badge>
                  <Badge variant={currentStep === 'payment' ? 'default' : 'secondary'} className="px-4 py-2">
                    2. Payment
                  </Badge>
                  <Badge variant={currentStep === 'cpf' ? 'default' : 'secondary'} className="px-4 py-2">
                    3. CPF
                  </Badge>
                </div>
              </div>
            </div>

            {currentStep === 'processing' && renderProcessingStep()}
            {currentStep === 'payment' && renderPaymentStep()}
            {currentStep === 'cpf' && renderCPFStep()}

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
          </div>
        </main>
      </div>
    </div>
  );
};

export default PayrollProcessing;
