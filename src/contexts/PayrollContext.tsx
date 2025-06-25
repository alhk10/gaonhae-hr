import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { EmployeeProfile, PayrollEmployee, CasualEmployeePayroll } from '@/types/employee';
import { getEmployees } from '@/services/employeeService';
import { calculateCPF, calculateAge } from '@/utils/cpfCalculations';
import { getEmployeeClaims } from '@/services/claimsService';

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

  const initializePayroll = async () => {
    console.log('Initializing payroll from Supabase employee database');
    setIsLoading(true);
    
    try {
      // Fetch employees from Supabase
      const allEmployees = await getEmployees();
      console.log('Fetched employees from Supabase for payroll:', allEmployees.length);
      
      if (allEmployees.length === 0) {
        console.log('No employees found in Supabase database');
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
              baseSalary: emp.baseSalary || 0,
              allowances: totalAllowances,
              deductions: totalDeductions,
              cpf: cpfCalc.employerCPF,
              total: netSalary
            };
          } catch (error) {
            console.error('Error processing full-time employee:', emp.id, error);
            return {
              id: emp.id,
              name: emp.name,
              type: emp.type,
              baseSalary: emp.baseSalary || 0,
              allowances: 0,
              deductions: 0,
              cpf: 0,
              total: emp.baseSalary || 0
            };
          }
        })
      );

      // Initialize casual employees
      const casualPayroll: CasualEmployeePayroll[] = await Promise.all(
        casualEmps.map(async (emp) => {
          try {
            const hoursWorked = 120; // This should come from slot bookings in the future
            const daysWorked = 15; // This should come from slot bookings in the future
            const grossPay = (emp.hourlyRate || emp.dailyRate || 0) * (emp.paymentType === 'Daily' ? daysWorked : hoursWorked);
            
            const age = calculateAge(emp.dateOfBirth);
            const cpfCalc = calculateCPF(grossPay, emp.residencyStatus, age);
            const approvedClaims = await getApprovedClaimsTotal(emp.id);
            const totalPay = grossPay - cpfCalc.employeeCPF + approvedClaims;
            
            return {
              id: emp.id,
              name: emp.name,
              type: emp.type,
              hourlyRate: emp.hourlyRate || emp.dailyRate || 0,
              hoursWorked: emp.paymentType === 'Daily' ? daysWorked : hoursWorked,
              daysWorked,
              totalPay,
              employeeCPF: cpfCalc.employeeCPF,
              employerCPF: cpfCalc.employerCPF
            };
          } catch (error) {
            console.error('Error processing casual employee:', emp.id, error);
            return {
              id: emp.id,
              name: emp.name,
              type: emp.type,
              hourlyRate: emp.hourlyRate || emp.dailyRate || 0,
              hoursWorked: 0,
              daysWorked: 0,
              totalPay: 0,
              employeeCPF: 0,
              employerCPF: 0
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
      
      console.log('Payroll initialized from Supabase:', { 
        fullTimeCount: fullTimePayroll.length, 
        casualCount: casualPayroll.length,
        fullTimeTotal: fullTimePayroll.reduce((sum, emp) => sum + emp.total, 0),
        casualTotal: casualPayroll.reduce((sum, emp) => sum + emp.totalPay, 0)
      });
    } catch (error) {
      console.error('Error initializing payroll from Supabase:', error);
      // Set empty state if there's an error
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
          const grossSalary = newSalary + emp.allowances;
          const netSalary = grossSalary - emp.cpf - emp.deductions;
          
          return {
            ...emp,
            baseSalary: newSalary,
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
          const totalAllowances = allowances.reduce((sum, a) => sum + a.amount, 0);
          const grossSalary = emp.baseSalary + totalAllowances;
          const netSalary = grossSalary - emp.cpf - emp.deductions;
          
          return {
            ...emp,
            allowances: totalAllowances,
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
          const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
          const grossSalary = emp.baseSalary + emp.allowances;
          const netSalary = grossSalary - emp.cpf - totalDeductions;
          
          return {
            ...emp,
            deductions: totalDeductions,
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
          const grossPay = newRate * hours;
          const totalPay = grossPay - emp.employeeCPF;
          
          return {
            ...emp,
            hourlyRate: newRate,
            hoursWorked: hours,
            totalPay
          };
        }
        return emp;
      }),
      lastUpdated: new Date()
    }));
  };

  const calculatePayrollTotal = (): number => {
    const fullTimeTotal = payrollState.fullTimeEmployees.reduce((sum, emp) => sum + emp.total, 0);
    const casualTotal = payrollState.casualEmployees.reduce((sum, emp) => sum + emp.totalPay, 0);
    const total = fullTimeTotal + casualTotal;
    
    return Math.round(total * 100) / 100; // Round to 2 decimal places
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

  // Initialize payroll on mount
  useEffect(() => {
    // Always initialize from Supabase, don't use localStorage as fallback for employee data
    initializePayroll();
  }, []);

  // Update total amount when employees change
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
