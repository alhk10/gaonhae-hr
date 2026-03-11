// Utility functions for payroll period calculations
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface MissingEmployeeData {
  id: string;
  name: string;
  type: 'Full-Time' | 'Casual';
  paymentType: 'Monthly' | 'Hourly' | 'Daily';
  hourlyRate?: number;
  baseSalary?: number;
  residencyStatus: string;
  nric: string;
  bankName: string;
  bankAccount: string;
}

// Workaround data removed for security - employee data should only come from database
export const MISSING_EMPLOYEES_WORKAROUND: MissingEmployeeData[] = [];

export async function getAttendanceDataForMissingEmployees(period: string, employeeIds: string[]) {
  const [startDate, endDate] = getPeriodDates(period);
  
  const { data: attendanceData } = await supabase
    .from('attendance')
    .select('employee_id, hours_worked, date')
    .in('employee_id', employeeIds)
    .gte('date', startDate)
    .lte('date', endDate)
    .in('status', ['Present', 'Late']);
    
  const attendanceSummary: Record<string, { totalHours: number; totalDays: number }> = {};
  
  attendanceData?.forEach(record => {
    if (!attendanceSummary[record.employee_id]) {
      attendanceSummary[record.employee_id] = { totalHours: 0, totalDays: 0 };
    }
    attendanceSummary[record.employee_id].totalHours += record.hours_worked || 0;
    attendanceSummary[record.employee_id].totalDays += 1;
  });
  
  return attendanceSummary;
}

export function getPeriodDates(period: string): [string, string] {
  const [year, month] = period.split('-');
  const startDate = `${year}-${month}-01`;
  const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
  return [startDate, endDate];
}

export function shouldApplyWorkaround(employeesInPayroll: any[]): boolean {
  // Workaround disabled - all employee data should come from database
  return false;
}
