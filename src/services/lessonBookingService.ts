/**
 * Lesson bookings (student class attendance).
 *
 * One row per student per timeslot per date in `lesson_bookings`.
 * Status: requested (from /hello, waiting for staff) → booked → attended | absent, or rejected.
 * Marking attended/absent uses one paid lesson (database trigger on entitlements).
 */
import { supabase } from '@/integrations/supabase/client';

const table = () => supabase.from('lesson_bookings' as any);

/**
 * Replace the not-yet-marked bookings created from an invoice item's selected class slots.
 * Slots use the `${timetable_id}_${YYYY-MM-DD}` format used by invoice metadata.
 */
export async function syncInvoiceSlotBookings(input: {
  studentId: string;
  branchId: string;
  invoiceId: string;
  termId?: string | null;
  slots: string[];
  createdBy?: string | null;
}): Promise<void> {
  const { studentId, branchId, invoiceId, termId, slots } = input;
  let del = table().delete().eq('invoice_id', invoiceId).eq('student_id', studentId).in('status', ['booked', 'requested']);
  if (termId) del = del.eq('term_id', termId);
  await del;
  const rows = slots
    .map((s) => {
      const [timetable_id, lesson_date] = s.split('_');
      if (!timetable_id || !lesson_date) return null;
      return {
        student_id: studentId,
        branch_id: branchId,
        timetable_id,
        lesson_date,
        term_id: termId ?? null,
        status: 'booked',
        source: 'invoice',
        invoice_id: invoiceId,
        created_by: input.createdBy ?? null,
      };
    })
    .filter(Boolean);
  if (rows.length === 0) return;
  // Insert one by one so a slot the student is already booked into is simply skipped.
  for (const r of rows) await (table() as any).insert(r);
}

/** Remove not-yet-marked bookings tied to an invoice (used when an invoice is deleted or cancelled). */
export async function removeUnmarkedInvoiceBookings(invoiceId: string): Promise<void> {
  await table().delete().eq('invoice_id', invoiceId).in('status', ['booked', 'requested']);
}

// ---------- /access Attendance (staff password sessions) ----------

export interface TimetableSlot {
  id: string;
  branch_id: string;
  weekday: number | null; // 0 = Sunday … 6 = Saturday; null when specific_dates is set
  /** ISO dates; when set the slot runs only on these dates */
  specific_dates?: string[] | null;
  start_time: string;
  end_time: string;
  class_type: string | null;
  age_from: number | null;
  age_to: number | null;
  belt_levels: string[] | null;
  max_capacity: number | null;
  instructor_name: string | null;
  is_active: boolean;
}

export interface LessonBooking {
  id: string;
  student_id: string;
  timetable_id: string | null;
  lesson_date: string;
  start_time: string | null;
  end_time: string | null;
  class_type: string | null;
  status: 'requested' | 'booked' | 'attended' | 'absent' | 'rejected';
  source: string;
  cancel_requested: boolean;
  notes: string | null;
  created_at: string;
  student_name: string;
  current_belt?: string | null;
  date_of_birth?: string | null;
  student_status?: string | null;
  term_payment?: 'paid' | 'unpaid' | 'none' | null;
}

export interface AttendanceWeek {
  slots: TimetableSlot[];
  holidays: { date: string; name: string }[];
  terms: { id: string; name: string; start_date: string; end_date: string }[];
  breaks: { name: string; start_date: string; end_date: string }[];
  bookings: LessonBooking[];
  requests: LessonBooking[];
}

export interface AttendanceStudentOption {
  id: string;
  name: string;
  current_belt: string | null;
  date_of_birth: string | null;
  status: string;
  remaining: number;
  pending: number;
  unlimited: boolean;
  available: number;
  term_payment?: 'paid' | 'unpaid' | 'none' | null;
}

export interface AttendanceTerm {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  year: number | null;
  term_number: number | null;
  breaks: { id: string; name: string; start_date: string; end_date: string }[];
}

export interface AttendanceSettings {
  slots: TimetableSlot[];
  class_types: { id: string; name: string; is_active: boolean; color?: string | null }[];
  terms: AttendanceTerm[];
}

const rpc = async <T,>(fn: string, args: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.rpc(fn as any, args as any);
  if (error) throw new Error(error.message);
  return data as T;
};

export const accessPassword = (): string => {
  try { return sessionStorage.getItem('access_pw_v1') || ''; } catch { return ''; }
};

export const getAttendanceWeek = (branchId: string, weekStart: string) =>
  rpc<AttendanceWeek>('access_attendance_week', { p_password: accessPassword(), p_branch_id: branchId, p_week_start: weekStart });

export const searchAttendanceStudents = (branchId: string, search: string, date: string) =>
  rpc<AttendanceStudentOption[]>('access_attendance_students', { p_password: accessPassword(), p_branch_id: branchId, p_search: search, p_date: date });

export const addStudentToSlot = (timetableId: string, date: string, studentId: string, force = false) =>
  rpc<{ ok: boolean; id?: string; limit_reached?: boolean; remaining?: number; pending?: number }>('access_attendance_add', {
    p_password: accessPassword(), p_timetable_id: timetableId, p_date: date, p_student_id: studentId, p_force: force,
  });

export const markBooking = (bookingId: string, status: 'attended' | 'absent' | 'booked') =>
  rpc<void>('access_attendance_mark', { p_password: accessPassword(), p_booking_id: bookingId, p_status: status });

export const removeBooking = (bookingId: string) =>
  rpc<void>('access_attendance_remove', { p_password: accessPassword(), p_booking_id: bookingId });

export const reviewBookingRequest = (bookingId: string, approve: boolean) =>
  rpc<void>('access_attendance_review', { p_password: accessPassword(), p_booking_id: bookingId, p_approve: approve });

export const getAttendanceSettings = (branchId: string) =>
  rpc<AttendanceSettings>('access_attendance_settings', { p_password: accessPassword(), p_branch_id: branchId });

export const saveTimetableSlot = (row: Partial<TimetableSlot> & { branch_id: string }) =>
  rpc<string>('access_timetable_upsert', { p_password: accessPassword(), p_row: row });

export const saveClassType = (branchId: string, id: string | null, name: string, isActive = true) =>
  rpc<string>('access_class_type_upsert', { p_password: accessPassword(), p_branch_id: branchId, p_id: id, p_name: name, p_is_active: isActive });

export const saveTerm = (row: Partial<AttendanceTerm> & { branch_id: string }) =>
  rpc<string>('access_term_upsert', { p_password: accessPassword(), p_row: row });

export const saveTermBreak = (termId: string, id: string | null, name: string, start: string, end: string, remove = false) =>
  rpc<void>('access_term_break_save', {
    p_password: accessPassword(), p_term_id: termId, p_id: id, p_name: name, p_start: start || null, p_end: end || null, p_delete: remove,
  });

export const saveClassTypeColor = (branchId: string, id: string, color: string | null) =>
  rpc<void>('access_class_type_set_color', { p_password: accessPassword(), p_branch_id: branchId, p_id: id, p_color: color });
