/**
 * Class Attendance Service
 * Handles attendance tracking for class slots and automatic overage invoicing
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { getCurrentTerm, Term } from './termCalendarService';
import { createInvoice } from './invoiceService';

export interface ClassAttendanceRecord {
  id: string;
  student_id: string;
  class_date: string;
  branch_id: string;
  timetable_id: string | null;
  status: 'present' | 'absent' | 'late' | 'excused';
  attendance_method?: string;
  recorded_by?: string;
  recorded_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  student_name?: string;
  student_first_name?: string;
  student_last_name?: string;
  current_belt?: string;
}

export interface StudentForAttendance {
  id: string;
  first_name: string;
  last_name: string;
  current_belt?: string;
  date_of_birth?: string;
  status: string;
}

// 1x Weekend product for overage invoices
const OVERAGE_PRODUCT_ID = '7886c756-580e-4966-ba6f-e4fae6c6d4b5';
const OVERAGE_PRODUCT_PRICE = 26.00;

/**
 * Get attendance records for a specific slot on a specific date
 */
export async function getSlotAttendance(
  branchId: string,
  timetableId: string,
  date: string
): Promise<ClassAttendanceRecord[]> {
  try {
    const { data, error } = await supabase
      .from('class_attendance')
      .select(`
        *,
        students(id, first_name, last_name, current_belt)
      `)
      .eq('branch_id', branchId)
      .eq('timetable_id', timetableId)
      .eq('class_date', date);

    if (error) throw error;

    return (data || []).map(record => ({
      ...record,
      status: record.status as 'present' | 'absent' | 'late' | 'excused',
      student_name: record.students ? `${record.students.first_name} ${record.students.last_name}` : 'Unknown',
      student_first_name: record.students?.first_name,
      student_last_name: record.students?.last_name,
      current_belt: record.students?.current_belt
    }));
  } catch (error) {
    logger.error('Failed to get slot attendance', error);
    throw error;
  }
}

/**
 * Get branch students filtered by class criteria (belt levels, age range)
 */
export async function getBranchStudentsForClass(
  branchId: string,
  beltLevels?: string[],
  ageFrom?: number,
  ageTo?: number
): Promise<StudentForAttendance[]> {
  try {
    let query = supabase
      .from('students')
      .select('id, first_name, last_name, current_belt, date_of_birth, status')
      .eq('branch_id', branchId)
      .eq('status', 'active')
      .order('first_name');

    // Apply belt level filter if specified
    if (beltLevels && beltLevels.length > 0) {
      query = query.in('current_belt', beltLevels);
    }

    const { data, error } = await query;

    if (error) throw error;

    let students = data || [];

    // Apply age filter if specified
    if (ageFrom !== undefined || ageTo !== undefined) {
      const today = new Date();
      students = students.filter(student => {
        if (!student.date_of_birth) return true; // Include if no DOB set
        
        const dob = new Date(student.date_of_birth);
        const age = Math.floor((today.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        
        if (ageFrom !== undefined && age < ageFrom) return false;
        if (ageTo !== undefined && age > ageTo) return false;
        return true;
      });
    }

    return students;
  } catch (error) {
    logger.error('Failed to get branch students for class', error);
    throw error;
  }
}

/**
 * Record or update attendance for a student
 */
export async function recordAttendance(
  studentId: string,
  branchId: string,
  timetableId: string,
  date: string,
  status: 'present' | 'absent' | 'late' | 'excused'
): Promise<ClassAttendanceRecord> {
  try {
    // Check if attendance record already exists
    const { data: existing } = await supabase
      .from('class_attendance')
      .select('id')
      .eq('student_id', studentId)
      .eq('branch_id', branchId)
      .eq('timetable_id', timetableId)
      .eq('class_date', date)
      .maybeSingle();

    let result;
    if (existing) {
      // Update existing record
      const { data, error } = await supabase
        .from('class_attendance')
        .update({
          status,
          recorded_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new record
      const { data, error } = await supabase
        .from('class_attendance')
        .insert({
          student_id: studentId,
          branch_id: branchId,
          timetable_id: timetableId,
          class_date: date,
          status,
          attendance_method: 'manual',
          recorded_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    // If marked as present, check for overage
    if (status === 'present') {
      await checkAndIssueOverageInvoice(studentId, branchId, date);
    }

    return result;
  } catch (error) {
    logger.error('Failed to record attendance', error);
    throw error;
  }
}

/**
 * Add a student to a class slot (creates attendance record with 'present' status)
 */
export async function addStudentToSlot(
  studentId: string,
  branchId: string,
  timetableId: string,
  date: string
): Promise<ClassAttendanceRecord> {
  return recordAttendance(studentId, branchId, timetableId, date, 'present');
}

/**
 * Remove a student from a class slot (deletes attendance record)
 */
export async function removeStudentFromSlot(attendanceId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('class_attendance')
      .delete()
      .eq('id', attendanceId);

    if (error) throw error;
  } catch (error) {
    logger.error('Failed to remove student from slot', error);
    throw error;
  }
}

/**
 * Count attended lessons for a student in a term
 */
export async function countTermAttendance(
  studentId: string,
  term: Term
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('class_attendance')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('status', 'present')
      .gte('class_date', term.start_date)
      .lte('class_date', term.end_date);

    if (error) throw error;

    return count || 0;
  } catch (error) {
    logger.error('Failed to count term attendance', error);
    throw error;
  }
}

/**
 * Get student's purchased lesson quota for a term
 * Sums up all lesson products purchased for the term
 */
export async function getStudentTermQuota(
  studentId: string,
  termId: string
): Promise<number> {
  try {
    // Get all invoice items for this student with matching term_id in metadata
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id')
      .eq('student_id', studentId)
      .neq('status', 'cancelled');

    if (invoicesError) throw invoicesError;
    if (!invoices || invoices.length === 0) return 0;

    const invoiceIds = invoices.map(inv => inv.id);

    // Get invoice items with lesson products for this term
    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select(`
        quantity,
        metadata,
        products(lessons_per_week, is_lesson)
      `)
      .in('invoice_id', invoiceIds);

    if (itemsError) throw itemsError;
    if (!items) return 0;

    // Filter items that match the term and are lesson products
    let totalQuota = 0;
    for (const item of items) {
      const metadata = item.metadata as Record<string, any> | null;
      if (!metadata?.term_id || metadata.term_id !== termId) continue;
      if (!item.products?.is_lesson) continue;

      const lessonsPerWeek = item.products.lessons_per_week || 1;
      const totalWeeks = metadata.total_weeks || 10; // Default to 10 weeks if not set
      
      // Total lessons = lessons_per_week * total_weeks * quantity
      totalQuota += lessonsPerWeek * totalWeeks * item.quantity;
    }

    return totalQuota;
  } catch (error) {
    logger.error('Failed to get student term quota', error);
    throw error;
  }
}

/**
 * Check if student exceeds quota and issue overage invoice if needed
 */
export async function checkAndIssueOverageInvoice(
  studentId: string,
  branchId: string,
  classDate: string
): Promise<void> {
  try {
    // Get current term for the branch
    const term = await getCurrentTerm(branchId);
    if (!term) {
      logger.info('No active term found for branch, skipping overage check');
      return;
    }

    // Check if class date is within the term
    if (classDate < term.start_date || classDate > term.end_date) {
      logger.info('Class date outside current term, skipping overage check');
      return;
    }

    // Count attended lessons for this term
    const attendedCount = await countTermAttendance(studentId, term);

    // Get purchased quota for this term
    const purchasedQuota = await getStudentTermQuota(studentId, term.id);

    logger.info(`Student ${studentId}: attended ${attendedCount}, quota ${purchasedQuota}`);

    // Check if exceeded quota
    if (attendedCount <= purchasedQuota) {
      return; // Within quota, no action needed
    }

    // Check if overage invoice already exists for this term
    const existingOverageCount = await getOverageInvoiceCount(studentId, term.id);
    const expectedOverageInvoices = attendedCount - purchasedQuota;

    if (existingOverageCount >= expectedOverageInvoices) {
      logger.info('Overage invoice already exists for this excess, skipping');
      return;
    }

    // Create overage invoice
    logger.info(`Creating overage invoice for student ${studentId}, term ${term.id}`);
    
    await createInvoice({
      student_id: studentId,
      branch_id: branchId,
      payment_terms_days: 14,
      notes: `Additional class session for ${term.name}`,
      internal_notes: `Auto-generated overage invoice. Term: ${term.name}. Attended: ${attendedCount}, Quota: ${purchasedQuota}`,
      items: [{
        product_id: OVERAGE_PRODUCT_ID,
        description: `1x Weekend - Additional Session (${term.name})`,
        quantity: 1,
        unit_price: OVERAGE_PRODUCT_PRICE,
        metadata: {
          type: 'overage',
          term_id: term.id,
          term_name: term.name,
          attended_count: attendedCount,
          purchased_quota: purchasedQuota
        }
      }]
    });

    logger.info('Overage invoice created successfully');
  } catch (error) {
    logger.error('Failed to check/issue overage invoice', error);
    // Don't throw - we don't want to fail attendance recording due to invoice issues
  }
}

/**
 * Count existing overage invoices for a student in a term
 */
async function getOverageInvoiceCount(
  studentId: string,
  termId: string
): Promise<number> {
  try {
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id')
      .eq('student_id', studentId)
      .neq('status', 'cancelled');

    if (invoicesError) throw invoicesError;
    if (!invoices || invoices.length === 0) return 0;

    const invoiceIds = invoices.map(inv => inv.id);

    // Get invoice items that are overage items for this term
    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select('id, metadata')
      .in('invoice_id', invoiceIds)
      .eq('product_id', OVERAGE_PRODUCT_ID);

    if (itemsError) throw itemsError;
    if (!items) return 0;

    // Count items with matching term_id and type: overage
    let count = 0;
    for (const item of items) {
      const metadata = item.metadata as Record<string, any> | null;
      if (metadata?.type === 'overage' && metadata?.term_id === termId) {
        count++;
      }
    }

    return count;
  } catch (error) {
    logger.error('Failed to get overage invoice count', error);
    return 0;
  }
}

/**
 * Auto-populate attendance from scheduled students.
 * For any student in student_scheduled_classes who doesn't have a class_attendance record,
 * creates one with status = 'present'.
 */
export async function autoPopulateAttendanceFromSchedule(
  branchId: string,
  timetableId: string,
  date: string
): Promise<void> {
  try {
    // Get scheduled students for this timetable and date (join through enrollment to get student_id)
    const { data: scheduledStudents, error: schedError } = await supabase
      .from('student_scheduled_classes')
      .select('id, enrollment_id, student_class_enrollments(student_id)')
      .eq('timetable_id', timetableId)
      .eq('scheduled_date', date);

    if (schedError) throw schedError;
    if (!scheduledStudents || scheduledStudents.length === 0) return;

    // Extract student_ids from the joined enrollment data
    const studentIds = scheduledStudents
      .map(s => (s.student_class_enrollments as any)?.student_id)
      .filter(Boolean) as string[];

    if (studentIds.length === 0) return;

    // Get existing attendance records for this slot/date
    const { data: existingAttendance, error: attError } = await supabase
      .from('class_attendance')
      .select('student_id')
      .eq('branch_id', branchId)
      .eq('timetable_id', timetableId)
      .eq('class_date', date);

    if (attError) throw attError;

    const existingStudentIds = new Set((existingAttendance || []).map(a => a.student_id));

    // Filter to students who don't have attendance records yet
    const missingStudentIds = studentIds.filter(id => !existingStudentIds.has(id));

    if (missingStudentIds.length === 0) return;

    // Insert attendance records with status = 'present'
    const records = missingStudentIds.map(studentId => ({
      student_id: studentId,
      branch_id: branchId,
      timetable_id: timetableId,
      class_date: date,
      status: 'present' as const,
      attendance_method: 'auto_scheduled',
      recorded_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from('class_attendance')
      .insert(records);

    if (insertError) throw insertError;

    logger.info(`Auto-populated ${missingStudentIds.length} attendance records from schedule`);
  } catch (error) {
    logger.error('Failed to auto-populate attendance from schedule', error);
    // Don't throw - we don't want to block the dialog from opening
  }
}

/**
 * Bulk update attendance for multiple students
 */
export async function bulkUpdateAttendance(
  updates: Array<{
    studentId: string;
    status: 'present' | 'absent' | 'late' | 'excused';
  }>,
  branchId: string,
  timetableId: string,
  date: string
): Promise<void> {
  try {
    for (const update of updates) {
      await recordAttendance(update.studentId, branchId, timetableId, date, update.status);
    }
  } catch (error) {
    logger.error('Failed to bulk update attendance', error);
    throw error;
  }
}
