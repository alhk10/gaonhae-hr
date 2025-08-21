/**
 * Student Service
 * Handles all student-related data operations for the sales module
 */

import { supabase } from '@/integrations/supabase/client';
import { logSalesModuleAccess } from './salesModuleService';

export interface Student {
  id: string;
  student_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  phone?: string;
  email?: string;
  address?: string;
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
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
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
      console.error('Error fetching students:', error);
      await logSalesModuleAccess('get_students', false, { error: error.message });
      throw error;
    }

    await logSalesModuleAccess('get_students', true, { count: data?.length || 0 });
    
    return {
      students: data || [],
      total: count || 0
    };
  } catch (error) {
    console.error('Error fetching students:', error);
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
      console.error('Error fetching student:', error);
      await logSalesModuleAccess('get_student_by_id', false, { error: error.message, studentId });
      throw error;
    }

    await logSalesModuleAccess('get_student_by_id', true, { studentId });
    
    return data;
  } catch (error) {
    console.error('Error fetching student:', error);
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
      console.error('Error fetching emergency contacts:', error);
      await logSalesModuleAccess('get_emergency_contacts', false, { error: error.message, studentId });
      throw error;
    }

    await logSalesModuleAccess('get_emergency_contacts', true, { studentId, count: data?.length || 0 });
    
    return data || [];
  } catch (error) {
    console.error('Error fetching emergency contacts:', error);
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
      console.error('Error fetching attendance:', error);
      await logSalesModuleAccess('get_student_attendance', false, { error: error.message, studentId });
      throw error;
    }

    await logSalesModuleAccess('get_student_attendance', true, { studentId, count: data?.length || 0 });
    
    return data || [];
  } catch (error) {
    console.error('Error fetching attendance:', error);
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
      console.error('Error fetching entitlements:', error);
      await logSalesModuleAccess('get_student_entitlements', false, { error: error.message, studentId });
      throw error;
    }

    await logSalesModuleAccess('get_student_entitlements', true, { studentId, count: data?.length || 0 });
    
    return data || [];
  } catch (error) {
    console.error('Error fetching entitlements:', error);
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
      console.error('Error fetching invoices:', error);
      await logSalesModuleAccess('get_student_invoices', false, { error: error.message, studentId });
      throw error;
    }

    await logSalesModuleAccess('get_student_invoices', true, { studentId, count: data?.length || 0 });
    
    return data || [];
  } catch (error) {
    console.error('Error fetching invoices:', error);
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
      console.error('Error searching students:', error);
      await logSalesModuleAccess('search_students', false, { error: error.message, query });
      throw error;
    }

    await logSalesModuleAccess('search_students', true, { query, count: data?.length || 0 });
    
    return data || [];
  } catch (error) {
    console.error('Error searching students:', error);
    throw error;
  }
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