import { isEligibleForLeave } from '@/utils/employeeEligibility';
import { calculateLeaveBalance } from '@/utils/leaveCalculations';
import { getEmployeeById } from './employeeService';
import { logger } from '@/utils/logger';

export interface LeaveValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface LeaveRequestValidation {
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
}

export const validateLeaveRequest = async (
  request: LeaveRequestValidation
): Promise<LeaveValidationResult> => {
  const result: LeaveValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  try {
    // Get employee data
    const employee = await getEmployeeById(request.employeeId);
    
    if (!employee) {
      result.isValid = false;
      result.errors.push('Employee not found');
      return result;
    }

    // Check if employee is eligible for leave
    if (!isEligibleForLeave(employee)) {
      result.isValid = false;
      if (employee.type === 'Casual') {
        result.errors.push('Casual employees are not entitled to annual leave or medical leave benefits');
      } else if (employee.position === 'Senior Partner') {
        result.errors.push('Senior Partners have flexible leave arrangements and should not use this system');
      } else {
        result.errors.push('Employee is not eligible for leave');
      }
      return result;
    }

    // Check join date for Full-Time employees
    if (!employee.joinDate) {
      result.warnings.push('Employee has no join date on record - using full annual leave entitlement');
    }

    // Calculate current leave balance
    if (employee.joinDate) {
      const leaveBalance = await calculateLeaveBalance(
        employee.id,
        employee.joinDate,
        [], // We'll pass the actual leave requests from the calling function
        { type: employee.type, position: employee.position }
      );

      // Check if employee has sufficient leave balance
      if (request.leaveType === 'Annual Leave') {
        if (leaveBalance.annualLeave.remaining < request.days) {
          result.isValid = false;
          result.errors.push(
            `Insufficient annual leave balance. Available: ${leaveBalance.annualLeave.remaining} days, Requested: ${request.days} days`
          );
        }
      } else if (request.leaveType === 'Medical Leave') {
        if (leaveBalance.medicalLeave.remaining < request.days) {
          result.isValid = false;
          result.errors.push(
            `Insufficient medical leave balance. Available: ${leaveBalance.medicalLeave.remaining} days, Requested: ${request.days} days`
          );
        }
      }
    }

    // Validate date logic
    const startDate = new Date(request.startDate);
    const endDate = new Date(request.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      result.warnings.push('Leave start date is in the past');
    }

    if (endDate < startDate) {
      result.isValid = false;
      result.errors.push('Leave end date cannot be before start date');
    }

    // Calculate expected days
    const timeDiff = endDate.getTime() - startDate.getTime();
    const expectedDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    
    if (request.days !== expectedDays) {
      result.warnings.push(`Requested days (${request.days}) may not match date range (${expectedDays} days)`);
    }

    // Medical leave specific validations
    if (request.leaveType === 'Medical Leave') {
      result.warnings.push('Medical certificate may be required for medical leave');
    }

  } catch (error) {
    logger.error('Error validating leave request', error);
    result.isValid = false;
    result.errors.push('Error validating leave request. Please try again.');
  }

  return result;
};

export const validateBulkLeaveOperation = async (
  employeeIds: string[],
  operation: 'approve' | 'reject' | 'delete'
): Promise<{
  validEmployees: string[];
  invalidEmployees: { id: string; reason: string }[];
}> => {
  const validEmployees: string[] = [];
  const invalidEmployees: { id: string; reason: string }[] = [];

  for (const employeeId of employeeIds) {
    try {
      const employee = await getEmployeeById(employeeId);
      
      if (!employee) {
        invalidEmployees.push({ id: employeeId, reason: 'Employee not found' });
        continue;
      }

      if (operation === 'approve' && !isEligibleForLeave(employee)) {
        invalidEmployees.push({ 
          id: employeeId, 
          reason: `${employee.type} employees are not eligible for leave`
        });
        continue;
      }

      validEmployees.push(employeeId);
    } catch (error) {
      invalidEmployees.push({ id: employeeId, reason: 'Error validating employee' });
    }
  }

  return { validEmployees, invalidEmployees };
};
