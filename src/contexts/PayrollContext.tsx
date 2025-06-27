import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { EmployeeProfile, PayrollEmployee, CasualEmployeePayroll, EmployeeAllowance, EmployeeDeduction } from '@/types/employee';
import { getEmployees } from '@/services/employeeService';
import { calculateCPF, calculateAge } from '@/utils/cpfCalculations';
import { getEmployeeClaims } from '@/services/claimsService';
import { getEmployeeAttendanceRecords } from '@/services/attendanceService';

interface PayrollState {
  currentPeriod: string;
  status: 'draft' | 'processing' | 'approved' | 'paid' | 'completed';
  fullTimeEmployees: PayrollEmployee[];
  casualEmployees: CasualEmployeePayroll[];
  totalAmount: number;
  lastUpdated: Date;
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
  savePayrollDraft: () => void;
  loadPayrollDraft: () => boolean;
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
    currentPeriod: 'December 2024',
    status: 'draft',
    fullTimeEmployees: [],
    casualEmployees: [],
    totalAmount: 0,
    lastUpdated: new Date()
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
      
      // Parse the payroll period (e.g., "December 2024") to get month and year
      const [monthName, year] = period.split(' ');
      const monthNumber = new Date(`${monthName} 1, ${year}`).getMonth() + 1;
      
      // Filter attendance records for the specific month/year
      const monthlyRecords = attendanceRecords.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate.getMonth() + 1 === monthNumber && 
               recordDate.getFullYear() === parseInt(year);
      });
      
      // Sum up the hours worked for that month
      const totalHours = monthlyRecords.reduce((sum, record) => sum + record.hours, 0);
      console.log(`Employee ${employeeId} worked ${totalHours} hours in ${period}`);
      
      return totalHours;
    } catch (error) {
      console.error(`Error fetching monthly hours for employee ${employeeId}:`, error);
      return 0;
    }
  };

  const getEmployeeMonthlyDays = async (employeeId: string, period: string): Promise<{weekdays: number, weekends: number}> => {
    try {
      const attendanceRecords = await getEmployeeAttendanceRecords(employeeId);
      
      const [monthName, year] = period.split(' ');
      const monthNumber = new Date(`${monthName} 1, ${year}`).getMonth() + 1;
      
      const monthlyRecords = attendanceRecords.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate.getMonth() + 1 === monthNumber && 
               recordDate.getFullYear() === parseInt(year);
      });
      
      let weekdays = 0;
      let weekends = 0;
      
      monthlyRecords.forEach(record => {
        const recordDate = new Date(record.date);
        const dayOfWeek = recordDate.getDay();
        
        if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
          weekends++;
        } else {
          weekdays++;
        }
      });
      
      console.log(`Employee ${employeeId} worked ${weekdays} weekdays and ${weekends} weekends in ${period}`);
      return { weekdays, weekends };
    } catch (error) {
      console.error(`Error fetching monthly days for employee ${employeeId}:`, error);
      return { weekdays: 0, weekends: 0 };
    }
  };

  const calculateCasualEmployeePay = async (emp: EmployeeProfile, period: string) => {
    const totalAllowances = emp.allowances.reduce((sum, a) => sum + a.amount, 0);
    const totalDeductions = emp.deductions.reduce((sum, d) => sum + d.amount, 0);
    
    let grossPay = 0;
    let hoursWorked = 0;
    let daysWorked = 0;
    
    if (emp.paymentType === 'Hourly') {
      hoursWorked = await getEmployeeMonthlyHours(emp.id, period);
      grossPay = (emp.hourlyRate || 0) * hoursWorked;
      daysWorked = Math.ceil(hoursWorked / 8);
    } else if (emp.paymentType === 'Daily') {
      const { weekdays, weekends } = await getEmployeeMonthlyDays(emp.id, period);
      const weekdayPay = (emp.dailyWeekdayRate || emp.dailyRate || 0) * weekdays;
      const weekendPay = (emp.dailyWeekendRate || emp.dailyRate || 0) * weekends;
      grossPay = weekdayPay + weekendPay;
      daysWorked = weekdays + weekends;
      hoursWorked = daysWorked * 8; // Estimate hours
    } else if (emp.paymentType === 'Monthly') {
      grossPay = emp.baseSalary || 0;
      daysWorked = 22; // Standard working days
      hoursWorked = daysWorked * 8;
    }
    
    const grossPayWithAllowances = grossPay + totalAllowances;
    const age = calculateAge(emp.dateOfBirth);
    const cpfCalc = calculateCPF(grossPayWithAllowances, emp.residencyStatus, age);
    const approvedClaims = await getApprovedClaimsTotal(emp.id);
    const netPay = grossPayWithAllowances - cpfCalc.employeeCPF - totalDeductions;
    const totalPay = netPay + approvedClaims;
    
    return {
      grossPay: grossPayWithAllowances,
      cpfEmployee: cpfCalc.employeeCPF,
      cpfEmployer: cpfCalc.employerCPF,
      netPay,
      totalPay,
      hoursWorked,
      daysWorked,
      employeeCPF: cpfCalc.employeeCPF,
      employerCPF: cpfCalc.employerCPF
    };
  };

  const initializePayroll = async () => {
    console.log('Initializing payroll from both Supabase and local employee data');
    setIsLoading(true);
    
    try {
      let allEmployees = [];
      try {
        allEmployees = await getEmployees();
        console.log('Fetched employees from Supabase for payroll:', allEmployees.length);
      } catch (supabaseError) {
        console.log('Supabase fetch failed, using local employee data:', supabaseError);
        const { getEmployees: getLocalEmployees } = await import('@/data/employeeData');
        allEmployees = getLocalEmployees();
        console.log('Using local employee data for payroll:', allEmployees.length);
      }
      
      if (allEmployees.length === 0) {
        console.log('No employees found in any data source');
        setPayrollState(prev => ({
          ...prev,
          fullTimeEmployees: [],
          casualEmployees: [],
          lastUpdated: new Date()
        }));
        setIsLoading(false);
        return;
      }

      const fullTimeEmps = allEmployees.filter(emp => emp.type === 'Full-Time');
      const casualEmps = allEmployees.filter(emp => emp.type === 'Casual');

      console.log(`Found ${fullTimeEmps.length} full-time and ${casualEmps.length} casual employees`);

      // Initialize full-time employees
      const fullTimePayroll: PayrollEmployee[] = await Promise.all(
        fullTimeEmps.map(async (emp) => {
          try {
            const totalAllowances = emp.allowances.reduce((sum, a) => sum + a.amount, 0);
            const totalDeductions = emp.deductions.reduce((sum, d) => sum + d.amount, 0);
            const grossSalary = (emp.baseSalary || 0) + totalAllowances;
            
            const age = calculateAge(emp.dateOfBirth);
            const cpfCalc = calculateCPF(grossSalary, emp.residencyStatus, age);
            const approvedClaims = await getApprovedClaimsTotal(emp.id);
            const netSalary = grossSalary - cpfCalc.employeeCPF - totalDeductions + approvedClaims;
            
            return {
              id: emp.id,
              name: emp.name,
              type: emp.type,
              baseSalary: emp.baseSalary,
              hourlyRate: emp.hourlyRate,
              dailyRate: emp.dailyRate,
              dailyWeekdayRate: emp.dailyWeekdayRate,
              dailyWeekendRate: emp.dailyWeekendRate,
              paymentType: emp.paymentType,
              allowances: emp.allowances,
              deductions: emp.deductions,
              grossPay: grossSalary,
              cpfEmployee: cpfCalc.employeeCPF,
              cpfEmployer: cpfCalc.employerCPF,
              netPay: netSalary,
              cpf: cpfCalc.employerCPF,
              total: netSalary
            };
          } catch (error) {
            console.error('Error processing full-time employee:', emp.id, error);
            return {
              id: emp.id,
              name: emp.name,
              type: emp.type,
              baseSalary: emp.baseSalary,
              hourlyRate: emp.hourlyRate,
              dailyRate: emp.dailyRate,
              dailyWeekdayRate: emp.dailyWeekdayRate,
              dailyWeekendRate: emp.dailyWeekendRate,
              paymentType: emp.paymentType,
              allowances: emp.allowances,
              deductions: emp.deductions,
              grossPay: emp.baseSalary || 0,
              cpfEmployee: 0,
              cpfEmployer: 0,
              netPay: emp.baseSalary || 0,
              cpf: 0,
              total: emp.baseSalary || 0
            };
          }
        })
      );

      // Initialize casual employees with proper payment type handling
      const casualPayroll: CasualEmployeePayroll[] = await Promise.all(
        casualEmps.map(async (emp) => {
          try {
            const payCalc = await calculateCasualEmployeePay(emp, payrollState.currentPeriod);
            
            console.log(`Casual employee ${emp.name} (${emp.paymentType}): Total Pay = S$${payCalc.totalPay}`);
            
            return {
              id: emp.id,
              name: emp.name,
              type: emp.type,
              baseSalary: emp.baseSalary,
              hourlyRate: emp.hourlyRate,
              dailyRate: emp.dailyRate,
              dailyWeekdayRate: emp.dailyWeekdayRate,
              dailyWeekendRate: emp.dailyWeekendRate,
              paymentType: emp.paymentType,
              allowances: emp.allowances,
              deductions: emp.deductions,
              hoursWorked: payCalc.hoursWorked,
              daysWorked: payCalc.daysWorked,
              grossPay: payCalc.grossPay,
              cpfEmployee: payCalc.cpfEmployee,
              cpfEmployer: payCalc.cpfEmployer,
              netPay: payCalc.netPay,
              totalPay: payCalc.totalPay,
              employeeCPF: payCalc.employeeCPF,
              employerCPF: payCalc.employerCPF,
              cpf: payCalc.cpfEmployer,
              total: payCalc.totalPay
            };
          } catch (error) {
            console.error('Error processing casual employee:', emp.id, error);
            return {
              id: emp.id,
              name: emp.name,
              type: emp.type,
              baseSalary: emp.baseSalary,
              hourlyRate: emp.hourlyRate || 0,
              dailyRate: emp.dailyRate,
              dailyWeekdayRate: emp.dailyWeekdayRate,
              dailyWeekendRate: emp.dailyWeekendRate,
              paymentType: emp.paymentType,
              allowances: emp.allowances,
              deductions: emp.deductions,
              hoursWorked: 0,
              daysWorked: 0,
              grossPay: 0,
              cpfEmployee: 0,
              cpfEmployer: 0,
              netPay: 0,
              totalPay: 0,
              employeeCPF: 0,
              employerCPF: 0,
              cpf: 0,
              total: 0
            };
          }
        })
      );

      setPayrollState(prev => ({
        ...prev,
        fullTimeEmployees: fullTimePayroll,
        casualEmployees: casualPayroll,
        lastUpdated: new Date()
      }));
      
      console.log('Payroll initialized successfully:', { 
        fullTimeCount: fullTimePayroll.length, 
        casualCount: casualPayroll.length,
        fullTimeTotal: fullTimePayroll.reduce((sum, emp) => sum + emp.netPay, 0),
        casualTotal: casualPayroll.reduce((sum, emp) => sum + emp.totalPay, 0)
      });
    } catch (error) {
      console.error('Error initializing payroll:', error);
      setPayrollState(prev => ({
        ...prev,
        fullTimeEmployees: [],
        casualEmployees: [],
        lastUpdated: new Date()
      }));
    } finally {
      setIsLoading(false);
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
    const total = fullTimeTotal + casualTotal;
    
    return Math.round(total * 100) / 100;
  };

  const setPayrollStatus = (status: PayrollState['status']) => {
    console.log(`Setting payroll status to: ${status}`);
    setPayrollState(prev => ({ ...prev, status, lastUpdated: new Date() }));
  };

  const setCurrentPeriod = (period: string) => {
    console.log(`Setting current period to: ${period}`);
    setPayrollState(prev => ({ ...prev, currentPeriod: period, lastUpdated: new Date() }));
  };

  const resetPayroll = () => {
    console.log('Resetting payroll to initial state');
    setPayrollState({
      currentPeriod: 'December 2024',
      status: 'draft',
      fullTimeEmployees: [],
      casualEmployees: [],
      totalAmount: 0,
      lastUpdated: new Date()
    });
    initializePayroll();
  };

  const savePayrollDraft = () => {
    const draftData = {
      ...payrollState,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem('payrollDraft', JSON.stringify(draftData));
    console.log('Payroll draft saved to localStorage');
  };

  const loadPayrollDraft = (): boolean => {
    try {
      const saved = localStorage.getItem('payrollDraft');
      if (saved) {
        const draftData = JSON.parse(saved);
        setPayrollState({
          ...draftData,
          lastUpdated: new Date(draftData.lastUpdated)
        });
        console.log('Payroll draft loaded from localStorage');
        return true;
      }
    } catch (error) {
      console.error('Error loading payroll draft:', error);
    }
    return false;
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
      savePayrollDraft,
      loadPayrollDraft,
      isLoading
    }}>
      {children}
    </PayrollContext.Provider>
  );
};
