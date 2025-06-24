
export interface SlotBooking {
  id: string;
  employeeId: string;
  employeeName: string;
  branchId: string;
  branchName: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  bookedOn: string;
  approvedBy?: string;
  approvedOn?: string;
  notes?: string;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  totalSlots: number;
  color: string;
}

export interface WeeklySlotConfig {
  [branchId: string]: {
    Monday: number;
    Tuesday: number;
    Wednesday: number;
    Thursday: number;
    Friday: number;
    Saturday: number;
    Sunday: number;
  };
}

// Branch configurations
export const branches: Branch[] = [
  { 
    id: 'headquarters', 
    name: 'Headquarters', 
    address: '123 Business District, #12-34, Singapore 068123',
    totalSlots: 8,
    color: 'bg-blue-500'
  },
  { 
    id: 'balmoral', 
    name: 'Balmoral', 
    address: '456 Balmoral Road, #05-67, Singapore 259856',
    totalSlots: 5,
    color: 'bg-green-500'
  },
  { 
    id: 'jurong-west', 
    name: 'Jurong West', 
    address: '789 Jurong West Central, #08-90, Singapore 640789',
    totalSlots: 6,
    color: 'bg-purple-500'
  },
  { 
    id: 'kembangan', 
    name: 'Kembangan', 
    address: '321 Kembangan Road, #03-45, Singapore 419642',
    totalSlots: 4,
    color: 'bg-orange-500'
  },
  { 
    id: 'yishun', 
    name: 'Yishun', 
    address: '654 Yishun Ring Road, #07-12, Singapore 760654',
    totalSlots: 7,
    color: 'bg-red-500'
  },
  { 
    id: 'bukit-merah', 
    name: 'Bukit Merah', 
    address: '987 Bukit Merah Central, #04-56, Singapore 150987',
    totalSlots: 5,
    color: 'bg-indigo-500'
  },
];

// Weekly slot configuration
export const weeklySlots: WeeklySlotConfig = {
  headquarters: { Monday: 8, Tuesday: 8, Wednesday: 8, Thursday: 8, Friday: 8, Saturday: 4, Sunday: 2 },
  balmoral: { Monday: 5, Tuesday: 5, Wednesday: 5, Thursday: 5, Friday: 5, Saturday: 3, Sunday: 1 },
  'jurong-west': { Monday: 6, Tuesday: 6, Wednesday: 6, Thursday: 6, Friday: 6, Saturday: 3, Sunday: 2 },
  kembangan: { Monday: 4, Tuesday: 4, Wednesday: 4, Thursday: 4, Friday: 4, Saturday: 2, Sunday: 1 },
  yishun: { Monday: 7, Tuesday: 7, Wednesday: 7, Thursday: 7, Friday: 7, Saturday: 4, Sunday: 2 },
  'bukit-merah': { Monday: 5, Tuesday: 5, Wednesday: 5, Thursday: 5, Friday: 5, Saturday: 3, Sunday: 1 }
};

// Sample booking data
const slotBookings: SlotBooking[] = [
  {
    id: 'SLOT001',
    employeeId: 'CAS001',
    employeeName: 'Alice Wong',
    branchId: 'headquarters',
    branchName: 'Headquarters',
    date: '2024-12-23',
    status: 'approved',
    bookedOn: '2024-12-20',
    approvedBy: 'John Tan',
    approvedOn: '2024-12-21'
  },
  {
    id: 'SLOT002',
    employeeId: 'CAS002',
    employeeName: 'Bob Chen',
    branchId: 'headquarters',
    branchName: 'Headquarters',
    date: '2024-12-23',
    status: 'pending',
    bookedOn: '2024-12-22'
  },
  {
    id: 'SLOT003',
    employeeId: 'CAS003',
    employeeName: 'Carol Liu',
    branchId: 'balmoral',
    branchName: 'Balmoral',
    date: '2024-12-24',
    status: 'approved',
    bookedOn: '2024-12-21',
    approvedBy: 'Mary Ng',
    approvedOn: '2024-12-22'
  },
  {
    id: 'SLOT004',
    employeeId: 'CAS001',
    employeeName: 'Alice Wong',
    branchId: 'jurong-west',
    branchName: 'Jurong West',
    date: '2024-12-25',
    status: 'pending',
    bookedOn: '2024-12-23'
  }
];

export const getAllSlotBookings = (): SlotBooking[] => {
  return [...slotBookings];
};

export const getEmployeeSlotBookings = (employeeId: string): SlotBooking[] => {
  return slotBookings.filter(booking => booking.employeeId === employeeId);
};

export const getBranchSlotBookings = (branchId: string, date?: string): SlotBooking[] => {
  return slotBookings.filter(booking => 
    booking.branchId === branchId && (!date || booking.date === date)
  );
};

export const addSlotBooking = (booking: Omit<SlotBooking, 'id' | 'bookedOn'>): string => {
  const newId = `SLOT${String(slotBookings.length + 1).padStart(3, '0')}`;
  const newBooking: SlotBooking = {
    id: newId,
    bookedOn: new Date().toISOString().split('T')[0],
    ...booking
  };
  slotBookings.push(newBooking);
  return newId;
};

export const updateSlotBookingStatus = (
  bookingId: string, 
  status: 'approved' | 'rejected', 
  approvedBy?: string
): boolean => {
  const booking = slotBookings.find(b => b.id === bookingId);
  if (!booking) return false;
  
  booking.status = status;
  if (status === 'approved') {
    booking.approvedBy = approvedBy;
    booking.approvedOn = new Date().toISOString().split('T')[0];
  }
  
  return true;
};

export const getBookedSlotsForDate = (date: string, branchId: string): number => {
  return slotBookings.filter(
    booking => booking.date === date && booking.branchId === branchId && booking.status !== 'rejected'
  ).length;
};

export const getAvailableSlotsForDate = (date: string, branchId: string): number => {
  const dateObj = new Date(date);
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' }) as keyof WeeklySlotConfig[string];
  const bookedSlots = getBookedSlotsForDate(date, branchId);
  const totalSlots = weeklySlots[branchId]?.[dayName] || 0;
  return Math.max(0, totalSlots - bookedSlots);
};

export const getPendingSlotBookings = (): SlotBooking[] => {
  return slotBookings.filter(booking => booking.status === 'pending');
};

export const getTotalSlotsStats = () => {
  const currentMonth = new Date();
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  
  let totalAvailableSlots = 0;
  let totalBookings = 0;
  
  // Calculate for each day in the current month
  for (let day = 1; day <= monthEnd.getDate(); day++) {
    const checkDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dateStr = checkDate.toISOString().split('T')[0];
    const dayName = checkDate.toLocaleDateString('en-US', { weekday: 'long' }) as keyof WeeklySlotConfig[string];
    
    branches.forEach(branch => {
      const totalSlotsForDay = weeklySlots[branch.id]?.[dayName] || 0;
      const bookedSlotsForDay = getBookedSlotsForDate(dateStr, branch.id);
      totalAvailableSlots += Math.max(0, totalSlotsForDay - bookedSlotsForDay);
      totalBookings += bookedSlotsForDay;
    });
  }
  
  return { totalAvailableSlots, totalBookings };
};
