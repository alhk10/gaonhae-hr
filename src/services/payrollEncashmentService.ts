
import { supabase } from '@/integrations/supabase/client';
import { getAllEncashmentRecords } from './leaveEncashmentService';

export interface PayrollEncashmentData {
  employee_id: string;
  employee_name: string;
  encashment_amount: number;
  encashment_days: number;
  rate_per_day: number;
  year: number;
  record_id: string;
}

// Get encashment data to be included in payroll for a specific month/year
export const getEncashmentForPayroll = async (
  payrollMonth: string,
  payrollYear: number
): Promise<PayrollEncashmentData[]> => {
  try {
    // Get processed encashment records that haven't been included in payroll yet
    const { data: records, error } = await supabase
      .from('leave_encashment_records')
      .select(`
        *,
        employees!inner(name)
      `)
      .eq('status', 'Processed')
      .is('payroll_month', null)
      .is('payroll_year', null)
      .lte('year', payrollYear); // Include encashments from current year and previous

    if (error) throw error;

    return (records || []).map(record => ({
      employee_id: record.employee_id,
      employee_name: (record as any).employees.name,
      encashment_amount: record.total_encashment_amount,
      encashment_days: record.encashed_days,
      rate_per_day: record.rate_per_day,
      year: record.year,
      record_id: record.id
    }));
  } catch (error) {
    console.error('Error getting encashment for payroll:', error);
    return [];
  }
};

// Mark encashment records as included in payroll
export const markEncashmentInPayroll = async (
  recordIds: string[],
  payrollMonth: string,
  payrollYear: number
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('leave_encashment_records')
      .update({
        payroll_month: payrollMonth,
        payroll_year: payrollYear
      })
      .in('id', recordIds);

    return !error;
  } catch (error) {
    console.error('Error marking encashment in payroll:', error);
    return false;
  }
};

// Get encashment summary for payroll report
export const getEncashmentSummaryForPayroll = async (
  payrollMonth: string,
  payrollYear: number
): Promise<{
  total_employees: number;
  total_amount: number;
  total_days: number;
  records: PayrollEncashmentData[];
}> => {
  try {
    const { data: records, error } = await supabase
      .from('leave_encashment_records')
      .select(`
        *,
        employees!inner(name)
      `)
      .eq('payroll_month', payrollMonth)
      .eq('payroll_year', payrollYear)
      .eq('status', 'Processed');

    if (error) throw error;

    const encashmentData: PayrollEncashmentData[] = (records || []).map(record => ({
      employee_id: record.employee_id,
      employee_name: (record as any).employees.name,
      encashment_amount: record.total_encashment_amount,
      encashment_days: record.encashed_days,
      rate_per_day: record.rate_per_day,
      year: record.year,
      record_id: record.id
    }));

    return {
      total_employees: encashmentData.length,
      total_amount: encashmentData.reduce((sum, item) => sum + item.encashment_amount, 0),
      total_days: encashmentData.reduce((sum, item) => sum + item.encashment_days, 0),
      records: encashmentData
    };
  } catch (error) {
    console.error('Error getting encashment summary for payroll:', error);
    return {
      total_employees: 0,
      total_amount: 0,
      total_days: 0,
      records: []
    };
  }
};

// Integrate encashment into existing payroll data
export const integrateEncashmentIntoPayroll = (
  existingPayrollData: any,
  encashmentData: PayrollEncashmentData[]
): any => {
  const employeeEncashment = encashmentData.find(enc => enc.employee_id === existingPayrollData.employeeId);
  
  if (!employeeEncashment) {
    return existingPayrollData;
  }

  // Add encashment as an allowance
  const updatedPayrollData = {
    ...existingPayrollData,
    allowances: [
      ...(existingPayrollData.allowances || []),
      {
        name: `Leave Encashment (${employeeEncashment.year})`,
        amount: employeeEncashment.encashment_amount,
        type: 'Leave Encashment',
        days: employeeEncashment.encashment_days,
        rate: employeeEncashment.rate_per_day
      }
    ]
  };

  // Update totals
  updatedPayrollData.totalAllowances = (updatedPayrollData.totalAllowances || 0) + employeeEncashment.encashment_amount;
  updatedPayrollData.grossSalary = (updatedPayrollData.grossSalary || updatedPayrollData.baseSalary || 0) + employeeEncashment.encashment_amount;
  updatedPayrollData.netSalary = updatedPayrollData.grossSalary - (updatedPayrollData.totalDeductions || 0);

  return updatedPayrollData;
};
