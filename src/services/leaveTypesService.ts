
import { supabase } from '@/integrations/supabase/client';

export interface LeaveType {
  id: string;
  name: string;
  maxDays: number;
  requiresDocuments: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const getLeaveTypes = async (): Promise<LeaveType[]> => {
  console.log('Fetching leave types from database...');
  
  const { data, error } = await supabase
    .from('leave_types')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching leave types:', error);
    throw error;
  }

  return (data || []).map(type => ({
    id: type.id,
    name: type.name,
    maxDays: type.max_days,
    requiresDocuments: type.requires_documents,
    isActive: type.is_active,
    createdAt: type.created_at,
    updatedAt: type.updated_at
  }));
};

export const createLeaveType = async (leaveType: Omit<LeaveType, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveType> => {
  console.log('Creating leave type:', leaveType);
  
  const { data, error } = await supabase
    .from('leave_types')
    .insert([{
      name: leaveType.name,
      max_days: leaveType.maxDays,
      requires_documents: leaveType.requiresDocuments,
      is_active: leaveType.isActive
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating leave type:', error);
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    maxDays: data.max_days,
    requiresDocuments: data.requires_documents,
    isActive: data.is_active,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
};

export const updateLeaveType = async (id: string, updates: Partial<Omit<LeaveType, 'id' | 'createdAt' | 'updatedAt'>>): Promise<LeaveType> => {
  console.log('Updating leave type:', id, updates);
  
  const updateData: any = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.maxDays !== undefined) updateData.max_days = updates.maxDays;
  if (updates.requiresDocuments !== undefined) updateData.requires_documents = updates.requiresDocuments;
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

  const { data, error } = await supabase
    .from('leave_types')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating leave type:', error);
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    maxDays: data.max_days,
    requiresDocuments: data.requires_documents,
    isActive: data.is_active,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
};

export const deleteLeaveType = async (id: string): Promise<void> => {
  console.log('Soft deleting leave type:', id);
  
  const { error } = await supabase
    .from('leave_types')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    console.error('Error deleting leave type:', error);
    throw error;
  }
};
