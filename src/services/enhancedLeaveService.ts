
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

// Get all employees eligible for leave using direct query since RPC isn't typed yet
export const getEligibleEmployeesForLeave = async (): Promise<EligibleEmployee[]> => {
  try {
    // Use direct query instead of RPC until types are updated
    const { data, error } = await supabase
      .from('employees')
      .select('id, name, type, position, join_date, email, resign_date')
      .eq('type', 'Full-Time')
      .is('resign_date', null);
    
    if (error) {
      console.error('Error fetching eligible employees:', error);
      throw error;
    }

    // Filter out Senior Partners and map to expected format
    return (data || [])
      .filter(emp => emp.position !== 'Senior Partner')
      .map((emp: any) => ({
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

// Calculate leave entitlement manually until database function is available
export const calculateEmployeeLeaveEntitlement = async (
  employeeId: string,
  year: number = new Date().getFullYear()
): Promise<LeaveEntitlementCalculation> => {
  try {
    // Get employee data
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('type, position, join_date')
      .eq('id', employeeId)
      .single();

    if (empError || !employee) {
      console.error('Error fetching employee:', empError);
      return {
        annualLeaveBase: 0,
        mondayHolidayBonus: 0,
        totalAnnualLeave: 0,
        medicalLeave: 0
      };
    }

    // Check eligibility
    if (!isEligibleForLeave(employee)) {
      return {
        annualLeaveBase: 0,
        mondayHolidayBonus: 0,
        totalAnnualLeave: 0,
        medicalLeave: 0
      };
    }

    let baseAnnualLeave = 21;
    const medicalLeave = 14;

    // Calculate pro-rated leave if joined mid-year
    if (employee.join_date) {
      const joinDate = new Date(employee.join_date);
      if (joinDate.getFullYear() === year) {
        const monthsWorked = 12 - joinDate.getMonth();
        baseAnnualLeave = Math.round((baseAnnualLeave * monthsWorked) / 12);
      }
    }

    // Get Monday holiday bonuses
    const { data: bonuses } = await supabase
      .from('monday_holiday_leave_adjustments')
      .select(`
        bonus_days_granted,
        public_holidays!inner(year)
      `)
      .eq('employee_id', employeeId)
      .eq('public_holidays.year', year);

    const mondayHolidayBonus = bonuses?.reduce((sum, bonus) => sum + (bonus.bonus_days_granted || 0), 0) || 0;
    const totalAnnualLeave = baseAnnualLeave + mondayHolidayBonus;

    return {
      annualLeaveBase: baseAnnualLeave,
      mondayHolidayBonus,
      totalAnnualLeave,
      medicalLeave
    };
  } catch (error) {
    console.error('Error in calculateEmployeeLeaveEntitlement:', error);
    return {
      annualLeaveBase: 0,
      mondayHolidayBonus: 0,
      totalAnnualLeave: 0,
      medicalLeave: 0
    };
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
