
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { EmployeeProfile, PayrollEmployee, CasualEmployeePayroll } from '@/types/employee';
import { employeeDatabase, getFullTimeEmployees, getCasualEmployees } from '@/data/employeeData';
import { calculateCPF, calculateAge } from '@/utils/cpfCalculations';

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
  const [payrollState, setPayrollState] = useState<PayrollState>({
    currentPeriod: 'December 2024',
    status: 'draft',
    fullTimeEmployees: [],
    casualEmployees: [],
    totalAmount: 0,
    lastUpdated: new Date()
  });

  const initializePayroll = () => {
    console.log('Initializing payroll from employee database');
    
    // Initialize full-time employees
    const fullTimeEmps: PayrollEmployee[] = getFullTimeEmployees().map(emp => {
      const totalAllowances = emp.allowances.reduce((sum, a) => sum + a.amount, 0);
      const totalDeductions = emp.deductions.reduce((sum, d) => sum + d.amount, 0);
      const grossSalary = (emp.baseSalary || 0) + totalAllowances;
      
      const age = calculateAge(emp.dateOfBirth);
      const cpfCalc = calculateCPF(grossSalary, emp.residencyStatus, age);
      const netSalary = grossSalary - cpfCalc.employeeCPF - totalDeductions;
      
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
    });

    // Initialize casual employees
    const casualEmps: CasualEmployeePayroll[] = getCasualEmployees().map(emp => {
      const hoursWorked = 120; // This should come from slot bookings
      const daysWorked = 15; // This should come from slot bookings
      const grossPay = (emp.hourlyRate || 0) * hoursWorked;
      
      const age = calculateAge(emp.dateOfBirth);
      const cpfCalc = calculateCPF(grossPay, emp.residencyStatus, age);
      const totalPay = grossPay - cpfCalc.employeeCPF;
      
      return {
        id: emp.id,
        name: emp.name,
        type: emp.type,
        hourlyRate: emp.hourlyRate || 0,
        hoursWorked,
        daysWorked,
        totalPay,
        employeeCPF: cpfCalc.employeeCPF,
        employerCPF: cpfCalc.employerCPF
      };
    });

    setPayrollState(prev => ({
      ...prev,
      fullTimeEmployees: fullTimeEmps,
      casualEmployees: casualEmps,
      lastUpdated: new Date()
    }));
    
    console.log('Payroll initialized:', { fullTimeCount: fullTimeEmps.length, casualCount: casualEmps.length });
  };

  const updateEmployeeSalary = (employeeId: string, newSalary: number) => {
    console.log(`Updating salary for employee ${employeeId}: ${newSalary}`);
    
    setPayrollState(prev => ({
      ...prev,
      fullTimeEmployees: prev.fullTimeEmployees.map(emp => {
        if (emp.id === employeeId) {
          const empData = employeeDatabase[employeeId];
          if (!empData) return emp;
          
          const totalAllowances = empData.allowances.reduce((sum, a) => sum + a.amount, 0);
          const totalDeductions = empData.deductions.reduce((sum, d) => sum + d.amount, 0);
          const grossSalary = newSalary + totalAllowances;
          
          const age = calculateAge(empData.dateOfBirth);
          const cpfCalc = calculateCPF(grossSalary, empData.residencyStatus, age);
          const netSalary = grossSalary - cpfCalc.employeeCPF - totalDeductions;
          
          return {
            ...emp,
            baseSalary: newSalary,
            cpf: cpfCalc.employerCPF,
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
          
          const empData = employeeDatabase[employeeId];
          if (empData) {
            const age = calculateAge(empData.dateOfBirth);
            const cpfCalc = calculateCPF(grossSalary, empData.residencyStatus, age);
            const netSalary = grossSalary - cpfCalc.employeeCPF - emp.deductions;
            
            return {
              ...emp,
              allowances: totalAllowances,
              cpf: cpfCalc.employerCPF,
              total: netSalary
            };
          }
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
    
    setCasualEmployees(prev => prev.map(emp => {
      if (emp.id === employeeId) {
        const newRate = rate || emp.hourlyRate;
        const grossPay = newRate * hours;
        
        const empData = employeeDatabase[employeeId];
        if (empData) {
          const age = calculateAge(empData.dateOfBirth);
          const cpfCalc = calculateCPF(grossPay, empData.residencyStatus, age);
          const totalPay = grossPay - cpfCalc.employeeCPF;
          
          return {
            ...emp,
            hourlyRate: newRate,
            hoursWorked: hours,
            totalPay,
            employeeCPF: cpfCalc.employeeCPF,
            employerCPF: cpfCalc.employerCPF
          };
        }
      }
      return emp;
    }));
    
    setPayrollState(prev => ({ ...prev, lastUpdated: new Date() }));
  };

  const calculatePayrollTotal = (): number => {
    const fullTimeTotal = payrollState.fullTimeEmployees.reduce((sum, emp) => sum + emp.total, 0);
    const casualTotal = payrollState.casualEmployees.reduce((sum, emp) => sum + emp.totalPay, 0);
    const total = fullTimeTotal + casualTotal;
    
    console.log('Calculating payroll total:', { fullTimeTotal, casualTotal, total });
    return total;
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
    if (!loadPayrollDraft()) {
      initializePayroll();
    }
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
      loadPayrollDraft
    }}>
      {children}
    </PayrollContext.Provider>
  );
};
