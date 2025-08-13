import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DollarSign, ArrowLeft, CreditCard, FileText, Users, Calculator, Edit, Trash2, UserPlus, Save, ArrowRight } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useNavigate } from 'react-router-dom';
import { usePayroll } from '@/contexts/PayrollContext';
import { getEmployees, getEmployeeById } from '@/services/employeeService';
import { getEmployeePayrollDataOptimized } from '@/services/payrollOptimizationService';
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
    removeCasualEmployee,
    addEmployeesToPayroll,
    setCurrentPeriod
  } = usePayroll();

  
  const [currentStep, setCurrentStep] = useState<'processing' | 'payment' | 'cpf'>('processing');
  const [selectedPeriod, setSelectedPeriod] = useState(format(new Date(), 'MMMM yyyy'));
  const [employeeClaims, setEmployeeClaims] = useState<{[key: string]: Claim[]}>({});
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [employeeAllowances, setEmployeeAllowances] = useState<{[key: string]: any[]}>({});
  const [employeeDeductions, setEmployeeDeductions] = useState<{[key: string]: any[]}>({});
  const [payrollData, setPayrollData] = useState<any>({});
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

  // Load all employee data with allowances and deductions - OPTIMIZED
  useEffect(() => {
    const loadAllEmployeeData = async () => {
      try {
        setLoading(true);
        console.log(`Loading employee data for period: ${selectedPeriod}`);
        console.log('DEBUG: Selected period format:', selectedPeriod);
        
        // Get all employees
        const employees = await getEmployees();
        setAllEmployees(employees);
        console.log('Loaded employees:', employees);

        if (employees.length > 0) {
          // Load all payroll data in a single optimized call
          const employeeIds = employees.map(emp => emp.id);
          console.log('DEBUG PayrollProcessing: About to call getEmployeePayrollDataOptimized');
          console.log('DEBUG PayrollProcessing: selectedPeriod =', selectedPeriod);
          console.log('DEBUG PayrollProcessing: employeeIds =', employeeIds);
          
          const optimizedPayrollData = await getEmployeePayrollDataOptimized(employeeIds, selectedPeriod);
          console.log('DEBUG PayrollProcessing: Received optimized payroll data:', optimizedPayrollData);
          
          setPayrollData(optimizedPayrollData);
          setEmployeeAllowances(optimizedPayrollData.allowances);
          setEmployeeDeductions(optimizedPayrollData.deductions);
          
          // Convert claims data to expected format
          const claimsData: {[key: string]: Claim[]} = {};
          Object.entries(optimizedPayrollData.claims).forEach(([empId, claims]) => {
            claimsData[empId] = claims.map(claim => ({
              id: claim.id,
              employeeId: claim.employee_id,
              employee: claim.employee_id, // Add missing employee field
              type: claim.type,
              amount: claim.amount,
              description: claim.description,
              status: claim.status,
              date: claim.submitted_date, // Add missing date field  
              submittedDate: claim.submitted_date,
              reviewedDate: claim.reviewed_date,
              reviewedBy: claim.reviewed_by,
              receiptUrl: claim.receipt_url
            }));
          });
          setEmployeeClaims(claimsData);
          
          // Store attendance data for casual employees
          if (optimizedPayrollData.attendance) {
            console.log('Loaded attendance data for period:', optimizedPayrollData.attendance);
          }
          
          // Clear existing payroll data and add employees for the current period only
          console.log('DEBUG PayrollProcessing: Clearing existing payroll data and adding employees...');
          
          // Update the period in context (this will clear existing employees)
          setCurrentPeriod(selectedPeriod);
          
          // Add all employees to payroll context so they appear in Payment Processing step
          const allEmployeeIds = employees.map(emp => emp.id);
          await addEmployeesToPayroll(allEmployeeIds);
          
          console.log('DEBUG PayrollProcessing: Added employees to payroll context');
          console.log('Loaded optimized payroll data');
        }
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
    
    console.log('DEBUG PayrollProcessing: All employees:', allEmployees);
    console.log('DEBUG PayrollProcessing: Full-time employees:', fullTimeEmployees);
    console.log('DEBUG PayrollProcessing: Casual employees:', casualEmployees);
    console.log('DEBUG PayrollProcessing: Payroll data:', payrollData);
    
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
                <Table className="table-fixed w-full">
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold w-[140px]">Employee</TableHead>
                        <TableHead className="font-semibold w-[100px]">Basic Salary</TableHead>
                        <TableHead className="font-semibold w-[120px]">Allowances</TableHead>
                        <TableHead className="font-semibold w-[120px]">Deductions</TableHead>
                        <TableHead className="font-semibold w-[80px]">Claims</TableHead>
                        <TableHead className="font-semibold text-right w-[100px]">Net Pay</TableHead>
                        <TableHead className="font-semibold text-center w-[60px]">Actions</TableHead>
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
                            <TableCell className="truncate">
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{employee.name}</p>
                                <p className="text-xs text-gray-500 truncate">{employee.id}</p>
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
                <Table className="table-fixed w-full">
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold w-[140px]">Employee</TableHead>
                        <TableHead className="font-semibold w-[80px]">Type</TableHead>
                        <TableHead className="font-semibold w-[100px]">Rate</TableHead>
                        <TableHead className="font-semibold w-[120px]">Allowances</TableHead>
                        <TableHead className="font-semibold w-[120px]">Deductions</TableHead>
                        <TableHead className="font-semibold w-[80px]">Claims</TableHead>
                        <TableHead className="font-semibold text-right w-[100px]">Net Pay</TableHead>
                        <TableHead className="font-semibold text-center w-[60px]">Actions</TableHead>
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
                        
                        // Calculate attendance-based pay for casual employees using proper attendance data
                        const attendanceData = payrollData.attendance?.[employee.id];
                        const hoursWorked = attendanceData?.totalHours || 0;
                        const daysWorked = attendanceData?.totalDays || 0;
                        
                        console.log(`Wang Pot Chien Debug - Employee: ${employee.name}, ID: ${employee.id}, Hours: ${hoursWorked}, Days: ${daysWorked}, Attendance Data:`, attendanceData);
                        
                        const casualPayrollCalc = calculateCasualPayroll(employee, hoursWorked, daysWorked, approvedClaims);
                        const netPay = casualPayrollCalc.netSalary;
                        
                        console.log(`Wang Pot Chien Calculation - Gross: ${casualPayrollCalc.grossSalary}, CPF Employee: ${casualPayrollCalc.employeeCPF}, Net: ${netPay}`);
                        
                        return (
                          <TableRow key={employee.id} className="hover:bg-gray-50">
                            <TableCell className="truncate">
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{employee.name}</p>
                                <p className="text-xs text-gray-500 truncate">{employee.id}</p>
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
        
        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <Button
            onClick={async () => {
              try {
                await savePayrollToSupabase();
                toast.success('Draft saved successfully');
              } catch (error) {
                console.error('Error saving draft:', error);
                toast.error('Failed to save draft');
              }
            }}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Draft</span>
          </Button>
          <Button
            onClick={() => {
              if (currentStep === 'processing') {
                setCurrentStep('payment');
                setPayrollStatus('paid');
              } else if (currentStep === 'payment') {
                setCurrentStep('cpf');
                setPayrollStatus('completed');
              }
            }}
            disabled={currentStep === 'cpf'}
            className="flex items-center space-x-2"
          >
            <ArrowRight className="w-4 h-4" />
            <span>Next</span>
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
              // Get employee details from allEmployees for bank information
              const employeeDetails = allEmployees.find(emp => emp.id === employee.employeeId);
              
              return (
                <TableRow key={employee.id} className="h-12">
                  <TableCell className="font-medium py-2">{employee.name}</TableCell>
                  <TableCell className="py-2">Monthly</TableCell>
                  <TableCell className="py-2">S${(employee.netPay + approvedClaims).toFixed(2)}</TableCell>
                  <TableCell className="py-2">S${approvedClaims.toFixed(2)}</TableCell>
                  <TableCell className="py-2">{employeeDetails?.bankName || 'Unknown'}</TableCell>
                  <TableCell className="py-2">{employeeDetails?.bankAccount || 'Unknown'}</TableCell>
                  <TableCell className="py-2">
                    <Badge variant={payrollState.status === 'paid' || payrollState.status === 'completed' ? 'default' : 'secondary'}>
                      {payrollState.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {payrollState.casualEmployees.map((employee) => {
              const approvedClaims = getApprovedClaimsTotal(employee.id);
              // Get employee details from allEmployees for bank information
              const employeeDetails = allEmployees.find(emp => emp.id === employee.employeeId);
              
              return (
                <TableRow key={employee.id} className="h-12">
                  <TableCell className="font-medium py-2">{employee.name}</TableCell>
                  <TableCell className="py-2">{employee.paymentType || 'Hourly'}</TableCell>
                  <TableCell className="py-2">S${(employee.totalPay + approvedClaims).toFixed(2)}</TableCell>
                  <TableCell className="py-2">S${approvedClaims.toFixed(2)}</TableCell>
                  <TableCell className="py-2">{employeeDetails?.bankName || 'Unknown'}</TableCell>
                  <TableCell className="py-2">{employeeDetails?.bankAccount || 'Unknown'}</TableCell>
                  <TableCell className="py-2">
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
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Payroll Processing</h1>
                  <p className="text-gray-600 mt-2">Process payroll for {selectedPeriod}</p>
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
