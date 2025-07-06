
import { supabase } from '@/integrations/supabase/client';
import { isEligibleForLeave } from './employeeEligibility';

// Interface for database function results
interface LeaveEntitlementResult {
  base_annual_leave: number;
  years_of_service: number;
  service_bonus_days: number;
  total_annual_leave: number;
  monday_holiday_bonus: number;
  final_annual_leave: number;
  medical_leave: number;
}

// Calculate total leave requests for a specific employee
export const calculateTotalLeaveRequests = async (employeeId: string): Promise<number> => {
  try {
    const { data: leaveRequests, error } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('employee_id', employeeId);

    if (error) {
      console.error('Error fetching leave requests:', error);
      return 0;
    }

    return leaveRequests.reduce((total, request) => total + request.days_requested, 0);
  } catch (error) {
    console.error('Error calculating total leave requests:', error);
    return 0;
  }
};

// Calculate Annual Leave Entitlement using database function
export const calculateAnnualLeaveEntitlement = async (
  employee: { 
    join_date: string | null; 
    resign_date: string | null; 
    id: string;
    type: string;
    position?: string;
  },
  year: number = new Date().getFullYear()
): Promise<number> => {
  // Check if employee is eligible for leave
  if (!isEligibleForLeave(employee)) {
    console.log(`LeaveCalculations: Employee ${employee.id} (${employee.type}${employee.position ? ', ' + employee.position : ''}) is not eligible for leave`);
    return 0;
  }

  try {
    // Use the database function to calculate entitlement
    const { data, error } = await supabase.rpc('calculate_annual_leave_entitlement', {
      employee_id: employee.id,
      reference_year: year
    });

    if (error) {
      console.error('Error calculating leave entitlement:', error);
      return 0;
    }

    if (data && data.length > 0) {
      const result = data[0] as LeaveEntitlementResult;
      console.log(`LeaveCalculations: Employee ${employee.id} - Base: ${result.base_annual_leave}, Years of service: ${result.years_of_service}, Service bonus: ${result.service_bonus_days}, Total: ${result.final_annual_leave}`);
      return result.final_annual_leave;
    }

    return 0;
  } catch (error) {
    console.error('Error in calculateAnnualLeaveEntitlement:', error);
    return 0;
  }
};

// Get detailed leave entitlement breakdown
export const getLeaveEntitlementDetails = async (
  employeeId: string,
  year: number = new Date().getFullYear()
): Promise<LeaveEntitlementResult | null> => {
  try {
    const { data, error } = await supabase.rpc('calculate_annual_leave_entitlement', {
      employee_id: employeeId,
      reference_year: year
    });

    if (error) {
      console.error('Error getting leave entitlement details:', error);
      return null;
    }

    if (data && data.length > 0) {
      return data[0] as LeaveEntitlementResult;
    }

    return null;
  } catch (error) {
    console.error('Error in getLeaveEntitlementDetails:', error);
    return null;
  }
};

// Calculate Leave Balance using database functions
export const calculateLeaveBalance = async (
  employeeId: string,
  joinDate: string,
  leaveRequests: any[],
  employee?: { type: string; position?: string },
  year: number = new Date().getFullYear()
): Promise<{
  annualLeave: {
    total: number;
    used: number;
    remaining: number;
    details?: LeaveEntitlementResult;
  };
  medicalLeave: {
    total: number;
    used: number;
    remaining: number;
  };
}> => {
  try {
    // If employee object is provided, check eligibility
    if (employee && !isEligibleForLeave(employee)) {
      console.log(`LeaveCalculations: Employee ${employeeId} is not eligible for leave`);
      return {
        annualLeave: { total: 0, used: 0, remaining: 0 },
        medicalLeave: { total: 0, used: 0, remaining: 0 }
      };
    }

    // Get detailed entitlement from database function
    const entitlementDetails = await getLeaveEntitlementDetails(employeeId, year);
    
    if (!entitlementDetails) {
      return {
        annualLeave: { total: 0, used: 0, remaining: 0 },
        medicalLeave: { total: 0, used: 0, remaining: 0 }
      };
    }

    // Calculate used leave from requests
    const currentYearRequests = leaveRequests.filter(request => {
      const requestYear = new Date(request.startDate || request.start_date).getFullYear();
      return requestYear === year;
    });
    
    const usedAnnualLeave = currentYearRequests
      .filter(request => request.status === 'Approved' && (request.type === 'Annual Leave'))
      .reduce((total, request) => total + (request.days || request.days_requested || 1), 0);
    
    const usedMedicalLeave = currentYearRequests
      .filter(request => request.status === 'Approved' && (request.type === 'Medical Leave'))
      .reduce((total, request) => total + (request.days || request.days_requested || 1), 0);
    
    const annualLeaveRemaining = entitlementDetails.final_annual_leave - usedAnnualLeave;
    const medicalLeaveRemaining = entitlementDetails.medical_leave - usedMedicalLeave;
    
    console.log(`LeaveCalculations: Employee ${employeeId} balance - Annual: ${entitlementDetails.final_annual_leave} (Base: ${entitlementDetails.base_annual_leave}, Service: ${entitlementDetails.service_bonus_days}, Monday bonus: ${entitlementDetails.monday_holiday_bonus}), Used: ${usedAnnualLeave}, Remaining: ${annualLeaveRemaining}`);
    
    return {
      annualLeave: {
        total: entitlementDetails.final_annual_leave,
        used: usedAnnualLeave,
        remaining: Math.max(0, annualLeaveRemaining),
        details: entitlementDetails
      },
      medicalLeave: {
        total: entitlementDetails.medical_leave,
        used: usedMedicalLeave,
        remaining: Math.max(0, medicalLeaveRemaining)
      }
    };
  } catch (error) {
    console.error('Error calculating leave balance:', error);
    return {
      annualLeave: { total: 0, used: 0, remaining: 0 },
      medicalLeave: { total: 0, used: 0, remaining: 0 }
    };
  }
};

// Get leave entitlement summary text with new policy
export const getLeaveEntitlementSummary = async (employeeId: string, joinDate: string): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const joinYear = new Date(joinDate).getFullYear();
  
  try {
    const entitlementDetails = await getLeaveEntitlementDetails(employeeId, currentYear);
    
    if (!entitlementDetails) {
      return "Unable to calculate leave entitlement. Please contact HR.";
    }

    const { base_annual_leave, years_of_service, service_bonus_days, monday_holiday_bonus, final_annual_leave } = entitlementDetails;
    
    let summary = `You are entitled to ${final_annual_leave} annual leave days for ${currentYear}. `;
    summary += `This includes ${base_annual_leave} base days`;
    
    if (years_of_service > 0) {
      summary += ` + ${service_bonus_days} service bonus days (${years_of_service} years of service)`;
    }
    
    if (monday_holiday_bonus > 0) {
      summary += ` + ${monday_holiday_bonus} Monday holiday bonus days`;
    }
    
    summary += ` + 14 medical leave days.`;
    
    if (joinYear === currentYear) {
      summary += ` (Pro-rated from your join date in ${new Date(joinDate).toLocaleDateString('en-GB', { month: 'long' })})`;
    }
    
    return summary;
  } catch (error) {
    console.error('Error getting leave entitlement summary:', error);
    return "Unable to calculate leave entitlement. Please contact HR.";
  }
};

// Function to get all leave requests for a specific employee
export const getLeaveRequests = async (employeeId: string) => {
  try {
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('employee_id', employeeId);

    if (error) {
      console.error('Error fetching leave requests:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    return [];
  }
};
