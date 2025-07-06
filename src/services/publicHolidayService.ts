
import { supabase } from '@/integrations/supabase/client';
import { isEligibleForMondayHolidayBonus } from '@/utils/employeeEligibility';

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
    
    // Calculate year from date for the insert
    const year = new Date(holiday.date).getFullYear();
    
    const { data, error } = await supabase
      .from('public_holidays')
      .insert({
        name: holiday.name,
        date: holiday.date,
        year: year
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding public holiday:', error);
      throw error;
    }

    console.log('PublicHolidayService: Successfully added holiday:', data);
    
    // If it's a Monday holiday, process leave adjustments for eligible employees only
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
    
    // Calculate year from date for the update
    const year = new Date(holiday.date).getFullYear();
    
    const { data, error } = await supabase
      .from('public_holidays')
      .update({
        name: holiday.name,
        date: holiday.date,
        year: year
      })
      .eq('id', holiday.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating public holiday:', error);
      throw error;
    }

    console.log('PublicHolidayService: Successfully updated holiday:', data);
    
    // If it became a Monday holiday, process leave adjustments for eligible employees only
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

// Process Monday holiday leave adjustments for eligible employees only
export const processMondayHolidayLeaveAdjustments = async (holidayId: string, holidayName: string): Promise<void> => {
  try {
    console.log('PublicHolidayService: Processing Monday holiday leave adjustments for eligible employees:', holidayName);
    
    // Get only eligible employees (Full-Time, excluding Senior Partners, not resigned)
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, name, type, position')
      .eq('type', 'Full-Time')
      .neq('position', 'Senior Partner')
      .is('resign_date', null);

    if (employeesError) {
      console.error('Error fetching eligible employees:', employeesError);
      throw employeesError;
    }

    if (!employees || employees.length === 0) {
      console.log('No eligible employees found for Monday holiday bonus');
      return;
    }

    // Filter out any remaining ineligible employees (double-check)
    const eligibleEmployees = employees.filter(emp => isEligibleForMondayHolidayBonus(emp));

    if (eligibleEmployees.length === 0) {
      console.log('No eligible employees after filtering');
      return;
    }

    // Create leave adjustments for eligible employees only
    const adjustments = eligibleEmployees.map(employee => ({
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

    console.log(`PublicHolidayService: Successfully created leave adjustments for ${eligibleEmployees.length} eligible employees`);
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
    // First check if employee is eligible
    const { data: employee } = await supabase
      .from('employees')
      .select('type, position')
      .eq('id', employeeId)
      .single();

    if (!employee || !isEligibleForMondayHolidayBonus(employee)) {
      console.log(`PublicHolidayService: Employee ${employeeId} is not eligible for Monday holiday bonus`);
      return 0;
    }

    const adjustments = await getMondayHolidayAdjustments(employeeId);
    const totalBonusDays = adjustments.reduce((total, adjustment) => total + adjustment.bonus_days_granted, 0);
    
    console.log(`PublicHolidayService: Employee ${employeeId} has ${totalBonusDays} Monday holiday bonus days`);
    return totalBonusDays;
  } catch (error) {
    console.error('Error in getMondayHolidayBonusDays:', error);
    return 0;
  }
};

// Clean up Monday holiday adjustments for ineligible employees
export const cleanupIneligibleMondayHolidayAdjustments = async (): Promise<void> => {
  try {
    console.log('PublicHolidayService: Cleaning up Monday holiday adjustments for ineligible employees...');
    
    // Get all employees with Monday holiday adjustments
    const { data: adjustments, error: adjustmentsError } = await supabase
      .from('monday_holiday_leave_adjustments')
      .select(`
        *,
        employees!inner(id, type, position, resign_date)
      `);

    if (adjustmentsError) {
      console.error('Error fetching adjustments for cleanup:', adjustmentsError);
      throw adjustmentsError;
    }

    if (!adjustments || adjustments.length === 0) {
      console.log('No Monday holiday adjustments to clean up');
      return;
    }

    // Find adjustments for ineligible employees
    const ineligibleAdjustments = adjustments.filter(adj => {
      const employee = (adj as any).employees;
      return !isEligibleForMondayHolidayBonus(employee) || employee.resign_date !== null;
    });

    if (ineligibleAdjustments.length === 0) {
      console.log('No ineligible adjustments found');
      return;
    }

    // Delete ineligible adjustments
    const adjustmentIds = ineligibleAdjustments.map(adj => adj.id);
    const { error: deleteError } = await supabase
      .from('monday_holiday_leave_adjustments')
      .delete()
      .in('id', adjustmentIds);

    if (deleteError) {
      console.error('Error deleting ineligible adjustments:', deleteError);
      throw deleteError;
    }

    console.log(`PublicHolidayService: Successfully removed ${ineligibleAdjustments.length} ineligible Monday holiday adjustments`);
  } catch (error) {
    console.error('Error in cleanupIneligibleMondayHolidayAdjustments:', error);
    throw error;
  }
};
