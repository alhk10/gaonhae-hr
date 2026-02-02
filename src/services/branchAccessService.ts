/**
 * Service for managing employee branch dashboard access
 */

import { supabase } from '@/integrations/supabase/client';

export interface BranchAccess {
  id: string;
  employee_id: string;
  branch_id: string;
  can_view_dashboard: boolean;
  can_approve_changes: boolean;
  created_at: string;
  updated_at: string;
}

export interface BranchAccessWithDetails extends BranchAccess {
  branch_name?: string;
  employee_name?: string;
}

/**
 * Get all branch access permissions for an employee
 */
export const getEmployeeBranchAccess = async (employeeId: string): Promise<BranchAccess[]> => {
  const { data, error } = await supabase
    .from('employee_branch_access')
    .select('*')
    .eq('employee_id', employeeId);

  if (error) {
    console.error('Error fetching employee branch access:', error);
    return [];
  }

  return data || [];
};

/**
 * Check if employee has access to a specific branch dashboard
 */
export const hasBranchDashboardAccess = async (
  employeeId: string, 
  branchId?: string
): Promise<boolean> => {
  // Build query
  let query = supabase
    .from('employee_branch_access')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('can_view_dashboard', true);

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query.limit(1);

  if (error) {
    console.error('Error checking branch access:', error);
    return false;
  }

  return (data?.length || 0) > 0;
};

/**
 * Check if employee can approve student changes for a branch
 */
export const canApproveStudentChanges = async (
  employeeId: string, 
  branchId: string
): Promise<boolean> => {
  const { data, error } = await supabase
    .from('employee_branch_access')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('branch_id', branchId)
    .eq('can_approve_changes', true)
    .limit(1);

  if (error) {
    console.error('Error checking approval access:', error);
    return false;
  }

  return (data?.length || 0) > 0;
};

/**
 * Get all branches an employee has dashboard access to
 */
export const getAccessibleBranches = async (employeeId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from('employee_branch_access')
    .select('branch_id')
    .eq('employee_id', employeeId)
    .eq('can_view_dashboard', true);

  if (error) {
    console.error('Error fetching accessible branches:', error);
    return [];
  }

  return data?.map(d => d.branch_id) || [];
};

/**
 * Grant branch access to an employee
 */
export const grantBranchAccess = async (
  employeeId: string,
  branchId: string,
  canViewDashboard: boolean = true,
  canApproveChanges: boolean = false
): Promise<BranchAccess | null> => {
  const { data, error } = await supabase
    .from('employee_branch_access')
    .upsert({
      employee_id: employeeId,
      branch_id: branchId,
      can_view_dashboard: canViewDashboard,
      can_approve_changes: canApproveChanges,
    }, {
      onConflict: 'employee_id,branch_id'
    })
    .select()
    .single();

  if (error) {
    console.error('Error granting branch access:', error);
    return null;
  }

  return data;
};

/**
 * Revoke branch access from an employee
 */
export const revokeBranchAccess = async (
  employeeId: string,
  branchId: string
): Promise<boolean> => {
  const { error } = await supabase
    .from('employee_branch_access')
    .delete()
    .eq('employee_id', employeeId)
    .eq('branch_id', branchId);

  if (error) {
    console.error('Error revoking branch access:', error);
    return false;
  }

  return true;
};

/**
 * Get all employees with access to a specific branch
 */
export const getBranchAccessList = async (branchId: string): Promise<BranchAccessWithDetails[]> => {
  const { data, error } = await supabase
    .from('employee_branch_access')
    .select(`
      *,
      employees!inner(name)
    `)
    .eq('branch_id', branchId);

  if (error) {
    console.error('Error fetching branch access list:', error);
    return [];
  }

  return data?.map(item => ({
    ...item,
    employee_name: (item.employees as any)?.name
  })) || [];
};
