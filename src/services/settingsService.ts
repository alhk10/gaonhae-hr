import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

// Service for managing system settings data
export interface Branch {
  id: string;
  name: string;
  address: string;
  color?: string;
  country?: string;
  currency?: string;
}

// Use Supabase branches table directly
export const getBranches = async (): Promise<Branch[]> => {
  try {
    logger.debug('Fetching branches from Supabase branches table');
    
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .order('name');

    if (error) {
      logger.error('Error fetching branches from Supabase', error);
      throw error;
    }

    const branches = data.map(branch => ({
      id: branch.id,
      name: branch.name,
      address: branch.address,
      color: branch.color,
      country: branch.country,
      currency: branch.currency
    }));

    logger.info(`Successfully loaded ${branches.length} branches`);
    return branches;
  } catch (error) {
    logger.error('Error in getBranches', error);
    throw error;
  }
};

export const saveBranch = async (branch: Omit<Branch, 'id'>): Promise<string> => {
  try {
    logger.info('Creating new branch in Supabase', { branch });
    
    // Generate a unique ID for the branch
    const branchId = `BR${Date.now()}`;
    
    const { error } = await supabase
      .from('branches')
      .insert({
        id: branchId,
        name: branch.name,
        address: branch.address,
        color: branch.color || 'bg-blue-500',
        country: branch.country || 'Singapore',
        currency: branch.currency || 'SGD'
      });

    if (error) {
      logger.error('Error saving branch to Supabase', error);
      throw error;
    }

    logger.info('Successfully created branch', { branchId });
    return branchId;
  } catch (error) {
    logger.error('Error in saveBranch', error);
    throw error;
  }
};

export const updateBranch = async (branch: Branch): Promise<void> => {
  try {
    logger.info('Updating branch in Supabase', { branchId: branch.id });
    
    const { error } = await supabase
      .from('branches')
      .update({
        name: branch.name,
        address: branch.address,
        color: branch.color,
        country: branch.country,
        currency: branch.currency
      })
      .eq('id', branch.id);

    if (error) {
      logger.error('Error updating branch in Supabase', error);
      throw error;
    }

    logger.info('Successfully updated branch', { branchId: branch.id });
  } catch (error) {
    logger.error('Error in updateBranch', error);
    throw error;
  }
};

export const deleteBranch = async (branchId: string): Promise<void> => {
  try {
    logger.info('Deleting branch from Supabase', { branchId });
    
    // Delete all related records from tables that reference this branch
    // The order matters - delete child records before the branch
    
    // 1. Delete weekly_slot_config records
    const { error: slotConfigError } = await supabase
      .from('weekly_slot_config')
      .delete()
      .eq('branch_id', branchId);
    if (slotConfigError) {
      logger.warn('Error deleting weekly_slot_config for branch', slotConfigError);
    }
    
    // 2. Delete branch_timetables records
    const { error: timetablesError } = await supabase
      .from('branch_timetables')
      .delete()
      .eq('branch_id', branchId);
    if (timetablesError) {
      logger.warn('Error deleting branch_timetables for branch', timetablesError);
    }
    
    // 3. Delete branch_profit_loss_entries records
    const { error: plEntriesError } = await supabase
      .from('branch_profit_loss_entries')
      .delete()
      .eq('branch_id', branchId);
    if (plEntriesError) {
      logger.warn('Error deleting branch_profit_loss_entries for branch', plEntriesError);
    }
    
    // 4. Delete published_pl_reports records
    const { error: plReportsError } = await supabase
      .from('published_pl_reports')
      .delete()
      .eq('branch_id', branchId);
    if (plReportsError) {
      logger.warn('Error deleting published_pl_reports for branch', plReportsError);
    }
    
    // 5. Delete partner_branch_shares records
    const { error: sharesError } = await supabase
      .from('partner_branch_shares')
      .delete()
      .eq('branch_id', branchId);
    if (sharesError) {
      logger.warn('Error deleting partner_branch_shares for branch', sharesError);
    }
    
    // 6. Delete inventory_locations records (and their inventory_items will cascade)
    const { error: locationsError } = await supabase
      .from('inventory_locations')
      .delete()
      .eq('branch_id', branchId);
    if (locationsError) {
      logger.warn('Error deleting inventory_locations for branch', locationsError);
    }
    
    // 7. Clear branch_id from claims (set to null instead of deleting)
    const { error: claimsError } = await supabase
      .from('claims')
      .update({ branch_id: null })
      .eq('branch_id', branchId);
    if (claimsError) {
      logger.warn('Error clearing branch_id from claims', claimsError);
    }
    
    // 8. Clear branch_id from invoices (set to null instead of deleting)
    const { error: invoicesError } = await supabase
      .from('invoices')
      .update({ branch_id: null })
      .eq('branch_id', branchId);
    if (invoicesError) {
      logger.warn('Error clearing branch_id from invoices', invoicesError);
    }
    
    // 9. Delete class_attendance records for this branch
    const { error: classAttendanceError } = await supabase
      .from('class_attendance')
      .delete()
      .eq('branch_id', branchId);
    if (classAttendanceError) {
      logger.warn('Error deleting class_attendance for branch', classAttendanceError);
    }
    
    // 10. Clear branch_id from students (set to null instead of deleting)
    const { error: studentsError } = await supabase
      .from('students')
      .update({ branch_id: null })
      .eq('branch_id', branchId);
    if (studentsError) {
      logger.warn('Error clearing branch_id from students', studentsError);
    }
    
    // 11. Delete slot_bookings_new records for this branch
    const { error: bookingsError } = await supabase
      .from('slot_bookings_new')
      .delete()
      .eq('branch_id', branchId);
    if (bookingsError) {
      logger.warn('Error deleting slot_bookings_new for branch', bookingsError);
    }
    
    // Now delete the branch itself
    const { error } = await supabase
      .from('branches')
      .delete()
      .eq('id', branchId);

    if (error) {
      logger.error('Error deleting branch from Supabase', error);
      
      // Provide more helpful error messages
      if (error.code === '23503') {
        const tableName = error.details?.match(/table "([^"]+)"/)?.[1] || 'related records';
        throw new Error(`Cannot delete branch: It still has ${tableName}. Please remove those first.`);
      }
      throw error;
    }

    logger.info('Successfully deleted branch', { branchId });
  } catch (error) {
    logger.error('Error in deleteBranch', error);
    throw error;
  }
};
