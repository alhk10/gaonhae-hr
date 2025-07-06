
import { supabase } from '@/integrations/supabase/client';
import { isEligibleForLeave } from '@/utils/employeeEligibility';

export interface LeaveEntitlementCalculation {
  annualLeaveBase: number;
  mondayHolidayBonus: number;
  totalAnnualLeave: number;
  medicalLeave: number;
}

export interface EligibleEmployee {
  id: string;
  name: string;
  type: string;
  position: string | null;
  joinDate: string | null;
  email: string | null;
}

// Get all employees eligible for leave using the database function
export const getEligibleEmployeesForLeave = async (): Promise<EligibleEmployee[]> => {
  try {
    const { data, error } = await supabase.rpc('get_eligible_employees_for_leave');
    
    if (error) {
      console.error('Error fetching eligible employees:', error);
      throw error;
    }

    return (data || []).map((emp: any) => ({
      id: emp.id,
      name: emp.name,
      type: emp.type,
      position: emp.position,
      joinDate: emp.join_date,
      email: emp.email
    }));
  } catch (error) {
    console.error('Error in getEligibleEmployeesForLeave:', error);
    throw error;
  }
};

// Calculate leave entitlement using the database function
export const calculateEmployeeLeaveEntitlement = async (
  employeeId: string,
  year: number = new Date().getFullYear()
): Promise<LeaveEntitlementCalculation> => {
  try {
    const { data, error } = await supabase.rpc('calculate_employee_leave_entitlement', {
      p_employee_id: employeeId,
      p_year: year
    });

    if (error) {
      console.error('Error calculating leave entitlement:', error);
      throw error;
    }

    const result = data?.[0];
    if (!result) {
      return {
        annualLeaveBase: 0,
        mondayHolidayBonus: 0,
        totalAnnualLeave: 0,
        medicalLeave: 0
      };
    }

    return {
      annualLeaveBase: result.annual_leave_base || 0,
      mondayHolidayBonus: result.monday_holiday_bonus || 0,
      totalAnnualLeave: result.total_annual_leave || 0,
      medicalLeave: result.medical_leave || 0
    };
  } catch (error) {
    console.error('Error in calculateEmployeeLeaveEntitlement:', error);
    throw error;
  }
};

// Enhanced leave application with database validation
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
    // The database triggers will automatically validate eligibility
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
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error applying for leave:', error);
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
    console.error('Error cleaning up ineligible leave data:', error);
    throw error;
  }
};
