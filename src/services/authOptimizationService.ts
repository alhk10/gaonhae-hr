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

// Helper: wrap any promise with a timeout
const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
  const timeout = new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms));
  return Promise.race([promise, timeout]);
};

/**
 * Get employee data using SECURITY DEFINER RPC (bypasses slow RLS)
 */
export const getCurrentUserEmployee = async (email: string, authUserId?: string): Promise<any> => {
  try {
    logger.debug('Fetching employee data via RPC', { email });
    
    const result = await withTimeout(
      supabase.rpc('get_employee_by_email_for_auth', { p_email: email }),
      4000,
      { data: null, error: { message: 'timeout' } } as any
    );
    
    if (result.data && !result.error) {
      const row = Array.isArray(result.data) ? result.data[0] : result.data;
      if (row) {
        logger.debug('Got employee data via RPC');
        const isSuperadmin = await withTimeout(
          supabase.rpc('is_superadmin', { user_email: email }).then(r => r.data === true),
          2000,
          false
        );
        const userData = { ...row, isSuperadmin };
        cacheEmployeeData(userData, authUserId);
        return userData;
      }
    }
    
    logger.debug('RPC returned no employee data, trying cache');
    
    // Cache fallbacks
    if (authUserId) {
      const cached = getCachedEmployeeByAuthId(authUserId);
      if (cached) { logger.info('Using cached employee by auth ID'); return cached; }
    }
    const cached = getCachedEmployeeByEmail(email);
    if (cached) { logger.info('Using cached employee by email'); return cached; }
    
    return null;
  } catch (error) {
    logger.error('Error fetching employee data', error);
    if (authUserId) {
      const cached = getCachedEmployeeByAuthId(authUserId);
      if (cached) return cached;
    }
    const cached = getCachedEmployeeByEmail(email);
    if (cached) return cached;
    return null;
  }
};

export const getUserData = getCurrentUserEmployee;

/**
 * Get admin access using SECURITY DEFINER RPC
 */
export const getUserAdminAccess = async (employeeId: string) => {
  try {
    const result = await withTimeout(
      supabase.rpc('get_admin_access_for_auth', { p_employee_id: employeeId }),
      3000,
      { data: null, error: { message: 'timeout' } } as any
    );

    if (result.data && !result.error) {
      const row = Array.isArray(result.data) ? result.data[0] : result.data;
      if (row) {
        const accessData = {
          employees: row.employees || false,
          payroll: row.payroll || false,
          leaveManagement: row.leave_management || false,
          claims: row.claims || false,
          attendance: row.attendance || false,
          slotBooking: row.slotBooking || row.slot_booking || false,
          reports: row.reports || false
        };
        cacheAdminAccess(employeeId, accessData);
        return accessData;
      }
    }

    const cached = getCachedAdminAccess(employeeId);
    if (cached) return cached;
    return null;
  } catch (error) {
    logger.error('Error fetching admin access', error);
    const cached = getCachedAdminAccess(employeeId);
    if (cached) return cached;
    return null;
  }
};

/**
 * Get page access using SECURITY DEFINER RPC
 */
export const getUserPageAccess = async (employeeId: string) => {
  const defaultAccess = {
    profile: true, applyLeave: true, submitClaim: true,
    payslips: true, myAttendance: true, slotBookingEmployee: true
  };

  try {
    const result = await withTimeout(
      supabase.rpc('get_page_access_for_auth', { p_employee_id: employeeId }),
      3000,
      { data: null, error: { message: 'timeout' } } as any
    );

    if (result.data && !result.error) {
      const row = Array.isArray(result.data) ? result.data[0] : result.data;
      if (row) {
        const accessData = {
          profile: row.profile ?? true,
          applyLeave: row.apply_leave ?? true,
          submitClaim: row.submit_claim ?? true,
          payslips: row.payslips ?? true,
          myAttendance: row.my_attendance ?? true,
          slotBookingEmployee: row.slot_booking_employee ?? true
        };
        cachePageAccess(employeeId, accessData);
        return accessData;
      }
    }

    const cached = getCachedPageAccess(employeeId);
    if (cached) return cached;
    return defaultAccess;
  } catch (error) {
    logger.error('Error fetching page access', error);
    const cached = getCachedPageAccess(employeeId);
    if (cached) return cached;
    return defaultAccess;
  }
};

/**
 * Check superadmin status via existing is_superadmin RPC
 */
export const checkSuperadminStatus = async (email: string): Promise<boolean> => {
  try {
    const result = await withTimeout(
      supabase.rpc('is_superadmin', { user_email: email }),
      2000,
      { data: false, error: null } as any
    );
    return result.data === true;
  } catch { return false; }
};

export const checkSuperadminStatusCached = checkSuperadminStatus;

export { clearAuthCache } from './authCacheService';
