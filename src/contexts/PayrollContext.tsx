import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import type { EmployeeProfile, EmployeeAllowance, EmployeeDeduction } from '@/types/employee';
import type { FullTimeEmployee, CasualEmployee, PayrollState } from '@/types/payroll';
import { calculateCasualPayroll, calculateFullTimePayroll, isSlotBookingPayrollPeriod } from '@/utils/payrollCalculations';
import { getSlotBookingPayForPeriod } from '@/services/slotBookingPayrollService';
import { calculateCasualEmployeePayroll } from '@/services/casualPayrollCalculationService';
import { formatPeriodForAPI, getCurrentPeriod } from '@/utils/periodUtils';
import { logger } from '@/utils/logger';
import { usePayrollPersistence } from '@/hooks/usePayrollPersistence';

export interface PayrollContextType {
  payrollState: PayrollState;
  setPayrollState: React.Dispatch<React.SetStateAction<PayrollState>>;
  addFullTimeEmployee: (employee: Omit<FullTimeEmployee, 'id' | 'netPay'>) => void;
  updateFullTimeEmployee: (id: string, updates: Partial<Omit<FullTimeEmployee, 'id' | 'netPay'>>) => void;
  removeFullTimeEmployee: (id: string) => void;
  addCasualEmployee: (employee: Omit<CasualEmployee, 'id' | 'totalPay' | 'grossPay' | 'employeeCPF' | 'employerCPF' | 'allowances' | 'deductions' | 'cpfEmployee' | 'cpfEmployer' | 'netPay' | 'cpf' | 'total'>, periodOverride?: string) => Promise<void>;
  updateCasualEmployee: (id: string, updates: Partial<Omit<CasualEmployee, 'id' | 'totalPay'>>) => void;
  removeCasualEmployee: (id: string) => void;
  calculatePayrollTotal: () => number;
  setCurrentPeriod: (period: string) => void;
  savePayrollToSupabase: () => Promise<void>;
  loadPayrollFromSupabase: () => Promise<void>;
  setPayrollStatus: (status: PayrollState['status']) => void;
  addEmployeesToPayroll: (employeeIds: string[], claimsData?: any, period?: string, employeeProfiles?: EmployeeProfile[]) => Promise<void>;
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

  // Use persistence hook for Supabase operations
  const { savePayrollToSupabase, loadPayrollFromSupabase } = usePayrollPersistence(
    payrollState,
    setPayrollState
  );

  // Initialize payroll data when component mounts
  useEffect(() => {
    const initializePayroll = async () => {
      try {
        await loadPayrollFromSupabase();
      } catch (error) {
        logger.error('Error initializing PayrollContext', error);
      }
    };

    initializePayroll();
  }, [loadPayrollFromSupabase]);

  // Auto-load payroll data when period changes
  useEffect(() => {
    if (payrollState.currentPeriod) {
      // Check if this is November 2025 or later - skip auto-load for dynamic pricing periods
      const formatPeriodForCheck = (period: string): string => {
        if (period.includes('-')) return period;
        const [monthName, year] = period.split(' ');
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const monthIndex = monthNames.indexOf(monthName);
        if (monthIndex === -1) return period;
        return `${year}-${(monthIndex + 1).toString().padStart(2, '0')}`;
      };
      
      const formattedPeriod = formatPeriodForCheck(payrollState.currentPeriod);
      const [year, month] = formattedPeriod.split('-').map(Number);
      const isNovember2025OrLater = (year > 2025) || (year === 2025 && month >= 11);
      
      if (isNovember2025OrLater) {
        logger.debug('November 2025+ detected - skipping auto-load', { period: payrollState.currentPeriod });
        return; // Skip auto-load for November 2025+ - PayrollProcessing handles this manually
      }
      
      const loadPayrollData = async () => {
        logger.info('Period changed, loading payroll', { period: payrollState.currentPeriod });
        try {
          await loadPayrollFromSupabase();
          logger.info('Payroll loaded successfully', { period: payrollState.currentPeriod });
        } catch (error) {
          logger.error('Error auto-loading payroll data', error);
        }
      };

      // Debounce the loading to prevent multiple rapid calls
      const timeoutId = setTimeout(loadPayrollData, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [payrollState.currentPeriod, loadPayrollFromSupabase]);


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

    setPayrollState(prevState => {
      // De-duplicate: check if employee already exists
      const alreadyExists = prevState.fullTimeEmployees.some(emp => emp.employeeId === newEmployee.employeeId);
      if (alreadyExists) {
        logger.debug('Full-time employee already in payroll, skipping', { id: newEmployee.employeeId });
        return prevState;
      }
      return {
        ...prevState,
        fullTimeEmployees: [...prevState.fullTimeEmployees, newEmployee],
        lastUpdated: new Date(),
      };
    });
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

  const addCasualEmployee = useCallback(async (employee: Omit<CasualEmployee, 'id' | 'totalPay' | 'grossPay' | 'employeeCPF' | 'employerCPF'> & { claims?: number }, periodOverride?: string, prefetchedProfile?: EmployeeProfile) => {
    const id = uuidv4();
    const effectivePeriod = periodOverride || payrollState.currentPeriod;
    
    logger.debug('Casual employee payroll calculation start', { id: employee.employeeId, period: effectivePeriod });
    
    if (!effectivePeriod) {
      console.error('❌ [addCasualEmployee] NO PERIOD PROVIDED - ABORTING');
      throw new Error('No period provided for payroll calculation');
    }
    
    // Use prefetched profile if provided, otherwise find from available employees
    let employeeProfile = prefetchedProfile || payrollState.availableEmployees.find(emp => emp.id === employee.employeeId);
    
    // If not found in available employees, fetch directly from database
    if (!employeeProfile) {
      logger.debug('Employee not in cache, fetching from database', { id: employee.employeeId });
      try {
        const { data: empData, error } = await supabase
          .from('employees')
          .select('*, allowances(*), deductions(*)')
          .eq('id', employee.employeeId)
          .single();

        if (error) {
          console.error('  ❌ Database error:', error);
          throw error;
        }

        if (empData) {
          const allowances: EmployeeAllowance[] = (empData.allowances || []).map((allowance: any) => ({
            id: allowance.id,
            employeeId: allowance.employee_id,
            name: allowance.name,
            amount: allowance.amount,
            type: allowance.type || 'Fixed'
          }));

          const deductions: EmployeeDeduction[] = (empData.deductions || []).map((deduction: any) => ({
            id: deduction.id,
            employeeId: deduction.employee_id,
            name: deduction.name,
            amount: deduction.amount,
            type: deduction.type || 'Fixed'
          }));

          employeeProfile = {
            id: empData.id,
            name: empData.name,
            type: empData.type as 'Full-Time' | 'Casual',
            baseSalary: empData.base_salary,
            hourlyRate: empData.hourly_rate,
            paymentType: empData.payment_type as 'Monthly' | 'Hourly' | 'Daily',
            nric: empData.nric,
            dateOfBirth: empData.date_of_birth,
            residencyStatus: empData.residency_status,
            bankName: empData.bank_name,
            bankAccount: empData.bank_account,
            position: empData.position || '',
            phone: empData.phone || '',
            address: empData.address || '',
            email: empData.email || '',
            joinDate: empData.join_date,
            qualifications: (empData.qualifications || {}) as any,
            allowances,
            deductions,
            branch: '',
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
          logger.debug('Employee fetched successfully', { id: employee.employeeId });
        }
      } catch (error) {
        console.error('  ❌ Fatal error fetching employee profile:', error);
        throw new Error(`Failed to fetch employee profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    if (!employeeProfile) {
      const errMsg = `Employee profile not found for ID: ${employee.employeeId}`;
      console.error('  ❌', errMsg);
      throw new Error(errMsg);
    }

    logger.debug('Employee profile loaded, calling calculation service', { id: employee.employeeId });

    try {
      // CRITICAL: Use the new calculation service for ALL periods
      const payrollResult = await calculateCasualEmployeePayroll(
        employeeProfile,
        effectivePeriod,
        employee.hoursWorked || 0,
        employee.daysWorked || 0,
        employee.claims || 0
      );

      logger.debug('Calculation complete', { id: employee.employeeId, method: payrollResult.calculationMethod, slotCount: payrollResult.slotCount });

      const newEmployee: CasualEmployee = {
        ...employee,
        id,
        totalPay: payrollResult.totalPay,
        employeeCPF: payrollResult.employeeCPF,
        employerCPF: payrollResult.employerCPF,
        grossPay: payrollResult.grossPay,
        baseSalary: payrollResult.baseSalary,
        paymentType: employeeProfile.paymentType,
        allowances: employeeProfile.allowances || [],
        deductions: employeeProfile.deductions || [],
        cpfEmployee: payrollResult.employeeCPF,
        cpfEmployer: payrollResult.employerCPF,
        netPay: payrollResult.totalPay,
        cpf: payrollResult.employeeCPF + payrollResult.employerCPF,
        total: payrollResult.totalPay,
        slotBookingPay: payrollResult.slotBookingPay,
        slotBookingMetadata: {
          totalSlots: payrollResult.slotCount,
          hasBookings: payrollResult.slotCount > 0,
          breakdown: payrollResult.breakdown,
          calculationMethod: payrollResult.calculationMethod
        },
        warnings: payrollResult.warnings
      } as CasualEmployee;

      console.log('  ✅ Employee object created with metadata:');
      console.log('     - calculationMethod:', newEmployee.slotBookingMetadata?.calculationMethod);
      console.log('     - totalSlots:', newEmployee.slotBookingMetadata?.totalSlots);
      console.log('     - slotBookingPay:', newEmployee.slotBookingPay);
      console.log('');

      setPayrollState(prevState => {
        // De-duplicate: check if employee already exists
        const alreadyExists = prevState.casualEmployees.some(emp => emp.employeeId === newEmployee.employeeId);
        if (alreadyExists) {
          console.log(`  ⚠ Casual employee ${newEmployee.name} already in payroll, skipping`);
          return prevState;
        }
        return {
          ...prevState,
          casualEmployees: [...prevState.casualEmployees, newEmployee],
          lastUpdated: new Date(),
        };
      });

      console.log('  ✅ Employee added to payroll state\n');
    } catch (error) {
      console.error('\n❌ ═══════════════════════════════════════════════════════════');
      console.error('❌  FATAL ERROR IN CALCULATION');
      console.error('❌ ═══════════════════════════════════════════════════════════');
      console.error('Error details:', error);
      console.error('Employee:', employee.name, employee.employeeId);
      console.error('Period:', effectivePeriod);
      console.error('❌ ═══════════════════════════════════════════════════════════\n');
      throw error;
    }
  }, [payrollState.availableEmployees, payrollState.currentPeriod]);

  const updateCasualEmployee = useCallback(async (id: string, updates: Partial<Omit<CasualEmployee, 'id' | 'totalPay' | 'employeeCPF' | 'employerCPF' | 'grossPay'>>) => {
    setPayrollState(prevState => {
      const employee = prevState.casualEmployees.find(emp => emp.id === id);
      if (!employee) return prevState;

      const updatedEmployee = { ...employee, ...updates };
      
      // Find the employee profile for complete data
      const employeeProfile = prevState.availableEmployees.find(emp => emp.id === updatedEmployee.employeeId);
      
      if (!employeeProfile) {
        console.error('Employee profile not found for update:', updatedEmployee.employeeId);
        return prevState;
      }

      // Fetch slot booking pay in the background - don't block UI update
      (async () => {
        let slotBookingPay = 0;
        if (prevState.currentPeriod) {
          try {
            const { isSlotBookingPayrollPeriod } = await import('@/utils/payrollCalculations');
            const shouldUseSlotBooking = isSlotBookingPayrollPeriod(prevState.currentPeriod);
            
            if (shouldUseSlotBooking) {
              const { getSlotBookingPayForPeriod } = await import('@/services/slotBookingPayrollService');
              const slotPayData = await getSlotBookingPayForPeriod(
                updatedEmployee.employeeId,
                prevState.currentPeriod,
                employeeProfile
              );
              slotBookingPay = slotPayData.totalPay;
              const slotBookingMetadata = {
                totalSlots: slotPayData.totalSlots,
                hasBookings: slotPayData.totalSlots > 0
              };
            
              // Re-calculate with slot booking pay and update state
              const calculation = calculateCasualPayroll(
                employeeProfile,
                updatedEmployee.hoursWorked || 0,
                updatedEmployee.daysWorked || 0,
                0,
                slotBookingPay
              );

              setPayrollState(prev => ({
                ...prev,
                casualEmployees: prev.casualEmployees.map(emp => 
                  emp.id === id ? {
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
                    total: calculation.netSalary,
                    slotBookingPay,
                    slotBookingMetadata
                  } as CasualEmployee : emp
                ),
                lastUpdated: new Date(),
              }));
            }
          } catch (error) {
            console.error('[PayrollContext] Error fetching slot booking pay on update:', error);
          }
        }
      })();

      // Initial calculation without slot booking pay (will be updated above)
      const calculation = calculateCasualPayroll(
        employeeProfile,
        updatedEmployee.hoursWorked || 0,
        updatedEmployee.daysWorked || 0,
        0
      );

      return {
        ...prevState,
        casualEmployees: prevState.casualEmployees.map(employee =>
          employee.id === id ? {
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
          } as CasualEmployee : employee
        ),
        lastUpdated: new Date(),
      };
    });
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
        .select('id, name, type, base_salary, hourly_rate, payment_type, nric, date_of_birth, residency_status, bank_name, bank_account, position, phone, address, email, join_date, qualifications');

      if (error) throw error;
      
      let allEmployees = employees || [];
      logger.debug('Loaded employees from database', { count: allEmployees.length });

      // Fetch allowances and deductions for all employees
      const allEmployeeIds = allEmployees.map(emp => emp.id);
      
      const [allowancesResult, deductionsResult] = await Promise.all([
        supabase.from('allowances').select('*').in('employee_id', allEmployeeIds),
        supabase.from('deductions').select('*').in('employee_id', allEmployeeIds)
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

      const availableEmployees: EmployeeProfile[] = allEmployees.map(emp => ({
        id: emp.id,
        name: emp.name,
        nric: emp.nric || '',
        dateOfBirth: emp.date_of_birth || '',
        residencyStatus: emp.residency_status || '',
        type: emp.type as 'Full-Time' | 'Casual',
        baseSalary: emp.base_salary || undefined,
        hourlyRate: emp.hourly_rate || undefined,
        paymentType: (emp.payment_type as 'Monthly' | 'Hourly' | 'Daily') || 'Monthly',
        bankName: emp.bank_name || '',
        bankAccount: emp.bank_account || '',
        branch: '', // Default empty since not in DB
        position: emp.position || '',
        phone: emp.phone || '',
        address: emp.address || '',
        email: emp.email,
        joinDate: emp.join_date,
        qualifications: (emp.qualifications as any) || {},
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

      logger.debug('Processed availableEmployees', { count: availableEmployees.length });

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

  const addEmployeesToPayroll = useCallback(async (employeeIds: string[], claimsData?: any, period?: string, employeeProfiles?: EmployeeProfile[]) => {
    const effectivePeriod = period || payrollState.currentPeriod;
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  🚀 ADD EMPLOYEES TO PAYROLL - START                      ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║  Period:', effectivePeriod.padEnd(48), '║');
    console.log('║  Employee IDs:', employeeIds.length.toString().padEnd(42), '║');
    console.log('║  Profiles passed:', (employeeProfiles?.length || 0).toString().padEnd(41), '║');
    console.log('║  Available in Context:', payrollState.availableEmployees.length.toString().padEnd(32), '║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    // Use passed employee profiles OR fall back to context (with direct fetch as last resort)
    let employeesToAdd = employeeProfiles?.filter(emp => employeeIds.includes(emp.id)) || [];
    
    if (employeesToAdd.length === 0) {
      console.log('  ⚠ No profiles passed, checking context...');
      employeesToAdd = payrollState.availableEmployees.filter(emp => 
        employeeIds.includes(emp.id)
      );
    }
    
    console.log(`  ✓ Filtered ${employeesToAdd.length} employees to add`);
    console.log(`  ✓ Casual employees: ${employeesToAdd.filter(e => e.type === 'Casual').length}`);
    console.log(`  ✓ Full-Time employees: ${employeesToAdd.filter(e => e.type === 'Full-Time').length}\n`);
    if (employeesToAdd.length === 0) {
      console.error('❌ NO EMPLOYEES TO ADD!');
      console.error('   Profiles passed:', employeeProfiles?.length || 0);
      console.error('   Available employees:', payrollState.availableEmployees.length);
      console.error('   Requested IDs:', employeeIds.length);
      return;
    }

    // Fetch optimized payroll data including claims if not provided
    let payrollOptimizedData = null;
    if (!claimsData) {
      try {
        const { getEmployeePayrollDataOptimized } = await import('@/services/payrollOptimizationService');
        payrollOptimizedData = await getEmployeePayrollDataOptimized(employeeIds, effectivePeriod);
        console.log('Fetched optimized payroll data in addEmployeesToPayroll:', payrollOptimizedData);
      } catch (error) {
        console.error('Error fetching optimized payroll data:', error);
      }
    }

    // Track processed IDs locally to prevent duplicates within this batch
    // Note: We don't check against payrollState here because it uses stale closure data
    // The de-duplication inside addFullTimeEmployee/addCasualEmployee uses prevState which is accurate
    const processedIdsInBatch = new Set<string>();
    
    for (const employee of employeesToAdd) {
      console.log(`\n  → Processing: ${employee.name} (${employee.type})`);
      
      // Only check within this batch to prevent duplicate processing
      // The actual state de-duplication happens inside the setter functions with prevState
      if (processedIdsInBatch.has(employee.id)) {
        console.log(`    ⊗ Already processed in this batch, skipping...`);
        continue;
      }
      
      // Mark as processed for this batch
      processedIdsInBatch.add(employee.id);
      processedIdsInBatch.add(employee.id);

      // Get claims for this employee - exclude partner claim types that go to Branch P&L (only for partners)
      const PARTNER_CLAIM_TYPES = [
        'Transport',
        'Office Stationeries', 
        'Training Equipment',
        'Other Business Expense'
      ];
      const isPartner = employee.position?.toLowerCase().includes('partner');
      const employeeClaims = payrollOptimizedData?.claims?.[employee.id] || claimsData?.claims?.[employee.id] || [];
      const totalClaims = employeeClaims
        .filter((claim: any) => !isPartner || !PARTNER_CLAIM_TYPES.includes(claim.type))
        .reduce((sum: number, claim: any) => sum + (claim.amount || 0), 0);
      
      console.log(`    ✓ Claims: ${totalClaims} (${employeeClaims.length} items, partner claims excluded)`);

      if (employee.type === 'Full-Time') {
        console.log(`    ✓ Adding as Full-Time...`);
        addFullTimeEmployee({
          employeeId: employee.id,
          name: employee.name,
          baseSalary: employee.baseSalary || 0,
          allowances: 0,
          cpfContribution: 20,
          claims: totalClaims
        });
      } else {
        // Get attendance data for casual employees
        const attendanceData = payrollOptimizedData?.attendance?.[employee.id];
        const hoursWorked = attendanceData?.totalHours || 0;
        const daysWorked = attendanceData?.totalDays || 0;
        
        console.log(`    ✓ Adding as Casual with ${hoursWorked}h / ${daysWorked}d...`);
        console.log(`    ✓ Calling addCasualEmployee with period: ${effectivePeriod}`);
        
        try {
          // Pass the full employee profile to ensure qualifications are available
          await addCasualEmployee({
            employeeId: employee.id,
            name: employee.name,
            hourlyRate: employee.hourlyRate || 0,
            hoursWorked: hoursWorked,
            daysWorked: daysWorked,
            paymentType: employee.paymentType,
            baseSalary: employee.baseSalary,
            claims: totalClaims
          }, effectivePeriod, employee);
          console.log(`    ✅ ${employee.name} added successfully`);
        } catch (error) {
          console.error(`    ❌ Failed to add ${employee.name}:`, error);
        }
      }
    }
    
    console.log('\n✅ ADD EMPLOYEES TO PAYROLL - COMPLETE\n');
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

      logger.debug('Grouped attendance for unique employees', { count: Object.keys(employeeAttendance).length });

      // Filter out employees already in payroll, but be more lenient for debugging
      const existingEmployeeIds = new Set([
        ...payrollState.casualEmployees.map(emp => emp.employeeId),
        ...payrollState.fullTimeEmployees.map(emp => emp.employeeId)
      ]);

      logger.debug('Current employees in payroll', { count: existingEmployeeIds.size });

      const eligibleEmployees = Object.values(employeeAttendance)
        .filter((item: any) => {
          const isNotAlreadyInPayroll = !existingEmployeeIds.has(item.employee.id);
          const hasValidEmployee = item.employee && item.employee.id;
          const hasValidHours = item.totalHours > 0;
          
          if (!isNotAlreadyInPayroll) {
            logger.debug('Employee already in payroll', { id: item.employee?.id });
          }
          if (!hasValidHours) {
            logger.debug('Employee has no hours', { id: item.employee?.id });
          }
          
          return isNotAlreadyInPayroll && hasValidEmployee && hasValidHours;
        })
        .map((item: any) => {
          const employee = item.employee;
          const result = {
            id: employee.id,
            name: employee.name,
            employeeId: employee.id,
            paymentType: 'Daily',
            hourlyRate: employee.hourly_rate || 0,
            baseSalary: employee.base_salary || 0,
            totalHours: item.totalHours,
            totalDays: item.totalDays,
            attendanceRecords: item.records.length
          };
          
          logger.debug('Eligible employee', { id: result.employeeId, hours: result.totalHours, days: result.totalDays });
          return result;
        });

      logger.debug('Final eligible employees', { count: eligibleEmployees.length });
      return eligibleEmployees;
      
    } catch (error) {
      console.error('Error fetching eligible casual employees:', error);
      return [];
    }
  }, [payrollState.currentPeriod, payrollState.casualEmployees, payrollState.fullTimeEmployees]);

  const autoAddCasualEmployeesWithAttendance = useCallback(async () => {
    setPayrollState(prevState => ({ ...prevState, isLoading: true }));
    
    try {
      logger.debug('Starting auto-add casual employees with attendance');
      const eligibleEmployees = await getEligibleCasualEmployeesForPayroll();
      
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

        logger.debug('Adding employee to payroll', { id: employee.id, paymentType, hoursWorked, daysWorked });

        await addCasualEmployee({
          employeeId: employee.id,
          name: employee.name,
          hourlyRate: employee.hourlyRate,
          hoursWorked: hoursWorked,
          daysWorked: daysWorked,
          paymentType: paymentType,
          baseSalary: employee.baseSalary
        }, payrollState.currentPeriod);
      }

      logger.debug('Successfully added casual employees to payroll', { count: eligibleEmployees.length });
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
