
export interface LeaveRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'Annual Leave' | 'Medical Leave' | 'Emergency Leave' | 'Maternity Leave' | 'Paternity Leave';
  startDate: string;
  endDate: string;
  days: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  reason: string;
  appliedOn: string;
  approvedBy?: string;
  approvedOn?: string;
  supportingDocument?: string;
}

export interface LeaveBalance {
  employeeId: string;
  annualLeave: {
    total: number;
    used: number;
    remaining: number;
  };
  medicalLeave: {
    total: number;
    used: number;
    remaining: number;
  };
}

// Sample leave records database
const leaveRecords: LeaveRecord[] = [
  {
    id: 'LEAVE001',
    employeeId: 'EMP001',
    employeeName: 'John Tan',
    type: 'Annual Leave',
    startDate: '2024-12-25',
    endDate: '2024-12-27',
    days: 3,
    status: 'Approved',
    reason: 'Christmas holiday',
    appliedOn: '2024-12-10',
    approvedBy: 'Mary Ng',
    approvedOn: '2024-12-12'
  },
  {
    id: 'LEAVE002',
    employeeId: 'EMP002',
    employeeName: 'Mary Ng',
    type: 'Medical Leave',
    startDate: '2024-12-20',
    endDate: '2024-12-20',
    days: 1,
    status: 'Approved',
    reason: 'Doctor appointment',
    appliedOn: '2024-12-18',
    approvedBy: 'John Tan',
    approvedOn: '2024-12-19'
  },
  {
    id: 'LEAVE003',
    employeeId: 'EMP001',
    employeeName: 'John Tan',
    type: 'Annual Leave',
    startDate: '2024-11-15',
    endDate: '2024-11-15',
    days: 1,
    status: 'Approved',
    reason: 'Personal matters',
    appliedOn: '2024-11-05',
    approvedBy: 'Mary Ng',
    approvedOn: '2024-11-06'
  },
  {
    id: 'LEAVE004',
    employeeId: 'CAS001',
    employeeName: 'Alice Wong',
    type: 'Annual Leave',
    startDate: '2024-09-12',
    endDate: '2024-09-12',
    days: 1,
    status: 'Pending',
    reason: 'Vacation',
    appliedOn: '2024-09-10'
  }
];

// Leave balances for employees
const leaveBalances: LeaveBalance[] = [
  {
    employeeId: 'EMP001',
    annualLeave: { total: 21, used: 4, remaining: 17 },
    medicalLeave: { total: 14, used: 0, remaining: 14 }
  },
  {
    employeeId: 'EMP002',
    annualLeave: { total: 21, used: 0, remaining: 21 },
    medicalLeave: { total: 14, used: 1, remaining: 13 }
  },
  {
    employeeId: 'EMP003',
    annualLeave: { total: 21, used: 0, remaining: 21 },
    medicalLeave: { total: 14, used: 0, remaining: 14 }
  },
  {
    employeeId: 'CAS001',
    annualLeave: { total: 21, used: 1, remaining: 20 },
    medicalLeave: { total: 14, used: 0, remaining: 14 }
  },
  {
    employeeId: 'CAS002',
    annualLeave: { total: 21, used: 0, remaining: 21 },
    medicalLeave: { total: 14, used: 0, remaining: 14 }
  },
  {
    employeeId: 'CAS003',
    annualLeave: { total: 21, used: 0, remaining: 21 },
    medicalLeave: { total: 14, used: 0, remaining: 14 }
  }
];

export const getAllLeaveRecords = (): LeaveRecord[] => {
  return [...leaveRecords];
};

export const getEmployeeLeaveRecords = (employeeId: string): LeaveRecord[] => {
  return leaveRecords.filter(record => record.employeeId === employeeId);
};

export const getEmployeeLeaveBalance = (employeeId: string): LeaveBalance | undefined => {
  return leaveBalances.find(balance => balance.employeeId === employeeId);
};

export const addLeaveRecord = (leave: Omit<LeaveRecord, 'id'>): string => {
  const newId = `LEAVE${String(leaveRecords.length + 1).padStart(3, '0')}`;
  const newLeave: LeaveRecord = {
    id: newId,
    ...leave
  };
  leaveRecords.push(newLeave);
  
  // Update leave balance
  const balance = leaveBalances.find(b => b.employeeId === leave.employeeId);
  if (balance && leave.status === 'Approved') {
    if (leave.type === 'Annual Leave') {
      balance.annualLeave.used += leave.days;
      balance.annualLeave.remaining -= leave.days;
    } else if (leave.type === 'Medical Leave') {
      balance.medicalLeave.used += leave.days;
      balance.medicalLeave.remaining -= leave.days;
    }
  }
  
  return newId;
};

export const updateLeaveStatus = (leaveId: string, status: 'Approved' | 'Rejected', approvedBy?: string): boolean => {
  const leaveIndex = leaveRecords.findIndex(record => record.id === leaveId);
  if (leaveIndex === -1) return false;
  
  const leave = leaveRecords[leaveIndex];
  const oldStatus = leave.status;
  
  leave.status = status;
  if (status === 'Approved') {
    leave.approvedBy = approvedBy;
    leave.approvedOn = new Date().toISOString().split('T')[0];
    
    // Update leave balance if newly approved
    if (oldStatus !== 'Approved') {
      const balance = leaveBalances.find(b => b.employeeId === leave.employeeId);
      if (balance) {
        if (leave.type === 'Annual Leave') {
          balance.annualLeave.used += leave.days;
          balance.annualLeave.remaining -= leave.days;
        } else if (leave.type === 'Medical Leave') {
          balance.medicalLeave.used += leave.days;
          balance.medicalLeave.remaining -= leave.days;
        }
      }
    }
  } else if (status === 'Rejected' && oldStatus === 'Approved') {
    // Restore leave balance if previously approved
    const balance = leaveBalances.find(b => b.employeeId === leave.employeeId);
    if (balance) {
      if (leave.type === 'Annual Leave') {
        balance.annualLeave.used -= leave.days;
        balance.annualLeave.remaining += leave.days;
      } else if (leave.type === 'Medical Leave') {
        balance.medicalLeave.used -= leave.days;
        balance.medicalLeave.remaining += leave.days;
      }
    }
  }
  
  return true;
};

export const getPendingLeaveCount = (): number => {
  return leaveRecords.filter(record => record.status === 'Pending').length;
};

export const getUpcomingLeaveCount = (): number => {
  const today = new Date();
  const next30Days = new Date();
  next30Days.setDate(today.getDate() + 30);
  
  return leaveRecords.filter(record => {
    if (record.status !== 'Approved') return false;
    const startDate = new Date(record.startDate);
    return startDate >= today && startDate <= next30Days;
  }).length;
};

export const getTotalAnnualLeaveRemaining = (): number => {
  return leaveBalances.reduce((total, balance) => total + balance.annualLeave.remaining, 0);
};

export const getApprovedLeaveThisMonth = (): number => {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  return leaveRecords.filter(record => {
    if (record.status !== 'Approved') return false;
    const startDate = new Date(record.startDate);
    return startDate >= startOfMonth && startDate <= endOfMonth;
  }).length;
};
