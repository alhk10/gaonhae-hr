import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getUserData, checkSuperadminStatus, getUserAdminAccess, getUserPageAccess } from './authOptimizationService';
import { EMERGENCY_FALLBACKS } from '@/config/constants';
import { logger } from '@/utils/logger';

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
    const userData = await getUserData(email, authUserId).catch(() => null);

    if (!userData) {
      // Check if user is a superadmin
      const isSuperadmin = await checkSuperadminStatus(email);
      
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

      // Try quick employee lookup
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
    
    const authUserId = session.user.id;
    const email = session.user.email!;
    
    // Emergency fallback
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
    return null;
  }
};
