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
  certificate_url: string | null;
  proof_url: string | null;
  status: string;
  paid_status: string;
  amount: number | null;
  reference_number: string;
  created_at: string;
  poomsae_1: string | null;
  poomsae_2: string | null;
}

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
  coaching_product_id: string;
  category_product_ids: string[];
  amount: number;
  payment_method: 'paynow' | 'bank_transfer';
  proof_file: File;
  certificate_file?: File | null;
  coaching_name?: string;
  category_names?: string[];
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
  const { error: proofErr } = await withTimeout(
    supabase.storage
      .from('payment-proofs')
      .upload(proofPath, input.proof_file, { upsert: false, contentType: input.proof_file.type }),
    30000,
    'Proof upload',
  );
  if (proofErr) {
    console.error('[/comps] proof upload error', proofErr);
    throw new Error(`Proof upload failed: ${(proofErr as any).message || 'unknown error'}`);
  }
  console.info('[/comps] proof uploaded');

  const { data: proofSigned } = await supabase.storage
    .from('payment-proofs')
    .createSignedUrl(proofPath, 60 * 60 * 24 * 365 * 5);
  const proofUrl = proofSigned?.signedUrl ?? proofPath;

  // Upload certificate (optional)
  let certificateUrl: string | null = null;
  if (input.certificate_file) {
    const certExt = input.certificate_file.name.split('.').pop() || 'jpg';
    const certPath = `public-comps/${input.branch_id}/${ts}_${safeName}_cert.${certExt}`;
    console.info('[/comps] uploading certificate', { path: certPath, size: input.certificate_file.size });
    const { error: cErr } = await withTimeout(
      supabase.storage
        .from('payment-proofs')
        .upload(certPath, input.certificate_file, { upsert: false, contentType: input.certificate_file.type }),
      30000,
      'Certificate upload',
    );
    if (cErr) {
      console.error('[/comps] cert upload error', cErr);
      throw new Error(`Certificate upload failed: ${(cErr as any).message || 'unknown error'}`);
    }
    const { data: certSigned } = await supabase.storage
      .from('payment-proofs')
      .createSignedUrl(certPath, 60 * 60 * 24 * 365 * 5);
    certificateUrl = certSigned?.signedUrl ?? certPath;
    console.info('[/comps] certificate uploaded');
  }

  const row = {
    first_name: fn,
    last_name: ln,
    email: input.email.trim().toLowerCase() || null,
    branch_id: input.branch_id,
    date_of_birth: input.date_of_birth,
    current_belt: input.current_belt || null,
    coaching_product_id: input.coaching_product_id,
    category_product_ids: input.category_product_ids,
    amount: input.amount,
    payment_method: input.payment_method,
    proof_url: proofUrl,
    certificate_url: certificateUrl,
  };

  console.info('[/comps] calling submit_competition_payment RPC');
  const { data, error } = await withTimeout(
    Promise.resolve(supabase.rpc('submit_competition_payment' as any, { _row: row as any })),
    15000,
    'Submission',
  );
  if (error) {
    console.error('[/comps] RPC error', error);
    throw new Error(`Submission failed: ${error.message || 'unknown error'}`);
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
          competitionName: input.coaching_name || 'Competition',
          coachingName: input.coaching_name || '',
          categories: input.category_names || [],
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
