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
 * Get employee data using SECURITY DEFINER RPC (bypasses slow RLS)
 */
export const getCurrentUserEmployee = async (email: string, authUserId?: string): Promise<any> => {
  try {
    logger.debug('Fetching employee data via RPC', { email });
    
    const dbQuery = supabase.rpc('get_employee_by_email_for_auth', { p_email: email });
    const timeout = new Promise<{ data: null, error: { message: string } }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: 'timeout' } }), 5000)
    );
    
    const result = await Promise.race([dbQuery, timeout]);
    
    if (result.data && !result.error) {
      // RPC returns array, take first row
      const row = Array.isArray(result.data) ? result.data[0] : result.data;
      if (row) {
        logger.debug('Got employee data via RPC');
        const isSuperadmin = await checkSuperadminStatusDirect(email);
        const userData = { ...row, isSuperadmin };
        cacheEmployeeData(userData, authUserId);
        return userData;
      }
    }
    
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
    throw error;
  }
};

export const getUserData = getCurrentUserEmployee;

/**
 * Get admin access using SECURITY DEFINER RPC
 */
export const getUserAdminAccess = async (employeeId: string) => {
  try {
    const dbQuery = supabase.rpc('get_admin_access_for_auth', { p_employee_id: employeeId });
    const timeout = new Promise<{ data: null, error: { message: string } }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: 'timeout' } }), 3000)
    );

    const { data, error } = await Promise.race([dbQuery, timeout]);

    if (data && !error) {
      const row = Array.isArray(data) ? data[0] : data;
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
    throw error;
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
    const dbQuery = supabase.rpc('get_page_access_for_auth', { p_employee_id: employeeId });
    const timeout = new Promise<{ data: null, error: { message: string } }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: 'timeout' } }), 3000)
    );

    const { data, error } = await Promise.race([dbQuery, timeout]);

    if (data && !error) {
      const row = Array.isArray(data) ? data[0] : data;
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
 * Check superadmin status - direct query (superadmin_users has simple RLS)
 */
const checkSuperadminStatusDirect = async (email: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('superadmin_users')
      .select('is_active')
      .eq('employee_email', email)
      .maybeSingle();
    if (error) return false;
    return data?.is_active === true;
  } catch { return false; }
};

export const checkSuperadminStatus = async (email: string): Promise<boolean> => {
  return checkSuperadminStatusDirect(email);
};

export const checkSuperadminStatusCached = checkSuperadminStatusDirect;

export { clearAuthCache } from './authCacheService';
