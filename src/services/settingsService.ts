
import { supabase } from '@/integrations/supabase/client';

// Service for managing system settings data
export interface Branch {
  id: number;
  name: string;
  address: string;
}

// Now we'll use Supabase to store branch data
export const getBranches = async (): Promise<Branch[]> => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'system_branches')
      .single();

    if (error) {
      console.error('Error fetching branches from Supabase:', error);
      // Return default branches if error
      return getDefaultBranches();
    }

    if (data && data.setting_value) {
      return data.setting_value as unknown as Branch[];
    }

    return getDefaultBranches();
  } catch (error) {
    console.error('Error in getBranches:', error);
    return getDefaultBranches();
  }
};

export const saveBranches = async (branches: Branch[]): Promise<void> => {
  try {
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        setting_key: 'system_branches',
        setting_value: branches as any
      });

    if (error) {
      console.error('Error saving branches to Supabase:', error);
      throw error;
    }

    console.log('Branches saved successfully to Supabase');
  } catch (error) {
    console.error('Error in saveBranches:', error);
    throw error;
  }
};

const getDefaultBranches = (): Branch[] => {
  return [
    { id: 1, name: 'Headquarters', address: '123 Business District, #12-34, Singapore 068123' },
    { id: 2, name: 'Balmoral', address: '456 Balmoral Road, #05-67, Singapore 259856' },
    { id: 3, name: 'Jurong West', address: '789 Jurong West Central, #08-90, Singapore 640789' },
    { id: 4, name: 'Kembangan', address: '321 Kembangan Road, #03-45, Singapore 419642' },
    { id: 5, name: 'Yishun', address: '654 Yishun Ring Road, #07-12, Singapore 760654' },
    { id: 6, name: 'Bukit Merah', address: '987 Bukit Merah Central, #04-56, Singapore 150987' },
  ];
};
