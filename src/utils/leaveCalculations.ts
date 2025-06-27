
// Utility functions for calculating annual leave entitlements

export interface LeaveEntitlement {
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
}

export const calculateAnnualLeaveEntitlement = (joinDate: string): number => {
  const today = new Date();
  const join = new Date(joinDate);
  
  // Calculate years of service (completed years)
  const yearsOfService = Math.floor((today.getTime() - join.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  
  // Base annual leave: 14 days + 1 day per year of service, max 18 days
  const baseLeave = 14;
  const additionalDays = Math.min(yearsOfService, 4); // Max 4 additional days
  const totalAnnualLeave = baseLeave + additionalDays;
  
  return totalAnnualLeave;
};

export const calculateProRatedLeave = (joinDate: string, totalEntitlement: number): number => {
  const today = new Date();
  const join = new Date(joinDate);
  const currentYear = today.getFullYear();
  const joinYear = join.getFullYear();
  
  // If joined in current year, pro-rate the leave
  if (joinYear === currentYear) {
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31);
    const totalDaysInYear = Math.ceil((endOfYear.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    const remainingDaysInYear = Math.ceil((endOfYear.getTime() - join.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    
    // Pro-rate based on remaining days in the year
    const proRatedLeave = Math.floor((totalEntitlement * remainingDaysInYear) / totalDaysInYear);
    return Math.max(1, proRatedLeave); // Minimum 1 day
  }
  
  // If joined in previous years, return full entitlement
  return totalEntitlement;
};

export const calculateLeaveBalance = (
  employeeId: string, 
  joinDate: string, 
  leaveHistory: any[]
): LeaveEntitlement => {
  const currentYear = new Date().getFullYear();
  
  // Calculate annual leave entitlement
  const annualLeaveEntitlement = calculateAnnualLeaveEntitlement(joinDate);
  const proRatedAnnualLeave = calculateProRatedLeave(joinDate, annualLeaveEntitlement);
  
  // Filter leave history for current year and approved leaves
  const thisYearLeaves = leaveHistory.filter(leave => 
    leave.employeeId === employeeId &&
    new Date(leave.startDate).getFullYear() === currentYear && 
    leave.status === 'Approved'
  );
  
  // Calculate used leave days
  const annualLeaveUsed = thisYearLeaves
    .filter(leave => leave.type === 'Annual Leave')
    .reduce((total, leave) => total + leave.days, 0);
  
  const medicalLeaveUsed = thisYearLeaves
    .filter(leave => leave.type === 'Medical Leave')
    .reduce((total, leave) => total + leave.days, 0);

  return {
    annualLeave: { 
      total: proRatedAnnualLeave, 
      used: annualLeaveUsed, 
      remaining: proRatedAnnualLeave - annualLeaveUsed 
    },
    medicalLeave: { 
      total: 14, // Medical leave remains fixed at 14 days
      used: medicalLeaveUsed, 
      remaining: 14 - medicalLeaveUsed 
    }
  };
};

export const getLeaveEntitlementSummary = (joinDate: string): string => {
  const today = new Date();
  const join = new Date(joinDate);
  const yearsOfService = Math.floor((today.getTime() - join.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  const entitlement = calculateAnnualLeaveEntitlement(joinDate);
  const proRated = calculateProRatedLeave(joinDate, entitlement);
  
  if (join.getFullYear() === today.getFullYear()) {
    return `${proRated} days (pro-rated for ${today.getFullYear()})`;
  }
  
  if (yearsOfService >= 4) {
    return `${entitlement} days (maximum reached after ${yearsOfService} years)`;
  }
  
  return `${entitlement} days (${yearsOfService} years of service)`;
};
