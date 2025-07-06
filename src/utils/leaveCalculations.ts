import { supabase } from '@/integrations/supabase/client';
import { calculateMondayHolidayBonus, calculateTotalAnnualLeaveWithBonus } from './mondayHolidayCalculations';

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
  },
  year: number = new Date().getFullYear()
): Promise<number> => {
  // Calculate base annual leave (existing logic)
  const baseAnnualLeave = calculateBaseAnnualLeave(employee, year);
  
  // Add Monday holiday bonus days
  const totalWithBonus = await calculateTotalAnnualLeaveWithBonus(baseAnnualLeave, employee.id);
  
  console.log(`LeaveCalculations: Employee ${employee.id} - Base: ${baseAnnualLeave}, With Monday bonus: ${totalWithBonus}`);
  
  return totalWithBonus;
};

// Helper function for base annual leave calculation (without Monday bonuses)
const calculateBaseAnnualLeave = (
  employee: { 
    join_date: string | null; 
    resign_date: string | null; 
  },
  year: number = new Date().getFullYear()
): number => {
  const baseAnnualLeave = 21; // Standard annual leave days
  
  if (!employee.join_date) {
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

// Calculate Leave Balance
export const calculateLeaveBalance = async (
  employeeId: string,
  leaveRequests: any[],
  year: number = new Date().getFullYear()
): Promise<{
  entitlement: number;
  used: number;
  pending: number;
  balance: number;
  mondayHolidayBonus: number;
}> => {
  try {
    // Get employee data
    // This would need to be passed in or fetched - assuming it's available
    const employee = { id: employeeId, join_date: null, resign_date: null }; // Placeholder
    
    // Calculate total entitlement including Monday holiday bonuses
    const totalEntitlement = await calculateAnnualLeaveEntitlement(employee, year);
    const mondayBonus = await calculateMondayHolidayBonus(employeeId);
    const baseEntitlement = totalEntitlement - mondayBonus;
    
    // Calculate used and pending leave (existing logic)
    const currentYearRequests = leaveRequests.filter(request => {
      const requestYear = new Date(request.start_date).getFullYear();
      return requestYear === year;
    });
    
    const usedLeave = currentYearRequests
      .filter(request => request.status === 'Approved')
      .reduce((total, request) => total + request.days_requested, 0);
    
    const pendingLeave = currentYearRequests
      .filter(request => request.status === 'Pending')
      .reduce((total, request) => total + request.days_requested, 0);
    
    const balance = totalEntitlement - usedLeave - pendingLeave;
    
    console.log(`LeaveCalculations: Employee ${employeeId} balance - Total: ${totalEntitlement} (Base: ${baseEntitlement} + Monday: ${mondayBonus}), Used: ${usedLeave}, Pending: ${pendingLeave}, Balance: ${balance}`);
    
    return {
      entitlement: totalEntitlement,
      used: usedLeave,
      pending: pendingLeave,
      balance: balance,
      mondayHolidayBonus: mondayBonus
    };
  } catch (error) {
    console.error('Error calculating leave balance:', error);
    // Return fallback values
    return {
      entitlement: 21,
      used: 0,
      pending: 0,
      balance: 21,
      mondayHolidayBonus: 0
    };
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
