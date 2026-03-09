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
  profile: true,
  applyLeave: true,
  submitClaim: true,
  payslips: true,
  myAttendance: true,
  slotBookingEmployee: true
};

export const processUserSession = async (session: Session | null): Promise<SessionResult | null> => {
  if (!session?.user) {
    return null;
  }

  const authUserId = session.user.id;
  const email = session.user.email!;
  const userMetadata = session.user.user_metadata;
  
  logger.debug('Processing user session', { email, authUserId });

  try {
    // FAST PATH: Check user_metadata from JWT first - this is instant
    if (userMetadata?.user_type === 'student' && userMetadata?.student_id) {
      logger.info('Fast path: Student from JWT metadata', { email });
      const linkedStudents = await getStudentsByEmail(email);
      const studentName = userMetadata.name || email.split('@')[0];
      
      return {
        user: { id: authUserId, email, name: studentName, studentId: userMetadata.student_id },
        userrole: null,
        userType: 'student',
        userDetails: { id: userMetadata.student_id, name: studentName, email },
        adminAccess: null,
        pageAccess: null,
        isSuperadmin: false,
        linkedStudents: linkedStudents.length > 0 ? linkedStudents : [{ id: userMetadata.student_id, name: studentName, email }]
      };
    }

    // PARALLEL: Run student, employee, and superadmin checks simultaneously
    const [studentResult, employeeResult, superadminResult] = await Promise.allSettled([
      getStudentByAuthId(authUserId, email),
      getUserData(email, authUserId).catch(() => null),
      checkSuperadminStatus(email).catch(() => false)
    ]);

    const studentData = studentResult.status === 'fulfilled' ? studentResult.value : null;
    const userData = employeeResult.status === 'fulfilled' ? employeeResult.value : null;
    const isSuperadmin = superadminResult.status === 'fulfilled' ? superadminResult.value : false;

    // Priority 1: Student
    if (studentData) {
      logger.info('User is a student', { email, studentId: studentData.id });
      const linkedStudents = await getStudentsByEmail(email);
      
      return {
        user: { id: authUserId, email, name: studentData.name, studentId: studentData.id },
        userrole: null,
        userType: 'student',
        userDetails: studentData,
        adminAccess: null,
        pageAccess: null,
        isSuperadmin: false,
        linkedStudents: linkedStudents.length > 0 ? linkedStudents : [{ id: studentData.id, name: studentData.name, email: studentData.email }]
      };
    }

    // Priority 2: Employee with superadmin flag
    if (userData?.isSuperadmin || (isSuperadmin && userData)) {
      logger.info('User is superadmin employee', { email });
      return {
        user: { id: authUserId, email, name: userData.name, employeeId: userData.id, department: userData.department, position: userData.position },
        userrole: 'superadmin',
        userType: 'employee',
        userDetails: userData,
        adminAccess: null,
        pageAccess: null,
        isSuperadmin: true,
        linkedStudents: []
      };
    }

    // Priority 3: Superadmin without employee record
    if (isSuperadmin && !userData) {
      logger.info('User is superadmin (no employee record)', { email });
      return {
        user: { id: authUserId, email, name: email, role: 'superadmin' },
        userrole: 'superadmin',
        userType: 'employee',
        userDetails: null,
        adminAccess: null,
        pageAccess: null,
        isSuperadmin: true,
        linkedStudents: []
      };
    }

    // Priority 4: Regular employee
    if (userData) {
      const employeeId = userData.id;
      const [adminAccess, pageAccess] = await Promise.all([
        getUserAdminAccess(employeeId).catch(() => null),
        getUserPageAccess(employeeId).catch(() => DEFAULT_PAGE_ACCESS)
      ]);

      const hasAdminPermissions = adminAccess && Object.values(adminAccess).some(Boolean);
      
      return {
        user: { id: authUserId, email, name: userData.name, employeeId: userData.id, department: userData.department, position: userData.position },
        userrole: hasAdminPermissions ? 'admin' : 'employee',
        userType: 'employee',
        userDetails: userData,
        adminAccess,
        pageAccess,
        isSuperadmin: false,
        linkedStudents: []
      };
    }

    // Priority 5: No data found — return minimal employee session (no redundant re-query)
    logger.warn('No user data found', { email });
    return {
      user: { id: authUserId, email, name: email.split('@')[0] },
      userrole: 'employee',
      userType: 'employee',
      userDetails: null,
      adminAccess: null,
      pageAccess: DEFAULT_PAGE_ACCESS,
      isSuperadmin: false,
      linkedStudents: []
    };

  } catch (error) {
    logger.error('Session processing error', error);
    
    // Emergency: check superadmin as last resort
    const isSuperadmin = await checkSuperadminStatus(email).catch(() => false);
    if (isSuperadmin) {
      return {
        user: { id: authUserId, email, name: email },
        userrole: 'superadmin',
        userType: 'employee',
        userDetails: null,
        adminAccess: null,
        pageAccess: null,
        isSuperadmin: true,
        linkedStudents: []
      };
    }

    return {
      user: { id: authUserId, email, name: email.split('@')[0] },
      userrole: 'employee',
      userType: 'employee',
      userDetails: null,
      adminAccess: null,
      pageAccess: DEFAULT_PAGE_ACCESS,
      isSuperadmin: false,
      linkedStudents: []
    };
  }
};

// Get student by auth user ID with email fallback
const getStudentByAuthId = async (authUserId: string, userEmail?: string): Promise<{ id: string; name: string; email: string } | null> => {
  try {
    const lookupPromise = supabase
      .from('student_auth')
      .select('student_id, email, students!inner(id, first_name, last_name, email)')
      .eq('auth_user_id', authUserId)
      .maybeSingle();
    
    const timeout = new Promise<{ data: any; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: 'Student auth lookup timeout' } }), 5000)
    );
    
    const { data, error } = await Promise.race([lookupPromise, timeout]);
    
    if (!error && data) {
      const student = data.students as any;
      return {
        id: student.id,
        name: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
        email: student.email || data.email || ''
      };
    }
    
    // Fallback: Try email lookup
    if (userEmail) {
      const emailLookupPromise = supabase
        .from('student_auth')
        .select('student_id, auth_user_id, students!inner(id, first_name, last_name, email)')
        .eq('email', userEmail.toLowerCase())
        .maybeSingle();
      
      const { data: emailData, error: emailError } = await Promise.race([
        emailLookupPromise,
        new Promise<{ data: any; error: any }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: { message: 'Email lookup timeout' } }), 5000)
        )
      ]);
      
      if (!emailError && emailData) {
        const student = emailData.students as any;
        
        if (!emailData.auth_user_id && authUserId) {
          supabase
            .from('student_auth')
            .update({ auth_user_id: authUserId })
            .eq('student_id', student.id)
            .then((result) => {
              if (result.error) logger.warn('Failed to link auth_user_id', result.error);
            });
        }
        
        return {
          id: student.id,
          name: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
          email: student.email || userEmail
        };
      }
    }
    
    return null;
  } catch (error) {
    logger.error('Student lookup failed', error);
    return null;
  }
};

// Get all students linked to an email
const getStudentsByEmail = async (email: string): Promise<LinkedStudentInfo[]> => {
  try {
    const lookupPromise = supabase
      .from('student_auth')
      .select('student_id, students!inner(id, first_name, last_name, email, student_number, current_belt)')
      .eq('email', email.toLowerCase());
    
    const timeout = new Promise<{ data: any; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: 'Multi-student lookup timeout' } }), 5000)
    );
    
    const { data, error } = await Promise.race([lookupPromise, timeout]);
    
    if (error || !data) return [];
    
    return data
      .map((record: any) => {
        const student = record.students;
        return {
          id: student.id,
          name: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
          email: student.email || email,
          studentNumber: student.student_number,
          currentBelt: student.current_belt
        };
      })
      .sort((a: LinkedStudentInfo, b: LinkedStudentInfo) => a.name.localeCompare(b.name));
  } catch (error) {
    logger.error('Error getting students by email', error);
    return [];
  }
};
