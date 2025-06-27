
import { supabase } from "@/integrations/supabase/client";
import { isWithinBranchRange } from "./geolocationService";

export interface AttendanceRecord {
  id: number;
  employeeId: string;
  employee: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  status: 'Present' | 'Absent' | 'Half Day' | 'Late';
  hoursWorked: number;
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

// Mock clock status storage (in production, this would be in database)
const clockStatusStorage: { [key: string]: ClockInOutRecord } = {};

export const getAttendanceRecords = async (): Promise<AttendanceRecord[]> => {
  console.log('Fetching attendance records from Supabase...');
  
  const { data: records, error } = await supabase
    .from('attendance')
    .select(`
      *,
      employees:employee_id(name)
    `)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching attendance records:', error);
    throw error;
  }

  return records.map(record => ({
    id: record.id,
    employeeId: record.employee_id,
    employee: (record.employees as any)?.name || 'Unknown',
    date: record.date,
    checkIn: record.check_in,
    checkOut: record.check_out,
    breakStart: record.break_start,
    breakEnd: record.break_end,
    status: record.status as 'Present' | 'Absent' | 'Half Day' | 'Late',
    hoursWorked: record.hours_worked || 0,
    location: record.location || 'Office',
    clockInLocation: record.clock_in_location || undefined,
    clockOutLocation: record.clock_out_location || undefined
  }));
};

export const getEmployeeAttendanceRecords = async (employeeId: string): Promise<AttendanceRecord[]> => {
  console.log('Fetching attendance records for employee:', employeeId);
  
  const { data: records, error } = await supabase
    .from('attendance')
    .select(`
      *,
      employees:employee_id(name)
    `)
    .eq('employee_id', employeeId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching employee attendance records:', error);
    throw error;
  }

  return records.map(record => ({
    id: record.id,
    employeeId: record.employee_id,
    employee: (record.employees as any)?.name || 'Unknown',
    date: record.date,
    checkIn: record.check_in,
    checkOut: record.check_out,
    breakStart: record.break_start,
    breakEnd: record.break_end,
    status: record.status as 'Present' | 'Absent' | 'Half Day' | 'Late',
    hoursWorked: record.hours_worked || 0,
    location: record.location || 'Office',
    clockInLocation: record.clock_in_location || undefined,
    clockOutLocation: record.clock_out_location || undefined
  }));
};

export const addAttendanceRecord = async (record: Omit<AttendanceRecord, 'id' | 'employee'>): Promise<void> => {
  console.log('Adding attendance record:', record);
  
  const { error } = await supabase
    .from('attendance')
    .insert({
      employee_id: record.employeeId,
      date: record.date,
      check_in: record.checkIn,
      check_out: record.checkOut,
      break_start: record.breakStart,
      break_end: record.breakEnd,
      status: record.status,
      hours_worked: record.hoursWorked,
      location: record.location,
      clock_in_location: record.clockInLocation,
      clock_out_location: record.clockOutLocation
    });

  if (error) {
    console.error('Error adding attendance record:', error);
    throw error;
  }
};

export const updateAttendanceRecord = async (id: number, updates: Partial<AttendanceRecord>): Promise<void> => {
  console.log('Updating attendance record:', id, updates);
  
  const { error } = await supabase
    .from('attendance')
    .update({
      employee_id: updates.employeeId,
      date: updates.date,
      check_in: updates.checkIn,
      check_out: updates.checkOut,
      break_start: updates.breakStart,
      break_end: updates.breakEnd,
      status: updates.status,
      hours_worked: updates.hoursWorked,
      location: updates.location,
      clock_in_location: updates.clockInLocation,
      clock_out_location: updates.clockOutLocation
    })
    .eq('id', id);

  if (error) {
    console.error('Error updating attendance record:', error);
    throw error;
  }
};

export const getClockInOutStatus = (employeeId: string): ClockInOutRecord | undefined => {
  return clockStatusStorage[employeeId];
};

export const updateClockInOut = async (employeeId: string, action: 'in' | 'out'): Promise<void> => {
  // Verify location before allowing clock in/out
  const locationCheck = await isWithinBranchRange(100);
  
  if (!locationCheck.withinRange) {
    throw new Error(
      `You must be within 100m of a branch to clock ${action}. ` +
      `Nearest branch: ${locationCheck.nearestBranch} (${locationCheck.distance}m away)`
    );
  }

  const currentTime = new Date().toLocaleTimeString('en-SG', { 
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });

  if (action === 'in') {
    clockStatusStorage[employeeId] = {
      employeeId,
      status: 'clocked-in',
      clockIn: currentTime,
      location: locationCheck.nearestBranch
    };
  } else {
    const existing = clockStatusStorage[employeeId];
    clockStatusStorage[employeeId] = {
      employeeId,
      status: 'clocked-out',
      clockIn: existing?.clockIn,
      clockOut: currentTime,
      location: existing?.location
    };
  }

  console.log(`Employee ${employeeId} clocked ${action} at ${locationCheck.nearestBranch} (${locationCheck.distance}m away)`);
};

export const updateAttendanceStatus = async (
  employeeId: string, 
  date: string, 
  status: 'Present' | 'Absent' | 'Half Day' | 'Late'
): Promise<void> => {
  console.log('Updating attendance status:', employeeId, date, status);
  
  const { error } = await supabase
    .from('attendance')
    .upsert({
      employee_id: employeeId,
      date,
      status,
      hours_worked: status === 'Present' ? 8 : status === 'Half Day' ? 4 : 0
    });

  if (error) {
    console.error('Error updating attendance status:', error);
    throw error;
  }
};
