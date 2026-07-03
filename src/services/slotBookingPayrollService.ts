import { supabase } from '@/integrations/supabase/client';
import { calculateSlotPay, calculateActualHoursWorkedAsync, getExpectedSlotDurationAsync, calculateMilestoneBonus, getMilestoneBonusConfig, getPayBreakdown } from '@/utils/slotPayCalculation';
import { EmployeeProfile } from '@/types/employee';
import { getDateRangeForPeriod, parsePeriod } from '@/utils/periodUtils';
import { logger } from '@/utils/logger';

interface SlotBookingPayData {
  totalSlots: number;
  totalPay: number;
  fullSlotRate?: number;
  rateBreakdown?: Array<{ item: string; amount: number }>;
  milestoneBonus?: number;
  milestoneBonusThreshold?: number; // 8, 12, or 16
  breakdown: Array<{
    date: string;
    branchName: string;
    pay: number;
    hasAttendance: boolean;
    checkIn?: string | null;
    checkOut?: string | null;
    hoursWorked?: number;
    expectedHours?: number;
    attendanceId?: number | null;
    fullSlotRate?: number;
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
      .select('id, employee_id, date, status, check_in, check_out')
      .eq('employee_id', employeeId)
      .in('date', bookingDates)
      .in('status', ['Present', 'Late', 'present', 'late']);

    if (attendanceError) {
      console.error('[SlotBookingPayroll] Error fetching attendance:', attendanceError);
      throw attendanceError;
    }

    // Create map with attendance data including times and ID
    const attendanceMap = new Map(
      (attendanceRecords || []).map(a => [a.date, { 
        id: a.id,
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
      
      if (!attendance) {
        // Include booking without attendance as unattended row
        console.log('[SlotBookingPayroll] No attendance for', booking.date, '- including as unattended');
        breakdown.push({
          date: booking.date,
          branchName: booking.branch_name || 'Unknown Branch',
          pay: 0,
          hasAttendance: false,
          checkIn: null,
          checkOut: null,
          hoursWorked: 0,
          expectedHours: 0,
          attendanceId: null,
          fullSlotRate: 0
        });
        continue;
      }

      // Calculate actual hours worked from attendance times
      const actualHoursWorked = await calculateActualHoursWorkedAsync(
        booking.date,
        attendance.checkIn,
        attendance.checkOut
      );
      const expectedHours = await getExpectedSlotDurationAsync(booking.date);

      console.log(`[SlotBookingPayroll] ${booking.date}: Check-in ${attendance.checkIn || 'N/A'}, Check-out ${attendance.checkOut || 'N/A'}, Hours: ${actualHoursWorked.toFixed(2)}/${expectedHours.toFixed(2)}`);

      // Calculate full slot rate (without proration) first
      const fullSlotRate = await calculateSlotPay(
        booking.date,
        employee.qualifications,
        employee.joinDate,
        expectedHours // Use expected hours to get full rate
      );

      // Calculate actual pay using dynamic pricing with proration
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
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        hoursWorked: actualHoursWorked,
        expectedHours,
        attendanceId: attendance.id,
        fullSlotRate
      });

      totalPay += pay;
      totalSlots++;
    }

    // Calculate the employee's full slot rate and rate breakdown for summary display.
    // Prefer an attended booking as the sample so expectedHours/fullSlotRate are real values.
    let employeeFullSlotRate: number | undefined;
    let rateBreakdown: Array<{ item: string; amount: number }> | undefined;
    if (breakdown.length > 0) {
      const sample = breakdown.find(b => b.hasAttendance) ?? breakdown[0];

      // Use sample's fullSlotRate if it's a real positive number; else recompute below.
      employeeFullSlotRate = sample.fullSlotRate && sample.fullSlotRate > 0
        ? sample.fullSlotRate
        : undefined;

      // Pass undefined when expectedHours is missing/zero so getPayBreakdown
      // falls back to the slot's own expectedDuration (avoids 0× proration bug).
      const expectedHoursForBreakdown =
        sample.expectedHours && sample.expectedHours > 0
          ? sample.expectedHours
          : undefined;

      const fullBreakdown = await getPayBreakdown(
        sample.date,
        employee.qualifications,
        employee.joinDate,
        expectedHoursForBreakdown
      );
      // Filter out the "Prorated" info line
      rateBreakdown = fullBreakdown.filter(item => item.amount !== 0 || !item.item.startsWith('Prorated'));

      // If we still don't have a full slot rate (no attended sample), compute it now.
      if (!employeeFullSlotRate) {
        const expectedDuration = await getExpectedSlotDurationAsync(sample.date);
        employeeFullSlotRate = await calculateSlotPay(
          sample.date,
          employee.qualifications,
          employee.joinDate,
          expectedDuration
        );
      }
    }

    // Calculate milestone bonus
    const milestoneBonus = await calculateMilestoneBonus(totalSlots);
    let milestoneBonusThreshold: number | undefined;
    if (totalSlots >= 16) {
      milestoneBonusThreshold = 16;
    } else if (totalSlots >= 12) {
      milestoneBonusThreshold = 12;
    } else if (totalSlots >= 8) {
      milestoneBonusThreshold = 8;
    }

    console.log('[SlotBookingPayroll] Total slots with attendance:', totalSlots, 'Total pay:', totalPay, 'Milestone bonus:', milestoneBonus);

    return {
      totalSlots,
      totalPay,
      fullSlotRate: employeeFullSlotRate,
      rateBreakdown,
      milestoneBonus: milestoneBonus > 0 ? milestoneBonus : undefined,
      milestoneBonusThreshold,
      breakdown
    };
  } catch (error) {
    console.error('[SlotBookingPayroll] Error calculating slot booking pay:', error);
    throw error;
  }
};
