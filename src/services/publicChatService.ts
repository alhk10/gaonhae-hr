/**
 * Service for the public /hello chat workflow.
 */
import { supabase } from '@/integrations/supabase/client';

export interface ChatSessionInput {
  first_name: string;
  last_name: string;
  date_of_birth: string; // yyyy-MM-dd
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
}

export interface ChatProduct {
  product_id: string;
  product_name: string;
  base_price: number;
  branch_price: number;
  requires_size: boolean;
  available_sizes: string[] | null;
  available_variants: any;
}

export const createChatSession = async (input: ChatSessionInput): Promise<string> => {
  const { data, error } = await supabase
    .from('public_chat_sessions')
    .insert({
      first_name: input.first_name.trim().toUpperCase(),
      last_name: input.last_name.trim().toUpperCase(),
      date_of_birth: input.date_of_birth,
      branch_id: input.branch_id,
      gender: input.gender ?? null,
      email: input.email?.trim().toLowerCase() || null,
      phone: input.phone?.trim() || null,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data!.id as string;
};

export const updateSessionMatchAndOutcome = async (
  sessionId: string,
  matchedStudentId: string | null,
  outcome: string | null,
) => {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (matchedStudentId !== undefined) patch.matched_student_id = matchedStudentId;
  if (outcome !== undefined) patch.outcome = outcome;
  const { error } = await supabase
    .from('public_chat_sessions')
    .update(patch)
    .eq('id', sessionId);
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
  date_of_birth: string,
  branch_id: string,
): Promise<MatchedStudent | null> => {
  const { data, error } = await supabase.rpc('match_student_by_identity' as any, {
    p_first_name: first_name,
    p_last_name: last_name,
    p_dob: date_of_birth,
    p_branch_id: branch_id,
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
): Promise<ChatProduct[]> => {
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
  type?: 'general_callback' | 'trial_lead';
  preferred_time?: string | null;
}

export const submitCallback = async (input: SubmitCallbackInput): Promise<string> => {
  const name = `${input.first_name} ${input.last_name}`.trim();
  const { data, error } = await supabase
    .from('public_chat_callback_requests')
    .insert({
      session_id: input.session_id,
      branch_id: input.branch_id,
      name,
      contact_phone: input.contact_phone,
      contact_email: input.contact_email,
      type: input.type ?? 'general_callback',
      message: input.message,
      preferred_time: input.preferred_time ?? null,
    })
    .select('id')
    .single();
  if (error) throw error;
  const callbackId = data!.id as string;

  // Update session outcome
  await updateSessionMatchAndOutcome(
    input.session_id,
    undefined as any,
    input.type === 'trial_lead' ? 'trial_lead' : 'callback',
  );

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
    await supabase
      .from('public_chat_callback_requests')
      .update({ email_sent_at: new Date().toISOString() })
      .eq('id', callbackId);
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
  items: { product_id: string; product_name: string; size?: string | null; variant?: string | null; qty: number; unit_price: number }[];
  amount: number;
  payment_method: 'paynow' | 'bank_transfer';
  matched_student_id: string | null;
  proof_file: File;
  contact_first_name: string;
  contact_last_name: string;
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

  const { data, error } = await supabase
    .from('public_chat_payment_submissions')
    .insert({
      session_id: input.session_id,
      branch_id: input.branch_id,
      category: input.category,
      items: input.items as any,
      amount: input.amount,
      payment_method: input.payment_method,
      proof_url: proofUrl,
      matched_student_id: input.matched_student_id,
    })
    .select('id, reference_number')
    .single();
  if (error) throw error;

  await updateSessionMatchAndOutcome(input.session_id, undefined as any, 'payment');
  await logChatEvent(input.session_id, 'payment_submitted', { submission_id: data!.id });

  return (data as any).reference_number as string;
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

  const { data, error } = await supabase
    .from('public_chat_callback_requests')
    .insert({
      session_id: input.session_id,
      branch_id: input.branch_id,
      name: `${input.first_name} ${input.last_name}`.trim(),
      contact_phone: input.phone,
      contact_email: input.email,
      type: 'registration_request',
      message: msg,
    })
    .select('id')
    .single();
  if (error) throw error;
  await updateSessionMatchAndOutcome(input.session_id, undefined as any, 'register');
  await logChatEvent(input.session_id, 'registration_submitted', { id: data!.id });
  return data!.id as string;
};
