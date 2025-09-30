import { EmployeeQualifications } from '@/types/employee';

// Base rates for slot bookings
const WEEKDAY_BASE_RATE = 70;
const WEEKEND_BASE_RATE = 85;

// Dan level bonuses
const DAN_BONUSES = {
  first: 5,
  second: 10,
  thirdAndAbove: 15,
};

// Qualification bonuses
const QUALIFICATION_BONUSES = {
  stfCoachInduction: 1,
  stfPoomsaeCoachLevel1: 3,
  stfPoomsaeCoachLevel2: 5,
  stfPoomsaeCoachLevel3: 7,
  sgCoachLevel1: 5,
  sgCoachLevel2: 7,
  stfPoomsaeReferee: 3,
  stfKyorugiReferee: 3,
};

/**
 * Check if a date falls on a weekend (Saturday or Sunday)
 */
export const isWeekend = (dateString: string): boolean => {
  const date = new Date(dateString);
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // 0 = Sunday, 6 = Saturday
};

/**
 * Check if a date is from November 2025 onwards
 */
export const isFromNovember2024 = (dateString: string): boolean => {
  const date = new Date(dateString);
  const november2025 = new Date('2025-11-01');
  return date >= november2025;
};

/**
 * Calculate the total pay for a slot booking based on date and employee qualifications
 */
export const calculateSlotPay = (
  dateString: string,
  qualifications?: EmployeeQualifications
): number => {
  // Only calculate pay for dates from November 2025 onwards
  if (!isFromNovember2024(dateString)) {
    return 0;
  }

  // Start with base rate
  let totalPay = isWeekend(dateString) ? WEEKEND_BASE_RATE : WEEKDAY_BASE_RATE;

  // If no qualifications, return base rate
  if (!qualifications) {
    return totalPay;
  }

  // Add Dan level bonus (only highest Dan level applies)
  if (qualifications.danFourthAbove) {
    totalPay += DAN_BONUSES.thirdAndAbove;
  } else if (qualifications.danThird) {
    totalPay += DAN_BONUSES.thirdAndAbove;
  } else if (qualifications.danSecond) {
    totalPay += DAN_BONUSES.second;
  } else if (qualifications.danFirst) {
    totalPay += DAN_BONUSES.first;
  }

  // Add qualification bonuses (all applicable bonuses stack)
  if (qualifications.stfCoachInduction) {
    totalPay += QUALIFICATION_BONUSES.stfCoachInduction;
  }
  if (qualifications.stfPoomsaeCoachLevel1) {
    totalPay += QUALIFICATION_BONUSES.stfPoomsaeCoachLevel1;
  }
  if (qualifications.stfPoomsaeCoachLevel2) {
    totalPay += QUALIFICATION_BONUSES.stfPoomsaeCoachLevel2;
  }
  if (qualifications.stfPoomsaeCoachLevel3) {
    totalPay += QUALIFICATION_BONUSES.stfPoomsaeCoachLevel3;
  }
  if (qualifications.sgCoachLevel1) {
    totalPay += QUALIFICATION_BONUSES.sgCoachLevel1;
  }
  if (qualifications.sgCoachLevel2) {
    totalPay += QUALIFICATION_BONUSES.sgCoachLevel2;
  }
  if (qualifications.stfPoomsaeReferee) {
    totalPay += QUALIFICATION_BONUSES.stfPoomsaeReferee;
  }
  if (qualifications.stfKyorugiReferee) {
    totalPay += QUALIFICATION_BONUSES.stfKyorugiReferee;
  }

  return totalPay;
};

/**
 * Get a detailed breakdown of pay calculation for display purposes
 */
export const getPayBreakdown = (
  dateString: string,
  qualifications?: EmployeeQualifications
): { item: string; amount: number }[] => {
  if (!isFromNovember2024(dateString)) {
    return [];
  }

  const breakdown: { item: string; amount: number }[] = [];

  // Base rate
  const baseRate = isWeekend(dateString) ? WEEKEND_BASE_RATE : WEEKDAY_BASE_RATE;
  breakdown.push({
    item: isWeekend(dateString) ? 'Weekend Base' : 'Weekday Base',
    amount: baseRate,
  });

  if (!qualifications) {
    return breakdown;
  }

  // Dan level bonus
  if (qualifications.danFourthAbove) {
    breakdown.push({ item: '4th Dan & Above', amount: DAN_BONUSES.thirdAndAbove });
  } else if (qualifications.danThird) {
    breakdown.push({ item: '3rd Dan', amount: DAN_BONUSES.thirdAndAbove });
  } else if (qualifications.danSecond) {
    breakdown.push({ item: '2nd Dan', amount: DAN_BONUSES.second });
  } else if (qualifications.danFirst) {
    breakdown.push({ item: '1st Dan', amount: DAN_BONUSES.first });
  }

  // Qualifications
  if (qualifications.stfCoachInduction) {
    breakdown.push({ item: 'Coach Induction', amount: QUALIFICATION_BONUSES.stfCoachInduction });
  }
  if (qualifications.stfPoomsaeCoachLevel1) {
    breakdown.push({ item: 'Poomsae Coach L1', amount: QUALIFICATION_BONUSES.stfPoomsaeCoachLevel1 });
  }
  if (qualifications.stfPoomsaeCoachLevel2) {
    breakdown.push({ item: 'Poomsae Coach L2', amount: QUALIFICATION_BONUSES.stfPoomsaeCoachLevel2 });
  }
  if (qualifications.stfPoomsaeCoachLevel3) {
    breakdown.push({ item: 'Poomsae Coach L3', amount: QUALIFICATION_BONUSES.stfPoomsaeCoachLevel3 });
  }
  if (qualifications.sgCoachLevel1) {
    breakdown.push({ item: 'SG Coach L1', amount: QUALIFICATION_BONUSES.sgCoachLevel1 });
  }
  if (qualifications.sgCoachLevel2) {
    breakdown.push({ item: 'SG Coach L2', amount: QUALIFICATION_BONUSES.sgCoachLevel2 });
  }
  if (qualifications.stfPoomsaeReferee) {
    breakdown.push({ item: 'STF Poomsae Referee', amount: QUALIFICATION_BONUSES.stfPoomsaeReferee });
  }
  if (qualifications.stfKyorugiReferee) {
    breakdown.push({ item: 'STF Kyorugi Referee', amount: QUALIFICATION_BONUSES.stfKyorugiReferee });
  }

  return breakdown;
};
