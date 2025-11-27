import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface SystemAllowance {
  id: number;
  name: string;
  default_amount: number;
  description?: string;
  created_at: string;
}

export interface SystemDeduction {
  id: number;
  name: string;
  default_amount: number;
  description?: string;
  created_at: string;
}

export const getSystemAllowances = async (): Promise<SystemAllowance[]> => {
  try {
    const { data, error } = await supabase
      .from('system_allowances')
      .select('*')
      .order('name');
    
    if (error) {
      logger.error('Error fetching system allowances', error);
      throw error;
    }
    
    logger.debug(`Fetched ${data?.length || 0} system allowances`);
    return data || [];
  } catch (error) {
    logger.error('Exception in getSystemAllowances', error);
    throw error;
  }
};

export const addSystemAllowance = async (allowance: Omit<SystemAllowance, 'id' | 'created_at'>) => {
  const { data, error } = await supabase
    .from('system_allowances')
    .insert([allowance])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateSystemAllowance = async (id: number, updates: Partial<Omit<SystemAllowance, 'id' | 'created_at'>>) => {
  const { data, error } = await supabase
    .from('system_allowances')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const deleteSystemAllowance = async (id: number) => {
  const { error } = await supabase
    .from('system_allowances')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

export const getSystemDeductions = async (): Promise<SystemDeduction[]> => {
  try {
    const { data, error } = await supabase
      .from('system_deductions')
      .select('*')
      .order('name');
    
    if (error) {
      logger.error('Error fetching system deductions', error);
      throw error;
    }
    
    logger.debug(`Fetched ${data?.length || 0} system deductions`);
    return data || [];
  } catch (error) {
    logger.error('Exception in getSystemDeductions', error);
    throw error;
  }
};

export const addSystemDeduction = async (deduction: Omit<SystemDeduction, 'id' | 'created_at'>) => {
  const { data, error } = await supabase
    .from('system_deductions')
    .insert([deduction])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateSystemDeduction = async (id: number, updates: Partial<Omit<SystemDeduction, 'id' | 'created_at'>>) => {
  const { data, error } = await supabase
    .from('system_deductions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const deleteSystemDeduction = async (id: number) => {
  const { error } = await supabase
    .from('system_deductions')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};