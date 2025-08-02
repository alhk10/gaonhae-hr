
import { calculateCPF, calculateAge } from './cpfCalculations';
import { EmployeeProfile, PayrollEmployee, CasualEmployeePayroll } from '@/types/employee';

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
  dailyRate?: number;
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
    if (employee.paymentType === 'Hourly' && (!employee.hourlyRate || employee.hourlyRate <= 0)) {
      errors.push('Hourly rate must be greater than 0 for hourly casual employees');
    }
    if (employee.paymentType === 'Daily' && (!employee.dailyRate || employee.dailyRate <= 0)) {
      errors.push('Daily rate must be greater than 0 for daily casual employees');
    }
    if (employee.paymentType === 'Monthly' && (!employee.baseSalary || employee.baseSalary <= 0)) {
      errors.push('Monthly salary must be greater than 0 for monthly casual employees');
    }
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
  approvedClaims: number = 0
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
  let dailyRate = employee.dailyRate || employee.dailyWeekdayRate || 0;

  // Calculate base pay based on payment type and actual attendance
  if (paymentType === 'Hourly') {
    // For hourly employees, base salary should be calculated from actual attendance hours
    // This will be handled by the PayrollContext when fetching attendance data
    baseSalary = hourlyRate * hoursWorked;
    daysWorked = Math.ceil(hoursWorked / 8); // Estimate days from hours
    
    if (hoursWorked <= 0) {
      warnings.push('No hours worked recorded for hourly employee');
    }
  } else if (paymentType === 'Daily') {
    // For daily employees, base salary should be calculated from actual attendance days
    baseSalary = dailyRate * daysWorked;
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
    dailyRate,
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
