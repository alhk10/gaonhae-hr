import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { 
  getCachedEmployeeByEmail, 
  getCachedEmployeeByAuthId,
  cacheEmployeeData,
  getCachedAdminAccess,
  cacheAdminAccess,
  getCachedPageAccess,
  cachePageAccess,
  clearAuthCache as clearCacheService
} from './authCacheService';

/**
 * Get employee data with single query + cache fallback (no double timeout pattern)
 */
export const getCurrentUserEmployee = async (email: string, authUserId?: string): Promise<any> => {
  try {
    logger.debug('Fetching employee data', { email, authUserId });
    
    // Single database query with 8s timeout
    const dbQuery = supabase
      .from('employees')
      .select('*')
      .eq('email', email)
      .maybeSingle();
      
    const timeout = new Promise<{ data: null, error: null }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: null }), 8000)
    );
    
    const result = await Promise.race([dbQuery, timeout]);
    
    if (result.data && !result.error) {
      logger.debug('Got employee data from database');
      const isSuperadmin = await checkSuperadminStatusCached(email).catch(() => false);
      const userData = { ...result.data, isSuperadmin };
      cacheEmployeeData(userData, authUserId);
      return userData;
    }
    
    // DB slow or no data — try cache fallbacks
    logger.warn('Database slow or no data, trying fallbacks', { email });
    
    if (authUserId) {
      const cachedByAuth = getCachedEmployeeByAuthId(authUserId);
      if (cachedByAuth) {
        logger.info('Using cached employee data by auth ID');
        if (cachedByAuth.email !== email) {
          cachedByAuth.email = email;
          cacheEmployeeData(cachedByAuth, authUserId);
        }
        return cachedByAuth;
      }
    }
    
    const cachedByEmail = getCachedEmployeeByEmail(email);
    if (cachedByEmail) {
      logger.info('Using cached employee data by email');
      return cachedByEmail;
    }
    
    logger.warn('No employee data available', { email });
    return null;
    
  } catch (error) {
    logger.error('Error fetching employee data', error);
    
    if (authUserId) {
      const cachedByAuth = getCachedEmployeeByAuthId(authUserId);
      if (cachedByAuth) return cachedByAuth;
    }
    
    const cachedByEmail = getCachedEmployeeByEmail(email);
    if (cachedByEmail) return cachedByEmail;
    
    throw error;
  }
};

// Alias for compatibility
export const getUserData = getCurrentUserEmployee;

/**
 * Get user admin access — single query with 5s timeout + cache fallback
 */
export const getUserAdminAccess = async (employeeId: string) => {
  try {
    const dbQuery = supabase
      .from('admin_access')
      .select('*')
      .eq('employee_id', employeeId)
      .maybeSingle();

    const timeout = new Promise<{ data: null, error: null }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: null }), 5000)
    );

    const { data, error } = await Promise.race([dbQuery, timeout]);

    if (data && !error) {
      const accessData = {
        employees: data.employees || false,
        payroll: data.payroll || false,
        leaveManagement: data.leave_management || false,
        claims: data.claims || false,
        attendance: data.attendance || false,
        slotBooking: data.slotBooking || data.slot_booking || false,
        reports: data.reports || false
      };
      cacheAdminAccess(employeeId, accessData);
      return accessData;
    }

    // Cache fallback
    const cachedAccess = getCachedAdminAccess(employeeId);
    if (cachedAccess) {
      logger.info('Using cached admin access', { employeeId });
      return cachedAccess;
    }
    
    return null;
    
  } catch (error) {
    logger.error('Error fetching admin access', error);
    const cachedAccess = getCachedAdminAccess(employeeId);
    if (cachedAccess) return cachedAccess;
    throw error;
  }
};

/**
 * Get user page access — single query with 5s timeout + cache fallback
 */
export const getUserPageAccess = async (employeeId: string) => {
  const defaultAccess = {
    profile: true,
    applyLeave: true,
    submitClaim: true,
    payslips: true,
    myAttendance: true,
    slotBookingEmployee: true
  };

  try {
    const dbQuery = supabase
      .from('employee_page_access')
      .select('*')
      .eq('employee_id', employeeId)
      .maybeSingle();

    const timeout = new Promise<{ data: null, error: null }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: null }), 5000)
    );

    const { data, error } = await Promise.race([dbQuery, timeout]);

    if (data && !error) {
      const accessData = {
        profile: data.profile ?? true,
        applyLeave: data.apply_leave ?? true,
        submitClaim: data.submit_claim ?? true,
        payslips: data.payslips ?? true,
        myAttendance: data.my_attendance ?? true,
        slotBookingEmployee: data.slot_booking_employee ?? true
      };
      cachePageAccess(employeeId, accessData);
      return accessData;
    }

    const cachedAccess = getCachedPageAccess(employeeId);
    if (cachedAccess) {
      logger.info('Using cached page access', { employeeId });
      return cachedAccess;
    }
    
    return defaultAccess;
    
  } catch (error) {
    logger.error('Error fetching page access', error);
    const cachedAccess = getCachedPageAccess(employeeId);
    if (cachedAccess) return cachedAccess;
    return defaultAccess;
  }
};

/**
 * Check superadmin status
 */
export const checkSuperadminStatus = async (email: string): Promise<boolean> => {
  try {
    return await checkSuperadminStatusCached(email);
  } catch (error) {
    logger.error('Error checking superadmin status', error);
    return false;
  }
};

export const checkSuperadminStatusCached = async (email: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('superadmin_users')
      .select('is_active')
      .eq('employee_email', email)
      .maybeSingle();

    if (error) {
      logger.error('Superadmin query error', error);
      return false;
    }

    return data?.is_active === true;
  } catch (error) {
    logger.error('Error checking superadmin status', error);
    return false;
  }
};

export { clearAuthCache } from './authCacheService';
