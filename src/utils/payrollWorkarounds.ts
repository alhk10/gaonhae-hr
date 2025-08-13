// Emergency workaround for missing employees in payroll
import { supabase } from '@/integrations/supabase/client';

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

// Force-add Wang Pot Chien and Siti Aisyah with their data
export const MISSING_EMPLOYEES_WORKAROUND: MissingEmployeeData[] = [
  {
    id: 'EMP1752646101747',
    name: 'Wang Pot Chien',
    type: 'Casual',
    paymentType: 'Hourly',
    hourlyRate: 14.00,
    residencyStatus: 'PR',
    nric: 'T0277825J',
    bankName: 'DBS/POSB',
    bankAccount: '2710458060'
  },
  {
    id: 'EMP1752551410290', 
    name: 'Siti Aisyah Binti Mohammed Nazzer',
    type: 'Casual',
    paymentType: 'Monthly',
    baseSalary: 800.00,
    residencyStatus: 'Citizen',
    nric: 'T0631113F',
    bankName: 'DBS/POSB',
    bankAccount: '1860056501'
  }
];

export async function getAttendanceDataForMissingEmployees(period: string) {
  const [startDate, endDate] = getPeriodDates(period);
  
  const { data: attendanceData } = await supabase
    .from('attendance')
    .select('employee_id, hours_worked, date')
    .in('employee_id', MISSING_EMPLOYEES_WORKAROUND.map(emp => emp.id))
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
  const wangExists = employeesInPayroll.some(emp => emp.employeeId === 'EMP1752646101747' || emp.name?.toLowerCase().includes('wang'));
  const sitiExists = employeesInPayroll.some(emp => emp.employeeId === 'EMP1752551410290' || emp.name?.toLowerCase().includes('siti'));
  
  console.log('Workaround check - Wang exists:', wangExists, 'Siti exists:', sitiExists);
  return !wangExists || !sitiExists;
}