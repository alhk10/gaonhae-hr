
import { supabase } from '@/integrations/supabase/client';

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
  console.log('Fetching location exceptions for employee:', employeeId);
  
  let query = supabase
    .from('location_exceptions')
    .select('*')
    .order('created_at', { ascending: false });

  if (employeeId) {
    query = query.eq('employee_id', employeeId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching location exceptions:', error);
    throw error;
  }

  return data || [];
};

export const createLocationException = async (exceptionData: {
  employee_id: string;
  reason: string;
  created_by: string;
  expires_at?: string;
}): Promise<void> => {
  console.log('Creating location exception:', exceptionData);

  const { error } = await supabase
    .from('location_exceptions')
    .insert([{
      ...exceptionData,
      enabled: true
    }]);

  if (error) {
    console.error('Error creating location exception:', error);
    throw error;
  }
};

export const updateLocationException = async (
  id: string, 
  updates: Partial<LocationException>
): Promise<void> => {
  console.log('Updating location exception:', id, updates);

  const { error } = await supabase
    .from('location_exceptions')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating location exception:', error);
    throw error;
  }
};

export const deleteLocationException = async (id: string): Promise<void> => {
  console.log('Deleting location exception:', id);

  const { error } = await supabase
    .from('location_exceptions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting location exception:', error);
    throw error;
  }
};

export const hasActiveLocationException = async (employeeId: string): Promise<boolean> => {
  console.log('Checking for active location exception:', employeeId);

  const { data, error } = await supabase
    .from('location_exceptions')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('enabled', true)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .maybeSingle();

  if (error) {
    console.error('Error checking location exception:', error);
    return false;
  }

  return !!data;
};
