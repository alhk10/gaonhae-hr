
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
  status: 'Present' | 'Absent' | 'Late' | 'On Leave';
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
      status: record.status as 'Present' | 'Absent' | 'Late' | 'On Leave',
      location: record.location,
      clockInLocation: record.clock_in_location,
      clockOutLocation: record.clock_out_location
    })) || [];
  } catch (error) {
    console.error('Error in getAttendanceRecords:', error);
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
      status: data.status as 'Present' | 'Absent' | 'Late' | 'On Leave',
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
      status: data.status as 'Present' | 'Absent' | 'Late' | 'On Leave',
      location: data.location,
      clockInLocation: data.clock_in_location,
      clockOutLocation: data.clock_out_location
    };
  } catch (error) {
    console.error('Error in updateAttendanceRecord:', error);
    throw error;
  }
};
