
import { supabase } from '@/integrations/supabase/client';

// Service for managing system settings data
export interface Branch {
  id: string;
  name: string;
  address: string;
  color?: string;
  total_slots?: number;
}

// Use Supabase branches table directly
export const getBranches = async (): Promise<Branch[]> => {
  try {
    console.log('SettingsService: Fetching branches from Supabase branches table...');
    
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching branches from Supabase:', error);
      throw error;
    }

    const branches = data.map(branch => ({
      id: branch.id,
      name: branch.name,
      address: branch.address,
      color: branch.color,
      total_slots: branch.total_slots
    }));

    console.log('SettingsService: Successfully loaded branches:', branches.length);
    return branches;
  } catch (error) {
    console.error('Error in getBranches:', error);
    throw error;
  }
};

export const saveBranch = async (branch: Omit<Branch, 'id'>): Promise<string> => {
  try {
    console.log('SettingsService: Creating new branch in Supabase:', branch);
    
    // Generate a unique ID for the branch
    const branchId = `BR${Date.now()}`;
    
    const { error } = await supabase
      .from('branches')
      .insert({
        id: branchId,
        name: branch.name,
        address: branch.address,
        color: branch.color || 'bg-blue-500',
        total_slots: branch.total_slots || 0
      });

    if (error) {
      console.error('Error saving branch to Supabase:', error);
      throw error;
    }

    console.log('SettingsService: Successfully created branch:', branchId);
    return branchId;
  } catch (error) {
    console.error('Error in saveBranch:', error);
    throw error;
  }
};

export const updateBranch = async (branch: Branch): Promise<void> => {
  try {
    console.log('SettingsService: Updating branch in Supabase:', branch.id);
    
    const { error } = await supabase
      .from('branches')
      .update({
        name: branch.name,
        address: branch.address,
        color: branch.color,
        total_slots: branch.total_slots
      })
      .eq('id', branch.id);

    if (error) {
      console.error('Error updating branch in Supabase:', error);
      throw error;
    }

    console.log('SettingsService: Successfully updated branch:', branch.id);
  } catch (error) {
    console.error('Error in updateBranch:', error);
    throw error;
  }
};

export const deleteBranch = async (branchId: string): Promise<void> => {
  try {
    console.log('SettingsService: Deleting branch from Supabase:', branchId);
    
    const { error } = await supabase
      .from('branches')
      .delete()
      .eq('id', branchId);

    if (error) {
      console.error('Error deleting branch from Supabase:', error);
      throw error;
    }

    console.log('SettingsService: Successfully deleted branch:', branchId);
  } catch (error) {
    console.error('Error in deleteBranch:', error);
    throw error;
  }
};
