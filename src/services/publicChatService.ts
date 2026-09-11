/**
 * Service for the public /hello chat workflow.
 */
import { supabase } from '@/integrations/supabase/client';

export interface ChatSessionInput {
  first_name: string;
  last_name: string;
  date_of_birth: string | null; // yyyy-MM-dd or null
  branch_id: string;
  gender?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface MatchedStudent {
  id: string;
  first_name: string;
  last_name: string;
  current_belt: string | null;
  status: string;
  gender?: string | null;
}

export interface ChatProduct {
  product_id: string;
  product_name: string;
  base_price: number;
  branch_price: number;
  requires_size: boolean;
  available_sizes: string[] | null;
  available_variants: any;
  metadata?: Record<string, any> | null;
  is_term_based?: boolean;
}

export interface ChatTerm {
  term_id: string;
  term_name: string;
  start_date: string;
  end_date: string;
  total_weeks: number;
  is_paid: boolean;
}

export interface ChatFeePreference {
  product_id: string;
  product_name: string;
  payment_plan: 'four_weeks' | 'term';
}

export const getChatLatestFeePreference = async (
  session_id: string,
  student_id: string,
  branch_id: string,
): Promise<ChatFeePreference | null> => {
  const { data, error } = await supabase.rpc('get_public_chat_latest_fee_preference' as any, {
    p_session_id: session_id,
    p_student_id: student_id,
    p_branch_id: branch_id,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || !['four_weeks', 'term'].includes(row.payment_plan)) return null;
  return row as ChatFeePreference;
};

export const getChatTermsForStudent = async (
  session_id: string,
  student_id: string,
  branch_id: string,
): Promise<ChatTerm[]> => {
  const { data, error } = await supabase.rpc('get_public_chat_terms_for_student' as any, {
    p_session_id: session_id,
    p_student_id: student_id,
    p_branch_id: branch_id,
  });
  if (error) throw error;
  return (data || []) as ChatTerm[];
};

export const createChatSession = async (input: ChatSessionInput): Promise<string> => {
  const { data, error } = await supabase.rpc('create_public_chat_session' as any, {
    p_first_name: input.first_name.trim().toUpperCase(),
    p_last_name: input.last_name.trim().toUpperCase(),
    p_date_of_birth: input.date_of_birth || null,
    p_branch_id: input.branch_id,
    p_gender: input.gender ?? null,
    p_email: input.email?.trim().toLowerCase() || null,
    p_phone: input.phone?.trim() || null,
  });
  if (error) throw error;
  return data as unknown as string;
};

export const updateSessionMatchAndOutcome = async (
  sessionId: string,
  matchedStudentId: string | null,
  outcome: string | null,
) => {
  // Visitors are anonymous, so the write goes through a SECURITY DEFINER RPC.
  const { error } = await supabase.rpc('set_public_chat_session_match' as any, {
    p_session_id: sessionId,
    p_matched_student_id: matchedStudentId,
    p_outcome: outcome,
  });
  if (error) throw error;
};

export const logChatEvent = async (sessionId: string, step: string, payload?: any) => {
  try {
    await supabase.from('public_chat_events').insert({
      session_id: sessionId,
      step,
      payload: payload ?? null,
    });
  } catch (e) {
    // Best effort
    console.warn('logChatEvent failed', e);
  }
};

export const matchStudentByIdentity = async (
  first_name: string,
  last_name: string,
  date_of_birth: string | null,
  branch_id: string,
  extras?: { gender?: string | null; email?: string | null; phone?: string | null },
): Promise<MatchedStudent | null> => {
  const { data, error } = await supabase.rpc('match_student_by_identity' as any, {
    p_first_name: first_name,
    p_last_name: last_name,
    p_dob: date_of_birth,
    p_branch_id: branch_id,
    p_gender: extras?.gender ?? null,
    p_email: extras?.email ?? null,
    p_phone: extras?.phone ?? null,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as MatchedStudent) ?? null;
};

export const getStudentCompletedGradingStages = async (
  studentId: string,
): Promise<number[]> => {
  const { data, error } = await supabase.rpc(
    'get_student_completed_grading_stages' as any,
    { p_student_id: studentId },
  );
  if (error) {
    console.warn('get_student_completed_grading_stages failed', error);
    return [];
  }
  return ((data || []) as Array<{ stage_number: number }>)
    .map(r => Number(r.stage_number))
    .filter(n => Number.isFinite(n));
};

export const getChatProducts = async (
  branch_id: string,
  category_id: string,
  session_id?: string | null,
  student_id?: string | null,
): Promise<ChatProduct[]> => {
  if (session_id && student_id) {
    const { data, error } = await supabase.rpc('get_public_chat_products_for_student' as any, {
      p_session_id: session_id,
      p_student_id: student_id,
      p_branch_id: branch_id,
      p_category_id: category_id,
    });
    if (error) throw error;
    return (data || []) as ChatProduct[];
  }

  const { data, error } = await supabase.rpc('get_public_chat_products' as any, {
    p_branch_id: branch_id,
    p_category_id: category_id,
  });
  if (error) throw error;
  return (data || []) as ChatProduct[];
};

export interface SubmitCallbackInput {
  session_id: string;
  branch_id: string | null;
  branch_name: string | null;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  message: string;
  type?: 'general_callback' | 'trial_lead' | 'lesson_schedule_request' | 'no_match_request';
  preferred_time?: string | null;
  matched_student_id?: string | null;
  /** Override the notification recipient (defaults to hello@gaonhaetaekwondo.com) */
  notify_email?: string;
  /** When set, the email subject becomes "<prefix> - <Name>" */
  email_subject_prefix?: string;
}

export interface LessonChangeItem {
  date: string; // yyyy-MM-dd
  start_time: string;
  end_time: string;
  class_type?: string | null;
  timetable_id?: string | null;
  scheduled_class_id?: string | null;
}

export interface SubmitLessonRequestInput {
  session_id: string;
  branch_id: string;
  branch_name: string | null;
  student_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  cancellations: LessonChangeItem[];
  new_bookings: LessonChangeItem[];
  notes: string | null;
}

const fmtDM = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

export const submitLessonRequest = async (input: SubmitLessonRequestInput): Promise<string> => {
  const isReschedule = input.cancellations.length > 0;
  const head = isReschedule
    ? 'Reschedule lesson request from chat:'
    : 'Schedule new lesson request from chat:';
  const lines: (string | null)[] = [
    head,
    `Student: ${input.first_name} ${input.last_name} (id: ${input.student_id})`,
    `Branch: ${input.branch_name ?? ''}`,
  ];
  if (input.cancellations.length > 0) {
    lines.push('Cancel:');
    input.cancellations.forEach(c => {
      lines.push(`  - ${fmtDM(c.date)} ${c.start_time.slice(0,5)}–${c.end_time.slice(0,5)}${c.class_type ? ` (${c.class_type})` : ''} [id:${c.scheduled_class_id ?? ''}]`);
    });
  }
  if (input.new_bookings.length > 0) {
    lines.push('Book:');
    input.new_bookings.forEach(b => {
      lines.push(`  - ${fmtDM(b.date)} ${b.start_time.slice(0,5)}–${b.end_time.slice(0,5)}${b.class_type ? ` (${b.class_type})` : ''} [timetable:${b.timetable_id ?? ''}]`);
    });
  }
  if (input.notes) lines.push(`Notes: ${input.notes}`);

  const id = await submitCallback({
    session_id: input.session_id,
    branch_id: input.branch_id,
    branch_name: input.branch_name,
    first_name: input.first_name,
    last_name: input.last_name,
    date_of_birth: input.date_of_birth,
    contact_phone: input.contact_phone,
    contact_email: input.contact_email,
    message: lines.filter(Boolean).join('\n'),
    type: 'lesson_schedule_request',
    preferred_time: null,
    // Link the request to the known student so branch approvers can act on it.
    matched_student_id: input.student_id,
  });
  return id;
};

// ---------- Calendar data RPCs ----------

export interface StudentTermContext {
  term_id: string;
  term_name: string;
  start_date: string;
  end_date: string;
  enrollment_id: string;
  class_type: string | null;
  sessions_total: number;
  sessions_remaining: number;
  active_scheduled_count: number;
  unbooked_count: number;
  class_type_scopes: string[] | null;
  age: number | null;
  current_belt: string | null;
  branch_id: string;
  country: string | null;
  attended_this_month: number;
  missed_this_month: number;
  is_unlimited: boolean;
}

export const getStudentTermContext = async (sessionId: string, studentId: string, termId?: string | null): Promise<StudentTermContext | null> => {
  const args: any = { p_session_id: sessionId, p_student_id: studentId };
  if (termId) args.p_term_id = termId;
  const { data, error } = await supabase.rpc('get_public_student_term_context' as any, args);
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as StudentTermContext) ?? null;
};

export interface InvoicedTerm {
  term_id: string;
  term_name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  is_unlimited: boolean;
  sessions_total: number;
  sessions_remaining: number;
}

export const getStudentInvoicedTerms = async (sessionId: string, studentId: string): Promise<InvoicedTerm[]> => {
  const { data, error } = await supabase.rpc('get_public_student_invoiced_terms' as any, {
    p_session_id: sessionId, p_student_id: studentId,
  });
  if (error) throw error;
  return (data || []) as InvoicedTerm[];
};

export interface ChatInvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  metadata: { term_id?: string; grading_slot_id?: string } | null;
  term_info?: string | null;
  grading_info?: string | null;
}

export interface ChatInvoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string | null;
  status: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  notes: string | null;
  items: ChatInvoiceItem[];
}

export interface ChatInvoicesResult {
  student: { name: string; address: string | null; phone: string | null; email: string | null } | null;
  template: { letterhead_url?: string; paynow_qr_url?: string; country?: string; default_notes?: string; footer_text?: string } | null;
  invoices: ChatInvoice[];
}

export const getChatInvoices = async (sessionId: string, studentId: string): Promise<ChatInvoicesResult> => {
  const { data, error } = await supabase.rpc('get_public_chat_invoices' as any, {
    p_session_id: sessionId, p_student_id: studentId,
  });
  if (error) throw error;
  const row = (data || {}) as Partial<ChatInvoicesResult>;
  return { student: row.student ?? null, template: row.template ?? null, invoices: row.invoices ?? [] };
};

export interface TimetableSlot {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  class_type: string;
  max_capacity: number;
}

export const getBranchTimetableSlots = async (sessionId: string, studentId: string): Promise<TimetableSlot[]> => {
  const { data, error } = await supabase.rpc('get_public_branch_timetable_slots' as any, {
    p_session_id: sessionId, p_student_id: studentId,
  });
  if (error) throw error;
  return (data || []) as TimetableSlot[];
};

export interface StudentBooking {
  id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  timetable_id: string | null;
  status: string;
  class_type: string | null;
  attendance_status: string | null;
}

export const getStudentTermBookings = async (sessionId: string, studentId: string, termId?: string | null): Promise<StudentBooking[]> => {
  const args: any = { p_session_id: sessionId, p_student_id: studentId };
  if (termId) args.p_term_id = termId;
  const { data, error } = await supabase.rpc('get_public_student_term_bookings' as any, args);
  if (error) throw error;
  return (data || []) as StudentBooking[];
};

export interface SlotCapacityRow {
  scheduled_date: string;
  timetable_id: string;
  booked_count: number;
}

export const getTermSlotCapacities = async (sessionId: string, studentId: string, timetableIds: string[], termId?: string | null): Promise<SlotCapacityRow[]> => {
  if (timetableIds.length === 0) return [];
  const args: any = { p_session_id: sessionId, p_student_id: studentId, p_timetable_ids: timetableIds };
  if (termId) args.p_term_id = termId;
  const { data, error } = await supabase.rpc('get_public_term_slot_capacities' as any, args);
  if (error) throw error;
  return (data || []) as SlotCapacityRow[];
};

export const getBranchHolidays = async (sessionId: string, studentId: string, from: string, to: string): Promise<string[]> => {
  const { data, error } = await supabase.rpc('get_public_branch_holidays' as any, {
    p_session_id: sessionId, p_student_id: studentId, p_from: from, p_to: to,
  });
  if (error) return [];
  return ((data || []) as Array<{ holiday_date: string }>).map(r => r.holiday_date);
};


export const submitCallback = async (input: SubmitCallbackInput): Promise<string> => {
  const name = `${input.first_name} ${input.last_name}`.trim();
  const { data, error } = await supabase.rpc('create_public_chat_callback' as any, {
    p_session_id: input.session_id,
    p_branch_id: input.branch_id,
    p_name: name,
    p_type: input.type ?? 'general_callback',
    p_message: input.message,
    p_contact_phone: input.contact_phone,
    p_contact_email: input.contact_email,
    p_preferred_time: input.preferred_time ?? null,
    p_first_name: input.first_name || null,
    p_last_name: input.last_name || null,
    p_date_of_birth: input.date_of_birth || null,
    p_gender: null,
    p_matched_student_id: input.matched_student_id ?? null,
    p_outcome: input.type === 'trial_lead' ? 'trial_lead' : 'callback',
  });
  if (error) throw error;
  const callbackId = data as unknown as string;


  await logChatEvent(input.session_id, 'callback_submitted', { callback_id: callbackId, type: input.type });

  // Fire-and-forget email notification — never block the user UX
  try {
    const submittedAt = new Date().toLocaleString('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
    await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'hello-callback-request',
        recipientEmail: 'hello@gaonhaetaekwondo.com',
        idempotencyKey: `hello-callback-${callbackId}`,
        templateData: {
          firstName: input.first_name,
          lastName: input.last_name,
          dateOfBirth: input.date_of_birth ?? '',
          branchName: input.branch_name ?? '',
          phone: input.contact_phone ?? '',
          email: input.contact_email ?? '',
          message: input.message,
          submittedAt,
        },
      },
    });
    await supabase.rpc('mark_public_chat_callback_email_sent' as any, { p_id: callbackId });
    await logChatEvent(input.session_id, 'callback_email_sent', { callback_id: callbackId });
  } catch (err) {
    console.warn('Callback email send failed (non-blocking)', err);
  }

  return callbackId;
};

export interface SubmitChatPaymentInput {
  session_id: string;
  branch_id: string;
  category: string;
  items: {
    product_id: string;
    product_name: string;
    size?: string | null;
    variant?: string | null;
    size_variant?: string | null;
    selected_options?: Record<string, string | null>;
    grading_slot_id?: string | null;
    term_id?: string | null;
    term_name?: string | null;
    qty: number;
    unit_price: number;
    /** 'four_weeks' | 'term' for school fee items */
    payment_plan?: string | null;
    /** Term-plan discounts (early payment + sibling) applied to this line */
    discount?: number;
  }[];
  amount: number;
  payment_method: 'paynow' | 'bank_transfer';
  matched_student_id: string;
  proof_file: File;
  contact_first_name: string;
  contact_last_name: string;
  /** Lessons the student planned before paying (school fees only) */
  planned_schedule?: {
    term_id: string;
    product_id: string;
    slots: PlannedSlot[];
  } | null;
}

export interface PlannedSlot {
  date: string;
  start_time: string;
  end_time: string;
  timetable_id: string | null;
}


export const submitChatPayment = async (input: SubmitChatPaymentInput): Promise<string> => {
  const ext = input.proof_file.name.split('.').pop() || 'jpg';
  const ts = Date.now();
  const fn = (input.contact_first_name || '').trim().toUpperCase();
  const ln = (input.contact_last_name || '').trim().toUpperCase();
  const safeName = `${fn}_${ln}`.replace(/[^A-Z0-9_]/gi, '_');
  const path = `public-hello/${input.branch_id}/${ts}_${safeName}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('payment-proofs')
    .upload(path, input.proof_file, { upsert: false, contentType: input.proof_file.type });
  if (uploadError) throw uploadError;

  const { data: signed } = await supabase.storage
    .from('payment-proofs')
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  const proofUrl = signed?.signedUrl ?? path;

  const { data, error } = await supabase.rpc('submit_public_chat_invoice' as any, {
    p_session_id: input.session_id,
    p_student_id: input.matched_student_id,
    p_branch_id: input.branch_id,
    p_category: input.category,
    p_items: input.items as any,
    p_amount: input.amount,
    p_payment_method: input.payment_method,
    p_proof_url: proofUrl,
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  await logChatEvent(input.session_id, 'payment_submitted', { invoice_id: row?.invoice_id });

  const planned = input.planned_schedule;
  if (planned && planned.slots.length > 0 && (row as any)?.invoice_id) {
    try {
      const { error: schedErr } = await supabase.rpc('attach_public_chat_planned_schedule' as any, {
        p_session_id: input.session_id,
        p_student_id: input.matched_student_id,
        p_branch_id: input.branch_id,
        p_invoice_id: (row as any).invoice_id,
        p_term_id: planned.term_id,
        p_product_id: planned.product_id,
        p_slots: planned.slots as any,
      });
      if (schedErr) throw schedErr;
      await logChatEvent(input.session_id, 'planned_schedule_saved', {
        invoice_id: (row as any).invoice_id,
        count: planned.slots.length,
      });
    } catch (err) {
      console.warn('Planned schedule could not be saved', err);
    }
  }

  return (row as any)?.invoice_number as string;

};

export interface SubmitInlineRegistrationInput {
  session_id: string;
  branch_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string | null;
  email: string | null;
  phone: string | null;
  notes?: string | null;
}

/**
 * Inline registration creates a chat callback row (type=registration) for staff to action,
 * since the formal /register form has many required fields (signature, etc) not gathered in chat.
 */
export const submitInlineRegistration = async (input: SubmitInlineRegistrationInput): Promise<string> => {
  const msg = [
    `Inline registration request from chat:`,
    `Name: ${input.first_name} ${input.last_name}`,
    `DOB: ${input.date_of_birth}`,
    input.gender ? `Gender: ${input.gender}` : null,
    input.email ? `Email: ${input.email}` : null,
    input.phone ? `Phone: ${input.phone}` : null,
    input.notes ? `Notes: ${input.notes}` : null,
  ].filter(Boolean).join('\n');

  const { data, error } = await supabase.rpc('create_public_chat_callback' as any, {
    p_session_id: input.session_id,
    p_branch_id: input.branch_id,
    p_name: `${input.first_name} ${input.last_name}`.trim(),
    p_type: 'registration_request',
    p_message: msg,
    p_contact_phone: input.phone,
    p_contact_email: input.email,
    p_preferred_time: null,
    p_first_name: input.first_name || null,
    p_last_name: input.last_name || null,
    p_date_of_birth: input.date_of_birth || null,
    p_gender: input.gender || null,
    p_matched_student_id: null,
    p_outcome: 'register',
  });
  if (error) throw error;
  const newId = data as unknown as string;
  await logChatEvent(input.session_id, 'registration_submitted', { id: newId });
  return newId;
};
