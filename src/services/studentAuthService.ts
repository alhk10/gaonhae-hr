/**
 * Service for managing student authentication
 */

import { supabase } from '@/integrations/supabase/client';

export interface StudentAuth {
  id: string;
  student_id: string;
  auth_user_id: string | null;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface StudentAuthWithDetails extends StudentAuth {
  student_name?: string;
  student_status?: string;
}

/**
 * Check if an email belongs to a student
 */
export const isStudentEmail = async (email: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('student_auth')
    .select('id')
    .eq('email', email.toLowerCase())
    .limit(1);

  if (error) {
    console.error('Error checking student email:', error);
    return false;
  }

  return (data?.length || 0) > 0;
};

/**
 * Get student auth record by email
 */
export const getStudentAuthByEmail = async (email: string): Promise<StudentAuth | null> => {
  const { data, error } = await supabase
    .from('student_auth')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (error) {
    if (error.code !== 'PGRST116') { // Not found is expected
      console.error('Error fetching student auth:', error);
    }
    return null;
  }

  return data;
};

/**
 * Get student auth record by student ID
 */
export const getStudentAuthByStudentId = async (studentId: string): Promise<StudentAuth | null> => {
  const { data, error } = await supabase
    .from('student_auth')
    .select('*')
    .eq('student_id', studentId)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') { // Not found is expected
      console.error('Error fetching student auth:', error);
    }
    return null;
  }

  return data;
};

/**
 * Create a student auth record (links student to auth user)
 */
export const createStudentAuth = async (
  studentId: string,
  email: string,
  authUserId?: string
): Promise<StudentAuth | null> => {
  const { data, error } = await supabase
    .from('student_auth')
    .insert({
      student_id: studentId,
      email: email.toLowerCase(),
      auth_user_id: authUserId || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating student auth:', error);
    return null;
  }

  return data;
};

/**
 * Update the auth_user_id for a student (after they create their Supabase account)
 */
export const linkAuthUser = async (
  studentId: string,
  authUserId: string
): Promise<boolean> => {
  const { error } = await supabase
    .from('student_auth')
    .update({ auth_user_id: authUserId })
    .eq('student_id', studentId);

  if (error) {
    console.error('Error linking auth user:', error);
    return false;
  }

  return true;
};

/**
 * Get student details by auth user ID
 */
export const getStudentByAuthUserId = async (authUserId: string): Promise<any | null> => {
  const { data: authData, error: authError } = await supabase
    .from('student_auth')
    .select('student_id')
    .eq('auth_user_id', authUserId)
    .single();

  if (authError || !authData) {
    return null;
  }

  const { data: studentData, error: studentError } = await supabase
    .from('students')
    .select('*')
    .eq('id', authData.student_id)
    .single();

  if (studentError) {
    console.error('Error fetching student:', studentError);
    return null;
  }

  return studentData;
};

/**
 * Delete student auth record
 */
export const deleteStudentAuth = async (studentId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('student_auth')
    .delete()
    .eq('student_id', studentId);

  if (error) {
    console.error('Error deleting student auth:', error);
    return false;
  }

  return true;
};

/**
 * Get all students with auth setup
 */
export const getStudentsWithAuth = async (): Promise<StudentAuthWithDetails[]> => {
  const { data, error } = await supabase
    .from('student_auth')
    .select(`
      *,
      students!inner(first_name, last_name, status)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching students with auth:', error);
    return [];
  }

  return data?.map(item => ({
    ...item,
    student_name: `${(item.students as any)?.first_name || ''} ${(item.students as any)?.last_name || ''}`.trim(),
    student_status: (item.students as any)?.status
  })) || [];
};

/**
 * Check if a student has portal access
 */
export const hasPortalAccess = async (studentId: string): Promise<boolean> => {
  const auth = await getStudentAuthByStudentId(studentId);
  return auth !== null;
};

/**
 * Enable portal access for an existing student
 */
export const enablePortalAccess = async (
  studentId: string,
  email: string
): Promise<{ success: boolean; error?: string }> => {
  // Check if already has access
  const existing = await getStudentAuthByStudentId(studentId);
  if (existing) {
    return { success: false, error: 'Portal access already enabled' };
  }

  // Check if email is already used by another student
  const emailInUse = await getStudentAuthByEmail(email);
  if (emailInUse && emailInUse.student_id !== studentId) {
    return { success: false, error: 'Email already linked to another student' };
  }

  // Create the auth record
  const result = await createStudentAuth(studentId, email);
  return result ? { success: true } : { success: false, error: 'Failed to create portal access' };
};

/**
 * Revoke portal access for a student
 */
export const revokePortalAccess = async (studentId: string): Promise<boolean> => {
  return deleteStudentAuth(studentId);
};

/**
 * Bulk enable portal access for multiple students
 */
export const bulkEnablePortalAccess = async (
  students: Array<{ id: string; email: string }>
): Promise<{ success: number; failed: number; errors: string[] }> => {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const student of students) {
    if (!student.email) {
      failed++;
      errors.push(`Student ${student.id}: No email address`);
      continue;
    }

    const result = await enablePortalAccess(student.id, student.email);
    if (result.success) {
      success++;
    } else {
      failed++;
      errors.push(`Student ${student.id}: ${result.error}`);
    }
  }

  return { success, failed, errors };
};
