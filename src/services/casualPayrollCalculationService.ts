import { supabase } from '@/integrations/supabase/client';
import { EmployeeProfile } from '@/types/employee';
import { calculateSlotPay, calculateActualHoursWorkedAsync, getExpectedSlotDurationAsync, calculateMilestoneBonus } from '@/utils/slotPayCalculation';
import { calculateCPF, calculateAge } from '@/utils/cpfCalculations';
import { isNovember2025OrLater, getDateRangeForPeriod } from '@/utils/periodUtils';
import { logger } from '@/utils/logger';

/**
 * CASUAL EMPLOYEE PAYROLL CALCULATION SERVICE
 * For November 2025 onwards: Uses slot bookings + attendance + dynamic pricing
 * For before November 2025: Uses legacy rates (hourly/daily/monthly)
 */

export interface CasualPayrollResult {
  baseSalary: number;
  totalPay: number;
  grossPay: number;
  employeeCPF: number;
  employerCPF: number;
  slotBookingPay: number;
  slotCount: number;
  milestoneBonus: number;
  calculationMethod: 'dynamic_pricing' | 'legacy_rates';
  breakdown: Array<{
    date: string;
    branchName: string;
    pay: number;
    checkIn?: string | null;
    checkOut?: string | null;
    hoursWorked?: number | null;
  }>;
  warnings: string[];
  errors: string[];
}

// Period check function now imported from periodUtils

/**
 * Main function to calculate casual employee payroll
 */
export async function calculateCasualEmployeePayroll(
  employee: EmployeeProfile,
  period: string,
  hoursWorked: number = 0,
  daysWorked: number = 0,
  approvedClaims: number = 0
): Promise<CasualPayrollResult> {
  logger.info(`Calculating payroll for ${employee.name} (${employee.id}) for ${period}`);
  
  // Calculate total allowances and deductions from employee profile
  const totalAllowances = (employee.allowances || []).reduce((sum, a) => sum + Number(a.amount || 0), 0);
  const totalDeductions = (employee.deductions || []).reduce((sum, d) => sum + Number(d.amount || 0), 0);
  
  logger.debug(`Employee allowances: $${totalAllowances}, deductions: $${totalDeductions}`);
  
  const result: CasualPayrollResult = {
    baseSalary: 0,
    totalPay: 0,
    grossPay: 0,
    employeeCPF: 0,
    employerCPF: 0,
    slotBookingPay: 0,
    slotCount: 0,
    milestoneBonus: 0,
    calculationMethod: 'legacy_rates',
    breakdown: [],
    warnings: [],
    errors: []
  };
  
  // Step 1: Check if we should use dynamic pricing
  const useDynamicPricing = isNovember2025OrLater(period);
  
  if (!useDynamicPricing) {
    logger.debug('Using LEGACY RATES calculation');
    
    // Use legacy calculation
    let basePay = 0;
    
    if (employee.paymentType === 'Hourly' && employee.hourlyRate) {
      basePay = hoursWorked * employee.hourlyRate;
    } else if (employee.paymentType === 'Monthly' && employee.baseSalary) {
      basePay = employee.baseSalary;
    }
    
    // Gross Pay = Base Pay + Allowances + Claims
    const grossPay = basePay + totalAllowances + approvedClaims;
    const age = calculateAge(employee.dateOfBirth);
    const cpf = calculateCPF(grossPay, employee.residencyStatus, age);
    
    // Net Pay = Gross Pay - CPF - Deductions
    const netPay = grossPay - cpf.employeeCPF - totalDeductions;
    
    result.baseSalary = basePay;
    result.grossPay = grossPay;
    result.employeeCPF = cpf.employeeCPF;
    result.employerCPF = cpf.employerCPF;
    result.totalPay = netPay;
    result.calculationMethod = 'legacy_rates';
    
    logger.info(`Legacy calculation complete: Gross=$${grossPay.toFixed(2)}, CPF=$${cpf.employeeCPF.toFixed(2)}, Deductions=$${totalDeductions.toFixed(2)}, Net=$${netPay.toFixed(2)}`);
    return result;
  }
  
  // Step 2: Use DYNAMIC PRICING for November 2025+
  logger.debug('Using DYNAMIC PRICING calculation');
  
  try {
    // Get date range using utility
    const { start: startDateStr, end: endDateStr } = getDateRangeForPeriod(period);
    logger.debug(`Date range for ${period}: ${startDateStr} to ${endDateStr}`);
    
    // Step 3: Fetch approved slot bookings
    logger.info(`[CasualPayroll] Fetching slot bookings for ${employee.name} (${employee.id})`);
    logger.info(`[CasualPayroll] Date range: ${startDateStr} to ${endDateStr}`);
    
    // Query with lowercase 'approved' status (database uses lowercase)
    const { data: bookings, error: bookingsError } = await supabase
      .from('slot_bookings_new')
      .select('id, employee_id, date, branch_name, status')
      .eq('employee_id', employee.id)
      .eq('status', 'approved')
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .order('date', { ascending: true });
    
    logger.info(`[CasualPayroll] Slot bookings result: ${bookings?.length || 0} bookings found`);
    if (bookings && bookings.length > 0) {
      logger.info(`[CasualPayroll] First booking: ${JSON.stringify(bookings[0])}`);
    }
    
    if (bookingsError) {
      logger.error('Bookings fetch error:', bookingsError);
      result.errors.push(`Failed to fetch bookings: ${bookingsError.message}`);
      throw bookingsError;
    }
    
    if (!bookings || bookings.length === 0) {
      logger.warn(`[CasualPayroll] No approved bookings found for ${employee.name} - checking with Approved status...`);
      
      // Try with 'Approved' (capitalized) as fallback
      const { data: bookingsCapitalized, error: bookingsCapError } = await supabase
        .from('slot_bookings_new')
        .select('id, employee_id, date, branch_name, status')
        .eq('employee_id', employee.id)
        .eq('status', 'Approved')
        .gte('date', startDateStr)
        .lte('date', endDateStr);
      
      if (!bookingsCapError && bookingsCapitalized && bookingsCapitalized.length > 0) {
        logger.info(`[CasualPayroll] Found ${bookingsCapitalized.length} bookings with capitalized Approved`);
        // Use capitalized results
        bookings.push(...bookingsCapitalized);
      }
    }
    
    if (!bookings || bookings.length === 0) {
      logger.warn('No approved bookings found - falling back to legacy rates');
      result.warnings.push('No slot bookings found for this period');
      result.calculationMethod = 'legacy_rates';
      
      // Fall back to legacy
      let basePay = 0;
      if (employee.paymentType === 'Monthly' && employee.baseSalary) {
        basePay = employee.baseSalary;
      }
      
      const grossPay = basePay + totalAllowances + approvedClaims;
      const age = calculateAge(employee.dateOfBirth);
      const cpf = calculateCPF(grossPay, employee.residencyStatus, age);
      
      result.baseSalary = basePay;
      result.grossPay = grossPay;
      result.employeeCPF = cpf.employeeCPF;
      result.employerCPF = cpf.employerCPF;
      result.totalPay = grossPay - cpf.employeeCPF - totalDeductions;
      
      return result;
    }
    
    logger.info(`[CasualPayroll] Found ${bookings.length} approved bookings for ${employee.name}`);
    
    // Step 4: Fetch attendance records with check-in/check-out times for proration
    logger.info('[CasualPayroll] Fetching attendance records...');
    const bookingDates = bookings.map(b => b.date);
    logger.info(`[CasualPayroll] Booking dates: ${bookingDates.join(', ')}`);
    
    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from('attendance')
      .select('employee_id, date, status, check_in, check_out')
      .eq('employee_id', employee.id)
      .in('date', bookingDates)
      .or('status.eq.Present,status.eq.Late,status.eq.present,status.eq.late');
    
    logger.info(`[CasualPayroll] Attendance result: ${attendanceRecords?.length || 0} records found`);
    
    if (attendanceError) {
      logger.error('Attendance fetch error:', attendanceError);
      result.errors.push(`Failed to fetch attendance: ${attendanceError.message}`);
      throw attendanceError;
    }
    
    // Create map with attendance data including times for proration
    const attendanceMap = new Map(
      (attendanceRecords || []).map(a => [a.date, { checkIn: a.check_in, checkOut: a.check_out }])
    );
    
    logger.debug(`Found ${attendanceRecords?.length || 0} attendance records`);
    
    // Step 5: Calculate pay for each booking with attendance and proration
    logger.debug('Calculating dynamic pricing with proration...');
    let totalSlotPay = 0;
    let totalSlots = 0;
    
    for (const booking of bookings) {
      const attendance = attendanceMap.get(booking.date);
      
      if (!attendance) {
        logger.debug(`${booking.date}: No attendance - skipped`);
        continue;
      }
      
      // Calculate actual hours worked for proration
      const actualHoursWorked = await calculateActualHoursWorkedAsync(
        booking.date,
        attendance.checkIn,
        attendance.checkOut
      );
      const expectedHours = await getExpectedSlotDurationAsync(booking.date);
      
      // Calculate dynamic pricing for this slot with proration
      const pay = await calculateSlotPay(
        booking.date,
        employee.qualifications,
        employee.joinDate,
        actualHoursWorked
      );
      
      result.breakdown.push({
        date: booking.date,
        branchName: booking.branch_name || 'Unknown',
        pay,
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        hoursWorked: actualHoursWorked
      });
      
      totalSlotPay += pay;
      totalSlots++;
      
      logger.debug(`${booking.date}: $${pay.toFixed(2)} (${actualHoursWorked.toFixed(2)}h/${expectedHours.toFixed(2)}h) (${booking.branch_name || 'Unknown'})`);
    }
    
    logger.info(`Total: ${totalSlots} slots = $${totalSlotPay.toFixed(2)}`);
    
    result.slotBookingPay = totalSlotPay;
    result.slotCount = totalSlots;
    
    // Step 6: Calculate milestone bonus based on total slots
    const milestoneBonus = await calculateMilestoneBonus(totalSlots);
    result.milestoneBonus = milestoneBonus;
    
    if (milestoneBonus > 0) {
      logger.info(`Milestone bonus: $${milestoneBonus.toFixed(2)} for ${totalSlots} slots`);
    }
    
    // Step 7: Determine base pay - use slot pay + milestone bonus if available
    let basePay = totalSlotPay + milestoneBonus;
    
    // If no attended slots but employee has monthly salary, use monthly salary as fallback
    if (totalSlots === 0 && employee.paymentType === 'Monthly' && employee.baseSalary) {
      logger.warn(`No attended slots found for ${employee.name}, using monthly salary fallback: $${employee.baseSalary}`);
      basePay = employee.baseSalary;
      result.warnings.push('No attended slots - using monthly salary');
      result.calculationMethod = 'legacy_rates'; // Mark as legacy since using monthly salary
    } else if (totalSlots > 0) {
      result.calculationMethod = 'dynamic_pricing';
    } else {
      // No slots and no monthly salary - $0 pay
      result.calculationMethod = 'dynamic_pricing';
      result.warnings.push('No attended slots and no monthly salary configured');
    }
    
    // Calculate final payroll with CPF
    // Gross Pay = Base Pay + Allowances + Claims (milestone bonus already in basePay)
    const grossPay = basePay + totalAllowances + approvedClaims;
    const age = calculateAge(employee.dateOfBirth);
    const cpf = calculateCPF(grossPay, employee.residencyStatus, age);
    
    // Net Pay = Gross Pay - CPF - Deductions
    const netPay = grossPay - cpf.employeeCPF - totalDeductions;
    
    result.baseSalary = basePay;
    result.grossPay = grossPay;
    result.employeeCPF = cpf.employeeCPF;
    result.employerCPF = cpf.employerCPF;
    result.totalPay = netPay;
    
    logger.info(`Dynamic pricing complete: Gross=$${grossPay.toFixed(2)} (inc. milestone $${milestoneBonus.toFixed(2)}), CPF=$${cpf.employeeCPF.toFixed(2)}, Deductions=$${totalDeductions.toFixed(2)}, Net=$${netPay.toFixed(2)}`);
    
  } catch (error) {
    logger.error('Error in dynamic pricing calculation:', error);
    result.errors.push(`Dynamic pricing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    // Fall back to legacy if dynamic pricing fails
    let basePay = 0;
    if (employee.paymentType === 'Monthly' && employee.baseSalary) {
      basePay = employee.baseSalary;
    }
    
    // Gross Pay = Base Pay + Allowances + Claims
    const grossPay = basePay + totalAllowances + approvedClaims;
    const age = calculateAge(employee.dateOfBirth);
    const cpf = calculateCPF(grossPay, employee.residencyStatus, age);
    
    // Net Pay = Gross Pay - CPF - Deductions
    const netPay = grossPay - cpf.employeeCPF - totalDeductions;
    
    result.baseSalary = basePay;
    result.grossPay = grossPay;
    result.employeeCPF = cpf.employeeCPF;
    result.employerCPF = cpf.employerCPF;
    result.totalPay = netPay;
    result.calculationMethod = 'legacy_rates';
  }
  
  logger.info(`Payroll complete - ${result.calculationMethod}: Net Pay $${result.totalPay.toFixed(2)}`);
  
  return result;
}
