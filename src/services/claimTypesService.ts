
import { supabase } from '@/integrations/supabase/client';

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
    console.log('Fetching claim types from database...');
    
    const { data, error } = await supabase
      .from('claim_types')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching claim types:', error);
      throw error;
    }

    console.log('Loaded claim types:', data);
    return data || [];
  } catch (error) {
    console.error('Error in getClaimTypes:', error);
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
      console.error('Error creating claim type:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createClaimType:', error);
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
      console.error('Error updating claim type:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updateClaimType:', error);
    throw error;
  }
};
