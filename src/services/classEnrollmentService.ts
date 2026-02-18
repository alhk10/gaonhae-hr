/**
 * Class Enrollment Service
 * Manages student class enrollments linking to branch timetables and invoices
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface ClassEnrollment {
  id: string;
  student_id: string;
  term_id: string;
  branch_id: string;
  class_type: string;
  pricing_tier_id: string | null;
  tier_name: string;
  enrolled_weekdays: number[] | null;
  total_price: number;
  invoice_item_id: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  // Joined fields
  student_name?: string;
  branch_name?: string;
  term_name?: string;
}

export interface ScheduledClass {
  id: string;
  enrollment_id: string;
  timetable_id: string | null;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  status: string;
  swapped_from_id: string | null;
  swap_reason: string | null;
  attended_at: string | null;
  recorded_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  student_name?: string;
  class_type?: string;
  branch_name?: string;
  enrollment?: ClassEnrollment;
}

export interface CreateEnrollmentData {
  student_id: string;
  term_id: string;
  branch_id: string;
  class_type: string;
  pricing_tier_id?: string;
  tier_name: string;
  enrolled_weekdays?: number[];
  total_price: number;
  invoice_item_id?: string;
  notes?: string;
}

export interface CreateScheduledClassData {
  enrollment_id: string;
  timetable_id?: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
}

// Get all enrollments with optional filters
export async function getEnrollments(
  branchId?: string,
  termId?: string,
  status?: string
): Promise<ClassEnrollment[]> {
  try {
    let query = supabase
      .from('student_class_enrollments')
      .select('*')
      .order('created_at', { ascending: false });

    if (branchId) query = query.eq('branch_id', branchId);
    if (termId) query = query.eq('term_id', termId);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;

    if (error) throw error;

    // Fetch related data separately
    const enrollments = data || [];
    const studentIds = [...new Set(enrollments.map(e => e.student_id))];
    const branchIds = [...new Set(enrollments.map(e => e.branch_id))];
    const termIds = [...new Set(enrollments.map(e => e.term_id))];

    // Fetch students
    const { data: students } = studentIds.length > 0 
      ? await supabase.from('students').select('id, first_name, last_name, display_name').in('id', studentIds)
      : { data: [] };
    const studentMap = (students || []).reduce((acc, s) => ({ 
      ...acc, 
      [s.id]: s.display_name || `${s.first_name} ${s.last_name}` 
    }), {} as Record<string, string>);

    // Fetch branches
    const { data: branches } = branchIds.length > 0
      ? await supabase.from('branches').select('id, name').in('id', branchIds)
      : { data: [] };
    const branchMap = (branches || []).reduce((acc, b) => ({ ...acc, [b.id]: b.name }), {} as Record<string, string>);

    // Fetch terms
    const { data: terms } = termIds.length > 0
      ? await supabase.from('term_calendars').select('id, name').in('id', termIds)
      : { data: [] };
    const termMap = (terms || []).reduce((acc, t) => ({ ...acc, [t.id]: t.name }), {} as Record<string, string>);

    return enrollments.map(e => ({
      ...e,
      student_name: studentMap[e.student_id] || 'Unknown',
      branch_name: branchMap[e.branch_id] || e.branch_id,
      term_name: termMap[e.term_id] || 'Unknown Term',
    }));
  } catch (error) {
    logger.error('Failed to fetch enrollments', error);
    throw error;
  }
}

// Get enrollment by ID
export async function getEnrollment(enrollmentId: string): Promise<ClassEnrollment | null> {
  try {
    const { data, error } = await supabase
      .from('student_class_enrollments')
      .select('*')
      .eq('id', enrollmentId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    // Fetch related data
    const { data: student } = await supabase.from('students').select('first_name, last_name, display_name').eq('id', data.student_id).maybeSingle();
    const { data: branch } = await supabase.from('branches').select('name').eq('id', data.branch_id).maybeSingle();
    const { data: term } = await supabase.from('term_calendars').select('name').eq('id', data.term_id).maybeSingle();

    const studentName = student?.display_name || (student ? `${student.first_name} ${student.last_name}` : 'Unknown');

    return {
      ...data,
      student_name: studentName,
      branch_name: branch?.name || data.branch_id,
      term_name: term?.name || 'Unknown Term',
    };
  } catch (error) {
    logger.error('Failed to fetch enrollment', error);
    throw error;
  }
}

// Create a new enrollment (deactivates previous enrollments for same student/term/branch)
export async function createEnrollment(data: CreateEnrollmentData): Promise<string> {
  try {
    // Deactivate existing enrollments for the same student/term/branch
    const { data: existing } = await supabase
      .from('student_class_enrollments')
      .select('id')
      .eq('student_id', data.student_id)
      .eq('term_id', data.term_id)
      .eq('branch_id', data.branch_id)
      .eq('status', 'active');

    if (existing && existing.length > 0) {
      const oldIds = existing.map(e => e.id);
      // Cancel scheduled classes for old enrollments
      await supabase
        .from('student_scheduled_classes')
        .update({ status: 'cancelled' })
        .in('enrollment_id', oldIds)
        .eq('status', 'scheduled');
      // Deactivate old enrollments
      await supabase
        .from('student_class_enrollments')
        .update({ status: 'inactive' })
        .in('id', oldIds);
    }

    const { data: result, error } = await supabase
      .from('student_class_enrollments')
      .insert({
        student_id: data.student_id,
        term_id: data.term_id,
        branch_id: data.branch_id,
        class_type: data.class_type,
        pricing_tier_id: data.pricing_tier_id,
        tier_name: data.tier_name,
        enrolled_weekdays: data.enrolled_weekdays,
        total_price: data.total_price,
        invoice_item_id: data.invoice_item_id,
        notes: data.notes,
        status: 'active',
      })
      .select('id')
      .single();

    if (error) throw error;
    return result.id;
  } catch (error) {
    logger.error('Failed to create enrollment', error);
    throw error;
  }
}

// Update enrollment
export async function updateEnrollment(
  enrollmentId: string,
  data: Partial<CreateEnrollmentData>
): Promise<void> {
  try {
    const { error } = await supabase
      .from('student_class_enrollments')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', enrollmentId);

    if (error) throw error;
  } catch (error) {
    logger.error('Failed to update enrollment', error);
    throw error;
  }
}

// Update enrollment status
export async function updateEnrollmentStatus(
  enrollmentId: string,
  status: 'active' | 'suspended' | 'completed' | 'cancelled'
): Promise<void> {
  try {
    const { error } = await supabase
      .from('student_class_enrollments')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', enrollmentId);

    if (error) throw error;
  } catch (error) {
    logger.error('Failed to update enrollment status', error);
    throw error;
  }
}

// Get scheduled classes for a date range
export async function getScheduledClasses(
  startDate: string,
  endDate: string,
  branchId?: string
): Promise<ScheduledClass[]> {
  try {
    const { data, error } = await supabase
      .from('student_scheduled_classes')
      .select('*')
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate)
      .order('scheduled_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;

    const scheduledClasses = data || [];
    if (scheduledClasses.length === 0) return [];

    // Get unique enrollment IDs
    const enrollmentIds = [...new Set(scheduledClasses.map(sc => sc.enrollment_id))];

    // Fetch enrollments
    const { data: enrollments } = await supabase
      .from('student_class_enrollments')
      .select('*')
      .in('id', enrollmentIds);

    const enrollmentMap = (enrollments || []).reduce((acc, e) => ({ ...acc, [e.id]: e }), {} as Record<string, any>);

    // Get student and branch IDs from enrollments
    const studentIds = [...new Set((enrollments || []).map(e => e.student_id))];
    const branchIds = [...new Set((enrollments || []).map(e => e.branch_id))];

    // Fetch students and branches
    const [studentsResult, branchesResult] = await Promise.all([
      studentIds.length > 0 ? supabase.from('students').select('id, first_name, last_name, display_name').in('id', studentIds) : { data: [] },
      branchIds.length > 0 ? supabase.from('branches').select('id, name').in('id', branchIds) : { data: [] },
    ]);

    const studentMap = (studentsResult.data || []).reduce((acc, s) => ({ 
      ...acc, 
      [s.id]: s.display_name || `${s.first_name} ${s.last_name}` 
    }), {} as Record<string, string>);
    const branchMap = (branchesResult.data || []).reduce((acc, b) => ({ ...acc, [b.id]: b.name }), {} as Record<string, string>);

    let result = scheduledClasses.map(sc => {
      const enrollment = enrollmentMap[sc.enrollment_id];
      return {
        ...sc,
        enrollment,
        student_name: enrollment ? studentMap[enrollment.student_id] || 'Unknown' : 'Unknown',
        class_type: enrollment?.class_type || 'Unknown',
        branch_name: enrollment ? branchMap[enrollment.branch_id] || enrollment.branch_id : 'Unknown',
      };
    });

    // Filter by branch if specified
    if (branchId) {
      result = result.filter(sc => sc.enrollment?.branch_id === branchId);
    }

    return result;
  } catch (error) {
    logger.error('Failed to fetch scheduled classes', error);
    throw error;
  }
}

// Create scheduled class
export async function createScheduledClass(data: CreateScheduledClassData): Promise<string> {
  try {
    const { data: result, error } = await supabase
      .from('student_scheduled_classes')
      .insert({
        enrollment_id: data.enrollment_id,
        timetable_id: data.timetable_id,
        scheduled_date: data.scheduled_date,
        start_time: data.start_time,
        end_time: data.end_time,
        status: 'scheduled',
      })
      .select('id')
      .single();

    if (error) throw error;
    return result.id;
  } catch (error) {
    logger.error('Failed to create scheduled class', error);
    throw error;
  }
}

// Update scheduled class status
export async function updateScheduledClassStatus(
  classId: string,
  status: 'scheduled' | 'attended' | 'absent' | 'cancelled' | 'swapped',
  attendedAt?: string,
  recordedBy?: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('student_scheduled_classes')
      .update({
        status,
        attended_at: attendedAt,
        recorded_by: recordedBy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', classId);

    if (error) throw error;
  } catch (error) {
    logger.error('Failed to update scheduled class status', error);
    throw error;
  }
}

// Swap a scheduled class to a different date/time
export async function swapScheduledClass(
  originalClassId: string,
  newDate: string,
  newStartTime: string,
  newEndTime: string,
  newTimetableId?: string,
  reason?: string
): Promise<string> {
  try {
    // Get original class
    const { data: originalClass, error: fetchError } = await supabase
      .from('student_scheduled_classes')
      .select('*')
      .eq('id', originalClassId)
      .single();

    if (fetchError) throw fetchError;

    // Mark original as swapped
    await updateScheduledClassStatus(originalClassId, 'swapped');

    // Create new scheduled class
    const { data: newClass, error: createError } = await supabase
      .from('student_scheduled_classes')
      .insert({
        enrollment_id: originalClass.enrollment_id,
        timetable_id: newTimetableId || originalClass.timetable_id,
        scheduled_date: newDate,
        start_time: newStartTime,
        end_time: newEndTime,
        status: 'scheduled',
        swapped_from_id: originalClassId,
        swap_reason: reason,
      })
      .select('id')
      .single();

    if (createError) throw createError;
    return newClass.id;
  } catch (error) {
    logger.error('Failed to swap scheduled class', error);
    throw error;
  }
}

// Generate scheduled classes for an enrollment based on enrolled weekdays
export async function generateScheduledClasses(
  enrollmentId: string,
  termStartDate: string,
  termEndDate: string,
  enrolledWeekdays: number[],
  timetables: { weekday: number; start_time: string; end_time: string; id: string }[]
): Promise<void> {
  try {
    const scheduledClasses: CreateScheduledClassData[] = [];
    const start = new Date(termStartDate);
    const end = new Date(termEndDate);

    // Loop through each day in the term
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      // Check if this day is in the enrolled weekdays
      if (enrolledWeekdays.includes(dayOfWeek)) {
        // Find matching timetable for this weekday
        const timetable = timetables.find(t => t.weekday === dayOfWeek);
        
        if (timetable) {
          scheduledClasses.push({
            enrollment_id: enrollmentId,
            timetable_id: timetable.id,
            scheduled_date: date.toISOString().split('T')[0],
            start_time: timetable.start_time,
            end_time: timetable.end_time,
          });
        }
      }
    }

    // Batch insert
    if (scheduledClasses.length > 0) {
      const { error } = await supabase
        .from('student_scheduled_classes')
        .insert(scheduledClasses);

      if (error) throw error;
    }

    logger.info(`Generated ${scheduledClasses.length} scheduled classes for enrollment ${enrollmentId}`);
  } catch (error) {
    logger.error('Failed to generate scheduled classes', error);
    throw error;
  }
}

// Get class pricing tiers for a branch and class type
export async function getClassPricingTiers(
  branchId: string,
  classType?: string
): Promise<{
  id: string;
  branch_id: string;
  class_type: string;
  tier_name: string;
  tier_display_name: string;
  price_per_week: number;
  price_per_lesson: number | null;
  is_active: boolean;
}[]> {
  try {
    let query = supabase
      .from('class_pricing_tiers')
      .select('*')
      .eq('branch_id', branchId)
      .eq('is_active', true);

    if (classType) {
      query = query.eq('class_type', classType);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('Failed to fetch class pricing tiers', error);
    throw error;
  }
}

// Calculate enrollment price based on term weeks and pricing tier
export function calculateEnrollmentPrice(
  termWeeks: number,
  pricePerWeek: number,
  pricePerLesson: number | null,
  tierName: string,
  lessonCount?: number
): number {
  if (tierName === 'per_lesson' && pricePerLesson && lessonCount) {
    return pricePerLesson * lessonCount;
  }
  return termWeeks * pricePerWeek;
}
