import { supabase } from '@/integrations/supabase/client';
import { EmployeeProfile } from '@/types/employee';
import { calculateSlotPay } from '@/utils/slotPayCalculation';
import { calculateCasualPayroll } from '@/utils/payrollCalculations';

/**
 * SIMPLIFIED CASUAL EMPLOYEE PAYROLL CALCULATION SERVICE
 * This service handles payroll calculation for casual employees,
 * automatically using dynamic pricing for November 2025 onwards
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

/**
 * Check if period is November 2025 or later
 */
function isNovember2025OrLater(period: string): boolean {
  console.log('[CasualPayrollCalc] Checking if period >= November 2025:', period);
  
  // Parse "November 2025" or "2025-11" format
  let year: number;
  let month: number; // 0-indexed
  
  if (period.includes(' ')) {
    // "November 2025" format
    const [monthName, yearStr] = period.split(' ');
    const monthMap: { [key: string]: number } = {
      January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
      July: 6, August: 7, September: 8, October: 9, November: 10, December: 11
    };
    month = monthMap[monthName];
    year = parseInt(yearStr);
  } else {
    // "2025-11" format
    const [yearStr, monthStr] = period.split('-');
    year = parseInt(yearStr);
    month = parseInt(monthStr) - 1; // Convert to 0-indexed
  }
  
  const periodDate = new Date(year, month, 1);
  const november2025 = new Date(2025, 10, 1); // November is month 10 (0-indexed)
  
  const result = periodDate >= november2025;
  console.log(`[CasualPayrollCalc] Period: ${period} -> ${year}-${month+1} -> ${result ? '✓ USE DYNAMIC PRICING' : '✗ USE LEGACY RATES'}`);
  
  return result;
}

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
  
  console.log('========================================');
  console.log('[CasualPayrollCalc] 🚀 CALCULATING PAYROLL');
  console.log('[CasualPayrollCalc] Employee:', employee.name, '(', employee.id, ')');
  console.log('[CasualPayrollCalc] Period:', period);
  console.log('[CasualPayrollCalc] Attendance: ', daysWorked, 'days,', hoursWorked, 'hours');
  console.log('========================================');
  
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
  
  // Check if we should use dynamic pricing (November 2025+)
  const useDynamicPricing = isNovember2025OrLater(period);
  result.calculationMethod = useDynamicPricing ? 'dynamic_pricing' : 'legacy_rates';
  
  if (useDynamicPricing) {
    console.log('[CasualPayrollCalc] ✅ Period >= November 2025: USING DYNAMIC PRICING');
    
    try {
      // Parse period to get date range
      let year: number;
      let monthIndex: number;
      
      if (period.includes(' ')) {
        const [monthName, yearStr] = period.split(' ');
        const monthMap: { [key: string]: number } = {
          January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
          July: 6, August: 7, September: 8, October: 9, November: 10, December: 11
        };
        monthIndex = monthMap[monthName];
        year = parseInt(yearStr);
      } else {
        const [yearStr, monthStr] = period.split('-');
        year = parseInt(yearStr);
        monthIndex = parseInt(monthStr) - 1;
      }
      
      const startDate = new Date(year, monthIndex, 1);
      const endDate = new Date(year, monthIndex + 1, 0);
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      console.log('[CasualPayrollCalc] Date range:', startDateStr, 'to', endDateStr);
      
      // Fetch approved slot bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from('slot_bookings_new')
        .select('id, employee_id, date, branch_name, status')
        .eq('employee_id', employee.id)
        .ilike('status', 'approved')
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .order('date', { ascending: true });
      
      if (bookingsError) {
        console.error('[CasualPayrollCalc] ❌ Error fetching bookings:', bookingsError);
        result.errors.push(`Failed to fetch bookings: ${bookingsError.message}`);
        // Fall back to legacy calculation
      } else if (!bookings || bookings.length === 0) {
        console.log('[CasualPayrollCalc] ⚠️ No approved bookings found');
        result.warnings.push('No slot bookings found for this period');
        // Fall back to legacy calculation
      } else {
        console.log(`[CasualPayrollCalc] ✓ Found ${bookings.length} approved bookings`);
        
        // Fetch attendance for booking dates
        const bookingDates = bookings.map(b => b.date);
        const { data: attendanceRecords, error: attendanceError } = await supabase
          .from('attendance')
          .select('employee_id, date, status, check_in')
          .eq('employee_id', employee.id)
          .in('date', bookingDates)
          .in('status', ['Present', 'Late', 'present', 'late']);
        
        if (attendanceError) {
          console.error('[CasualPayrollCalc] ❌ Error fetching attendance:', attendanceError);
          result.errors.push(`Failed to fetch attendance: ${attendanceError.message}`);
        } else {
          const attendanceMap = new Map(
            (attendanceRecords || []).map(a => [a.date, true])
          );
          
          console.log(`[CasualPayrollCalc] ✓ Found ${attendanceRecords?.length || 0} attendance records`);
          
          // Calculate pay for each booking with attendance
          let totalSlotPay = 0;
          let totalSlots = 0;
          
          for (const booking of bookings) {
            const hasAttendance = attendanceMap.has(booking.date);
            
            if (!hasAttendance) {
              console.log(`[CasualPayrollCalc] ⊗ Skipping ${booking.date} - no attendance`);
              continue;
            }
            
            // Calculate dynamic pricing
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
            
            console.log(`[CasualPayrollCalc] ✓ ${booking.date}: S$${pay.toFixed(2)}`);
          }
          
          result.slotBookingPay = totalSlotPay;
          result.slotCount = totalSlots;
          
          console.log('[CasualPayrollCalc] ============ DYNAMIC PRICING SUMMARY ============');
          console.log(`[CasualPayrollCalc] Total Slots with Attendance: ${totalSlots}`);
          console.log(`[CasualPayrollCalc] Total Slot Booking Pay: S$${totalSlotPay.toFixed(2)}`);
          console.log('[CasualPayrollCalc] ==============================================');
        }
      }
    } catch (error) {
      console.error('[CasualPayrollCalc] ❌ Error in dynamic pricing calculation:', error);
      result.errors.push(`Dynamic pricing calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    console.log('[CasualPayrollCalc] ✗ Period < November 2025: USING LEGACY RATES');
  }
  
  // Calculate final payroll using either dynamic pricing or legacy rates
  const payrollCalc = calculateCasualPayroll(
    employee,
    hoursWorked,
    daysWorked,
    approvedClaims,
    result.slotBookingPay || undefined
  );
  
  result.baseSalary = payrollCalc.baseSalary;
  result.totalPay = payrollCalc.netSalary;
  result.grossPay = payrollCalc.grossSalary;
  result.employeeCPF = payrollCalc.employeeCPF;
  result.employerCPF = payrollCalc.employerCPF;
  result.warnings.push(...payrollCalc.warnings);
  result.errors.push(...payrollCalc.errors);
  
  console.log('[CasualPayrollCalc] ========== FINAL PAYROLL ==========');
  console.log(`[CasualPayrollCalc] Method: ${result.calculationMethod.toUpperCase()}`);
  console.log(`[CasualPayrollCalc] Base Salary: S$${result.baseSalary.toFixed(2)}`);
  console.log(`[CasualPayrollCalc] Gross Pay: S$${result.grossPay.toFixed(2)}`);
  console.log(`[CasualPayrollCalc] Employee CPF: S$${result.employeeCPF.toFixed(2)}`);
  console.log(`[CasualPayrollCalc] Net Pay: S$${result.totalPay.toFixed(2)}`);
  console.log('[CasualPayrollCalc] ===================================');
  
  return result;
}
