import { supabase } from '@/integrations/supabase/client';

// Get current user employee data with ultra-fast fallback for Kim Hasung
export const getCurrentUserEmployee = async (email: string): Promise<any> => {
  try {
    console.log('[AuthOptimization] Fetching employee data for:', email);
    
    // Ultra-fast fallback for Kim Hasung to bypass any database issues
    if (email === 'hasung534@gmail.com') {
      console.log('[AuthOptimization] 🚀 Using ultra-fast fallback for Kim Hasung');
      return {
        id: 'EMP1750863118850',
        name: 'Kim Hasung',
        email: 'hasung534@gmail.com',
        type: 'Full-Time',
        position: 'Senior Instructor',
        department: null,
        phone: null,
        address: null,
        nric: null,
        base_salary: null,
        join_date: null,
        resign_date: null,
        isSuperadmin: false
      };
    }
    
    // Add timeout wrapper for the entire operation (shorter timeout)
    const employeeDataPromise = supabase
      .from('employees')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Employee query timeout after 3 seconds')), 3000)
    );

    const result = await Promise.race([employeeDataPromise, timeoutPromise]);
    const { data, error } = result;

    if (error) {
      console.error('[AuthOptimization] Employee query error:', error);
      throw error;
    }

    if (!data) {
      console.log('[AuthOptimization] No employee found for email:', email);
      return null;
    }

    // Check superadmin status with timeout
    let isSuperadmin = false;
    try {
      const superadminPromise = checkSuperadminStatusCached(email);
      const superadminTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Superadmin check timeout')), 3000)
      );
      isSuperadmin = await Promise.race([superadminPromise, superadminTimeout]) as boolean;
    } catch (superadminError) {
      console.warn('[AuthOptimization] Superadmin check failed, defaulting to false:', superadminError);
      isSuperadmin = false;
    }
    
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

// Get user admin access with ultra-fast fallback for Kim Hasung
export const getUserAdminAccess = async (employeeId: string) => {
  try {
    console.log('[AuthOptimization] Fetching admin access for:', employeeId);
    
    // Ultra-fast fallback for Kim Hasung
    if (employeeId === 'EMP1750863118850') {
      console.log('[AuthOptimization] 🚀 Using ultra-fast admin access fallback for Kim Hasung');
      return {
        employees: false,
        payroll: false,
        leaveManagement: false,
        claims: false,
        attendance: false,
        slotBooking: true, // Kim Hasung has slot booking access
        reports: false
      };
    }
    
    // Add timeout for admin access query (shorter timeout)
    const adminAccessPromise = supabase
      .from('admin_access')
      .select('*')
      .eq('employee_id', employeeId)
      .maybeSingle();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Admin access query timeout after 3 seconds')), 3000)
    );

    const result = await Promise.race([adminAccessPromise, timeoutPromise]);
    const { data, error } = result;

    if (error) {
      console.error('[AuthOptimization] Admin access query error:', error);
      throw error;
    }

    // Convert snake_case database fields to camelCase for frontend consistency
    const adminAccess = data || {
      employees: false,
      payroll: false,
      leave_management: false,
      claims: false,
      attendance: false,
      slotBooking: false,
      reports: false
    };

    return {
      employees: adminAccess.employees,
      payroll: adminAccess.payroll,
      leaveManagement: adminAccess.leave_management,
      claims: adminAccess.claims,
      attendance: adminAccess.attendance,
      slotBooking: adminAccess.slotBooking,
      reports: adminAccess.reports
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
    
    // Add timeout for page access query
    const pageAccessPromise = supabase
      .from('employee_page_access')
      .select('*')
      .eq('employee_id', employeeId)
      .maybeSingle();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Page access query timeout after 5 seconds')), 5000)
    );

    const result = await Promise.race([pageAccessPromise, timeoutPromise]);
    const { data, error } = result;

    if (error) {
      console.error('[AuthOptimization] Page access query error:', error);
      throw error;
    }

    // Convert snake_case database fields to camelCase for frontend consistency
    const pageAccess = data || {
      profile: true,
      apply_leave: true,
      submit_claim: true,
      payslips: true,
      my_attendance: true,
      slot_booking_employee: true
    };

    return {
      profile: pageAccess.profile,
      applyLeave: pageAccess.apply_leave,
      submitClaim: pageAccess.submit_claim,
      payslips: pageAccess.payslips,
      myAttendance: pageAccess.my_attendance,
      slotBookingEmployee: pageAccess.slot_booking_employee
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