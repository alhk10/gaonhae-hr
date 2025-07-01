
import { supabase } from '@/integrations/supabase/client';
import { getEmployeeById } from './employeeService';
import { getEmployeeClaims } from './claimsService';
import { calculateCPF, calculateAge } from '@/utils/cpfCalculations';

export interface PayrollData {
  baseSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  grossSalary: number;
  employeeCPF: number;
  employerCPF: number;
  totalCPF: number;
  approvedClaims: number;
  netSalary: number;
  allowances: Array<{ name: string; amount: number }>;
  deductions: Array<{ name: string; amount: number }>;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  month: string;
  year: number;
  payrollData: PayrollData;
  createdAt: string;
  updatedAt: string;
}

export const getEmployeePayrollData = async (employeeId: string): Promise<PayrollData> => {
  console.log('Fetching payroll data for employee:', employeeId);
  
  try {
    // Get employee details
    const employee = await getEmployeeById(employeeId);
    if (!employee) {
      throw new Error('Employee not found');
    }

    // Get employee allowances
    const { data: allowances = [], error: allowancesError } = await supabase
      .from('allowances')
      .select('*')
      .eq('employee_id', employeeId);

    if (allowancesError) {
      console.error('Error fetching allowances:', allowancesError);
    }

    // Get employee deductions
    const { data: deductions = [], error: deductionsError } = await supabase
      .from('deductions')
      .select('*')
      .eq('employee_id', employeeId);

    if (deductionsError) {
      console.error('Error fetching deductions:', deductionsError);
    }

    // Get approved claims
    const claims = await getEmployeeClaims(employeeId);
    const approvedClaimsTotal = claims
      .filter(claim => claim.status === 'Approved')
      .reduce((sum, claim) => sum + claim.amount, 0);

    // Calculate payroll data
    const baseSalary = employee.baseSalary || 0;
    const totalAllowances = allowances.reduce((sum, a) => sum + Number(a.amount), 0);
    const totalDeductions = deductions.reduce((sum, d) => sum + Number(d.amount), 0);
    const grossSalary = baseSalary + totalAllowances;
    
    const age = calculateAge(employee.dateOfBirth || '');
    const cpfCalc = calculateCPF(grossSalary, employee.residencyStatus || 'Citizen', age);
    
    const netSalary = grossSalary - cpfCalc.employeeCPF - totalDeductions + approvedClaimsTotal;

    const payrollData: PayrollData = {
      baseSalary,
      totalAllowances,
      totalDeductions,
      grossSalary,
      employeeCPF: cpfCalc.employeeCPF,
      employerCPF: cpfCalc.employerCPF,
      totalCPF: cpfCalc.employeeCPF + cpfCalc.employerCPF,
      approvedClaims: approvedClaimsTotal,
      netSalary,
      allowances: allowances.map(a => ({ name: a.name, amount: Number(a.amount) })),
      deductions: deductions.map(d => ({ name: d.name, amount: Number(d.amount) }))
    };

    console.log('Generated payroll data:', payrollData);
    return payrollData;
  } catch (error) {
    console.error('Error generating payroll data:', error);
    throw error;
  }
};

export const savePayrollRecord = async (employeeId: string, month: string, payrollData: PayrollData): Promise<void> => {
  console.log('Saving payroll record:', { employeeId, month, payrollData });
  
  const year = new Date().getFullYear();
  const recordId = `${employeeId}_${year}_${month.replace(' ', '_')}`;
  
  // Use type assertion since TypeScript types haven't been updated yet
  const { error } = await (supabase as any)
    .from('payroll_records')
    .upsert({
      id: recordId,
      employee_id: employeeId,
      month,
      year,
      payroll_data: payrollData,
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error('Error saving payroll record:', error);
    throw error;
  }
};

export const getEmployeePayrollRecords = async (employeeId: string): Promise<PayrollRecord[]> => {
  console.log('Fetching payroll records for employee:', employeeId);
  
  // Use type assertion since TypeScript types haven't been updated yet
  const { data: records, error } = await (supabase as any)
    .from('payroll_records')
    .select('*')
    .eq('employee_id', employeeId)
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  if (error) {
    console.error('Error fetching payroll records:', error);
    throw error;
  }

  return records?.map((record: any) => ({
    id: record.id,
    employeeId: record.employee_id,
    month: record.month,
    year: record.year,
    payrollData: record.payroll_data as PayrollData,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  })) || [];
};
