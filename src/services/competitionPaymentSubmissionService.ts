/**
 * Service for the public competition payment module.
 * Used by /comps and the Competitions tab on /grading-list.
 */
import { supabase } from '@/integrations/supabase/client';

export interface CompetitionProduct {
  id: string;
  name: string;
  base_price: number;
  tax_rate: number;
  kind: string | null;
}

export interface PublicCompetitionListRow {
  submission_id: string;
  branch_id: string;
  branch_name: string | null;
  student_name: string;
  current_belt: string | null;
  coaching_paid: boolean;
  category_count: number;
  category_names: string[];
  extra_categories: string[];
  certificate_url: string | null;
  proof_url: string | null;
  status: string;
  paid_status: string;
  amount: number | null;
  reference_number: string;
  created_at: string;
  poomsae_1: string | null;
  poomsae_2: string | null;
  competition_at: string | null;
  reporting_at: string | null;
  court: string | null;
  event_id: string | null;
  event_name: string | null;
  gender: string | null;
  signature_url: string | null;
  indemnity_form_url: string | null;
  passport_url: string | null;
  photo_url: string | null;
  require_grading_card: boolean;
  grading_card_urls: string[];
  date_of_birth: string | null;
}

export interface CompetitionExtraLine {
  label: string;
  amount: number;
  required?: boolean;
  weight_kg?: number | null;
  kind?: 'category' | 'other';
}

export interface CompetitionExtraLinePreset {
  id: string;
  name: string;
  default_amount: number;
  requires_weight: boolean;
  display_order: number;
  is_active: boolean;
}

export const getPublicCompetitionExtraLinePresets = async (): Promise<CompetitionExtraLinePreset[]> => {
  const { data, error } = await supabase.rpc('get_public_competition_extra_line_presets' as any);
  if (error) throw error;
  return ((data || []) as any[]).map((r) => ({
    id: r.id,
    name: r.name,
    default_amount: Number(r.default_amount || 0),
    requires_weight: r.requires_weight === true,
    display_order: Number(r.display_order || 0),
    is_active: r.is_active !== false,
  }));
};

export const adminUpsertCompetitionExtraLinePreset = async (input: {
  id: string | null;
  name: string;
  default_amount: number;
  requires_weight: boolean;
  display_order?: number;
  is_active?: boolean;
}): Promise<string> => {
  const { data, error } = await supabase.rpc('admin_upsert_competition_extra_line_preset' as any, {
    p_id: input.id,
    p_name: input.name,
    p_default_amount: input.default_amount,
    p_requires_weight: input.requires_weight,
    p_display_order: input.display_order ?? 0,
    p_is_active: input.is_active ?? true,
  });
  if (error) throw error;
  return data as string;
};

export interface CompetitionEvent {
  id: string;
  name: string;
  is_active: boolean;
  display_order: number;
  indemnity_clause: string | null;
  require_indemnity_form: boolean;
  require_passport: boolean;
  require_photo: boolean;
  coaching_label: string | null;
  coaching_amount: number;
  coaching_required: boolean;
  extra_lines: CompetitionExtraLine[];
  indemnity_template_url: string | null;
  indemnity_template_name: string | null;
  require_grading_card: boolean;
}

export const getPublicCompetitionEvents = async (): Promise<CompetitionEvent[]> => {
  const { data, error } = await supabase.rpc('get_public_competition_events' as any);
  if (error) throw error;
  return ((data || []) as any[]).map((r) => ({
    ...r,
    coaching_amount: Number(r.coaching_amount || 0),
    coaching_required: r.coaching_required !== false,
    indemnity_template_url: r.indemnity_template_url ?? null,
    indemnity_template_name: r.indemnity_template_name ?? null,
    require_grading_card: r.require_grading_card === true,
    extra_lines: Array.isArray(r.extra_lines)
      ? r.extra_lines.map((l: any) => ({
          label: String(l.label || ''),
          amount: Number(l.amount || 0),
          required: l.required === true,
          kind: l.kind === 'other' ? 'other' : 'category',
        }))
      : [],
  })) as CompetitionEvent[];
};

export const adminUpsertCompetitionEvent = async (input: {
  id: string | null;
  name: string;
  is_active: boolean;
  display_order: number;
  indemnity_clause: string | null;
  require_indemnity_form: boolean;
  require_passport: boolean;
  require_photo: boolean;
  coaching_label: string | null;
  coaching_amount: number;
  coaching_required: boolean;
  extra_lines: CompetitionExtraLine[];
  indemnity_template_url?: string | null;
  indemnity_template_name?: string | null;
  require_grading_card?: boolean;
}): Promise<string> => {
  const { data, error } = await supabase.rpc('admin_upsert_competition_event' as any, {
    p_id: input.id,
    p_name: input.name,
    p_is_active: input.is_active,
    p_display_order: input.display_order,
    p_indemnity_clause: input.indemnity_clause,
    p_require_indemnity_form: input.require_indemnity_form,
    p_require_passport: input.require_passport,
    p_require_photo: input.require_photo,
    p_coaching_label: input.coaching_label,
    p_coaching_amount: input.coaching_amount,
    p_extra_lines: input.extra_lines.map(l => ({
      label: l.label,
      amount: l.amount,
      required: l.required === true,
      kind: l.kind === 'other' ? 'other' : 'category',
    })) as any,
    p_coaching_required: input.coaching_required,
    p_indemnity_template_url: input.indemnity_template_url ?? null,
    p_indemnity_template_name: input.indemnity_template_name ?? null,
    p_require_grading_card: input.require_grading_card === true,
  });
  if (error) throw error;
  return data as string;
};

/**
 * Upload an indemnity template PDF (used by admin) to the payment-proofs bucket.
 * Returns a long-lived signed URL.
 */
export const uploadIndemnityTemplate = async (file: File): Promise<string> => {
  if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
    throw new Error('Indemnity template must be a PDF file');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Indemnity template must be 10 MB or smaller');
  }
  const ts = Date.now();
  const safeName = file.name.replace(/[^a-z0-9._-]/gi, '_');
  const path = `public-comps/templates/${ts}_${safeName}`;
  const { error } = await supabase.storage
    .from('payment-proofs')
    .upload(path, file, { upsert: false, contentType: 'application/pdf' });
  if (error) throw new Error(`Template upload failed: ${error.message || 'unknown error'}`);
  const { data: signed, error: signErr } = await supabase.storage
    .from('payment-proofs')
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  if (signErr || !signed?.signedUrl) {
    throw new Error(`Could not generate download URL: ${signErr?.message || 'unknown error'}`);
  }
  return signed.signedUrl;
};

export const adminDeleteCompetitionEvent = async (id: string): Promise<void> => {
  const { error } = await supabase.rpc('admin_delete_competition_event' as any, { p_id: id });
  if (error) throw error;
};

export const adminSetCompetitionEventActive = async (id: string, active: boolean): Promise<void> => {
  const { error } = await supabase.rpc('admin_set_competition_event_active' as any, {
    p_id: id,
    p_active: active,
  });
  if (error) throw error;
};

export const updateCompetitionPoomsae = async (
  id: string,
  poomsae_1: string | null,
  poomsae_2: string | null,
): Promise<void> => {
  const { error } = await supabase.rpc('admin_update_competition_poomsae' as any, {
    p_id: id,
    p_poomsae_1: poomsae_1,
    p_poomsae_2: poomsae_2,
  });
  if (error) throw error;
};

export const updateCompetitionSchedule = async (
  id: string,
  patch: { competition_at?: string | null; reporting_at?: string | null; court?: string | null },
): Promise<void> => {
  const { error } = await supabase
    .from('competition_payment_submissions' as any)
    .update(patch)
    .eq('id', id);
  if (error) throw error;
};

export interface PendingCompetitionSubmission {
  id: string;
  reference_number: string;
  first_name: string;
  last_name: string;
  student_name: string;
  email: string | null;
  branch_id: string;
  branch_name?: string | null;
  date_of_birth: string | null;
  current_belt: string | null;
  coaching_product_id: string | null;
  category_product_ids: string[];
  category_names?: string[];
  amount: number | null;
  payment_method: string;
  proof_url: string | null;
  certificate_url: string | null;
  status: string;
  matched_student_id: string | null;
  matched_invoice_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface CompetitionStudentMatch {
  student_id: string;
  student_number: string | null;
  full_name: string;
  email: string | null;
  date_of_birth: string | null;
  branch_id: string | null;
  current_belt: string | null;
  score: number;
  reason: string | null;
}

export interface SubmitCompetitionPaymentInput {
  first_name: string;
  last_name: string;
  email: string;
  branch_id: string;
  date_of_birth: string; // yyyy-MM-dd
  current_belt: string;
  amount: number;
  payment_method: 'paynow' | 'bank_transfer';
  proof_file: File;
  certificate_file?: File | null;
  coaching_label: string;
  coaching_amount: number;
  extra_lines: CompetitionExtraLine[];
  event_id: string;
  event_name: string;
  gender?: string | null;
  signature_data_url?: string | null;
  indemnity_form_file?: File | null;
  passport_file?: File | null;
  photo_file?: File | null;
  weight_kg?: number | null;
}

export const getCompetitionProducts = async (): Promise<CompetitionProduct[]> => {
  const { data, error } = await supabase.rpc('get_public_competition_products' as any);
  if (error) throw error;
  return (data || []) as CompetitionProduct[];
};

const withTimeout = <T,>(p: Promise<T>, ms: number, label: string): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s — please check your connection and try again`)),
      ms,
    );
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });

// Retry only on network-class failures, never on validation/business errors.
const isNetworkError = (e: any): boolean => {
  const msg = (e?.message || String(e || '')).toLowerCase();
  if (e instanceof TypeError) return true;
  if (msg.includes('failed to fetch')) return true;
  if (msg.includes('networkerror')) return true;
  if (msg.includes('network request failed')) return true;
  if (msg.includes('load failed')) return true;
  if (msg.includes('timed out')) return true;
  const status = e?.status || e?.statusCode;
  if (typeof status === 'number' && status >= 500) return true;
  return false;
};

const retry = async <T,>(fn: () => Promise<T>, attempts = 3, backoffMs = 800): Promise<T> => {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i === attempts - 1 || !isNetworkError(e)) throw e;
      await new Promise(r => setTimeout(r, backoffMs * (i + 1)));
    }
  }
  throw lastErr;
};

// Wrap an upload so both thrown errors AND {error} returns become labeled exceptions.
const safeUpload = async (
  label: string,
  path: string,
  file: File | Blob,
  contentType: string | undefined,
): Promise<void> => {
  try {
    const { error } = await retry(() => withTimeout(
      supabase.storage.from('payment-proofs').upload(path, file, { upsert: false, contentType }),
      20000,
      `${label} upload`,
    ));
    if (error) throw error;
  } catch (e: any) {
    console.error(`[/comps] ${label} upload error`, e);
    const reason = e?.message || 'unknown error';
    throw new Error(`${label} upload failed: ${reason}`);
  }
};

const safeSignedUrl = async (label: string, path: string): Promise<string> => {
  try {
    const { data, error } = await retry(() => withTimeout(
      Promise.resolve(supabase.storage.from('payment-proofs').createSignedUrl(path, 60 * 60 * 24 * 365 * 5)),
      15000,
      `${label} signed URL`,
    ));
    if (error) throw error;
    return data?.signedUrl ?? path;
  } catch (e: any) {
    console.warn(`[/comps] ${label} signed URL fallback`, e);
    return path;
  }
};

// Convert a data URL to a File without using fetch() — avoids an Android WebView
// failure mode where fetch(dataUrl) rejects with "Failed to fetch" for large PNGs.
const dataUrlToFile = (dataUrl: string, filename: string, fallbackType = 'image/png'): File => {
  const match = /^data:([^;,]+)?(?:;base64)?,(.*)$/i.exec(dataUrl);
  if (!match) throw new Error('Invalid signature data URL');
  const mime = match[1] || fallbackType;
  const isBase64 = /;base64,/i.test(dataUrl);
  const raw = isBase64 ? atob(match[2]) : decodeURIComponent(match[2]);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
};

export const submitCompetitionPayment = async (
  input: SubmitCompetitionPaymentInput,
): Promise<{ id: string; reference_number: string }> => {
  const fn = (input.first_name || '').trim().toUpperCase();
  const ln = (input.last_name || '').trim().toUpperCase();
  const safeName = `${fn}_${ln}`.replace(/[^a-z0-9_]/gi, '_');
  const ts = Date.now();

  // Upload proof
  const proofExt = input.proof_file.name.split('.').pop() || 'jpg';
  const proofPath = `public-comps/${input.branch_id}/${ts}_${safeName}_proof.${proofExt}`;
  console.info('[/comps] uploading proof', { path: proofPath, size: input.proof_file.size, type: input.proof_file.type });
  await safeUpload('Proof', proofPath, input.proof_file, input.proof_file.type);
  console.info('[/comps] proof uploaded');
  const proofUrl = await safeSignedUrl('Proof', proofPath);

  // Upload certificate (optional)
  let certificateUrl: string | null = null;
  if (input.certificate_file) {
    const certExt = input.certificate_file.name.split('.').pop() || 'jpg';
    const certPath = `public-comps/${input.branch_id}/${ts}_${safeName}_cert.${certExt}`;
    console.info('[/comps] uploading certificate', { path: certPath, size: input.certificate_file.size });
    await safeUpload('Certificate', certPath, input.certificate_file, input.certificate_file.type);
    certificateUrl = await safeSignedUrl('Certificate', certPath);
    console.info('[/comps] certificate uploaded');
  }

  // Helper: upload an optional file to payment-proofs and return its signed URL
  const uploadOptional = async (file: File | null | undefined, kind: string): Promise<string | null> => {
    if (!file) return null;
    const ext = file.name.split('.').pop() || 'jpg';
    const p = `public-comps/${input.branch_id}/${ts}_${safeName}_${kind}.${ext}`;
    await safeUpload(kind, p, file, file.type);
    return await safeSignedUrl(kind, p);
  };

  const indemnityFormUrl = await uploadOptional(input.indemnity_form_file, 'indemnity');
  const passportUrl = await uploadOptional(input.passport_file, 'passport');
  const photoUrl = await uploadOptional(input.photo_file, 'photo');

  // Signature: decode data URL to File without fetch() and upload
  let signatureUrl: string | null = null;
  if (input.signature_data_url) {
    let sigFile: File;
    try {
      sigFile = dataUrlToFile(input.signature_data_url, `${safeName}_signature.png`);
    } catch (e: any) {
      console.error('[/comps] signature decode error', e);
      throw new Error(`Signature upload failed: ${e?.message || 'could not decode signature'}`);
    }
    signatureUrl = await uploadOptional(sigFile, 'signature');
  }

  const row = {
    first_name: fn,
    last_name: ln,
    email: input.email.trim().toLowerCase() || null,
    branch_id: input.branch_id,
    date_of_birth: input.date_of_birth,
    current_belt: input.current_belt || null,
    amount: input.amount,
    payment_method: input.payment_method,
    proof_url: proofUrl,
    certificate_url: certificateUrl,
    event_id: input.event_id,
    gender: input.gender ?? null,
    signature_url: signatureUrl,
    indemnity_form_url: indemnityFormUrl,
    passport_url: passportUrl,
    photo_url: photoUrl,
    coaching_label: input.coaching_label,
    coaching_amount: input.coaching_amount,
    extra_lines: input.extra_lines,
    weight_kg: input.weight_kg ?? null,
  };

  console.info('[/comps] calling submit_competition_payment RPC');
  let data: any;
  try {
    const res = await retry(() => withTimeout(
      Promise.resolve(supabase.rpc('submit_competition_payment' as any, { _row: row as any })),
      15000,
      'Submission',
    ));
    if ((res as any).error) throw (res as any).error;
    data = (res as any).data;
  } catch (e: any) {
    console.error('[/comps] RPC error', e);
    throw new Error(`Submission failed: ${e?.message || 'unknown error'}`);
  }
  const inserted = Array.isArray(data) ? data[0] : data;
  if (!inserted) {
    throw new Error('Submission failed: no record returned');
  }
  console.info('[/comps] submitted', inserted);

  const recipient = (input.email || '').trim().toLowerCase();
  if (recipient) {
    void supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'competition-confirmation',
        recipientEmail: recipient,
        idempotencyKey: `comp-confirm-${inserted.id}`,
        templateData: {
          firstName: fn,
          fullName: `${fn} ${ln}`.trim(),
          competitionName: input.event_name,
          coachingName: input.coaching_label,
          categories: input.extra_lines.filter(l => l.kind !== 'other').map(l => l.label).filter(Boolean),
          amount: input.amount,
          referenceNumber: inserted.reference_number,
        },
      },
    });
  }

  return inserted as { id: string; reference_number: string };
};

export const getPublicCompetitionList = async (
  branchId?: string | null,
): Promise<PublicCompetitionListRow[]> => {
  const { data, error } = await supabase.rpc('get_public_competition_list' as any, {
    p_branch_id: branchId ?? null,
  });
  if (error) throw error;
  return (data || []) as PublicCompetitionListRow[];
};

export const getPendingCompetitionSubmissions = async (
  branchId?: string,
): Promise<PendingCompetitionSubmission[]> => {
  let q = supabase
    .from('competition_payment_submissions' as any)
    .select('*')
    .in('status', ['pending_verification'])
    .is('matched_invoice_id', null)
    .order('created_at', { ascending: false });
  if (branchId) q = q.eq('branch_id', branchId);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data || []) as any[];
  if (rows.length === 0) return [];

  const branchIds = Array.from(new Set(rows.map(r => r.branch_id).filter(Boolean)));
  const productIds = Array.from(
    new Set(
      rows.flatMap(r => [r.coaching_product_id, ...(r.category_product_ids || [])]).filter(Boolean),
    ),
  );

  const [branchesRes, productsRes] = await Promise.all([
    branchIds.length
      ? supabase.from('branches').select('id, name').in('id', branchIds)
      : Promise.resolve({ data: [] as any[] }),
    productIds.length
      ? supabase.from('products').select('id, name').in('id', productIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const branchMap = new Map<string, any>((branchesRes.data || []).map((b: any) => [b.id, b]));
  const productMap = new Map<string, any>((productsRes.data || []).map((p: any) => [p.id, p]));

  return rows.map((r: any) => ({
    ...r,
    student_name: `${(r.first_name || '').trim()} ${(r.last_name || '').trim()}`.trim(),
    branch_name: branchMap.get(r.branch_id)?.name ?? null,
    category_names: (r.category_product_ids || [])
      .map((id: string) => productMap.get(id)?.name)
      .filter(Boolean),
  }));
};

export const getPendingCompetitionSubmissionsCount = async (
  branchId?: string,
): Promise<number> => {
  let q = supabase
    .from('competition_payment_submissions' as any)
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending_verification')
    .is('matched_invoice_id', null);
  if (branchId) q = q.eq('branch_id', branchId);
  const { count, error } = await q;
  if (error) return 0;
  return count || 0;
};

export const findCompetitionSubmissionStudentMatches = async (
  submissionId: string,
): Promise<CompetitionStudentMatch[]> => {
  const { data, error } = await supabase.rpc(
    'find_competition_submission_student_matches' as any,
    { p_id: submissionId },
  );
  if (error) throw error;
  return (data || []) as CompetitionStudentMatch[];
};

export const matchCompetitionSubmission = async (
  submissionId: string,
  studentId: string,
): Promise<void> => {
  const { error } = await supabase.rpc('admin_match_competition_submission' as any, {
    p_id: submissionId,
    p_student_id: studentId,
  });
  if (error) throw error;
};

export const importCompetitionSubmission = async (
  submissionId: string,
  verifiedBy: string,
): Promise<string> => {
  const { data, error } = await supabase.rpc('admin_import_competition_submission' as any, {
    p_id: submissionId,
    p_verified_by: verifiedBy,
  });
  if (error) throw error;
  return data as string;
};

export const verifyCompetitionSubmission = async (submissionId: string, verifiedBy: string): Promise<void> => {
  const { error } = await supabase.rpc('admin_verify_competition_submission' as any, {
    p_id: submissionId,
    p_verified_by: verifiedBy,
  });
  if (error) throw error;
};

export const rejectCompetitionSubmission = async (
  submissionId: string,
  reason: string,
  reviewedBy: string,
): Promise<void> => {
  const { error } = await supabase.rpc('admin_reject_competition_submission' as any, {
    p_id: submissionId,
    p_reason: reason,
    p_reviewed_by: reviewedBy,
  });
  if (error) throw error;
};

export const updateCompetitionSubmissionCategories = async (
  submissionId: string,
  categoryIds: string[],
): Promise<void> => {
  const { error } = await supabase.rpc(
    'admin_update_competition_submission_categories' as any,
    { p_id: submissionId, p_category_ids: categoryIds },
  );
  if (error) throw error;
};

export const updateCompetitionSubmissionDetails = async (
  id: string,
  patch: {
    first_name?: string;
    last_name?: string;
    email?: string | null;
    date_of_birth?: string | null;
    current_belt?: string | null;
    branch_id?: string;
  },
): Promise<void> => {
  const clean: any = { ...patch };
  if (typeof clean.first_name === 'string') clean.first_name = clean.first_name.trim().toUpperCase();
  if (typeof clean.last_name === 'string') clean.last_name = clean.last_name.trim().toUpperCase();
  if (typeof clean.email === 'string') clean.email = clean.email.trim().toLowerCase() || null;
  if (clean.current_belt === '') clean.current_belt = null;
  const { error } = await supabase
    .from('competition_payment_submissions' as any)
    .update(clean)
    .eq('id', id);
  if (error) throw error;
};

export const adminDeleteCompetitionSubmission = async (id: string) => {
  const { error } = await supabase.rpc('admin_delete_competition_submission' as any, { p_id: id });
  if (error) throw error;
};

export const getCompetitionSubmissionDeleteContext = async (id: string) => {
  const { data, error } = await supabase.rpc('admin_competition_submission_delete_context' as any, { p_id: id });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    student_matched: !!row?.student_matched,
    student_name: (row?.student_name ?? null) as string | null,
    invoice_number: (row?.invoice_number ?? null) as string | null,
  };
};

/**
 * Fetch the full submission row (all columns) for the admin edit dialog
 * opened from the Competitions tab on /grading-list.
 */
export const getCompetitionSubmissionForEdit = async (id: string): Promise<any> => {
  const { data, error } = await supabase
    .from('competition_payment_submissions' as any)
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
};

/**
 * Patch arbitrary editable fields on a competition submission row.
 * Used by the admin edit dialog.
 */
export const adminPatchCompetitionSubmission = async (
  id: string,
  patch: Record<string, any>,
): Promise<void> => {
  const clean: any = { ...patch };
  if (typeof clean.first_name === 'string') clean.first_name = clean.first_name.trim().toUpperCase();
  if (typeof clean.last_name === 'string') clean.last_name = clean.last_name.trim().toUpperCase();
  if (typeof clean.email === 'string') clean.email = clean.email.trim().toLowerCase() || null;
  if (clean.current_belt === '') clean.current_belt = null;
  if (clean.gender === '') clean.gender = null;
  const { error } = await supabase
    .from('competition_payment_submissions' as any)
    .update(clean)
    .eq('id', id);
  if (error) throw error;
};

/**
 * Replace an uploaded file (proof / certificate / signature / indemnity /
 * passport / photo) and patch the matching *_url column on the submission row.
 */
export const adminReplaceCompetitionSubmissionFile = async (
  id: string,
  kind: 'proof' | 'certificate' | 'signature' | 'indemnity' | 'passport' | 'photo',
  file: File,
  branchId: string,
): Promise<string> => {
  const ext = file.name.split('.').pop() || 'jpg';
  const safe = `edit_${Date.now()}_${kind}.${ext}`;
  const path = `public-comps/${branchId}/${safe}`;
  const { error: upErr } = await supabase.storage
    .from('payment-proofs')
    .upload(path, file, { upsert: false, contentType: file.type });
  if (upErr) throw new Error(`${kind} upload failed: ${upErr.message}`);
  const { data: signed } = await supabase.storage
    .from('payment-proofs')
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  const url = signed?.signedUrl ?? path;
  const colMap: Record<string, string> = {
    proof: 'proof_url',
    certificate: 'certificate_url',
    signature: 'signature_url',
    indemnity: 'indemnity_form_url',
    passport: 'passport_url',
    photo: 'photo_url',
  };
  const { error: updErr } = await supabase
    .from('competition_payment_submissions' as any)
    .update({ [colMap[kind]]: url })
    .eq('id', id);
  if (updErr) throw updErr;
  return url;
};

/**
 * Admin-only: upload one or more grading card files (images or PDF) for a competition
 * submission. Appends signed URLs to `grading_card_urls`.
 */
export const adminUploadCompetitionGradingCards = async (
  submissionId: string,
  files: File[],
): Promise<string[]> => {
  if (!files || files.length === 0) return [];
  const ts = Date.now();
  const newUrls: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
    const path = `competition/${submissionId}/grading-card-${ts}-${i}.${ext}`;
    await safeUpload('Grading card', path, file, file.type);
    const url = await safeSignedUrl('Grading card', path);
    newUrls.push(url);
  }
  // Persist via SECURITY DEFINER RPC — the page runs anonymously (client-side
  // password gate), so a direct table UPDATE would be silently blocked by RLS.
  const { data, error } = await supabase.rpc(
    'admin_append_competition_grading_cards' as any,
    { p_id: submissionId, p_new_urls: newUrls },
  );
  if (error) throw error;
  const merged = (data as string[] | null) || [];
  if (merged.length === 0) {
    throw new Error('Grading card save failed — submission not found');
  }
  return merged;
};

/**
 * Admin-only: overwrite the grading_card_urls array (used to remove entries).
 */
export const adminSetCompetitionGradingCards = async (
  submissionId: string,
  urls: string[],
): Promise<void> => {
  const { error } = await supabase.rpc(
    'admin_set_competition_grading_cards' as any,
    { p_id: submissionId, p_urls: urls },
  );
  if (error) throw error;
};

/**
 * Admin-only: replace a single grading card at `index` with a newly uploaded file.
 * Returns the new signed URL.
 */
export const adminReplaceCompetitionGradingCardAt = async (
  submissionId: string,
  index: number,
  file: File,
): Promise<string> => {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const path = `competition/${submissionId}/grading-card-${Date.now()}-r${index}.${ext}`;
  await safeUpload('Grading card', path, file, file.type);
  const newUrl = await safeSignedUrl('Grading card', path);
  const { data, error } = await supabase.rpc(
    'admin_replace_competition_grading_card_at' as any,
    { p_id: submissionId, p_index: index, p_new_url: newUrl },
  );
  if (error) throw error;
  const updated = (data as string[] | null) || [];
  if (updated.length === 0) {
    throw new Error('Grading card replace failed — submission or index invalid');
  }
  return newUrl;
};




