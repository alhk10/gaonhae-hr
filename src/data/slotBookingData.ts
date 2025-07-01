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
    totalSlots: 0,
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

// Load weekly slots from localStorage or use defaults
const getWeeklySlots = (): WeeklySlotConfig => {
  try {
    const storedConfig = localStorage.getItem('weekly_slots_config');
    if (storedConfig) {
      const parsed = JSON.parse(storedConfig);
      console.log('Loaded weekly slots config from localStorage:', parsed);
      return parsed;
    }
  } catch (error) {
    console.error('Error loading weekly slots config:', error);
  }
  
  // Default configuration with Headquarters set to 0
  const defaultConfig: WeeklySlotConfig = {
    headquarters: { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0, Sunday: 0 },
    balmoral: { Monday: 5, Tuesday: 5, Wednesday: 5, Thursday: 5, Friday: 5, Saturday: 3, Sunday: 1 },
    'jurong-west': { Monday: 6, Tuesday: 6, Wednesday: 6, Thursday: 6, Friday: 6, Saturday: 3, Sunday: 2 },
    kembangan: { Monday: 4, Tuesday: 4, Wednesday: 4, Thursday: 4, Friday: 4, Saturday: 2, Sunday: 2 },
    yishun: { Monday: 7, Tuesday: 7, Wednesday: 7, Thursday: 7, Friday: 7, Saturday: 4, Sunday: 2 },
    'bukit-merah': { Monday: 5, Tuesday: 5, Wednesday: 5, Thursday: 5, Friday: 5, Saturday: 3, Sunday: 1 }
  };
  
  return defaultConfig;
};

// Dynamic weekly slots that updates from localStorage
export const getWeeklySlotConfig = (): WeeklySlotConfig => {
  return getWeeklySlots();
};

// Export the current config (backwards compatibility)
export const weeklySlots: WeeklySlotConfig = getWeeklySlots();

// Initialize slot bookings from localStorage with fallback
const getStoredBookings = (): SlotBooking[] => {
  try {
    const stored = localStorage.getItem('slot_bookings');
    if (stored) {
      const parsed = JSON.parse(stored);
      console.log('Loaded slot bookings from localStorage:', parsed);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
    console.error('Error parsing stored slot bookings:', error);
  }
  
  // Default sample data
  const defaultBookings: SlotBooking[] = [
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
  
  // Save default data to localStorage
  saveBookingsToStorage(defaultBookings);
  return defaultBookings;
};

// Save bookings to localStorage
const saveBookingsToStorage = (bookings: SlotBooking[]) => {
  try {
    localStorage.setItem('slot_bookings', JSON.stringify(bookings));
    console.log('Saved slot bookings to localStorage:', bookings);
  } catch (error) {
    console.error('Error saving slot bookings to localStorage:', error);
  }
};

// Initialize with stored bookings
let slotBookings: SlotBooking[] = getStoredBookings();

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
  saveBookingsToStorage(slotBookings);
  console.log('Added new slot booking:', newBooking);
  
  return newId;
};

export const updateSlotBookingStatus = (
  bookingId: string, 
  status: 'approved' | 'rejected', 
  approvedBy?: string
): boolean => {
  const bookingIndex = slotBookings.findIndex(b => b.id === bookingId);
  if (bookingIndex === -1) {
    console.error('Booking not found:', bookingId);
    return false;
  }
  
  slotBookings[bookingIndex].status = status;
  if (status === 'approved') {
    slotBookings[bookingIndex].approvedBy = approvedBy;
    slotBookings[bookingIndex].approvedOn = new Date().toISOString().split('T')[0];
  }
  
  saveBookingsToStorage(slotBookings);
  console.log('Updated slot booking status:', slotBookings[bookingIndex]);
  
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
  const currentWeeklySlots = getWeeklySlots();
  const totalSlots = currentWeeklySlots[branchId]?.[dayName] || 0;
  console.log(`getAvailableSlotsForDate: ${branchId} on ${dayName} - Total: ${totalSlots}, Booked: ${bookedSlots}, Available: ${Math.max(0, totalSlots - bookedSlots)}`);
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
  const currentWeeklySlots = getWeeklySlots();
  
  // Calculate for each day in the current month
  for (let day = 1; day <= monthEnd.getDate(); day++) {
    const checkDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dateStr = checkDate.toISOString().split('T')[0];
    const dayName = checkDate.toLocaleDateString('en-US', { weekday: 'long' }) as keyof WeeklySlotConfig[string];
    
    branches.forEach(branch => {
      const totalSlotsForDay = currentWeeklySlots[branch.id]?.[dayName] || 0;
      const bookedSlotsForDay = getBookedSlotsForDate(dateStr, branch.id);
      totalAvailableSlots += Math.max(0, totalSlotsForDay - bookedSlotsForDay);
      totalBookings += bookedSlotsForDay;
    });
  }
  
  return { totalAvailableSlots, totalBookings };
};

// Refresh bookings from storage (for external updates)
export const refreshSlotBookings = () => {
  slotBookings = getStoredBookings();
  return slotBookings;
};
