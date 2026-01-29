/**
 * Invoice Access Service
 * Handles branch-based invoice access permissions for employees
 */

import { supabase } from '@/integrations/supabase/client';

export interface InvoiceAccessPermission {
  id: string;
  employee_id: string;
  branch_id: string;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface BranchInvoiceAccess {
  branch_id: string;
  branch_name?: string;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

/**
 * Get all invoice access permissions for an employee
 */
export const getEmployeeInvoiceAccess = async (employeeId: string): Promise<BranchInvoiceAccess[]> => {
  const { data, error } = await supabase
    .from('employee_invoice_access')
    .select('*')
    .eq('employee_id', employeeId);

  if (error) {
    console.error('Error fetching employee invoice access:', error);
    throw error;
  }

  return (data || []).map(item => ({
    branch_id: item.branch_id,
    can_create: item.can_create ?? true,
    can_edit: item.can_edit ?? true,
    can_delete: item.can_delete ?? false
  }));
};

/**
 * Update invoice access for an employee across all branches
 */
export const updateEmployeeInvoiceAccess = async (
  employeeId: string,
  branchAccess: BranchInvoiceAccess[]
): Promise<void> => {
  // First, delete all existing access for this employee
  const { error: deleteError } = await supabase
    .from('employee_invoice_access')
    .delete()
    .eq('employee_id', employeeId);

  if (deleteError) {
    console.error('Error deleting existing invoice access:', deleteError);
    throw deleteError;
  }

  // Insert new access records for branches that have any permission enabled
  const accessRecords = branchAccess
    .filter(access => access.can_create || access.can_edit || access.can_delete)
    .map(access => ({
      employee_id: employeeId,
      branch_id: access.branch_id,
      can_create: access.can_create,
      can_edit: access.can_edit,
      can_delete: access.can_delete,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

  if (accessRecords.length > 0) {
    const { error: insertError } = await supabase
      .from('employee_invoice_access')
      .insert(accessRecords);

    if (insertError) {
      console.error('Error inserting invoice access:', insertError);
      throw insertError;
    }
  }
};

/**
 * Check if the current user can access invoices for a specific branch
 */
export const checkInvoiceAccess = async (branchId: string): Promise<{
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}> => {
  // Get current user's employee ID
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return { canCreate: false, canEdit: false, canDelete: false };
  }

  // Check if user is superadmin (full access)
  const { data: superadminCheck } = await supabase
    .from('superadmin_users')
    .select('id')
    .eq('employee_email', user.email)
    .eq('is_active', true)
    .single();

  if (superadminCheck) {
    return { canCreate: true, canEdit: true, canDelete: true };
  }

  // Get employee ID
  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('email', user.email)
    .single();

  if (!employee) {
    return { canCreate: false, canEdit: false, canDelete: false };
  }

  // Check invoice access for this branch
  const { data: access } = await supabase
    .from('employee_invoice_access')
    .select('can_create, can_edit, can_delete')
    .eq('employee_id', employee.id)
    .eq('branch_id', branchId)
    .single();

  if (!access) {
    return { canCreate: false, canEdit: false, canDelete: false };
  }

  return {
    canCreate: access.can_create ?? false,
    canEdit: access.can_edit ?? false,
    canDelete: access.can_delete ?? false
  };
};

/**
 * Get list of branches the current user can access for invoicing
 */
export const getAccessibleBranches = async (): Promise<BranchInvoiceAccess[]> => {
  // Get current user's employee ID
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return [];
  }

  // Check if user is superadmin (access to all branches)
  const { data: superadminCheck } = await supabase
    .from('superadmin_users')
    .select('id')
    .eq('employee_email', user.email)
    .eq('is_active', true)
    .single();

  if (superadminCheck) {
    // Return all branches with full permissions
    const { data: branches } = await supabase
      .from('branches')
      .select('id, name')
      .order('name');

    return (branches || []).map(branch => ({
      branch_id: branch.id,
      branch_name: branch.name,
      can_create: true,
      can_edit: true,
      can_delete: true
    }));
  }

  // Get employee ID
  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('email', user.email)
    .single();

  if (!employee) {
    return [];
  }

  // Get all invoice access for this employee
  const { data: accessRecords } = await supabase
    .from('employee_invoice_access')
    .select('branch_id, can_create, can_edit, can_delete')
    .eq('employee_id', employee.id);

  if (!accessRecords || accessRecords.length === 0) {
    return [];
  }

  // Get branch names
  const branchIds = accessRecords.map(a => a.branch_id);
  const { data: branches } = await supabase
    .from('branches')
    .select('id, name')
    .in('id', branchIds);

  const branchMap = new Map((branches || []).map(b => [b.id, b.name]));

  return accessRecords.map(access => ({
    branch_id: access.branch_id,
    branch_name: branchMap.get(access.branch_id),
    can_create: access.can_create ?? false,
    can_edit: access.can_edit ?? false,
    can_delete: access.can_delete ?? false
  }));
};

/**
 * Check if the current user has any invoice access
 */
export const hasAnyInvoiceAccess = async (): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return false;
  }

  // Check if user is superadmin
  const { data: superadminCheck } = await supabase
    .from('superadmin_users')
    .select('id')
    .eq('employee_email', user.email)
    .eq('is_active', true)
    .single();

  if (superadminCheck) {
    return true;
  }

  // Get employee ID
  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('email', user.email)
    .single();

  if (!employee) {
    return false;
  }

  // Check if employee has any invoice access
  const { data: accessRecords, error } = await supabase
    .from('employee_invoice_access')
    .select('id')
    .eq('employee_id', employee.id)
    .limit(1);

  return !error && (accessRecords?.length || 0) > 0;
};
