
import { calculateCPF, calculateAge } from './cpfCalculations';
import { EmployeeProfile, PayrollEmployee, CasualEmployeePayroll } from '@/types/employee';
import { logger } from '@/utils/logger';

// Cutoff date for slot booking-based payroll (November 1, 2025)
export const SLOT_BOOKING_PAYROLL_START_DATE = new Date(2025, 10, 1);

/**
 * Checks if a payroll period falls on or after November 2025
 * @param period - Format: "November 2025" or "2025-11"
 */
export const isSlotBookingPayrollPeriod = (period: string): boolean => {
  logger.debug('[isSlotBookingPayrollPeriod] Checking period', { period });
  
  const monthMap: { [key: string]: number } = {
    January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
    July: 6, August: 7, September: 8, October: 9, November: 10, December: 11
  };

  // Handle "Month Year" format (e.g., "November 2025")
  if (period.includes(' ')) {
    const [monthName, yearStr] = period.split(' ');
    const monthIndex = monthMap[monthName];
    const year = parseInt(yearStr);
    
    if (monthIndex !== undefined && !isNaN(year)) {
      const periodDate = new Date(year, monthIndex, 1);
      const result = periodDate >= SLOT_BOOKING_PAYROLL_START_DATE;
      logger.debug('[isSlotBookingPayrollPeriod] result', { result });
      return result;
    }
  }
  
  // Handle "YYYY-MM" format
  const [yearStr, monthStr] = period.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr) - 1; // 0-indexed
  
  if (!isNaN(year) && !isNaN(month)) {
    const periodDate = new Date(year, month, 1);
    const result = periodDate >= SLOT_BOOKING_PAYROLL_START_DATE;
    logger.debug('[isSlotBookingPayrollPeriod] result', { result });
    return result;
  }
  
  logger.warn('[isSlotBookingPayrollPeriod] Could not parse period format', { period });
  return false;
};

export interface PayrollCalculationResult {
  baseSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  grossSalary: number;
  employeeCPF: number;
  employerCPF: number;
  totalCPF: number;
  approvedClaims: number;
  netSalary: number;
  encashmentAmount?: number;
  errors: string[];
  warnings: string[];
}

export interface CasualPayrollCalculationResult extends PayrollCalculationResult {
  hoursWorked: number;
  daysWorked: number;
  hourlyRate?: number;
  paymentType: string;
}

export const validateEmployeeForPayroll = (employee: EmployeeProfile): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!employee.name) errors.push('Employee name is required');
  if (!employee.id) errors.push('Employee ID is required');
  if (!employee.type) errors.push('Employee type is required');
  if (!employee.dateOfBirth) errors.push('Date of birth is required for CPF calculations');
  if (!employee.residencyStatus) errors.push('Residency status is required for CPF calculations');

  if (employee.type === 'Full-Time') {
    if (!employee.baseSalary || employee.baseSalary <= 0) {
      errors.push('Base salary must be greater than 0 for full-time employees');
    }
  } else if (employee.type === 'Casual') {
    // Casual employees use dynamic pricing from slot bookings - no rate validation needed
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const calculateFullTimePayroll = (
  employee: EmployeeProfile,
  approvedClaims: number = 0,
  encashmentAmount: number = 0
): PayrollCalculationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate employee
  const validation = validateEmployeeForPayroll(employee);
  if (!validation.isValid) {
    errors.push(...validation.errors);
  }

  const baseSalary = employee.baseSalary || 0;
  const totalAllowances = employee.allowances?.reduce((sum, a) => sum + (a.amount || 0), 0) || 0;
  const totalDeductions = employee.deductions?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
  
  // Calculate gross salary including encashment
  const grossSalary = baseSalary + totalAllowances + encashmentAmount;
  
  // CPF calculations
  let employeeCPF = 0;
  let employerCPF = 0;
  
  try {
    if (employee.dateOfBirth && employee.residencyStatus) {
      const age = calculateAge(employee.dateOfBirth);
      const cpfCalc = calculateCPF(grossSalary, employee.residencyStatus, age);
      employeeCPF = cpfCalc.employeeCPF;
      employerCPF = cpfCalc.employerCPF;
    } else {
      warnings.push('CPF not calculated due to missing date of birth or residency status');
    }
  } catch (error) {
    errors.push(`CPF calculation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  const totalCPF = employeeCPF + employerCPF;
  const netSalary = Math.max(0, grossSalary - employeeCPF - totalDeductions + approvedClaims);

  // Validation warnings
  if (netSalary < (baseSalary * 0.5)) {
    warnings.push('Net salary is less than 50% of base salary - please verify deductions');
  }
  
  if (totalDeductions > grossSalary) {
    warnings.push('Total deductions exceed gross salary');
  }

  return {
    baseSalary,
    totalAllowances,
    totalDeductions,
    grossSalary,
    employeeCPF,
    employerCPF,
    totalCPF,
    approvedClaims,
    netSalary,
    encashmentAmount,
    errors,
    warnings
  };
};

export const calculateCasualPayroll = (
  employee: EmployeeProfile,
  hoursWorked: number = 0,
  daysWorked: number = 0,
  approvedClaims: number = 0,
  slotBookingPay?: number
): CasualPayrollCalculationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate employee
  const validation = validateEmployeeForPayroll(employee);
  if (!validation.isValid) {
    errors.push(...validation.errors);
  }

  const paymentType = employee.paymentType || 'Monthly';
  let baseSalary = 0;
  let hourlyRate = employee.hourlyRate || 0;

  // If slot booking pay is provided (from dynamic pricing), use it as base salary
  if (slotBookingPay !== undefined && slotBookingPay > 0) {
    baseSalary = slotBookingPay;
    console.log(`[CasualPayroll] ✓ Using slot booking dynamic pricing: ${employee.name} = S$${baseSalary}`);
    warnings.push(`Pay calculated using slot booking + dynamic pricing (November 2025+)`);
  } else {
    // Calculate base pay based on payment type and actual attendance (legacy method)
    console.log(`[CasualPayroll] Using legacy rates for ${employee.name} (${slotBookingPay === 0 ? 'no bookings/attendance' : 'pre-November 2025'})`);
    if (paymentType === 'Hourly') {
      // For hourly employees, base salary should be calculated from actual attendance hours
      // This will be handled by the PayrollContext when fetching attendance data
      baseSalary = hourlyRate * hoursWorked;
      daysWorked = Math.ceil(hoursWorked / 8); // Estimate days from hours
      
      if (hoursWorked <= 0) {
        warnings.push('No hours worked recorded for hourly employee');
      }
    } else if (paymentType === 'Daily') {
      // Daily employees now use dynamic pricing, so calculate from base salary or use 0
      baseSalary = employee.baseSalary || 0;
      hoursWorked = daysWorked * 8; // Estimate hours from days
      
      if (daysWorked <= 0) {
        warnings.push('No days worked recorded for daily employee');
      }
    } else {
      // Monthly employees use fixed base salary regardless of attendance
      baseSalary = employee.baseSalary || 0;
      // For monthly employees, use standard working days/hours if not provided
      if (daysWorked === 0) daysWorked = 22;
      if (hoursWorked === 0) hoursWorked = daysWorked * 8;
    }
  }

  const totalAllowances = employee.allowances?.reduce((sum, a) => sum + (a.amount || 0), 0) || 0;
  const totalDeductions = employee.deductions?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
  const grossSalary = baseSalary + totalAllowances;

  // CPF calculations
  let employeeCPF = 0;
  let employerCPF = 0;
  
  // Debug logging for Ng Kai Rui Jovious
  if (employee.name === 'Ng Kai Rui Jovious') {
    console.log('🔍 CPF Debug - Before CPF Calculation:', {
      grossSalary,
      dateOfBirth: employee.dateOfBirth,
      residencyStatus: employee.residencyStatus,
      hasDateOfBirth: !!employee.dateOfBirth,
      hasResidencyStatus: !!employee.residencyStatus
    });
  }
  
  try {
    if (employee.dateOfBirth && employee.residencyStatus) {
      const age = calculateAge(employee.dateOfBirth);
      const cpfCalc = calculateCPF(grossSalary, employee.residencyStatus, age);
      employeeCPF = cpfCalc.employeeCPF;
      employerCPF = cpfCalc.employerCPF;
      
      // Debug logging for Ng Kai Rui Jovious
      if (employee.name === 'Ng Kai Rui Jovious') {
        console.log('🔍 CPF Debug - CPF Calculation Result:', {
          age,
          grossSalary,
          residencyStatus: employee.residencyStatus,
          cpfCalc,
          employeeCPF,
          employerCPF
        });
      }
    } else {
      warnings.push('CPF not calculated due to missing date of birth or residency status');
      if (employee.name === 'Ng Kai Rui Jovious') {
        console.log('❌ CPF Debug - Missing required data:', {
          dateOfBirth: employee.dateOfBirth,
          residencyStatus: employee.residencyStatus
        });
      }
    }
  } catch (error) {
    errors.push(`CPF calculation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    if (employee.name === 'Ng Kai Rui Jovious') {
      console.log('❌ CPF Debug - Calculation Error:', error);
    }
  }

  const totalCPF = employeeCPF + employerCPF;
  const netSalary = Math.max(0, grossSalary - employeeCPF - totalDeductions + approvedClaims);

  // Debug logging for final result for Ng Kai Rui Jovious
  if (employee.name === 'Ng Kai Rui Jovious') {
    console.log('🔍 CPF Debug - Final Calculation Result:', {
      baseSalary,
      totalAllowances,
      totalDeductions,
      grossSalary,
      employeeCPF,
      employerCPF,
      totalCPF: employeeCPF + employerCPF,
      netSalary,
      errors,
      warnings
    });
  }

  // Validation warnings
  if (paymentType === 'Hourly' && hoursWorked > 60) {
    warnings.push('Hours worked exceeds 60 hours - please verify');
  }
  
  if (paymentType === 'Daily' && daysWorked > 31) {
    warnings.push('Days worked exceeds 31 days - please verify');
  }

  return {
    baseSalary,
    totalAllowances,
    totalDeductions,
    grossSalary,
    employeeCPF,
    employerCPF,
    totalCPF,
    approvedClaims,
    netSalary,
    hoursWorked,
    daysWorked,
    hourlyRate,
    paymentType,
    errors,
    warnings
  };
};

export const formatCurrency = (amount: number): string => {
  return `S$${amount.toLocaleString('en-SG', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

export const roundToTwoDecimals = (amount: number): number => {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
};
