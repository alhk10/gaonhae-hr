
import { supabase } from '@/integrations/supabase/client';

export interface AttendanceSetting {
  id: string;
  branch_name: string;
  monday_start: string | null;
  monday_end: string | null;
  tuesday_start: string | null;
  tuesday_end: string | null;
  wednesday_start: string | null;
  wednesday_end: string | null;
  thursday_start: string | null;
  thursday_end: string | null;
  friday_start: string | null;
  friday_end: string | null;
  saturday_start: string | null;
  saturday_end: string | null;
  sunday_start: string | null;
  sunday_end: string | null;
  grace_period_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const getAttendanceSettings = async (): Promise<AttendanceSetting[]> => {
  const { data, error } = await supabase
    .from('attendance_settings')
    .select('*')
    .eq('is_active', true)
    .order('branch_name');

  if (error) {
    console.error('Error fetching attendance settings:', error);
    throw error;
  }

  return data || [];
};

export const getAttendanceSettingByBranch = async (branchName: string): Promise<AttendanceSetting | null> => {
  const { data, error } = await supabase
    .from('attendance_settings')
    .select('*')
    .eq('branch_name', branchName)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    console.error('Error fetching attendance setting:', error);
    throw error;
  }

  return data;
};

export const isLateArrival = (checkInTime: string, dayOfWeek: string, setting: AttendanceSetting): boolean => {
  const dayKey = `${dayOfWeek.toLowerCase()}_start` as keyof AttendanceSetting;
  const startTime = setting[dayKey] as string;
  
  if (!startTime) return false;

  const checkIn = new Date(`2000-01-01T${checkInTime}`);
  const expectedStart = new Date(`2000-01-01T${startTime}`);
  const graceEnd = new Date(expectedStart.getTime() + setting.grace_period_minutes * 60000);

  return checkIn > graceEnd;
};

export const getWorkingHoursForDay = (dayOfWeek: string, setting: AttendanceSetting): { start: string | null, end: string | null } => {
  const dayLower = dayOfWeek.toLowerCase();
  const startKey = `${dayLower}_start` as keyof AttendanceSetting;
  const endKey = `${dayLower}_end` as keyof AttendanceSetting;
  
  return {
    start: setting[startKey] as string | null,
    end: setting[endKey] as string | null
  };
};

export const calculateExpectedHours = (dayOfWeek: string, setting: AttendanceSetting): number => {
  const workingHours = getWorkingHoursForDay(dayOfWeek, setting);
  
  if (!workingHours.start || !workingHours.end) return 8; // Default 8 hours
  
  const start = new Date(`2000-01-01T${workingHours.start}`);
  const end = new Date(`2000-01-01T${workingHours.end}`);
  
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
};
