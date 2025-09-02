import { supabase } from '@/integrations/supabase/client';

// Get current user employee data
export const getCurrentUserEmployee = async (email: string): Promise<any> => {
  try {
    console.log('[AuthOptimization] Fetching employee data for:', email);
    
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('[AuthOptimization] Employee query error:', error);
      throw error;
    }

    if (!data) {
      console.log('[AuthOptimization] No employee found for email:', email);
      return null;
    }

    // Check superadmin status
    const isSuperadmin = await checkSuperadminStatusCached(email);
    
    console.log('[AuthOptimization] Employee data retrieved:', {
      id: data.id,
      name: data.name,
      email: data.email,
      isSuperadmin
    });

    return {
      ...data,
      isSuperadmin
    };
  } catch (error) {
    console.error('[AuthOptimization] Error in getCurrentUserEmployee:', error);
    throw error;
  }
};

// Alias for backward compatibility
export const getUserData = async (email: string) => {
  return getCurrentUserEmployee(email);
};

// Get user admin access
export const getUserAdminAccess = async (employeeId: string) => {
  try {
    console.log('[AuthOptimization] Fetching admin access for:', employeeId);
    
    const { data, error } = await supabase
      .from('admin_access')
      .select('*')
      .eq('employee_id', employeeId)
      .maybeSingle();

    if (error) {
      console.error('[AuthOptimization] Admin access query error:', error);
      throw error;
    }

    return data || {
      employees: false,
      payroll: false,
      leave_management: false,
      claims: false,
      attendance: false,
      slotBooking: false,
      reports: false
    };
  } catch (error) {
    console.error('[AuthOptimization] Error in getUserAdminAccess:', error);
    throw error;
  }
};

// Get user page access
export const getUserPageAccess = async (employeeId: string) => {
  try {
    console.log('[AuthOptimization] Fetching page access for:', employeeId);
    
    const { data, error } = await supabase
      .from('employee_page_access')
      .select('*')
      .eq('employee_id', employeeId)
      .maybeSingle();

    if (error) {
      console.error('[AuthOptimization] Page access query error:', error);
      throw error;
    }

    return data || {
      profile: true,
      apply_leave: true,
      submit_claim: true,
      payslips: true,
      my_attendance: true,
      slot_booking_employee: true
    };
  } catch (error) {
    console.error('[AuthOptimization] Error in getUserPageAccess:', error);
    throw error;
  }
};

// Check superadmin status - public interface
export const checkSuperadminStatus = async (email: string): Promise<boolean> => {
  return checkSuperadminStatusCached(email);
};

// Check superadmin status
export const checkSuperadminStatusCached = async (email: string): Promise<boolean> => {
  try {
    console.log('[AuthOptimization] Checking superadmin status for:', email);
    
    const { data, error } = await supabase
      .from('superadmin_users')
      .select('is_active')
      .eq('employee_email', email)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('[AuthOptimization] Superadmin query error:', error);
      return false;
    }

    const isSuperadmin = !!data?.is_active;
    console.log('[AuthOptimization] Superadmin check result:', { email, isSuperadmin });
    
    return isSuperadmin;
  } catch (error) {
    console.error('[AuthOptimization] Error checking superadmin status:', error);
    return false;
  }
};

// Clear authentication cache (placeholder for future implementation)
export const clearAuthCache = () => {
  console.log('[AuthOptimization] Cache cleared');
};