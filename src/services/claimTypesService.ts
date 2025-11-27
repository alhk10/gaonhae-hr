import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface ClaimType {
  id: string;
  name: string;
  limit_amount: number | null;
  co_pay: number;
  description: string | null;
  is_active: boolean;
}

export const getClaimTypes = async (): Promise<ClaimType[]> => {
  try {
    logger.debug('Fetching claim types from database');
    
    const { data, error } = await supabase
      .from('claim_types')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      logger.error('Error fetching claim types', error);
      throw error;
    }

    logger.debug('Loaded claim types', { count: data?.length });
    return data || [];
  } catch (error) {
    logger.error('Error in getClaimTypes', error);
    throw error;
  }
};

export const createClaimType = async (claimType: Omit<ClaimType, 'id'>): Promise<ClaimType> => {
  try {
    const { data, error } = await supabase
      .from('claim_types')
      .insert([claimType])
      .select()
      .single();

    if (error) {
      logger.error('Error creating claim type', error);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Error in createClaimType', error);
    throw error;
  }
};

export const updateClaimType = async (id: string, updates: Partial<ClaimType>): Promise<ClaimType> => {
  try {
    const { data, error } = await supabase
      .from('claim_types')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating claim type', error);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Error in updateClaimType', error);
    throw error;
  }
};

export const getAllClaimTypes = async (): Promise<ClaimType[]> => {
  try {
    logger.debug('Fetching all claim types from database');
    
    const { data, error } = await supabase
      .from('claim_types')
      .select('*')
      .order('name');

    if (error) {
      logger.error('Error fetching all claim types', error);
      throw error;
    }

    logger.debug('Loaded all claim types', { count: data?.length });
    return data || [];
  } catch (error) {
    logger.error('Error in getAllClaimTypes', error);
    throw error;
  }
};

export const deleteClaimType = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('claim_types')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting claim type', error);
      throw error;
    }
  } catch (error) {
    logger.error('Error in deleteClaimType', error);
    throw error;
  }
};

export const toggleClaimTypeStatus = async (id: string): Promise<ClaimType> => {
  try {
    // First get the current status
    const { data: currentData, error: fetchError } = await supabase
      .from('claim_types')
      .select('is_active')
      .eq('id', id)
      .single();

    if (fetchError) {
      logger.error('Error fetching current claim type status', fetchError);
      throw fetchError;
    }

    // Toggle the status
    const { data, error } = await supabase
      .from('claim_types')
      .update({ is_active: !currentData.is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error toggling claim type status', error);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Error in toggleClaimTypeStatus', error);
    throw error;
  }
};
