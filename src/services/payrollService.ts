import { supabase } from '@/integrations/supabase/client';
import { getEmployeeById } from './employeeService';
import { getEmployeeClaims } from './claimsService';
import { calculateCPF, calculateAge } from '@/utils/cpfCalculations';
import { logger } from '@/utils/logger';

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

export const getEmployeePayrollData = async (employeeId: string, period?: string): Promise<PayrollData> => {
  logger.debug('Fetching payroll data', { employeeId, period });
  
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
      logger.error('Error fetching allowances:', allowancesError);
      throw allowancesError;
    }

    // Get employee deductions from Supabase
    const { data: deductions = [], error: deductionsError } = await supabase
      .from('deductions')
      .select('*')
      .eq('employee_id', employeeId);

    if (deductionsError) {
      logger.error('Error fetching deductions:', deductionsError);
      throw deductionsError;
    }

    // Get approved claims from Supabase
    const claims = await getEmployeeClaims(employeeId);
    const approvedClaimsTotal = claims
      .filter(claim => claim.status === 'Approved')
      .reduce((sum, claim) => sum + claim.amount, 0);

    // Check if employee is casual and needs attendance-based calculation
    if (employee.type === 'Casual' && period) {
      const attendanceData = await getEmployeeAttendanceForPeriod(employeeId, period);
      logger.debug('Attendance data for casual employee', attendanceData);
      
      // Fetch slot booking pay using dynamic pricing
      let slotBookingPay = 0;
      try {
        const { getSlotBookingPayForPeriod } = await import('@/services/slotBookingPayrollService');
        const slotPayData = await getSlotBookingPayForPeriod(employeeId, period, employee);
        slotBookingPay = slotPayData.totalPay;
        logger.debug('Slot booking pay data', { slotPayData });
      } catch (error) {
        logger.error('Error fetching slot booking pay, falling back to attendance-based calculation:', error);
      }
      
      // Use calculateCasualPayroll for proper calculation
      const { calculateCasualPayroll } = await import('@/utils/payrollCalculations');
      const casualCalc = calculateCasualPayroll(
        employee,
        attendanceData.totalHours,
        attendanceData.totalDays,
        approvedClaimsTotal,
        slotBookingPay
      );

      const payrollData: PayrollData = {
        baseSalary: casualCalc.baseSalary,
        totalAllowances: casualCalc.totalAllowances,
        totalDeductions: casualCalc.totalDeductions,
        grossSalary: casualCalc.grossSalary,
        employeeCPF: casualCalc.employeeCPF,
        employerCPF: casualCalc.employerCPF,
        totalCPF: casualCalc.totalCPF,
        approvedClaims: approvedClaimsTotal,
      netSalary: casualCalc.netSalary,
        allowances: allowances.map(a => ({ name: a.name, amount: Number(a.amount) })),
        deductions: deductions.map(d => ({ name: d.name, amount: Number(d.amount) }))
      };

      logger.debug('Generated casual payroll data with attendance', { payrollData });
      return payrollData;
    }

    // Full-time employee calculation (existing logic)
    const { calculateFullTimePayroll } = await import('@/utils/payrollCalculations');
    const fullTimeCalc = calculateFullTimePayroll(employee, approvedClaimsTotal, 0);

    const payrollData: PayrollData = {
      baseSalary: fullTimeCalc.baseSalary,
      totalAllowances: fullTimeCalc.totalAllowances,
      totalDeductions: fullTimeCalc.totalDeductions,
      grossSalary: fullTimeCalc.grossSalary,
      employeeCPF: fullTimeCalc.employeeCPF,
      employerCPF: fullTimeCalc.employerCPF,
      totalCPF: fullTimeCalc.totalCPF,
      approvedClaims: approvedClaimsTotal,
      netSalary: fullTimeCalc.netSalary,
      allowances: allowances.map(a => ({ name: a.name, amount: Number(a.amount) })),
      deductions: deductions.map(d => ({ name: d.name, amount: Number(d.amount) }))
    };

    logger.debug('Generated full-time payroll data', { payrollData });
    return payrollData;
  } catch (error) {
    console.error('Error generating payroll data:', error);
    throw error;
  }
};

// Helper function to get employee attendance for a specific period
export const getEmployeeAttendanceForPeriod = async (employeeId: string, period: string): Promise<{ totalHours: number; totalDays: number }> => {
  try {
    // Parse period (e.g., "July 2025" or "2025-07")
    let year: number, month: number;
    
    if (period.includes('-')) {
      // Format: "2025-07"
      const [yearStr, monthStr] = period.split('-');
      year = parseInt(yearStr);
      month = parseInt(monthStr);
    } else {
      // Format: "July 2025"
      const [monthName, yearStr] = period.split(' ');
      year = parseInt(yearStr);
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      month = monthNames.indexOf(monthName) + 1;
    }

    if (!year || !month || month < 1 || month > 12) {
      console.error('Invalid period format:', period);
      return { totalHours: 0, totalDays: 0 };
    }

    // Get attendance records for the specified month
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;

    logger.debug('Fetching attendance for employee', { employeeId, startDate, endDate });

    const { data: attendanceRecords, error } = await supabase
      .from('attendance')
      .select('date, hours_worked, status')
      .eq('employee_id', employeeId)
      .gte('date', startDate)
      .lte('date', endDate)
      .in('status', ['Present', 'Late']); // Only count working days

    if (error) {
      logger.error('Error fetching attendance:', error);
      throw error;
    }

    logger.debug('Raw attendance records', { attendanceRecords });

    const totalHours = attendanceRecords?.reduce((sum, record) => {
      const hours = Number(record.hours_worked) || 0;
      return sum + hours;
    }, 0) || 0;

    const totalDays = attendanceRecords?.length || 0;

    logger.debug('Calculated attendance', { totalHours, totalDays });
    
    return { totalHours, totalDays };
  } catch (error) {
    console.error('Error calculating attendance for period:', error);
    return { totalHours: 0, totalDays: 0 };
  }
};

export const savePayrollRecord = async (employeeId: string, month: string, payrollData: PayrollData): Promise<void> => {
  logger.debug('Saving payroll record to Supabase', { employeeId, month });
  
  // Extract year from month if it's in "Month YYYY" format, otherwise use current year
  let year = new Date().getFullYear();
  if (month.includes(' ')) {
    const monthParts = month.split(' ');
    if (monthParts.length === 2 && !isNaN(Number(monthParts[1]))) {
      year = Number(monthParts[1]);
    }
  }
  
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
    logger.error('Error saving payroll record to Supabase:', error);
    throw error;
  }
  
  logger.info('Payroll record saved successfully to Supabase');
};

export const getEmployeePayrollRecords = async (employeeId: string): Promise<PayrollRecord[]> => {
  logger.debug('Fetching payroll records for employee', { employeeId });
  
  const { data: records, error } = await supabase
    .from('payroll_records')
    .select('*')
    .eq('employee_id', employeeId)
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  if (error) {
    logger.error('Error fetching payroll records from Supabase:', error);
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

  logger.debug('Fetched payroll records from Supabase', { count: formattedRecords.length });
  return formattedRecords;
};

export const getAllPayrollRecords = async (): Promise<PayrollRecord[]> => {
  logger.debug('Fetching all payroll records from Supabase');
  
  const { data: records, error } = await supabase
    .from('payroll_records')
    .select('*')
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .limit(50); // Add pagination limit

  if (error) {
    logger.error('Error fetching all payroll records from Supabase:', error);
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

  logger.debug('Fetched all payroll records from Supabase', { count: formattedRecords.length });
  return formattedRecords;
};

export const deletePayrollRecord = async (recordId: string): Promise<void> => {
  logger.info('Starting deletion process for payroll record', { recordId });
  
  try {
    // Step 1: Check if record exists and is not locked
    logger.debug('Step 1: Verifying record exists and is not locked');
    const { data: existingRecord, error: fetchError } = await supabase
      .from('payroll_records')
      .select('id, is_locked, employee_id, month, year')
      .eq('id', recordId)
      .maybeSingle();

    if (fetchError) {
      logger.error('Error fetching record:', fetchError);
      throw new Error(`Failed to verify record: ${fetchError.message}`);
    }

    if (!existingRecord) {
      logger.warn('Record not found - may have been already deleted', { recordId });
      return; // Don't throw error, consider it already deleted
    }

    if (existingRecord.is_locked) {
      logger.error('Record is locked, cannot delete', { recordId });
      throw new Error('Cannot delete locked payroll record. Please unlock it first.');
    }

    logger.debug('Record verified and unlocked', { existingRecord });

    // Step 2: Perform the deletion
    logger.debug('Step 2: Performing deletion');
    const { error: deleteError } = await supabase
      .from('payroll_records')
      .delete()
      .eq('id', recordId);

    if (deleteError) {
      logger.error('Deletion failed:', deleteError);
      throw new Error(`Failed to delete payroll record: ${deleteError.message}`);
    }

    logger.info('Deletion completed successfully for record', { recordId });

  } catch (error) {
    logger.error('Delete operation failed:', error);
    throw error;
  }
};

export const updatePayrollLockStatus = async (recordId: string, isLocked: boolean): Promise<void> => {
  logger.debug('Updating payroll lock status', { recordId, isLocked });
  
  const { error } = await supabase
    .from('payroll_records')
    .update({ 
      is_locked: isLocked,
      status: isLocked ? 'finalized' : 'draft',
      updated_at: new Date().toISOString()
    })
    .eq('id', recordId);

  if (error) {
    logger.error('Error updating payroll lock status:', error);
    throw error;
  }
  
  logger.info('Payroll lock status updated successfully');
};

export const saveDraftPayroll = async (period: string, payrollData: any): Promise<void> => {
  const [year, month] = period.split('-');
  const recordId = `PERIOD_${period}`;
  
  const { error } = await supabase
    .from('payroll_records')
    .upsert({
      id: recordId,
      employee_id: null,
      month: period,
      year: parseInt(year),
      payroll_data: payrollData,
      status: 'draft',
      updated_at: new Date().toISOString(),
    });

  if (error) {
    logger.error('Error saving draft payroll:', error);
    throw new Error(`Failed to save draft payroll: ${error.message}`);
  }
};

export const finalizePayroll = async (period: string, userId: string): Promise<void> => {
  const recordId = `PERIOD_${period}`;
  
  const { error } = await supabase
    .from('payroll_records')
    .update({
      status: 'finalized',
      finalized_at: new Date().toISOString(),
      finalized_by: userId,
      is_locked: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', recordId);

  if (error) {
    logger.error('Error finalizing payroll:', error);
    throw new Error(`Failed to finalize payroll: ${error.message}`);
  }
};

export const getPayrollStatus = async (period: string): Promise<{ status: string; finalizedBy?: string; finalizedAt?: string } | null> => {
  const recordId = `PERIOD_${period}`;
  
  const { data, error } = await supabase
    .from('payroll_records')
    .select('status, finalized_by, finalized_at')
    .eq('id', recordId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    logger.error('Error getting payroll status:', error);
    throw new Error(`Failed to get payroll status: ${error.message}`);
  }

  return data;
};
