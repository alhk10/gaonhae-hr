import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { EmployeeProfile, PayrollEmployee, CasualEmployeePayroll, EmployeeAllowance, EmployeeDeduction } from '@/types/employee';
import { getEmployees } from '@/services/employeeService';
import { calculateCPF, calculateAge } from '@/utils/cpfCalculations';
import { getEmployeeClaims } from '@/services/claimsService';
import { getEmployeeAttendanceRecords } from '@/services/attendanceService';
import { getEmployeePayrollData, savePayrollRecord, getAllPayrollRecords } from '@/services/payrollService';
import { getEncashmentForPayroll, integrateEncashmentIntoPayroll } from '@/services/payrollEncashmentService';
import { toast } from '@/components/ui/sonner';

interface PayrollState {
  currentPeriod: string;
  status: 'draft' | 'processing' | 'approved' | 'paid' | 'completed';
  fullTimeEmployees: PayrollEmployee[];
  casualEmployees: CasualEmployeePayroll[];
  totalAmount: number;
  lastUpdated: Date;
  availableEmployees: EmployeeProfile[];
  encashmentData: any[];
}

interface PayrollContextType {
  payrollState: PayrollState;
  updateEmployeeSalary: (employeeId: string, newSalary: number) => void;
  updateEmployeeAllowances: (employeeId: string, allowances: { name: string; amount: number }[]) => void;
  updateEmployeeDeductions: (employeeId: string, deductions: { name: string; amount: number }[]) => void;
  updateCasualEmployeeHours: (employeeId: string, hours: number, rate?: number) => void;
  calculatePayrollTotal: () => number;
  setPayrollStatus: (status: PayrollState['status']) => void;
  setCurrentPeriod: (period: string) => void;
  resetPayroll: () => void;
  initializePayroll: () => void;
  savePayrollToSupabase: () => Promise<void>;
  loadPayrollFromSupabase: () => Promise<boolean>;
  addEmployeesToPayroll: (employeeIds: string[]) => Promise<void>;
  removeEmployeeFromPayroll: (employeeId: string) => void;
  refreshAvailableEmployees: () => Promise<void>;
  isLoading: boolean;
}

const PayrollContext = createContext<PayrollContextType | undefined>(undefined);

export const usePayroll = () => {
  const context = useContext(PayrollContext);
  if (!context) {
    throw new Error('usePayroll must be used within a PayrollProvider');
  }
  return context;
};

interface PayrollProviderProps {
  children: ReactNode;
}

export const PayrollProvider = ({ children }: PayrollProviderProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [payrollState, setPayrollState] = useState<PayrollState>({
    currentPeriod: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    status: 'draft',
    fullTimeEmployees: [],
    casualEmployees: [],
    totalAmount: 0,
    lastUpdated: new Date(),
    availableEmployees: [],
    encashmentData: []
  });

  const getApprovedClaimsTotal = async (employeeId: string): Promise<number> => {
    try {
      const claims = await getEmployeeClaims(employeeId);
      const approvedClaims = claims.filter(claim => claim.status === 'Approved');
      return approvedClaims.reduce((sum, claim) => sum + claim.amount, 0);
    } catch (error) {
      console.error('Error fetching approved claims for employee:', employeeId, error);
      return 0;
    }
  };

  const getEmployeeMonthlyHours = async (employeeId: string, period: string): Promise<number> => {
    try {
      const attendanceRecords = await getEmployeeAttendanceRecords(employeeId);
      
      const [monthName, year] = period.split(' ');
      const monthNumber = new Date(`${monthName} 1, ${year}`).getMonth() + 1;
      
      const monthlyRecords = attendanceRecords.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate.getMonth() + 1 === monthNumber && 
               recordDate.getFullYear() === parseInt(year);
      });
      
      const totalHours = monthlyRecords.reduce((sum, record) => sum + record.hoursWorked, 0);
      return totalHours;
    } catch (error) {
      console.error(`Error fetching monthly hours for employee ${employeeId}:`, error);
      return 0;
    }
  };

  const processEmployeePayroll = async (employee: EmployeeProfile): Promise<PayrollEmployee | CasualEmployeePayroll> => {
    const totalAllowances = employee.allowances.reduce((sum, a) => sum + a.amount, 0);
    const totalDeductions = employee.deductions.reduce((sum, d) => sum + d.amount, 0);
    const age = calculateAge(employee.dateOfBirth);
    const approvedClaims = await getApprovedClaimsTotal(employee.id);

    if (employee.type === 'Full-Time') {
      const grossSalary = (employee.baseSalary || 0) + totalAllowances;
      const cpfCalc = calculateCPF(grossSalary, employee.residencyStatus, age);
      const netSalary = grossSalary - cpfCalc.employeeCPF - totalDeductions + approvedClaims;
      
      return {
        id: employee.id,
        name: employee.name,
        type: employee.type,
        baseSalary: employee.baseSalary,
        allowances: employee.allowances,
        deductions: employee.deductions,
        grossPay: grossSalary,
        cpfEmployee: cpfCalc.employeeCPF,
        cpfEmployer: cpfCalc.employerCPF,
        netPay: netSalary,
        cpf: cpfCalc.employerCPF,
        total: netSalary
      } as PayrollEmployee;
    } else {
      // Casual employee processing
      let grossPay = 0;
      let hoursWorked = 0;
      let daysWorked = 0;

      if (employee.paymentType === 'Hourly') {
        hoursWorked = await getEmployeeMonthlyHours(employee.id, payrollState.currentPeriod);
        grossPay = (employee.hourlyRate || 0) * hoursWorked;
        daysWorked = Math.ceil(hoursWorked / 8);
      } else if (employee.paymentType === 'Daily') {
        // Simplified daily calculation - you may want to implement more sophisticated logic
        daysWorked = 22; // Assume standard working days
        grossPay = (employee.dailyRate || employee.dailyWeekdayRate || 0) * daysWorked;
        hoursWorked = daysWorked * 8;
      } else {
        grossPay = employee.baseSalary || 0;
        daysWorked = 22;
        hoursWorked = daysWorked * 8;
      }

      const grossPayWithAllowances = grossPay + totalAllowances;
      const cpfCalc = calculateCPF(grossPayWithAllowances, employee.residencyStatus, age);
      const netPay = grossPayWithAllowances - cpfCalc.employeeCPF - totalDeductions;
      const totalPay = netPay + approvedClaims;

      return {
        id: employee.id,
        name: employee.name,
        type: employee.type,
        baseSalary: employee.baseSalary,
        hourlyRate: employee.hourlyRate,
        dailyRate: employee.dailyRate,
        dailyWeekdayRate: employee.dailyWeekdayRate,
        dailyWeekendRate: employee.dailyWeekendRate,
        paymentType: employee.paymentType,
        allowances: employee.allowances,
        deductions: employee.deductions,
        hoursWorked,
        daysWorked,
        grossPay: grossPayWithAllowances,
        cpfEmployee: cpfCalc.employeeCPF,
        cpfEmployer: cpfCalc.employerCPF,
        netPay,
        totalPay,
        employeeCPF: cpfCalc.employeeCPF,
        employerCPF: cpfCalc.employerCPF,
        cpf: cpfCalc.employerCPF,
        total: totalPay
      } as CasualEmployeePayroll;
    }
  };

  const refreshAvailableEmployees = async () => {
    try {
      const allEmployees = await getEmployees();
      setPayrollState(prev => ({
        ...prev,
        availableEmployees: allEmployees,
        lastUpdated: new Date()
      }));
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Error loading employee data');
    }
  };

  const initializePayroll = async () => {
    console.log('Initializing payroll from Supabase');
    setIsLoading(true);
    
    try {
      await refreshAvailableEmployees();
      
      // Load encashment data for current period
      const [monthName, year] = payrollState.currentPeriod.split(' ');
      const encashmentData = await getEncashmentForPayroll(monthName, parseInt(year));
      
      setPayrollState(prev => ({
        ...prev,
        encashmentData,
        lastUpdated: new Date()
      }));
      
      console.log('Payroll initialized successfully');
    } catch (error) {
      console.error('Error initializing payroll:', error);
      toast.error('Error initializing payroll data');
    } finally {
      setIsLoading(false);
    }
  };

  const addEmployeesToPayroll = async (employeeIds: string[]): Promise<void> => {
    try {
      setIsLoading(true);
      const employeesToAdd = payrollState.availableEmployees.filter(emp => 
        employeeIds.includes(emp.id) && 
        !payrollState.fullTimeEmployees.some(existing => existing.id === emp.id) &&
        !payrollState.casualEmployees.some(existing => existing.id === emp.id)
      );

      const processedEmployees = await Promise.all(
        employeesToAdd.map(emp => processEmployeePayroll(emp))
      );

      const newFullTime: PayrollEmployee[] = [];
      const newCasual: CasualEmployeePayroll[] = [];

      processedEmployees.forEach(emp => {
        if (emp.type === 'Full-Time') {
          newFullTime.push(emp as PayrollEmployee);
        } else {
          newCasual.push(emp as CasualEmployeePayroll);
        }
      });

      // Integrate encashment data
      const [monthName, year] = payrollState.currentPeriod.split(' ');
      const encashmentData = await getEncashmentForPayroll(monthName, parseInt(year));
      
      const enhancedFullTime = newFullTime.map(emp => {
        const basePayrollData = {
          employeeId: emp.id,
          baseSalary: emp.baseSalary,
          allowances: emp.allowances,
          totalAllowances: emp.allowances.reduce((sum, a) => sum + a.amount, 0),
          grossSalary: emp.grossPay,
          totalDeductions: emp.deductions.reduce((sum, d) => sum + d.amount, 0)
        };
        
        const enhancedData = integrateEncashmentIntoPayroll(basePayrollData, encashmentData);
        
        return {
          ...emp,
          grossPay: enhancedData.grossSalary,
          netPay: enhancedData.netSalary,
          total: enhancedData.netSalary,
          allowances: enhancedData.allowances || emp.allowances
        };
      });

      setPayrollState(prev => ({
        ...prev,
        fullTimeEmployees: [...prev.fullTimeEmployees, ...enhancedFullTime],
        casualEmployees: [...prev.casualEmployees, ...newCasual],
        lastUpdated: new Date()
      }));

      // Save to Supabase
      for (const employee of employeesToAdd) {
        const payrollData = await getEmployeePayrollData(employee.id);
        const enhancedPayrollData = integrateEncashmentIntoPayroll(payrollData, encashmentData);
        await savePayrollRecord(employee.id, payrollState.currentPeriod, enhancedPayrollData);
      }

      toast.success(`Successfully added ${employeesToAdd.length} employees to payroll`);
    } catch (error) {
      console.error('Error adding employees to payroll:', error);
      toast.error('Error adding employees to payroll');
    } finally {
      setIsLoading(false);
    }
  };

  const removeEmployeeFromPayroll = (employeeId: string) => {
    setPayrollState(prev => ({
      ...prev,
      fullTimeEmployees: prev.fullTimeEmployees.filter(emp => emp.id !== employeeId),
      casualEmployees: prev.casualEmployees.filter(emp => emp.id !== employeeId),
      lastUpdated: new Date()
    }));
    toast.success('Employee removed from payroll');
  };

  const savePayrollToSupabase = async (): Promise<void> => {
    try {
      console.log('Saving payroll data to Supabase');
      
      const allEmployees = [...payrollState.fullTimeEmployees, ...payrollState.casualEmployees];
      
      for (const employee of allEmployees) {
        const payrollData = await getEmployeePayrollData(employee.id);
        const enhancedPayrollData = integrateEncashmentIntoPayroll(payrollData, payrollState.encashmentData);
        await savePayrollRecord(employee.id, payrollState.currentPeriod, enhancedPayrollData);
      }
      
      console.log('Payroll data saved to Supabase successfully');
      toast.success('Payroll data saved successfully');
    } catch (error) {
      console.error('Error saving payroll to Supabase:', error);
      toast.error('Error saving payroll data');
      throw error;
    }
  };

  const loadPayrollFromSupabase = async (): Promise<boolean> => {
    try {
      console.log('Loading payroll data from Supabase');
      const records = await getAllPayrollRecords();
      
      if (records.length === 0) {
        return false;
      }
      
      const currentPeriodRecords = records.filter(record => record.month === payrollState.currentPeriod);
      return currentPeriodRecords.length > 0;
    } catch (error) {
      console.error('Error loading payroll from Supabase:', error);
      return false;
    }
  };

  const updateEmployeeSalary = (employeeId: string, newSalary: number) => {
    console.log(`Updating salary for employee ${employeeId}: ${newSalary}`);
    
    setPayrollState(prev => ({
      ...prev,
      fullTimeEmployees: prev.fullTimeEmployees.map(emp => {
        if (emp.id === employeeId) {
          const totalAllowances = emp.allowances.reduce((sum, a) => sum + a.amount, 0);
          const totalDeductions = emp.deductions.reduce((sum, d) => sum + d.amount, 0);
          const grossSalary = newSalary + totalAllowances;
          const netSalary = grossSalary - emp.cpfEmployee - totalDeductions;
          
          return {
            ...emp,
            baseSalary: newSalary,
            grossPay: grossSalary,
            netPay: netSalary,
            total: netSalary
          };
        }
        return emp;
      }),
      lastUpdated: new Date()
    }));
  };

  const updateEmployeeAllowances = (employeeId: string, allowances: { name: string; amount: number }[]) => {
    console.log(`Updating allowances for employee ${employeeId}:`, allowances);
    
    setPayrollState(prev => ({
      ...prev,
      fullTimeEmployees: prev.fullTimeEmployees.map(emp => {
        if (emp.id === employeeId) {
          const newAllowances: EmployeeAllowance[] = allowances.map((a, index) => ({
            id: `${employeeId}-allowance-${index}`,
            name: a.name,
            amount: a.amount,
            type: 'Fixed' as const
          }));
          const totalAllowances = allowances.reduce((sum, a) => sum + a.amount, 0);
          const totalDeductions = emp.deductions.reduce((sum, d) => sum + d.amount, 0);
          const grossSalary = (emp.baseSalary || 0) + totalAllowances;
          const netSalary = grossSalary - emp.cpfEmployee - totalDeductions;
          
          return {
            ...emp,
            allowances: newAllowances,
            grossPay: grossSalary,
            netPay: netSalary,
            total: netSalary
          };
        }
        return emp;
      }),
      lastUpdated: new Date()
    }));
  };

  const updateEmployeeDeductions = (employeeId: string, deductions: { name: string; amount: number }[]) => {
    console.log(`Updating deductions for employee ${employeeId}:`, deductions);
    
    setPayrollState(prev => ({
      ...prev,
      fullTimeEmployees: prev.fullTimeEmployees.map(emp => {
        if (emp.id === employeeId) {
          const newDeductions: EmployeeDeduction[] = deductions.map((d, index) => ({
            id: `${employeeId}-deduction-${index}`,
            name: d.name,
            amount: d.amount,
            type: 'Fixed' as const
          }));
          const totalAllowances = emp.allowances.reduce((sum, a) => sum + a.amount, 0);
          const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
          const grossSalary = (emp.baseSalary || 0) + totalAllowances;
          const netSalary = grossSalary - emp.cpfEmployee - totalDeductions;
          
          return {
            ...emp,
            deductions: newDeductions,
            grossPay: grossSalary,
            netPay: netSalary,
            total: netSalary
          };
        }
        return emp;
      }),
      lastUpdated: new Date()
    }));
  };

  const updateCasualEmployeeHours = (employeeId: string, hours: number, rate?: number) => {
    console.log(`Updating hours for casual employee ${employeeId}: ${hours} hours${rate ? `, rate: ${rate}` : ''}`);
    
    setPayrollState(prev => ({
      ...prev,
      casualEmployees: prev.casualEmployees.map(emp => {
        if (emp.id === employeeId) {
          const newRate = rate || emp.hourlyRate;
          let grossPay = 0;
          
          if (emp.paymentType === 'Hourly') {
            grossPay = newRate * hours;
          } else if (emp.paymentType === 'Daily') {
            const daysWorked = Math.ceil(hours / 8);
            grossPay = (emp.dailyWeekdayRate || emp.dailyRate || 0) * daysWorked;
          } else if (emp.paymentType === 'Monthly') {
            grossPay = emp.baseSalary || 0;
          }
          
          const totalAllowances = emp.allowances.reduce((sum, a) => sum + a.amount, 0);
          const totalDeductions = emp.deductions.reduce((sum, d) => sum + d.amount, 0);
          const grossPayWithAllowances = grossPay + totalAllowances;
          const netPay = grossPayWithAllowances - emp.employeeCPF - totalDeductions;
          
          return {
            ...emp,
            hourlyRate: newRate,
            hoursWorked: hours,
            grossPay: grossPayWithAllowances,
            netPay,
            totalPay: netPay
          };
        }
        return emp;
      }),
      lastUpdated: new Date()
    }));
  };

  const calculatePayrollTotal = (): number => {
    const fullTimeTotal = payrollState.fullTimeEmployees.reduce((sum, emp) => sum + emp.netPay, 0);
    const casualTotal = payrollState.casualEmployees.reduce((sum, emp) => sum + emp.totalPay, 0);
    return Math.round((fullTimeTotal + casualTotal) * 100) / 100;
  };

  const setPayrollStatus = (status: PayrollState['status']) => {
    console.log(`Setting payroll status to: ${status}`);
    setPayrollState(prev => ({ ...prev, status, lastUpdated: new Date() }));
  };

  const setCurrentPeriod = (period: string) => {
    console.log(`Setting current period to: ${period}`);
    setPayrollState(prev => ({ ...prev, currentPeriod: period, lastUpdated: new Date() }));
    // Reinitialize when period changes
    initializePayroll();
  };

  const resetPayroll = () => {
    console.log('Resetting payroll to initial state');
    setPayrollState(prev => ({
      ...prev,
      fullTimeEmployees: [],
      casualEmployees: [],
      status: 'draft',
      lastUpdated: new Date()
    }));
  };

  useEffect(() => {
    initializePayroll();
  }, []);

  useEffect(() => {
    const total = calculatePayrollTotal();
    setPayrollState(prev => ({ ...prev, totalAmount: total }));
  }, [payrollState.fullTimeEmployees, payrollState.casualEmployees]);

  return (
    <PayrollContext.Provider value={{
      payrollState,
      updateEmployeeSalary,
      updateEmployeeAllowances,
      updateEmployeeDeductions,
      updateCasualEmployeeHours,
      calculatePayrollTotal,
      setPayrollStatus,
      setCurrentPeriod,
      resetPayroll,
      initializePayroll,
      savePayrollToSupabase,
      loadPayrollFromSupabase,
      addEmployeesToPayroll,
      removeEmployeeFromPayroll,
      refreshAvailableEmployees,
      isLoading
    }}>
      {children}
    </PayrollContext.Provider>
  );
};
