import { supabase } from '@/integrations/supabase/client';
import { calculateSlotPay, calculateActualHoursWorked, getExpectedSlotDuration } from '@/utils/slotPayCalculation';
import { EmployeeProfile } from '@/types/employee';
import { getDateRangeForPeriod, parsePeriod } from '@/utils/periodUtils';
import { logger } from '@/utils/logger';

interface SlotBookingPayData {
  totalSlots: number;
  totalPay: number;
  breakdown: Array<{
    date: string;
    branchName: string;
    pay: number;
    hasAttendance: boolean;
    hoursWorked?: number;
    expectedHours?: number;
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
  logger.debug('Fetching slot bookings', { employeeId, period });

  // Parse period and get date range
  const { start: startDateStr, end: endDateStr } = getDateRangeForPeriod(period);
  
  logger.debug('Period range', { startDateStr, endDateStr });

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
      logger.error('Error fetching bookings:', bookingsError);
      throw bookingsError;
    }

    if (!bookings || bookings.length === 0) {
      logger.warn(`No approved bookings found for ${employee.name} in ${period}`);
      return { totalSlots: 0, totalPay: 0, breakdown: [] };
    }

    logger.debug(`Found ${bookings.length} approved booking(s) for ${employee.name}`);

    // Fetch attendance records for these dates with check-in and check-out times
    const bookingDates = bookings.map(b => b.date);
    
    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from('attendance')
      .select('employee_id, date, status, check_in, check_out')
      .eq('employee_id', employeeId)
      .in('date', bookingDates)
      .in('status', ['Present', 'Late', 'present', 'late']);

    if (attendanceError) {
      console.error('[SlotBookingPayroll] Error fetching attendance:', attendanceError);
      throw attendanceError;
    }

    // Create map with attendance data including times
    const attendanceMap = new Map(
      (attendanceRecords || []).map(a => [a.date, { 
        checkIn: a.check_in, 
        checkOut: a.check_out 
      }])
    );

    console.log('[SlotBookingPayroll] Attendance records found:', attendanceRecords?.length || 0);
    console.log('[SlotBookingPayroll] Attendance dates:', Array.from(attendanceMap.keys()));

    // Calculate pay for each booking using dynamic pricing with proration
    const breakdown: SlotBookingPayData['breakdown'] = [];
    let totalPay = 0;
    let totalSlots = 0;

    for (const booking of bookings) {
      const attendance = attendanceMap.get(booking.date);
      
      // Only count bookings where employee actually attended
      if (!attendance) {
        console.log('[SlotBookingPayroll] Skipping booking on', booking.date, '- no attendance record');
        continue;
      }

      // Calculate actual hours worked from attendance times
      const actualHoursWorked = calculateActualHoursWorked(
        booking.date,
        attendance.checkIn,
        attendance.checkOut
      );
      const expectedHours = getExpectedSlotDuration(booking.date);

      console.log(`[SlotBookingPayroll] ${booking.date}: Check-in ${attendance.checkIn || 'N/A'}, Check-out ${attendance.checkOut || 'N/A'}, Hours: ${actualHoursWorked.toFixed(2)}/${expectedHours.toFixed(2)}`);

      // Calculate pay using dynamic pricing with proration
      const pay = await calculateSlotPay(
        booking.date,
        employee.qualifications,
        employee.joinDate,
        actualHoursWorked
      );

      breakdown.push({
        date: booking.date,
        branchName: booking.branch_name || 'Unknown Branch',
        pay,
        hasAttendance: true,
        hoursWorked: actualHoursWorked,
        expectedHours
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
