import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getUserData, checkSuperadminStatus, getUserAdminAccess, getUserPageAccess } from './authOptimizationService';
import { logger } from '@/utils/logger';

// Static fallback mapping removed for security - all lookups go through database
const STATIC_EMPLOYEE_FALLBACKS: Record<string, any> = {};

export type UserType = 'employee' | 'student';

// Basic student info for multi-student support
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
  // Multi-student support
  linkedStudents: LinkedStudentInfo[];
}

export const processUserSession = async (session: Session | null): Promise<SessionResult | null> => {
  if (!session?.user) {
    return null;
  }

  const authUserId = session.user.id;
  const email = session.user.email!;
  const userMetadata = session.user.user_metadata;
  
  logger.debug('Processing user session', { email, authUserId, userMetadata });

  try {
    // FAST PATH: Check user_metadata from JWT first - this is instant and avoids DB queries
    if (userMetadata?.user_type === 'student' && userMetadata?.student_id) {
      logger.info('Fast path: User identified as student from JWT metadata', { 
        email, 
        studentId: userMetadata.student_id 
      });
      
      // Get all linked students for this email
      const linkedStudents = await getStudentsByEmail(email);
      const studentName = userMetadata.name || email.split('@')[0];
      
      return {
        user: {
          id: authUserId,
          email: email,
          name: studentName,
          studentId: userMetadata.student_id,
        },
        userrole: null,
        userType: 'student',
        userDetails: {
          id: userMetadata.student_id,
          name: studentName,
          email: email
        },
        adminAccess: null,
        pageAccess: null,
        isSuperadmin: false,
        linkedStudents: linkedStudents.length > 0 ? linkedStudents : [{
          id: userMetadata.student_id,
          name: studentName,
          email: email
        }]
      };
    }

    // Step 1: Check if user is a student first (pass email for fallback lookup)
    const studentData = await getStudentByAuthId(authUserId, email);
    if (studentData) {
      logger.info('User is a student', { email, studentId: studentData.id });
      
      // Get all linked students for this email
      const linkedStudents = await getStudentsByEmail(email);
      
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
        isSuperadmin: false,
        linkedStudents: linkedStudents.length > 0 ? linkedStudents : [{
          id: studentData.id,
          name: studentData.name,
          email: studentData.email
        }]
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
          isSuperadmin: true,
          linkedStudents: []
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
        isSuperadmin: false,
        linkedStudents: []
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
        isSuperadmin: true,
        linkedStudents: []
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
      isSuperadmin: false,
      linkedStudents: []
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
        isSuperadmin: false,
        linkedStudents: []
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
        isSuperadmin: true,
        linkedStudents: []
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
      isSuperadmin: false,
      linkedStudents: []
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

// Get student by auth user ID with email fallback
const getStudentByAuthId = async (authUserId: string, userEmail?: string): Promise<{ id: string; name: string; email: string } | null> => {
  try {
    // Add timeout to prevent hanging
    const lookupPromise = supabase
      .from('student_auth')
      .select('student_id, email, students!inner(id, first_name, last_name, email)')
      .eq('auth_user_id', authUserId)
      .maybeSingle();
    
    const timeout = new Promise<{ data: any; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: 'Student auth lookup timeout' } }), 2000)
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
    
    // Fallback: Try to find student by email if auth_user_id lookup fails
    // This handles cases where student_auth exists but auth_user_id was not linked
    if (userEmail) {
      logger.debug('Attempting email fallback for student lookup', { userEmail });
      
      const emailLookupPromise = supabase
        .from('student_auth')
        .select('student_id, auth_user_id, students!inner(id, first_name, last_name, email)')
        .eq('email', userEmail.toLowerCase())
        .maybeSingle();
      
      const { data: emailData, error: emailError } = await Promise.race([
        emailLookupPromise,
        new Promise<{ data: any; error: any }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: { message: 'Email lookup timeout' } }), 2000)
        )
      ]);
      
      if (!emailError && emailData) {
        const student = emailData.students as any;
        
        // If we found a match by email but auth_user_id is missing, update it
        if (!emailData.auth_user_id && authUserId) {
          logger.info('Linking auth_user_id to student_auth record', { 
            studentId: student.id, 
            authUserId 
          });
          
          // Update the record with the auth_user_id (fire and forget)
          supabase
            .from('student_auth')
            .update({ auth_user_id: authUserId })
            .eq('student_id', student.id)
            .then((result) => {
              if (result.error) {
                logger.warn('Failed to link auth_user_id', result.error);
              } else {
                logger.debug('Successfully linked auth_user_id');
              }
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

// Get all students linked to an email (for multi-student parent access)
const getStudentsByEmail = async (email: string): Promise<LinkedStudentInfo[]> => {
  try {
    const lookupPromise = supabase
      .from('student_auth')
      .select('student_id, students!inner(id, first_name, last_name, email, student_number, current_belt)')
      .eq('email', email.toLowerCase());
    
    const timeout = new Promise<{ data: any; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: 'Multi-student lookup timeout' } }), 2000)
    );
    
    const { data, error } = await Promise.race([lookupPromise, timeout]);
    
    if (error || !data) {
      logger.warn('Failed to get students by email', { email, error });
      return [];
    }
    
    // Map to LinkedStudentInfo format and sort alphabetically by name
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
