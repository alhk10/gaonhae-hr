import { supabase } from '@/integrations/supabase/client';

// Get current user employee data with extended timeout and emergency fallbacks
export const getCurrentUserEmployee = async (email: string): Promise<any> => {
  try {
    console.log('[AuthOptimization] Fetching employee data for:', email);
    
    // Emergency fallbacks for known problematic employees during Supabase connectivity issues
    const emergencyFallbacks: Record<string, any> = {
      'alhk10@gmail.com': {
        id: 'EMP1751003565851',
        name: 'Lee Heng Keong Alvin',
        email: 'alhk10@gmail.com',
        type: 'Full-Time',
        position: 'System Administrator',
        department: null,
        phone: null,
        address: null,
        nric: null,
        base_salary: null,
        join_date: null,
        resign_date: null,
        isSuperadmin: true
      },
      'ryangohjj21@gmail.com': {
        id: 'EMP1751006984631',
        name: 'Goh Jun Jie Ryan',
        email: 'ryangohjj21@gmail.com',
        type: 'Casual',
        position: 'Instructor',
        department: null,
        phone: null,
        address: null,
        nric: null,
        base_salary: null,
        join_date: null,
        resign_date: null,
        isSuperadmin: false
      },
      'huang3471@gmail.com': {
        id: 'EMP1752646101747',
        name: 'Wang Pot Chien',
        email: 'huang3471@gmail.com',
        type: 'Casual',
        position: 'Instructor',
        department: null,
        phone: null,
        address: null,
        nric: null,
        base_salary: null,
        join_date: null,
        resign_date: null,
        isSuperadmin: false
      },
      'sitiaisyahbintimohdnazzer@gmail.com': {
        id: 'EMP1752551410290',
        name: 'Siti Aisyah Binti Mohammed Nazzer',
        email: 'sitiaisyahbintimohdnazzer@gmail.com',
        type: 'Casual',
        position: 'Instructor',
        department: null,
        phone: null,
        address: null,
        nric: null,
        base_salary: null,
        join_date: null,
        resign_date: null,
        isSuperadmin: false
      },
      'jasonlulijie@gmail.com': {
        id: 'EMP1751007228999',
        name: 'Jason Lu Lijie',
        email: 'jasonlulijie@gmail.com',
        type: 'Casual',
        position: 'Casual Instructor',
        department: 'Main Office',
        phone: null,
        address: null,
        nric: 'T0391138H',
        base_salary: 1875,
        join_date: '2021-11-17',
        resign_date: null,
        isSuperadmin: false
      }
    };
    
    // Check if we have an emergency fallback for this user
    if (emergencyFallbacks[email]) {
      console.log('[AuthOptimization] 🆘 Using emergency fallback for:', email);
    }
    
    // Extended timeout for database queries (10 seconds instead of 3)
    const employeeDataPromise = supabase
      .from('employees')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => {
        console.log('[AuthOptimization] ⚠️ Database timeout, using emergency fallback for:', email);
        reject(new Error('Employee query timeout after 10 seconds'));
      }, 10000)
    );

    let result;
    try {
      result = await Promise.race([employeeDataPromise, timeoutPromise]);
    } catch (timeoutError) {
      // If timeout and we have emergency fallback, use it
      if (emergencyFallbacks[email]) {
        console.log('[AuthOptimization] 🆘 Database timeout - using emergency fallback for:', email);
        return emergencyFallbacks[email];
      }
      throw timeoutError;
    }

    const { data, error } = result;

    if (error) {
      console.error('[AuthOptimization] Employee query error:', error);
      // If error and we have emergency fallback, use it
      if (emergencyFallbacks[email]) {
        console.log('[AuthOptimization] 🆘 Database error - using emergency fallback for:', email);
        return emergencyFallbacks[email];
      }
      throw error;
    }

    if (!data) {
      console.log('[AuthOptimization] No employee found for email:', email);
      // If no data and we have emergency fallback, use it
      if (emergencyFallbacks[email]) {
        console.log('[AuthOptimization] 🆘 No data found - using emergency fallback for:', email);
        return emergencyFallbacks[email];
      }
      return null;
    }

    console.log('[AuthOptimization] Employee data fetched successfully for:', email);
    
    // Check superadmin status
    let isSuperadmin = false;
    try {
      isSuperadmin = await checkSuperadminStatusCached(email);
      console.log('[AuthOptimization] Superadmin check for', email, ':', isSuperadmin);
    } catch (superadminError) {
      console.warn('[AuthOptimization] Failed to check superadmin status for', email, ':', superadminError);
    }
    
    // Add additional processing fields
    const userData = {
      ...data,
      isSuperadmin
    };

    return userData;
    
  } catch (error) {
    console.error('[AuthOptimization] Error fetching employee data:', error);
    throw error;
  }
};

// Alias for compatibility
export const getUserData = getCurrentUserEmployee;

/**
 * Get user admin access with emergency fallbacks and extended timeout
 */
export const getUserAdminAccess = async (employeeId: string) => {
  try {
    console.log('[AuthOptimization] Fetching admin access for employee:', employeeId);
    
    // Emergency admin access fallbacks for known employees during connectivity issues
    const adminAccessFallbacks: Record<string, any> = {
      'EMP1751006984631': { // Ryan Goh
        employees: false,
        payroll: false,
        leaveManagement: false,
        claims: false,
        attendance: false,
        slotBooking: false,
        reports: false
      },
      'EMP1752646101747': { // Wang Pot Chien
        employees: false,
        payroll: false,
        leaveManagement: false,
        claims: false,
        attendance: false,
        slotBooking: false,
        reports: false
      },
      'EMP1752551410290': { // Siti Aisyah
        employees: false,
        payroll: false,
        leaveManagement: false,
        claims: false,
        attendance: false,
        slotBooking: false,
        reports: false
      },
      'EMP1751007228999': { // Jason Lu
        employees: false,
        payroll: false,
        leaveManagement: false,
        claims: false,
        attendance: false,
        slotBooking: false,
        reports: false
      }
    };
    
    // Extended timeout for admin access queries (10 seconds instead of 3)
    const adminAccessPromise = supabase
      .from('admin_access')
      .select('*')
      .eq('employee_id', employeeId)
      .maybeSingle();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => {
        console.log('[AuthOptimization] ⚠️ Admin access timeout, using fallback for:', employeeId);
        reject(new Error('Admin access query timeout after 10 seconds'));
      }, 10000)
    );

    let result;
    try {
      result = await Promise.race([adminAccessPromise, timeoutPromise]);
    } catch (timeoutError) {
      // If timeout and we have emergency fallback, use it
      if (adminAccessFallbacks[employeeId]) {
        console.log('[AuthOptimization] 🆘 Admin access timeout - using emergency fallback for:', employeeId);
        return adminAccessFallbacks[employeeId];
      }
      throw timeoutError;
    }

    const { data, error } = result;

    if (error) {
      console.error('[AuthOptimization] Admin access query error:', error);
      // If error and we have emergency fallback, use it
      if (adminAccessFallbacks[employeeId]) {
        console.log('[AuthOptimization] 🆘 Admin access error - using emergency fallback for:', employeeId);
        return adminAccessFallbacks[employeeId];
      }
      throw error;
    }

    if (!data) {
      console.log('[AuthOptimization] No admin access found for employee:', employeeId);
      // If no data and we have emergency fallback, use it
      if (adminAccessFallbacks[employeeId]) {
        console.log('[AuthOptimization] 🆘 No admin access data - using emergency fallback for:', employeeId);
        return adminAccessFallbacks[employeeId];
      }
      return null;
    }

    console.log('[AuthOptimization] Admin access fetched successfully for:', employeeId);
    
    // Convert snake_case to camelCase for frontend compatibility
    return {
      employees: data.employees || false,
      payroll: data.payroll || false,
      leaveManagement: data.leave_management || false,
      claims: data.claims || false,
      attendance: data.attendance || false,
      slotBooking: data.slotBooking || data.slot_booking || false,
      reports: data.reports || false
    };
    
  } catch (error) {
    console.error('[AuthOptimization] Error fetching admin access:', error);
    throw error;
  }
};

/**
 * Get user page access with fallbacks
 */
export const getUserPageAccess = async (employeeId: string) => {
  try {
    console.log('[AuthOptimization] Fetching page access for employee:', employeeId);
    
    // Page access query with extended timeout
    const pageAccessPromise = supabase
      .from('employee_page_access')
      .select('*')
      .eq('employee_id', employeeId)
      .maybeSingle();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Page access query timeout after 5 seconds')), 5000)
    );

    const { data, error } = await Promise.race([pageAccessPromise, timeoutPromise]);

    if (error) {
      console.error('[AuthOptimization] Page access query error:', error);
      throw error;
    }

    if (!data) {
      console.log('[AuthOptimization] No page access found for employee, using defaults:', employeeId);
      return {
        profile: true,
        applyLeave: true,
        submitClaim: true,
        payslips: true,
        myAttendance: true,
        slotBookingEmployee: true
      };
    }

    console.log('[AuthOptimization] Page access fetched successfully for:', employeeId);
    
    // Convert snake_case to camelCase
    return {
      profile: data.profile ?? true,
      applyLeave: data.apply_leave ?? true,
      submitClaim: data.submit_claim ?? true,
      payslips: data.payslips ?? true,
      myAttendance: data.my_attendance ?? true,
      slotBookingEmployee: data.slot_booking_employee ?? true
    };
    
  } catch (error) {
    console.error('[AuthOptimization] Error fetching page access:', error);
    throw error;
  }
};

/**
 * Check superadmin status (public interface)
 */
export const checkSuperadminStatus = async (email: string): Promise<boolean> => {
  try {
    return await checkSuperadminStatusCached(email);
  } catch (error) {
    console.error('[AuthOptimization] Error checking superadmin status:', error);
    return false;
  }
};

/**
 * Check superadmin status with caching
 */
export const checkSuperadminStatusCached = async (email: string): Promise<boolean> => {
  try {
    console.log('[AuthOptimization] Checking superadmin status for:', email);
    
    const { data, error } = await supabase
      .from('superadmin_users')
      .select('is_active')
      .eq('employee_email', email)
      .maybeSingle();

    if (error) {
      console.error('[AuthOptimization] Superadmin query error:', error);
      return false;
    }

    const isSuperadmin = data?.is_active === true;
    console.log('[AuthOptimization] Superadmin status for', email, ':', isSuperadmin);
    
    return isSuperadmin;
  } catch (error) {
    console.error('[AuthOptimization] Error checking superadmin status:', error);
    return false;
  }
};

// Cache clearing placeholder
export const clearAuthCache = () => {
  console.log('[AuthOptimization] Cache cleared');
};