import { supabase } from '@/integrations/supabase/client';
import { EmployeeProfile } from '@/types/employee';
import { calculateSlotPay } from '@/utils/slotPayCalculation';
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
  calculationMethod: 'dynamic_pricing' | 'legacy_rates';
  breakdown: Array<{
    date: string;
    branchName: string;
    pay: number;
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
  
  const result: CasualPayrollResult = {
    baseSalary: 0,
    totalPay: 0,
    grossPay: 0,
    employeeCPF: 0,
    employerCPF: 0,
    slotBookingPay: 0,
    slotCount: 0,
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
    } else if (employee.paymentType === 'Daily' && employee.dailyRate) {
      basePay = daysWorked * employee.dailyRate;
    } else if (employee.paymentType === 'Monthly' && employee.baseSalary) {
      basePay = employee.baseSalary;
    }
    
    const grossPay = basePay + approvedClaims;
    const age = calculateAge(employee.dateOfBirth);
    const cpf = calculateCPF(grossPay, employee.residencyStatus, age);
    
    result.baseSalary = basePay;
    result.grossPay = grossPay;
    result.employeeCPF = cpf.employeeCPF;
    result.employerCPF = cpf.employerCPF;
    result.totalPay = grossPay - cpf.employeeCPF;
    result.calculationMethod = 'legacy_rates';
    
    logger.info(`Legacy calculation complete: Net Pay = $${result.totalPay.toFixed(2)}`);
    return result;
  }
  
  // Step 2: Use DYNAMIC PRICING for November 2025+
  logger.debug('Using DYNAMIC PRICING calculation');
  
  try {
    // Get date range using utility
    const { start: startDateStr, end: endDateStr } = getDateRangeForPeriod(period);
    logger.debug(`Date range for ${period}: ${startDateStr} to ${endDateStr}`);
    
    // Step 3: Fetch approved slot bookings
    logger.debug('Fetching slot bookings...');
    const { data: bookings, error: bookingsError } = await supabase
      .from('slot_bookings_new')
      .select('id, employee_id, date, branch_name, status')
      .eq('employee_id', employee.id)
      .ilike('status', 'approved')
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .order('date', { ascending: true });
    
    if (bookingsError) {
      logger.error('Bookings fetch error:', bookingsError);
      result.errors.push(`Failed to fetch bookings: ${bookingsError.message}`);
      throw bookingsError;
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
      
      const grossPay = basePay + approvedClaims;
      const age = calculateAge(employee.dateOfBirth);
      const cpf = calculateCPF(grossPay, employee.residencyStatus, age);
      
      result.baseSalary = basePay;
      result.grossPay = grossPay;
      result.employeeCPF = cpf.employeeCPF;
      result.employerCPF = cpf.employerCPF;
      result.totalPay = grossPay - cpf.employeeCPF;
      
      return result;
    }
    
    logger.debug(`Found ${bookings.length} approved bookings`);
    
    // Step 4: Fetch attendance records
    logger.debug('Fetching attendance records...');
    const bookingDates = bookings.map(b => b.date);
    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from('attendance')
      .select('employee_id, date, status')
      .eq('employee_id', employee.id)
      .in('date', bookingDates)
      .in('status', ['Present', 'Late', 'present', 'late']);
    
    if (attendanceError) {
      logger.error('Attendance fetch error:', attendanceError);
      result.errors.push(`Failed to fetch attendance: ${attendanceError.message}`);
      throw attendanceError;
    }
    
    const attendanceMap = new Map(
      (attendanceRecords || []).map(a => [a.date, true])
    );
    
    logger.debug(`Found ${attendanceRecords?.length || 0} attendance records`);
    
    // Step 5: Calculate pay for each booking with attendance
    logger.debug('Calculating dynamic pricing...');
    let totalSlotPay = 0;
    let totalSlots = 0;
    
    for (const booking of bookings) {
      const hasAttendance = attendanceMap.has(booking.date);
      
      if (!hasAttendance) {
        logger.debug(`${booking.date}: No attendance - skipped`);
        continue;
      }
      
      // Calculate dynamic pricing for this slot
      const pay = await calculateSlotPay(
        booking.date,
        employee.qualifications,
        employee.joinDate
      );
      
      result.breakdown.push({
        date: booking.date,
        branchName: booking.branch_name || 'Unknown',
        pay
      });
      
      totalSlotPay += pay;
      totalSlots++;
      
      logger.debug(`${booking.date}: $${pay.toFixed(2)} (${booking.branch_name || 'Unknown'})`);
    }
    
    logger.info(`Total: ${totalSlots} slots = $${totalSlotPay.toFixed(2)}`);
    
    result.slotBookingPay = totalSlotPay;
    result.slotCount = totalSlots;
    
    // Step 6: Determine base pay - use slot pay if available, otherwise fall back to monthly salary
    let basePay = totalSlotPay;
    
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
    const grossPay = basePay + approvedClaims;
    const age = calculateAge(employee.dateOfBirth);
    const cpf = calculateCPF(grossPay, employee.residencyStatus, age);
    
    result.baseSalary = basePay;
    result.grossPay = grossPay;
    result.employeeCPF = cpf.employeeCPF;
    result.employerCPF = cpf.employerCPF;
    result.totalPay = grossPay - cpf.employeeCPF;
    
  } catch (error) {
    logger.error('Error in dynamic pricing calculation:', error);
    result.errors.push(`Dynamic pricing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    // Fall back to legacy if dynamic pricing fails
    let basePay = 0;
    if (employee.paymentType === 'Monthly' && employee.baseSalary) {
      basePay = employee.baseSalary;
    }
    
    const grossPay = basePay + approvedClaims;
    const age = calculateAge(employee.dateOfBirth);
    const cpf = calculateCPF(grossPay, employee.residencyStatus, age);
    
    result.baseSalary = basePay;
    result.grossPay = grossPay;
    result.employeeCPF = cpf.employeeCPF;
    result.employerCPF = cpf.employerCPF;
    result.totalPay = grossPay - cpf.employeeCPF;
    result.calculationMethod = 'legacy_rates';
  }
  
  logger.info(`Payroll complete - ${result.calculationMethod}: Net Pay $${result.totalPay.toFixed(2)}`);
  
  return result;
}
