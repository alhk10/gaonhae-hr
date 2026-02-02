import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getUserData, checkSuperadminStatus, getUserAdminAccess, getUserPageAccess } from './authOptimizationService';
import { logger } from '@/utils/logger';

// Static fallback mapping - comprehensive employee fallbacks for login resilience
// IMPORTANT: Email addresses must match exactly what's in the database
const STATIC_EMPLOYEE_FALLBACKS: Record<string, any> = {
  'leeesh101@gmail.com': { id: 'EMP1750866645618', name: 'Lee Soohyuk', type: 'Full-Time', position: 'Partner', department: 'Main Office' },
  'alhk10@gmail.com': { id: 'EMP1751003565851', name: 'Lee Heng Keong Alvin', type: 'Full-Time', position: 'Senior Partner', department: 'Main Office' },
  'ryangohjj21@gmail.com': { id: 'EMP1751006984631', name: 'Goh Jun Jie Ryan', type: 'Casual', position: 'Casual Instructor', department: 'Main Office' },
  '20102009jc@gmail.com': { id: 'EMP1764254219246', name: 'Chew Wee Hong Jeremy', type: 'Casual', position: '', department: 'Main Office' },
  'eldon.ayz0106@gmail.com': { id: 'EMP1751006728858', name: 'Aw Yi Zhe Eldon', type: 'Casual', position: 'Casual Instructor', department: 'Main Office' },
  'carissamasters@gaonhaetaekwondo.com': { id: 'EMP1751030249722', name: 'Carissa Lee Masters', type: 'Casual', position: 'Casual Instructor', department: 'Main Office' },
  'chajw0717@gmail.com': { id: 'EMP1750866475666', name: 'Cha Jinwoo', type: 'Full-Time', position: 'Instructor', department: 'Main Office' },
  'clarissa.kohjx@gmail.com': { id: 'EMP1751030381806', name: 'Clarissa Koh Jia Xuan', type: 'Casual', position: 'Casual Instructor', department: 'Main Office' },
  'albertcorpuz873@gmail.com': { id: 'EMP1750865290864', name: 'Corpuz Albert Jr Tiggangay', type: 'Full-Time', position: 'Senior Instructor', department: 'Main Office' },
  'jsnch617@hanyang.ac.kr': { id: 'EMP1750866300088', name: 'Jason Chiang Jia Jun', type: 'Full-Time', position: 'Instructor', department: 'Main Office' },
  'jasonlulijie@gmail.com': { id: 'EMP1751007228999', name: 'Jason Lu Lijie', type: 'Casual', position: 'Casual Instructor', department: 'Main Office' },
  'rkdgusaks@gmail.com': { id: 'EMP1751003052389', name: 'Kang Hyeonman', type: 'Full-Time', position: 'Senior Partner', department: 'Main Office' },
  'hspno77@gmail.com': { id: 'EMP1750864876850', name: 'Kang Hyunjun', type: 'Full-Time', position: 'General Manager', department: 'Main Office' },
  'leeyanxuan34@gmail.com': { id: 'EMP1751004127565', name: 'Lee Yan Xuan', type: 'Casual', position: 'Casual Admin', department: 'Main Office' },
  'szenian1007@gmail.com': { id: 'EMP1750865428602', name: 'Lim Sze Nian', type: 'Full-Time', position: 'Senior Instructor', department: 'Main Office' },
  'superzihan2006@gmail.com': { id: 'EMP1751006650365', name: 'Lim Zi Han', type: 'Casual', position: 'Casual Instructor', department: 'Main Office' },
  'lioujolene@gmail.com': { id: 'EMP1751006564567', name: 'Liou Siting Jolene', type: 'Casual', position: 'Casual Employee', department: 'Main Office' },
  'nigelkoh1211@gmail.com': { id: 'EMP1751029837839', name: 'Nigel Koh K Jun', type: 'Casual', position: 'Casual Instructor', department: 'Main Office' },
  'sitiaisyahbintimohdnazzer@gmail.com': { id: 'EMP1752551410290', name: 'Siti Aisyah Binti Mohammed Nazzer', type: 'Casual', position: '', department: 'Main Office' },
  'taysk1210@gmail.com': { id: 'EMP1763042329199', name: 'Tay Sai Kok', type: 'Casual', position: '', department: 'Main Office' },
};

export type UserType = 'employee' | 'student';

export interface SessionUserData {
  id: string;
  email: string;
  name: string;
  employeeId?: string;
  studentId?: string;
  department?: string;
  position?: string;
  role?: string;
}

export interface SessionResult {
  user: SessionUserData | null;
  userrole: 'employee' | 'admin' | 'superadmin' | null;
  userType: UserType;
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
    // Step 1: Check if user is a student first
    const studentData = await getStudentByAuthId(authUserId);
    if (studentData) {
      logger.info('User is a student', { email, studentId: studentData.id });
      return {
        user: {
          id: authUserId,
          email: email,
          name: studentData.name,
          studentId: studentData.id,
        },
        userrole: null,
        userType: 'student',
        userDetails: studentData,
        adminAccess: null,
        pageAccess: null,
        isSuperadmin: false
      };
    }

    // Step 2: Get employee data (passing auth user ID for caching)
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
          userType: 'employee',
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
        userType: 'employee',
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
        userType: 'employee',
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
      userType: 'employee',
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
        userType: 'employee',
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
        userType: 'employee',
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
      userType: 'employee',
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

// Get student by auth user ID
const getStudentByAuthId = async (authUserId: string): Promise<{ id: string; name: string; email: string } | null> => {
  try {
    // Add timeout to prevent hanging
    const lookupPromise = supabase
      .from('student_auth')
      .select('student_id, students!inner(id, first_name, last_name, email)')
      .eq('auth_user_id', authUserId)
      .maybeSingle();
    
    const timeout = new Promise<{ data: any; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: 'Student auth lookup timeout' } }), 2000)
    );
    
    const { data, error } = await Promise.race([lookupPromise, timeout]);
    
    if (error || !data) {
      return null;
    }
    
    const student = data.students as any;
    return {
      id: student.id,
      name: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
      email: student.email || ''
    };
  } catch (error) {
    logger.error('Student lookup failed', error);
    return null;
  }
};
