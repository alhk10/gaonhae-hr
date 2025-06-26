
import { supabase } from "@/integrations/supabase/client";
import { isWithinBranchRange } from "./geolocationService";

export interface AttendanceRecord {
  id: number;
  employeeId: string;
  employee: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  status: 'Present' | 'Absent' | 'Half Day' | 'Late';
  hours: number;
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
    clockIn: record.check_in,
    clockOut: record.check_out,
    breakStart: record.break_start,
    breakEnd: record.break_end,
    status: record.status as 'Present' | 'Absent' | 'Half Day' | 'Late',
    hours: record.hours_worked || 0,
    location: record.location || 'Office',
    clockInLocation: record.clock_in_location,
    clockOutLocation: record.clock_out_location
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
    clockIn: record.check_in,
    clockOut: record.check_out,
    breakStart: record.break_start,
    breakEnd: record.break_end,
    status: record.status as 'Present' | 'Absent' | 'Half Day' | 'Late',
    hours: record.hours_worked || 0,
    location: record.location || 'Office',
    clockInLocation: record.clock_in_location,
    clockOutLocation: record.clock_out_location
  }));
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
