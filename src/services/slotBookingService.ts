import { supabase } from '@/integrations/supabase/client';

export interface Branch {
  id: string;
  name: string;
  address: string;
  color: string;
  total_slots: number;
}

export interface SlotBooking {
  id: string;
  employeeId: string;
  employeeName: string;
  branchId: string;
  branchName: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
  bookedOn: string;
  approvedBy?: string;
  approvedOn?: string;
  notes?: string;
}

export interface WeeklySlotConfig {
  id?: string;
  branchId?: string;
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
}

// Color mapping for branches
const BRANCH_COLOR_MAP: { [key: string]: string } = {
  'balmoral': '#3b82f6', // Blue
  'jurong-west': '#eab308', // Yellow
  'kembangan': '#22c55e', // Green
  'yishun': '#8b5cf6', // Purple
  'bukit-merah': '#991b1b', // Maroon
  'headquarters': '#6b7280' // Grey
};

export const getBranches = async (): Promise<Branch[]> => {
  try {
    console.log('SlotBookingService: Fetching branches from Supabase...');
    
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .order('name');

    if (error) {
      console.error('SlotBookingService: Error fetching branches:', error);
      throw error;
    }

    // Map branches with proper color coding
    const branches = data.map(branch => ({
      id: branch.id,
      name: branch.name,
      address: branch.address,
      color: branch.color,
      total_slots: branch.total_slots || 0
    }));

    console.log('SlotBookingService: Successfully loaded branches:', branches.length);
    return branches;
  } catch (error) {
    console.error('SlotBookingService: Error in getBranches:', error);
    throw error;
  }
};

export const updateBranchColors = async (): Promise<void> => {
  try {
    console.log('SlotBookingService: Updating branch colors in Supabase...');
    
    // Update each branch with its corresponding color
    const colorUpdates = [
      { name: 'Balmoral', color: BRANCH_COLOR_MAP['balmoral'] },
      { name: 'Jurong West', color: BRANCH_COLOR_MAP['jurong-west'] },
      { name: 'Kembangan', color: BRANCH_COLOR_MAP['kembangan'] },
      { name: 'Yishun', color: BRANCH_COLOR_MAP['yishun'] },
      { name: 'Bukit Merah', color: BRANCH_COLOR_MAP['bukit-merah'] },
      { name: 'Headquarters', color: BRANCH_COLOR_MAP['headquarters'] }
    ];

    for (const update of colorUpdates) {
      const { error } = await supabase
        .from('branches')
        .update({ color: update.color })
        .ilike('name', `%${update.name}%`);

      if (error) {
        console.error(`SlotBookingService: Error updating ${update.name} color:`, error);
      } else {
        console.log(`SlotBookingService: Updated ${update.name} color to ${update.color}`);
      }
    }
  } catch (error) {
    console.error('SlotBookingService: Error in updateBranchColors:', error);
    throw error;
  }
};

export const getWeeklySlotConfig = async (): Promise<{ [branchId: string]: WeeklySlotConfig }> => {
  try {
    console.log('SlotBookingService: Fetching weekly slot config from Supabase...');
    
    const { data, error } = await supabase
      .from('weekly_slot_config')
      .select('*');

    if (error) {
      console.error('SlotBookingService: Error fetching weekly slot config:', error);
      throw error;
    }

    const config: { [branchId: string]: WeeklySlotConfig } = {};
    data.forEach(row => {
      config[row.branch_id] = {
        id: row.id,
        branchId: row.branch_id,
        monday: row.monday,
        tuesday: row.tuesday,
        wednesday: row.wednesday,
        thursday: row.thursday,
        friday: row.friday,
        saturday: row.saturday,
        sunday: row.sunday
      };
    });

    return config;
  } catch (error) {
    console.error('SlotBookingService: Error in getWeeklySlotConfig:', error);
    throw error;
  }
};

export const updateWeeklySlotConfig = async (branchId: string, config: Omit<WeeklySlotConfig, 'id' | 'branchId'>): Promise<boolean> => {
  try {
    console.log('SlotBookingService: Updating weekly slot config for branch:', branchId);
    
    const { error } = await supabase
      .from('weekly_slot_config')
      .upsert({
        branch_id: branchId,
        monday: config.monday,
        tuesday: config.tuesday,
        wednesday: config.wednesday,
        thursday: config.thursday,
        friday: config.friday,
        saturday: config.saturday,
        sunday: config.sunday
      });

    if (error) {
      console.error('SlotBookingService: Error updating weekly slot config:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('SlotBookingService: Error in updateWeeklySlotConfig:', error);
    return false;
  }
};

export const getAvailableSlotsForDate = async (date: string, branchId: string): Promise<number> => {
  try {
    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof Omit<WeeklySlotConfig, 'id' | 'branchId'>;
    
    // Get total slots for the day
    const weeklyConfig = await getWeeklySlotConfig();
    const totalSlots = weeklyConfig[branchId]?.[dayOfWeek] || 0;
    
    // Get booked slots for the date
    const bookedSlots = await getBookedSlotsForDate(date, branchId);
    
    return Math.max(0, totalSlots - bookedSlots);
  } catch (error) {
    console.error('SlotBookingService: Error in getAvailableSlotsForDate:', error);
    return 0;
  }
};

export const getBookedSlotsForDate = async (date: string, branchId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('slot_bookings_new')
      .select('id')
      .eq('date', date)
      .eq('branch_id', branchId);

    if (error) {
      console.error('SlotBookingService: Error fetching booked slots:', error);
      return 0;
    }

    return data.length;
  } catch (error) {
    console.error('SlotBookingService: Error in getBookedSlotsForDate:', error);
    return 0;
  }
};

export const addSlotBooking = async (booking: Omit<SlotBooking, 'id' | 'bookedOn'>): Promise<string> => {
  try {
    console.log('SlotBookingService: Creating slot booking in Supabase:', booking);
    
    const bookingId = `SB${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const { error } = await supabase
      .from('slot_bookings_new')
      .insert({
        id: bookingId,
        employee_id: booking.employeeId,
        employee_name: booking.employeeName,
        branch_id: booking.branchId,
        branch_name: booking.branchName,
        date: booking.date,
        status: booking.status,
        booked_on: new Date().toISOString().split('T')[0],
        approved_by: booking.approvedBy || null,
        approved_on: booking.approvedOn || null,
        notes: booking.notes || null
      });

    if (error) {
      console.error('SlotBookingService: Error creating slot booking:', error);
      throw error;
    }

    console.log('SlotBookingService: Successfully created slot booking:', bookingId);
    return bookingId;
  } catch (error) {
    console.error('SlotBookingService: Error in addSlotBooking:', error);
    throw error;
  }
};

export const getEmployeeSlotBookings = async (employeeId: string): Promise<SlotBooking[]> => {
  try {
    console.log('SlotBookingService: Fetching employee slot bookings for:', employeeId);
    
    const { data, error } = await supabase
      .from('slot_bookings_new')
      .select('*')
      .eq('employee_id', employeeId)
      .order('date', { ascending: false });

    if (error) {
      console.error('SlotBookingService: Error fetching employee bookings:', error);
      throw error;
    }

    const bookings = data.map(booking => ({
      id: booking.id,
      employeeId: booking.employee_id,
      employeeName: booking.employee_name,
      branchId: booking.branch_id,
      branchName: booking.branch_name,
      date: booking.date,
      status: booking.status as 'pending' | 'approved' | 'rejected',
      bookedOn: booking.booked_on,
      approvedBy: booking.approved_by || undefined,
      approvedOn: booking.approved_on || undefined,
      notes: booking.notes || undefined
    }));

    console.log('SlotBookingService: Successfully loaded employee bookings:', bookings.length);
    return bookings;
  } catch (error) {
    console.error('SlotBookingService: Error in getEmployeeSlotBookings:', error);
    throw error;
  }
};

export const getBranchSlotBookings = async (branchId: string): Promise<SlotBooking[]> => {
  try {
    console.log('SlotBookingService: Fetching branch slot bookings for:', branchId);
    
    const { data, error } = await supabase
      .from('slot_bookings_new')
      .select('*')
      .eq('branch_id', branchId)
      .order('date', { ascending: false });

    if (error) {
      console.error('SlotBookingService: Error fetching branch bookings:', error);
      throw error;
    }

    const bookings = data.map(booking => ({
      id: booking.id,
      employeeId: booking.employee_id,
      employeeName: booking.employee_name,
      branchId: booking.branch_id,
      branchName: booking.branch_name,
      date: booking.date,
      status: booking.status as 'pending' | 'approved' | 'rejected',
      bookedOn: booking.booked_on,
      approvedBy: booking.approved_by || undefined,
      approvedOn: booking.approved_on || undefined,
      notes: booking.notes || undefined
    }));

    console.log('SlotBookingService: Successfully loaded branch bookings:', bookings.length);
    return bookings;
  } catch (error) {
    console.error('SlotBookingService: Error in getBranchSlotBookings:', error);
    throw error;
  }
};

export const getAllSlotBookings = async (): Promise<SlotBooking[]> => {
  try {
    console.log('SlotBookingService: Fetching all slot bookings from Supabase...');
    
    const { data, error } = await supabase
      .from('slot_bookings_new')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('SlotBookingService: Error fetching all bookings:', error);
      throw error;
    }

    const bookings = data.map(booking => ({
      id: booking.id,
      employeeId: booking.employee_id,
      employeeName: booking.employee_name,
      branchId: booking.branch_id,
      branchName: booking.branch_name,
      date: booking.date,
      status: booking.status as 'pending' | 'approved' | 'rejected',
      bookedOn: booking.booked_on,
      approvedBy: booking.approved_by || undefined,
      approvedOn: booking.approved_on || undefined,
      notes: booking.notes || undefined
    }));

    console.log('SlotBookingService: Successfully loaded all bookings:', bookings.length);
    return bookings;
  } catch (error) {
    console.error('SlotBookingService: Error in getAllSlotBookings:', error);
    throw error;
  }
};

export const updateSlotBookingStatus = async (
  bookingId: string, 
  status: 'approved' | 'rejected', 
  approvedBy: string,
  notes?: string
): Promise<boolean> => {
  try {
    console.log('SlotBookingService: Updating slot booking status:', bookingId, status);
    
    const updateData: any = {
      status,
      approved_by: approvedBy,
      approved_on: new Date().toISOString().split('T')[0]
    };

    if (notes) {
      updateData.notes = notes;
    }

    const { error } = await supabase
      .from('slot_bookings_new')
      .update(updateData)
      .eq('id', bookingId);

    if (error) {
      console.error('SlotBookingService: Error updating booking status:', error);
      return false;
    }

    console.log('SlotBookingService: Successfully updated booking status:', bookingId);
    return true;
  } catch (error) {
    console.error('SlotBookingService: Error in updateSlotBookingStatus:', error);
    return false;
  }
};

export const updateSlotBookingEmployee = async (
  bookingId: string,
  newEmployeeId: string,
  newEmployeeName: string,
  notes?: string
): Promise<boolean> => {
  try {
    console.log('SlotBookingService: Swapping employee for booking:', bookingId);
    
    const updateData: any = {
      employee_id: newEmployeeId,
      employee_name: newEmployeeName,
      notes: notes || null
    };

    const { error } = await supabase
      .from('slot_bookings_new')
      .update(updateData)
      .eq('id', bookingId);

    if (error) {
      console.error('SlotBookingService: Error swapping employee:', error);
      return false;
    }

    console.log('SlotBookingService: Successfully swapped employee for booking:', bookingId);
    return true;
  } catch (error) {
    console.error('SlotBookingService: Error in updateSlotBookingEmployee:', error);
    return false;
  }
};
