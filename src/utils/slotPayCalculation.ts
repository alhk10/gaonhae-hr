import { EmployeeQualifications } from '@/types/employee';
import { getActivePricingConfig } from '@/services/slotPricingService';

// Default slot duration constants (in hours) - used as fallback
export const SLOT_DURATIONS = {
  weekday: 6.33, // Tue-Fri: 2:10pm to 8:30pm = 6 hours 20 minutes
  weekend: 7.83, // Sat-Sun: 9:10am to 5:00pm = 7 hours 50 minutes
};

// Default slot times - used as fallback
export const SLOT_TIMES = {
  weekday: { start: '14:10', end: '20:30' }, // Tue-Fri
  weekend: { start: '09:10', end: '17:00' }, // Sat-Sun
};

// Day of week mapping (0 = Sunday, 1 = Monday, etc.)
const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

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
  milestoneBonuses: {
    slots5: number;
    slots10: number;
    slots16: number;
  };
  slotTimings: {
    monday: { start: string; end: string };
    tuesday: { start: string; end: string };
    wednesday: { start: string; end: string };
    thursday: { start: string; end: string };
    friday: { start: string; end: string };
    saturday: { start: string; end: string };
    sunday: { start: string; end: string };
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
        milestoneBonuses: {
          slots5: config.milestone_5_slots_bonus ?? 20,
          slots10: config.milestone_10_slots_bonus ?? 50,
          slots16: config.milestone_16_slots_bonus ?? 100,
        },
        slotTimings: {
          monday: { start: config.monday_start_time || '09:00', end: config.monday_end_time || '21:00' },
          tuesday: { start: config.tuesday_start_time || '09:00', end: config.tuesday_end_time || '21:00' },
          wednesday: { start: config.wednesday_start_time || '09:00', end: config.wednesday_end_time || '21:00' },
          thursday: { start: config.thursday_start_time || '09:00', end: config.thursday_end_time || '21:00' },
          friday: { start: config.friday_start_time || '09:00', end: config.friday_end_time || '21:00' },
          saturday: { start: config.saturday_start_time || '09:00', end: config.saturday_end_time || '21:00' },
          sunday: { start: config.sunday_start_time || '09:00', end: config.sunday_end_time || '21:00' },
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
        milestoneBonuses: { slots5: 20, slots10: 50, slots16: 100 },
        slotTimings: {
          monday: { start: '09:00', end: '21:00' },
          tuesday: { start: '09:00', end: '21:00' },
          wednesday: { start: '09:00', end: '21:00' },
          thursday: { start: '09:00', end: '21:00' },
          friday: { start: '09:00', end: '21:00' },
          saturday: { start: '09:00', end: '21:00' },
          sunday: { start: '09:00', end: '21:00' },
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
      milestoneBonuses: { slots5: 20, slots10: 50, slots16: 100 },
      slotTimings: {
        monday: { start: '09:00', end: '21:00' },
        tuesday: { start: '09:00', end: '21:00' },
        wednesday: { start: '09:00', end: '21:00' },
        thursday: { start: '09:00', end: '21:00' },
        friday: { start: '09:00', end: '21:00' },
        saturday: { start: '09:00', end: '21:00' },
        sunday: { start: '09:00', end: '21:00' },
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
 * Get milestone bonus configuration for display/calculation
 */
export const getMilestoneBonusConfig = async (): Promise<{
  slots5: number;
  slots10: number;
  slots16: number;
}> => {
  const config = await getPricingConfig();
  return config.milestoneBonuses;
};

/**
 * Calculate milestone bonus based on number of slots in a month
 * Returns the bonus amount (only the highest achieved milestone)
 */
export const calculateMilestoneBonus = async (slotCount: number): Promise<number> => {
  const config = await getPricingConfig();
  
  if (slotCount >= 16) {
    return config.milestoneBonuses.slots16;
  } else if (slotCount >= 12) {
    return config.milestoneBonuses.slots10;
  } else if (slotCount >= 8) {
    return config.milestoneBonuses.slots5;
  }
  
  return 0;
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
 * Parse time string (HH:MM or HH:MM:SS) to decimal hours
 */
const parseTimeToHours = (timeStr: string): number => {
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  return hours + minutes / 60;
};

/**
 * Get slot timing configuration for a specific date
 * Returns start and end times from the database configuration
 */
export const getSlotTimingForDate = async (dateString: string): Promise<{ start: string; end: string }> => {
  const config = await getPricingConfig();
  const date = new Date(dateString);
  const dayOfWeek = date.getDay();
  const dayName = DAY_NAMES[dayOfWeek];
  
  return config.slotTimings[dayName];
};

/**
 * Get slot timing synchronously from cache (for use where async isn't available)
 * Falls back to default timings if cache is not populated
 */
export const getSlotTimingForDateSync = (dateString: string): { start: string; end: string } => {
  const date = new Date(dateString);
  const dayOfWeek = date.getDay();
  const dayName = DAY_NAMES[dayOfWeek];
  
  if (pricingConfigCache) {
    return pricingConfigCache.slotTimings[dayName];
  }
  
  // Fallback to legacy timings if cache not populated
  return isWeekend(dateString) ? SLOT_TIMES.weekend : SLOT_TIMES.weekday;
};

/**
 * Calculate expected slot duration based on day of week using configured timings
 */
export const getExpectedSlotDuration = (dateString: string): number => {
  const timing = getSlotTimingForDateSync(dateString);
  
  try {
    const startHours = parseTimeToHours(timing.start);
    const endHours = parseTimeToHours(timing.end);
    
    let duration = endHours - startHours;
    if (duration < 0) {
      duration += 24; // Handle overnight slots
    }
    
    return duration;
  } catch (error) {
    console.error('[SlotPayCalc] Error calculating duration from config, using legacy:', error);
    return isWeekend(dateString) ? SLOT_DURATIONS.weekend : SLOT_DURATIONS.weekday;
  }
};

/**
 * Get expected slot duration asynchronously (ensures cache is populated)
 */
export const getExpectedSlotDurationAsync = async (dateString: string): Promise<number> => {
  const timing = await getSlotTimingForDate(dateString);
  
  try {
    const startHours = parseTimeToHours(timing.start);
    const endHours = parseTimeToHours(timing.end);
    
    let duration = endHours - startHours;
    if (duration < 0) {
      duration += 24; // Handle overnight slots
    }
    
    return duration;
  } catch (error) {
    console.error('[SlotPayCalc] Error calculating duration from config, using legacy:', error);
    return isWeekend(dateString) ? SLOT_DURATIONS.weekend : SLOT_DURATIONS.weekday;
  }
};

/**
 * Calculate actual hours worked from check-in and check-out times
 * Returns 1 hour if check-out is missing (minimal work assumed)
 * Returns expected duration if both check-in and check-out are missing
 */
export const calculateActualHoursWorked = (
  dateString: string,
  checkIn: string | null,
  checkOut: string | null
): number => {
  const expectedDuration = getExpectedSlotDuration(dateString);
  const slotTiming = getSlotTimingForDateSync(dateString);
  
  // If no check-in, return 0 hours (no times recorded)
  if (!checkIn) {
    return 0;
  }
  
  // If check-in exists but no check-out, assume only 1 hour of work
  if (!checkOut) {
    return 1;
  }

  try {
    const slotStartHours = parseTimeToHours(slotTiming.start);
    const slotEndHours = parseTimeToHours(slotTiming.end);
    const checkInHours = parseTimeToHours(checkIn);
    const checkOutHours = parseTimeToHours(checkOut);
    
    // Clamp check-in to not be earlier than slot start
    const effectiveCheckIn = Math.max(checkInHours, slotStartHours);
    // Clamp check-out to not be later than slot end
    const effectiveCheckOut = Math.min(checkOutHours, slotEndHours);
    
    // If effective check-in is after effective check-out (invalid), return 0
    if (effectiveCheckIn >= effectiveCheckOut) {
      return 0;
    }
    
    // Calculate duration within slot boundaries
    const duration = effectiveCheckOut - effectiveCheckIn;
    
    return duration;
  } catch (error) {
    console.error('[SlotPayCalc] Error parsing attendance times:', error);
    return expectedDuration;
  }
};

/**
 * Calculate actual hours worked asynchronously (ensures cache is populated)
 */
export const calculateActualHoursWorkedAsync = async (
  dateString: string,
  checkIn: string | null,
  checkOut: string | null
): Promise<number> => {
  const expectedDuration = await getExpectedSlotDurationAsync(dateString);
  const slotTiming = await getSlotTimingForDate(dateString);
  
  // If no check-in, return 0 hours (no times recorded)
  if (!checkIn) {
    return 0;
  }
  
  // If check-in exists but no check-out, assume only 1 hour of work
  if (!checkOut) {
    return 1;
  }

  try {
    const slotStartHours = parseTimeToHours(slotTiming.start);
    const slotEndHours = parseTimeToHours(slotTiming.end);
    const checkInHours = parseTimeToHours(checkIn);
    const checkOutHours = parseTimeToHours(checkOut);
    
    // Clamp check-in to not be earlier than slot start
    const effectiveCheckIn = Math.max(checkInHours, slotStartHours);
    // Clamp check-out to not be later than slot end
    const effectiveCheckOut = Math.min(checkOutHours, slotEndHours);
    
    // If effective check-in is after effective check-out (invalid), return 0
    if (effectiveCheckIn >= effectiveCheckOut) {
      return 0;
    }
    
    // Calculate duration within slot boundaries
    const duration = effectiveCheckOut - effectiveCheckIn;
    
    return duration;
  } catch (error) {
    console.error('[SlotPayCalc] Error parsing attendance times:', error);
    return expectedDuration;
  }
};

/**
 * Calculate the total pay for a slot booking based on date, employee qualifications, and hours worked
 * Pay is prorated: (fullDayRate / expectedDuration) × actualHoursWorked
 */
export const calculateSlotPay = async (
  dateString: string,
  qualifications?: EmployeeQualifications,
  joinDate?: string,
  actualHoursWorked?: number
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
  // Poomsae Coach: non-stackable, highest level only
  if (qualifications.stfPoomsaeCoachLevel3) {
    totalPay += config.qualificationBonuses.stfPoomsaeCoachLevel3;
    qualBonus += config.qualificationBonuses.stfPoomsaeCoachLevel3;
    console.log(`[SlotPayCalc]   Poomsae Coach L3: +$${config.qualificationBonuses.stfPoomsaeCoachLevel3}`);
  } else if (qualifications.stfPoomsaeCoachLevel2) {
    totalPay += config.qualificationBonuses.stfPoomsaeCoachLevel2;
    qualBonus += config.qualificationBonuses.stfPoomsaeCoachLevel2;
    console.log(`[SlotPayCalc]   Poomsae Coach L2: +$${config.qualificationBonuses.stfPoomsaeCoachLevel2}`);
  } else if (qualifications.stfPoomsaeCoachLevel1) {
    totalPay += config.qualificationBonuses.stfPoomsaeCoachLevel1;
    qualBonus += config.qualificationBonuses.stfPoomsaeCoachLevel1;
    console.log(`[SlotPayCalc]   Poomsae Coach L1: +$${config.qualificationBonuses.stfPoomsaeCoachLevel1}`);
  }
  // SG Coach: non-stackable, highest level only
  if (qualifications.sgCoachLevel2) {
    totalPay += config.qualificationBonuses.sgCoachLevel2;
    qualBonus += config.qualificationBonuses.sgCoachLevel2;
    console.log(`[SlotPayCalc]   SG Coach L2: +$${config.qualificationBonuses.sgCoachLevel2}`);
  } else if (qualifications.sgCoachLevel1) {
    totalPay += config.qualificationBonuses.sgCoachLevel1;
    qualBonus += config.qualificationBonuses.sgCoachLevel1;
    console.log(`[SlotPayCalc]   SG Coach L1: +$${config.qualificationBonuses.sgCoachLevel1}`);
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
  
  // Apply proration if actual hours worked is provided
  const expectedDuration = await getExpectedSlotDurationAsync(dateString);
  const hoursWorked = actualHoursWorked ?? expectedDuration;
  
  if (hoursWorked < expectedDuration) {
    const prorationFactor = hoursWorked / expectedDuration;
    const proratedPay = Math.round(totalPay * prorationFactor * 100) / 100; // Round to 2 decimals
    console.log(`[SlotPayCalc]   Proration: ${hoursWorked.toFixed(2)}h / ${expectedDuration.toFixed(2)}h = ${(prorationFactor * 100).toFixed(1)}%`);
    console.log(`[SlotPayCalc]   ✅ PRORATED PAY: $${proratedPay} (full rate: $${totalPay})`);
    return proratedPay;
  }

  console.log(`[SlotPayCalc]   ✅ TOTAL PAY: $${totalPay} (full slot)`);
  return totalPay;
};

/**
 * Get a detailed breakdown of pay calculation for display purposes
 */
export const getPayBreakdown = async (
  dateString: string,
  qualifications?: EmployeeQualifications,
  joinDate?: string,
  actualHoursWorked?: number
): Promise<{ item: string; amount: number }[]> => {
  if (!isFromNovember2024(dateString)) {
    return [];
  }

  // Get pricing configuration
  const config = await getPricingConfig();

  const breakdown: { item: string; amount: number }[] = [];

  // Calculate proration factor
  const expectedDuration = await getExpectedSlotDurationAsync(dateString);
  const hoursWorked = actualHoursWorked ?? expectedDuration;
  const prorationFactor = hoursWorked / expectedDuration;
  const isProrated = hoursWorked < expectedDuration;

  // Helper to apply proration
  const applyProration = (amount: number): number => {
    return isProrated ? Math.round(amount * prorationFactor * 100) / 100 : amount;
  };

  // Base rate
  const baseRate = isWeekend(dateString) ? config.weekendBaseRate : config.weekdayBaseRate;
  breakdown.push({
    item: isWeekend(dateString) ? 'Weekend Base' : 'Weekday Base',
    amount: applyProration(baseRate),
  });

  // Add years of service bonus
  const yearsOfService = calculateYearsOfService(joinDate, dateString);
  if (yearsOfService > 0) {
    const serviceBonus = yearsOfService * config.yearsOfServiceBonusPerYear;
    breakdown.push({
      item: `Service Bonus (${yearsOfService} ${yearsOfService === 1 ? 'year' : 'years'})`,
      amount: applyProration(serviceBonus)
    });
  }

  if (qualifications) {
    // Dan level bonus
    if (qualifications.danFourthAbove) {
      breakdown.push({ item: '4th Dan & Above', amount: applyProration(config.danBonuses.thirdAndAbove) });
    } else if (qualifications.danThird) {
      breakdown.push({ item: '3rd Dan', amount: applyProration(config.danBonuses.thirdAndAbove) });
    } else if (qualifications.danSecond) {
      breakdown.push({ item: '2nd Dan', amount: applyProration(config.danBonuses.second) });
    } else if (qualifications.danFirst) {
      breakdown.push({ item: '1st Dan', amount: applyProration(config.danBonuses.first) });
    }

    // Qualifications
    if (qualifications.stfCoachInduction) {
      breakdown.push({ item: 'Coach Induction', amount: applyProration(config.qualificationBonuses.stfCoachInduction) });
    }
    // Poomsae Coach: non-stackable, highest level only
    if (qualifications.stfPoomsaeCoachLevel3) {
      breakdown.push({ item: 'Poomsae Coach L3', amount: applyProration(config.qualificationBonuses.stfPoomsaeCoachLevel3) });
    } else if (qualifications.stfPoomsaeCoachLevel2) {
      breakdown.push({ item: 'Poomsae Coach L2', amount: applyProration(config.qualificationBonuses.stfPoomsaeCoachLevel2) });
    } else if (qualifications.stfPoomsaeCoachLevel1) {
      breakdown.push({ item: 'Poomsae Coach L1', amount: applyProration(config.qualificationBonuses.stfPoomsaeCoachLevel1) });
    }
    // SG Coach: non-stackable, highest level only
    if (qualifications.sgCoachLevel2) {
      breakdown.push({ item: 'SG Coach L2', amount: applyProration(config.qualificationBonuses.sgCoachLevel2) });
    } else if (qualifications.sgCoachLevel1) {
      breakdown.push({ item: 'SG Coach L1', amount: applyProration(config.qualificationBonuses.sgCoachLevel1) });
    }
    if (qualifications.stfPoomsaeReferee) {
      breakdown.push({ item: 'STF Poomsae Referee', amount: applyProration(config.qualificationBonuses.stfPoomsaeReferee) });
    }
    if (qualifications.stfKyorugiReferee) {
      breakdown.push({ item: 'STF Kyorugi Referee', amount: applyProration(config.qualificationBonuses.stfKyorugiReferee) });
    }
  }

  // Add proration info line if applicable
  if (isProrated) {
    breakdown.push({
      item: `Prorated (${hoursWorked.toFixed(1)}h / ${expectedDuration.toFixed(1)}h)`,
      amount: 0 // Info line, no amount
    });
  }

  return breakdown;
};

/**
 * Day rate breakdown item for display
 */
export interface DayRateBreakdownItem {
  item: string;
  weekdayAmount: number;
  weekendAmount: number;
}

/**
 * Day rate calculation result
 */
export interface DayRateCalculation {
  weekdayRate: number;
  weekendRate: number;
  breakdown: DayRateBreakdownItem[];
}

/**
 * Calculate employee's full day rates for both weekday and weekend with breakdown
 * Used for displaying rate calculation details on payslips
 */
export const getEmployeeDayRates = async (
  qualifications?: EmployeeQualifications,
  joinDate?: string,
  referenceDate?: string
): Promise<DayRateCalculation> => {
  // Get pricing configuration
  const config = await getPricingConfig();

  const breakdown: DayRateBreakdownItem[] = [];
  
  // Start with base rates
  let weekdayRate = config.weekdayBaseRate;
  let weekendRate = config.weekendBaseRate;
  
  breakdown.push({
    item: 'Base Rate',
    weekdayAmount: config.weekdayBaseRate,
    weekendAmount: config.weekendBaseRate
  });

  // Calculate years of service bonus
  const bookingDate = referenceDate || new Date().toISOString().split('T')[0];
  const yearsOfService = joinDate ? calculateYearsOfServiceForRates(joinDate, bookingDate) : 0;
  
  if (yearsOfService > 0 && config.yearsOfServiceBonusPerYear > 0) {
    const serviceBonus = yearsOfService * config.yearsOfServiceBonusPerYear;
    weekdayRate += serviceBonus;
    weekendRate += serviceBonus;
    breakdown.push({
      item: `Service (${yearsOfService} ${yearsOfService === 1 ? 'yr' : 'yrs'})`,
      weekdayAmount: serviceBonus,
      weekendAmount: serviceBonus
    });
  }

  if (qualifications) {
    // Dan level bonus (only highest applies)
    if (qualifications.danFourthAbove) {
      weekdayRate += config.danBonuses.thirdAndAbove;
      weekendRate += config.danBonuses.thirdAndAbove;
      breakdown.push({
        item: '4th Dan & Above',
        weekdayAmount: config.danBonuses.thirdAndAbove,
        weekendAmount: config.danBonuses.thirdAndAbove
      });
    } else if (qualifications.danThird) {
      weekdayRate += config.danBonuses.thirdAndAbove;
      weekendRate += config.danBonuses.thirdAndAbove;
      breakdown.push({
        item: '3rd Dan',
        weekdayAmount: config.danBonuses.thirdAndAbove,
        weekendAmount: config.danBonuses.thirdAndAbove
      });
    } else if (qualifications.danSecond) {
      weekdayRate += config.danBonuses.second;
      weekendRate += config.danBonuses.second;
      breakdown.push({
        item: '2nd Dan',
        weekdayAmount: config.danBonuses.second,
        weekendAmount: config.danBonuses.second
      });
    } else if (qualifications.danFirst) {
      weekdayRate += config.danBonuses.first;
      weekendRate += config.danBonuses.first;
      breakdown.push({
        item: '1st Dan',
        weekdayAmount: config.danBonuses.first,
        weekendAmount: config.danBonuses.first
      });
    }

    // Qualification bonuses (all applicable stack)
    if (qualifications.stfCoachInduction) {
      weekdayRate += config.qualificationBonuses.stfCoachInduction;
      weekendRate += config.qualificationBonuses.stfCoachInduction;
      breakdown.push({
        item: 'Coach Induction',
        weekdayAmount: config.qualificationBonuses.stfCoachInduction,
        weekendAmount: config.qualificationBonuses.stfCoachInduction
      });
    }
    // Poomsae Coach: non-stackable, highest level only
    if (qualifications.stfPoomsaeCoachLevel3) {
      weekdayRate += config.qualificationBonuses.stfPoomsaeCoachLevel3;
      weekendRate += config.qualificationBonuses.stfPoomsaeCoachLevel3;
      breakdown.push({
        item: 'Poomsae Coach L3',
        weekdayAmount: config.qualificationBonuses.stfPoomsaeCoachLevel3,
        weekendAmount: config.qualificationBonuses.stfPoomsaeCoachLevel3
      });
    } else if (qualifications.stfPoomsaeCoachLevel2) {
      weekdayRate += config.qualificationBonuses.stfPoomsaeCoachLevel2;
      weekendRate += config.qualificationBonuses.stfPoomsaeCoachLevel2;
      breakdown.push({
        item: 'Poomsae Coach L2',
        weekdayAmount: config.qualificationBonuses.stfPoomsaeCoachLevel2,
        weekendAmount: config.qualificationBonuses.stfPoomsaeCoachLevel2
      });
    } else if (qualifications.stfPoomsaeCoachLevel1) {
      weekdayRate += config.qualificationBonuses.stfPoomsaeCoachLevel1;
      weekendRate += config.qualificationBonuses.stfPoomsaeCoachLevel1;
      breakdown.push({
        item: 'Poomsae Coach L1',
        weekdayAmount: config.qualificationBonuses.stfPoomsaeCoachLevel1,
        weekendAmount: config.qualificationBonuses.stfPoomsaeCoachLevel1
      });
    }
    // SG Coach: non-stackable, highest level only
    if (qualifications.sgCoachLevel2) {
      weekdayRate += config.qualificationBonuses.sgCoachLevel2;
      weekendRate += config.qualificationBonuses.sgCoachLevel2;
      breakdown.push({
        item: 'SG Coach L2',
        weekdayAmount: config.qualificationBonuses.sgCoachLevel2,
        weekendAmount: config.qualificationBonuses.sgCoachLevel2
      });
    } else if (qualifications.sgCoachLevel1) {
      weekdayRate += config.qualificationBonuses.sgCoachLevel1;
      weekendRate += config.qualificationBonuses.sgCoachLevel1;
      breakdown.push({
        item: 'SG Coach L1',
        weekdayAmount: config.qualificationBonuses.sgCoachLevel1,
        weekendAmount: config.qualificationBonuses.sgCoachLevel1
      });
    }
    if (qualifications.stfPoomsaeReferee) {
      weekdayRate += config.qualificationBonuses.stfPoomsaeReferee;
      weekendRate += config.qualificationBonuses.stfPoomsaeReferee;
      breakdown.push({
        item: 'STF Poomsae Referee',
        weekdayAmount: config.qualificationBonuses.stfPoomsaeReferee,
        weekendAmount: config.qualificationBonuses.stfPoomsaeReferee
      });
    }
    if (qualifications.stfKyorugiReferee) {
      weekdayRate += config.qualificationBonuses.stfKyorugiReferee;
      weekendRate += config.qualificationBonuses.stfKyorugiReferee;
      breakdown.push({
        item: 'STF Kyorugi Referee',
        weekdayAmount: config.qualificationBonuses.stfKyorugiReferee,
        weekendAmount: config.qualificationBonuses.stfKyorugiReferee
      });
    }
  }

  return {
    weekdayRate,
    weekendRate,
    breakdown
  };
};

/**
 * Helper to calculate years of service for rate calculation
 * (Non-async version for use within getEmployeeDayRates)
 */
const calculateYearsOfServiceForRates = (joinDate: string, referenceDate: string): number => {
  const join = new Date(joinDate);
  const reference = new Date(referenceDate);
  
  const yearsDiff = reference.getFullYear() - join.getFullYear();
  const monthDiff = reference.getMonth() - join.getMonth();
  const dayDiff = reference.getDate() - join.getDate();
  
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    return Math.max(0, yearsDiff - 1);
  }
  
  return Math.max(0, yearsDiff);
};
