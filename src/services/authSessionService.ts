import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getUserData, checkSuperadminStatus, getUserAdminAccess, getUserPageAccess } from './authOptimizationService';
import { logger } from '@/utils/logger';

// Static fallback mapping - matches authOptimizationService
const STATIC_EMPLOYEE_FALLBACKS: Record<string, any> = {
  'leeesh101@gmail.com': { id: 'EMP1750866645618', name: 'Lee Soohyuk', type: 'Full-Time', position: 'Partner', department: 'Main Office' },
  'alhk10@gmail.com': { id: 'EMP1751003565851', name: 'Lee Heng Keong Alvin', type: 'Full-Time', position: 'Senior Partner', department: 'Main Office' },
  // Add more as needed
};

export interface SessionUserData {
  id: string;
  email: string;
  name: string;
  employeeId?: string;
  department?: string;
  position?: string;
  role?: string;
}

export interface SessionResult {
  user: SessionUserData | null;
  userrole: 'employee' | 'admin' | 'superadmin' | null;
  userDetails: any;
  adminAccess: any;
  pageAccess: any;
  isSuperadmin: boolean;
}

export const processUserSession = async (session: Session | null): Promise<SessionResult | null> => {
  if (!session?.user) {
    return null;
  }

  const authUserId = session.user.id;
  const email = session.user.email!;
  
  logger.debug('Processing user session', { email, authUserId });

  try {
    // Step 1: Get employee data (passing auth user ID for caching)
    let userData = await getUserData(email, authUserId).catch(() => null);

    // If no userData from service, try local static fallback
    if (!userData) {
      const staticFallback = STATIC_EMPLOYEE_FALLBACKS[email];
      if (staticFallback) {
        logger.info('Using static employee fallback in session service', { email });
        userData = { ...staticFallback, email, isSuperadmin: false };
      }
    }

    if (!userData) {
      // Check if user is a superadmin
      const isSuperadmin = await checkSuperadminStatus(email).catch(() => false);
      
      if (isSuperadmin) {
        logger.info('User is superadmin', { email });
        return {
          user: {
            id: authUserId,
            email: email,
            name: email,
            role: 'superadmin',
          },
          userrole: 'superadmin',
          userDetails: null,
          adminAccess: null,
          pageAccess: null,
          isSuperadmin: true
        };
      }

      // Try quick employee lookup with static fallback
      const employeeData = await getEmployeeBasicData(email);
      
      return {
        user: {
          id: authUserId,
          email: email,
          name: employeeData?.name || email.split('@')[0],
          employeeId: employeeData?.id
        },
        userrole: 'employee',
        userDetails: employeeData || null,
        adminAccess: null,
        pageAccess: {
          profile: true,
          applyLeave: true,
          submitClaim: true,
          payslips: true,
          myAttendance: true,
          slotBookingEmployee: true
        },
        isSuperadmin: false
      };
    }

    // Check if employee data indicates superadmin
    if (userData.isSuperadmin) {
      logger.info('User identified as superadmin');
      return {
        user: {
          id: authUserId,
          email: email,
          name: userData.name,
          employeeId: userData.id,
          department: userData.department,
          position: userData.position
        },
        userrole: 'superadmin',
        userDetails: userData,
        adminAccess: null,
        pageAccess: null,
        isSuperadmin: true
      };
    }

    // Fetch admin and page access for regular employees
    const employeeId = userData.id;
    const [adminAccess, pageAccess] = await Promise.all([
      getUserAdminAccess(employeeId).catch(() => null),
      getUserPageAccess(employeeId).catch(() => ({
        profile: true,
        applyLeave: true,
        submitClaim: true,
        payslips: true,
        myAttendance: true,
        slotBookingEmployee: true
      }))
    ]);

    // Determine role based on admin access
    const hasAdminPermissions = adminAccess && Object.values(adminAccess).some(Boolean);
    
    // Regular employee
    return {
      user: {
        id: authUserId,
        email: email,
        name: userData.name,
        employeeId: userData.id,
        department: userData.department,
        position: userData.position
      },
      userrole: hasAdminPermissions ? 'admin' : 'employee',
      userDetails: userData,
      adminAccess,
      pageAccess,
      isSuperadmin: false
    };

  } catch (error) {
    logger.error('Session processing error', error);
    
    // Emergency fallback - try static data
    const staticFallback = STATIC_EMPLOYEE_FALLBACKS[email];
    if (staticFallback) {
      logger.info('Using static fallback after session error', { email });
      return {
        user: {
          id: authUserId,
          email: email,
          name: staticFallback.name,
          employeeId: staticFallback.id,
          department: staticFallback.department,
          position: staticFallback.position
        },
        userrole: 'employee',
        userDetails: { ...staticFallback, email },
        adminAccess: null,
        pageAccess: {
          profile: true,
          applyLeave: true,
          submitClaim: true,
          payslips: true,
          myAttendance: true,
          slotBookingEmployee: true
        },
        isSuperadmin: false
      };
    }
    
    const isSuperadmin = await checkSuperadminStatus(email).catch(() => false);
    
    if (isSuperadmin) {
      return {
        user: {
          id: authUserId,
          email: email,
          name: email,
        },
        userrole: 'superadmin',
        userDetails: null,
        adminAccess: null,
        pageAccess: null,
        isSuperadmin: true
      };
    }

    const employeeData = await getEmployeeBasicData(email);
    
    return {
      user: {
        id: authUserId,
        email: email,
        name: employeeData?.name || email.split('@')[0],
        employeeId: employeeData?.id
      },
      userrole: 'employee',
      userDetails: employeeData || null,
      adminAccess: null,
      pageAccess: {
        profile: true,
        applyLeave: true,
        submitClaim: true,
        payslips: true,
        myAttendance: true,
        slotBookingEmployee: true
      },
      isSuperadmin: false
    };
  }
};

const getEmployeeBasicData = async (email: string): Promise<{ id: string; name: string; type: string } | null> => {
  try {
    // First check static fallback
    const staticFallback = STATIC_EMPLOYEE_FALLBACKS[email];
    if (staticFallback) {
      return staticFallback;
    }
    
    const lookupPromise = supabase
      .from('employees')
      .select('id, name, type')
      .eq('email', email)
      .maybeSingle();
    
    const timeout = new Promise<{ data: any }>((resolve) =>
      setTimeout(() => resolve({ data: null }), 2000)
    );
    
    const { data } = await Promise.race([lookupPromise as any, timeout]);
    return data;
  } catch (error) {
    logger.error('Employee basic data lookup failed', error);
    // Return static fallback on error
    return STATIC_EMPLOYEE_FALLBACKS[email] || null;
  }
};
