import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface BranchClassTypeSetting {
  id: string;
  branch_id: string;
  class_type: string;
  min_age: number | null;
  max_age: number | null;
  created_at: string;
  updated_at: string;
}

export async function getBranchClassTypeSettings(branchId: string): Promise<BranchClassTypeSetting[]> {
  const { data, error } = await supabase
    .from('branch_class_type_settings')
    .select('*')
    .eq('branch_id', branchId)
    .order('class_type');

  if (error) {
    logger.error('Error fetching branch class type settings', error);
    throw error;
  }
  return (data || []) as BranchClassTypeSetting[];
}

export async function upsertBranchClassTypeSetting(
  branchId: string,
  classType: string,
  minAge: number | null,
  maxAge: number | null
): Promise<void> {
  const { error } = await supabase
    .from('branch_class_type_settings')
    .upsert(
      {
        branch_id: branchId,
        class_type: classType,
        min_age: minAge,
        max_age: maxAge,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'branch_id,class_type' }
    );

  if (error) {
    logger.error('Error upserting branch class type setting', error);
    throw error;
  }
}

export async function deleteBranchClassTypeSetting(
  branchId: string,
  classType: string
): Promise<void> {
  const { error } = await supabase
    .from('branch_class_type_settings')
    .delete()
    .eq('branch_id', branchId)
    .eq('class_type', classType);

  if (error) {
    logger.error('Error deleting branch class type setting', error);
    throw error;
  }
}
