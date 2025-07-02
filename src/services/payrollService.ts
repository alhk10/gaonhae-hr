
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
  isLocked?: boolean;
}

export const getEmployeePayrollData = async (employeeId: string): Promise<PayrollData> => {
  console.log('Fetching payroll data for employee:', employeeId);
  
  try {
    // Get employee details from Supabase
    const employee = await getEmployeeById(employeeId);
    if (!employee) {
      throw new Error('Employee not found');
    }

    // Get employee allowances from Supabase
    const { data: allowances = [], error: allowancesError } = await supabase
      .from('allowances')
      .select('*')
      .eq('employee_id', employeeId);

    if (allowancesError) {
      console.error('Error fetching allowances:', allowancesError);
      throw allowancesError;
    }

    // Get employee deductions from Supabase
    const { data: deductions = [], error: deductionsError } = await supabase
      .from('deductions')
      .select('*')
      .eq('employee_id', employeeId);

    if (deductionsError) {
      console.error('Error fetching deductions:', deductionsError);
      throw deductionsError;
    }

    // Get approved claims from Supabase
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

    console.log('Generated payroll data from Supabase:', payrollData);
    return payrollData;
  } catch (error) {
    console.error('Error generating payroll data:', error);
    throw error;
  }
};

export const savePayrollRecord = async (employeeId: string, month: string, payrollData: PayrollData): Promise<void> => {
  console.log('Saving payroll record to Supabase:', { employeeId, month, payrollData });
  
  const year = new Date().getFullYear();
  const recordId = `${employeeId}_${year}_${month.replace(' ', '_')}`;
  
  const { error } = await supabase
    .from('payroll_records')
    .upsert({
      id: recordId,
      employee_id: employeeId,
      month,
      year,
      payroll_data: payrollData as any,
      is_locked: false,
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error('Error saving payroll record to Supabase:', error);
    throw error;
  }
  
  console.log('Payroll record saved successfully to Supabase');
};

export const getEmployeePayrollRecords = async (employeeId: string): Promise<PayrollRecord[]> => {
  console.log('Fetching payroll records from Supabase for employee:', employeeId);
  
  const { data: records, error } = await supabase
    .from('payroll_records')
    .select('*')
    .eq('employee_id', employeeId)
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  if (error) {
    console.error('Error fetching payroll records from Supabase:', error);
    throw error;
  }

  const formattedRecords = records?.map((record: any) => ({
    id: record.id,
    employeeId: record.employee_id,
    month: record.month,
    year: record.year,
    payrollData: record.payroll_data as PayrollData,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    isLocked: record.is_locked || false
  })) || [];

  console.log('Fetched payroll records from Supabase:', formattedRecords);
  return formattedRecords;
};

export const getAllPayrollRecords = async (): Promise<PayrollRecord[]> => {
  console.log('Fetching all payroll records from Supabase');
  
  const { data: records, error } = await supabase
    .from('payroll_records')
    .select('*')
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  if (error) {
    console.error('Error fetching all payroll records from Supabase:', error);
    throw error;
  }

  const formattedRecords = records?.map((record: any) => ({
    id: record.id,
    employeeId: record.employee_id,
    month: record.month,
    year: record.year,
    payrollData: record.payroll_data as PayrollData,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    isLocked: record.is_locked || false
  })) || [];

  console.log('Fetched all payroll records from Supabase:', formattedRecords);
  return formattedRecords;
};

export const deletePayrollRecord = async (recordId: string): Promise<void> => {
  console.log('Deleting payroll record from Supabase:', recordId);
  
  const { error } = await supabase
    .from('payroll_records')
    .delete()
    .eq('id', recordId);

  if (error) {
    console.error('Error deleting payroll record from Supabase:', error);
    throw error;
  }
  
  console.log('Payroll record deleted successfully from Supabase');
};

export const updatePayrollLockStatus = async (recordId: string, isLocked: boolean): Promise<void> => {
  console.log(`Updating payroll lock status for ${recordId} to ${isLocked}`);
  
  const { error } = await supabase
    .from('payroll_records')
    .update({ is_locked: isLocked })
    .eq('id', recordId);

  if (error) {
    console.error('Error updating payroll lock status:', error);
    throw error;
  }
  
  console.log('Payroll lock status updated successfully');
};
