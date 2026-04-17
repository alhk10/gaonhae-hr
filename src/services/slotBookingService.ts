import { supabase } from '@/integrations/supabase/client';

import { logger } from '@/utils/logger';
import { formatDate } from '@/utils/dateFormat';

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
  calculatedPay?: number; // Calculated pay for the slot (from November 2024 onwards)
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
  // Use current display_name from employees table if available, otherwise fall back to stored employee_name
  employeeName: dbRow.employees?.display_name || dbRow.employees?.name || dbRow.employee_name,
  date: dbRow.date,
  branchId: dbRow.branch_id,
  branchName: dbRow.branch_name,
  status: dbRow.status,
  notes: dbRow.notes
});

// Function to generate a unique booking ID
const generateBookingId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `booking_${timestamp}_${random}`;
};

// Function to get all slot bookings
export const getAllSlotBookings = async (): Promise<SlotBooking[]> => {
  try {
    const { data, error } = await supabase
      .from('slot_bookings_new')
      .select(`
        *,
        employees:employee_id (
          name,
          display_name
        )
      `)
      .order('date', { ascending: true });

    if (error) {
      logger.error('Error fetching slot bookings', error);
      return [];
    }

    return (data || []).map(transformSlotBookingFromDB);
  } catch (error) {
    logger.error('Error in getAllSlotBookings', error);
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
      logger.error('Error fetching branches', error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Error in getBranches', error);
    return [];
  }
};

// Function to add a slot booking with enhanced validation
export const addSlotBooking = async (booking: {
  employeeId: string;
  employeeName: string;
  branchId: string;
  branchName: string;
  date: string;
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
}): Promise<string> => {
  try {
    logger.info('Adding slot booking', { booking });

    // Log booking attempt for diagnostics
    try {
      await supabase.rpc('log_booking_attempt', {
        p_employee_id: booking.employeeId,
        p_employee_name: booking.employeeName,
        p_booking_date: booking.date,
        p_branch_id: booking.branchId,
        p_attempt_result: 'started',
        p_error_details: null
      });
    } catch (logError) {
      logger.warn('Failed to log booking attempt', logError);
    }

    // Check for existing booking first
    const existingBooking = await checkForExistingBooking(booking.employeeId, booking.date);
    if (existingBooking) {
      const errorMsg = `Employee ${booking.employeeName} already has a booking for ${booking.date}`;
      logger.error(errorMsg);
      
      // Log the failure
      try {
        await supabase.rpc('log_booking_failure', {
          employee_email: booking.employeeId,
          employee_name: booking.employeeName,
          booking_date: booking.date,
          branch_id: booking.branchId,
          failure_reason: 'Duplicate booking attempt',
          system_details: { existing_booking: true }
        });
      } catch (logError) {
        logger.warn('Failed to log booking failure', logError);
      }
      
      throw new Error(errorMsg);
    }

    // Check slot availability
    const availableSlots = await getAvailableSlotsForDate(booking.date, booking.branchId);
    if (availableSlots <= 0) {
      const errorMsg = `No available slots for ${booking.branchName} on ${booking.date}`;
      logger.error(errorMsg);
      
      // Log the failure
      try {
        await supabase.rpc('log_booking_failure', {
          employee_email: booking.employeeId,
          employee_name: booking.employeeName,
          booking_date: booking.date,
          branch_id: booking.branchId,
          failure_reason: 'No slots available',
          system_details: { available_slots: availableSlots }
        });
      } catch (logError) {
        logger.warn('Failed to log booking failure', logError);
      }
      
      throw new Error(errorMsg);
    }

    const bookingId = generateBookingId();
    const insertData = {
      id: bookingId,
      employee_id: booking.employeeId,
      employee_name: booking.employeeName,
      branch_id: booking.branchId,
      branch_name: booking.branchName,
      date: booking.date,
      status: booking.status || 'pending'
    };

    const { data, error } = await supabase
      .from('slot_bookings_new')
      .insert(insertData)
      .select('id')
      .single();

    if (error) {
      logger.error('Error adding slot booking', error);
      
      // Log the failure
      try {
        await supabase.rpc('log_booking_failure', {
          employee_email: booking.employeeId,
          employee_name: booking.employeeName,
          booking_date: booking.date,
          branch_id: booking.branchId,
          failure_reason: 'Database insertion failed',
          system_details: { error: error.message, code: error.code }
        });
      } catch (logError) {
        logger.warn('Failed to log booking failure', logError);
      }
      
      throw new Error(`Failed to add slot booking: ${error.message}`);
    }

    logger.info('Slot booking added successfully', { id: data.id });
    return data.id;
  } catch (error) {
    logger.error('Error in addSlotBooking', error);
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
  allowRebook?: boolean;
}): Promise<string> => {
  try {
    logger.info('Adding admin slot booking', { booking });

    // For admin bookings, bypass normal validation but still check for non-cancelled bookings
    const { data: existingBookings, error: existingError } = await supabase
      .from('slot_bookings_new')
      .select('*')
      .eq('employee_id', booking.employeeId)
      .eq('date', booking.date)
      .not('status', 'in', '("cancelled","rejected")');

    if (existingError) {
      logger.error('Error checking existing bookings for admin override', existingError);
    } else if (existingBookings && existingBookings.length > 0) {
      if (booking.allowRebook) {
        // Cancel existing bookings when rebooking is allowed
        logger.info('Admin override: Cancelling existing bookings for rebooking', { 
          employeeId: booking.employeeId, 
          date: booking.date,
          existingCount: existingBookings.length 
        });
        
        for (const existingBooking of existingBookings) {
          const { error: cancelError } = await supabase
            .from('slot_bookings_new')
            .update({ status: 'cancelled', notes: `Cancelled for rebooking - ${existingBooking.notes || ''}` })
            .eq('id', existingBooking.id);
          
          if (cancelError) {
            logger.error('Error cancelling existing booking for rebook', cancelError);
            throw new Error(`Failed to cancel existing booking: ${cancelError.message}`);
          }
        }
      } else {
        const errorMsg = `Employee ${booking.employeeName} already has an active booking for ${booking.date}`;
        logger.error(errorMsg);
        throw new Error(errorMsg);
      }
    }

    const bookingId = `ADMIN_${booking.employeeId.replace('EMP', '')}_${Date.now()}`;
    const insertData = {
      id: bookingId,
      employee_id: booking.employeeId,
      employee_name: booking.employeeName,
      branch_id: booking.branchId,
      branch_name: booking.branchName,
      date: booking.date,
      status: 'approved',
      notes: booking.notes || 'Admin booking - auto-approved',
      approved_by: 'System Admin',
      approved_on: new Date().toISOString().split('T')[0]
    };

    const { data, error } = await supabase
      .from('slot_bookings_new')
      .insert(insertData)
      .select('id')
      .single();

    if (error) {
      logger.error('Error adding admin slot booking', error);
      throw new Error(`Failed to add admin slot booking: ${error.message}`);
    }

    logger.info('Admin slot booking added successfully', { id: data.id });
    return data.id;
  } catch (error) {
    logger.error('Error in addAdminSlotBooking', error);
    throw error;
  }
};

// Function to force book slots for Jason Lu at Kembangan (emergency fix)
export const forceBookJasonSlots = async (): Promise<{ success: boolean; bookings: string[]; errors: string[] }> => {
  const result = { success: true, bookings: [], errors: [] };
  const dates = ['2025-08-03', '2025-08-10', '2025-08-16'];
  
  try {
    logger.info('Force booking Jason Lu slots', { dates });
    
    for (const date of dates) {
      try {
        const bookingId = await addAdminSlotBooking({
          employeeId: 'EMP1751007228999',
          employeeName: 'Jason Lu Lijie',
          branchId: 'kembangan',
          branchName: 'Kembangan',
          date: date,
          notes: 'Emergency fix - Admin force booking for Jason Lu'
        });
        result.bookings.push(bookingId);
        logger.info(`Successfully force booked Jason Lu for ${date}`, { bookingId });
      } catch (error) {
        const errorMsg = `Failed to book ${date}: ${error.message}`;
        result.errors.push(errorMsg);
        logger.error(errorMsg);
        result.success = false;
      }
    }
    
    logger.info('Force booking result', { result });
    return result;
  } catch (error) {
    logger.error('Error in forceBookJasonSlots', error);
    result.success = false;
    result.errors.push(error.message);
    return result;
  }
};

// Function to create emergency booking for employee (general purpose)
export const createEmergencyBooking = async (
  employeeId: string,
  employeeName: string,
  branchId: string,
  branchName: string,
  date: string,
  notes?: string
): Promise<{ success: boolean; bookingId?: string; error?: string }> => {
  try {
    logger.info(`Creating emergency booking for ${employeeName} at ${branchName} on ${date}`);
    
    // First, check if employee already has a booking for this date
    const { data: existingBookings, error: checkError } = await supabase
      .from('slot_bookings_new')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', date)
      .neq('status', 'cancelled');

    if (checkError) {
      logger.error('Error checking existing bookings', checkError);
      return { success: false, error: 'Failed to check existing bookings' };
    }

    if (existingBookings && existingBookings.length > 0) {
      const existing = existingBookings[0];
      return { 
        success: false, 
        error: `Employee already has a ${existing.status} booking for ${date} at ${existing.branch_name}` 
      };
    }

    // Create the emergency booking
    const bookingId = await addAdminSlotBooking({
      employeeId,
      employeeName,
      branchId,
      branchName,
      date,
      notes: notes || `Emergency booking created by admin for ${employeeName}`
    });

    logger.info(`Emergency booking created successfully`, { bookingId });
    return { success: true, bookingId };
    
  } catch (error) {
    logger.error('Error creating emergency booking', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
};

// Function to get employee slot bookings
export const getEmployeeSlotBookings = async (employeeId: string): Promise<SlotBooking[]> => {
  try {
    const { data, error } = await supabase
      .from('slot_bookings_new')
      .select(`
        *,
        employees:employee_id (
          name,
          display_name
        )
      `)
      .eq('employee_id', employeeId)
      .order('date', { ascending: false });

    if (error) {
      logger.error('Error fetching employee slot bookings', error);
      return [];
    }

    return (data || []).map(transformSlotBookingFromDB);
  } catch (error) {
    logger.error('Error in getEmployeeSlotBookings', error);
    return [];
  }
};

// Function to get branch slot bookings
export const getBranchSlotBookings = async (branchId: string): Promise<SlotBooking[]> => {
  try {
    const { data, error } = await supabase
      .from('slot_bookings_new')
      .select(`
        *,
        employees:employee_id (
          name,
          display_name
        )
      `)
      .eq('branch_id', branchId)
      .order('date', { ascending: true });

    if (error) {
      logger.error('Error fetching branch slot bookings', error);
      return [];
    }

    return (data || []).map(transformSlotBookingFromDB);
  } catch (error) {
    logger.error('Error in getBranchSlotBookings', error);
    return [];
  }
};

// Function to update branch colors
export const updateBranchColors = async (): Promise<void> => {
  try {
    logger.debug('Branch colors updated');
  } catch (error) {
    logger.error('Error updating branch colors', error);
  }
};

// Function to verify if employee exists
export const verifyEmployeeExists = async (employeeId: string): Promise<{ exists: boolean; employeeName?: string }> => {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('name, display_name')
      .eq('id', employeeId)
      .single();

    if (error || !data) {
      return { exists: false };
    }

    return { exists: true, employeeName: data.display_name || data.name };
  } catch (error) {
    logger.error('Error verifying employee', error);
    return { exists: false };
  }
};

// Function to get available slots for a date with enhanced validation
export const getAvailableSlotsForDate = async (date: string, branchId: string): Promise<number> => {
  try {
    logger.debug(`Getting available slots for ${branchId} on ${date}`);
    
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof WeeklySlotConfig;
    
    const { data: configData, error: configError } = await supabase
      .from('weekly_slot_config')
      .select('*')
      .eq('branch_id', branchId)
      .single();

    if (configError || !configData) {
      logger.error(`Error fetching weekly config for ${branchId}`, configError);
      return 0;
    }

    // Handle null values as 0 slots
    const totalSlots = configData[dayName] ?? 0;
    logger.debug(`Total ${dayName} slots for ${branchId}`, { totalSlots });

    // Only count non-cancelled bookings
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('slot_bookings_new')
      .select('id, status, employee_name')
      .eq('date', date)
      .eq('branch_id', branchId)
      .neq('status', 'cancelled');

    if (bookingsError) {
      logger.error(`Error fetching bookings for ${branchId} on ${date}`, bookingsError);
      return 0;
    }

    const bookedSlots = bookingsData?.length || 0;
    const availableSlots = Math.max(0, totalSlots - bookedSlots);
    
    logger.debug(`Slots calculation for ${branchId} on ${date}`, {
      totalSlots,
      bookedSlots,
      availableSlots,
      activeBookings: bookingsData?.map(b => ({ status: b.status, employee: b.employee_name }))
    });
    
    return availableSlots;
  } catch (error) {
    logger.error('Error in getAvailableSlotsForDate', error);
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
    logger.info('Updating slot booking status', { bookingId, status, approvedBy });

    const { error } = await supabase
      .from('slot_bookings_new')
      .update({
        status: status,
        notes: `Status updated to ${status} by ${approvedBy}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (error) {
      logger.error('Error updating slot booking status', error);
      return false;
    }

    logger.info('Slot booking status updated successfully');
    return true;
  } catch (error) {
    logger.error('Error in updateSlotBookingStatus', error);
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
      logger.error('Error fetching weekly slot config', error);
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
    logger.error('Error in getWeeklySlotConfig', error);
    return {};
  }
};

// Function to update weekly slot configuration
export const updateWeeklySlotConfig = async (
  branchId: string,
  weeklyConfig: Omit<WeeklySlotConfig, 'id' | 'branchId'>
): Promise<boolean> => {
  try {
    logger.info('Upserting weekly slot config for branch', { branchId, weeklyConfig });

    // Use upsert to handle both insert and update in one operation
    const { data, error } = await supabase
      .from('weekly_slot_config')
      .upsert(
        { 
          branch_id: branchId, 
          ...weeklyConfig 
        },
        { 
          onConflict: 'branch_id',
          ignoreDuplicates: false 
        }
      )
      .select('*')
      .single();

    if (error) {
      logger.error('Error upserting weekly slot config', {
        branchId,
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      return false;
    }

    logger.info('Weekly slot config upserted successfully', { data });
    return true;
  } catch (error) {
    logger.error('Exception in updateWeeklySlotConfig', error);
    return false;
  }
};

// Function to cancel a slot booking
export const cancelSlotBooking = async (bookingId: string, cancelledBy: string): Promise<boolean> => {
  try {
    logger.info('Cancelling slot booking', { bookingId, cancelledBy });

    const { error } = await supabase
      .from('slot_bookings_new')
      .update({
        status: 'cancelled',
        notes: `Booking cancelled by ${cancelledBy}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (error) {
      logger.error('Error cancelling slot booking', error);
      return false;
    }

    logger.info('Slot booking cancelled successfully');
    return true;
  } catch (error) {
    logger.error('Error in cancelSlotBooking', error);
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
    logger.info('Updating slot booking employee', {
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
      logger.error('Error updating slot booking employee', error);
      return false;
    }

    logger.info('Slot booking employee updated successfully');
    return true;
  } catch (error) {
    logger.error('Error in updateSlotBookingEmployee', error);
    return false;
  }
};

// Function to get employee attendance status for a list of employees and dates
export const getEmployeeAttendanceStatus = async (
  employeeIds: string[],
  dates: string[]
): Promise<EmployeeAttendanceStatus[]> => {
  try {
    logger.debug('Fetching employee attendance status', { employeeIds, dates });

    const { data, error } = await supabase
      .from('attendance')
      .select('employee_id, date, check_in')
      .in('employee_id', employeeIds)
      .in('date', dates);

    if (error) {
      logger.error('Error fetching employee attendance status', error);
      return [];
    }

    const attendanceStatus: EmployeeAttendanceStatus[] = (data || []).map(record => ({
      employeeId: record.employee_id,
      date: record.date,
      hasClockedIn: !!record.check_in
    }));

    logger.debug('Employee attendance status fetched successfully');
    return attendanceStatus;
  } catch (error) {
    logger.error('Error in getEmployeeAttendanceStatus', error);
    return [];
  }
};

// Function to check for existing booking for a given employee and date
export const checkForExistingBooking = async (employeeId: string, date: string): Promise<boolean> => {
  try {
    logger.debug('Checking for existing booking', { employeeId, date });

    const { data, error } = await supabase
      .from('slot_bookings_new')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', date)
      .not('status', 'in', '("cancelled","rejected")'); // Exclude cancelled and rejected bookings

    if (error) {
      logger.error('Error checking for existing booking', error);
      return false;
    }

    const hasExistingBooking = data && data.length > 0;
    logger.debug('Existing booking check result', { hasExistingBooking });
    return hasExistingBooking;
  } catch (error) {
    logger.error('Error in checkForExistingBooking', error);
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
    logger.info('Updating slot booking branch', {
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
      logger.error('Error updating slot booking branch', error);
      return false;
    }

    logger.info('Successfully updated slot booking branch');
    return true;
  } catch (error) {
    logger.error('Error in updateSlotBookingBranch', error);
    return false;
  }
};
