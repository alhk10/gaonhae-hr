
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { EmployeeProfile } from '@/types/employee';
import { employeeDatabase } from '@/data/employeeData';

interface PayrollState {
  currentPeriod: string;
  status: 'draft' | 'processing' | 'approved' | 'paid' | 'completed';
  employees: EmployeeProfile[];
  totalAmount: number;
}

interface PayrollContextType {
  payrollState: PayrollState;
  updateEmployee: (employeeId: string, updates: Partial<EmployeeProfile>) => void;
  calculatePayrollTotal: () => number;
  setPayrollStatus: (status: PayrollState['status']) => void;
  setCurrentPeriod: (period: string) => void;
  resetPayroll: () => void;
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
    employees: Object.values(employeeDatabase),
    totalAmount: 0
  });

  const updateEmployee = (employeeId: string, updates: Partial<EmployeeProfile>) => {
    setPayrollState(prev => ({
      ...prev,
      employees: prev.employees.map(emp => 
        emp.id === employeeId ? { ...emp, ...updates } : emp
      )
    }));
  };

  const calculatePayrollTotal = (): number => {
    return payrollState.employees.reduce((total, employee) => {
      if (employee.type === 'Full-Time') {
        const allowancesTotal = employee.allowances.reduce((sum, allowance) => sum + allowance.amount, 0);
        const deductionsTotal = employee.deductions.reduce((sum, deduction) => sum + deduction.amount, 0);
        const baseSalary = employee.baseSalary || 0;
        return total + baseSalary + allowancesTotal - deductionsTotal;
      } else {
        const hourlyRate = employee.hourlyRate || 0;
        const hoursWorked = 120; // This should come from slot bookings
        const allowancesTotal = employee.allowances.reduce((sum, allowance) => sum + allowance.amount, 0);
        return total + (hourlyRate * hoursWorked) + allowancesTotal;
      }
    }, 0);
  };

  const setPayrollStatus = (status: PayrollState['status']) => {
    setPayrollState(prev => ({ ...prev, status }));
  };

  const setCurrentPeriod = (period: string) => {
    setPayrollState(prev => ({ ...prev, currentPeriod: period }));
  };

  const resetPayroll = () => {
    setPayrollState({
      currentPeriod: 'December 2024',
      status: 'draft',
      employees: Object.values(employeeDatabase),
      totalAmount: 0
    });
  };

  return (
    <PayrollContext.Provider value={{
      payrollState,
      updateEmployee,
      calculatePayrollTotal,
      setPayrollStatus,
      setCurrentPeriod,
      resetPayroll
    }}>
      {children}
    </PayrollContext.Provider>
  );
};
