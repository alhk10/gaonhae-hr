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

// Static fallbacks keyed by employee ID - more stable than email
const STATIC_FALLBACKS: Record<string, any> = {
  'EMP1764254219246': { id: 'EMP1764254219246', name: 'Chew Wee Hong Jeremy', type: 'Casual', position: '', department: 'Main Office', isSuperadmin: false },
  'EMP1750865290864': { id: 'EMP1750865290864', name: 'Corpuz Albert Jr Tiggangay', type: 'Full-Time', position: 'Senior Instructor', department: 'Main Office', base_salary: 3700, isSuperadmin: false },
  'EMP1751003565851': { id: 'EMP1751003565851', name: 'Lee Heng Keong Alvin', type: 'Full-Time', position: 'Senior Partner', department: 'Main Office', base_salary: 7200, isSuperadmin: true },
  'EMP1751030249722': { id: 'EMP1751030249722', name: 'Carissa Lee Masters', type: 'Casual', position: 'Casual Instructor', department: 'Main Office', isSuperadmin: false },
  'EMP1750866475666': { id: 'EMP1750866475666', name: 'Cha Jinwoo', type: 'Full-Time', position: 'Instructor', department: 'Main Office', base_salary: 3200, isSuperadmin: false },
  'EMP1751030381806': { id: 'EMP1751030381806', name: 'Clarissa Koh Jia Xuan', type: 'Casual', position: 'Casual Instructor', department: 'Main Office', isSuperadmin: false },
  'EMP1751006728858': { id: 'EMP1751006728858', name: 'Aw Yi Zhe Eldon', type: 'Casual', position: 'Casual Instructor', department: 'Main Office', base_salary: 650, isSuperadmin: false },
  'EMP1751006227595': { id: 'EMP1751006227595', name: 'Eugene Goh', type: 'Casual', position: 'Casual Instructor', department: 'Main Office', base_salary: 400, isSuperadmin: false },
  'EMP1750863118850': { id: 'EMP1750863118850', name: 'Kim Hasung', type: 'Full-Time', position: 'Senior Instructor', department: 'Main Office', base_salary: 3650, isSuperadmin: false },
  'EMP1750864876850': { id: 'EMP1750864876850', name: 'Kang Hyunjun', type: 'Full-Time', position: 'General Manager', department: 'Main Office', base_salary: 6800, isSuperadmin: false },
  'EMP1752646101747': { id: 'EMP1752646101747', name: 'Wang Pot Chien', type: 'Casual', position: 'Casual Instructor', department: 'Main Office', isSuperadmin: false },
  'EMP1751007228999': { id: 'EMP1751007228999', name: 'Jason Lu Lijie', type: 'Casual', position: 'Casual Instructor', department: 'Main Office', base_salary: 1875, isSuperadmin: false },
  'EMP1751006368759': { id: 'EMP1751006368759', name: 'Ng Kai Rui Jovious', type: 'Casual', position: 'Casual Instructor', department: 'Kembangan', base_salary: 200, isSuperadmin: false },
  'EMP1750866300088': { id: 'EMP1750866300088', name: 'Jason Chiang Jia Jun', type: 'Full-Time', position: 'Instructor', department: 'Main Office', base_salary: 900, isSuperadmin: false },
  'EMP1751004127565': { id: 'EMP1751004127565', name: 'Lee Yan Xuan', type: 'Casual', position: 'Casual Admin', department: 'Main Office', base_salary: 850, isSuperadmin: false },
  'EMP1751006564567': { id: 'EMP1751006564567', name: 'Liou Siting Jolene', type: 'Casual', position: 'Casual Employee', department: 'Main Office', base_salary: 237.5, isSuperadmin: false },
  'EMP1751029837839': { id: 'EMP1751029837839', name: 'Nigel Koh K Jun', type: 'Casual', position: 'Casual Instructor', department: 'Main Office', isSuperadmin: false },
  'EMP1751003052389': { id: 'EMP1751003052389', name: 'Kang Hyeonman', type: 'Full-Time', position: 'Senior Partner', department: 'Main Office', base_salary: 12320, isSuperadmin: false },
  'EMP1751006984631': { id: 'EMP1751006984631', name: 'Goh Jun Jie Ryan', type: 'Casual', position: 'Casual Instructor', department: 'Main Office', base_salary: 1000, isSuperadmin: false },
  'EMP1752551410290': { id: 'EMP1752551410290', name: 'Siti Aisyah Binti Mohammed Nazzer', type: 'Casual', position: '', department: 'Main Office', base_salary: 800, isSuperadmin: false },
  'EMP1750866645618': { id: 'EMP1750866645618', name: 'Lee Soohyuk', type: 'Full-Time', position: 'Partner', department: 'Main Office', base_salary: 10500, isSuperadmin: false },
  'EMP1751006650365': { id: 'EMP1751006650365', name: 'Song Zihan', type: 'Casual', position: 'Casual Instructor', department: 'Main Office', base_salary: 950, isSuperadmin: false }
};

// Email to Employee ID mapping for static fallback lookup
const EMAIL_TO_EMPLOYEE_ID: Record<string, string> = {
  'leeesh101@gmail.com': 'EMP1750866645618',
  // Add more email mappings as needed
};

/**
 * Get static fallback by email - matches email to employee ID then returns fallback data
 */
const getStaticFallbackByEmail = (email: string): any | null => {
  // First try direct email mapping
  const employeeId = EMAIL_TO_EMPLOYEE_ID[email];
  if (employeeId && STATIC_FALLBACKS[employeeId]) {
    return STATIC_FALLBACKS[employeeId];
  }
  
  // If no mapping, search all fallbacks for matching email pattern in name
  // This is a last resort for common name patterns
  return null;
};

/**
 * Get employee data with robust fallback system:
 * 1. Try database query with timeout
 * 2. Fall back to session cache (survives email changes)
 * 3. Fall back to static data (last resort)
 */
export const getCurrentUserEmployee = async (email: string, authUserId?: string): Promise<any> => {
  try {
    logger.debug('Fetching employee data', { email, authUserId });
    
    // First, try a quick database query
    const quickCheck = supabase
      .from('employees')
      .select('*')
      .eq('email', email)
      .maybeSingle();
      
    const quickTimeout = new Promise<{ data: null, error: null }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: null }), 800)
    );
    
    const quickResult = await Promise.race([quickCheck, quickTimeout]);
    
    // If we got real data quickly, cache it and return
    if (quickResult.data && !quickResult.error) {
      logger.debug('Got employee data quickly from database');
      const isSuperadmin = await checkSuperadminStatusCached(email).catch(() => false);
      const userData = { ...quickResult.data, isSuperadmin };
      
      // Cache the data for future fallback
      cacheEmployeeData({
        ...userData,
        isSuperadmin
      }, authUserId);
      
      return userData;
    }
    
    // Database was slow or returned no data - try fallbacks
    logger.warn('Database slow or no data, trying fallbacks', { email });
    
    // Fallback 1: Try session cache by auth user ID (most reliable for email changes)
    if (authUserId) {
      const cachedByAuth = getCachedEmployeeByAuthId(authUserId);
      if (cachedByAuth) {
        logger.info('Using cached employee data by auth ID', { authUserId });
        // Update the email in cache if it changed
        if (cachedByAuth.email !== email) {
          cachedByAuth.email = email;
          cacheEmployeeData(cachedByAuth, authUserId);
        }
        return cachedByAuth;
      }
    }
    
    // Fallback 2: Try session cache by email
    const cachedByEmail = getCachedEmployeeByEmail(email);
    if (cachedByEmail) {
      logger.info('Using cached employee data by email', { email });
      return cachedByEmail;
    }
    
    // Fallback 3: Try static fallbacks by email match
    const staticFallback = getStaticFallbackByEmail(email);
    if (staticFallback) {
      logger.info('Using static fallback by email', { email });
      return { ...staticFallback, email };
    }
    
    // Fallback 4: Extended database query (give it more time)
    logger.debug('Trying extended database query');
    const extendedQuery = supabase
      .from('employees')
      .select('*')
      .eq('email', email)
      .maybeSingle();
      
    const extendedTimeout = new Promise<{ data: null, error: null }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: null }), 3000)
    );
    
    const extendedResult = await Promise.race([extendedQuery, extendedTimeout]);
    
    if (extendedResult.data && !extendedResult.error) {
      logger.debug('Got employee data from extended query');
      const isSuperadmin = await checkSuperadminStatusCached(email).catch(() => false);
      const userData = { ...extendedResult.data, isSuperadmin };
      
      cacheEmployeeData(userData, authUserId);
      return userData;
    }
    
    // No cached data and database unresponsive
    logger.warn('No employee data available', { email });
    return null;
    
  } catch (error) {
    logger.error('Error fetching employee data', error);
    
    // Even on error, try cache fallback
    if (authUserId) {
      const cachedByAuth = getCachedEmployeeByAuthId(authUserId);
      if (cachedByAuth) {
        logger.info('Using cached employee data after error', { authUserId });
        return cachedByAuth;
      }
    }
    
    const cachedByEmail = getCachedEmployeeByEmail(email);
    if (cachedByEmail) {
      logger.info('Using cached employee data after error', { email });
      return cachedByEmail;
    }
    
    // Try static fallback on error too
    const staticFallback = getStaticFallbackByEmail(email);
    if (staticFallback) {
      logger.info('Using static fallback after error', { email });
      return { ...staticFallback, email };
    }
    
    throw error;
  }
};

// Alias for compatibility
export const getUserData = getCurrentUserEmployee;

/**
 * Get user admin access with caching and fallback
 */
export const getUserAdminAccess = async (employeeId: string) => {
  try {
    logger.debug('Fetching admin access for employee', { employeeId });
    
    // Quick database query with timeout
    const adminAccessPromise = supabase
      .from('admin_access')
      .select('*')
      .eq('employee_id', employeeId)
      .maybeSingle();

    const timeoutPromise = new Promise<{ data: null, error: null }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: null }), 800)
    );

    const result = await Promise.race([adminAccessPromise, timeoutPromise]);
    const { data, error } = result;

    if (data && !error) {
      logger.debug('Admin access fetched successfully', { employeeId });
      
      const accessData = {
        employees: data.employees || false,
        payroll: data.payroll || false,
        leaveManagement: data.leave_management || false,
        claims: data.claims || false,
        attendance: data.attendance || false,
        slotBooking: data.slotBooking || data.slot_booking || false,
        reports: data.reports || false
      };
      
      // Cache for future use
      cacheAdminAccess(employeeId, accessData);
      return accessData;
    }

    // Database slow or error - try cache fallback
    logger.warn('Admin access query slow/failed, trying cache', { employeeId });
    
    const cachedAccess = getCachedAdminAccess(employeeId);
    if (cachedAccess) {
      logger.info('Using cached admin access', { employeeId });
      return cachedAccess;
    }
    
    // Extended query
    const extendedQuery = supabase
      .from('admin_access')
      .select('*')
      .eq('employee_id', employeeId)
      .maybeSingle();

    const extendedTimeout = new Promise<{ data: null, error: null }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: null }), 2000)
    );

    const extendedResult = await Promise.race([extendedQuery, extendedTimeout]);
    
    if (extendedResult.data && !extendedResult.error) {
      const accessData = {
        employees: extendedResult.data.employees || false,
        payroll: extendedResult.data.payroll || false,
        leaveManagement: extendedResult.data.leave_management || false,
        claims: extendedResult.data.claims || false,
        attendance: extendedResult.data.attendance || false,
        slotBooking: extendedResult.data.slotBooking || extendedResult.data.slot_booking || false,
        reports: extendedResult.data.reports || false
      };
      
      cacheAdminAccess(employeeId, accessData);
      return accessData;
    }
    
    // Default: no admin access
    logger.info('No admin access found for employee', { employeeId });
    return null;
    
  } catch (error) {
    logger.error('Error fetching admin access', error);
    
    // Try cache on error
    const cachedAccess = getCachedAdminAccess(employeeId);
    if (cachedAccess) {
      logger.info('Using cached admin access after error', { employeeId });
      return cachedAccess;
    }
    
    throw error;
  }
};

/**
 * Get user page access with caching and fallback
 */
export const getUserPageAccess = async (employeeId: string) => {
  try {
    logger.debug('Fetching page access for employee', { employeeId });
    
    const defaultAccess = {
      profile: true,
      applyLeave: true,
      submitClaim: true,
      payslips: true,
      myAttendance: true,
      slotBookingEmployee: true
    };
    
    // Quick database query with timeout
    const pageAccessPromise = supabase
      .from('employee_page_access')
      .select('*')
      .eq('employee_id', employeeId)
      .maybeSingle();

    const timeoutPromise = new Promise<{ data: null, error: null }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: null }), 800)
    );

    const result = await Promise.race([pageAccessPromise, timeoutPromise]);
    const { data, error } = result;

    if (data && !error) {
      logger.debug('Page access fetched successfully', { employeeId });
      
      const accessData = {
        profile: data.profile ?? true,
        applyLeave: data.apply_leave ?? true,
        submitClaim: data.submit_claim ?? true,
        payslips: data.payslips ?? true,
        myAttendance: data.my_attendance ?? true,
        slotBookingEmployee: data.slot_booking_employee ?? true
      };
      
      // Cache for future use
      cachePageAccess(employeeId, accessData);
      return accessData;
    }

    // Database slow or error - try cache fallback
    logger.warn('Page access query slow/failed, trying cache', { employeeId });
    
    const cachedAccess = getCachedPageAccess(employeeId);
    if (cachedAccess) {
      logger.info('Using cached page access', { employeeId });
      return cachedAccess;
    }
    
    // Extended query
    const extendedQuery = supabase
      .from('employee_page_access')
      .select('*')
      .eq('employee_id', employeeId)
      .maybeSingle();

    const extendedTimeout = new Promise<{ data: null, error: null }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: null }), 2000)
    );

    const extendedResult = await Promise.race([extendedQuery, extendedTimeout]);
    
    if (extendedResult.data && !extendedResult.error) {
      const accessData = {
        profile: extendedResult.data.profile ?? true,
        applyLeave: extendedResult.data.apply_leave ?? true,
        submitClaim: extendedResult.data.submit_claim ?? true,
        payslips: extendedResult.data.payslips ?? true,
        myAttendance: extendedResult.data.my_attendance ?? true,
        slotBookingEmployee: extendedResult.data.slot_booking_employee ?? true
      };
      
      cachePageAccess(employeeId, accessData);
      return accessData;
    }
    
    // No data found - return defaults
    logger.debug('No page access found for employee, using defaults', { employeeId });
    return defaultAccess;
    
  } catch (error) {
    logger.error('Error fetching page access', error);
    
    // Try cache on error
    const cachedAccess = getCachedPageAccess(employeeId);
    if (cachedAccess) {
      logger.info('Using cached page access after error', { employeeId });
      return cachedAccess;
    }
    
    // Return defaults as ultimate fallback
    return {
      profile: true,
      applyLeave: true,
      submitClaim: true,
      payslips: true,
      myAttendance: true,
      slotBookingEmployee: true
    };
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

// Re-export cache clearing from cache service
export { clearAuthCache } from './authCacheService';