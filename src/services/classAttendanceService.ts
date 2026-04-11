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
  student_phone?: string;
}

export interface StudentForAttendance {
  id: string;
  first_name: string;
  last_name: string;
  current_belt?: string;
  date_of_birth?: string;
  phone?: string;
  status: string;
  allowed_class_types?: string[] | null;
}

// Ad-Hoc Lesson product for overage/ad-hoc invoices
const ADHOC_LESSON_PRODUCT_ID = '66b8a674-73b9-4460-a87c-809882ba0b13';
const ADHOC_LESSON_BASE_PRICE = 27.00;

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
        students(id, first_name, last_name, current_belt, phone)
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
      current_belt: record.students?.current_belt,
      student_phone: record.students?.phone
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
  ageTo?: number,
  classType?: string
): Promise<StudentForAttendance[]> {
  try {
    let query = supabase
      .from('students')
      .select('id, first_name, last_name, current_belt, date_of_birth, phone, status, allowed_class_types')
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
        // Check if student has an age exception for this class type
        if (classType && student.allowed_class_types && Array.isArray(student.allowed_class_types) && student.allowed_class_types.includes(classType)) {
          return true; // Skip age check for students with exception
        }

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
 * Get the ad-hoc lesson price, checking branch price_rules for overrides
 */
async function getAdHocLessonPrice(branchId: string): Promise<number> {
  try {
    const { data: priceRule } = await supabase
      .from('price_rules')
      .select('price_override')
      .eq('product_id', ADHOC_LESSON_PRODUCT_ID)
      .eq('branch_id', branchId)
      .eq('is_active', true)
      .maybeSingle();

    return priceRule?.price_override ?? ADHOC_LESSON_BASE_PRICE;
  } catch {
    return ADHOC_LESSON_BASE_PRICE;
  }
}

/**
 * Check active entitlements for a student and consume one session if available.
 * Returns true if a session was consumed, false otherwise.
 */
async function tryConsumeEntitlement(studentId: string): Promise<boolean> {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Find earliest active entitlement with remaining sessions
    const { data: entitlement, error } = await supabase
      .from('entitlements')
      .select('id, sessions_remaining, sessions_used')
      .eq('student_id', studentId)
      .eq('is_active', true)
      .gt('sessions_remaining', 0)
      .or(`valid_to.is.null,valid_to.gte.${today}`)
      .order('valid_to', { ascending: true, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!entitlement || !entitlement.sessions_remaining || entitlement.sessions_remaining <= 0) {
      return false;
    }

    // Consume one session
    const { error: updateError } = await supabase
      .from('entitlements')
      .update({
        sessions_remaining: entitlement.sessions_remaining - 1,
        sessions_used: (entitlement.sessions_used || 0) + 1,
      })
      .eq('id', entitlement.id);

    if (updateError) throw updateError;

    logger.info(`Consumed 1 entitlement session for student ${studentId} (entitlement ${entitlement.id}), ${entitlement.sessions_remaining - 1} remaining`);
    return true;
  } catch (error) {
    logger.error('Failed to consume entitlement session', error);
    return false;
  }
}

/**
 * Check if student exceeds quota and issue overage/ad-hoc invoice if needed.
 * First checks entitlements for remaining sessions before invoicing.
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

    // Within quota, no action needed
    if (attendedCount <= purchasedQuota) {
      return;
    }

    // Exceeded quota — try to consume an entitlement session first
    const consumed = await tryConsumeEntitlement(studentId);
    if (consumed) {
      logger.info('Entitlement session consumed, no invoice needed');
      return;
    }

    // No entitlement available — check if ad-hoc invoice already exists
    const existingAdHocCount = await getAdHocInvoiceCount(studentId, term.id);
    const expectedInvoices = attendedCount - purchasedQuota;

    if (existingAdHocCount >= expectedInvoices) {
      logger.info('Ad-hoc invoice already exists for this excess, skipping');
      return;
    }

    // Get branch-specific price
    const price = await getAdHocLessonPrice(branchId);

    // Determine invoice type
    const invoiceType = purchasedQuota === 0 ? 'adhoc' : 'overage';
    const description = invoiceType === 'adhoc'
      ? `Ad-Hoc Lesson (${term.name})`
      : `Ad-Hoc Lesson - Additional Session (${term.name})`;

    // Create ad-hoc lesson invoice
    logger.info(`Creating ${invoiceType} invoice for student ${studentId}, term ${term.id}`);

    await createInvoice({
      student_id: studentId,
      branch_id: branchId,
      payment_terms_days: 14,
      notes: invoiceType === 'adhoc'
        ? `Ad-hoc lesson for ${term.name}`
        : `Additional class session for ${term.name}`,
      internal_notes: `Auto-generated ${invoiceType} invoice. Term: ${term.name}. Attended: ${attendedCount}, Quota: ${purchasedQuota}`,
      items: [{
        product_id: ADHOC_LESSON_PRODUCT_ID,
        description,
        quantity: 1,
        unit_price: price,
        metadata: {
          type: invoiceType,
          term_id: term.id,
          term_name: term.name,
          attended_count: attendedCount,
          purchased_quota: purchasedQuota
        }
      }]
    });

    logger.info(`${invoiceType} invoice created successfully`);
  } catch (error) {
    logger.error('Failed to check/issue overage invoice', error);
    // Don't throw - we don't want to fail attendance recording due to invoice issues
  }
}

/**
 * Count existing ad-hoc/overage invoices for a student in a term
 */
async function getAdHocInvoiceCount(
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

    // Get invoice items that are ad-hoc/overage items for this term
    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select('id, metadata')
      .in('invoice_id', invoiceIds)
      .eq('product_id', ADHOC_LESSON_PRODUCT_ID);

    if (itemsError) throw itemsError;
    if (!items) return 0;

    // Count items with matching term_id and type: adhoc or overage
    let count = 0;
    for (const item of items) {
      const metadata = item.metadata as Record<string, any> | null;
      if ((metadata?.type === 'overage' || metadata?.type === 'adhoc') && metadata?.term_id === termId) {
        count++;
      }
    }

    return count;
  } catch (error) {
    logger.error('Failed to get ad-hoc invoice count', error);
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
    // Step 1: Get scheduled classes for this timetable and date
    const { data: scheduledClasses, error: schedError } = await supabase
      .from('student_scheduled_classes')
      .select('id, enrollment_id')
      .eq('timetable_id', timetableId)
      .eq('scheduled_date', date)
      .eq('status', 'scheduled');

    if (schedError) throw schedError;
    if (!scheduledClasses || scheduledClasses.length === 0) return;

    // Step 2: Get student_ids from enrollments using separate query
    const enrollmentIds = scheduledClasses.map(s => s.enrollment_id).filter(Boolean) as string[];
    if (enrollmentIds.length === 0) return;

    const { data: enrollments, error: enrollError } = await supabase
      .from('student_class_enrollments')
      .select('student_id')
      .in('id', enrollmentIds);

    if (enrollError) throw enrollError;

    const studentIds = (enrollments || []).map(e => e.student_id).filter(Boolean) as string[];

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
 * Get all attendance records for a branch within a date range (for timetable display).
 * Returns records with student names, grouped by timetable_id + class_date.
 */
export async function getAttendanceForWeek(
  branchId: string,
  startDate: string,
  endDate: string
): Promise<Array<{
  student_id: string;
  student_name: string;
  timetable_id: string | null;
  class_date: string;
  status: string;
}>> {
  try {
    const { data, error } = await supabase
      .from('class_attendance')
      .select('student_id, timetable_id, class_date, status, students(first_name, last_name)')
      .eq('branch_id', branchId)
      .gte('class_date', startDate)
      .lte('class_date', endDate);

    if (error) throw error;

    return (data || []).map(r => ({
      student_id: r.student_id,
      student_name: r.students ? `${r.students.first_name} ${r.students.last_name}` : 'Unknown',
      timetable_id: r.timetable_id,
      class_date: r.class_date,
      status: r.status,
    }));
  } catch (error) {
    logger.error('Failed to get attendance for week', error);
    return [];
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
