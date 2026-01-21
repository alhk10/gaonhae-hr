import { supabase } from '@/integrations/supabase/client';

export interface ClassSchedule {
  id: string;
  branch_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  class_type: string;
  age_group: string | null;
  age_from: number | null;
  age_to: number | null;
  belt_levels: string[] | null;
  belt_range_min: string | null;
  belt_range_max: string | null;
  max_capacity: number | null;
  instructor_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClassScheduleInput {
  branch_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  class_type: string;
  age_group?: string | null;
  age_from?: number | null;
  age_to?: number | null;
  belt_levels?: string[] | null;
  belt_range_min?: string | null;
  belt_range_max?: string | null;
  max_capacity?: number | null;
  instructor_name?: string | null;
  is_active?: boolean;
}

export const WEEKDAYS = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' }
];

export const CLASS_TYPES = [
  'Little Gaonhae',
  'Junior',
  'Kids',
  'Teens & Adults',
  'Competition',
  'Team Gaonhae Poomsae',
  'Team Gaonhae Kyorugi',
  'Kang Klass'
];

export const BELT_LEVELS = [
  'White',
  'Yellow',
  'Orange',
  'Green',
  'Blue',
  'Purple',
  'Brown',
  'Red',
  'Black 1st Dan',
  'Black 2nd Dan',
  'Black 3rd Dan',
  'Black 4th Dan',
  'Black 5th Dan'
];

export async function getClassSchedules(branchId?: string): Promise<ClassSchedule[]> {
  let query = supabase
    .from('branch_timetables')
    .select('*')
    .order('weekday', { ascending: true })
    .order('start_time', { ascending: true });

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching class schedules:', error);
    throw error;
  }

  return (data || []).map(item => ({
    id: item.id,
    branch_id: item.branch_id,
    weekday: item.weekday,
    start_time: item.start_time,
    end_time: item.end_time,
    class_type: item.class_type,
    age_group: item.age_group,
    age_from: (item as any).age_from ?? null,
    age_to: (item as any).age_to ?? null,
    belt_levels: (item as any).belt_levels ?? null,
    belt_range_min: item.belt_range_min,
    belt_range_max: item.belt_range_max,
    max_capacity: item.max_capacity,
    instructor_name: item.instructor_name,
    is_active: item.is_active ?? true,
    created_at: item.created_at,
    updated_at: item.updated_at
  }));
}

export async function getClassSchedule(id: string): Promise<ClassSchedule | null> {
  const { data, error } = await supabase
    .from('branch_timetables')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching class schedule:', error);
    throw error;
  }

  if (!data) return null;

  return {
    id: data.id,
    branch_id: data.branch_id,
    weekday: data.weekday,
    start_time: data.start_time,
    end_time: data.end_time,
    class_type: data.class_type,
    age_group: data.age_group,
    age_from: (data as any).age_from ?? null,
    age_to: (data as any).age_to ?? null,
    belt_levels: (data as any).belt_levels ?? null,
    belt_range_min: data.belt_range_min,
    belt_range_max: data.belt_range_max,
    max_capacity: data.max_capacity,
    instructor_name: data.instructor_name,
    is_active: data.is_active ?? true,
    created_at: data.created_at,
    updated_at: data.updated_at
  };
}

export async function createClassSchedule(input: ClassScheduleInput): Promise<string> {
  const { data, error } = await supabase
    .from('branch_timetables')
    .insert({
      branch_id: input.branch_id,
      weekday: input.weekday,
      start_time: input.start_time,
      end_time: input.end_time,
      class_type: input.class_type,
      age_group: input.age_group || null,
      age_from: input.age_from || null,
      age_to: input.age_to || null,
      belt_levels: input.belt_levels || null,
      belt_range_min: input.belt_range_min || null,
      belt_range_max: input.belt_range_max || null,
      max_capacity: input.max_capacity || null,
      instructor_name: input.instructor_name || null,
      is_active: input.is_active ?? true
    } as any)
    .select('id')
    .single();

  if (error) {
    console.error('Error creating class schedule:', error);
    throw error;
  }

  return data.id;
}

export async function updateClassSchedule(id: string, input: Partial<ClassScheduleInput>): Promise<void> {
  const { error } = await supabase
    .from('branch_timetables')
    .update({
      ...input,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) {
    console.error('Error updating class schedule:', error);
    throw error;
  }
}

export async function deleteClassSchedule(id: string): Promise<void> {
  const { error } = await supabase
    .from('branch_timetables')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting class schedule:', error);
    throw error;
  }
}

export function getClassesByDay(classes: ClassSchedule[], weekday: number): ClassSchedule[] {
  return classes
    .filter(c => c.weekday === weekday)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}
