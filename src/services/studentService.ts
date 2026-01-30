/**
 * Student Service
 * Handles all student-related data operations for the sales module
 */

import { supabase } from '@/integrations/supabase/client';
import { logSalesModuleAccess } from './salesModuleService';
import { logger } from '@/utils/logger';

export interface Student {
  id: string;
  student_number: string;
  first_name: string;
  last_name: string;
  preferred_name?: string;
  certificate_name?: string;
  display_name?: string;
  referral_source?: string;
  date_of_birth: string;
  gender?: string;
  nationality?: string;
  nric_passport?: string;
  phone?: string;
  email?: string;
  address?: string;
  postal_code?: string;
  branch_id?: string;
  current_belt?: string; // Match database field name
  class_type?: string;
  parent_guardian_name?: string;
  parent_guardian_phone?: string;
  parent_guardian_email?: string;
  enrollment_date: string;
  status: string; // Match database field name
  medical_conditions?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  previous_experience?: string;
  training_goals?: string;
  dietary_restrictions?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  // Trial-specific fields
  trial_date?: string;
  trial_time?: string;
}

export interface StudentEmergencyContact {
  id: string;
  student_id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  is_primary: boolean;
  created_at: string;
}

export interface StudentAttendance {
  id: string;
  student_id: string;
  class_date: string;
  branch_id: string;
  status: string; // Allow any string value from database
  attendance_method: string;
  recorded_by?: string;
  notes?: string;
  created_at: string;
  timetable_id?: string;
  entitlement_id?: string;
  recorded_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface StudentEntitlement {
  id: string;
  student_id: string;
  source_type: string;
  sessions_total: number;
  sessions_used: number;
  sessions_remaining: number;
  valid_from: string;
  valid_to?: string;
  is_active: boolean;
  branch_scope?: string;
  class_type_scope?: string;
  belt_level_scope?: string;
  notes?: string;
  created_at: string;
}

/**
 * Get all students with pagination and search
 */
export async function getStudents(
  page: number = 1,
  limit: number = 20,
  search?: string,
  branchId?: string
): Promise<{ students: Student[]; total: number }> {
  try {
    let query = supabase
      .from('students')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,student_number.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data, error, count } = await query
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      logger.error('Error fetching students', error);
      await logSalesModuleAccess('get_students', false, { error: error.message });
      throw error;
    }

    await logSalesModuleAccess('get_students', true, { count: data?.length || 0 });
    
    return {
      students: data || [],
      total: count || 0
    };
  } catch (error) {
    logger.error('Error fetching students', error);
    throw error;
  }
}

/**
 * Get a single student by ID with full details
 */
export async function getStudentById(studentId: string): Promise<Student | null> {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .maybeSingle();

    if (error) {
      logger.error('Error fetching student', error);
      await logSalesModuleAccess('get_student_by_id', false, { error: error.message, studentId });
      throw error;
    }

    await logSalesModuleAccess('get_student_by_id', true, { studentId });
    
    return data;
  } catch (error) {
    logger.error('Error fetching student', error);
    throw error;
  }
}

/**
 * Get student emergency contacts
 */
export async function getStudentEmergencyContacts(studentId: string): Promise<StudentEmergencyContact[]> {
  try {
    const { data, error } = await supabase
      .from('student_emergency_contacts')
      .select('*')
      .eq('student_id', studentId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching emergency contacts', error);
      await logSalesModuleAccess('get_emergency_contacts', false, { error: error.message, studentId });
      throw error;
    }

    await logSalesModuleAccess('get_emergency_contacts', true, { studentId, count: data?.length || 0 });
    
    return data || [];
  } catch (error) {
    logger.error('Error fetching emergency contacts', error);
    throw error;
  }
}

/**
 * Get student attendance history
 */
export async function getStudentAttendance(
  studentId: string,
  limit: number = 50
): Promise<StudentAttendance[]> {
  try {
    const { data, error } = await supabase
      .from('class_attendance')
      .select('*')
      .eq('student_id', studentId)
      .order('class_date', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Error fetching attendance', error);
      await logSalesModuleAccess('get_student_attendance', false, { error: error.message, studentId });
      throw error;
    }

    await logSalesModuleAccess('get_student_attendance', true, { studentId, count: data?.length || 0 });
    
    return data || [];
  } catch (error) {
    logger.error('Error fetching attendance', error);
    throw error;
  }
}

/**
 * Get student entitlements
 */
export async function getStudentEntitlements(studentId: string): Promise<StudentEntitlement[]> {
  try {
    const { data, error } = await supabase
      .from('entitlements')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching entitlements', error);
      await logSalesModuleAccess('get_student_entitlements', false, { error: error.message, studentId });
      throw error;
    }

    await logSalesModuleAccess('get_student_entitlements', true, { studentId, count: data?.length || 0 });
    
    return data || [];
  } catch (error) {
    logger.error('Error fetching entitlements', error);
    throw error;
  }
}

/**
 * Get student invoices with payment information
 */
export async function getStudentInvoices(studentId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_items (
          id,
          description,
          quantity,
          unit_price,
          total_amount
        ),
        payments (
          id,
          amount,
          payment_date,
          payment_method,
          reference_number
        )
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching invoices', error);
      await logSalesModuleAccess('get_student_invoices', false, { error: error.message, studentId });
      throw error;
    }

    await logSalesModuleAccess('get_student_invoices', true, { studentId, count: data?.length || 0 });
    
    return data || [];
  } catch (error) {
    logger.error('Error fetching invoices', error);
    throw error;
  }
}

/**
 * Search students by various criteria
 */
export async function searchStudents(query: string, limit: number = 10): Promise<Partial<Student>[]> {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('id, student_number, first_name, last_name, email, branch_id, current_belt, status, enrollment_date, date_of_birth, created_at, updated_at')
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,student_number.ilike.%${query}%,email.ilike.%${query}%`)
      .eq('status', 'active')
      .limit(limit);

    if (error) {
      logger.error('Error searching students', error);
      await logSalesModuleAccess('search_students', false, { error: error.message, query });
      throw error;
    }

    await logSalesModuleAccess('search_students', true, { query, count: data?.length || 0 });
    
    return data || [];
  } catch (error) {
    logger.error('Error searching students', error);
    throw error;
  }
}

export interface CreateStudentData {
  first_name: string;
  last_name: string;
  preferred_name?: string;
  certificate_name: string;
  display_name: string;
  referral_source?: string;
  date_of_birth?: string;
  gender?: string;
  nationality?: string;
  languages_spoken?: string[];
  nric_passport?: string;
  email?: string;
  phone?: string;
  address?: string;
  postal_code?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  emergency_contact_2_name?: string;
  emergency_contact_2_phone?: string;
  emergency_contact_2_relationship?: string;
  current_belt?: string;
  previous_experience?: string;
  training_goals?: string;
  medical_conditions?: string;
  dietary_restrictions?: string;
  branch_id?: string;
  registered_date?: string;
  status: string;
  notes?: string;
  // Trial-specific fields
  trial_date?: string;
  trial_time?: string;
}

/**
 * Create a new student
 */
export async function createStudent(studentData: CreateStudentData): Promise<Student> {
  try {
    // Generate student number
    const studentNumber = await generateStudentNumber();
    
    // Sanitize empty strings to null for database fields that don't accept empty strings
    const sanitizedData = {
      ...studentData,
      last_name: studentData.last_name || null,
      date_of_birth: studentData.date_of_birth || null,
      email: studentData.email || null,
      phone: studentData.phone || null,
      emergency_contact_name: studentData.emergency_contact_name || null,
      emergency_contact_phone: studentData.emergency_contact_phone || null,
      emergency_contact_relationship: studentData.emergency_contact_relationship || null,
      emergency_contact_2_name: studentData.emergency_contact_2_name || null,
      emergency_contact_2_phone: studentData.emergency_contact_2_phone || null,
      emergency_contact_2_relationship: studentData.emergency_contact_2_relationship || null,
      languages_spoken: studentData.languages_spoken?.length ? studentData.languages_spoken : null,
      registered_date: studentData.registered_date || null,
      trial_date: studentData.trial_date || null,
      trial_time: studentData.trial_time || null,
      referral_source: studentData.referral_source || null,
      student_number: studentNumber,
      enrollment_date: new Date().toISOString().split('T')[0]
    };
    
    const { data, error } = await supabase
      .from('students')
      .insert(sanitizedData)
      .select()
      .single();

    if (error) {
      logger.error('Error creating student', error);
      await logSalesModuleAccess('create_student', false, { error: error.message });
      throw error;
    }

    // Create emergency contact if provided
    if (studentData.emergency_contact_name && studentData.emergency_contact_phone) {
      await supabase
        .from('student_emergency_contacts')
        .insert({
          student_id: data.id,
          name: studentData.emergency_contact_name,
          phone: studentData.emergency_contact_phone,
          relationship: studentData.emergency_contact_relationship || 'Emergency Contact',
          is_primary: true
        });
    }

    await logSalesModuleAccess('create_student', true, { studentId: data.id });
    
    return data;
  } catch (error) {
    logger.error('Error creating student', error);
    throw error;
  }
}

/**
 * Update an existing student
 */
export async function updateStudent(studentId: string, studentData: Partial<CreateStudentData>): Promise<Student> {
  try {
    // First, get the current student data for change logging
    const { data: oldData } = await supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .single();

    const { data, error } = await supabase
      .from('students')
      .update(studentData)
      .eq('id', studentId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating student', error);
      await logSalesModuleAccess('update_student', false, { error: error.message, studentId });
      throw error;
    }

    // Log the changes
    if (oldData) {
      try {
        const { logStudentFieldChanges } = await import('./studentChangeLogService');
        await logStudentFieldChanges(studentId, oldData, studentData);
      } catch (logError) {
        // Don't fail the update if logging fails
        logger.error('Error logging student changes', logError);
      }
    }

    await logSalesModuleAccess('update_student', true, { studentId });
    
    return data;
  } catch (error) {
    logger.error('Error updating student', error);
    throw error;
  }
}

/**
 * Delete a student
 */
export async function deleteStudent(studentId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId);

    if (error) {
      logger.error('Error deleting student', error);
      await logSalesModuleAccess('delete_student', false, { error: error.message, studentId });
      throw error;
    }

    await logSalesModuleAccess('delete_student', true, { studentId });
  } catch (error) {
    logger.error('Error deleting student', error);
    throw error;
  }
}

/**
 * Generate a unique student number
 */
async function generateStudentNumber(): Promise<string> {
  const year = new Date().getFullYear().toString().slice(-2);
  
  // Get the count of students created this year
  const { count } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', `${new Date().getFullYear()}-01-01`)
    .lt('created_at', `${new Date().getFullYear() + 1}-01-01`);

  const nextNumber = (count || 0) + 1;
  return `STU${year}${nextNumber.toString().padStart(4, '0')}`;
}

/**
 * Get student statistics
 */
export async function getStudentStats(studentId: string): Promise<{
  totalAttendance: number;
  totalAbsences: number;
  attendanceRate: number;
  activeSessions: number;
  usedSessions: number;
  totalInvoices: number;
  outstandingBalance: number;
}> {
  try {
    // Get attendance stats
    const { data: attendanceData } = await supabase
      .from('class_attendance')
      .select('status')
      .eq('student_id', studentId);

    const totalAttendance = attendanceData?.filter(a => a.status === 'present').length || 0;
    const totalAbsences = attendanceData?.filter(a => a.status === 'absent').length || 0;
    const attendanceRate = attendanceData?.length ? (totalAttendance / attendanceData.length) * 100 : 0;

    // Get entitlement stats
    const { data: entitlementData } = await supabase
      .from('entitlements')
      .select('sessions_total, sessions_used, sessions_remaining')
      .eq('student_id', studentId)
      .eq('is_active', true);

    const activeSessions = entitlementData?.reduce((sum, e) => sum + (e.sessions_remaining || 0), 0) || 0;
    const usedSessions = entitlementData?.reduce((sum, e) => sum + (e.sessions_used || 0), 0) || 0;

    // Get invoice stats
    const { data: invoiceData } = await supabase
      .from('invoices')
      .select('balance_due')
      .eq('student_id', studentId);

    const totalInvoices = invoiceData?.length || 0;
    const outstandingBalance = invoiceData?.reduce((sum, i) => sum + (Number(i.balance_due) || 0), 0) || 0;

    const stats = {
      totalAttendance,
      totalAbsences,
      attendanceRate,
      activeSessions,
      usedSessions,
      totalInvoices,
      outstandingBalance
    };

    await logSalesModuleAccess('get_student_stats', true, { studentId, stats });

    return stats;
  } catch (error) {
    console.error('Error fetching student stats:', error);
    await logSalesModuleAccess('get_student_stats', false, { error: error instanceof Error ? error.message : 'Unknown error', studentId });
    throw error;
  }
}

// Bulk operations
export const bulkUpdateStudentStatus = async (studentIds: string[], status: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('students')
      .update({ status, updated_at: new Date().toISOString() })
      .in('id', studentIds);

    if (error) {
      console.error('Error updating student status:', error);
      throw new Error(`Failed to update student status: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in bulkUpdateStudentStatus:', error);
    throw error;
  }
};

export const bulkDeleteStudents = async (studentIds: string[]): Promise<void> => {
  try {
    const { error } = await supabase
      .from('students')
      .delete()
      .in('id', studentIds);

    if (error) {
      console.error('Error deleting students:', error);
      throw new Error(`Failed to delete students: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in bulkDeleteStudents:', error);
    throw error;
  }
};

// CSV export
export const exportStudentsToCSV = async (studentIds?: string[]): Promise<string> => {
  try {
    let query = supabase.from('students').select('*');
    
    if (studentIds && studentIds.length > 0) {
      query = query.in('id', studentIds);
    }

    const { data: students, error } = await query;

    if (error) {
      console.error('Error fetching students for export:', error);
      throw new Error(`Failed to fetch students: ${error.message}`);
    }

    if (!students || students.length === 0) {
      return '';
    }

    // Create CSV headers
    const headers = [
      'Student Number',
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Date of Birth',
      'Gender',
      'Current Belt',
      'Status',
      'Enrollment Date',
      'Branch',
      'Parent/Guardian Name',
      'Emergency Contact',
      'Emergency Phone',
      'Medical Conditions',
      'Notes'
    ];

    // Create CSV rows
    const rows = students.map(student => [
      student.student_number || '',
      student.first_name || '',
      student.last_name || '',
      student.email || '',
      student.phone || '',
      student.date_of_birth || '',
      student.gender || '',
      student.current_belt || '',
      student.status || '',
      student.enrollment_date || '',
      student.branch_id || '',
      '', // parent_guardian_name not in database
      student.emergency_contact_name || '',
      student.emergency_contact_phone || '',
      '', // medical_conditions not in database
      student.notes || ''
    ]);

    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field.toString().replace(/"/g, '""')}"`).join(','))
      .join('\n');

    return csvContent;
  } catch (error) {
    console.error('Error in exportStudentsToCSV:', error);
    throw error;
  }
};

// CSV import
export const importStudentsFromCSV = async (csvContent: string): Promise<{ success: number; errors: string[] }> => {
  try {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must contain at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    const dataRows = lines.slice(1);

    const studentsToInsert: CreateStudentData[] = [];
    const errors: string[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      try {
        const values = dataRows[i].split(',').map(v => v.replace(/"/g, '').trim());
        
        if (values.length !== headers.length) {
          errors.push(`Row ${i + 2}: Column count mismatch`);
          continue;
        }

        const firstName = values[1] || '';
        const lastName = values[2] || '';
        const fullName = `${firstName} ${lastName}`.trim();

        const student: CreateStudentData = {
          first_name: firstName,
          last_name: lastName,
          certificate_name: fullName,
          display_name: fullName,
          email: values[3] || undefined,
          phone: values[4] || undefined,
          date_of_birth: values[5] || undefined,
          gender: values[6] || undefined,
          current_belt: values[7] || undefined,
          status: values[8] || 'active',
          branch_id: values[10] || undefined,
          emergency_contact_name: values[12] || undefined,
          emergency_contact_phone: values[13] || undefined,
          notes: values[15] || undefined
        };

        // Validate required fields
        if (!student.first_name || !student.last_name) {
          errors.push(`Row ${i + 2}: First name and last name are required`);
          continue;
        }

        studentsToInsert.push(student);
      } catch (rowError) {
        errors.push(`Row ${i + 2}: ${rowError instanceof Error ? rowError.message : 'Unknown error'}`);
      }
    }

    let successCount = 0;

    if (studentsToInsert.length > 0) {
      for (const studentData of studentsToInsert) {
        try {
          await createStudent(studentData);
          successCount++;
        } catch (error) {
          errors.push(`Failed to create student ${studentData.first_name} ${studentData.last_name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    return { success: successCount, errors };
  } catch (error) {
    console.error('Error in importStudentsFromCSV:', error);
    throw error;
  }
};

/**
 * Get all trial registrations (students with status = 'trial')
 */
export async function getTrials(
  page: number = 1,
  limit: number = 20,
  search?: string,
  branchId?: string
): Promise<{ students: Student[]; total: number }> {
  try {
    let query = supabase
      .from('students')
      .select('*', { count: 'exact' })
      .eq('status', 'trial')
      .order('trial_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data, error, count } = await query
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      logger.error('Error fetching trials', error);
      await logSalesModuleAccess('get_trials', false, { error: error.message });
      throw error;
    }

    await logSalesModuleAccess('get_trials', true, { count: data?.length || 0 });
    
    return {
      students: data || [],
      total: count || 0
    };
  } catch (error) {
    logger.error('Error fetching trials', error);
    throw error;
  }
}

/**
 * Convert a trial to a registered student
 */
export async function convertTrialToStudent(studentId: string): Promise<Student> {
  try {
    const { data, error } = await supabase
      .from('students')
      .update({ 
        status: 'active',
        enrollment_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', studentId)
      .eq('status', 'trial')
      .select()
      .single();

    if (error) {
      logger.error('Error converting trial to student', error);
      await logSalesModuleAccess('convert_trial_to_student', false, { error: error.message, studentId });
      throw error;
    }

    await logSalesModuleAccess('convert_trial_to_student', true, { studentId });
    
    return data;
  } catch (error) {
    logger.error('Error converting trial to student', error);
    throw error;
  }
}