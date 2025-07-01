
import { supabase } from '@/integrations/supabase/client';

export interface Branch {
  id: string;
  name: string;
  address: string;
  totalSlots: number;
  color: string;
}

export interface WeeklySlotConfig {
  id: string;
  branchId: string;
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
}

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

// Fetch all branches from Supabase
export const getBranches = async (): Promise<Branch[]> => {
  console.log('Fetching branches from Supabase...');
  
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching branches:', error);
    throw error;
  }

  return data.map(branch => ({
    id: branch.id,
    name: branch.name,
    address: branch.address,
    totalSlots: branch.total_slots,
    color: branch.color
  }));
};

// Fetch weekly slot configuration from Supabase
export const getWeeklySlotConfig = async (): Promise<{ [branchId: string]: WeeklySlotConfig }> => {
  console.log('Fetching weekly slot config from Supabase...');
  
  const { data, error } = await supabase
    .from('weekly_slot_config')
    .select('*');

  if (error) {
    console.error('Error fetching weekly slot config:', error);
    throw error;
  }

  const config: { [branchId: string]: WeeklySlotConfig } = {};
  data.forEach(item => {
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
};

// Fetch all slot bookings from Supabase
export const getAllSlotBookings = async (): Promise<SlotBooking[]> => {
  console.log('Fetching slot bookings from Supabase...');
  
  const { data, error } = await supabase
    .from('slot_bookings_new')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching slot bookings:', error);
    throw error;
  }

  return data.map(booking => ({
    id: booking.id,
    employeeId: booking.employee_id,
    employeeName: booking.employee_name,
    branchId: booking.branch_id,
    branchName: booking.branch_name,
    date: booking.date,
    status: booking.status as 'pending' | 'approved' | 'rejected' | 'completed',
    bookedOn: booking.booked_on,
    approvedBy: booking.approved_by || undefined,
    approvedOn: booking.approved_on || undefined,
    notes: booking.notes || undefined
  }));
};

// Get slot bookings for a specific employee
export const getEmployeeSlotBookings = async (employeeId: string): Promise<SlotBooking[]> => {
  console.log('Fetching employee slot bookings:', employeeId);
  
  const { data, error } = await supabase
    .from('slot_bookings_new')
    .select('*')
    .eq('employee_id', employeeId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching employee slot bookings:', error);
    throw error;
  }

  return data.map(booking => ({
    id: booking.id,
    employeeId: booking.employee_id,
    employeeName: booking.employee_name,
    branchId: booking.branch_id,
    branchName: booking.branch_name,
    date: booking.date,
    status: booking.status as 'pending' | 'approved' | 'rejected' | 'completed',
    bookedOn: booking.booked_on,
    approvedBy: booking.approved_by || undefined,
    approvedOn: booking.approved_on || undefined,
    notes: booking.notes || undefined
  }));
};

// Get slot bookings for a specific branch and date
export const getBranchSlotBookings = async (branchId: string, date?: string): Promise<SlotBooking[]> => {
  console.log('Fetching branch slot bookings:', branchId, date);
  
  let query = supabase
    .from('slot_bookings_new')
    .select('*')
    .eq('branch_id', branchId);

  if (date) {
    query = query.eq('date', date);
  }

  const { data, error } = await query.order('date', { ascending: false });

  if (error) {
    console.error('Error fetching branch slot bookings:', error);
    throw error;
  }

  return data.map(booking => ({
    id: booking.id,
    employeeId: booking.employee_id,
    employeeName: booking.employee_name,
    branchId: booking.branch_id,
    branchName: booking.branch_name,
    date: booking.date,
    status: booking.status as 'pending' | 'approved' | 'rejected' | 'completed',
    bookedOn: booking.booked_on,
    approvedBy: booking.approved_by || undefined,
    approvedOn: booking.approved_on || undefined,
    notes: booking.notes || undefined
  }));
};

// Add a new slot booking
export const addSlotBooking = async (booking: Omit<SlotBooking, 'id' | 'bookedOn'>): Promise<string> => {
  console.log('Adding slot booking:', booking);
  
  const newId = `SLOT${Date.now()}`;
  const bookedOn = new Date().toISOString().split('T')[0];
  
  const { error } = await supabase
    .from('slot_bookings_new')
    .insert({
      id: newId,
      employee_id: booking.employeeId,
      employee_name: booking.employeeName,
      branch_id: booking.branchId,
      branch_name: booking.branchName,
      date: booking.date,
      status: booking.status,
      booked_on: bookedOn,
      approved_by: booking.approvedBy,
      approved_on: booking.approvedOn,
      notes: booking.notes
    });

  if (error) {
    console.error('Error adding slot booking:', error);
    throw error;
  }

  console.log('Successfully added slot booking:', newId);
  return newId;
};

// Update slot booking status
export const updateSlotBookingStatus = async (
  bookingId: string, 
  status: 'approved' | 'rejected', 
  approvedBy?: string
): Promise<boolean> => {
  console.log('Updating slot booking status:', bookingId, status, approvedBy);
  
  const updateData: any = { status };
  
  if (status === 'approved') {
    updateData.approved_by = approvedBy;
    updateData.approved_on = new Date().toISOString().split('T')[0];
  }
  
  const { error } = await supabase
    .from('slot_bookings_new')
    .update(updateData)
    .eq('id', bookingId);

  if (error) {
    console.error('Error updating slot booking status:', error);
    return false;
  }

  console.log('Successfully updated slot booking status');
  return true;
};

// Get booked slots count for a specific date and branch
export const getBookedSlotsForDate = async (date: string, branchId: string): Promise<number> => {
  console.log('Getting booked slots for date:', date, branchId);
  
  const { data, error } = await supabase
    .from('slot_bookings_new')
    .select('id')
    .eq('date', date)
    .eq('branch_id', branchId)
    .neq('status', 'rejected');

  if (error) {
    console.error('Error getting booked slots:', error);
    return 0;
  }

  return data.length;
};

// Get available slots for a specific date and branch
export const getAvailableSlotsForDate = async (date: string, branchId: string): Promise<number> => {
  console.log('Getting available slots for date:', date, branchId);
  
  try {
    const dateObj = new Date(date);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof WeeklySlotConfig;
    
    const weeklyConfig = await getWeeklySlotConfig();
    const bookedSlots = await getBookedSlotsForDate(date, branchId);
    
    const totalSlots = Number(weeklyConfig[branchId]?.[dayName] || 0);
    const availableSlots = Math.max(0, totalSlots - bookedSlots);
    
    console.log(`Available slots for ${branchId} on ${dayName}: ${availableSlots} (Total: ${totalSlots}, Booked: ${bookedSlots})`);
    return availableSlots;
  } catch (error) {
    console.error('Error calculating available slots:', error);
    return 0;
  }
};

// Get pending slot bookings
export const getPendingSlotBookings = async (): Promise<SlotBooking[]> => {
  console.log('Fetching pending slot bookings...');
  
  const { data, error } = await supabase
    .from('slot_bookings_new')
    .select('*')
    .eq('status', 'pending')
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching pending slot bookings:', error);
    throw error;
  }

  return data.map(booking => ({
    id: booking.id,
    employeeId: booking.employee_id,
    employeeName: booking.employee_name,
    branchId: booking.branch_id,
    branchName: booking.branch_name,
    date: booking.date,
    status: booking.status as 'pending' | 'approved' | 'rejected' | 'completed',
    bookedOn: booking.booked_on,
    approvedBy: booking.approved_by || undefined,
    approvedOn: booking.approved_on || undefined,
    notes: booking.notes || undefined
  }));
};

// Get total slots statistics
export const getTotalSlotsStats = async () => {
  console.log('Calculating total slots statistics...');
  
  try {
    const currentMonth = new Date();
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    const branches = await getBranches();
    const weeklyConfig = await getWeeklySlotConfig();
    
    let totalAvailableSlots = 0;
    let totalBookings = 0;
    
    // Calculate for each day in the current month
    for (let day = 1; day <= monthEnd.getDate(); day++) {
      const checkDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const dateStr = checkDate.toISOString().split('T')[0];
      const dayName = checkDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof WeeklySlotConfig;
      
      for (const branch of branches) {
        const totalSlotsForDay = Number(weeklyConfig[branch.id]?.[dayName] || 0);
        const bookedSlotsForDay = await getBookedSlotsForDate(dateStr, branch.id);
        totalAvailableSlots += Math.max(0, totalSlotsForDay - bookedSlotsForDay);
        totalBookings += bookedSlotsForDay;
      }
    }
    
    return { totalAvailableSlots, totalBookings };
  } catch (error) {
    console.error('Error calculating total slots stats:', error);
    return { totalAvailableSlots: 0, totalBookings: 0 };
  }
};
