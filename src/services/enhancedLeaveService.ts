import { supabase } from '@/integrations/supabase/client';
import { isEligibleForLeave } from '@/utils/employeeEligibility';
import { logger } from '@/utils/logger';

export interface LeaveEntitlementCalculation {
  baseAnnualLeave: number;
  yearsOfService: number;
  serviceBonusDays: number;
  totalAnnualLeave: number;
  mondayHolidayBonus: number;
  finalAnnualLeave: number;
  medicalLeave: number;
}

export interface EligibleEmployee {
  id: string;
  name: string;
  display_name?: string;
  type: string;
  position: string | null;
  joinDate: string | null;
  email: string | null;
  yearsOfService?: number;
  leaveEntitlement?: LeaveEntitlementCalculation;
}

// Get all employees eligible for leave using database function
export const getEligibleEmployeesForLeave = async (year?: number): Promise<EligibleEmployee[]> => {
  try {
    const referenceYear = year || new Date().getFullYear();
    
    // Use the database function to get eligible employees with entitlements
    const { data, error } = await supabase.rpc('get_eligible_employees_with_entitlements', {
      reference_year: referenceYear
    });
    
    if (error) {
      logger.error('Error fetching eligible employees with entitlements', error);
      throw error;
    }
    
    logger.debug(`Fetched ${data?.length || 0} eligible employees`, { year: referenceYear });

    return (data || []).map((emp: any) => ({
      id: emp.employee_id,
      name: emp.employee_name,
      type: emp.employee_type,
      position: emp.employee_position,
      joinDate: emp.join_date,
      email: emp.email,
      yearsOfService: emp.years_of_service,
      leaveEntitlement: {
        baseAnnualLeave: emp.base_annual_leave,
        yearsOfService: emp.years_of_service,
        serviceBonusDays: emp.service_bonus_days,
        totalAnnualLeave: emp.total_annual_leave,
        mondayHolidayBonus: emp.monday_holiday_bonus,
        finalAnnualLeave: emp.final_annual_leave,
        medicalLeave: emp.medical_leave
      }
    }));
  } catch (error) {
    logger.error('Error in getEligibleEmployeesForLeave', error);
    throw error;
  }
};

// Calculate leave entitlement using database function
export const calculateEmployeeLeaveEntitlement = async (
  employeeId: string,
  year: number = new Date().getFullYear()
): Promise<LeaveEntitlementCalculation> => {
  try {
    // Use the database function to calculate entitlement
    const { data, error } = await supabase.rpc('calculate_annual_leave_entitlement', {
      employee_id: employeeId,
      reference_year: year
    });

    if (error) {
      logger.error('Error calculating employee leave entitlement', error);
      return {
        baseAnnualLeave: 0,
        yearsOfService: 0,
        serviceBonusDays: 0,
        totalAnnualLeave: 0,
        mondayHolidayBonus: 0,
        finalAnnualLeave: 0,
        medicalLeave: 0
      };
    }

    if (data && data.length > 0) {
      const result = data[0];
      return {
        baseAnnualLeave: result.base_annual_leave,
        yearsOfService: result.years_of_service,
        serviceBonusDays: result.service_bonus_days,
        totalAnnualLeave: result.total_annual_leave,
        mondayHolidayBonus: result.monday_holiday_bonus,
        finalAnnualLeave: result.final_annual_leave,
        medicalLeave: result.medical_leave
      };
    }

    return {
      baseAnnualLeave: 0,
      yearsOfService: 0,
      serviceBonusDays: 0,
      totalAnnualLeave: 0,
      mondayHolidayBonus: 0,
      finalAnnualLeave: 0,
      medicalLeave: 0
    };
  } catch (error) {
    logger.error('Error in calculateEmployeeLeaveEntitlement', error);
    return {
      baseAnnualLeave: 0,
      yearsOfService: 0,
      serviceBonusDays: 0,
      totalAnnualLeave: 0,
      mondayHolidayBonus: 0,
      finalAnnualLeave: 0,
      medicalLeave: 0
    };
  }
};

// Enhanced leave application with database validation (triggers will handle validation)
export const applyForLeaveWithValidation = async (leaveData: {
  employeeId: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  medicalCertificate?: string;
}) => {
  try {
    // The database triggers will automatically validate eligibility and entitlements
    const { data, error } = await supabase
      .from('leave_requests')
      .insert({
        employee_id: leaveData.employeeId,
        type: leaveData.type,
        start_date: leaveData.startDate,
        end_date: leaveData.endDate,
        days_requested: leaveData.days,
        reason: leaveData.reason,
        medical_certificate: leaveData.medicalCertificate,
        status: 'Pending',
        applied_date: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      // Check if it's an eligibility error from our trigger
      if (error.message.includes('not eligible for leave requests')) {
        throw new Error('You are not eligible to apply for leave. Only Full-Time employees (excluding Senior Partners) can apply for leave.');
      }
      if (error.message.includes('exceeds annual leave entitlement') || error.message.includes('exceeds medical leave entitlement')) {
        throw new Error(error.message);
      }
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Error applying for leave', error);
    throw error;
  }
};

// Clean up ineligible leave data (admin function)
export const cleanupIneligibleLeaveData = async (): Promise<{
  deletedLeaveRequests: number;
  deletedMondayBonuses: number;
}> => {
  try {
    // Get ineligible employees
    const { data: employees } = await supabase
      .from('employees')
      .select('id, type, position')
      .or('type.neq.Full-Time,position.eq.Senior Partner');

    if (!employees || employees.length === 0) {
      return { deletedLeaveRequests: 0, deletedMondayBonuses: 0 };
    }

    const ineligibleIds = employees
      .filter(emp => !isEligibleForLeave(emp))
      .map(emp => emp.id);

    if (ineligibleIds.length === 0) {
      return { deletedLeaveRequests: 0, deletedMondayBonuses: 0 };
    }

    // Delete leave requests from ineligible employees
    const { data: deletedLeaves } = await supabase
      .from('leave_requests')
      .delete()
      .in('employee_id', ineligibleIds)
      .select('id');

    // Delete Monday holiday bonuses from ineligible employees
    const { data: deletedBonuses } = await supabase
      .from('monday_holiday_leave_adjustments')
      .delete()
      .in('employee_id', ineligibleIds)
      .select('id');

    return {
      deletedLeaveRequests: deletedLeaves?.length || 0,
      deletedMondayBonuses: deletedBonuses?.length || 0
    };
  } catch (error) {
    logger.error('Error cleaning up ineligible leave data', error);
    throw error;
  }
};

// Get years of service for an employee
export const calculateYearsOfService = async (employeeId: string): Promise<number> => {
  try {
    const { data: employee } = await supabase
      .from('employees')
      .select('join_date')
      .eq('id', employeeId)
      .single();

    if (!employee?.join_date) {
      return 0;
    }

    // Use the database function to calculate years of service
    const { data, error } = await supabase.rpc('calculate_years_of_service', {
      join_date: employee.join_date
    });

    if (error) {
      logger.error('Error calculating years of service', error);
      return 0;
    }

    return data || 0;
  } catch (error) {
    logger.error('Error in calculateYearsOfService', error);
    return 0;
  }
};
