import { supabase } from '@/integrations/supabase/client';
import { EmployeeProfile } from '@/types/employee';
import { calculateSlotPay } from '@/utils/slotPayCalculation';
import { calculateCPF, calculateAge } from '@/utils/cpfCalculations';

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

/**
 * Check if period is November 2025 or later
 */
function isNovember2025OrLater(period: string): boolean {
  try {
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║  [isNovember2025OrLater] Checking period...    ║');
    console.log('║  Input period:', period.padEnd(31), '║');
    console.log('╚══════════════════════════════════════════════════╝');
    
    let year: number;
    let month: number;
    
    if (period.includes(' ')) {
      // "November 2025" format
      const [monthName, yearStr] = period.split(' ');
      const monthMap: { [key: string]: number } = {
        January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
        July: 6, August: 7, September: 8, October: 9, November: 10, December: 11
      };
      month = monthMap[monthName];
      year = parseInt(yearStr);
      console.log(`  📅 Parsed: ${monthName} ${yearStr} → Month ${month + 1}, Year ${year}`);
    } else {
      // "2025-11" format
      const [yearStr, monthStr] = period.split('-');
      year = parseInt(yearStr);
      month = parseInt(monthStr) - 1;
      console.log(`  📅 Parsed: ${yearStr}-${monthStr} → Month ${month + 1}, Year ${year}`);
    }
    
    const periodDate = new Date(year, month, 1);
    const november2025 = new Date(2025, 10, 1);
    
    const result = periodDate >= november2025;
    console.log(`  🔍 Comparison: ${periodDate.toISOString()} >= ${november2025.toISOString()}`);
    console.log(`  ✅ Result: ${result ? '✓ USE DYNAMIC PRICING' : '✗ USE LEGACY RATES'}`);
    console.log('');
    
    return result;
  } catch (error) {
    console.error('  ❌ Error parsing period:', error);
    return false;
  }
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
  
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  🚀 CASUAL PAYROLL CALCULATION - START                   ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log('║  Employee:', employee.name.padEnd(40), '║');
  console.log('║  ID:', employee.id.padEnd(48), '║');
  console.log('║  Period:', period.padEnd(46), '║');
  console.log('║  Attendance:', `${daysWorked} days, ${hoursWorked} hours`.padEnd(37), '║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  
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
    console.log('⏮️  Using LEGACY RATES calculation');
    console.log('');
    
    // Use legacy calculation
    let basePay = 0;
    
    if (employee.paymentType === 'Hourly' && employee.hourlyRate) {
      basePay = hoursWorked * employee.hourlyRate;
      console.log(`  💰 Hourly: ${hoursWorked} hrs × $${employee.hourlyRate}/hr = $${basePay.toFixed(2)}`);
    } else if (employee.paymentType === 'Daily' && employee.dailyRate) {
      basePay = daysWorked * employee.dailyRate;
      console.log(`  💰 Daily: ${daysWorked} days × $${employee.dailyRate}/day = $${basePay.toFixed(2)}`);
    } else if (employee.paymentType === 'Monthly' && employee.baseSalary) {
      basePay = employee.baseSalary;
      console.log(`  💰 Monthly: $${basePay.toFixed(2)}`);
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
    
    console.log(`  ✅ Legacy calculation complete: Net Pay = $${result.totalPay.toFixed(2)}`);
    console.log('');
    return result;
  }
  
  // Step 2: Use DYNAMIC PRICING for November 2025+
  console.log('⚡ Using DYNAMIC PRICING calculation');
  console.log('');
  
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
    
    console.log(`  📅 Date range: ${startDateStr} to ${endDateStr}`);
    console.log('');
    
    // Step 3: Fetch approved slot bookings
    console.log('  📡 Fetching slot bookings...');
    const { data: bookings, error: bookingsError } = await supabase
      .from('slot_bookings_new')
      .select('id, employee_id, date, branch_name, status')
      .eq('employee_id', employee.id)
      .ilike('status', 'approved')
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .order('date', { ascending: true });
    
    if (bookingsError) {
      console.error('  ❌ Bookings fetch error:', bookingsError);
      result.errors.push(`Failed to fetch bookings: ${bookingsError.message}`);
      throw bookingsError;
    }
    
    if (!bookings || bookings.length === 0) {
      console.log('  ⚠️  No approved bookings found - falling back to legacy rates');
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
    
    console.log(`  ✅ Found ${bookings.length} approved bookings`);
    console.log('');
    
    // Step 4: Fetch attendance records
    console.log('  📡 Fetching attendance records...');
    const bookingDates = bookings.map(b => b.date);
    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from('attendance')
      .select('employee_id, date, status')
      .eq('employee_id', employee.id)
      .in('date', bookingDates)
      .in('status', ['Present', 'Late', 'present', 'late']);
    
    if (attendanceError) {
      console.error('  ❌ Attendance fetch error:', attendanceError);
      result.errors.push(`Failed to fetch attendance: ${attendanceError.message}`);
      throw attendanceError;
    }
    
    const attendanceMap = new Map(
      (attendanceRecords || []).map(a => [a.date, true])
    );
    
    console.log(`  ✅ Found ${attendanceRecords?.length || 0} attendance records`);
    console.log('');
    
    // Step 5: Calculate pay for each booking with attendance
    console.log('  💰 Calculating dynamic pricing...');
    console.log('');
    let totalSlotPay = 0;
    let totalSlots = 0;
    
    for (const booking of bookings) {
      const hasAttendance = attendanceMap.has(booking.date);
      
      if (!hasAttendance) {
        console.log(`    ⊗ ${booking.date}: No attendance - SKIP`);
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
      
      console.log(`    ✅ ${booking.date}: $${pay.toFixed(2)} (${booking.branch_name || 'Unknown'})`);
    }
    
    console.log('');
    console.log(`  📊 Total: ${totalSlots} slots × dynamic pricing = $${totalSlotPay.toFixed(2)}`);
    console.log('');
    
    result.slotBookingPay = totalSlotPay;
    result.slotCount = totalSlots;
    result.calculationMethod = 'dynamic_pricing';
    
    // Step 6: Calculate final payroll with CPF
    const grossPay = totalSlotPay + approvedClaims;
    const age = calculateAge(employee.dateOfBirth);
    const cpf = calculateCPF(grossPay, employee.residencyStatus, age);
    
    result.baseSalary = totalSlotPay;
    result.grossPay = grossPay;
    result.employeeCPF = cpf.employeeCPF;
    result.employerCPF = cpf.employerCPF;
    result.totalPay = grossPay - cpf.employeeCPF;
    
  } catch (error) {
    console.error('  ❌ Error in dynamic pricing calculation:', error);
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
  
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  ✅ CASUAL PAYROLL CALCULATION - COMPLETE                ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log('║  Method:', result.calculationMethod.padEnd(45), '║');
  console.log('║  Base Salary:', `$${result.baseSalary.toFixed(2)}`.padEnd(40), '║');
  console.log('║  Gross Pay:', `$${result.grossPay.toFixed(2)}`.padEnd(42), '║');
  console.log('║  Employee CPF:', `$${result.employeeCPF.toFixed(2)}`.padEnd(39), '║');
  console.log('║  Net Pay:', `$${result.totalPay.toFixed(2)}`.padEnd(44), '║');
  if (result.calculationMethod === 'dynamic_pricing') {
    console.log('║  Slots with Attendance:', result.slotCount.toString().padEnd(30), '║');
    console.log('║  Slot Booking Pay:', `$${result.slotBookingPay.toFixed(2)}`.padEnd(35), '║');
  }
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  
  return result;
}
