
import { supabase } from '@/integrations/supabase/client';

export interface AttendanceRecord {
  id: number;
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  breakStart?: string;
  breakEnd?: string;
  hoursWorked?: number;
  status: 'Present' | 'Absent' | 'Late' | 'On Leave' | 'Half Day' | 'Medical Leave' | 'Annual Leave';
  location?: string;
  clockInLocation?: string;
  clockOutLocation?: string;
}

export const getAttendanceRecords = async (): Promise<AttendanceRecord[]> => {
  try {
    console.log('Fetching attendance records from Supabase...');
    
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching attendance records:', error);
      throw error;
    }

    console.log('Attendance records fetched successfully:', data?.length || 0, 'records');

    return data?.map(record => ({
      id: record.id,
      employeeId: record.employee_id,
      date: record.date,
      checkIn: record.check_in,
      checkOut: record.check_out,
      breakStart: record.break_start,
      breakEnd: record.break_end,
      hoursWorked: record.hours_worked ? Number(record.hours_worked) : undefined,
      status: record.status as AttendanceRecord['status'],
      location: record.location,
      clockInLocation: record.clock_in_location,
      clockOutLocation: record.clock_out_location
    })) || [];
  } catch (error) {
    console.error('Error in getAttendanceRecords:', error);
    throw error;
  }
};

export const getEmployeeAttendanceRecords = async (employeeId: string): Promise<AttendanceRecord[]> => {
  try {
    console.log('Fetching attendance records for employee:', employeeId);
    
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching employee attendance records:', error);
      throw error;
    }

    return data?.map(record => ({
      id: record.id,
      employeeId: record.employee_id,
      date: record.date,
      checkIn: record.check_in,
      checkOut: record.check_out,
      breakStart: record.break_start,
      breakEnd: record.break_end,
      hoursWorked: record.hours_worked ? Number(record.hours_worked) : undefined,
      status: record.status as AttendanceRecord['status'],
      location: record.location,
      clockInLocation: record.clock_in_location,
      clockOutLocation: record.clock_out_location
    })) || [];
  } catch (error) {
    console.error('Error in getEmployeeAttendanceRecords:', error);
    throw error;
  }
};

// Clock in/out functionality
export interface ClockInOutStatus {
  status: 'clocked-in' | 'clocked-out';
  clockIn?: string;
  clockOut?: string;
  location?: string;
}

// Simple in-memory storage for clock status (in production, this should be in a database)
const clockStatusMap = new Map<string, ClockInOutStatus>();

export const getClockInOutStatus = (employeeId: string): ClockInOutStatus | undefined => {
  return clockStatusMap.get(employeeId);
};

export const updateClockInOut = async (employeeId: string, action: 'in' | 'out'): Promise<void> => {
  try {
    const currentTime = new Date().toLocaleTimeString('en-SG', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const today = new Date().toISOString().split('T')[0];
    
    if (action === 'in') {
      // Check if already clocked in today
      const existingStatus = clockStatusMap.get(employeeId);
      if (existingStatus?.status === 'clocked-in') {
        throw new Error('Already clocked in');
      }
      
      // Set clock in status
      clockStatusMap.set(employeeId, {
        status: 'clocked-in',
        clockIn: currentTime,
        location: 'Main Office' // Default location
      });
      
      // Create or update attendance record
      const { data: existingRecord } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('date', today)
        .single();
      
      if (existingRecord) {
        await supabase
          .from('attendance')
          .update({
            check_in: currentTime,
            status: 'Present',
            clock_in_location: 'Main Office'
          })
          .eq('id', existingRecord.id);
      } else {
        await supabase
          .from('attendance')
          .insert({
            employee_id: employeeId,
            date: today,
            check_in: currentTime,
            status: 'Present',
            location: 'Main Office',
            clock_in_location: 'Main Office'
          });
      }
    } else {
      // Clock out
      const existingStatus = clockStatusMap.get(employeeId);
      if (existingStatus?.status !== 'clocked-in') {
        throw new Error('Not clocked in');
      }
      
      // Calculate hours worked
      const checkInTime = new Date(`2000-01-01T${existingStatus.clockIn}`);
      const checkOutTime = new Date(`2000-01-01T${currentTime}`);
      const hoursWorked = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
      
      // Update clock status
      clockStatusMap.set(employeeId, {
        status: 'clocked-out',
        clockIn: existingStatus.clockIn,
        clockOut: currentTime,
        location: existingStatus.location
      });
      
      // Update attendance record
      await supabase
        .from('attendance')
        .update({
          check_out: currentTime,
          hours_worked: hoursWorked,
          clock_out_location: 'Main Office'
        })
        .eq('employee_id', employeeId)
        .eq('date', today);
    }
  } catch (error) {
    console.error('Error in updateClockInOut:', error);
    throw error;
  }
};

export const addAttendanceRecord = async (record: Omit<AttendanceRecord, 'id'>): Promise<AttendanceRecord | null> => {
  try {
    console.log('Adding attendance record:', record);
    
    const { data, error } = await supabase
      .from('attendance')
      .insert({
        employee_id: record.employeeId,
        date: record.date,
        check_in: record.checkIn,
        check_out: record.checkOut,
        break_start: record.breakStart,
        break_end: record.breakEnd,
        hours_worked: record.hoursWorked,
        status: record.status,
        location: record.location,
        clock_in_location: record.clockInLocation,
        clock_out_location: record.clockOutLocation
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding attendance record:', error);
      throw error;
    }

    if (!data) return null;

    return {
      id: data.id,
      employeeId: data.employee_id,
      date: data.date,
      checkIn: data.check_in,
      checkOut: data.check_out,
      breakStart: data.break_start,
      breakEnd: data.break_end,
      hoursWorked: data.hours_worked ? Number(data.hours_worked) : undefined,
      status: data.status as AttendanceRecord['status'],
      location: data.location,
      clockInLocation: data.clock_in_location,
      clockOutLocation: data.clock_out_location
    };
  } catch (error) {
    console.error('Error in addAttendanceRecord:', error);
    throw error;
  }
};

export const updateAttendanceRecord = async (id: number, record: Partial<AttendanceRecord>): Promise<AttendanceRecord | null> => {
  try {
    console.log('Updating attendance record:', id, record);
    
    const updateData: any = {};
    if (record.employeeId) updateData.employee_id = record.employeeId;
    if (record.date) updateData.date = record.date;
    if (record.checkIn !== undefined) updateData.check_in = record.checkIn;
    if (record.checkOut !== undefined) updateData.check_out = record.checkOut;
    if (record.breakStart !== undefined) updateData.break_start = record.breakStart;
    if (record.breakEnd !== undefined) updateData.break_end = record.breakEnd;  
    if (record.hoursWorked !== undefined) updateData.hours_worked = record.hoursWorked;
    if (record.status) updateData.status = record.status;
    if (record.location !== undefined) updateData.location = record.location;
    if (record.clockInLocation !== undefined) updateData.clock_in_location = record.clockInLocation;
    if (record.clockOutLocation !== undefined) updateData.clock_out_location = record.clockOutLocation;

    const { data, error } = await supabase
      .from('attendance')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating attendance record:', error);
      throw error;
    }

    if (!data) return null;

    return {
      id: data.id,
      employeeId: data.employee_id,
      date: data.date,
      checkIn: data.check_in,
      checkOut: data.check_out,
      breakStart: data.break_start,
      breakEnd: data.break_end,
      hoursWorked: data.hours_worked ? Number(data.hours_worked) : undefined,
      status: data.status as AttendanceRecord['status'],
      location: data.location,
      clockInLocation: data.clock_in_location,
      clockOutLocation: data.clock_out_location
    };
  } catch (error) {
    console.error('Error in updateAttendanceRecord:', error);
    throw error;
  }
};
