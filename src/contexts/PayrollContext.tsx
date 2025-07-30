import React, { createContext, useContext, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import type { EmployeeProfile } from '@/types/employee';
import { calculateCasualPayroll } from '@/utils/payrollCalculations';

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
  paymentType?: 'Monthly' | 'Hourly' | 'Daily';
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
  addCasualEmployee: (employee: Omit<CasualEmployee, 'id' | 'totalPay' | 'grossPay' | 'employeeCPF' | 'employerCPF' | 'allowances' | 'deductions' | 'cpfEmployee' | 'cpfEmployer' | 'netPay' | 'cpf' | 'total'>) => void;
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
  autoAddCasualEmployeesWithAttendance: () => Promise<{ addedCount: number; employees: any[] }>;
  getEligibleCasualEmployeesForPayroll: () => Promise<any[]>;
  isLoading: boolean;
  // Additional methods needed by PayrollProcessing
  updateEmployeeSalary?: (employeeId: string, salary: number) => void;
  updateEmployeeAllowances?: (employeeId: string, allowances: any[]) => void;
  updateEmployeeDeductions?: (employeeId: string, deductions: any[]) => void;
  updateCasualEmployeeHours?: (employeeId: string, hours: number) => void;
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
    
    // Find the employee profile from available employees for complete data
    const employeeProfile = payrollState.availableEmployees.find(emp => emp.id === employee.employeeId);
    
    if (!employeeProfile) {
      console.error('Employee profile not found:', employee.employeeId);
      return;
    }

    // Use proper payroll calculation
    const calculation = calculateCasualPayroll(
      employeeProfile,
      employee.hoursWorked || 0,
      employee.daysWorked || 0,
      0 // approved claims - can be added later
    );

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
        .select('id, name, type, base_salary, hourly_rate, daily_rate, daily_weekday_rate, daily_weekend_rate, payment_type, nric, date_of_birth, residency_status, bank_name, bank_account, position, phone, address, email, join_date');

      if (error) throw error;

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
          daysWorked: 0,
          paymentType: employee.paymentType,
          dailyRate: employee.dailyRate,
          baseSalary: employee.baseSalary
        });
      }
    });
  }, [payrollState.availableEmployees, addFullTimeEmployee, addCasualEmployee]);

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

      const { data, error } = await supabase
        .from('payroll_records')
        .insert([{
          id: uuidv4(),
          employee_id: 'system',
          month: payrollData.month,
          year: parseInt(payrollData.year),
          payroll_data: payrollData as any,
          is_locked: false,
        }]);

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

      if (attendanceError) throw attendanceError;

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

      // Filter out employees already in payroll
      const existingEmployeeIds = new Set([
        ...payrollState.casualEmployees.map(emp => emp.employeeId),
        ...payrollState.fullTimeEmployees.map(emp => emp.employeeId)
      ]);

      return Object.values(employeeAttendance)
        .filter((item: any) => !existingEmployeeIds.has(item.employee.id))
        .map((item: any) => {
          const employee = item.employee;
          return {
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
        });
    } catch (error) {
      console.error('Error fetching eligible casual employees:', error);
      return [];
    }
  }, [payrollState.currentPeriod, payrollState.casualEmployees, payrollState.fullTimeEmployees]);

  const autoAddCasualEmployeesWithAttendance = useCallback(async () => {
    setPayrollState(prevState => ({ ...prevState, isLoading: true }));
    
    try {
      const eligibleEmployees = await getEligibleCasualEmployeesForPayroll();
      
      if (eligibleEmployees.length === 0) {
        return { addedCount: 0, employees: [] };
      }

      // Add each eligible employee to payroll
      eligibleEmployees.forEach(employee => {
        const paymentType = employee.paymentType;
        let hoursWorked = employee.totalHours;
        let daysWorked = employee.totalDays;

        // For monthly employees, ensure minimum hours/days
        if (paymentType === 'Monthly' && hoursWorked === 0) {
          hoursWorked = daysWorked * 8; // Assume 8 hours per day
        }

        addCasualEmployee({
          employeeId: employee.id,
          name: employee.name,
          hourlyRate: employee.hourlyRate,
          hoursWorked: hoursWorked,
          daysWorked: daysWorked,
          paymentType: paymentType,
          dailyRate: employee.dailyRate,
          baseSalary: employee.baseSalary
        });
      });

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
    autoAddCasualEmployeesWithAttendance,
    getEligibleCasualEmployeesForPayroll,
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
