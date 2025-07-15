import React, { createContext, useContext, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import type { EmployeeProfile } from '@/types/employee';

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
  daysWorked?: number;
  paymentType?: string;
  dailyRate?: number;
  baseSalary?: number;
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
  addCasualEmployee: (employee: Omit<CasualEmployee, 'id' | 'totalPay'>) => void;
  updateCasualEmployee: (id: string, updates: Partial<Omit<CasualEmployee, 'id' | 'totalPay'>>) => void;
  removeCasualEmployee: (id: string) => void;
  calculatePayrollTotal: () => number;
  setCurrentPeriod: (period: string) => void;
  savePayrollToSupabase: () => Promise<void>;
  loadPayrollFromSupabase: () => Promise<void>;
  setPayrollStatus: (status: PayrollState['status']) => void;
  addEmployeesToPayroll: (employeeIds: string[]) => Promise<void>;
  removeEmployeeFromPayroll: (employeeId: string) => void;
  refreshAvailableEmployees: () => Promise<void>;
  isLoading: boolean;
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
        .select('id, name, type, base_salary, hourly_rate, daily_rate, payment_type, nric, date_of_birth, residency_status, bank_name, bank_account, position, phone, address, email, join_date');

      if (error) throw error;

      const availableEmployees: EmployeeProfile[] = employees?.map(emp => ({
        id: emp.id,
        name: emp.name,
        nric: emp.nric,
        dateOfBirth: emp.date_of_birth,
        residencyStatus: emp.residency_status,
        type: emp.type as 'Full-Time' | 'Casual',
        baseSalary: emp.base_salary || undefined,
        hourlyRate: emp.hourly_rate || undefined,
        dailyRate: emp.daily_rate || undefined,
        paymentType: (emp.payment_type as 'Monthly' | 'Hourly' | 'Daily') || 'Monthly',
        bankName: emp.bank_name,
        bankAccount: emp.bank_account,
        branch: '', // Default empty since not in DB
        position: emp.position || '',
        phone: emp.phone || '',
        address: emp.address || '',
        email: emp.email,
        joinDate: emp.join_date,
        allowances: [],
        deductions: [],
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

  const addEmployeesToPayroll = useCallback(async (employeeIds: string[]) => {
    const employeesToAdd = payrollState.availableEmployees.filter(emp => 
      employeeIds.includes(emp.id)
    );

    employeesToAdd.forEach(employee => {
      if (employee.type === 'Full-Time') {
        addFullTimeEmployee({
          employeeId: employee.id,
          name: employee.name,
          basicSalary: employee.baseSalary || 0,
          allowances: 0,
          cpfContribution: 20,
        });
      } else {
        addCasualEmployee({
          employeeId: employee.id,
          name: employee.name,
          hourlyRate: employee.hourlyRate || 0,
          hoursWorked: 0,
        });
      }
    });
  }, [payrollState.availableEmployees, addFullTimeEmployee, addCasualEmployee]);

  const removeEmployeeFromPayroll = useCallback((employeeId: string) => {
    removeFullTimeEmployee(employeeId);
    removeCasualEmployee(employeeId);
  }, [removeFullTimeEmployee, removeCasualEmployee]);

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
        .from('payroll_records')
        .insert({
          id: uuidv4(),
          employee_id: 'system',
          month: payrollData.month,
          year: parseInt(payrollData.year),
          payroll_data: payrollData as any,
          is_locked: false,
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

  const loadPayrollFromSupabase = async () => {
    setPayrollState(prevState => ({ ...prevState, isLoading: true }));
    try {
      const { data, error } = await supabase
        .from('payroll_records')
        .select('*')
        .eq('month', payrollState.currentPeriod.split(' ')[0])
        .eq('year', parseInt(payrollState.currentPeriod.split(' ')[1]))
        .single();

      if (error) {
        console.error('Error fetching payroll data from Supabase:', error);
        throw error;
      }

      if (data && data.payroll_data) {
        const payrollData = data.payroll_data as any;
        setPayrollState(prevState => ({
          ...prevState,
          fullTimeEmployees: payrollData.fullTimeEmployees || [],
          casualEmployees: payrollData.casualEmployees || [],
          status: payrollData.status,
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
    setPayrollStatus,
    addEmployeesToPayroll,
    removeEmployeeFromPayroll,
    refreshAvailableEmployees,
    isLoading: payrollState.isLoading,
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
