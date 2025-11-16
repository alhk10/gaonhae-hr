import { supabase } from '@/integrations/supabase/client';
import { calculateSlotPay } from '@/utils/slotPayCalculation';
import { EmployeeProfile } from '@/types/employee';

interface SlotBookingPayData {
  totalSlots: number;
  totalPay: number;
  breakdown: Array<{
    date: string;
    branchName: string;
    pay: number;
    hasAttendance: boolean;
  }>;
}

/**
 * Fetches slot booking pay data for a casual employee for a given period
 * Calculates pay using dynamic pricing and cross-references with attendance
 */
export const getSlotBookingPayForPeriod = async (
  employeeId: string,
  period: string,
  employee: EmployeeProfile
): Promise<SlotBookingPayData> => {
  console.log('[SlotBookingPayroll] Fetching slot bookings for employee:', employeeId, 'period:', period);

  // Parse period (supports "Month Year" e.g., "November 2025" and "YYYY-MM")
  let year: number | undefined;
  let monthIndex: number | undefined;
  const monthMap: { [key: string]: number } = {
    January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
    July: 6, August: 7, September: 8, October: 9, November: 10, December: 11
  };

  if (period.includes('-')) {
    // Format: YYYY-MM
    const [y, m] = period.split('-');
    year = parseInt(y);
    monthIndex = parseInt(m) - 1;
  } else if (period.includes(' ')) {
    // Format: Month Year
    const [monthName, yearStr] = period.split(' ');
    monthIndex = monthMap[monthName as keyof typeof monthMap];
    year = parseInt(yearStr);
  }
  
  if (monthIndex === undefined || isNaN(year as number)) {
    console.error('[SlotBookingPayroll] Invalid period format:', period);
    return { totalSlots: 0, totalPay: 0, breakdown: [] };
  }

  // Calculate start and end dates for the period
  const startDate = new Date(year as number, monthIndex, 1);
  const endDate = new Date((year as number), (monthIndex as number) + 1, 0);
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  console.log('[SlotBookingPayroll] Period range:', startDateStr, 'to', endDateStr);

  try {
    // Fetch approved slot bookings for this employee in this period
    const { data: bookings, error: bookingsError } = await supabase
      .from('slot_bookings_new')
      .select('id, employee_id, date, branch_name, status')
      .eq('employee_id', employeeId)
      .ilike('status', 'approved')
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .order('date', { ascending: true });

    if (bookingsError) {
      console.error('[SlotBookingPayroll] Error fetching bookings:', bookingsError);
      throw bookingsError;
    }

    if (!bookings || bookings.length === 0) {
      console.log('[SlotBookingPayroll] No approved bookings found for this period');
      return { totalSlots: 0, totalPay: 0, breakdown: [] };
    }

    console.log('[SlotBookingPayroll] Found', bookings.length, 'approved bookings');

    // Fetch attendance records for these dates
    const bookingDates = bookings.map(b => b.date);
    console.log('[SlotBookingPayroll] Checking attendance for dates:', bookingDates);
    
    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from('attendance')
      .select('employee_id, date, status, check_in')
      .eq('employee_id', employeeId)
      .in('date', bookingDates)
      .in('status', ['Present', 'Late', 'present', 'late']);

    if (attendanceError) {
      console.error('[SlotBookingPayroll] Error fetching attendance:', attendanceError);
      throw attendanceError;
    }

    const attendanceMap = new Map(
      (attendanceRecords || []).map(a => [a.date, true])
    );

    console.log('[SlotBookingPayroll] Attendance records found:', attendanceRecords?.length || 0);
    console.log('[SlotBookingPayroll] Attendance dates:', Array.from(attendanceMap.keys()));

    // Calculate pay for each booking using dynamic pricing
    const breakdown: SlotBookingPayData['breakdown'] = [];
    let totalPay = 0;
    let totalSlots = 0;

    for (const booking of bookings) {
      const hasAttendance = attendanceMap.has(booking.date);
      
      // Only count bookings where employee actually attended
      if (!hasAttendance) {
        console.log('[SlotBookingPayroll] Skipping booking on', booking.date, '- no attendance record');
        continue;
      }

      // Calculate pay using dynamic pricing
      const pay = await calculateSlotPay(
        booking.date,
        employee.qualifications,
        employee.joinDate
      );

      breakdown.push({
        date: booking.date,
        branchName: booking.branch_name || 'Unknown Branch',
        pay,
        hasAttendance: true
      });

      totalPay += pay;
      totalSlots++;
    }

    console.log('[SlotBookingPayroll] Total slots with attendance:', totalSlots, 'Total pay:', totalPay);

    return {
      totalSlots,
      totalPay,
      breakdown
    };
  } catch (error) {
    console.error('[SlotBookingPayroll] Error calculating slot booking pay:', error);
    throw error;
  }
};
