import { supabase } from '@/integrations/supabase/client';

export const getEmployeePayrollDataOptimized = async (employeeIds: string[], period?: string) => {
  console.log('Fetching optimized payroll data for employees:', employeeIds, 'period:', period);
  
  if (employeeIds.length === 0) return {};

  try {
    console.log('DEBUG: getEmployeePayrollDataOptimized called with period:', period);
    
    // Parse period for attendance queries
    let attendanceFilter: { startDate?: string; endDate?: string } = {};
    if (period) {
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

      if (year && month && month >= 1 && month <= 12) {
        attendanceFilter.startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
        attendanceFilter.endDate = `${year}-${month.toString().padStart(2, '0')}-31`;
        console.log('DEBUG: Attendance filter set:', attendanceFilter);
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
      supabase
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
        .in('status', ['Present', 'Late']);
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
      console.log('DEBUG: Raw attendance data:', attendanceResult.data);
      attendanceResult.data.forEach((record: any) => {
        if (!attendanceByEmployee[record.employee_id]) {
          attendanceByEmployee[record.employee_id] = { totalHours: 0, totalDays: 0 };
        }
        attendanceByEmployee[record.employee_id].totalHours += Number(record.hours_worked) || 0;
        attendanceByEmployee[record.employee_id].totalDays += 1;
      });
      console.log('DEBUG: Processed attendance by employee:', attendanceByEmployee);
    } else {
      console.log('DEBUG: No attendance data found for the period');
    }

    console.log('Fetched optimized payroll data successfully');
    
    return {
      allowances: allowancesByEmployee,
      deductions: deductionsByEmployee,
      claims: claimsByEmployee,
      attendance: attendanceByEmployee
    };
  } catch (error) {
    console.error('Error fetching optimized payroll data:', error);
    throw error;
  }
};