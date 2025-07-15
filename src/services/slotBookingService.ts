import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';

export type SlotBooking = {
  id: string;
  created_at: string;
  employeeId: string;
  employeeName: string;
  date: string;
  branchId: string;
  branchName: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  notes?: string | null;
};

export type Branch = {
  id: string;
  created_at: string;
  name: string;
  color: string;
};

export type WeeklySlotConfig = {
  id: string;
  branchId: string;
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
};

export type EmployeeAttendanceStatus = {
  employeeId: string;
  date: string;
  hasClockedIn: boolean;
};

// Function to get all slot bookings
export const getAllSlotBookings = async (): Promise<SlotBooking[]> => {
  try {
    const { data, error } = await supabase
      .from('slot_bookings_new')
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching slot bookings:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAllSlotBookings:', error);
    return [];
  }
};

// Function to get all branches
export const getBranches = async (): Promise<Branch[]> => {
  try {
    const { data, error } = await supabase
      .from('branches_new')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching branches:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getBranches:', error);
    return [];
  }
};

// Function to update slot booking status
export const updateSlotBookingStatus = async (
  bookingId: string,
  status: 'approved' | 'rejected',
  approvedBy?: string
): Promise<boolean> => {
  try {
    console.log('Updating slot booking status:', { bookingId, status, approvedBy });

    const { error } = await supabase
      .from('slot_bookings_new')
      .update({
        status: status,
        notes: `Status updated to ${status} by ${approvedBy}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (error) {
      console.error('Error updating slot booking status:', error);
      return false;
    }

    console.log('Slot booking status updated successfully');
    return true;
  } catch (error) {
    console.error('Error in updateSlotBookingStatus:', error);
    return false;
  }
};

// Function to get weekly slot configuration
export const getWeeklySlotConfig = async (): Promise<{ [branchId: string]: WeeklySlotConfig }> => {
  try {
    const { data, error } = await supabase
      .from('weekly_slots_config_new')
      .select('*');

    if (error) {
      console.error('Error fetching weekly slot config:', error);
      return {};
    }

    const config: { [branchId: string]: WeeklySlotConfig } = {};
    data.forEach(item => {
      config[item.branchId] = item;
    });

    return config;
  } catch (error) {
    console.error('Error in getWeeklySlotConfig:', error);
    return {};
  }
};

// Function to update weekly slot configuration
export const updateWeeklySlotConfig = async (
  branchId: string,
  weeklyConfig: Omit<WeeklySlotConfig, 'id' | 'branchId'>
): Promise<boolean> => {
  try {
    console.log('Updating weekly slot config:', { branchId, weeklyConfig });

    const { data: existingData, error: existingError } = await supabase
      .from('weekly_slots_config_new')
      .select('*')
      .eq('branchId', branchId);

    if (existingError) {
      console.error('Error checking existing weekly slot config:', existingError);
      return false;
    }

    if (existingData && existingData.length > 0) {
      // Update existing record
      const { error } = await supabase
        .from('weekly_slots_config_new')
        .update(weeklyConfig)
        .eq('branchId', branchId);

      if (error) {
        console.error('Error updating weekly slot config:', error);
        return false;
      }
    } else {
      // Insert new record
      const { error } = await supabase
        .from('weekly_slots_config_new')
        .insert([{ branchId: branchId, ...weeklyConfig }]);

      if (error) {
        console.error('Error inserting weekly slot config:', error);
        return false;
      }
    }

    console.log('Weekly slot config updated successfully');
    return true;
  } catch (error) {
    console.error('Error in updateWeeklySlotConfig:', error);
    return false;
  }
};

// Function to cancel a slot booking
export const cancelSlotBooking = async (bookingId: string, cancelledBy: string): Promise<boolean> => {
  try {
    console.log('Cancelling slot booking:', { bookingId, cancelledBy });

    const { error } = await supabase
      .from('slot_bookings_new')
      .update({
        status: 'cancelled',
        notes: `Booking cancelled by ${cancelledBy}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (error) {
      console.error('Error cancelling slot booking:', error);
      return false;
    }

    console.log('Slot booking cancelled successfully');
    return true;
  } catch (error) {
    console.error('Error in cancelSlotBooking:', error);
    return false;
  }
};

// Function to update slot booking employee
export const updateSlotBookingEmployee = async (
  bookingId: string,
  newEmployeeId: string,
  newEmployeeName: string,
  notes?: string
): Promise<boolean> => {
  try {
    console.log('Updating slot booking employee:', {
      bookingId,
      newEmployeeId,
      newEmployeeName,
      notes
    });

    const { error } = await supabase
      .from('slot_bookings_new')
      .update({
        employeeId: newEmployeeId,
        employeeName: newEmployeeName,
        notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (error) {
      console.error('Error updating slot booking employee:', error);
      return false;
    }

    console.log('Slot booking employee updated successfully');
    return true;
  } catch (error) {
    console.error('Error in updateSlotBookingEmployee:', error);
    return false;
  }
};

// Function to get employee attendance status for a list of employees and dates
export const getEmployeeAttendanceStatus = async (
  employeeIds: string[],
  dates: string[]
): Promise<EmployeeAttendanceStatus[]> => {
  try {
    console.log('Fetching employee attendance status:', { employeeIds, dates });

    const { data, error } = await supabase
      .from('employee_attendance_status')
      .select('*')
      .in('employeeId', employeeIds)
      .in('date', dates);

    if (error) {
      console.error('Error fetching employee attendance status:', error);
      return [];
    }

    console.log('Employee attendance status fetched successfully');
    return data || [];
  } catch (error) {
    console.error('Error in getEmployeeAttendanceStatus:', error);
    return [];
  }
};

// Function to check for existing booking for a given employee and date
export const checkForExistingBooking = async (employeeId: string, date: string): Promise<boolean> => {
  try {
    console.log('Checking for existing booking:', { employeeId, date });

    const { data, error } = await supabase
      .from('slot_bookings_new')
      .select('*')
      .eq('employeeId', employeeId)
      .eq('date', date);

    if (error) {
      console.error('Error checking for existing booking:', error);
      return false;
    }

    const hasExistingBooking = data && data.length > 0;
    console.log('Existing booking check result:', hasExistingBooking);
    return hasExistingBooking;
  } catch (error) {
    console.error('Error in checkForExistingBooking:', error);
    return false;
  }
};

// New function to update slot booking branch
export const updateSlotBookingBranch = async (
  bookingId: string,
  newBranchId: string,
  newBranchName: string,
  notes?: string
): Promise<boolean> => {
  try {
    console.log('slotBookingService: Updating slot booking branch:', {
      bookingId,
      newBranchId,
      newBranchName,
      notes
    });

    const { error } = await supabase
      .from('slot_bookings_new')
      .update({
        branch_id: newBranchId,
        branch_name: newBranchName,
        notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (error) {
      console.error('slotBookingService: Error updating slot booking branch:', error);
      return false;
    }

    console.log('slotBookingService: Successfully updated slot booking branch');
    return true;
  } catch (error) {
    console.error('slotBookingService: Error in updateSlotBookingBranch:', error);
    return false;
  }
};
