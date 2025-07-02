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
  console.log('🗑️ Starting deletion process for payroll record:', recordId);
  
  try {
    // Step 1: Verify record exists and get its current state
    console.log('📋 Step 1: Checking if record exists...');
    const { data: existingRecord, error: fetchError } = await supabase
      .from('payroll_records')
      .select('id, employee_id, month, year, is_locked')
      .eq('id', recordId)
      .maybeSingle();

    if (fetchError) {
      console.error('❌ Error checking record existence:', fetchError);
      throw new Error(`Failed to verify record existence: ${fetchError.message}`);
    }

    if (!existingRecord) {
      console.log('⚠️ Record not found, may have been already deleted:', recordId);
      // Don't throw error here - consider it already deleted
      return;
    }

    console.log('✅ Record found:', {
      id: existingRecord.id,
      employee_id: existingRecord.employee_id,
      month: existingRecord.month,
      year: existingRecord.year,
      is_locked: existingRecord.is_locked
    });

    // Step 2: Check if record is locked
    if (existingRecord.is_locked) {
      console.error('🔒 Cannot delete locked payroll record:', recordId);
      throw new Error('Cannot delete locked payroll record. Please unlock it first.');
    }

    // Step 3: Perform the deletion
    console.log('🗑️ Step 2: Performing deletion...');
    const { error: deleteError, count } = await supabase
      .from('payroll_records')
      .delete({ count: 'exact' })
      .eq('id', recordId);

    if (deleteError) {
      console.error('❌ Error during deletion:', deleteError);
      throw new Error(`Failed to delete payroll record: ${deleteError.message}`);
    }
    
    console.log('📊 Delete operation result - affected rows:', count);
    
    if (count === 0) {
      console.warn('⚠️ No rows were deleted, record may not exist:', recordId);
      // Don't throw error here - record might have been deleted by another process
      return;
    }

    // Step 4: Verify deletion was successful
    console.log('🔍 Step 3: Verifying deletion...');
    
    // Wait a bit for database consistency
    await new Promise(resolve => setTimeout(resolve, 200));

    const { data: verifyRecord, error: verifyError } = await supabase
      .from('payroll_records')
      .select('id')
      .eq('id', recordId)
      .maybeSingle();

    if (verifyError) {
      console.error('❌ Error during verification:', verifyError);
      // Don't throw here, deletion might have succeeded
      console.log('⚠️ Verification failed, but delete operation reported success');
    } else if (verifyRecord) {
      console.error('❌ Record still exists after deletion attempt:', recordId);
      throw new Error('Record was not properly deleted from the database. Please try again.');
    } else {
      console.log('✅ Deletion verified successfully - record no longer exists:', recordId);
    }

  } catch (error) {
    console.error('💥 Delete operation failed:', error);
    
    // Re-throw with more context
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('An unexpected error occurred during deletion');
    }
  }
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
