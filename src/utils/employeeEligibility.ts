
// Utility functions for employee leave eligibility
export const isEligibleForLeave = (employee: { type: string; position?: string }): boolean => {
  // Only Full-Time employees are eligible, excluding Senior Partners
  return employee.type === 'Full-Time' && employee.position !== 'Senior Partner';
};

export const isEligibleForMondayHolidayBonus = (employee: { type: string; position?: string }): boolean => {
  // Same eligibility as regular leave
  return isEligibleForLeave(employee);
};

export const getEmployeeEligibilityMessage = (employee: { type: string; position?: string }): string => {
  if (employee.position === 'Senior Partner') {
    return 'Senior Partners have flexible leave arrangements and do not need to apply through the system.';
  }
  
  if (employee.type === 'Casual') {
    return 'Casual employees are not entitled to annual leave or medical leave benefits.';
  }
  
  if (employee.type === 'Full-Time') {
    return 'You are eligible for annual leave and medical leave benefits.';
  }
  
  return 'Please contact HR for leave policy clarification.';
};
