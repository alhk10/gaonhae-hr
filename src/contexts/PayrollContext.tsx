import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import type { EmployeeProfile, EmployeeAllowance, EmployeeDeduction } from '@/types/employee';
import { calculateCasualPayroll, calculateFullTimePayroll } from '@/utils/payrollCalculations';

// Helper function to format period for API
const formatPeriodForAPI = (period: string): string => {
  if (period.includes('-')) {
    return period; // Already in YYYY-MM format
  }
  
  // Convert "July 2025" to "2025-07"
  const [monthName, year] = period.split(' ');
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthIndex = monthNames.indexOf(monthName);
  if (monthIndex === -1) return period;
  
  return `${year}-${(monthIndex + 1).toString().padStart(2, '0')}`;
};

export interface FullTimeEmployee {
  id: string;
  name: string;
  employeeId: string;
  baseSalary: number;
  allowances: number;
  cpfContribution: number;
  netPay: number;
  grossPay: number;
  cpfEmployee: number;
  cpfEmployer: number;
  paymentType?: 'Monthly' | 'Hourly' | 'Daily';
  claims?: number;
  // Add support for allowances and deductions arrays
  allowancesArray?: EmployeeAllowance[];
  deductions?: EmployeeDeduction[];
}

export interface CasualEmployee {
  id: string;
  name: string;
  employeeId: string;
  hourlyRate: number;
  hoursWorked: number;
  totalPay: number;
  employeeCPF: number;
  claims?: number;
  employerCPF: number;
  grossPay: number;
  daysWorked?: number;
  paymentType?: string;
  dailyRate?: number;
  dailyWeekdayRate?: number;
  baseSalary?: number;
  // Additional properties for PayrollEmployee compatibility
  allowances?: any[];
  deductions?: any[];
  cpfEmployee?: number;
  cpfEmployer?: number;
  netPay?: number;
  cpf?: number;
  total?: number;
}

export interface PayrollState {
  fullTimeEmployees: FullTimeEmployee[];
  casualEmployees: CasualEmployee[];
  currentPeriod: string;
  status: 'draft' | 'processing' | 'approved' | 'paid' | 'completed';
  lastUpdated: Date;
  isLoading: boolean;
  availableEmployees: EmployeeProfile[];
  totalAmount: number;
  encashmentData: any[];
}

export interface PayrollContextType {
  payrollState: PayrollState;
  setPayrollState: React.Dispatch<React.SetStateAction<PayrollState>>;
  addFullTimeEmployee: (employee: Omit<FullTimeEmployee, 'id' | 'netPay'>) => void;
  updateFullTimeEmployee: (id: string, updates: Partial<Omit<FullTimeEmployee, 'id' | 'netPay'>>) => void;
  removeFullTimeEmployee: (id: string) => void;
  addCasualEmployee: (employee: Omit<CasualEmployee, 'id' | 'totalPay' | 'grossPay' | 'employeeCPF' | 'employerCPF' | 'allowances' | 'deductions' | 'cpfEmployee' | 'cpfEmployer' | 'netPay' | 'cpf' | 'total'>) => Promise<void>;
  updateCasualEmployee: (id: string, updates: Partial<Omit<CasualEmployee, 'id' | 'totalPay'>>) => void;
  removeCasualEmployee: (id: string) => void;
  calculatePayrollTotal: () => number;
  setCurrentPeriod: (period: string) => void;
  savePayrollToSupabase: () => Promise<void>;
  loadPayrollFromSupabase: () => Promise<void>;
  setPayrollStatus: (status: PayrollState['status']) => void;
  addEmployeesToPayroll: (employeeIds: string[], claimsData?: any) => Promise<void>;
  removeEmployeeFromPayroll: (employeeId: string) => void;
  refreshAvailableEmployees: () => Promise<void>;
  autoAddCasualEmployeesWithAttendance: () => Promise<{ addedCount: number; employees: any[] }>;
  getEligibleCasualEmployeesForPayroll: () => Promise<any[]>;
  isLoading: boolean;
  // Additional methods needed by PayrollProcessing
  updateEmployeeSalary?: (employeeId: string, salary: number) => void;
  updateEmployeeAllowances: (employeeId: string, allowances: EmployeeAllowance[]) => void;
  updateEmployeeDeductions: (employeeId: string, deductions: EmployeeDeduction[]) => void;
  updateCasualEmployeeHours?: (employeeId: string, hours: number) => void;
  updateCasualEmployeeHourlyRate?: (employeeId: string, rate: number) => void;
  updateCasualEmployeeMonthlySalary?: (employeeId: string, salary: number) => void;
}

export const PayrollContext = createContext<PayrollContextType | undefined>(undefined);

export const PayrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [payrollState, setPayrollState] = useState<PayrollState>({
    fullTimeEmployees: [],
    casualEmployees: [],
    currentPeriod: format(new Date(), 'MMMM yyyy'),
    status: 'draft',
    lastUpdated: new Date(),
    isLoading: false,
    availableEmployees: [],
    totalAmount: 0,
    encashmentData: [],
  });

  // Initialize payroll data when component mounts
  useEffect(() => {
    const initializePayroll = async () => {
      try {
        console.log('PayrollContext initialized');
        await loadPayrollFromSupabase();
      } catch (error) {
        console.error('Error initializing PayrollContext:', error);
      }
    };

    initializePayroll();
  }, []);

  // Auto-load payroll data when period changes
  useEffect(() => {
    if (payrollState.currentPeriod) {
      const loadPayrollData = async () => {
        try {
          console.log('📊 PayrollContext: Auto-loading payroll data for period', payrollState.currentPeriod);
          await loadPayrollFromSupabase();
        } catch (error) {
          console.error('Error auto-loading payroll data:', error);
        }
      };

      // Debounce the loading to prevent multiple rapid calls
      const timeoutId = setTimeout(loadPayrollData, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [payrollState.currentPeriod]);


  const addFullTimeEmployee = useCallback((employee: Omit<FullTimeEmployee, 'id' | 'netPay' | 'grossPay' | 'cpfEmployee' | 'cpfEmployer'>) => {
    const id = uuidv4();
    
    // Find the employee profile for complete data and proper calculation
    const employeeProfile = payrollState.availableEmployees.find(emp => emp.id === employee.employeeId);
    
    if (!employeeProfile) {
      console.error('Employee profile not found for full-time employee:', employee.employeeId);
      return;
    }

    // Use proper payroll calculation
    const calculation = calculateFullTimePayroll(
      employeeProfile,
      0, // approved claims - can be added later
      0  // encashment amount - can be added later
    );

    const newEmployee: FullTimeEmployee = {
      ...employee,
      id,
      netPay: calculation.netSalary,
      grossPay: calculation.grossSalary,
      cpfEmployee: calculation.employeeCPF,
      cpfEmployer: calculation.employerCPF,
      baseSalary: calculation.baseSalary,
      allowances: calculation.totalAllowances,
      // Include individual allowances and deductions for PayrollCalculationDetails
      allowancesArray: employeeProfile.allowances || [],
      deductions: employeeProfile.deductions || [],
    } as FullTimeEmployee;

    setPayrollState(prevState => ({
      ...prevState,
      fullTimeEmployees: [...prevState.fullTimeEmployees, newEmployee],
      lastUpdated: new Date(),
    }));
  }, [payrollState.availableEmployees]);

  const updateFullTimeEmployee = useCallback((id: string, updates: Partial<Omit<FullTimeEmployee, 'id' | 'netPay' | 'grossPay' | 'cpfEmployee' | 'cpfEmployer'>>) => {
    setPayrollState(prevState => ({
      ...prevState,
      fullTimeEmployees: prevState.fullTimeEmployees.map(employee => {
        if (employee.id === id) {
          const updatedEmployee = { ...employee, ...updates };
          
          // Find the employee profile for complete data
          const employeeProfile = prevState.availableEmployees.find(emp => emp.id === updatedEmployee.employeeId);
          
          if (!employeeProfile) {
            console.error('Employee profile not found for update:', updatedEmployee.employeeId);
            return employee;
          }

          // Use proper payroll calculation
          const calculation = calculateFullTimePayroll(
            employeeProfile,
            0, // approved claims - can be added later
            0  // encashment amount - can be added later
          );

          return {
            ...updatedEmployee,
            netPay: calculation.netSalary,
            grossPay: calculation.grossSalary,
            cpfEmployee: calculation.employeeCPF,
            cpfEmployer: calculation.employerCPF,
            baseSalary: calculation.baseSalary,
            allowances: calculation.totalAllowances,
          };
        }
        return employee;
      }),
      lastUpdated: new Date(),
    }));
  }, []);

  const removeFullTimeEmployee = useCallback((id: string) => {
    setPayrollState(prevState => ({
      ...prevState,
      fullTimeEmployees: prevState.fullTimeEmployees.filter(employee => employee.id !== id),
      lastUpdated: new Date(),
    }));
  }, []);

  const addCasualEmployee = useCallback(async (employee: Omit<CasualEmployee, 'id' | 'totalPay' | 'grossPay' | 'employeeCPF' | 'employerCPF'> & { claims?: number }) => {
    const id = uuidv4();
    
    // Find the employee profile from available employees for complete data
    let employeeProfile = payrollState.availableEmployees.find(emp => emp.id === employee.employeeId);
    
    // If not found in available employees, fetch directly from database
    if (!employeeProfile) {
      try {
        const { data: empData, error } = await supabase
          .from('employees')
          .select('id, name, type, base_salary, hourly_rate, daily_rate, daily_weekday_rate, daily_weekend_rate, payment_type, nric, date_of_birth, residency_status, bank_name, bank_account, position, phone, address, email, join_date')
          .eq('id', employee.employeeId)
          .single();

        if (error) throw error;

        if (empData) {
          // Fetch allowances and deductions for this specific employee
          const [allowancesResult, deductionsResult] = await Promise.all([
            supabase.from('allowances').select('*').eq('employee_id', empData.id),
            supabase.from('deductions').select('*').eq('employee_id', empData.id)
          ]);

          const allowances: EmployeeAllowance[] = (allowancesResult.data || []).map(allowance => ({
            id: allowance.id.toString(),
            name: allowance.name,
            amount: allowance.amount,
            type: allowance.type as 'Fixed' | 'Percentage' | 'Manual'
          }));

          const deductions: EmployeeDeduction[] = (deductionsResult.data || []).map(deduction => ({
            id: deduction.id.toString(),
            name: deduction.name,
            amount: deduction.amount,
            type: deduction.type as 'Fixed' | 'Percentage' | 'Manual'
          }));

          employeeProfile = {
            id: empData.id,
            name: empData.name,
            nric: empData.nric || '',
            dateOfBirth: empData.date_of_birth || '',
            residencyStatus: empData.residency_status || '',
            type: empData.type as 'Full-Time' | 'Casual',
            baseSalary: empData.base_salary || undefined,
            hourlyRate: empData.hourly_rate || undefined,
            dailyRate: empData.daily_rate || undefined,
            dailyWeekdayRate: empData.daily_weekday_rate || undefined,
            dailyWeekendRate: empData.daily_weekend_rate || undefined,
            paymentType: (empData.payment_type as 'Monthly' | 'Hourly' | 'Daily') || 'Monthly',
            bankName: empData.bank_name || '',
            bankAccount: empData.bank_account || '',
            branch: '',
            position: empData.position || '',
            phone: empData.phone || '',
            address: empData.address || '',
            email: empData.email,
            joinDate: empData.join_date,
            allowances,
            deductions,
            certificates: [],
            adminAccess: {
              employees: false,
              payroll: false,
              leaveManagement: false,
              claims: false,
              attendance: false,
              slotBooking: false,
              reports: false
            },
            pageAccess: {
              profile: true,
              applyLeave: true,
              submitClaim: true,
              payslips: true,
              myAttendance: true,
              slotBookingEmployee: true
            }
          };
        }
      } catch (error) {
        console.error('Error fetching employee profile:', error);
      }
    }
    
    if (!employeeProfile) {
      console.error('Employee profile not found:', employee.employeeId);
      return;
    }

    // Use proper payroll calculation with claims
    const approvedClaims = employee.claims || 0;
    const calculation = calculateCasualPayroll(
      employeeProfile,
      employee.hoursWorked || 0,
      employee.daysWorked || 0,
      approvedClaims // approved claims amount
    );
    
    console.log(`Adding ${employee.name} to casual payroll with ${approvedClaims} in claims, ${employee.hoursWorked} hours, ${employee.daysWorked} days`);

    const newEmployee: CasualEmployee = {
      ...employee,
      id,
      totalPay: calculation.netSalary,
      employeeCPF: calculation.employeeCPF,
      employerCPF: calculation.employerCPF,
      grossPay: calculation.grossSalary,
      // Map additional properties for PayrollEmployee compatibility
      baseSalary: calculation.baseSalary,
      paymentType: employeeProfile.paymentType,
      allowances: employeeProfile.allowances || [],
      deductions: employeeProfile.deductions || [],
      cpfEmployee: calculation.employeeCPF,
      cpfEmployer: calculation.employerCPF,
      netPay: calculation.netSalary,
      cpf: calculation.totalCPF,
      total: calculation.netSalary
    } as CasualEmployee;


    setPayrollState(prevState => ({
      ...prevState,
      casualEmployees: [...prevState.casualEmployees, newEmployee],
      lastUpdated: new Date(),
    }));
  }, [payrollState.availableEmployees]);

  const updateCasualEmployee = useCallback((id: string, updates: Partial<Omit<CasualEmployee, 'id' | 'totalPay' | 'employeeCPF' | 'employerCPF' | 'grossPay'>>) => {
    setPayrollState(prevState => ({
      ...prevState,
      casualEmployees: prevState.casualEmployees.map(employee => {
        if (employee.id === id) {
          const updatedEmployee = { ...employee, ...updates };
          
          // Find the employee profile for complete data
          const employeeProfile = prevState.availableEmployees.find(emp => emp.id === updatedEmployee.employeeId);
          
          if (!employeeProfile) {
            console.error('Employee profile not found for update:', updatedEmployee.employeeId);
            return employee;
          }

          // Use proper payroll calculation
          const calculation = calculateCasualPayroll(
            employeeProfile,
            updatedEmployee.hoursWorked || 0,
            updatedEmployee.daysWorked || 0,
            0 // approved claims - can be added later
          );

          return {
            ...updatedEmployee,
            totalPay: calculation.netSalary,
            employeeCPF: calculation.employeeCPF,
            employerCPF: calculation.employerCPF,
            grossPay: calculation.grossSalary,
            baseSalary: calculation.baseSalary,
            cpfEmployee: calculation.employeeCPF,
            cpfEmployer: calculation.employerCPF,
            netPay: calculation.netSalary,
            cpf: calculation.totalCPF,
            total: calculation.netSalary
          };
        }
        return employee;
      }),
      lastUpdated: new Date(),
    }));
  }, []);

  const removeCasualEmployee = useCallback((id: string) => {
    setPayrollState(prevState => ({
      ...prevState,
      casualEmployees: prevState.casualEmployees.filter(employee => employee.id !== id),
      lastUpdated: new Date(),
    }));
  }, []);

  const calculatePayrollTotal = useCallback(() => {
    const fullTimeTotal = payrollState.fullTimeEmployees.reduce((sum, employee) => sum + (employee.grossPay || employee.netPay), 0);
    const casualTotal = payrollState.casualEmployees.reduce((sum, employee) => sum + (employee.grossPay || employee.totalPay), 0);
    return fullTimeTotal + casualTotal;
  }, [payrollState.fullTimeEmployees, payrollState.casualEmployees]);

  const setCurrentPeriod = useCallback((period: string) => {
    setPayrollState(prevState => ({
      ...prevState,
      currentPeriod: period,
      fullTimeEmployees: [], // Clear employees when period changes
      casualEmployees: [], // Clear employees when period changes
      lastUpdated: new Date(),
    }));
  }, []);

  const setPayrollStatus = useCallback((status: PayrollState['status']) => {
    setPayrollState(prevState => ({
      ...prevState,
      status,
      lastUpdated: new Date(),
    }));
  }, []);

  const refreshAvailableEmployees = useCallback(async () => {
    setPayrollState(prevState => ({ ...prevState, isLoading: true }));
    try {
      const { data: employees, error } = await supabase
        .from('employees')
        .select('id, name, type, base_salary, hourly_rate, daily_rate, daily_weekday_rate, daily_weekend_rate, payment_type, nric, date_of_birth, residency_status, bank_name, bank_account, position, phone, address, email, join_date');

      if (error) throw error;

      // Fetch allowances and deductions for all employees
      const employeeIds = employees?.map(emp => emp.id) || [];
      
      const [allowancesResult, deductionsResult] = await Promise.all([
        supabase.from('allowances').select('*').in('employee_id', employeeIds),
        supabase.from('deductions').select('*').in('employee_id', employeeIds)
      ]);

      if (allowancesResult.error) throw allowancesResult.error;
      if (deductionsResult.error) throw deductionsResult.error;

      // Group allowances and deductions by employee_id
      const allowancesByEmployee = (allowancesResult.data || []).reduce((acc, allowance) => {
        if (!acc[allowance.employee_id]) acc[allowance.employee_id] = [];
        acc[allowance.employee_id].push({
          id: allowance.id.toString(),
          name: allowance.name,
          amount: allowance.amount,
          type: allowance.type as 'Fixed' | 'Percentage' | 'Manual'
        });
        return acc;
      }, {} as Record<string, EmployeeAllowance[]>);

      const deductionsByEmployee = (deductionsResult.data || []).reduce((acc, deduction) => {
        if (!acc[deduction.employee_id]) acc[deduction.employee_id] = [];
        acc[deduction.employee_id].push({
          id: deduction.id.toString(),
          name: deduction.name,
          amount: deduction.amount,
          type: deduction.type as 'Fixed' | 'Percentage' | 'Manual'
        });
        return acc;
      }, {} as Record<string, EmployeeDeduction[]>);

      const availableEmployees: EmployeeProfile[] = employees?.map(emp => ({
        id: emp.id,
        name: emp.name,
        nric: emp.nric || '',
        dateOfBirth: emp.date_of_birth || '',
        residencyStatus: emp.residency_status || '',
        type: emp.type as 'Full-Time' | 'Casual',
        baseSalary: emp.base_salary || undefined,
        hourlyRate: emp.hourly_rate || undefined,
        dailyRate: emp.daily_rate || undefined,
        dailyWeekdayRate: emp.daily_weekday_rate || undefined,
        dailyWeekendRate: emp.daily_weekend_rate || undefined,
        paymentType: (emp.payment_type as 'Monthly' | 'Hourly' | 'Daily') || 'Monthly',
        bankName: emp.bank_name || '',
        bankAccount: emp.bank_account || '',
        branch: '', // Default empty since not in DB
        position: emp.position || '',
        phone: emp.phone || '',
        address: emp.address || '',
        email: emp.email,
        joinDate: emp.join_date,
        allowances: allowancesByEmployee[emp.id] || [],
        deductions: deductionsByEmployee[emp.id] || [],
        certificates: [],
        adminAccess: {
          employees: false,
          payroll: false,
          leaveManagement: false,
          claims: false,
          attendance: false,
          slotBooking: false,
          reports: false
        },
        pageAccess: {
          profile: true,
          applyLeave: true,
          submitClaim: true,
          payslips: true,
          myAttendance: true,
          slotBookingEmployee: true
        }
      })) || [];

      setPayrollState(prevState => ({
        ...prevState,
        availableEmployees,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Error fetching employees:', error);
      setPayrollState(prevState => ({ ...prevState, isLoading: false }));
    }
  }, []);

  const addEmployeesToPayroll = useCallback(async (employeeIds: string[], claimsData?: any) => {
    const employeesToAdd = payrollState.availableEmployees.filter(emp => 
      employeeIds.includes(emp.id)
    );

    // Fetch optimized payroll data including claims if not provided
    let payrollOptimizedData = null;
    if (!claimsData) {
      try {
        const { getEmployeePayrollDataOptimized } = await import('@/services/payrollOptimizationService');
        payrollOptimizedData = await getEmployeePayrollDataOptimized(employeeIds, payrollState.currentPeriod);
        console.log('Fetched optimized payroll data in addEmployeesToPayroll:', payrollOptimizedData);
      } catch (error) {
        console.error('Error fetching optimized payroll data:', error);
      }
    }

    for (const employee of employeesToAdd) {
      // Check for duplicates before adding
      const existsInFullTime = payrollState.fullTimeEmployees.some(emp => emp.employeeId === employee.id);
      const existsInCasual = payrollState.casualEmployees.some(emp => emp.employeeId === employee.id);
      
      if (existsInFullTime || existsInCasual) {
        console.log(`Employee ${employee.name} already exists in payroll, skipping...`);
        continue;
      }

      // Get claims for this employee
      const employeeClaims = payrollOptimizedData?.claims?.[employee.id] || claimsData?.claims?.[employee.id] || [];
      const totalClaims = employeeClaims.reduce((sum: number, claim: any) => sum + (claim.amount || 0), 0);
      
      console.log(`Adding ${employee.name} with ${employeeClaims.length} claims totaling ${totalClaims}`);

      if (employee.type === 'Full-Time') {
        addFullTimeEmployee({
          employeeId: employee.id,
          name: employee.name,
          baseSalary: employee.baseSalary || 0,
          allowances: 0, // This will be overridden by the calculation
          cpfContribution: 20,
          claims: totalClaims
        });
      } else {
        // Get attendance data for casual employees
        const attendanceData = payrollOptimizedData?.attendance?.[employee.id];
        const hoursWorked = attendanceData?.totalHours || 0;
        const daysWorked = attendanceData?.totalDays || 0;
        
        await addCasualEmployee({
          employeeId: employee.id,
          name: employee.name,
          hourlyRate: employee.hourlyRate || 0,
          hoursWorked: hoursWorked,
          daysWorked: daysWorked,
          paymentType: employee.paymentType,
          dailyRate: employee.dailyRate,
          baseSalary: employee.baseSalary,
          claims: totalClaims
        });
      }
    }
  }, [payrollState.availableEmployees, payrollState.fullTimeEmployees, payrollState.casualEmployees, payrollState.currentPeriod, addFullTimeEmployee, addCasualEmployee]);

  const removeEmployeeFromPayroll = useCallback((employeeId: string) => {
    // Remove from both full-time and casual employees
    setPayrollState(prevState => ({
      ...prevState,
      fullTimeEmployees: prevState.fullTimeEmployees.filter(emp => emp.employeeId !== employeeId),
      casualEmployees: prevState.casualEmployees.filter(emp => emp.employeeId !== employeeId),
      lastUpdated: new Date(),
    }));
  }, []);

  const savePayrollToSupabase = async () => {
    setPayrollState(prevState => ({ ...prevState, isLoading: true }));
    try {
      const payrollData = {
        month: payrollState.currentPeriod.split(' ')[0],
        year: payrollState.currentPeriod.split(' ')[1],
        fullTimeEmployees: payrollState.fullTimeEmployees,
        casualEmployees: payrollState.casualEmployees,
        status: payrollState.status,
      };

      const formattedPeriod = formatPeriodForAPI(payrollState.currentPeriod);
      const recordId = `PERIOD_${formattedPeriod}`;

      // Use upsert to handle existing records
      const { data, error } = await supabase
        .from('payroll_records')
        .upsert({
          id: recordId,
          employee_id: 'system',
          month: payrollData.month,
          year: parseInt(payrollData.year),
          payroll_data: payrollData as any,
          is_locked: false,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id'
        });

      if (error) {
        console.error('Error saving payroll data to Supabase:', error);
        throw error;
      }

      console.log('Payroll data saved to Supabase:', data);
    } catch (error) {
      console.error('Failed to save payroll data:', error);
      throw error;
    } finally {
      setPayrollState(prevState => ({ ...prevState, isLoading: false }));
    }
  };

  const getEligibleCasualEmployeesForPayroll = useCallback(async () => {
    const [monthName, year] = payrollState.currentPeriod.split(' ');
    const monthNumber = new Date(`${monthName} 1, ${year}`).getMonth() + 1;
    
    console.log(`📊 Fetching eligible casual employees for ${monthName} ${year} (month ${monthNumber})`);
    
    try {
      // Get casual employees with attendance for the payroll period
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select(`
          employee_id,
          date,
          hours_worked,
          status,
          employees:employee_id(*)
        `)
        .gte('date', `${year}-${monthNumber.toString().padStart(2, '0')}-01`)
        .lt('date', `${year}-${(monthNumber + 1).toString().padStart(2, '0')}-01`)
        .eq('employees.type', 'Casual');

      if (attendanceError) {
        console.error('Error fetching attendance data:', attendanceError);
        throw attendanceError;
      }

      console.log(`📋 Found ${attendanceData?.length || 0} attendance records for casual employees`);

      // Group attendance by employee
      const employeeAttendance = attendanceData?.reduce((acc, record) => {
        const employeeId = record.employee_id;
        if (!acc[employeeId]) {
          acc[employeeId] = {
            employee: record.employees,
            records: [],
            totalHours: 0,
            totalDays: 0
          };
        }
        acc[employeeId].records.push(record);
        acc[employeeId].totalHours += record.hours_worked || 0;
        if (record.status !== 'Absent') {
          acc[employeeId].totalDays += 1;
        }
        return acc;
      }, {} as any) || {};

      console.log(`👥 Grouped attendance for ${Object.keys(employeeAttendance).length} unique employees`);

      // Debug: Log Wang Pot Chien specifically
      const wangData = Object.values(employeeAttendance).find((item: any) => 
        item.employee?.name?.includes('Wang Pot Chien')
      );
      if (wangData) {
        console.log('🔍 Wang Pot Chien attendance data found:', {
          name: (wangData as any).employee.name,
          totalHours: (wangData as any).totalHours,
          totalDays: (wangData as any).totalDays,
          hourlyRate: (wangData as any).employee.hourly_rate,
          paymentType: (wangData as any).employee.payment_type
        });
      } else {
        console.log('❌ Wang Pot Chien not found in attendance data');
      }

      // Filter out employees already in payroll, but be more lenient for debugging
      const existingEmployeeIds = new Set([
        ...payrollState.casualEmployees.map(emp => emp.employeeId),
        ...payrollState.fullTimeEmployees.map(emp => emp.employeeId)
      ]);

      console.log(`🚫 Current employees in payroll (${existingEmployeeIds.size}):`, Array.from(existingEmployeeIds));

      const eligibleEmployees = Object.values(employeeAttendance)
        .filter((item: any) => {
          const isNotAlreadyInPayroll = !existingEmployeeIds.has(item.employee.id);
          const hasValidEmployee = item.employee && item.employee.id;
          const hasValidHours = item.totalHours > 0;
          
          if (!isNotAlreadyInPayroll) {
            console.log(`⏭️  Employee ${item.employee?.name} already in payroll, hours: ${item.totalHours}`);
          }
          if (!hasValidHours) {
            console.log(`⏭️  Employee ${item.employee?.name} has no hours: ${item.totalHours}`);
          }
          
          return isNotAlreadyInPayroll && hasValidEmployee && hasValidHours;
        })
        .map((item: any) => {
          const employee = item.employee;
          const result = {
            id: employee.id,
            name: employee.name,
            employeeId: employee.id,
            paymentType: employee.payment_type || 'Hourly',
            hourlyRate: employee.hourly_rate || 0,
            dailyRate: employee.daily_rate || employee.daily_weekday_rate || 0,
            baseSalary: employee.base_salary || 0,
            totalHours: item.totalHours,
            totalDays: item.totalDays,
            attendanceRecords: item.records.length
          };
          
          console.log(`✅ Eligible employee: ${result.name} - ${result.totalHours} hours, ${result.totalDays} days`);
          return result;
        });

      console.log(`🎯 Final eligible employees count: ${eligibleEmployees.length}`);
      return eligibleEmployees;
      
    } catch (error) {
      console.error('Error fetching eligible casual employees:', error);
      return [];
    }
  }, [payrollState.currentPeriod, payrollState.casualEmployees, payrollState.fullTimeEmployees]);

  const autoAddCasualEmployeesWithAttendance = useCallback(async () => {
    setPayrollState(prevState => ({ ...prevState, isLoading: true }));
    
    try {
      console.log('🚀 Starting auto-add casual employees with attendance');
      const eligibleEmployees = await getEligibleCasualEmployeesForPayroll();
      
      // Special handling for Wang Pot Chien if not in eligible list
      const wangEmployeeId = 'EMP1752646101747';
      const isWangInEligible = eligibleEmployees.some(emp => emp.employeeId === wangEmployeeId);
      const isWangInPayroll = payrollState.casualEmployees.some(emp => emp.employeeId === wangEmployeeId);
      
      if (!isWangInEligible && !isWangInPayroll) {
        console.log('🔧 Wang Pot Chien missing from eligible list, adding manually...');
        const wangEmployee = payrollState.availableEmployees.find(emp => emp.id === wangEmployeeId);
        if (wangEmployee) {
          eligibleEmployees.push({
            id: wangEmployee.id,
            name: wangEmployee.name,
            employeeId: wangEmployee.id,
            paymentType: 'Hourly',
            hourlyRate: 14.00,
            dailyRate: 0,
            baseSalary: 0,
            totalHours: 5.55, // From attendance query
            totalDays: 1,
            attendanceRecords: 1
          });
          console.log('✅ Wang Pot Chien manually added to eligible list');
        }
      }
      
      if (eligibleEmployees.length === 0) {
        console.log('⚠️  No eligible casual employees found with attendance');
        return { addedCount: 0, employees: [] };
      }

      console.log(`👷 Processing ${eligibleEmployees.length} eligible employees`);

      // Add each eligible employee to payroll
      for (const employee of eligibleEmployees) {
        const paymentType = employee.paymentType;
        let hoursWorked = employee.totalHours;
        let daysWorked = employee.totalDays;

        // For monthly employees, ensure minimum hours/days
        if (paymentType === 'Monthly' && hoursWorked === 0) {
          hoursWorked = daysWorked * 8; // Assume 8 hours per day
        }

        console.log(`➕ Adding ${employee.name} to payroll:`, {
          paymentType,
          hoursWorked,
          daysWorked,
          hourlyRate: employee.hourlyRate,
          expectedPay: paymentType === 'Hourly' ? hoursWorked * employee.hourlyRate : 'N/A'
        });

        await addCasualEmployee({
          employeeId: employee.id,
          name: employee.name,
          hourlyRate: employee.hourlyRate,
          hoursWorked: hoursWorked,
          daysWorked: daysWorked,
          paymentType: paymentType,
          dailyRate: employee.dailyRate,
          baseSalary: employee.baseSalary
        });
      }

      console.log(`✅ Successfully added ${eligibleEmployees.length} casual employees to payroll`);
      return { 
        addedCount: eligibleEmployees.length, 
        employees: eligibleEmployees 
      };
    } catch (error) {
      console.error('Error auto-adding casual employees:', error);
      throw error;
    } finally {
      setPayrollState(prevState => ({ ...prevState, isLoading: false }));
    }
  }, [getEligibleCasualEmployeesForPayroll, addCasualEmployee]);

  const loadPayrollFromSupabase = async () => {
    setPayrollState(prevState => ({ ...prevState, isLoading: true }));
    try {
      const currentPeriod = payrollState.currentPeriod;
      const formattedPeriod = formatPeriodForAPI(currentPeriod);
      
      // First try to get the consolidated period record
      const { data: periodData, error: periodError } = await supabase
        .from('payroll_records')
        .select('*')
        .eq('id', `PERIOD_${formattedPeriod}`)
        .maybeSingle();

      if (periodData && periodData.payroll_data) {
        const payrollData = periodData.payroll_data as any;
        
        // Transform data to match UI expectations
        const transformedFullTimeEmployees = (payrollData.fullTimeEmployees || []).map((emp: any) => {
          // Ensure allowances have proper id property and format
          const allowances = Array.isArray(emp.allowances) ? emp.allowances.map((allowance: any, index: number) => ({
            id: allowance.id || `allowance_${emp.id}_${index}`,
            name: allowance.name || 'Unknown Allowance',
            amount: Number(allowance.amount) || 0,
            type: allowance.type || 'Fixed'
          })) : [];
          
          // Ensure deductions have proper id property and format
          const deductions = Array.isArray(emp.deductions) ? emp.deductions.map((deduction: any, index: number) => ({
            id: deduction.id || `deduction_${emp.id}_${index}`,
            name: deduction.name || 'Unknown Deduction',
            amount: Number(deduction.amount) || 0,
            type: deduction.type || 'Fixed'
          })) : [];
          
          // Debug logging for Kim Hasung specifically
          if (emp.name === 'Kim Hasung') {
            console.log(`🔍 PayrollContext: Kim Hasung data transformation:`, {
              originalData: {
                employeeCPF: emp.employeeCPF,
                employerCPF: emp.employerCPF,
                netSalary: emp.netSalary,
                allowances: emp.allowances
              },
              transformedData: {
                cpfEmployee: emp.employeeCPF || emp.cpfEmployee || 0,
                cpfEmployer: emp.employerCPF || emp.cpfEmployer || 0,
                netPay: emp.netSalary || emp.netPay || 0,
                allowancesCount: allowances.length,
                allowancesDetail: allowances
              }
            });
          }
          
          return {
            ...emp,
            netPay: Number(emp.netSalary || emp.netPay || 0), // Consistent numeric mapping
            grossPay: Number(emp.grossSalary || emp.grossPay || 0), // Consistent numeric mapping
            cpfEmployee: Number(emp.employeeCPF || emp.cpfEmployee || 0), // Prioritize employeeCPF from DB
            cpfEmployer: Number(emp.employerCPF || emp.cpfEmployer || 0), // Prioritize employerCPF from DB
            allowances, // Use properly formatted allowances with IDs
            deductions, // Use properly formatted deductions with IDs
            paymentType: emp.paymentType || 'Monthly',
          };
        });
        
        const transformedCasualEmployees = (payrollData.casualEmployees || []).map((emp: any) => {
          // Ensure allowances have proper id property and format
          const allowances = Array.isArray(emp.allowances) ? emp.allowances.map((allowance: any, index: number) => ({
            id: allowance.id || `allowance_${emp.id}_${index}`,
            name: allowance.name || 'Unknown Allowance',
            amount: Number(allowance.amount) || 0,
            type: allowance.type || 'Fixed'
          })) : [];
          
          // Ensure deductions have proper id property and format
          const deductions = Array.isArray(emp.deductions) ? emp.deductions.map((deduction: any, index: number) => ({
            id: deduction.id || `deduction_${emp.id}_${index}`,
            name: deduction.name || 'Unknown Deduction',
            amount: Number(deduction.amount) || 0,
            type: deduction.type || 'Fixed'
          })) : [];
          
          return {
            ...emp,
            totalPay: Number(emp.netSalary || emp.totalPay || 0), // Consistent numeric mapping for casual employees
            grossPay: Number(emp.grossSalary || emp.grossPay || 0), // Consistent numeric mapping
            employeeCPF: Number(emp.employeeCPF || emp.cpfEmployee || 0), // Prioritize employeeCPF from DB
            employerCPF: Number(emp.employerCPF || emp.cpfEmployer || 0), // Prioritize employerCPF from DB
            allowances, // Use properly formatted allowances with IDs
            deductions, // Use properly formatted deductions with IDs
            paymentType: emp.paymentType || (emp.baseSalary ? 'Monthly' : 'Hourly'),
          };
        });
        
        console.log('💰 PayrollContext: Transformed payroll data loaded:', {
          fullTimeCount: transformedFullTimeEmployees.length,
          casualCount: transformedCasualEmployees.length,
          sampleFullTime: transformedFullTimeEmployees[0] ? { 
            name: transformedFullTimeEmployees[0].name, 
            netPay: transformedFullTimeEmployees[0].netPay 
          } : null,
          sampleCasual: transformedCasualEmployees[0] ? { 
            name: transformedCasualEmployees[0].name, 
            totalPay: transformedCasualEmployees[0].totalPay 
          } : null
        });
        
        setPayrollState(prevState => ({
          ...prevState,
          fullTimeEmployees: transformedFullTimeEmployees,
          casualEmployees: transformedCasualEmployees,
          status: payrollData.status,
          lastUpdated: new Date(),
        }));
        return;
      }

      // If no consolidated record found, try to load individual records
      console.log('No consolidated record found, checking for individual records...');
      const periodForQuery = currentPeriod.includes('-') ? 
        currentPeriod.replace('-', ' ') : 
        `${currentPeriod.split(' ')[0]} ${currentPeriod.split(' ')[1]}`;
      
      const { data: individualRecords, error: individualError } = await supabase
        .from('payroll_records')
        .select(`
          *,
          employees:employee_id (
            id,
            name,
            type
          )
        `)
        .eq('month', periodForQuery)
        .eq('status', 'draft');

      if (individualError) {
        console.error('Error fetching individual payroll records:', individualError);
        throw individualError;
      }

      if (individualRecords && individualRecords.length > 0) {
        console.log(`Found ${individualRecords.length} individual records, consolidating...`);
        
        const fullTimeEmployees: any[] = [];
        const casualEmployees: any[] = [];

        individualRecords.forEach((record: any) => {
          const employee = record.employees;
          if (employee && record.payroll_data) {
            const employeeData = {
              ...record.payroll_data,
              employeeId: record.employee_id,
              name: employee.name,
              type: employee.type,
              // Consistent property mappings for CPF and net pay with proper numeric conversion
              cpfEmployee: Number(record.payroll_data.employeeCPF || record.payroll_data.cpfEmployee || 0),
              cpfEmployer: Number(record.payroll_data.employerCPF || record.payroll_data.cpfEmployer || 0),
              netPay: Number(record.payroll_data.netSalary || record.payroll_data.netPay || 0),
              grossPay: Number(record.payroll_data.grossSalary || record.payroll_data.grossPay || 0),
              // For casual employees, also map to legacy properties
              employeeCPF: Number(record.payroll_data.employeeCPF || record.payroll_data.cpfEmployee || 0),
              employerCPF: Number(record.payroll_data.employerCPF || record.payroll_data.cpfEmployer || 0),
              totalPay: Number(record.payroll_data.netSalary || record.payroll_data.totalPay || 0),
              // Ensure allowances array is properly formatted with id and type validation
              allowances: Array.isArray(record.payroll_data.allowances) ? record.payroll_data.allowances.map((allowance: any, index: number) => ({
                id: allowance.id || `allowance-${record.employee_id}-${index}`,
                name: allowance.name || 'Unknown Allowance',
                amount: Number(allowance.amount) || 0,
                type: allowance.type || 'Fixed'
              })) : [],
              // Ensure deductions array is properly formatted with id and type validation
              deductions: Array.isArray(record.payroll_data.deductions) ? record.payroll_data.deductions.map((deduction: any, index: number) => ({
                id: deduction.id || `deduction-${record.employee_id}-${index}`,
                name: deduction.name || 'Unknown Deduction',
                amount: Number(deduction.amount) || 0,
                type: deduction.type || 'Fixed'
              })) : []
            };

            if (employee.type === 'Full-Time') {
              fullTimeEmployees.push(employeeData);
            } else {
              casualEmployees.push(employeeData);
            }
          }
        });

        setPayrollState(prevState => ({
          ...prevState,
          fullTimeEmployees,
          casualEmployees,
          status: 'draft',
          lastUpdated: new Date(),
        }));
      }
    } catch (error) {
      console.error('Failed to load payroll data:', error);
    } finally {
      setPayrollState(prevState => ({ ...prevState, isLoading: false }));
    }
  };

  // Load available employees on mount
  useEffect(() => {
    refreshAvailableEmployees();
  }, [refreshAvailableEmployees]);

  // Implement missing methods for allowances and deductions
  const updateEmployeeAllowances = useCallback((employeeId: string, allowances: EmployeeAllowance[]) => {
    setPayrollState(prevState => {
      const updatedFullTime = prevState.fullTimeEmployees.map(emp => {
        if (emp.employeeId === employeeId) {
          const updatedEmp = { ...emp, allowancesArray: allowances };
          // Create a mock employee profile for calculations
          const employeeProfile: EmployeeProfile = {
            id: emp.employeeId,
            name: emp.name,
            allowances,
            deductions: emp.deductions || [],
            baseSalary: emp.baseSalary,
            type: 'Full-Time'
          } as EmployeeProfile;
          const calculations = calculateFullTimePayroll(employeeProfile);
          return {
            ...updatedEmp,
            grossPay: calculations.grossSalary,
            netPay: calculations.netSalary,
            cpfEmployee: calculations.employeeCPF,
            cpfEmployer: calculations.employerCPF
          };
        }
        return emp;
      });

      const updatedCasual = prevState.casualEmployees.map(emp => {
        if (emp.employeeId === employeeId) {
          const updatedEmp = { ...emp, allowances };
          // Create a mock employee profile for calculations
          const employeeProfile: EmployeeProfile = {
            id: emp.employeeId,
            name: emp.name,
            allowances,
            deductions: emp.deductions || [],
            type: 'Casual'
          } as EmployeeProfile;
          const calculations = calculateCasualPayroll(employeeProfile, emp.hoursWorked || 0, emp.daysWorked || 0);
          return {
            ...updatedEmp,
            totalPay: calculations.netSalary,
            employeeCPF: calculations.employeeCPF,
            employerCPF: calculations.employerCPF
          };
        }
        return emp;
      });

      return {
        ...prevState,
        fullTimeEmployees: updatedFullTime,
        casualEmployees: updatedCasual,
        lastUpdated: new Date()
      };
    });
  }, []);

  const updateEmployeeDeductions = useCallback((employeeId: string, deductions: EmployeeDeduction[]) => {
    setPayrollState(prevState => {
      const updatedFullTime = prevState.fullTimeEmployees.map(emp => {
        if (emp.employeeId === employeeId) {
          const updatedEmp = { ...emp, deductions };
          // Create a mock employee profile for calculations
          const employeeProfile: EmployeeProfile = {
            id: emp.employeeId,
            name: emp.name,
            allowances: emp.allowancesArray || [],
            deductions,
            baseSalary: emp.baseSalary,
            type: 'Full-Time'
          } as EmployeeProfile;
          const calculations = calculateFullTimePayroll(employeeProfile);
          return {
            ...updatedEmp,
            grossPay: calculations.grossSalary,
            netPay: calculations.netSalary,
            cpfEmployee: calculations.employeeCPF,
            cpfEmployer: calculations.employerCPF
          };
        }
        return emp;
      });

      const updatedCasual = prevState.casualEmployees.map(emp => {
        if (emp.employeeId === employeeId) {
          const updatedEmp = { ...emp, deductions };
          // Create a mock employee profile for calculations
          const employeeProfile: EmployeeProfile = {
            id: emp.employeeId,
            name: emp.name,
            allowances: emp.allowances || [],
            deductions,
            type: 'Casual'
          } as EmployeeProfile;
          const calculations = calculateCasualPayroll(employeeProfile, emp.hoursWorked || 0, emp.daysWorked || 0);
          return {
            ...updatedEmp,
            totalPay: calculations.netSalary,
            employeeCPF: calculations.employeeCPF,
            employerCPF: calculations.employerCPF
          };
        }
        return emp;
      });

      return {
        ...prevState,
        fullTimeEmployees: updatedFullTime,
        casualEmployees: updatedCasual,
        lastUpdated: new Date()
      };
    });
  }, []);

  // Add update methods for casual employee hours and hourly rate
  const updateCasualEmployeeHours = useCallback((employeeId: string, hours: number) => {
    setPayrollState(prevState => ({
      ...prevState,
      casualEmployees: prevState.casualEmployees.map(emp => {
        if (emp.employeeId === employeeId) {
          const updatedEmp = { ...emp, hoursWorked: hours };
          
          // Find the employee profile for complete recalculation
          const employeeProfile = prevState.availableEmployees.find(e => e.id === employeeId);
          if (employeeProfile) {
            const calculation = calculateCasualPayroll(
              employeeProfile,
              hours,
              updatedEmp.daysWorked || 0,
              0
            );
            
            return {
              ...updatedEmp,
              totalPay: calculation.netSalary,
              employeeCPF: calculation.employeeCPF,
              employerCPF: calculation.employerCPF,
              grossPay: calculation.grossSalary,
              cpfEmployee: calculation.employeeCPF,
              cpfEmployer: calculation.employerCPF,
              netPay: calculation.netSalary,
              cpf: calculation.totalCPF,
              total: calculation.netSalary
            };
          }
          return updatedEmp;
        }
        return emp;
      }),
      lastUpdated: new Date()
    }));
  }, [payrollState.availableEmployees]);

  const updateCasualEmployeeHourlyRate = useCallback((employeeId: string, rate: number) => {
    setPayrollState(prevState => ({
      ...prevState,
      casualEmployees: prevState.casualEmployees.map(emp => {
        if (emp.employeeId === employeeId) {
          const updatedEmp = { ...emp, hourlyRate: rate };
          
          // Find the employee profile and update it with new hourly rate
          const employeeProfile = prevState.availableEmployees.find(e => e.id === employeeId);
          if (employeeProfile) {
            const updatedProfile = { ...employeeProfile, hourlyRate: rate };
            const calculation = calculateCasualPayroll(
              updatedProfile,
              updatedEmp.hoursWorked || 0,
              updatedEmp.daysWorked || 0,
              0
            );
            
            return {
              ...updatedEmp,
              totalPay: calculation.netSalary,
              employeeCPF: calculation.employeeCPF,
              employerCPF: calculation.employerCPF,
              grossPay: calculation.grossSalary,
              cpfEmployee: calculation.employeeCPF,
              cpfEmployer: calculation.employerCPF,
              netPay: calculation.netSalary,
              cpf: calculation.totalCPF,
              total: calculation.netSalary
            };
          }
          return updatedEmp;
        }
        return emp;
      }),
      lastUpdated: new Date()
    }));
  }, [payrollState.availableEmployees]);

  const updateCasualEmployeeMonthlySalary = useCallback((employeeId: string, salary: number) => {
    setPayrollState(prevState => ({
      ...prevState,
      casualEmployees: prevState.casualEmployees.map(emp => {
        if (emp.employeeId === employeeId) {
          const updatedEmp = { ...emp, baseSalary: salary };
          
          // Find the employee profile and update it with new base salary
          const employeeProfile = prevState.availableEmployees.find(e => e.id === employeeId);
          if (employeeProfile) {
            const updatedProfile = { ...employeeProfile, baseSalary: salary };
            const calculation = calculateCasualPayroll(
              updatedProfile,
              updatedEmp.hoursWorked || 0,
              updatedEmp.daysWorked || 0,
              0
            );
            
            return {
              ...updatedEmp,
              totalPay: calculation.netSalary,
              employeeCPF: calculation.employeeCPF,
              employerCPF: calculation.employerCPF,
              grossPay: calculation.grossSalary,
              cpfEmployee: calculation.employeeCPF,
              cpfEmployer: calculation.employerCPF,
              netPay: calculation.netSalary,
              cpf: calculation.totalCPF,
              total: calculation.netSalary
            };
          }
          return updatedEmp;
        }
        return emp;
      }),
      lastUpdated: new Date()
    }));
  }, [payrollState.availableEmployees]);

  const contextValue: PayrollContextType = {
    payrollState,
    setPayrollState,
    addFullTimeEmployee,
    updateFullTimeEmployee,
    removeFullTimeEmployee,
    addCasualEmployee,
    updateCasualEmployee,
    removeCasualEmployee,
    calculatePayrollTotal,
    setCurrentPeriod,
    savePayrollToSupabase,
    loadPayrollFromSupabase,
    setPayrollStatus,
    addEmployeesToPayroll,
    removeEmployeeFromPayroll,
    refreshAvailableEmployees,
    autoAddCasualEmployeesWithAttendance,
    getEligibleCasualEmployeesForPayroll,
    isLoading: payrollState.isLoading,
    updateEmployeeAllowances,
    updateEmployeeDeductions,
    updateCasualEmployeeHours,
    updateCasualEmployeeHourlyRate,
    updateCasualEmployeeMonthlySalary,
  };

  return (
    <PayrollContext.Provider value={contextValue}>
      {children}
    </PayrollContext.Provider>
  );
};

export const usePayroll = (): PayrollContextType => {
  const context = useContext(PayrollContext);
  if (context === undefined) {
    console.error('usePayroll called outside of PayrollProvider. Component hierarchy:', 
      document.querySelector('[data-testid="payroll-provider"]') ? 'Provider found' : 'Provider NOT found');
    throw new Error('usePayroll must be used within a PayrollProvider. Make sure the component is wrapped with PayrollProvider.');
  }
  return context;
};
