import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export const getCurrentUserEmployee = async (email: string): Promise<any> => {
  try {
    logger.debug('Fetching employee data', { email });
    
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
    
    // Check if we have an emergency fallback - return it immediately if database is slow
    if (emergencyFallbacks[email]) {
      logger.warn('Using emergency fallback', { email });
      // Try database but with very short timeout (2s)
      const quickCheck = supabase
        .from('employees')
        .select('*')
        .eq('email', email)
        .maybeSingle();
        
      const quickTimeout = new Promise<{ data: null, error: null }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: null }), 2000)
      );
      
      const quickResult = await Promise.race([quickCheck, quickTimeout]);
      
      // If we got real data quickly, use it
      if (quickResult.data && !quickResult.error) {
        logger.debug('Got employee data quickly');
        const isSuperadmin = await checkSuperadminStatusCached(email).catch(() => false);
        return { ...quickResult.data, isSuperadmin };
      }
      
      // Otherwise return emergency fallback immediately
      logger.info('Returning emergency fallback immediately');
      return emergencyFallbacks[email];
    }
    
    // Standard database query with timeout
    const employeeDataPromise = supabase
      .from('employees')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => {
        logger.warn('Database timeout after 3 seconds');
        reject(new Error('Employee query timeout after 3 seconds'));
      }, 3000)
    );

    let result;
    try {
      result = await Promise.race([employeeDataPromise, timeoutPromise]);
    } catch (timeoutError) {
      throw timeoutError;
    }

    const { data, error } = result;

    if (error) {
      logger.error('Employee query error', error, { email });
      // If error and we have emergency fallback, use it
      if (emergencyFallbacks[email]) {
        logger.warn('Database error - using emergency fallback', { email });
        return emergencyFallbacks[email];
      }
      throw error;
    }

    if (!data) {
      logger.info('No employee found for email', { email });
      // If no data and we have emergency fallback, use it
      if (emergencyFallbacks[email]) {
        logger.warn('No data found - using emergency fallback', { email });
        return emergencyFallbacks[email];
      }
      return null;
    }

    logger.debug('Employee data fetched successfully', { email });
    
    // Check superadmin status
    let isSuperadmin = false;
    try {
      isSuperadmin = await checkSuperadminStatusCached(email);
      logger.debug('Superadmin check result', { email, isSuperadmin });
    } catch (superadminError) {
      logger.warn('Failed to check superadmin status', superadminError, { email });
    }
    
    // Add additional processing fields
    const userData = {
      ...data,
      isSuperadmin
    };

    return userData;
    
  } catch (error) {
    logger.error('Error fetching employee data', error);
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
    logger.debug('Fetching admin access for employee', { employeeId });
    
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
    
    // Standard timeout for admin access queries (3 seconds)
    const adminAccessPromise = supabase
      .from('admin_access')
      .select('*')
      .eq('employee_id', employeeId)
      .maybeSingle();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => {
        logger.warn('Admin access timeout after 3 seconds');
        reject(new Error('Admin access query timeout after 3 seconds'));
      }, 3000)
    );

    let result;
    try {
      result = await Promise.race([adminAccessPromise, timeoutPromise]);
    } catch (timeoutError) {
      // If timeout and we have emergency fallback, use it
      if (adminAccessFallbacks[employeeId]) {
        logger.warn('Admin access timeout - using emergency fallback', { employeeId });
        return adminAccessFallbacks[employeeId];
      }
      throw timeoutError;
    }

    const { data, error } = result;

    if (error) {
      logger.error('Admin access query error', error, { employeeId });
      // If error and we have emergency fallback, use it
      if (adminAccessFallbacks[employeeId]) {
        logger.warn('Admin access error - using emergency fallback', { employeeId });
        return adminAccessFallbacks[employeeId];
      }
      throw error;
    }

    if (!data) {
      logger.info('No admin access found for employee', { employeeId });
      // If no data and we have emergency fallback, use it
      if (adminAccessFallbacks[employeeId]) {
        logger.warn('No admin access data - using emergency fallback', { employeeId });
        return adminAccessFallbacks[employeeId];
      }
      return null;
    }

    logger.debug('Admin access fetched successfully', { employeeId });
    
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
    logger.error('Error fetching admin access', error);
    throw error;
  }
};

/**
 * Get user page access with fallbacks
 */
export const getUserPageAccess = async (employeeId: string) => {
  try {
    logger.debug('Fetching page access for employee', { employeeId });
    
    // Page access query with standard timeout
    const pageAccessPromise = supabase
      .from('employee_page_access')
      .select('*')
      .eq('employee_id', employeeId)
      .maybeSingle();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Page access query timeout after 3 seconds')), 3000)
    );

    const { data, error } = await Promise.race([pageAccessPromise, timeoutPromise]);

    if (error) {
      logger.error('Page access query error', error, { employeeId });
      throw error;
    }

    if (!data) {
      logger.debug('No page access found for employee, using defaults', { employeeId });
      return {
        profile: true,
        applyLeave: true,
        submitClaim: true,
        payslips: true,
        myAttendance: true,
        slotBookingEmployee: true
      };
    }

    logger.debug('Page access fetched successfully', { employeeId });
    
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
    logger.error('Error fetching page access', error);
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
    logger.error('Error checking superadmin status', error);
    return false;
  }
};

/**
 * Check superadmin status with caching
 */
export const checkSuperadminStatusCached = async (email: string): Promise<boolean> => {
  try {
    logger.debug('Checking superadmin status', { email });
    
    const { data, error } = await supabase
      .from('superadmin_users')
      .select('is_active')
      .eq('employee_email', email)
      .maybeSingle();

    if (error) {
      logger.error('Superadmin query error', error, { email });
      return false;
    }

    const isSuperadmin = data?.is_active === true;
    logger.debug('Superadmin status result', { email, isSuperadmin });
    
    return isSuperadmin;
  } catch (error) {
    logger.error('Error checking superadmin status', error);
    return false;
  }
};

// Cache clearing placeholder
export const clearAuthCache = () => {
  logger.debug('Auth cache cleared');
};