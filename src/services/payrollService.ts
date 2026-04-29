import { supabase } from '@/integrations/supabase/client';
import { getEmployeeById } from './employeeService';
import { getEmployeeClaims } from './claimsService';
import { calculateCPF, calculateAge } from '@/utils/cpfCalculations';
import { logger } from '@/utils/logger';
import { withSessionRefresh, ensureValidSession } from './sessionRefreshService';
import { postPayrollJournals } from './accountingPostings';

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
    
    // Partner claim types that should NOT be included in payroll (they go to Branch P&L)
    // Only exclude for employees with Partner position
    const PARTNER_CLAIM_TYPES = [
      'Transport',
      'Office Stationeries', 
      'Training Equipment',
      'Other Business Expense'
    ];
    const isPartner = employee.position?.toLowerCase().includes('partner');
    
    const approvedClaimsTotal = claims
      .filter(claim => 
        claim.status === 'Approved' && 
        (!isPartner || !PARTNER_CLAIM_TYPES.includes(claim.type))
      )
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
  
  // Ensure session is valid before making the request
  await ensureValidSession();
  
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
  
  // Ensure session is valid before making the request
  await ensureValidSession();
  
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
  
  return withSessionRefresh(async () => {
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
  });
};

export const deletePayrollRecord = async (recordId: string): Promise<void> => {
  logger.info('Starting deletion process for payroll record', { recordId });
  
  return withSessionRefresh(async () => {
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
  });
};

export const updatePayrollLockStatus = async (recordId: string, isLocked: boolean): Promise<void> => {
  logger.debug('Updating payroll lock status', { recordId, isLocked });
  
  return withSessionRefresh(async () => {
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
  });
};

export const saveDraftPayroll = async (period: string, payrollData: any): Promise<void> => {
  return withSessionRefresh(async () => {
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
  });
};

export const finalizePayroll = async (period: string, userId: string): Promise<void> => {
  return withSessionRefresh(async () => {
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

    // Phase 3: post journals for every per-employee record in this period
    try {
      const { data: empRecs } = await supabase
        .from('payroll_records')
        .select('id')
        .eq('month', period)
        .neq('id', recordId);
      for (const r of empRecs || []) {
        void postPayrollJournals(r.id);
      }
    } catch (e) {
      logger.error('Failed to enqueue payroll postings', e);
    }
  });
};

export const getPayrollStatus = async (period: string): Promise<{ status: string; finalizedBy?: string; finalizedAt?: string } | null> => {
  const recordId = `PERIOD_${period}`;
  
  return withSessionRefresh(async () => {
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
  });
};

// Get payroll records for a specific period with payment status
export const getPayrollRecordsForPeriod = async (period: string): Promise<{
  employeeId: string;
  salaryPaid: boolean;
  salaryPaidAt: string | null;
  salaryPaidBy: string | null;
  cpfPaid: boolean;
  cpfPaidAt: string | null;
  cpfPaidBy: string | null;
}[]> => {
  return withSessionRefresh(async () => {
    // Extract year and month from period (e.g., "November 2025" -> year: 2025, month: "November")
    const [monthName, year] = period.split(' ');
    
    logger.debug('Fetching payroll records for period', { period, year, monthName });
    
    const { data, error } = await supabase
      .from('payroll_records')
      .select('employee_id, salary_paid, salary_paid_at, salary_paid_by, cpf_paid, cpf_paid_at, cpf_paid_by')
      .eq('year', parseInt(year))
      .eq('month', period);

    if (error) {
      logger.error('Error fetching payroll records for period:', error);
      return [];
    }

    return (data || []).map(record => ({
      employeeId: record.employee_id || '',
      salaryPaid: record.salary_paid || false,
      salaryPaidAt: record.salary_paid_at,
      salaryPaidBy: record.salary_paid_by,
      cpfPaid: record.cpf_paid || false,
      cpfPaidAt: record.cpf_paid_at,
      cpfPaidBy: record.cpf_paid_by,
    }));
  });
};

// Update salary payment status for an employee
export const updateSalaryPaymentStatus = async (
  employeeId: string,
  period: string,
  isPaid: boolean,
  paidBy: string
): Promise<void> => {
  return withSessionRefresh(async () => {
    const [, year] = period.split(' ');
    const recordId = `${employeeId}_${year}_${period.replace(' ', '_')}`;
    
    logger.debug('Updating salary payment status', { employeeId, period, isPaid, recordId });
    
    // Check if record exists
    const { data: existing } = await supabase
      .from('payroll_records')
      .select('id')
      .eq('id', recordId)
      .maybeSingle();

    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from('payroll_records')
        .update({
          salary_paid: isPaid,
          salary_paid_at: isPaid ? new Date().toISOString() : null,
          salary_paid_by: isPaid ? paidBy : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', recordId);

      if (error) {
        logger.error('Error updating salary payment status:', error);
        throw error;
      }
    } else {
      // Insert new record with minimal data
      const { error } = await supabase
        .from('payroll_records')
        .insert({
          id: recordId,
          employee_id: employeeId,
          month: period,
          year: parseInt(year),
          payroll_data: {} as any,
          salary_paid: isPaid,
          salary_paid_at: isPaid ? new Date().toISOString() : null,
          salary_paid_by: isPaid ? paidBy : null,
        });

      if (error) {
        logger.error('Error inserting salary payment status:', error);
        throw error;
      }
    }
    
    logger.info('Salary payment status updated successfully', { employeeId, isPaid });

    // Phase 3: re-post payroll journals for this employee/period
    try {
      const { data: empRec } = await supabase
        .from('payroll_records')
        .select('id')
        .eq('id', recordId)
        .maybeSingle();
      if (empRec?.id) void postPayrollJournals(empRec.id);
    } catch (e) {
      logger.error('Failed to post payroll journal after salary status change', e);
    }
  });
};

// Update CPF payment status for an employee
export const updateCpfPaymentStatus = async (
  employeeId: string,
  period: string,
  isPaid: boolean,
  paidBy: string
): Promise<void> => {
  return withSessionRefresh(async () => {
    const [, year] = period.split(' ');
    const recordId = `${employeeId}_${year}_${period.replace(' ', '_')}`;
    
    logger.debug('Updating CPF payment status', { employeeId, period, isPaid, recordId });
    
    // Check if record exists
    const { data: existing } = await supabase
      .from('payroll_records')
      .select('id')
      .eq('id', recordId)
      .maybeSingle();

    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from('payroll_records')
        .update({
          cpf_paid: isPaid,
          cpf_paid_at: isPaid ? new Date().toISOString() : null,
          cpf_paid_by: isPaid ? paidBy : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', recordId);

      if (error) {
        logger.error('Error updating CPF payment status:', error);
        throw error;
      }
    } else {
      // Insert new record with minimal data
      const { error } = await supabase
        .from('payroll_records')
        .insert({
          id: recordId,
          employee_id: employeeId,
          month: period,
          year: parseInt(year),
          payroll_data: {} as any,
          cpf_paid: isPaid,
          cpf_paid_at: isPaid ? new Date().toISOString() : null,
          cpf_paid_by: isPaid ? paidBy : null,
        });

      if (error) {
        logger.error('Error inserting CPF payment status:', error);
        throw error;
      }
    }
    
    logger.info('CPF payment status updated successfully', { employeeId, isPaid });

    // Phase 3: re-post payroll journals for this employee/period
    try {
      void postPayrollJournals(recordId);
    } catch (e) {
      logger.error('Failed to post payroll journal after CPF status change', e);
    }
  });
};

// Types for saved payroll data
export interface SavedPayrollEmployee {
  employeeId: string;
  name: string;
  type: 'Full-Time' | 'Casual';
  baseSalary: number;
  allowances: Array<{ name: string; amount: number }>;
  deductions: Array<{ name: string; amount: number }>;
  totalAllowances: number;
  totalDeductions: number;
  approvedClaims: number;
  grossPay: number;
  employeeCPF: number;
  employerCPF: number;
  netPay: number;
  // Casual-specific fields
  hourlyRate?: number;
  hoursWorked?: number;
  daysWorked?: number;
  slotBookingPay?: number;
  slotBreakdown?: any[];
  calculationMethod?: 'dynamic_pricing' | 'legacy_rates';
}

export interface SavedPayrollData {
  hasData: boolean;
  processedAt?: string;
  fullTimeEmployees: SavedPayrollEmployee[];
  casualEmployees: SavedPayrollEmployee[];
}

// Get saved payroll data for a specific period - preserves historical data
export const getSavedPayrollForPeriod = async (period: string): Promise<SavedPayrollData> => {
  logger.debug('Fetching saved payroll for period', { period });
  
  return withSessionRefresh(async () => {
    // Parse period format (e.g., "November 2025" or "2025-11")
    let year: number, month: string;
    
    if (period.includes('-')) {
      // Format: "2025-11"
      const [yearStr, monthStr] = period.split('-');
      year = parseInt(yearStr);
      month = monthStr.padStart(2, '0');
    } else {
      // Format: "November 2025"
      const [monthName, yearStr] = period.split(' ');
      year = parseInt(yearStr);
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const monthIndex = monthNames.indexOf(monthName) + 1;
      month = monthIndex.toString().padStart(2, '0');
    }

    logger.debug('Parsed period', { year, month });

    // Query payroll_records for all records in this period
    const { data: records, error } = await supabase
      .from('payroll_records')
      .select('*')
      .eq('year', year)
      .eq('month', month);

    if (error) {
      logger.error('Error fetching saved payroll:', error);
      return { hasData: false, fullTimeEmployees: [], casualEmployees: [] };
    }

    if (!records || records.length === 0) {
      logger.debug('No saved payroll data found for period', { period });
      return { hasData: false, fullTimeEmployees: [], casualEmployees: [] };
    }

    logger.info('Found saved payroll records', { count: records.length, period });

    const fullTimeEmployees: SavedPayrollEmployee[] = [];
    const casualEmployees: SavedPayrollEmployee[] = [];
    let latestProcessedAt: string | undefined;

    records.forEach((record: any) => {
      const data = record.payroll_data as any;
      if (!data || !record.employee_id) return;

      // Track the latest processed date
      if (!latestProcessedAt || record.updated_at > latestProcessedAt) {
        latestProcessedAt = record.updated_at;
      }

      const employee: SavedPayrollEmployee = {
        employeeId: record.employee_id,
        name: data.name || 'Unknown',
        type: data.type || 'Full-Time',
        baseSalary: data.baseSalary || 0,
        allowances: data.allowances || [],
        deductions: data.deductions || [],
        totalAllowances: data.totalAllowances || data.allowances?.reduce((sum: number, a: any) => sum + Number(a.amount || 0), 0) || 0,
        totalDeductions: data.totalDeductions || data.deductions?.reduce((sum: number, d: any) => sum + Number(d.amount || 0), 0) || 0,
        approvedClaims: data.approvedClaims || data.claims || 0,
        grossPay: data.grossPay || data.grossSalary || 0,
        employeeCPF: data.employeeCPF || data.cpfEmployee || 0,
        employerCPF: data.employerCPF || data.cpfEmployer || 0,
        netPay: data.netPay || data.netSalary || 0,
      };

      if (data.type === 'Casual') {
        employee.hourlyRate = data.hourlyRate || 0;
        employee.hoursWorked = data.hoursWorked || 0;
        employee.daysWorked = data.daysWorked || 0;
        employee.slotBookingPay = data.slotBookingPay || 0;
        employee.slotBreakdown = data.slotBreakdown || data.slotBookingMetadata?.breakdown || [];
        employee.calculationMethod = data.calculationMethod || data.slotBookingMetadata?.calculationMethod || 'legacy_rates';
        casualEmployees.push(employee);
      } else {
        fullTimeEmployees.push(employee);
      }
    });

    logger.info('Parsed saved payroll data', {
      fullTimeCount: fullTimeEmployees.length,
      casualCount: casualEmployees.length,
      processedAt: latestProcessedAt
    });

    return {
      hasData: true,
      processedAt: latestProcessedAt,
      fullTimeEmployees,
      casualEmployees
    };
  });
};
