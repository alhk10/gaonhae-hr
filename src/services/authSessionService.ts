import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getUserData, checkSuperadminStatus } from './authOptimizationService';
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
  isSuperadmin: boolean;
}

export const processUserSession = async (session: Session | null): Promise<SessionResult | null> => {
  if (!session?.user) {
    return null;
  }

  logger.debug('Processing user session', { email: session.user.email });

  try {
    // Step 1: Get employee data
    const userData = await getUserData(session.user.email!).catch(() => null);

    if (!userData) {
      // Check if user is a superadmin
      const isSuperadmin = await checkSuperadminStatus(session.user.email!);
      
      if (isSuperadmin) {
        logger.info('User is superadmin', { email: session.user.email });
        return {
          user: {
            id: session.user.id,
            email: session.user.email!,
            name: session.user.email!,
            role: 'superadmin',
          },
          userrole: 'superadmin',
          userDetails: null,
          isSuperadmin: true
        };
      }

      // Try quick employee lookup
      const employeeData = await getEmployeeBasicData(session.user.email!);
      
      return {
        user: {
          id: session.user.id,
          email: session.user.email!,
          name: employeeData?.name || session.user.email!.split('@')[0],
          employeeId: employeeData?.id
        },
        userrole: 'employee',
        userDetails: employeeData || null,
        isSuperadmin: false
      };
    }

    // Check if employee data indicates superadmin
    if (userData.isSuperadmin) {
      logger.info('User identified as superadmin');
      return {
        user: {
          id: session.user.id,
          email: session.user.email!,
          name: userData.name,
          employeeId: userData.id,
          department: userData.department,
          position: userData.position
        },
        userrole: 'superadmin',
        userDetails: userData,
        isSuperadmin: true
      };
    }

    // Regular employee
    return {
      user: {
        id: session.user.id,
        email: session.user.email!,
        name: userData.name,
        employeeId: userData.id,
        department: userData.department,
        position: userData.position
      },
      userrole: 'employee',
      userDetails: userData,
      isSuperadmin: false
    };

  } catch (error) {
    logger.error('Session processing error', error);
    
    // Emergency fallback
    const isSuperadmin = await checkSuperadminStatus(session.user.email!).catch(() => false);
    
    if (isSuperadmin) {
      return {
        user: {
          id: session.user.id,
          email: session.user.email!,
          name: session.user.email!,
        },
        userrole: 'superadmin',
        userDetails: null,
        isSuperadmin: true
      };
    }

    const employeeData = await getEmployeeBasicData(session.user.email!);
    
    return {
      user: {
        id: session.user.id,
        email: session.user.email!,
        name: session.user.email!.split('@')[0],
        employeeId: employeeData?.id
      },
      userrole: 'employee',
      userDetails: null,
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
