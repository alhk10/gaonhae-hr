import { supabase } from '@/integrations/supabase/client';
import { getDateRangeForPeriod, parsePeriod } from '@/utils/periodUtils';
import { logger } from '@/utils/logger';
import { withSessionRefresh } from '@/services/sessionRefreshService';

interface PayrollDataResult {
  allowances: Record<string, any[]>;
  deductions: Record<string, any[]>;
  claims: Record<string, any[]>;
  attendance: Record<string, { totalHours: number; totalDays: number }>;
}

export const getEmployeePayrollDataOptimized = async (employeeIds: string[], period?: string): Promise<PayrollDataResult> => {
  logger.debug('Fetching optimized payroll data', { employeeIds: employeeIds.length, period });
  
  if (employeeIds.length === 0) {
    return { allowances: {}, deductions: {}, claims: {}, attendance: {} };
  }

  return withSessionRefresh(async () => {
    // Parse period for attendance queries
    let attendanceFilter: { startDate?: string; endDate?: string } = {};
    if (period) {
      const { year, month } = parsePeriod(period);
      
      logger.debug('Parsed period', { year, month, originalPeriod: period });

      if (year && month && month >= 1 && month <= 12) {
        const { start, end } = getDateRangeForPeriod(period);
        attendanceFilter.startDate = start;
        attendanceFilter.endDate = end;
        logger.debug('Attendance filter set', attendanceFilter);
      }
    }

    // Fetch all data in parallel with a single query each
    const [allowancesResult, deductionsResult, claimsResult] = await Promise.all([
      supabase
        .from('allowances')
        .select('*')
        .in('employee_id', employeeIds),
      supabase
        .from('deductions') 
        .select('*')
        .in('employee_id', employeeIds),
      // Filter claims by the payroll period
      attendanceFilter.startDate && attendanceFilter.endDate 
        ? supabase
            .from('claims')
            .select('*')
            .in('employee_id', employeeIds)
            .eq('status', 'Approved')
            .gte('submitted_date', attendanceFilter.startDate)
            .lte('submitted_date', attendanceFilter.endDate)
        : supabase
            .from('claims')
            .select('*')
            .in('employee_id', employeeIds)
            .eq('status', 'Approved')
    ]);

    // Fetch attendance data separately if period is provided
    let attendanceResult: any = null;
    if (attendanceFilter.startDate && attendanceFilter.endDate) {
      attendanceResult = await supabase
        .from('attendance')
        .select('employee_id, date, hours_worked, status')
        .in('employee_id', employeeIds)
        .gte('date', attendanceFilter.startDate)
        .lte('date', attendanceFilter.endDate)
        .in('status', ['Present', 'Late', 'present', 'late']);
    }

    if (allowancesResult.error) throw allowancesResult.error;
    if (deductionsResult.error) throw deductionsResult.error;
    if (claimsResult.error) throw claimsResult.error;
    if (attendanceResult?.error) throw attendanceResult.error;

    // Group data by employee ID
    const allowancesByEmployee = (allowancesResult.data || []).reduce((acc, item) => {
      if (!acc[item.employee_id]) acc[item.employee_id] = [];
      acc[item.employee_id].push(item);
      return acc;
    }, {} as Record<string, any[]>);

    const deductionsByEmployee = (deductionsResult.data || []).reduce((acc, item) => {
      if (!acc[item.employee_id]) acc[item.employee_id] = [];
      acc[item.employee_id].push(item);
      return acc;
    }, {} as Record<string, any[]>);

    const claimsByEmployee = (claimsResult.data || []).reduce((acc, item) => {
      if (!acc[item.employee_id]) acc[item.employee_id] = [];
      acc[item.employee_id].push(item);
      return acc;
    }, {} as Record<string, any[]>);

    // Process attendance data if available
    const attendanceByEmployee: Record<string, { totalHours: number; totalDays: number }> = {};
    if (attendanceResult?.data) {
      logger.debug('Processing attendance data', { recordCount: attendanceResult.data.length });
      attendanceResult.data.forEach((record: any) => {
        if (!attendanceByEmployee[record.employee_id]) {
          attendanceByEmployee[record.employee_id] = { totalHours: 0, totalDays: 0 };
        }
        attendanceByEmployee[record.employee_id].totalHours += Number(record.hours_worked) || 0;
        attendanceByEmployee[record.employee_id].totalDays += 1;
      });
    }

    logger.debug('Payroll data fetch complete');
    
    return {
      allowances: allowancesByEmployee,
      deductions: deductionsByEmployee,
      claims: claimsByEmployee,
      attendance: attendanceByEmployee
    };
  });
};