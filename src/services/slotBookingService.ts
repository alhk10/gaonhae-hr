
import { supabase } from '@/integrations/supabase/client';
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

// Transform database row to SlotBooking type
const transformSlotBookingFromDB = (dbRow: any): SlotBooking => ({
  id: dbRow.id,
  created_at: dbRow.created_at,
  employeeId: dbRow.employee_id,
  employeeName: dbRow.employee_name,
  date: dbRow.date,
  branchId: dbRow.branch_id,
  branchName: dbRow.branch_name,
  status: dbRow.status,
  notes: dbRow.notes
});

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

    return (data || []).map(transformSlotBookingFromDB);
  } catch (error) {
    console.error('Error in getAllSlotBookings:', error);
    return [];
  }
};

// Function to get all branches
export const getBranches = async (): Promise<Branch[]> => {
  try {
    const { data, error } = await supabase
      .from('branches')
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

// Function to add a slot booking
export const addSlotBooking = async (booking: {
  employeeId: string;
  employeeName: string;
  branchId: string;
  branchName: string;
  date: string;
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
}): Promise<string> => {
  try {
    console.log('Adding slot booking:', booking);

    const { data, error } = await supabase
      .from('slot_bookings_new')
      .insert({
        employee_id: booking.employeeId,
        employee_name: booking.employeeName,
        branch_id: booking.branchId,
        branch_name: booking.branchName,
        date: booking.date,
        status: booking.status || 'pending'
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error adding slot booking:', error);
      throw new Error(`Failed to add slot booking: ${error.message}`);
    }

    console.log('Slot booking added successfully:', data.id);
    return data.id;
  } catch (error) {
    console.error('Error in addSlotBooking:', error);
    throw error;
  }
};

// Function to add an admin slot booking (auto-approved)
export const addAdminSlotBooking = async (booking: {
  employeeId: string;
  employeeName: string;
  branchId: string;
  branchName: string;
  date: string;
  notes?: string;
}): Promise<string> => {
  try {
    console.log('Adding admin slot booking:', booking);

    const { data, error } = await supabase
      .from('slot_bookings_new')
      .insert({
        employee_id: booking.employeeId,
        employee_name: booking.employeeName,
        branch_id: booking.branchId,
        branch_name: booking.branchName,
        date: booking.date,
        status: 'approved',
        notes: booking.notes || 'Admin booking - auto-approved',
        approved_on: new Date().toISOString().split('T')[0]
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error adding admin slot booking:', error);
      throw new Error(`Failed to add admin slot booking: ${error.message}`);
    }

    console.log('Admin slot booking added successfully:', data.id);
    return data.id;
  } catch (error) {
    console.error('Error in addAdminSlotBooking:', error);
    throw error;
  }
};

// Function to get employee slot bookings
export const getEmployeeSlotBookings = async (employeeId: string): Promise<SlotBooking[]> => {
  try {
    const { data, error } = await supabase
      .from('slot_bookings_new')
      .select('*')
      .eq('employee_id', employeeId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching employee slot bookings:', error);
      return [];
    }

    return (data || []).map(transformSlotBookingFromDB);
  } catch (error) {
    console.error('Error in getEmployeeSlotBookings:', error);
    return [];
  }
};

// Function to get branch slot bookings
export const getBranchSlotBookings = async (branchId: string): Promise<SlotBooking[]> => {
  try {
    const { data, error } = await supabase
      .from('slot_bookings_new')
      .select('*')
      .eq('branch_id', branchId)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching branch slot bookings:', error);
      return [];
    }

    return (data || []).map(transformSlotBookingFromDB);
  } catch (error) {
    console.error('Error in getBranchSlotBookings:', error);
    return [];
  }
};

// Function to update branch colors
export const updateBranchColors = async (): Promise<void> => {
  try {
    // This function can be used to initialize or update branch colors if needed
    console.log('Branch colors updated');
  } catch (error) {
    console.error('Error updating branch colors:', error);
  }
};

// Function to verify if employee exists
export const verifyEmployeeExists = async (employeeId: string): Promise<{ exists: boolean; employeeName?: string }> => {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('name')
      .eq('id', employeeId)
      .single();

    if (error || !data) {
      return { exists: false };
    }

    return { exists: true, employeeName: data.name };
  } catch (error) {
    console.error('Error verifying employee:', error);
    return { exists: false };
  }
};

// Function to get available slots for a date
export const getAvailableSlotsForDate = async (date: string, branchId: string): Promise<number> => {
  try {
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof WeeklySlotConfig;
    
    // Get weekly config for the branch
    const { data: configData, error: configError } = await supabase
      .from('weekly_slot_config')
      .select('*')
      .eq('branch_id', branchId)
      .single();

    if (configError || !configData) {
      console.error('Error fetching weekly config:', configError);
      return 0;
    }

    const totalSlots = configData[dayName] || 0;

    // Get existing bookings for this date and branch
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('slot_bookings_new')
      .select('id')
      .eq('date', date)
      .eq('branch_id', branchId)
      .neq('status', 'cancelled');

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      return 0;
    }

    const bookedSlots = bookingsData?.length || 0;
    return Math.max(0, totalSlots - bookedSlots);
  } catch (error) {
    console.error('Error in getAvailableSlotsForDate:', error);
    return 0;
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
      .from('weekly_slot_config')
      .select('*');

    if (error) {
      console.error('Error fetching weekly slot config:', error);
      return {};
    }

    const config: { [branchId: string]: WeeklySlotConfig } = {};
    (data || []).forEach(item => {
      config[item.branch_id] = {
        id: item.id,
        branchId: item.branch_id,
        monday: item.monday,
        tuesday: item.tuesday,
        wednesday: item.wednesday,
        thursday: item.thursday,
        friday: item.friday,
        saturday: item.saturday,
        sunday: item.sunday
      };
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
      .from('weekly_slot_config')
      .select('*')
      .eq('branch_id', branchId);

    if (existingError) {
      console.error('Error checking existing weekly slot config:', existingError);
      return false;
    }

    if (existingData && existingData.length > 0) {
      // Update existing record
      const { error } = await supabase
        .from('weekly_slot_config')
        .update(weeklyConfig)
        .eq('branch_id', branchId);

      if (error) {
        console.error('Error updating weekly slot config:', error);
        return false;
      }
    } else {
      // Insert new record
      const { error } = await supabase
        .from('weekly_slot_config')
        .insert([{ branch_id: branchId, ...weeklyConfig }]);

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
        employee_id: newEmployeeId,
        employee_name: newEmployeeName,
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

    // Since employee_attendance_status table doesn't exist, we'll check attendance table
    const { data, error } = await supabase
      .from('attendance')
      .select('employee_id, date, check_in')
      .in('employee_id', employeeIds)
      .in('date', dates);

    if (error) {
      console.error('Error fetching employee attendance status:', error);
      return [];
    }

    const attendanceStatus: EmployeeAttendanceStatus[] = (data || []).map(record => ({
      employeeId: record.employee_id,
      date: record.date,
      hasClockedIn: !!record.check_in
    }));

    console.log('Employee attendance status fetched successfully');
    return attendanceStatus;
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
      .eq('employee_id', employeeId)
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

// Function to update slot booking branch
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
