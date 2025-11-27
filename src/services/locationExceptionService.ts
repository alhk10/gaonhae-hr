import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface LocationException {
  id: string;
  employee_id: string;
  reason: string;
  enabled: boolean;
  created_by: string;
  created_at: string;
  expires_at?: string;
  updated_at: string;
}

export const getLocationExceptions = async (employeeId?: string): Promise<LocationException[]> => {
  logger.debug('Fetching location exceptions', { employeeId });
  
  let query = supabase
    .from('location_exceptions')
    .select('*')
    .order('created_at', { ascending: false });

  if (employeeId) {
    query = query.eq('employee_id', employeeId);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Error fetching location exceptions', error);
    throw error;
  }

  logger.debug(`Fetched ${data?.length || 0} location exceptions`);
  return data || [];
};

export const createLocationException = async (exceptionData: {
  employee_id: string;
  reason: string;
  created_by: string;
  expires_at?: string;
}): Promise<void> => {
  logger.info('Creating location exception', { employeeId: exceptionData.employee_id });

  const { error } = await supabase
    .from('location_exceptions')
    .insert([{
      ...exceptionData,
      enabled: true
    }]);

  if (error) {
    logger.error('Error creating location exception', error);
    throw error;
  }
  
  logger.debug('Location exception created successfully');
};

export const updateLocationException = async (
  id: string, 
  updates: Partial<LocationException>
): Promise<void> => {
  logger.info('Updating location exception', { id });

  const { error } = await supabase
    .from('location_exceptions')
    .update(updates)
    .eq('id', id);

  if (error) {
    logger.error('Error updating location exception', error);
    throw error;
  }
  
  logger.debug('Location exception updated successfully');
};

export const deleteLocationException = async (id: string): Promise<void> => {
  logger.info('Deleting location exception', { id });

  const { error } = await supabase
    .from('location_exceptions')
    .delete()
    .eq('id', id);

  if (error) {
    logger.error('Error deleting location exception', error);
    throw error;
  }
  
  logger.debug('Location exception deleted successfully');
};

export const hasActiveLocationException = async (employeeId: string): Promise<boolean> => {
  logger.debug('Checking for active location exception', { employeeId });

  const { data, error } = await supabase
    .from('location_exceptions')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('enabled', true)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .maybeSingle();

  if (error) {
    logger.error('Error checking location exception', error);
    return false;
  }

  const hasException = !!data;
  logger.debug('Active location exception check result', { employeeId, hasException });
  return hasException;
};
