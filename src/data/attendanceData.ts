
import { isWithinBranchRange } from '@/services/geolocationService';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  status: 'Present' | 'Absent' | 'Late' | 'Medical Leave' | 'Annual Leave' | 'Half Day';
  hours: number;
  overtime?: number;
  location?: string;
  clockInLocation?: string;
  clockOutLocation?: string;
  notes?: string;
}

export interface ClockInOutRecord {
  id: string;
  employeeId: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  clockInLocation?: string;
  clockOutLocation?: string;
  status: 'clocked-in' | 'clocked-out' | 'not-started';
}

// Sample attendance data
const attendanceRecords: AttendanceRecord[] = [
  {
    id: 'ATT001',
    employeeId: 'EMP001',
    employeeName: 'John Tan',
    date: '2024-12-23',
    clockIn: '09:00',
    clockOut: '18:00',
    status: 'Present',
    hours: 8,
    location: 'Headquarters',
    clockInLocation: 'Headquarters',
    clockOutLocation: 'Headquarters'
  },
  {
    id: 'ATT002',
    employeeId: 'EMP001',
    employeeName: 'John Tan',
    date: '2024-12-22',
    clockIn: '09:05',
    clockOut: '18:15',
    status: 'Late',
    hours: 8.17,
    location: 'Headquarters',
    clockInLocation: 'Headquarters',
    clockOutLocation: 'Headquarters'
  },
  {
    id: 'ATT003',
    employeeId: 'EMP001',
    employeeName: 'John Tan',
    date: '2024-12-21',
    clockIn: '08:55',
    clockOut: '17:55',
    status: 'Present',
    hours: 8,
    location: 'Headquarters',
    clockInLocation: 'Headquarters',
    clockOutLocation: 'Headquarters'
  },
  {
    id: 'ATT004',
    employeeId: 'EMP001',
    employeeName: 'John Tan',
    date: '2024-12-20',
    clockIn: '09:00',
    clockOut: '18:00',
    status: 'Present',
    hours: 8,
    location: 'Headquarters',
    clockInLocation: 'Headquarters',
    clockOutLocation: 'Headquarters'
  },
  {
    id: 'ATT005',
    employeeId: 'EMP001',
    employeeName: 'John Tan',
    date: '2024-12-19',
    status: 'Medical Leave',
    hours: 0
  },
  {
    id: 'ATT006',
    employeeId: 'EMP002',
    employeeName: 'Mary Ng',
    date: '2024-12-23',
    clockIn: '09:00',
    clockOut: '18:00',
    status: 'Present',
    hours: 8,
    location: 'Balmoral',
    clockInLocation: 'Balmoral',
    clockOutLocation: 'Balmoral'
  },
  {
    id: 'ATT007',
    employeeId: 'EMP003',
    employeeName: 'David Lim',
    date: '2024-12-23',
    clockIn: '09:15',
    clockOut: '18:15',
    status: 'Late',
    hours: 8,
    location: 'Jurong West',
    clockInLocation: 'Jurong West',
    clockOutLocation: 'Jurong West'
  },
  {
    id: 'ATT008',
    employeeId: 'CAS001',
    employeeName: 'Alice Wong',
    date: '2024-12-23',
    clockIn: '10:00',
    clockOut: '18:00',
    status: 'Present',
    hours: 8,
    location: 'Kembangan',
    clockInLocation: 'Kembangan',
    clockOutLocation: 'Kembangan'
  }
];

// Current clock-in/out status
const clockInOutRecords: ClockInOutRecord[] = [
  {
    id: 'CLOCK001',
    employeeId: 'EMP001',
    date: '2024-12-24',
    status: 'not-started'
  }
];

export const getAllAttendanceRecords = (): AttendanceRecord[] => {
  return [...attendanceRecords];
};

export const getEmployeeAttendanceRecords = (employeeId: string): AttendanceRecord[] => {
  return attendanceRecords.filter(record => record.employeeId === employeeId);
};

export const addAttendanceRecord = (record: Omit<AttendanceRecord, 'id'>): string => {
  const newId = `ATT${String(attendanceRecords.length + 1).padStart(3, '0')}`;
  const newRecord: AttendanceRecord = {
    id: newId,
    ...record
  };
  attendanceRecords.push(newRecord);
  return newId;
};

export const getClockInOutStatus = (employeeId: string): ClockInOutRecord | undefined => {
  const today = new Date().toISOString().split('T')[0];
  return clockInOutRecords.find(record => record.employeeId === employeeId && record.date === today);
};

export const updateClockInOut = async (employeeId: string, type: 'in' | 'out'): Promise<void> => {
  // Verify location before allowing clock in/out
  const locationCheck = await isWithinBranchRange(1500);
  
  if (!locationCheck.withinRange) {
    throw new Error(
      `You must be within 1500m of a branch to clock ${type}. ` +
      `Nearest branch: ${locationCheck.nearestBranch} (${locationCheck.distance}m away)`
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const currentTime = new Date().toLocaleTimeString('en-SG', { 
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });
  
  let record = clockInOutRecords.find(r => r.employeeId === employeeId && r.date === today);
  
  if (!record) {
    record = {
      id: `CLOCK${Date.now()}`,
      employeeId,
      date: today,
      status: 'not-started'
    };
    clockInOutRecords.push(record);
  }
  
  if (type === 'in') {
    record.clockIn = currentTime;
    record.clockInLocation = locationCheck.nearestBranch;
    record.status = 'clocked-in';
  } else {
    record.clockOut = currentTime;
    record.clockOutLocation = locationCheck.nearestBranch;
    record.status = 'clocked-out';
  }

  console.log(`Employee ${employeeId} clocked ${type} at ${locationCheck.nearestBranch} (${locationCheck.distance}m away)`);
};

export const getTodayAttendanceStats = () => {
  const today = new Date().toISOString().split('T')[0];
  const todayRecords = attendanceRecords.filter(record => record.date === today);
  
  const present = todayRecords.filter(record => record.status === 'Present').length;
  const late = todayRecords.filter(record => record.status === 'Late').length;
  const absent = todayRecords.filter(record => record.status === 'Absent').length;
  const onLeave = todayRecords.filter(record => 
    record.status === 'Medical Leave' || record.status === 'Annual Leave'
  ).length;
  
  return { present, late, absent, onLeave, total: todayRecords.length };
};
