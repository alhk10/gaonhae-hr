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

import { withTimeout } from '@/utils/asyncHelpers';

// Convert supabase query builder to a real Promise
const toPromise = <T>(queryBuilder: PromiseLike<T>): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    queryBuilder.then(resolve, reject);
  });
};

/**
 * Get employee data using SECURITY DEFINER RPC (bypasses slow RLS)
 */
export const getCurrentUserEmployee = async (email: string, authUserId?: string): Promise<any> => {
  try {
    logger.debug('Fetching employee data via RPC', { email });
    
    // Call RPC directly without toPromise wrapper - supabase already returns a thenable
    let result: any;
    try {
      const rpcCall = supabase.rpc('get_employee_by_email_for_auth', { p_email: email });
      result = await withTimeout(
        Promise.resolve(rpcCall) as Promise<any>,
        5000,
        { data: null, error: { message: 'timeout' } } as any
      );
    } catch (rpcError) {
      logger.error('RPC call failed', rpcError);
      result = { data: null, error: rpcError };
    }
    
    logger.debug('RPC result', { 
      hasData: !!result?.data, 
      dataType: typeof result?.data,
      isArray: Array.isArray(result?.data),
      dataLength: Array.isArray(result?.data) ? result.data.length : 'n/a',
      error: result?.error?.message || null
    });
    
    if (result?.data && !result?.error) {
      const row = Array.isArray(result.data) ? result.data[0] : result.data;
      if (row && row.id) {
        logger.debug('Got employee data via RPC', { employeeId: row.id, name: row.name });
        let isSuperadmin = false;
        try {
          const saResult = await withTimeout(
            Promise.resolve(supabase.rpc('is_superadmin', { user_email: email })) as Promise<any>,
            5000,
            { data: false, error: null } as any
          );
          logger.debug('Superadmin RPC result inside getCurrentUserEmployee', { 
            data: saResult?.data, 
            error: saResult?.error?.message,
            email 
          });
          isSuperadmin = saResult?.data === true;
        } catch (saErr) { 
          logger.error('Superadmin check failed in getCurrentUserEmployee', saErr);
          isSuperadmin = false; 
        }
        logger.debug('Final isSuperadmin value', { isSuperadmin, email });
        
        const userData = { ...row, isSuperadmin };
        cacheEmployeeData(userData, authUserId);
        return userData;
      }
    }
    
    logger.debug('RPC returned no usable employee data, trying cache', {
      rawData: JSON.stringify(result?.data)?.substring(0, 200)
    });
    
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
      Promise.resolve(supabase.rpc('get_admin_access_for_auth', { p_employee_id: employeeId })) as Promise<any>,
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
    payslips: true, myAttendance: true, slotBookingEmployee: true,
    cctvMonitoring: false,
    socialMedia: false
  };

  try {
    const result = await withTimeout(
      Promise.resolve(supabase.rpc('get_page_access_for_auth', { p_employee_id: employeeId })) as Promise<any>,
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
          slotBookingEmployee: row.slot_booking_employee ?? true,
          cctvMonitoring: row.cctv_monitoring ?? false
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
      Promise.resolve(supabase.rpc('is_superadmin', { user_email: email })) as Promise<any>,
      2000,
      { data: false, error: null } as any
    );
    return result.data === true;
  } catch { return false; }
};

export const checkSuperadminStatusCached = checkSuperadminStatus;

export { clearAuthCache } from './authCacheService';
