import { EmployeeQualifications } from '@/types/employee';
import { getActivePricingConfig } from '@/services/slotPricingService';

// Cache for pricing config to avoid repeated database calls
let pricingConfigCache: {
  weekdayBaseRate: number;
  weekendBaseRate: number;
  yearsOfServiceBonusPerYear: number;
  danBonuses: { first: number; second: number; thirdAndAbove: number };
  qualificationBonuses: {
    stfCoachInduction: number;
    stfPoomsaeCoachLevel1: number;
    stfPoomsaeCoachLevel2: number;
    stfPoomsaeCoachLevel3: number;
    sgCoachLevel1: number;
    sgCoachLevel2: number;
    stfPoomsaeReferee: number;
    stfKyorugiReferee: number;
  };
  lastFetched: number;
} | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch and cache pricing configuration from database
 */
const getPricingConfig = async () => {
  const now = Date.now();
  
  // Return cached config if still valid
  if (pricingConfigCache && now - pricingConfigCache.lastFetched < CACHE_DURATION) {
    console.log('[SlotPayCalc] Using cached pricing config:', {
      weekday: pricingConfigCache.weekdayBaseRate,
      weekend: pricingConfigCache.weekendBaseRate,
      cacheAge: ((now - pricingConfigCache.lastFetched) / 1000).toFixed(0) + 's'
    });
    return pricingConfigCache;
  }

  console.log('[SlotPayCalc] Fetching fresh pricing config from database...');
  
  try {
    const config = await getActivePricingConfig();
    
    console.log('[SlotPayCalc] Raw config from database:', config);
    
    if (config) {
      pricingConfigCache = {
        weekdayBaseRate: config.weekday_base_rate,
        weekendBaseRate: config.weekend_base_rate,
        yearsOfServiceBonusPerYear: config.years_of_service_bonus_per_year,
        danBonuses: {
          first: config.dan_first_bonus,
          second: config.dan_second_bonus,
          thirdAndAbove: config.dan_third_above_bonus,
        },
        qualificationBonuses: {
          stfCoachInduction: config.stf_coach_induction_bonus,
          stfPoomsaeCoachLevel1: config.stf_poomsae_coach_level1_bonus,
          stfPoomsaeCoachLevel2: config.stf_poomsae_coach_level2_bonus,
          stfPoomsaeCoachLevel3: config.stf_poomsae_coach_level3_bonus,
          sgCoachLevel1: config.sg_coach_level1_bonus,
          sgCoachLevel2: config.sg_coach_level2_bonus,
          stfPoomsaeReferee: config.stf_poomsae_referee_bonus,
          stfKyorugiReferee: config.stf_kyorugi_referee_bonus,
        },
        lastFetched: now,
      };
      console.log('[SlotPayCalc] ✓ Cached config:', {
        weekday: pricingConfigCache.weekdayBaseRate,
        weekend: pricingConfigCache.weekendBaseRate
      });
    } else {
      console.warn('[SlotPayCalc] ⚠️ No config found, using fallback defaults');
      // Fallback to default values if no config found
      pricingConfigCache = {
        weekdayBaseRate: 70,
        weekendBaseRate: 85,
        yearsOfServiceBonusPerYear: 3,
        danBonuses: { first: 5, second: 10, thirdAndAbove: 15 },
        qualificationBonuses: {
          stfCoachInduction: 1,
          stfPoomsaeCoachLevel1: 3,
          stfPoomsaeCoachLevel2: 5,
          stfPoomsaeCoachLevel3: 7,
          sgCoachLevel1: 5,
          sgCoachLevel2: 7,
          stfPoomsaeReferee: 3,
          stfKyorugiReferee: 3,
        },
        lastFetched: now,
      };
    }
  } catch (error) {
    console.error('[SlotPayCalc] ❌ Error fetching pricing config, using defaults:', error);
    // Use default values on error
    pricingConfigCache = {
      weekdayBaseRate: 70,
      weekendBaseRate: 85,
      yearsOfServiceBonusPerYear: 3,
      danBonuses: { first: 5, second: 10, thirdAndAbove: 15 },
      qualificationBonuses: {
        stfCoachInduction: 1,
        stfPoomsaeCoachLevel1: 3,
        stfPoomsaeCoachLevel2: 5,
        stfPoomsaeCoachLevel3: 7,
        sgCoachLevel1: 5,
        sgCoachLevel2: 7,
        stfPoomsaeReferee: 3,
        stfKyorugiReferee: 3,
      },
      lastFetched: now,
    };
  }

  return pricingConfigCache;
};

/**
 * Clear the pricing config cache (useful after updates)
 */
export const clearPricingCache = () => {
  pricingConfigCache = null;
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
 * Calculate years of service from join date to booking date
 */
const calculateYearsOfService = (joinDate: string | undefined, bookingDate: string): number => {
  if (!joinDate) return 0;
  
  const join = new Date(joinDate);
  const booking = new Date(bookingDate);
  
  const yearsDiff = booking.getFullYear() - join.getFullYear();
  const monthDiff = booking.getMonth() - join.getMonth();
  const dayDiff = booking.getDate() - join.getDate();
  
  // Calculate full years of service
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    return Math.max(0, yearsDiff - 1);
  }
  
  return Math.max(0, yearsDiff);
};

/**
 * Calculate the total pay for a slot booking based on date and employee qualifications
 */
export const calculateSlotPay = async (
  dateString: string,
  qualifications?: EmployeeQualifications,
  joinDate?: string
): Promise<number> => {
  // Only calculate pay for dates from November 2025 onwards
  if (!isFromNovember2024(dateString)) {
    return 0;
  }

  // Get pricing configuration
  const config = await getPricingConfig();

  console.log(`[SlotPayCalc] Calculating pay for ${dateString}:`, {
    isWeekend: isWeekend(dateString),
    baseRate: isWeekend(dateString) ? config.weekendBaseRate : config.weekdayBaseRate,
    qualifications: qualifications || 'none',
    joinDate: joinDate || 'none'
  });

  // Start with base rate
  let totalPay = isWeekend(dateString) ? config.weekendBaseRate : config.weekdayBaseRate;

  // Add years of service bonus
  const yearsOfService = calculateYearsOfService(joinDate, dateString);
  const serviceBonus = yearsOfService * config.yearsOfServiceBonusPerYear;
  totalPay += serviceBonus;

  console.log(`[SlotPayCalc]   Base: $${isWeekend(dateString) ? config.weekendBaseRate : config.weekdayBaseRate}, Service bonus: $${serviceBonus} (${yearsOfService} years)`);

  // If no qualifications, return base rate + service bonus
  if (!qualifications) {
    console.log(`[SlotPayCalc]   TOTAL: $${totalPay} (no qualifications)`);
    return totalPay;
  }

  let qualBonus = 0;

  // Add Dan level bonus (only highest Dan level applies)
  if (qualifications.danFourthAbove) {
    totalPay += config.danBonuses.thirdAndAbove;
    qualBonus += config.danBonuses.thirdAndAbove;
    console.log(`[SlotPayCalc]   Dan 4th+: +$${config.danBonuses.thirdAndAbove}`);
  } else if (qualifications.danThird) {
    totalPay += config.danBonuses.thirdAndAbove;
    qualBonus += config.danBonuses.thirdAndAbove;
    console.log(`[SlotPayCalc]   Dan 3rd: +$${config.danBonuses.thirdAndAbove}`);
  } else if (qualifications.danSecond) {
    totalPay += config.danBonuses.second;
    qualBonus += config.danBonuses.second;
    console.log(`[SlotPayCalc]   Dan 2nd: +$${config.danBonuses.second}`);
  } else if (qualifications.danFirst) {
    totalPay += config.danBonuses.first;
    qualBonus += config.danBonuses.first;
    console.log(`[SlotPayCalc]   Dan 1st: +$${config.danBonuses.first}`);
  }

  // Add qualification bonuses (all applicable bonuses stack)
  if (qualifications.stfCoachInduction) {
    totalPay += config.qualificationBonuses.stfCoachInduction;
    qualBonus += config.qualificationBonuses.stfCoachInduction;
    console.log(`[SlotPayCalc]   Coach Induction: +$${config.qualificationBonuses.stfCoachInduction}`);
  }
  if (qualifications.stfPoomsaeCoachLevel1) {
    totalPay += config.qualificationBonuses.stfPoomsaeCoachLevel1;
    qualBonus += config.qualificationBonuses.stfPoomsaeCoachLevel1;
    console.log(`[SlotPayCalc]   Poomsae Coach L1: +$${config.qualificationBonuses.stfPoomsaeCoachLevel1}`);
  }
  if (qualifications.stfPoomsaeCoachLevel2) {
    totalPay += config.qualificationBonuses.stfPoomsaeCoachLevel2;
    qualBonus += config.qualificationBonuses.stfPoomsaeCoachLevel2;
    console.log(`[SlotPayCalc]   Poomsae Coach L2: +$${config.qualificationBonuses.stfPoomsaeCoachLevel2}`);
  }
  if (qualifications.stfPoomsaeCoachLevel3) {
    totalPay += config.qualificationBonuses.stfPoomsaeCoachLevel3;
    qualBonus += config.qualificationBonuses.stfPoomsaeCoachLevel3;
    console.log(`[SlotPayCalc]   Poomsae Coach L3: +$${config.qualificationBonuses.stfPoomsaeCoachLevel3}`);
  }
  if (qualifications.sgCoachLevel1) {
    totalPay += config.qualificationBonuses.sgCoachLevel1;
    qualBonus += config.qualificationBonuses.sgCoachLevel1;
    console.log(`[SlotPayCalc]   SG Coach L1: +$${config.qualificationBonuses.sgCoachLevel1}`);
  }
  if (qualifications.sgCoachLevel2) {
    totalPay += config.qualificationBonuses.sgCoachLevel2;
    qualBonus += config.qualificationBonuses.sgCoachLevel2;
    console.log(`[SlotPayCalc]   SG Coach L2: +$${config.qualificationBonuses.sgCoachLevel2}`);
  }
  if (qualifications.stfPoomsaeReferee) {
    totalPay += config.qualificationBonuses.stfPoomsaeReferee;
    qualBonus += config.qualificationBonuses.stfPoomsaeReferee;
    console.log(`[SlotPayCalc]   STF Poomsae Referee: +$${config.qualificationBonuses.stfPoomsaeReferee}`);
  }
  if (qualifications.stfKyorugiReferee) {
    totalPay += config.qualificationBonuses.stfKyorugiReferee;
    qualBonus += config.qualificationBonuses.stfKyorugiReferee;
    console.log(`[SlotPayCalc]   STF Kyorugi Referee: +$${config.qualificationBonuses.stfKyorugiReferee}`);
  }

  console.log(`[SlotPayCalc]   Qual bonus total: +$${qualBonus}`);
  console.log(`[SlotPayCalc]   ✅ TOTAL PAY: $${totalPay}`);

  return totalPay;
};

/**
 * Get a detailed breakdown of pay calculation for display purposes
 */
export const getPayBreakdown = async (
  dateString: string,
  qualifications?: EmployeeQualifications,
  joinDate?: string
): Promise<{ item: string; amount: number }[]> => {
  if (!isFromNovember2024(dateString)) {
    return [];
  }

  // Get pricing configuration
  const config = await getPricingConfig();

  const breakdown: { item: string; amount: number }[] = [];

  // Base rate
  const baseRate = isWeekend(dateString) ? config.weekendBaseRate : config.weekdayBaseRate;
  breakdown.push({
    item: isWeekend(dateString) ? 'Weekend Base' : 'Weekday Base',
    amount: baseRate,
  });

  // Add years of service bonus
  const yearsOfService = calculateYearsOfService(joinDate, dateString);
  if (yearsOfService > 0) {
    const serviceBonus = yearsOfService * config.yearsOfServiceBonusPerYear;
    breakdown.push({
      item: `Service Bonus (${yearsOfService} ${yearsOfService === 1 ? 'year' : 'years'})`,
      amount: serviceBonus
    });
  }

  if (!qualifications) {
    return breakdown;
  }

  // Dan level bonus
  if (qualifications.danFourthAbove) {
    breakdown.push({ item: '4th Dan & Above', amount: config.danBonuses.thirdAndAbove });
  } else if (qualifications.danThird) {
    breakdown.push({ item: '3rd Dan', amount: config.danBonuses.thirdAndAbove });
  } else if (qualifications.danSecond) {
    breakdown.push({ item: '2nd Dan', amount: config.danBonuses.second });
  } else if (qualifications.danFirst) {
    breakdown.push({ item: '1st Dan', amount: config.danBonuses.first });
  }

  // Qualifications
  if (qualifications.stfCoachInduction) {
    breakdown.push({ item: 'Coach Induction', amount: config.qualificationBonuses.stfCoachInduction });
  }
  if (qualifications.stfPoomsaeCoachLevel1) {
    breakdown.push({ item: 'Poomsae Coach L1', amount: config.qualificationBonuses.stfPoomsaeCoachLevel1 });
  }
  if (qualifications.stfPoomsaeCoachLevel2) {
    breakdown.push({ item: 'Poomsae Coach L2', amount: config.qualificationBonuses.stfPoomsaeCoachLevel2 });
  }
  if (qualifications.stfPoomsaeCoachLevel3) {
    breakdown.push({ item: 'Poomsae Coach L3', amount: config.qualificationBonuses.stfPoomsaeCoachLevel3 });
  }
  if (qualifications.sgCoachLevel1) {
    breakdown.push({ item: 'SG Coach L1', amount: config.qualificationBonuses.sgCoachLevel1 });
  }
  if (qualifications.sgCoachLevel2) {
    breakdown.push({ item: 'SG Coach L2', amount: config.qualificationBonuses.sgCoachLevel2 });
  }
  if (qualifications.stfPoomsaeReferee) {
    breakdown.push({ item: 'STF Poomsae Referee', amount: config.qualificationBonuses.stfPoomsaeReferee });
  }
  if (qualifications.stfKyorugiReferee) {
    breakdown.push({ item: 'STF Kyorugi Referee', amount: config.qualificationBonuses.stfKyorugiReferee });
  }

  return breakdown;
};
