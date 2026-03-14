import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getUserData, getUserAdminAccess, getUserPageAccess } from './authOptimizationService';
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

import { withTimeout } from '@/utils/asyncHelpers';

export const processUserSession = async (session: Session | null): Promise<SessionResult | null> => {
  if (!session?.user) return null;

  const authUserId = session.user.id;
  const email = session.user.email;
  if (!email) {
    logger.warn('No email in session');
    return null;
  }
  const userMetadata = session.user.user_metadata;
  
  logger.debug('Processing user session', { email, authUserId });

  try {
    // FAST PATH: Student from JWT metadata
    if (userMetadata?.user_type === 'student' && userMetadata?.student_id) {
      logger.info('Fast path: Student from JWT metadata');
      const linkedStudents = await withTimeout(getLinkedStudentsRPC(email), 3000, []);
      const studentName = userMetadata.name || email.split('@')[0];
      return {
        user: { id: authUserId, email, name: studentName, studentId: userMetadata.student_id },
        userrole: null, userType: 'student', userDetails: { id: userMetadata.student_id, name: studentName, email },
        adminAccess: null, pageAccess: null, isSuperadmin: false,
        linkedStudents: linkedStudents.length > 0 ? linkedStudents : [{ id: userMetadata.student_id, name: studentName, email }]
      };
    }

    // PARALLEL: All three checks with individual timeouts (6s each)
    logger.debug('Running parallel auth checks');
    const [studentData, userData, isSuperadminInitial] = await Promise.all([
      withTimeout(getStudentByAuthIdRPC(authUserId, email), 6000, null),
      withTimeout(getUserData(email, authUserId).catch(() => null), 6000, null),
      withTimeout(checkSuperadminRPC(email), 6000, false)
    ]);
    
    let isSuperadmin = isSuperadminInitial;
    let finalUserData = userData;
    
    logger.debug('Parallel auth checks complete', { 
    logger.debug('Parallel auth checks complete', { 
      hasStudent: !!studentData, hasEmployee: !!finalUserData, isSuperadmin 
    });

    // Priority 1: Student
    if (studentData) {
      logger.info('User is a student');
      const linkedStudents = await withTimeout(getLinkedStudentsRPC(email), 3000, []);
      return {
        user: { id: authUserId, email, name: studentData.name, studentId: studentData.id },
        userrole: null, userType: 'student', userDetails: studentData,
        adminAccess: null, pageAccess: null, isSuperadmin: false,
        linkedStudents: linkedStudents.length > 0 ? linkedStudents : [{ id: studentData.id, name: studentData.name, email: studentData.email }]
      };
    }

    // Priority 2: Superadmin employee
    if (finalUserData?.isSuperadmin || (isSuperadmin && finalUserData)) {
      logger.info('User is superadmin employee');
      return {
        user: { id: authUserId, email, name: finalUserData.name, employeeId: finalUserData.id, department: finalUserData.department, position: finalUserData.position },
        userrole: 'superadmin', userType: 'employee', userDetails: finalUserData,
        adminAccess: null, pageAccess: null, isSuperadmin: true, linkedStudents: []
      };
    }

    // Priority 3: Superadmin without employee record
    if (isSuperadmin && !finalUserData) {
      logger.info('User is superadmin (no employee record)');
      return {
        user: { id: authUserId, email, name: email, role: 'superadmin' },
        userrole: 'superadmin', userType: 'employee', userDetails: null,
        adminAccess: null, pageAccess: null, isSuperadmin: true, linkedStudents: []
      };
    }

    // Priority 4: Regular employee — fetch admin/page access in parallel
    if (finalUserData) {
      logger.debug('Fetching admin/page access');
      const [adminAccess, pageAccess] = await Promise.all([
        withTimeout(getUserAdminAccess(finalUserData.id).catch(() => null), 3000, null),
        withTimeout(getUserPageAccess(finalUserData.id).catch(() => DEFAULT_PAGE_ACCESS), 3000, DEFAULT_PAGE_ACCESS)
      ]);
      const hasAdminPermissions = adminAccess && Object.values(adminAccess).some(Boolean);
      logger.info('User is employee', { role: hasAdminPermissions ? 'admin' : 'employee' });
      return {
        user: { id: authUserId, email, name: finalUserData.name, employeeId: finalUserData.id, department: finalUserData.department, position: finalUserData.position },
        userrole: hasAdminPermissions ? 'admin' : 'employee', userType: 'employee', userDetails: finalUserData,
        adminAccess, pageAccess, isSuperadmin: false, linkedStudents: []
      };
    }

    // Priority 5: No data found
    logger.warn('No user data found, returning minimal session', { email });
    return {
      user: { id: authUserId, email, name: email.split('@')[0] },
      userrole: 'employee', userType: 'employee', userDetails: null,
      adminAccess: null, pageAccess: DEFAULT_PAGE_ACCESS, isSuperadmin: false, linkedStudents: []
    };

  } catch (error) {
    logger.error('Session processing error', error);
    return {
      user: { id: authUserId, email, name: email.split('@')[0] },
      userrole: 'employee', userType: 'employee', userDetails: null,
      adminAccess: null, pageAccess: DEFAULT_PAGE_ACCESS, isSuperadmin: false, linkedStudents: []
    };
  }
};

// Student lookup via SECURITY DEFINER RPC with timeout built-in
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

// Superadmin check via RPC (bypasses RLS)
const checkSuperadminRPC = async (email: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('is_superadmin', { user_email: email });
    logger.debug('checkSuperadminRPC result', { data, error: error?.message, email });
    if (error) return false;
    return data === true;
  } catch (err) { 
    logger.error('checkSuperadminRPC exception', err);
    return false; 
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
  } catch { return []; }
};
