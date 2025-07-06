
import { supabase } from '@/integrations/supabase/client';
import { calculateMondayHolidayBonus, calculateTotalAnnualLeaveWithBonus } from './mondayHolidayCalculations';
import { isEligibleForLeave } from './employeeEligibility';

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

// Calculate Annual Leave Entitlement based on join date and resign date
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

  // Calculate base annual leave (existing logic)
  const baseAnnualLeave = calculateBaseAnnualLeave(employee, year);
  
  // Add Monday holiday bonus days only for eligible employees
  const totalWithBonus = await calculateTotalAnnualLeaveWithBonus(baseAnnualLeave, employee.id);
  
  console.log(`LeaveCalculations: Employee ${employee.id} - Base: ${baseAnnualLeave}, With Monday bonus: ${totalWithBonus}`);
  
  return totalWithBonus;
};

// Helper function for base annual leave calculation (without Monday bonuses)
const calculateBaseAnnualLeave = (
  employee: { 
    join_date: string | null; 
    resign_date: string | null;
    type: string;
    position?: string;
  },
  year: number = new Date().getFullYear()
): number => {
  // Return 0 for ineligible employees
  if (!isEligibleForLeave(employee)) {
    return 0;
  }

  const baseAnnualLeave = 21; // Standard annual leave days
  
  if (!employee.join_date) {
    console.log(`LeaveCalculations: Employee has no join date, using full entitlement`);
    return baseAnnualLeave;
  }

  const joinDate = new Date(employee.join_date);
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  
  // If employee joined before this year, they get full entitlement
  if (joinDate.getFullYear() < year) {
    // Check if they resigned during the year
    if (employee.resign_date) {
      const resignDate = new Date(employee.resign_date);
      if (resignDate.getFullYear() === year) {
        // Pro-rate based on resignation date
        const monthsWorked = resignDate.getMonth() + 1;
        return Math.round((baseAnnualLeave * monthsWorked) / 12);
      }
    }
    return baseAnnualLeave;
  }
  
  // If employee joined during this year, pro-rate the entitlement
  if (joinDate.getFullYear() === year) {
    const monthsInYear = 12;
    const monthsWorked = monthsInYear - joinDate.getMonth();
    
    // If they also resigned in the same year
    if (employee.resign_date) {
      const resignDate = new Date(employee.resign_date);
      if (resignDate.getFullYear() === year) {
        const actualMonthsWorked = resignDate.getMonth() - joinDate.getMonth() + 1;
        return Math.round((baseAnnualLeave * actualMonthsWorked) / 12);
      }
    }
    
    return Math.round((baseAnnualLeave * monthsWorked) / 12);
  }
  
  return 0; // Employee hasn't joined yet
};

// Calculate Leave Balance - Updated to handle employee eligibility
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

    // Get employee data if not provided
    let employeeData = employee;
    if (!employeeData) {
      const { data: empData } = await supabase
        .from('employees')
        .select('type, position')
        .eq('id', employeeId)
        .single();
      
      if (empData && !isEligibleForLeave(empData)) {
        return {
          annualLeave: { total: 0, used: 0, remaining: 0 },
          medicalLeave: { total: 0, used: 0, remaining: 0 }
        };
      }
    }
    
    // Create employee object for calculations
    const employeeForCalc = { 
      id: employeeId, 
      join_date: joinDate, 
      resign_date: null,
      type: employeeData?.type || 'Full-Time',
      position: employeeData?.position
    };
    
    // Calculate total entitlement including Monday holiday bonuses
    const totalAnnualEntitlement = await calculateAnnualLeaveEntitlement(employeeForCalc, year);
    const mondayBonus = await calculateMondayHolidayBonus(employeeId);
    
    // Calculate used and pending leave (existing logic)
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
    
    const annualLeaveRemaining = totalAnnualEntitlement - usedAnnualLeave;
    const medicalLeaveTotal = isEligibleForLeave(employeeForCalc) ? 14 : 0; // Standard 14 days medical leave for eligible employees
    const medicalLeaveRemaining = medicalLeaveTotal - usedMedicalLeave;
    
    console.log(`LeaveCalculations: Employee ${employeeId} balance - Annual: ${totalAnnualEntitlement} (includes ${mondayBonus} Monday bonus), Used: ${usedAnnualLeave}, Remaining: ${annualLeaveRemaining}`);
    
    return {
      annualLeave: {
        total: totalAnnualEntitlement,
        used: usedAnnualLeave,
        remaining: Math.max(0, annualLeaveRemaining)
      },
      medicalLeave: {
        total: medicalLeaveTotal,
        used: usedMedicalLeave,
        remaining: Math.max(0, medicalLeaveRemaining)
      }
    };
  } catch (error) {
    console.error('Error calculating leave balance:', error);
    // Return zero values for error cases
    return {
      annualLeave: { total: 0, used: 0, remaining: 0 },
      medicalLeave: { total: 0, used: 0, remaining: 0 }
    };
  }
};

// Get leave entitlement summary text
export const getLeaveEntitlementSummary = (joinDate: string): string => {
  const currentYear = new Date().getFullYear();
  const joinYear = new Date(joinDate).getFullYear();
  const joinMonth = new Date(joinDate).getMonth() + 1;
  
  if (joinYear < currentYear) {
    return `You are entitled to 21 annual leave days for ${currentYear} (full year entitlement) plus any Monday holiday bonuses.`;
  } else if (joinYear === currentYear) {
    const monthsWorked = 12 - new Date(joinDate).getMonth();
    const proRatedDays = Math.round((21 * monthsWorked) / 12);
    return `You are entitled to ${proRatedDays} annual leave days for ${currentYear} (pro-rated from ${new Date(joinDate).toLocaleDateString('en-GB', { month: 'long' })}) plus any Monday holiday bonuses.`;
  } else {
    return `You will be entitled to annual leave starting from your join date.`;
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
