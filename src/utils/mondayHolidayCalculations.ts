
import { getMondayHolidayBonusDays } from '@/services/publicHolidayService';

// Calculate Monday holiday bonus days for an employee (now integrated with database functions)
export const calculateMondayHolidayBonus = async (employeeId: string, year?: number): Promise<number> => {
  try {
    console.log('MondayHolidayCalculations: Calculating bonus days for employee:', employeeId);
    
    // Use the existing service which queries the database
    const bonusDays = await getMondayHolidayBonusDays(employeeId);
    
    console.log(`MondayHolidayCalculations: Employee ${employeeId} has ${bonusDays} Monday holiday bonus days`);
    return bonusDays;
  } catch (error) {
    console.error('Error calculating Monday holiday bonus:', error);
    return 0;
  }
};

// Calculate total annual leave entitlement including Monday holiday bonuses
// Note: This is now handled by the database function, but kept for backward compatibility
export const calculateTotalAnnualLeaveWithBonus = async (
  baseAnnualLeave: number, 
  employeeId: string,
  year?: number
): Promise<number> => {
  try {
    const mondayBonus = await calculateMondayHolidayBonus(employeeId, year);
    const totalEntitlement = baseAnnualLeave + mondayBonus;
    
    console.log(`MondayHolidayCalculations: Total leave entitlement for ${employeeId}: ${baseAnnualLeave} base + ${mondayBonus} Monday bonus = ${totalEntitlement}`);
    
    return totalEntitlement;
  } catch (error) {
    console.error('Error calculating total annual leave with bonus:', error);
    return baseAnnualLeave;
  }
};

// Get Monday holiday bonus breakdown for display purposes
export const getMondayHolidayBreakdown = async (employeeId: string, year?: number): Promise<{
  totalBonusDays: number;
  holidayDetails: Array<{
    holidayName: string;
    date: string;
    bonusDays: number;
  }>;
}> => {
  try {
    // This would need to be implemented to get detailed breakdown
    // For now, just return the total
    const totalBonusDays = await calculateMondayHolidayBonus(employeeId, year);
    
    return {
      totalBonusDays,
      holidayDetails: [] // Could be expanded to show individual holidays
    };
  } catch (error) {
    console.error('Error getting Monday holiday breakdown:', error);
    return {
      totalBonusDays: 0,
      holidayDetails: []
    };
  }
};
