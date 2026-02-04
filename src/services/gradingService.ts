/**
 * Grading Service
 * Handles CRUD operations for grading slots and registrations
 */

import { supabase } from '@/integrations/supabase/client';

export interface GradingSlot {
  id: string;
  branch_id: string;
  grading_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  examiner_name: string | null;
  belt_levels: string[] | null;
  max_capacity: number;
  status: 'active' | 'cancelled' | 'completed';
  notes: string | null;
  title: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  // Computed fields
  branch_name?: string;
  registration_count?: number;
}

export interface GradingRegistration {
  id: string;
  grading_slot_id: string;
  student_id: string;
  invoice_item_id: string | null;
  current_belt: string;
  target_belt: string;
  result: 'pass' | 'fail' | 'double' | 'confirmed' | 'conditional_pass' | null;
  certificate_issued: boolean;
  certificate_ii_issued: boolean;
  ready_for_grading: boolean;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  // Joined fields
  student_name?: string;
}

export interface CreateGradingSlotData {
  branch_id: string;
  grading_date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  examiner_name?: string;
  belt_levels?: string[];
  max_capacity?: number;
  notes?: string;
  title?: string;
}

export interface UpdateGradingSlotData extends Partial<CreateGradingSlotData> {
  status?: 'active' | 'cancelled' | 'completed';
}

// Get all grading slots with optional filters
export const getGradingSlots = async (filters?: {
  branch_id?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
}): Promise<GradingSlot[]> => {
  let query = supabase
    .from('grading_slots')
    .select(`
      *,
      branches:branch_id (name)
    `)
    .order('grading_date', { ascending: true });

  if (filters?.branch_id) {
    query = query.eq('branch_id', filters.branch_id);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.from_date) {
    query = query.gte('grading_date', filters.from_date);
  }
  if (filters?.to_date) {
    query = query.lte('grading_date', filters.to_date);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching grading slots:', error);
    throw error;
  }

  // Get registration counts
  const slotIds = (data || []).map(s => s.id);
  const { data: regCounts } = await supabase
    .from('grading_registrations')
    .select('grading_slot_id')
    .in('grading_slot_id', slotIds);

  const countMap: Record<string, number> = {};
  (regCounts || []).forEach(r => {
    countMap[r.grading_slot_id] = (countMap[r.grading_slot_id] || 0) + 1;
  });

  return (data || []).map(slot => ({
    ...slot,
    branch_name: (slot.branches as any)?.name || '',
    registration_count: countMap[slot.id] || 0
  })) as GradingSlot[];
};

// Get a single grading slot by ID
export const getGradingSlotById = async (id: string): Promise<GradingSlot | null> => {
  const { data, error } = await supabase
    .from('grading_slots')
    .select(`
      *,
      branches:branch_id (name)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching grading slot:', error);
    throw error;
  }

  return data ? {
    ...data,
    branch_name: (data.branches as any)?.name || ''
  } as GradingSlot : null;
};

// Create a new grading slot
export const createGradingSlot = async (slotData: CreateGradingSlotData): Promise<GradingSlot> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('grading_slots')
    .insert({
      ...slotData,
      created_by: user?.email || null,
      updated_by: user?.email || null
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating grading slot:', error);
    throw error;
  }

  return data as GradingSlot;
};

// Update a grading slot
export const updateGradingSlot = async (id: string, updates: UpdateGradingSlotData): Promise<GradingSlot> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('grading_slots')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
      updated_by: user?.email || null
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating grading slot:', error);
    throw error;
  }

  return data as GradingSlot;
};

// Delete a grading slot
export const deleteGradingSlot = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('grading_slots')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting grading slot:', error);
    throw error;
  }
};

// Get registrations for a grading slot
export const getGradingRegistrations = async (slotId: string): Promise<GradingRegistration[]> => {
  const { data, error } = await supabase
    .from('grading_registrations')
    .select(`
      *,
      students:student_id (first_name, last_name)
    `)
    .eq('grading_slot_id', slotId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching grading registrations:', error);
    throw error;
  }

  return (data || []).map(reg => ({
    ...reg,
    student_name: reg.students 
      ? `${(reg.students as any).first_name} ${(reg.students as any).last_name}`
      : ''
  })) as GradingRegistration[];
};

// Register a student for grading
export const registerStudentForGrading = async (registration: {
  grading_slot_id: string;
  student_id: string;
  current_belt: string;
  target_belt: string;
  invoice_item_id?: string;
  notes?: string;
}): Promise<GradingRegistration> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('grading_registrations')
    .insert({
      ...registration,
      created_by: user?.email || null
    })
    .select()
    .single();

  if (error) {
    console.error('Error registering student:', error);
    throw error;
  }

  return data as GradingRegistration;
};

// Update registration result
export const updateGradingResult = async (
  registrationId: string, 
  result: 'pass' | 'fail' | 'conditional_pass',
  notes?: string
): Promise<GradingRegistration> => {
  const { data, error } = await supabase
    .from('grading_registrations')
    .update({ result, notes })
    .eq('id', registrationId)
    .select()
    .single();

  if (error) {
    console.error('Error updating grading result:', error);
    throw error;
  }

  return data as GradingRegistration;
};

// Mark certificate as issued
export const markCertificateIssued = async (registrationId: string): Promise<void> => {
  const { error } = await supabase
    .from('grading_registrations')
    .update({ certificate_issued: true })
    .eq('id', registrationId);

  if (error) {
    console.error('Error marking certificate issued:', error);
    throw error;
  }
};

// Remove registration
export const removeGradingRegistration = async (registrationId: string): Promise<void> => {
  const { error } = await supabase
    .from('grading_registrations')
    .delete()
    .eq('id', registrationId);

  if (error) {
    console.error('Error removing registration:', error);
    throw error;
  }
};
