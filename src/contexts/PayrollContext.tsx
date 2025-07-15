import React, { createContext, useContext, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';

export interface FullTimeEmployee {
  id: string;
  name: string;
  employeeId: string;
  basicSalary: number;
  allowances: number;
  cpfContribution: number;
  netPay: number;
  grossPay: number;
  cpfEmployee: number;
  cpfEmployer: number;
}

export interface CasualEmployee {
  id: string;
  name: string;
  employeeId: string;
  hourlyRate: number;
  hoursWorked: number;
  totalPay: number;
  employeeCPF: number;
  employerCPF: number;
  grossPay: number;
}

export interface PayrollState {
  fullTimeEmployees: FullTimeEmployee[];
  casualEmployees: CasualEmployee[];
  currentPeriod: string;
  status: 'draft' | 'finalized' | 'processed';
  lastUpdated: Date;
  isLoading: boolean; // Add this property
}

export interface PayrollContextType {
  payrollState: PayrollState;
  setPayrollState: React.Dispatch<React.SetStateAction<PayrollState>>;
  addFullTimeEmployee: (employee: Omit<FullTimeEmployee, 'id' | 'netPay'>) => void;
  updateFullTimeEmployee: (id: string, updates: Partial<Omit<FullTimeEmployee, 'id' | 'netPay'>>) => void;
  removeFullTimeEmployee: (id: string) => void;
  addCasualEmployee: (employee: Omit<CasualEmployee, 'id' | 'totalPay'>) => void;
  updateCasualEmployee: (id: string, updates: Partial<Omit<CasualEmployee, 'id' | 'totalPay'>>) => void;
  removeCasualEmployee: (id: string) => void;
  calculatePayrollTotal: () => number;
  setCurrentPeriod: (period: string) => void;
  savePayrollToSupabase: () => Promise<void>;
  loadPayrollFromSupabase: () => Promise<void>;
}

export const PayrollContext = createContext<PayrollContextType | undefined>(undefined);

export const PayrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [payrollState, setPayrollState] = useState<PayrollState>({
    fullTimeEmployees: [],
    casualEmployees: [],
    currentPeriod: format(new Date(), 'MMMM yyyy'),
    status: 'draft',
    lastUpdated: new Date(),
    isLoading: false, // Initialize isLoading state
  });

  const addFullTimeEmployee = useCallback((employee: Omit<FullTimeEmployee, 'id' | 'netPay' | 'grossPay' | 'cpfEmployee' | 'cpfEmployer'>) => {
    const id = uuidv4();
    const grossPay = employee.basicSalary + employee.allowances;
    const cpfEmployee = grossPay * (employee.cpfContribution / 100);
    const cpfEmployer = grossPay * 0.17;
    const netPay = grossPay - cpfEmployee;

    const newEmployee: FullTimeEmployee = {
      ...employee,
      id,
      netPay,
      grossPay,
      cpfEmployee,
      cpfEmployer,
    } as FullTimeEmployee;

    setPayrollState(prevState => ({
      ...prevState,
      fullTimeEmployees: [...prevState.fullTimeEmployees, newEmployee],
      lastUpdated: new Date(),
    }));
  }, []);

  const updateFullTimeEmployee = useCallback((id: string, updates: Partial<Omit<FullTimeEmployee, 'id' | 'netPay' | 'grossPay' | 'cpfEmployee' | 'cpfEmployer'>>) => {
    setPayrollState(prevState => ({
      ...prevState,
      fullTimeEmployees: prevState.fullTimeEmployees.map(employee => {
        if (employee.id === id) {
          const updatedEmployee = { ...employee, ...updates };
          const grossPay = updatedEmployee.basicSalary + updatedEmployee.allowances;
          const cpfEmployee = grossPay * (updatedEmployee.cpfContribution / 100);
          const cpfEmployer = grossPay * 0.17;
          const netPay = grossPay - cpfEmployee;
          return { ...updatedEmployee, grossPay, netPay, cpfEmployee, cpfEmployer };
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

  const addCasualEmployee = useCallback((employee: Omit<CasualEmployee, 'id' | 'totalPay' | 'grossPay' | 'employeeCPF' | 'employerCPF'>) => {
    const id = uuidv4();
    const grossPay = employee.hourlyRate * employee.hoursWorked;
    const employeeCPF = grossPay * 0.2;
    const employerCPF = grossPay * 0.17;
    const totalPay = grossPay - employeeCPF;

    const newEmployee: CasualEmployee = {
      ...employee,
      id,
      totalPay,
      employeeCPF,
      employerCPF,
      grossPay
    } as CasualEmployee;

    setPayrollState(prevState => ({
      ...prevState,
      casualEmployees: [...prevState.casualEmployees, newEmployee],
      lastUpdated: new Date(),
    }));
  }, []);

  const updateCasualEmployee = useCallback((id: string, updates: Partial<Omit<CasualEmployee, 'id' | 'totalPay' | 'employeeCPF' | 'employerCPF' | 'grossPay'>>) => {
    setPayrollState(prevState => ({
      ...prevState,
      casualEmployees: prevState.casualEmployees.map(employee => {
        if (employee.id === id) {
          const updatedEmployee = { ...employee, ...updates };
          const grossPay = updatedEmployee.hourlyRate * updatedEmployee.hoursWorked;
          const employeeCPF = grossPay * 0.2;
          const employerCPF = grossPay * 0.17;
          const totalPay = grossPay - employeeCPF;
          return { ...updatedEmployee, totalPay, employeeCPF, employerCPF, grossPay };
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
    const fullTimeTotal = payrollState.fullTimeEmployees.reduce((sum, employee) => sum + employee.netPay, 0);
    const casualTotal = payrollState.casualEmployees.reduce((sum, employee) => sum + employee.totalPay, 0);
    return fullTimeTotal + casualTotal;
  }, [payrollState.fullTimeEmployees, payrollState.casualEmployees]);

  const setCurrentPeriod = useCallback((period: string) => {
    setPayrollState(prevState => ({
      ...prevState,
      currentPeriod: period,
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

      const { data, error } = await supabase
        .from('payroll_data')
        .insert([
          {
            month: payrollData.month,
            year: payrollData.year,
            payroll_data: payrollData,
            is_locked: false,
          },
        ]);

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

  const loadPayrollFromSupabase = async () => {
    setPayrollState(prevState => ({ ...prevState, isLoading: true }));
    try {
      const { data, error } = await supabase
        .from('payroll_data')
        .select('*')
        .eq('month', payrollState.currentPeriod.split(' ')[0])
        .eq('year', payrollState.currentPeriod.split(' ')[1])
        .single();

      if (error) {
        console.error('Error fetching payroll data from Supabase:', error);
        throw error;
      }

      if (data) {
        setPayrollState(prevState => ({
          ...prevState,
          fullTimeEmployees: data.payroll_data.fullTimeEmployees || [],
          casualEmployees: data.payroll_data.casualEmployees || [],
          status: data.payroll_data.status,
          lastUpdated: new Date(),
        }));
      }
    } catch (error) {
      console.error('Failed to load payroll data:', error);
    } finally {
      setPayrollState(prevState => ({ ...prevState, isLoading: false }));
    }
  };

  const value: PayrollContextType = {
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
  };

  return (
    <PayrollContext.Provider value={value}>
      {children}
    </PayrollContext.Provider>
  );
};

export const usePayroll = () => {
  const context = useContext(PayrollContext);
  if (!context) {
    throw new Error('usePayroll must be used within a PayrollProvider');
  }
  return context;
};
