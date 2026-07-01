/**
 * Service for approving/rejecting /hello chat lesson-schedule requests.
 *
 * Requests are stored in public_chat_callback_requests with
 * type='lesson_schedule_request' and a matched_student_id.
 * The requested cancellations and new bookings are embedded in the
 * `message` field (produced by publicChatService.submitLessonRequest).
 *
 * Per-booking approval progress is tracked in handled_booking_keys[]
 * (key format: `YYYY-MM-DD|HH:MM|HH:MM|timetable_id`).
 */
import { supabase } from '@/integrations/supabase/client';

export interface ParsedLessonBooking {
  date: string;             // YYYY-MM-DD
  start_time: string;       // HH:MM
  end_time: string;         // HH:MM
  class_type: string | null;
  timetable_id: string | null;
  key: string;
}

export interface ParsedLessonCancellation {
  date: string;
  start_time: string;
  end_time: string;
  class_type: string | null;
  scheduled_class_id: string | null;
  key: string;
}

export interface PendingLessonRequest {
  id: string;
  branch_id: string | null;
  matched_student_id: string;
  student_first_name: string | null;
  student_last_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  message: string | null;
  created_at: string;
  status: string;
  handled_booking_keys: string[];
  cancellations: ParsedLessonCancellation[];
  new_bookings: ParsedLessonBooking[];
  pending_bookings: ParsedLessonBooking[];
}

const dmyToIso = (dmy: string): string => {
  const m = dmy.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return dmy;
  return `${m[3]}-${m[2]}-${m[1]}`;
};

const bookingKey = (b: { date: string; start_time: string; end_time: string; timetable_id: string | null }) =>
  `${b.date}|${b.start_time}|${b.end_time}|${b.timetable_id ?? ''}`;

/** Parse the human-readable message into structured cancel/book arrays. */
export function parseLessonRequestMessage(message: string | null | undefined): {
  cancellations: ParsedLessonCancellation[];
  new_bookings: ParsedLessonBooking[];
} {
  const cancellations: ParsedLessonCancellation[] = [];
  const new_bookings: ParsedLessonBooking[] = [];
  if (!message) return { cancellations, new_bookings };

  const lines = message.split('\n');
  let mode: 'cancel' | 'book' | null = null;
  // e.g. "  - 01/07/2026 16:00–16:50 (Junior) [timetable:xxxx]"
  const bookRe = /^\s*-\s*(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})[–-](\d{2}:\d{2})(?:\s*\(([^)]+)\))?\s*\[(timetable|id):([^\]]*)\]/;

  for (const raw of lines) {
    const l = raw.trimEnd();
    if (/^Cancel:\s*$/i.test(l)) { mode = 'cancel'; continue; }
    if (/^Book:\s*$/i.test(l)) { mode = 'book'; continue; }
    if (!mode) continue;
    const m = l.match(bookRe);
    if (!m) continue;
    const date = dmyToIso(m[1]);
    const start_time = m[2];
    const end_time = m[3];
    const class_type = m[4] ? m[4].trim() : null;
    const tagKind = m[5];
    const tagVal = (m[6] || '').trim() || null;

    if (mode === 'book') {
      const timetable_id = tagKind === 'timetable' ? tagVal : null;
      new_bookings.push({
        date, start_time, end_time, class_type, timetable_id,
        key: bookingKey({ date, start_time, end_time, timetable_id }),
      });
    } else {
      const scheduled_class_id = tagKind === 'id' ? tagVal : null;
      cancellations.push({
        date, start_time, end_time, class_type, scheduled_class_id,
        key: `C|${date}|${start_time}|${end_time}|${scheduled_class_id ?? ''}`,
      });
    }
  }
  return { cancellations, new_bookings };
}

const enrich = async (rows: any[]): Promise<PendingLessonRequest[]> => {
  if (rows.length === 0) return [];
  const studentIds = Array.from(new Set(rows.map(r => r.matched_student_id).filter(Boolean)));
  let studentMap: Record<string, { first_name: string | null; last_name: string | null }> = {};
  if (studentIds.length) {
    const { data: students } = await supabase
      .from('students')
      .select('id, first_name, last_name')
      .in('id', studentIds as string[]);
    (students || []).forEach((s: any) => {
      studentMap[s.id] = { first_name: s.first_name, last_name: s.last_name };
    });
  }
  return rows.map((r: any) => {
    const parsed = parseLessonRequestMessage(r.message);
    const handled = new Set<string>(r.handled_booking_keys || []);
    const pending_bookings = parsed.new_bookings.filter(b => !handled.has(b.key));
    const st = studentMap[r.matched_student_id] || { first_name: null, last_name: null };
    return {
      id: r.id,
      branch_id: r.branch_id,
      matched_student_id: r.matched_student_id,
      student_first_name: st.first_name,
      student_last_name: st.last_name,
      contact_email: r.contact_email,
      contact_phone: r.contact_phone,
      message: r.message,
      created_at: r.created_at,
      status: r.status,
      handled_booking_keys: r.handled_booking_keys || [],
      cancellations: parsed.cancellations,
      new_bookings: parsed.new_bookings,
      pending_bookings,
    };
  });
};

/** All lesson-schedule requests that still have at least one unhandled action. */
export const listPendingLessonRequests = async (branchId?: string): Promise<PendingLessonRequest[]> => {
  let q = supabase
    .from('public_chat_callback_requests')
    .select('*')
    .eq('type', 'lesson_schedule_request')
    .not('matched_student_id', 'is', null)
    .neq('status', 'rejected')
    .neq('status', 'approved')
    .order('created_at', { ascending: false });
  if (branchId) q = q.eq('branch_id', branchId);
  const { data, error } = await q;
  if (error) throw error;
  const enriched = await enrich(data || []);
  return enriched.filter(r => r.pending_bookings.length > 0 || r.cancellations.some(c => !r.handled_booking_keys.includes(c.key)));
};

export const getPendingLessonRequestCount = async (branchId?: string): Promise<number> => {
  const rows = await listPendingLessonRequests(branchId);
  return rows.length;
};

/** Pending bookings that fall on a specific timetable slot (used inside the slot dialog). */
export const listPendingLessonRequestsForSlot = async (
  branchId: string,
  date: string,
  start_time: string,
  end_time: string,
  timetable_id?: string | null,
): Promise<Array<PendingLessonRequest & { booking: ParsedLessonBooking }>> => {
  const rows = await listPendingLessonRequests(branchId);
  const norm = (t: string) => t.slice(0, 5);
  const out: Array<PendingLessonRequest & { booking: ParsedLessonBooking }> = [];
  for (const r of rows) {
    for (const b of r.pending_bookings) {
      if (b.date !== date) continue;
      if (norm(b.start_time) !== norm(start_time)) continue;
      if (norm(b.end_time) !== norm(end_time)) continue;
      if (timetable_id && b.timetable_id && b.timetable_id !== timetable_id) continue;
      out.push({ ...r, booking: b });
    }
  }
  return out;
};

/** Find the active enrollment for a student on a given date in a branch,
 *  or auto-create one from the student's paid lesson invoice for that term. */
const resolveEnrollment = async (
  studentId: string,
  branchId: string,
  date: string,
  timetableId: string | null,
): Promise<string> => {
  const { data: terms, error: termErr } = await supabase
    .from('term_calendars')
    .select('id, start_date, end_date')
    .eq('branch_id', branchId)
    .lte('start_date', date)
    .gte('end_date', date);
  if (termErr) throw termErr;
  const termIds = (terms || []).map((t: any) => t.id);
  if (termIds.length === 0) throw new Error(`No term covers ${date} at this branch`);

  const { data: enrolls, error: enErr } = await supabase
    .from('student_class_enrollments')
    .select('id, term_id, status')
    .eq('student_id', studentId)
    .eq('branch_id', branchId)
    .eq('status', 'active')
    .in('term_id', termIds)
    .limit(1);
  if (enErr) throw enErr;
  if (enrolls && enrolls.length > 0) return enrolls[0].id;

  // No enrollment — auto-create one from a matching paid lesson invoice item.
  const termId = termIds[0];

  let classType: string | null = null;
  if (timetableId) {
    const { data: tt } = await supabase
      .from('branch_timetables')
      .select('class_type')
      .eq('id', timetableId)
      .maybeSingle();
    classType = (tt as any)?.class_type ?? null;
  }

  const { data: invs } = await supabase
    .from('invoices')
    .select('id, status')
    .eq('student_id', studentId)
    .eq('branch_id', branchId)
    .in('status', ['paid', 'verified', 'partially_paid', 'sent', 'draft']);
  const invoiceIds = (invs || []).map((i: any) => i.id);
  if (invoiceIds.length === 0) {
    throw new Error('No paid lesson invoice found for this term — cannot create enrollment');
  }

  const { data: items } = await supabase
    .from('invoice_items')
    .select('id, product_id, total_amount, quantity, description, metadata, created_at')
    .in('invoice_id', invoiceIds)
    .order('created_at', { ascending: false });
  const lessonItem = (items || []).find((it: any) => it?.metadata?.term_id === termId);
  if (!lessonItem) {
    throw new Error('No paid lesson invoice found for this term — cannot create enrollment');
  }

  let pricingTierId: string | undefined;
  let tierName = 'Custom';
  if (classType) {
    const { data: tier } = await supabase
      .from('class_pricing_tiers')
      .select('id, tier_name')
      .eq('branch_id', branchId)
      .eq('class_type', classType)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    if (tier) {
      pricingTierId = (tier as any).id;
      tierName = (tier as any).tier_name || tierName;
    }
  }

  const { createEnrollment } = await import('./classEnrollmentService');
  const enrollmentId = await createEnrollment({
    student_id: studentId,
    term_id: termId,
    branch_id: branchId,
    class_type: classType || 'Class',
    pricing_tier_id: pricingTierId,
    tier_name: tierName,
    total_price: Number(lessonItem.total_amount) || 0,
    invoice_item_id: lessonItem.id,
    notes: 'Auto-created from /hello lesson approval',
  });
  return enrollmentId;
};

/** Apply cancellations (once) and insert the scheduled class rows. */
const applyBookings = async (
  row: PendingLessonRequest,
  bookings: ParsedLessonBooking[],
  applyCancellations: boolean,
): Promise<string[]> => {
  const newlyHandled: string[] = [];

  if (applyCancellations) {
    for (const c of row.cancellations) {
      if (row.handled_booking_keys.includes(c.key)) continue;
      if (c.scheduled_class_id) {
        const { error } = await supabase
          .from('student_scheduled_classes')
          .update({ status: 'cancelled' })
          .eq('id', c.scheduled_class_id);
        if (error) throw error;
      }
      newlyHandled.push(c.key);
    }
  }

  for (const b of bookings) {
    if (row.handled_booking_keys.includes(b.key)) continue;
    const enrollmentId = await resolveEnrollment(row.matched_student_id, row.branch_id!, b.date);
    const { error } = await supabase
      .from('student_scheduled_classes')
      .insert({
        enrollment_id: enrollmentId,
        timetable_id: b.timetable_id,
        scheduled_date: b.date,
        start_time: b.start_time,
        end_time: b.end_time,
        status: 'scheduled',
      });
    if (error) throw error;
    newlyHandled.push(b.key);
  }
  return newlyHandled;
};

const persistHandled = async (row: PendingLessonRequest, newlyHandled: string[]) => {
  const merged = Array.from(new Set([...(row.handled_booking_keys || []), ...newlyHandled]));
  const totalNeeded = new Set<string>([
    ...row.new_bookings.map(b => b.key),
    ...row.cancellations.map(c => c.key),
  ]);
  const allDone = Array.from(totalNeeded).every(k => merged.includes(k));
  const patch: any = { handled_booking_keys: merged };
  if (allDone) patch.status = 'approved';
  const { error } = await supabase
    .from('public_chat_callback_requests')
    .update(patch)
    .eq('id', row.id);
  if (error) throw error;
};

/** Approve every remaining cancellation + new booking on this request. */
export const approveLessonRequest = async (row: PendingLessonRequest): Promise<void> => {
  const newlyHandled = await applyBookings(row, row.pending_bookings, true);
  await persistHandled(row, newlyHandled);
};

/** Approve a single new booking on this request (from the slot dialog). */
export const approveLessonRequestBooking = async (
  row: PendingLessonRequest,
  booking: ParsedLessonBooking,
): Promise<void> => {
  // First-booking approval also processes any cancellations, so they don't get orphaned.
  const applyCancellations = !row.cancellations.every(c => row.handled_booking_keys.includes(c.key));
  const newlyHandled = await applyBookings(row, [booking], applyCancellations);
  await persistHandled(row, newlyHandled);
};

export const rejectLessonRequest = async (id: string, reason: string): Promise<void> => {
  const { error } = await supabase
    .from('public_chat_callback_requests')
    .update({
      status: 'rejected',
      rejected_at: new Date().toISOString(),
      rejected_reason: reason || 'Rejected',
    } as any)
    .eq('id', id);
  if (error) throw error;
};
