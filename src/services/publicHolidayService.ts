
import { supabase } from '@/integrations/supabase/client';

export interface PublicHoliday {
  id: string;
  name: string;
  date: string;
  is_monday_holiday: boolean;
  year: number;
  created_at?: string;
  updated_at?: string;
}

export interface MondayHolidayAdjustment {
  id: string;
  employee_id: string;
  holiday_id: string;
  bonus_days_granted: number;
  granted_date: string;
}

// Get all public holidays
export const getPublicHolidays = async (): Promise<PublicHoliday[]> => {
  try {
    console.log('PublicHolidayService: Fetching public holidays from Supabase...');
    
    const { data, error } = await supabase
      .from('public_holidays')
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching public holidays:', error);
      throw error;
    }

    console.log('PublicHolidayService: Successfully loaded holidays:', data?.length);
    return data || [];
  } catch (error) {
    console.error('Error in getPublicHolidays:', error);
    throw error;
  }
};

// Add a new public holiday
export const addPublicHoliday = async (holiday: Omit<PublicHoliday, 'id' | 'is_monday_holiday' | 'year' | 'created_at' | 'updated_at'>): Promise<PublicHoliday> => {
  try {
    console.log('PublicHolidayService: Adding new holiday:', holiday);
    
    const { data, error } = await supabase
      .from('public_holidays')
      .insert({
        name: holiday.name,
        date: holiday.date
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding public holiday:', error);
      throw error;
    }

    console.log('PublicHolidayService: Successfully added holiday:', data);
    
    // If it's a Monday holiday, process leave adjustments
    if (data.is_monday_holiday) {
      await processMondayHolidayLeaveAdjustments(data.id, data.name);
    }
    
    return data;
  } catch (error) {
    console.error('Error in addPublicHoliday:', error);
    throw error;
  }
};

// Update an existing public holiday
export const updatePublicHoliday = async (holiday: PublicHoliday): Promise<PublicHoliday> => {
  try {
    console.log('PublicHolidayService: Updating holiday:', holiday.id);
    
    const { data, error } = await supabase
      .from('public_holidays')
      .update({
        name: holiday.name,
        date: holiday.date
      })
      .eq('id', holiday.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating public holiday:', error);
      throw error;
    }

    console.log('PublicHolidayService: Successfully updated holiday:', data);
    
    // If it became a Monday holiday, process leave adjustments
    if (data.is_monday_holiday && !holiday.is_monday_holiday) {
      await processMondayHolidayLeaveAdjustments(data.id, data.name);
    }
    
    return data;
  } catch (error) {
    console.error('Error in updatePublicHoliday:', error);
    throw error;
  }
};

// Delete a public holiday
export const deletePublicHoliday = async (holidayId: string): Promise<void> => {
  try {
    console.log('PublicHolidayService: Deleting holiday:', holidayId);
    
    const { error } = await supabase
      .from('public_holidays')
      .delete()
      .eq('id', holidayId);

    if (error) {
      console.error('Error deleting public holiday:', error);
      throw error;
    }

    console.log('PublicHolidayService: Successfully deleted holiday:', holidayId);
  } catch (error) {
    console.error('Error in deletePublicHoliday:', error);
    throw error;
  }
};

// Process Monday holiday leave adjustments for all employees
export const processMondayHolidayLeaveAdjustments = async (holidayId: string, holidayName: string): Promise<void> => {
  try {
    console.log('PublicHolidayService: Processing Monday holiday leave adjustments for:', holidayName);
    
    // Get all active employees
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, name')
      .is('resign_date', null);

    if (employeesError) {
      console.error('Error fetching employees:', employeesError);
      throw employeesError;
    }

    if (!employees || employees.length === 0) {
      console.log('No active employees found');
      return;
    }

    // Create leave adjustments for all employees
    const adjustments = employees.map(employee => ({
      employee_id: employee.id,
      holiday_id: holidayId,
      bonus_days_granted: 1
    }));

    const { error: adjustmentsError } = await supabase
      .from('monday_holiday_leave_adjustments')
      .insert(adjustments);

    if (adjustmentsError) {
      console.error('Error creating leave adjustments:', adjustmentsError);
      throw adjustmentsError;
    }

    console.log(`PublicHolidayService: Successfully created leave adjustments for ${employees.length} employees`);
  } catch (error) {
    console.error('Error in processMondayHolidayLeaveAdjustments:', error);
    throw error;
  }
};

// Get Monday holiday adjustments for an employee
export const getMondayHolidayAdjustments = async (employeeId: string): Promise<MondayHolidayAdjustment[]> => {
  try {
    console.log('PublicHolidayService: Fetching Monday holiday adjustments for employee:', employeeId);
    
    const { data, error } = await supabase
      .from('monday_holiday_leave_adjustments')
      .select('*')
      .eq('employee_id', employeeId)
      .order('granted_date', { ascending: false });

    if (error) {
      console.error('Error fetching Monday holiday adjustments:', error);
      throw error;
    }

    console.log('PublicHolidayService: Successfully loaded adjustments:', data?.length);
    return data || [];
  } catch (error) {
    console.error('Error in getMondayHolidayAdjustments:', error);
    throw error;
  }
};

// Get total Monday holiday bonus days for an employee
export const getMondayHolidayBonusDays = async (employeeId: string): Promise<number> => {
  try {
    const adjustments = await getMondayHolidayAdjustments(employeeId);
    const totalBonusDays = adjustments.reduce((total, adjustment) => total + adjustment.bonus_days_granted, 0);
    
    console.log(`PublicHolidayService: Employee ${employeeId} has ${totalBonusDays} Monday holiday bonus days`);
    return totalBonusDays;
  } catch (error) {
    console.error('Error in getMondayHolidayBonusDays:', error);
    return 0;
  }
};
