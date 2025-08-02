import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DollarSign, ArrowLeft, CreditCard, FileText, Users, Calculator, Edit, Trash2, UserPlus } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useNavigate } from 'react-router-dom';
import { usePayroll } from '@/contexts/PayrollContext';
import { getEmployees, getEmployeeById } from '@/services/employeeService';
import { getEmployeeClaims, type Claim } from '@/services/claimsService';
import { supabase } from '@/integrations/supabase/client';
import PayrollPeriodSelector from '@/components/payroll/PayrollPeriodSelector';
import EditSalaryDialog from '@/components/payroll/EditSalaryDialog';
import EditAllowancesDialog from '@/components/payroll/EditAllowancesDialog';
import EditDeductionsDialog from '@/components/payroll/EditDeductionsDialog';
import { format } from 'date-fns';
import { calculateCPF, calculateAge } from '@/utils/cpfCalculations';
import { calculateFullTimePayroll, calculateCasualPayroll } from '@/utils/payrollCalculations';

const PayrollProcessing = () => {
  const navigate = useNavigate();
  const { 
    payrollState, 
    setPayrollStatus,
    savePayrollToSupabase,
    autoAddCasualEmployeesWithAttendance,
    addCasualEmployee,
    removeCasualEmployee
  } = usePayroll();

  // Bottom action bar states
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isApprovingPayroll, setIsApprovingPayroll] = useState(false);
  
  const [currentStep, setCurrentStep] = useState<'processing' | 'payment' | 'cpf'>('processing');
  const [selectedPeriod, setSelectedPeriod] = useState(format(new Date(), 'MMMM yyyy'));
  const [employeeClaims, setEmployeeClaims] = useState<{[key: string]: Claim[]}>({});
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [employeeAllowances, setEmployeeAllowances] = useState<{[key: string]: any[]}>({});
  const [employeeDeductions, setEmployeeDeductions] = useState<{[key: string]: any[]}>({});
  const [loading, setLoading] = useState(true);

  // Edit dialog states
  const [editSalaryDialog, setEditSalaryDialog] = useState<{
    isOpen: boolean;
    employeeId: string;
    employeeName: string;
    currentSalary: number;
    employeeType: 'Full-Time' | 'Casual';
    paymentType: 'Monthly' | 'Hourly' | 'Daily';
  }>({
    isOpen: false,
    employeeId: '',
    employeeName: '',
    currentSalary: 0,
    employeeType: 'Full-Time',
    paymentType: 'Monthly'
  });

  const [editAllowancesDialog, setEditAllowancesDialog] = useState<{
    isOpen: boolean;
    employeeId: string;
    employeeName: string;
    allowances: any[];
  }>({
    isOpen: false,
    employeeId: '',
    employeeName: '',
    allowances: []
  });

  const [editDeductionsDialog, setEditDeductionsDialog] = useState<{
    isOpen: boolean;
    employeeId: string;
    employeeName: string;
    deductions: any[];
  }>({
    isOpen: false,
    employeeId: '',
    employeeName: '',
    deductions: []
  });

  // Load all employee data with allowances and deductions
  useEffect(() => {
    const loadAllEmployeeData = async () => {
      try {
        setLoading(true);
        console.log(`Loading employee data for period: ${selectedPeriod}`);
        
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
  }, [selectedPeriod]);

  const handleEditSalary = (employee: any) => {
    const currentSalary = employee.type === 'Full-Time' 
      ? employee.baseSalary || 0
      : employee.paymentType === 'Hourly' 
        ? employee.hourlyRate || 0
        : employee.paymentType === 'Daily'
          ? employee.dailyWeekdayRate || employee.dailyRate || 0
          : employee.baseSalary || 0;

    setEditSalaryDialog({
      isOpen: true,
      employeeId: employee.id,
      employeeName: employee.name,
      currentSalary,
      employeeType: employee.type,
      paymentType: employee.paymentType
    });
  };

  const handleEditAllowances = (employee: any) => {
    const allowances = employeeAllowances[employee.id] || [];
    setEditAllowancesDialog({
      isOpen: true,
      employeeId: employee.id,
      employeeName: employee.name,
      allowances: allowances.map(a => ({
        id: a.id.toString(),
        name: a.name,
        amount: Number(a.amount),
        type: a.type || 'Fixed'
      }))
    });
  };

  const handleEditDeductions = (employee: any) => {
    const deductions = employeeDeductions[employee.id] || [];
    setEditDeductionsDialog({
      isOpen: true,
      employeeId: employee.id,
      employeeName: employee.name,
      deductions: deductions.map(d => ({
        id: d.id.toString(),
        name: d.name,
        amount: Number(d.amount),
        type: d.type || 'Fixed'
      }))
    });
  };

  const handleSalarySave = async (newSalary: number) => {
    // Update in database
    const { error } = await supabase
      .from('employees')
      .update({
        [editSalaryDialog.employeeType === 'Full-Time' ? 'base_salary' : 
         editSalaryDialog.paymentType === 'Hourly' ? 'hourly_rate' :
         editSalaryDialog.paymentType === 'Daily' ? 'daily_weekday_rate' : 'base_salary']: newSalary
      })
      .eq('id', editSalaryDialog.employeeId);

    if (error) {
      console.error('Error updating salary:', error);
      toast('Error updating salary');
      return;
    }

    // Update local state
    setAllEmployees(prev => prev.map(emp => 
      emp.id === editSalaryDialog.employeeId 
        ? { 
            ...emp, 
            ...(editSalaryDialog.employeeType === 'Full-Time' 
              ? { baseSalary: newSalary }
              : editSalaryDialog.paymentType === 'Hourly'
                ? { hourlyRate: newSalary }
                : editSalaryDialog.paymentType === 'Daily'
                  ? { dailyWeekdayRate: newSalary }
                  : { baseSalary: newSalary }
            )
          }
        : emp
    ));
  };

  const handleAllowancesSave = async (allowances: any[]) => {
    // Delete existing allowances
    await supabase
      .from('allowances')
      .delete()
      .eq('employee_id', editAllowancesDialog.employeeId);

    // Insert new allowances
    if (allowances.length > 0) {
      const { error } = await supabase
        .from('allowances')
        .insert(allowances.map(a => ({
          employee_id: editAllowancesDialog.employeeId,
          name: a.name,
          amount: a.amount,
          type: a.type
        })));

      if (error) {
        console.error('Error updating allowances:', error);
        toast('Error updating allowances');
        return;
      }
    }

    // Update local state
    setEmployeeAllowances(prev => ({
      ...prev,
      [editAllowancesDialog.employeeId]: allowances
    }));
  };

  const handleDeductionsSave = async (deductions: any[]) => {
    // Delete existing deductions
    await supabase
      .from('deductions')
      .delete()
      .eq('employee_id', editDeductionsDialog.employeeId);

    // Insert new deductions
    if (deductions.length > 0) {
      const { error } = await supabase
        .from('deductions')
        .insert(deductions.map(d => ({
          employee_id: editDeductionsDialog.employeeId,
          name: d.name,
          amount: d.amount,
          type: d.type
        })));

      if (error) {
        console.error('Error updating deductions:', error);
        toast('Error updating deductions');
        return;
      }
    }

    // Update local state
    setEmployeeDeductions(prev => ({
      ...prev,
      [editDeductionsDialog.employeeId]: deductions
    }));
  };

  const handleRemoveEmployee = async (employeeId: string, employeeName: string) => {
    if (window.confirm(`Are you sure you want to remove ${employeeName} from this payroll period?`)) {
      try {
        // Remove from local state
        setAllEmployees(prev => prev.filter(emp => emp.id !== employeeId));
        toast.success(`${employeeName} removed from payroll`);
      } catch (error) {
        console.error('Error removing employee:', error);
        toast.error('Error removing employee');
      }
    }
  };

  const getApprovedClaimsTotal = (employeeId: string): number => {
    const claims = employeeClaims[employeeId] || [];
    return claims
      .filter(claim => claim.status === 'Approved')
      .reduce((sum, claim) => sum + claim.amount, 0);
  };

  // Bottom action bar functions
  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      await savePayrollToSupabase();
      toast.success('Draft saved successfully');
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save draft');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleApprovePayroll = async () => {
    setIsApprovingPayroll(true);
    try {
      setPayrollStatus('approved');
      await savePayrollToSupabase();
      toast.success('Payroll approved successfully');
    } catch (error) {
      console.error('Error approving payroll:', error);
      toast.error('Failed to approve payroll');
    } finally {
      setIsApprovingPayroll(false);
    }
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
            <div className="text-center flex items-center justify-center h-full">
              <div>
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
        {/* Payroll Period Selector */}
        <PayrollPeriodSelector 
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
        />

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
                    S${(
                      payrollState.fullTimeEmployees.reduce((sum, emp) => sum + (emp.cpfEmployer || 0) + (emp.cpfEmployee || 0), 0) + 
                      payrollState.casualEmployees.reduce((sum, emp) => sum + (emp.employerCPF || 0) + (emp.employeeCPF || 0), 0)
                    ).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Full-Time Employees - More compact layout */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
            <CardTitle className="flex items-center space-x-3 text-blue-900">
              <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                {fullTimeEmployees.length}
              </div>
              <span>Full-Time Employees - {selectedPeriod}</span>
            </CardTitle>
            <CardDescription className="text-blue-700">Review and edit salaries, allowances, deductions, and claims for full-time staff</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {fullTimeEmployees.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold min-w-[180px]">Employee</TableHead>
                        <TableHead className="font-semibold min-w-[120px]">Basic Salary</TableHead>
                        <TableHead className="font-semibold min-w-[150px]">Allowances</TableHead>
                        <TableHead className="font-semibold min-w-[150px]">Deductions</TableHead>
                        <TableHead className="font-semibold min-w-[100px]">Claims</TableHead>
                        <TableHead className="font-semibold min-w-[120px]">CPF</TableHead>
                        <TableHead className="font-semibold text-right min-w-[120px]">Net Pay</TableHead>
                        <TableHead className="font-semibold text-center min-w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fullTimeEmployees.map((employee) => {
                        const allowances = employeeAllowances[employee.id] || [];
                        const deductions = employeeDeductions[employee.id] || [];
                        const approvedClaims = getApprovedClaimsTotal(employee.id);
                        const totalAllowances = allowances.reduce((sum, a) => sum + Number(a.amount), 0);
                        const totalDeductions = deductions.reduce((sum, d) => sum + Number(d.amount), 0);
                        
                        // Calculate proper CPF using the 2025 rate table
                        const employeeAge = employee.dateOfBirth ? calculateAge(employee.dateOfBirth) : 30;
                        const cpfCalc = calculateCPF(employee.baseSalary || 0, employee.residencyStatus || 'Singapore Citizen', employeeAge);
                        
                        // Calculate net pay using proper payroll calculation
                        const payrollCalc = calculateFullTimePayroll(employee, approvedClaims, 0);
                        const netPay = payrollCalc.netSalary;
                        
                        return (
                          <TableRow key={employee.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs">
                                  <span className="text-blue-600 font-medium">
                                    {employee.name.split(' ').map((n: string) => n[0]).join('')}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate">{employee.name}</p>
                                  <p className="text-xs text-gray-500">{employee.id}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <div className="font-medium">
                                  S${(employee.baseSalary || 0).toLocaleString()}
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleEditSalary(employee)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center space-x-1">
                                  {allowances.length > 0 ? (
                                    <div className="text-sm">
                                      <div className="font-medium text-green-700">
                                        S${totalAllowances.toLocaleString()}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {allowances.length} item(s)
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-sm">None</span>
                                  )}
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleEditAllowances(employee)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center space-x-1">
                                  {deductions.length > 0 ? (
                                    <div className="text-sm">
                                      <div className="font-medium text-red-700">
                                        S${totalDeductions.toLocaleString()}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {deductions.length} item(s)
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-sm">None</span>
                                  )}
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleEditDeductions(employee)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-center">
                                <div className="bg-blue-50 px-2 py-1 rounded text-sm">
                                  <span className="font-medium text-blue-900">S${approvedClaims.toFixed(2)}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs space-y-1">
                                <div className="text-gray-600">ER: S${cpfCalc.employerCPF.toFixed(2)}</div>
                                <div className="text-gray-600">EE: S${cpfCalc.employeeCPF.toFixed(2)}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="font-bold text-green-600">
                                S${netPay.toLocaleString()}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleRemoveEmployee(employee.id, employee.name)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
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

        {/* Casual Employees - More compact layout */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100">
            <CardTitle className="flex items-center space-x-3 text-purple-900">
              <div className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                {casualEmployees.length}
              </div>
              <span>Casual Employees - {selectedPeriod}</span>
            </CardTitle>
            <CardDescription className="text-purple-700">Review and edit rates, work periods, allowances, and claims for casual staff</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {casualEmployees.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold min-w-[180px]">Employee</TableHead>
                        <TableHead className="font-semibold min-w-[100px]">Type</TableHead>
                        <TableHead className="font-semibold min-w-[120px]">Rate</TableHead>
                        <TableHead className="font-semibold min-w-[150px]">Allowances</TableHead>
                        <TableHead className="font-semibold min-w-[150px]">Deductions</TableHead>
                        <TableHead className="font-semibold min-w-[100px]">Claims</TableHead>
                        <TableHead className="font-semibold min-w-[80px]">CPF</TableHead>
                        <TableHead className="font-semibold text-right min-w-[120px]">Net Pay</TableHead>
                        <TableHead className="font-semibold text-center min-w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {casualEmployees.map((employee) => {
                        const allowances = employeeAllowances[employee.id] || [];
                        const deductions = employeeDeductions[employee.id] || [];
                        const approvedClaims = getApprovedClaimsTotal(employee.id);
                        const totalAllowances = allowances.reduce((sum, a) => sum + Number(a.amount), 0);
                        const totalDeductions = deductions.reduce((sum, d) => sum + Number(d.amount), 0);
                        
                        // Calculate proper CPF and net pay for casual employees
                        const employeeAge = employee.dateOfBirth ? calculateAge(employee.dateOfBirth) : 30;
                        
                        // Calculate attendance-based pay for casual employees
                        const casualPayrollCalc = calculateCasualPayroll(employee, undefined, undefined, approvedClaims);
                        const netPay = casualPayrollCalc.netSalary;
                        
                        return (
                          <TableRow key={employee.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-xs">
                                  <span className="text-purple-600 font-medium">
                                    {employee.name.split(' ').map((n: string) => n[0]).join('')}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate">{employee.name}</p>
                                  <p className="text-xs text-gray-500">{employee.id}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="border-purple-200 text-purple-700 text-xs">
                                {employee.paymentType}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <div className="text-sm">
                                  {employee.paymentType === 'Hourly' && (
                                    <div>S${employee.hourlyRate}/hr</div>
                                  )}
                                  {employee.paymentType === 'Daily' && (
                                    <div className="space-y-1">
                                      <div className="text-xs">WD: S${employee.dailyWeekdayRate || employee.dailyRate}</div>
                                      <div className="text-xs">WE: S${employee.dailyWeekendRate || employee.dailyRate}</div>
                                    </div>
                                  )}
                                  {employee.paymentType === 'Monthly' && (
                                    <div>S${employee.baseSalary}/month</div>
                                  )}
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleEditSalary(employee)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center space-x-1">
                                  {allowances.length > 0 ? (
                                    <div className="text-sm">
                                      <div className="font-medium text-green-700">
                                        S${totalAllowances.toLocaleString()}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {allowances.length} item(s)
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-sm">None</span>
                                  )}
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleEditAllowances(employee)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center space-x-1">
                                  {deductions.length > 0 ? (
                                    <div className="text-sm">
                                      <div className="font-medium text-red-700">
                                        S${totalDeductions.toLocaleString()}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {deductions.length} item(s)
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-sm">None</span>
                                  )}
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleEditDeductions(employee)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-center">
                                <div className="bg-blue-50 px-2 py-1 rounded text-sm">
                                  <span className="font-medium text-blue-900">S${approvedClaims.toFixed(2)}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs space-y-1">
                                <div className="text-gray-600">ER: S${employee.employerCPF?.toFixed(2) || '0.00'}</div>
                                <div className="text-gray-600">EE: S${employee.employeeCPF?.toFixed(2) || '0.00'}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="font-bold text-green-600">
                                S${netPay.toLocaleString()}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleRemoveEmployee(employee.id, employee.name)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
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
        
        {/* Action buttons removed as requested */}
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
                  <TableCell>Monthly</TableCell>
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
                  <TableCell>{employee.paymentType || 'Hourly'}</TableCell>
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
              const approvedClaims = getApprovedClaimsTotal(employee.id);
              return (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>Loading...</TableCell>
                  <TableCell>Full-Time</TableCell>
                  <TableCell>Monthly</TableCell>
                  <TableCell>S${(employee.baseSalary || 0).toFixed(2)}</TableCell>
                  <TableCell>S${employee.grossPay.toFixed(2)}</TableCell>
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
              
              return (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>Loading...</TableCell>
                  <TableCell>Casual</TableCell>
                  <TableCell>{employee.paymentType || 'Hourly'}</TableCell>
                  <TableCell>S${(employee.hourlyRate || 0).toFixed(2)}</TableCell>
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
                  <p className="text-gray-600 mt-2">Process payroll for {selectedPeriod}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <Button
                    onClick={async () => {
                      try {
                        console.log('🔄 Manually triggering auto-add casual employees');
                        const result = await autoAddCasualEmployeesWithAttendance();
                        if (result.addedCount > 0) {
                          toast.success(`Added ${result.addedCount} casual employees with attendance to payroll`);
                        } else {
                          toast.info('No eligible casual employees with attendance found');
                        }
                      } catch (error) {
                        console.error('Error auto-adding employees:', error);
                        toast.error('Failed to add employees to payroll');
                      }
                    }}
                    variant="outline"
                    className="flex items-center space-x-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Auto-Add Casual Employees</span>
                  </Button>
                  <Button
                    onClick={async () => {
                      try {
                        console.log('🔄 Manual Fix: Adding Wang Pot Chien...');
                        
                        // Check if Wang Pot Chien is already in payroll
                        const wangExists = payrollState.casualEmployees.some(emp => emp.employeeId === 'EMP1752646101747');
                        if (wangExists) {
                          console.log('⚠️ Wang Pot Chien already exists in payroll');
                          toast.info('Wang Pot Chien is already in payroll');
                          return;
                        }

                        // Remove Wang Pot Chien if already exists to ensure clean add
                        const existingWang = payrollState.casualEmployees.find(emp => emp.employeeId === 'EMP1752646101747');
                        if (existingWang) {
                          console.log('🔄 Removing existing Wang Pot Chien entry');
                          removeCasualEmployee(existingWang.id);
                        }

                        // Add Wang Pot Chien with correct August 2025 attendance data (5.55 hours)
                        await addCasualEmployee({
                          employeeId: 'EMP1752646101747',
                          name: 'Wang Pot Chien',
                          hourlyRate: 14.00,
                          hoursWorked: 5.55, // Actual August 2025 hours from database
                          daysWorked: 1,
                          paymentType: 'Hourly',
                          dailyRate: 0,
                          baseSalary: 0
                        });

                        console.log('✅ Manual Fix: Wang Pot Chien added successfully with 5.55 hours');
                        toast.success('Wang Pot Chien added to payroll with 5.55 hours at $14/hr');
                      } catch (error) {
                        console.error('❌ Manual Fix: Error adding Wang Pot Chien:', error);
                        toast.error('Failed to add Wang Pot Chien');
                      }
                    }}
                    variant="secondary"
                    className="flex items-center space-x-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Fix Wang Pot Chien</span>
                  </Button>
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

            {/* Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-40">
              <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Status: <Badge variant={payrollState.status === 'approved' ? 'default' : 'secondary'}>
                      {payrollState.status.charAt(0).toUpperCase() + payrollState.status.slice(1)}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="outline"
                      onClick={handleSaveDraft}
                      disabled={isSavingDraft || isApprovingPayroll}
                      className="min-w-[120px]"
                    >
                      {isSavingDraft ? (
                        <>
                          <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          Save Draft
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleApprovePayroll}
                      disabled={isSavingDraft || isApprovingPayroll || payrollState.status === 'approved'}
                      className="min-w-[140px]"
                    >
                      {isApprovingPayroll ? (
                        <>
                          <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                          Approving...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Approve Payroll
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Add padding to prevent content overlap */}
            <div className="h-20"></div>

            {/* Edit Dialogs */}
            <EditSalaryDialog
              isOpen={editSalaryDialog.isOpen}
              onClose={() => setEditSalaryDialog(prev => ({ ...prev, isOpen: false }))}
              employeeName={editSalaryDialog.employeeName}
              currentSalary={editSalaryDialog.currentSalary}
              employeeType={editSalaryDialog.employeeType}
              paymentType={editSalaryDialog.paymentType}
              onSave={handleSalarySave}
            />

            <EditAllowancesDialog
              isOpen={editAllowancesDialog.isOpen}
              onClose={() => setEditAllowancesDialog(prev => ({ ...prev, isOpen: false }))}
              employeeName={editAllowancesDialog.employeeName}
              allowances={editAllowancesDialog.allowances}
              onSave={handleAllowancesSave}
            />

            <EditDeductionsDialog
              isOpen={editDeductionsDialog.isOpen}
              onClose={() => setEditDeductionsDialog(prev => ({ ...prev, isOpen: false }))}
              employeeName={editDeductionsDialog.employeeName}
              deductions={editDeductionsDialog.deductions}
              onSave={handleDeductionsSave}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default PayrollProcessing;
