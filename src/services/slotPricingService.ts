import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface SlotPricingConfig {
  id: string;
  weekday_base_rate: number;
  weekend_base_rate: number;
  years_of_service_bonus_per_year: number;
  dan_first_bonus: number;
  dan_second_bonus: number;
  dan_third_above_bonus: number;
  stf_coach_induction_bonus: number;
  stf_poomsae_coach_level1_bonus: number;
  stf_poomsae_coach_level2_bonus: number;
  stf_poomsae_coach_level3_bonus: number;
  sg_coach_level1_bonus: number;
  sg_coach_level2_bonus: number;
  stf_poomsae_referee_bonus: number;
  stf_kyorugi_referee_bonus: number;
  milestone_5_slots_bonus: number;
  milestone_10_slots_bonus: number;
  milestone_16_slots_bonus: number;
  is_active: boolean;
  effective_from: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

/**
 * Fetch the active pricing configuration
 */
export const getActivePricingConfig = async (): Promise<SlotPricingConfig | null> => {
  try {
    const { data, error } = await supabase
      .from('slot_booking_pricing_config')
      .select('*')
      .eq('is_active', true)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      logger.error('Error fetching pricing config', error);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Error in getActivePricingConfig', error);
    return null;
  }
};

/**
 * Update the pricing configuration
 */
export const updatePricingConfig = async (
  config: Partial<Omit<SlotPricingConfig, 'id' | 'created_at' | 'updated_at' | 'created_by'>>
): Promise<boolean> => {
  try {
    // Get current active config
    const currentConfig = await getActivePricingConfig();
    
    if (!currentConfig) {
      logger.error('No active config found to update');
      return false;
    }

    const { error } = await supabase
      .from('slot_booking_pricing_config')
      .update({
        ...config,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentConfig.id);

    if (error) {
      logger.error('Error updating pricing config', error);
      throw error;
    }

    return true;
  } catch (error) {
    logger.error('Error in updatePricingConfig', error);
    return false;
  }
};
