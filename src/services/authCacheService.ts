import { logger } from '@/utils/logger';

const CACHE_KEY_PREFIX = 'auth_cache_';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface CachedEmployeeData {
  id: string;
  name: string;
  email: string;
  type: string;
  position?: string;
  department?: string;
  phone?: string;
  address?: string;
  nric?: string;
  base_salary?: number | null;
  hourly_rate?: number | null;
  join_date?: string | null;
  resign_date?: string | null;
  isSuperadmin: boolean;
  cachedAt: number;
}

export interface CachedAdminAccess {
  employees: boolean;
  payroll: boolean;
  leaveManagement: boolean;
  claims: boolean;
  attendance: boolean;
  slotBooking: boolean;
  reports: boolean;
  cachedAt: number;
}

export interface CachedPageAccess {
  profile: boolean;
  applyLeave: boolean;
  submitClaim: boolean;
  payslips: boolean;
  myAttendance: boolean;
  slotBookingEmployee: boolean;
  cctvMonitoring: boolean;
  socialMedia: boolean;
  cachedAt: number;
}

/**
 * Get cached employee data by employee ID
 */
export const getCachedEmployeeById = (employeeId: string): CachedEmployeeData | null => {
  try {
    const cached = sessionStorage.getItem(`${CACHE_KEY_PREFIX}employee_id_${employeeId}`);
    if (!cached) return null;
    
    const data = JSON.parse(cached) as CachedEmployeeData;
    
    // Check if cache is expired
    if (Date.now() - data.cachedAt > CACHE_EXPIRY_MS) {
      sessionStorage.removeItem(`${CACHE_KEY_PREFIX}employee_id_${employeeId}`);
      return null;
    }
    
    return data;
  } catch (error) {
    logger.warn('Failed to get cached employee by ID', error);
    return null;
  }
};

/**
 * Get cached employee data by email
 */
export const getCachedEmployeeByEmail = (email: string): CachedEmployeeData | null => {
  try {
    const cached = sessionStorage.getItem(`${CACHE_KEY_PREFIX}employee_email_${email.toLowerCase()}`);
    if (!cached) return null;
    
    const data = JSON.parse(cached) as CachedEmployeeData;
    
    // Check if cache is expired
    if (Date.now() - data.cachedAt > CACHE_EXPIRY_MS) {
      sessionStorage.removeItem(`${CACHE_KEY_PREFIX}employee_email_${email.toLowerCase()}`);
      return null;
    }
    
    return data;
  } catch (error) {
    logger.warn('Failed to get cached employee by email', error);
    return null;
  }
};

/**
 * Get cached employee data by auth user ID (most reliable for email changes)
 */
export const getCachedEmployeeByAuthId = (authUserId: string): CachedEmployeeData | null => {
  try {
    const cached = sessionStorage.getItem(`${CACHE_KEY_PREFIX}employee_auth_${authUserId}`);
    if (!cached) return null;
    
    const data = JSON.parse(cached) as CachedEmployeeData;
    
    // Check if cache is expired
    if (Date.now() - data.cachedAt > CACHE_EXPIRY_MS) {
      sessionStorage.removeItem(`${CACHE_KEY_PREFIX}employee_auth_${authUserId}`);
      return null;
    }
    
    return data;
  } catch (error) {
    logger.warn('Failed to get cached employee by auth ID', error);
    return null;
  }
};

/**
 * Cache employee data with multiple keys for flexible retrieval
 */
export const cacheEmployeeData = (data: Omit<CachedEmployeeData, 'cachedAt'>, authUserId?: string): void => {
  try {
    const cachedData: CachedEmployeeData = {
      ...data,
      cachedAt: Date.now()
    };
    
    const jsonData = JSON.stringify(cachedData);
    
    // Store by employee ID (primary key)
    sessionStorage.setItem(`${CACHE_KEY_PREFIX}employee_id_${data.id}`, jsonData);
    
    // Store by email (for lookup during login)
    if (data.email) {
      sessionStorage.setItem(`${CACHE_KEY_PREFIX}employee_email_${data.email.toLowerCase()}`, jsonData);
    }
    
    // Store by auth user ID (survives email changes)
    if (authUserId) {
      sessionStorage.setItem(`${CACHE_KEY_PREFIX}employee_auth_${authUserId}`, jsonData);
    }
    
    logger.debug('Employee data cached successfully', { employeeId: data.id, email: data.email });
  } catch (error) {
    logger.warn('Failed to cache employee data', error);
  }
};

/**
 * Get cached admin access by employee ID
 */
export const getCachedAdminAccess = (employeeId: string): Omit<CachedAdminAccess, 'cachedAt'> | null => {
  try {
    const cached = sessionStorage.getItem(`${CACHE_KEY_PREFIX}admin_access_${employeeId}`);
    if (!cached) return null;
    
    const data = JSON.parse(cached) as CachedAdminAccess;
    
    if (Date.now() - data.cachedAt > CACHE_EXPIRY_MS) {
      sessionStorage.removeItem(`${CACHE_KEY_PREFIX}admin_access_${employeeId}`);
      return null;
    }
    
    const { cachedAt, ...accessData } = data;
    return accessData;
  } catch (error) {
    logger.warn('Failed to get cached admin access', error);
    return null;
  }
};

/**
 * Cache admin access data
 */
export const cacheAdminAccess = (employeeId: string, access: Omit<CachedAdminAccess, 'cachedAt'>): void => {
  try {
    const cachedData: CachedAdminAccess = {
      ...access,
      cachedAt: Date.now()
    };
    
    sessionStorage.setItem(`${CACHE_KEY_PREFIX}admin_access_${employeeId}`, JSON.stringify(cachedData));
    logger.debug('Admin access cached successfully', { employeeId });
  } catch (error) {
    logger.warn('Failed to cache admin access', error);
  }
};

/**
 * Get cached page access by employee ID
 */
export const getCachedPageAccess = (employeeId: string): Omit<CachedPageAccess, 'cachedAt'> | null => {
  try {
    const cached = sessionStorage.getItem(`${CACHE_KEY_PREFIX}page_access_${employeeId}`);
    if (!cached) return null;
    
    const data = JSON.parse(cached) as CachedPageAccess;
    
    if (Date.now() - data.cachedAt > CACHE_EXPIRY_MS) {
      sessionStorage.removeItem(`${CACHE_KEY_PREFIX}page_access_${employeeId}`);
      return null;
    }
    
    const { cachedAt, ...accessData } = data;
    return accessData;
  } catch (error) {
    logger.warn('Failed to get cached page access', error);
    return null;
  }
};

/**
 * Cache page access data
 */
export const cachePageAccess = (employeeId: string, access: Omit<CachedPageAccess, 'cachedAt'>): void => {
  try {
    const cachedData: CachedPageAccess = {
      ...access,
      cachedAt: Date.now()
    };
    
    sessionStorage.setItem(`${CACHE_KEY_PREFIX}page_access_${employeeId}`, JSON.stringify(cachedData));
    logger.debug('Page access cached successfully', { employeeId });
  } catch (error) {
    logger.warn('Failed to cache page access', error);
  }
};

/**
 * Clear all auth cache (used on logout)
 */
export const clearAuthCache = (): void => {
  try {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(CACHE_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
    logger.debug('Auth cache cleared');
  } catch (error) {
    logger.warn('Failed to clear auth cache', error);
  }
};

/**
 * Update cached email when it changes (for email change scenarios)
 */
export const updateCachedEmail = (employeeId: string, oldEmail: string, newEmail: string): void => {
  try {
    const cached = getCachedEmployeeById(employeeId);
    if (cached) {
      // Remove old email cache
      sessionStorage.removeItem(`${CACHE_KEY_PREFIX}employee_email_${oldEmail.toLowerCase()}`);
      
      // Update and re-cache with new email
      cached.email = newEmail;
      cacheEmployeeData(cached);
      
      logger.debug('Cached email updated', { employeeId, oldEmail, newEmail });
    }
  } catch (error) {
    logger.warn('Failed to update cached email', error);
  }
};
