import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

// Service for managing system settings data
export interface Branch {
  id: string;
  name: string;
  address: string;
  color?: string;
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
      color: branch.color
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
        color: branch.color || 'bg-blue-500'
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
        color: branch.color
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
    
    const { error } = await supabase
      .from('branches')
      .delete()
      .eq('id', branchId);

    if (error) {
      logger.error('Error deleting branch from Supabase', error);
      throw error;
    }

    logger.info('Successfully deleted branch', { branchId });
  } catch (error) {
    logger.error('Error in deleteBranch', error);
    throw error;
  }
};
