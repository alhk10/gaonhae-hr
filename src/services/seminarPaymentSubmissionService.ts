/**
 * Service for the public seminar payment module.
 * Used by /seminars and the Seminars tab on /grading-list.
 */
import { supabase } from '@/integrations/supabase/client';

export type SeminarPackageCode = 'single_13' | 'single_20' | 'combo';

export interface SeminarPackageOption {
  code: SeminarPackageCode;
  label: string;
  amount: number;
  session_dates: string[]; // ISO yyyy-MM-dd
}

export const SEMINAR_OPTIONS: SeminarPackageOption[] = [
  {
    code: 'single_13',
    label: 'Sat, 13 Jun 2026 · 4:00 PM · Bukit Merah Branch',
    amount: 81.75,
    session_dates: ['2026-06-13'],
  },
  {
    code: 'single_20',
    label: 'Sat, 20 Jun 2026 · 4:00 PM · Bukit Merah Branch',
    amount: 81.75,
    session_dates: ['2026-06-20'],
  },
  {
    code: 'combo',
    label: 'Sat, 13 & 20 Jun 2026 · 4:00 PM · Bukit Merah Branch (Combo)',
    amount: 130.80,
    session_dates: ['2026-06-13', '2026-06-20'],
  },
];

export interface PublicSeminarListRow {
  submission_id: string;
  branch_id: string;
  branch_name: string | null;
  student_name: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: string | null;
  current_belt: string | null;
  package_code: SeminarPackageCode;
  package_label: string;
  session_dates: string[];
  amount: number;
  proof_url: string | null;
  status: string;
  paid_status: 'paid' | 'pending' | 'rejected';
  collected: boolean;
  collected_at: string | null;
  matched_student_id: string | null;
  matched_invoice_id: string | null;
  invoice_number: string | null;
  reference_number: string;
  email: string | null;
  created_at: string;
}

export interface SeminarStudentMatch {
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

export interface SubmitSeminarPaymentInput {
  first_name: string;
  last_name: string;
  email: string;
  branch_id: string;
  date_of_birth: string;
  gender: string;
  current_belt: string;
  package_code: SeminarPackageCode;
  package_label: string;
  session_dates: string[];
  amount: number;
  payment_method: 'paynow' | 'bank_transfer';
  proof_file: File;
}

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

export const submitSeminarPayment = async (
  input: SubmitSeminarPaymentInput,
): Promise<{ id: string; reference_number: string }> => {
  const fn = (input.first_name || '').trim().toUpperCase();
  const ln = (input.last_name || '').trim().toUpperCase();
  const safeName = `${fn}_${ln}`.replace(/[^a-z0-9_]/gi, '_');
  const ts = Date.now();

  const proofExt = input.proof_file.name.split('.').pop() || 'jpg';
  const proofPath = `public-seminars/${input.branch_id}/${ts}_${safeName}_proof.${proofExt}`;
  const { error: proofErr } = await withTimeout(
    supabase.storage
      .from('payment-proofs')
      .upload(proofPath, input.proof_file, { upsert: false, contentType: input.proof_file.type }),
    30000,
    'Proof upload',
  );
  if (proofErr) throw new Error(`Proof upload failed: ${(proofErr as any).message || 'unknown error'}`);

  const { data: signed } = await supabase.storage
    .from('payment-proofs')
    .createSignedUrl(proofPath, 60 * 60 * 24 * 365 * 5);
  const proofUrl = signed?.signedUrl ?? proofPath;

  const row = {
    first_name: fn,
    last_name: ln,
    email: input.email.trim().toLowerCase() || null,
    branch_id: input.branch_id,
    date_of_birth: input.date_of_birth,
    gender: input.gender || null,
    current_belt: input.current_belt || null,
    package_code: input.package_code,
    package_label: input.package_label,
    session_dates: input.session_dates,
    amount: input.amount,
    payment_method: input.payment_method,
    proof_url: proofUrl,
  };

  const { data, error } = await withTimeout(
    Promise.resolve(supabase.rpc('submit_seminar_payment' as any, { _row: row as any })),
    15000,
    'Submission',
  );
  if (error) throw new Error(`Submission failed: ${error.message || 'unknown error'}`);
  const inserted = Array.isArray(data) ? data[0] : data;
  if (!inserted) throw new Error('Submission failed: no record returned');

  const recipient = (input.email || '').trim().toLowerCase();
  if (recipient) {
    void supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'seminar-confirmation',
        recipientEmail: recipient,
        idempotencyKey: `seminar-confirm-${inserted.id}`,
        templateData: {
          firstName: fn,
          fullName: `${fn} ${ln}`.trim(),
          packageLabel: input.package_label,
          sessionDates: input.session_dates,
          amount: input.amount,
          referenceNumber: inserted.reference_number,
        },
      },
    });
  }

  return inserted as { id: string; reference_number: string };
};

export const getPublicSeminarList = async (
  branchId?: string | null,
  status?: 'paid' | 'pending' | 'rejected' | null,
): Promise<PublicSeminarListRow[]> => {
  const { data, error } = await supabase.rpc('get_public_seminar_list' as any, {
    p_branch_id: branchId ?? null,
    p_status: status ?? null,
  });
  if (error) throw error;
  return (data || []) as PublicSeminarListRow[];
};

export const findSeminarSubmissionStudentMatches = async (
  submissionId: string,
): Promise<SeminarStudentMatch[]> => {
  const { data, error } = await supabase.rpc(
    'find_seminar_submission_student_matches' as any,
    { p_id: submissionId },
  );
  if (error) throw error;
  return (data || []) as SeminarStudentMatch[];
};

export const matchSeminarSubmission = async (submissionId: string, studentId: string) => {
  const { error } = await supabase.rpc('admin_match_seminar_submission' as any, {
    p_id: submissionId,
    p_student_id: studentId,
  });
  if (error) throw error;
};

export const importSeminarSubmissionStudent = async (
  submissionId: string,
  createdBy: string,
): Promise<string> => {
  const { data, error } = await supabase.rpc('admin_import_seminar_submission_student' as any, {
    p_id: submissionId,
    p_created_by: createdBy,
  });
  if (error) throw error;
  return data as string;
};

export const createSeminarInvoice = async (
  submissionId: string,
  verifiedBy: string,
): Promise<string> => {
  const { data, error } = await supabase.rpc('admin_create_seminar_invoice' as any, {
    p_id: submissionId,
    p_verified_by: verifiedBy,
  });
  if (error) throw error;
  return data as string;
};

export const rejectSeminarSubmission = async (
  submissionId: string,
  reason: string,
  reviewedBy: string,
) => {
  const { error } = await supabase.rpc('admin_reject_seminar_submission' as any, {
    p_id: submissionId,
    p_reason: reason,
    p_reviewed_by: reviewedBy,
  });
  if (error) throw error;
};

export const markSeminarCollected = async (submissionId: string, collected: boolean, by: string) => {
  const { error } = await supabase.rpc('admin_mark_seminar_collected' as any, {
    p_id: submissionId,
    p_collected: collected,
    p_by: by,
  });
  if (error) throw error;
};

export const adminDeleteSeminarSubmission = async (id: string) => {
  const { error } = await supabase.rpc('admin_delete_seminar_submission' as any, { p_id: id });
  if (error) throw error;
};

export const getSeminarSubmissionDeleteContext = async (id: string) => {
  const { data, error } = await supabase.rpc('admin_seminar_submission_delete_context' as any, { p_id: id });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    student_name: (row?.student_name ?? null) as string | null,
    invoice_number: (row?.invoice_number ?? null) as string | null,
    package_label: (row?.package_label ?? null) as string | null,
  };
};
