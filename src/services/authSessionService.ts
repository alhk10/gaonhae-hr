import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getUserData, checkSuperadminStatus, getUserAdminAccess, getUserPageAccess } from './authOptimizationService';
import { logger } from '@/utils/logger';

export type UserType = 'employee' | 'student';

export interface LinkedStudentInfo {
  id: string;
  name: string;
  email: string;
  studentNumber?: string;
  currentBelt?: string;
}

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
  linkedStudents: LinkedStudentInfo[];
}

const DEFAULT_PAGE_ACCESS = {
  profile: true, applyLeave: true, submitClaim: true,
  payslips: true, myAttendance: true, slotBookingEmployee: true
};

export const processUserSession = async (session: Session | null): Promise<SessionResult | null> => {
  if (!session?.user) return null;

  const authUserId = session.user.id;
  const email = session.user.email!;
  const userMetadata = session.user.user_metadata;
  
  logger.debug('Processing user session', { email, authUserId });

  try {
    // FAST PATH: Student from JWT metadata
    if (userMetadata?.user_type === 'student' && userMetadata?.student_id) {
      logger.info('Fast path: Student from JWT metadata');
      const linkedStudents = await getLinkedStudentsRPC(email);
      const studentName = userMetadata.name || email.split('@')[0];
      return {
        user: { id: authUserId, email, name: studentName, studentId: userMetadata.student_id },
        userrole: null, userType: 'student', userDetails: { id: userMetadata.student_id, name: studentName, email },
        adminAccess: null, pageAccess: null, isSuperadmin: false,
        linkedStudents: linkedStudents.length > 0 ? linkedStudents : [{ id: userMetadata.student_id, name: studentName, email }]
      };
    }

    // PARALLEL: All three checks via SECURITY DEFINER RPCs (bypass slow RLS)
    const [studentResult, employeeResult, superadminResult] = await Promise.allSettled([
      getStudentByAuthIdRPC(authUserId, email),
      getUserData(email, authUserId).catch(() => null),
      checkSuperadminStatus(email).catch(() => false)
    ]);

    const studentData = studentResult.status === 'fulfilled' ? studentResult.value : null;
    const userData = employeeResult.status === 'fulfilled' ? employeeResult.value : null;
    const isSuperadmin = superadminResult.status === 'fulfilled' ? superadminResult.value : false;

    // Priority 1: Student
    if (studentData) {
      logger.info('User is a student', { email });
      const linkedStudents = await getLinkedStudentsRPC(email);
      return {
        user: { id: authUserId, email, name: studentData.name, studentId: studentData.id },
        userrole: null, userType: 'student', userDetails: studentData,
        adminAccess: null, pageAccess: null, isSuperadmin: false,
        linkedStudents: linkedStudents.length > 0 ? linkedStudents : [{ id: studentData.id, name: studentData.name, email: studentData.email }]
      };
    }

    // Priority 2: Superadmin employee
    if (userData?.isSuperadmin || (isSuperadmin && userData)) {
      logger.info('User is superadmin employee');
      return {
        user: { id: authUserId, email, name: userData.name, employeeId: userData.id, department: userData.department, position: userData.position },
        userrole: 'superadmin', userType: 'employee', userDetails: userData,
        adminAccess: null, pageAccess: null, isSuperadmin: true, linkedStudents: []
      };
    }

    // Priority 3: Superadmin without employee record
    if (isSuperadmin && !userData) {
      logger.info('User is superadmin (no employee record)');
      return {
        user: { id: authUserId, email, name: email, role: 'superadmin' },
        userrole: 'superadmin', userType: 'employee', userDetails: null,
        adminAccess: null, pageAccess: null, isSuperadmin: true, linkedStudents: []
      };
    }

    // Priority 4: Regular employee — fetch admin/page access in parallel
    if (userData) {
      const [adminAccess, pageAccess] = await Promise.all([
        getUserAdminAccess(userData.id).catch(() => null),
        getUserPageAccess(userData.id).catch(() => DEFAULT_PAGE_ACCESS)
      ]);
      const hasAdminPermissions = adminAccess && Object.values(adminAccess).some(Boolean);
      return {
        user: { id: authUserId, email, name: userData.name, employeeId: userData.id, department: userData.department, position: userData.position },
        userrole: hasAdminPermissions ? 'admin' : 'employee', userType: 'employee', userDetails: userData,
        adminAccess, pageAccess, isSuperadmin: false, linkedStudents: []
      };
    }

    // Priority 5: No data found
    logger.warn('No user data found', { email });
    return {
      user: { id: authUserId, email, name: email.split('@')[0] },
      userrole: 'employee', userType: 'employee', userDetails: null,
      adminAccess: null, pageAccess: DEFAULT_PAGE_ACCESS, isSuperadmin: false, linkedStudents: []
    };

  } catch (error) {
    logger.error('Session processing error', error);
    const isSuperadmin = await checkSuperadminStatus(email).catch(() => false);
    if (isSuperadmin) {
      return {
        user: { id: authUserId, email, name: email },
        userrole: 'superadmin', userType: 'employee', userDetails: null,
        adminAccess: null, pageAccess: null, isSuperadmin: true, linkedStudents: []
      };
    }
    return {
      user: { id: authUserId, email, name: email.split('@')[0] },
      userrole: 'employee', userType: 'employee', userDetails: null,
      adminAccess: null, pageAccess: DEFAULT_PAGE_ACCESS, isSuperadmin: false, linkedStudents: []
    };
  }
};

// Student lookup via SECURITY DEFINER RPC
const getStudentByAuthIdRPC = async (authUserId: string, email?: string): Promise<{ id: string; name: string; email: string } | null> => {
  try {
    const { data, error } = await supabase.rpc('get_student_by_auth_id_for_auth', {
      p_auth_user_id: authUserId,
      p_email: email || null
    });
    
    if (error || !data || (Array.isArray(data) && data.length === 0)) return null;
    
    const row = Array.isArray(data) ? data[0] : data;
    return { id: row.student_id, name: row.student_name?.trim() || '', email: row.student_email || '' };
  } catch (error) {
    logger.error('Student RPC lookup failed', error);
    return null;
  }
};

// Linked students via SECURITY DEFINER RPC
const getLinkedStudentsRPC = async (email: string): Promise<LinkedStudentInfo[]> => {
  try {
    const { data, error } = await supabase.rpc('get_linked_students_for_auth', { p_email: email });
    
    if (error || !data) return [];
    
    return (Array.isArray(data) ? data : []).map((row: any) => ({
      id: row.student_id,
      name: row.student_name?.trim() || '',
      email: row.student_email || email,
      studentNumber: row.student_number,
      currentBelt: row.current_belt
    }));
  } catch (error) {
    logger.error('Linked students RPC failed', error);
    return [];
  }
};
