
import { getMondayHolidayBonusDays } from '@/services/publicHolidayService';

// Calculate Monday holiday bonus days for an employee
export const calculateMondayHolidayBonus = async (employeeId: string): Promise<number> => {
  try {
    console.log('MondayHolidayCalculations: Calculating bonus days for employee:', employeeId);
    
    const bonusDays = await getMondayHolidayBonusDays(employeeId);
    
    console.log(`MondayHolidayCalculations: Employee ${employeeId} has ${bonusDays} Monday holiday bonus days`);
    return bonusDays;
  } catch (error) {
    console.error('Error calculating Monday holiday bonus:', error);
    return 0;
  }
};

// Calculate total annual leave entitlement including Monday holiday bonuses
export const calculateTotalAnnualLeaveWithBonus = async (
  baseAnnualLeave: number, 
  employeeId: string
): Promise<number> => {
  try {
    const mondayBonus = await calculateMondayHolidayBonus(employeeId);
    const totalEntitlement = baseAnnualLeave + mondayBonus;
    
    console.log(`MondayHolidayCalculations: Total leave entitlement for ${employeeId}: ${baseAnnualLeave} base + ${mondayBonus} Monday bonus = ${totalEntitlement}`);
    
    return totalEntitlement;
  } catch (error) {
    console.error('Error calculating total annual leave with bonus:', error);
    return baseAnnualLeave;
  }
};
