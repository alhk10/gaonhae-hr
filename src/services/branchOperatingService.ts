import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface BranchOperatingDay {
  id?: string;
  branch_id: string;
  weekday: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  is_open: boolean;
  open_time?: string | null;
  close_time?: string | null;
  notes?: string | null;
}

export interface BranchSchedule {
  branch_id: string;
  branch_name: string;
  days: BranchOperatingDay[];
}

export const WEEKDAYS = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

// Get operating schedule for a specific branch
export async function getBranchOperatingSchedule(branchId: string): Promise<BranchOperatingDay[]> {
  try {
    const { data, error } = await supabase
      .from('branch_operating_schedule')
      .select('*')
      .eq('branch_id', branchId)
      .order('weekday');

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('Failed to fetch branch operating schedule', error);
    return [];
  }
}

// Get all branch schedules
export async function getAllBranchSchedules(): Promise<BranchSchedule[]> {
  try {
    // Fetch all branches
    const { data: branches, error: branchError } = await supabase
      .from('branches')
      .select('id, name')
      .order('name');

    if (branchError) throw branchError;

    // Fetch all schedules
    const { data: schedules, error: scheduleError } = await supabase
      .from('branch_operating_schedule')
      .select('*')
      .order('weekday');

    if (scheduleError) throw scheduleError;

    const scheduleMap = (schedules || []).reduce((acc, s) => {
      if (!acc[s.branch_id]) acc[s.branch_id] = [];
      acc[s.branch_id].push(s);
      return acc;
    }, {} as Record<string, BranchOperatingDay[]>);

    return (branches || []).map(branch => ({
      branch_id: branch.id,
      branch_name: branch.name,
      days: scheduleMap[branch.id] || []
    }));
  } catch (error) {
    logger.error('Failed to fetch all branch schedules', error);
    return [];
  }
}

// Get operating days for a branch (returns array of weekday numbers that are open)
export async function getBranchOperatingDays(branchId: string): Promise<number[]> {
  try {
    const { data, error } = await supabase
      .from('branch_operating_schedule')
      .select('weekday')
      .eq('branch_id', branchId)
      .eq('is_open', true);

    if (error) throw error;
    
    // If no schedule configured, assume Mon-Fri (1-5)
    if (!data || data.length === 0) {
      return [1, 2, 3, 4, 5]; // Default: Monday to Friday
    }
    
    return data.map(d => d.weekday);
  } catch (error) {
    logger.error('Failed to fetch branch operating days', error);
    return [1, 2, 3, 4, 5]; // Default: Monday to Friday
  }
}

// Save operating schedule for a branch (upsert all days)
export async function saveBranchOperatingSchedule(
  branchId: string,
  days: Omit<BranchOperatingDay, 'branch_id'>[]
): Promise<void> {
  try {
    // Delete existing schedule for this branch
    const { error: deleteError } = await supabase
      .from('branch_operating_schedule')
      .delete()
      .eq('branch_id', branchId);

    if (deleteError) throw deleteError;

    // Insert new schedule
    if (days.length > 0) {
      const records = days.map(day => ({
        branch_id: branchId,
        weekday: day.weekday,
        is_open: day.is_open,
        open_time: day.open_time || null,
        close_time: day.close_time || null,
        notes: day.notes || null
      }));

      const { error: insertError } = await supabase
        .from('branch_operating_schedule')
        .insert(records);

      if (insertError) throw insertError;
    }
  } catch (error) {
    logger.error('Failed to save branch operating schedule', error);
    throw error;
  }
}

// Calculate teaching weeks considering branch operating days and breaks
export async function calculateTeachingWeeksWithSchedule(
  branchId: string,
  startDate: string,
  endDate: string,
  breaks: Array<{ start_date: string; end_date: string }> = []
): Promise<number> {
  try {
    const operatingDays = await getBranchOperatingDays(branchId);
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    let operatingDaysCount = 0;
    const current = new Date(start);
    
    while (current <= end) {
      const dayOfWeek = current.getDay(); // 0=Sunday, 6=Saturday
      
      // Check if this day is an operating day
      if (operatingDays.includes(dayOfWeek)) {
        // Check if this day falls within a break period
        const currentStr = current.toISOString().split('T')[0];
        const isInBreak = breaks.some(brk => {
          return currentStr >= brk.start_date && currentStr <= brk.end_date;
        });
        
        if (!isInBreak) {
          operatingDaysCount++;
        }
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    // Convert operating days to weeks (divide by number of operating days per week)
    const daysPerWeek = operatingDays.length || 5;
    return Math.round(operatingDaysCount / daysPerWeek);
  } catch (error) {
    logger.error('Failed to calculate teaching weeks', error);
    // Fallback to simple calculation
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.round(totalDays / 7);
  }
}
