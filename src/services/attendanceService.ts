import { supabase } from '@/integrations/supabase/client';
import { getAttendanceSettingByBranch, isLateArrival, calculateExpectedHours } from './attendanceSettingsService';
import { getAllSlotBookings } from './slotBookingService';
import { getEmployeeById } from './employeeService';
import { logger } from '@/utils/logger';
import { formatDate } from '@/utils/dateFormat';

export interface AttendanceRecord {
  id: number;
  employeeId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  hoursWorked: number | null;
  location?: string;
  clockInLocation?: string;
  clockOutLocation?: string;
}

export interface ClockInOutRecord {
  employeeId: string;
  status: 'clocked-in' | 'clocked-out';
  clockIn?: string;
  clockOut?: string;
  location?: string;
}

export const getAttendanceRecords = async (): Promise<AttendanceRecord[]> => {
  logger.debug('Fetching attendance records');
  
  const { data: records, error } = await supabase
    .from('attendance')
    .select(`
      *,
      employees:employee_id(name)
    `)
    .order('date', { ascending: false });

  if (error) {
    logger.error('Error fetching attendance records:', error);
    throw error;
  }

  return records.map(record => ({
    id: record.id,
    employeeId: record.employee_id,
    employee: (record.employees as any)?.name || 'Unknown',
    date: record.date,
    checkIn: record.check_in,
    checkOut: record.check_out,
    status: record.status,
    hoursWorked: record.hours_worked || null,
    location: record.location || 'Office',
    clockInLocation: record.clock_in_location || undefined,
    clockOutLocation: record.clock_out_location || undefined
  }));
};

export const getEmployeeAttendanceRecords = async (employeeId: string): Promise<AttendanceRecord[]> => {
  logger.debug('Fetching attendance records for employee', { employeeId });
  
  const { data: records, error } = await supabase
    .from('attendance')
    .select(`
      *,
      employees:employee_id(name)
    `)
    .eq('employee_id', employeeId)
    .order('date', { ascending: false });

  if (error) {
    logger.error('Error fetching employee attendance records:', error);
    throw error;
  }

  return records.map(record => ({
    id: record.id,
    employeeId: record.employee_id,
    employee: (record.employees as any)?.name || 'Unknown',
    date: record.date,
    checkIn: record.check_in,
    checkOut: record.check_out,
    status: record.status,
    hoursWorked: record.hours_worked || null,
    location: record.location || 'Office',
    clockInLocation: record.clock_in_location || undefined,
    clockOutLocation: record.clock_out_location || undefined
  }));
};

export const addAttendanceRecord = async (record: Omit<AttendanceRecord, 'id' | 'employee'>): Promise<void> => {
  logger.debug('Adding attendance record', { record });
  
  const { error } = await supabase
    .from('attendance')
    .insert({
      employee_id: record.employeeId,
      date: record.date,
      check_in: record.checkIn || null,
      check_out: record.checkOut || null,
      status: record.status,
      hours_worked: record.hoursWorked,
      location: record.location,
      clock_in_location: record.clockInLocation,
      clock_out_location: record.clockOutLocation
    });

  if (error) {
    logger.error('Error adding attendance record:', error);
    throw error;
  }
};

export const updateAttendanceRecord = async (id: number, updates: Partial<AttendanceRecord>): Promise<void> => {
  logger.debug('Updating attendance record', { id, updates });
  
  const { error } = await supabase
    .from('attendance')
    .update({
      employee_id: updates.employeeId,
      date: updates.date,
      check_in: updates.checkIn,
      check_out: updates.checkOut,
      status: updates.status,
      hours_worked: updates.hoursWorked,
      location: updates.location,
      clock_in_location: updates.clockInLocation,
      clock_out_location: updates.clockOutLocation
    })
    .eq('id', id);

  if (error) {
    logger.error('Error updating attendance record:', error);
    throw error;
  }
};

export const deleteAttendanceRecord = async (recordId: number): Promise<void> => {
  logger.debug('Deleting attendance record', { recordId });
  
  const { error } = await supabase
    .from('attendance')
    .delete()
    .eq('id', recordId);

  if (error) {
    logger.error('Error deleting attendance record:', error);
    throw error;
  }
};

export const getClockInOutStatus = async (employeeId: string): Promise<ClockInOutRecord | undefined> => {
  try {
    const { data, error } = await supabase
      .from('clock_status')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', new Date().toISOString().split('T')[0])
      .single();

    if (error || !data) {
      return undefined;
    }

    return {
      employeeId: data.employee_id,
      status: data.status as 'clocked-in' | 'clocked-out',
      clockIn: data.clock_in_time || undefined,
      clockOut: data.clock_out_time || undefined,
      location: data.location || undefined
    };
  } catch (error) {
    logger.error('Error fetching clock status:', error);
    return undefined;
  }
};

export const updateClockInOut = async (employeeId: string, action: 'in' | 'out', location?: string) => {
  const currentDate = new Date().toISOString().split('T')[0];
  const currentTime = new Date().toLocaleTimeString('en-SG', { 
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });
  const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  try {
    // Check if employee is casual and validate slot booking for clock in
    if (action === 'in') {
      const employeeData = await getEmployeeById(employeeId);
      
      if (employeeData && employeeData.type === 'Casual') {
        // Get all slot bookings from Supabase
        const allSlotBookings = await getAllSlotBookings();
        
        // Direct database query validation as fallback
        const { data: directBookings, error: directError } = await supabase
          .from('slot_bookings_new')
          .select('*')
          .eq('employee_id', employeeId)
          .eq('date', currentDate)
          .eq('status', 'approved');
        
        // Find approved slot booking for this employee and date
        const matchingBookings = allSlotBookings.filter(booking => {
          return booking.employeeId === employeeId && 
                 booking.date === currentDate && 
                 booking.status === 'approved';
        });
        
        const hasApprovedSlot = matchingBookings.length > 0;
        
        if (!hasApprovedSlot && (directBookings?.length || 0) === 0) {
          throw new Error('Casual employees can only clock in with an approved slot booking for today. Please ensure you have booked and got approval for a slot before attempting to clock in.');
        }
      }
    }

    // Check if there's an existing record for today
    const { data: existingRecord, error: fetchError } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', currentDate)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    let status = 'Present';
    let hoursWorked = null;

    // Get attendance settings for the location/branch
    if (location) {
      try {
        const setting = await getAttendanceSettingByBranch(location);
        if (setting && action === 'in') {
          // Check if arrival is late based on settings
          if (isLateArrival(currentTime, dayOfWeek, setting)) {
            status = 'Late';
          }
        }
      } catch (error) {
        logger.debug('No specific settings found for location, using fallback', { location });
        // Fall back to default logic
        const checkInTime = new Date(`2000-01-01T${currentTime}`);
        const nineAM = new Date(`2000-01-01T09:00`);
        const graceEnd = new Date(`2000-01-01T09:15`); // Default 15 minutes grace
        
        if (checkInTime > graceEnd) {
          status = 'Late';
        }
      }
    }

    if (existingRecord) {
      // Update existing record
      const updateData: any = {};
      
      if (action === 'in') {
        updateData.check_in = currentTime;
        updateData.clock_in_location = location;
        updateData.status = status;
      } else {
        updateData.check_out = currentTime;
        updateData.clock_out_location = location;
        
        // Calculate hours worked
        if (existingRecord.check_in) {
          const checkInTime = new Date(`2000-01-01T${existingRecord.check_in}`);
          const checkOutTime = new Date(`2000-01-01T${currentTime}`);
          hoursWorked = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
          updateData.hours_worked = Math.max(0, hoursWorked);
        }
      }

      const { error: updateError } = await supabase
        .from('attendance')
        .update(updateData)
        .eq('id', existingRecord.id);

      if (updateError) throw updateError;
    } else {
      // Create new record
      const insertData: any = {
        employee_id: employeeId,
        date: currentDate,
        status: status,
        location: location
      };

      if (action === 'in') {
        insertData.check_in = currentTime;
        insertData.clock_in_location = location;
      } else {
        insertData.check_out = currentTime;
        insertData.clock_out_location = location;
      }

      const { error: insertError } = await supabase
        .from('attendance')
        .insert(insertData);

      if (insertError) throw insertError;
    }

    // Update clock status in Supabase
    const clockStatusData: any = {
      employee_id: employeeId,
      status: action === 'in' ? 'clocked-in' : 'clocked-out',
      date: currentDate,
      location: location
    };

    if (action === 'in') {
      clockStatusData.clock_in_time = currentTime;
    } else {
      clockStatusData.clock_out_time = currentTime;
    }

    const { error: clockError } = await supabase
      .from('clock_status')
      .upsert(clockStatusData);

    if (clockError) {
      logger.error('Error updating clock status:', clockError);
    }

  } catch (error) {
    logger.error('Error updating clock in/out:', error);
    throw error;
  }
};

export const updateAttendanceStatus = async (
  employeeId: string, 
  date: string, 
  status: 'Present' | 'Absent' | 'Half Day' | 'Late'
): Promise<void> => {
  logger.debug('Updating attendance status', { employeeId, date, status });
  
  const { error } = await supabase
    .from('attendance')
    .upsert({
      employee_id: employeeId,
      date,
      status,
      hours_worked: status === 'Present' ? 8 : status === 'Half Day' ? 4 : 0
    });

  if (error) {
    logger.error('Error updating attendance status:', error);
    throw error;
  }
};
