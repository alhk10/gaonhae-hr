/**
 * Service for the public accessories payment module.
 * Used by /accessories and /accessories-list (no auth required to submit;
 * list/verify gated by RLS branch access).
 */
import { supabase } from '@/integrations/supabase/client';

export interface PublicAccessoryProduct {
  product_id: string;
  product_name: string;
  base_price: number;
  branch_price: number;
}

export interface AccessoryItem {
  product_id: string;
  name: string;
  qty: number;
  unit_price: number;
  line_total: number;
  bundle_key?: string;
  bundle_name?: string;
  size?: string;
  color?: string;
}

export interface AccessorySubmissionRow {
  id: string;
  reference_number: string;
  branch_id: string;
  branch_name: string | null;
  first_name: string;
  last_name: string;
  display_name: string | null;
  items: AccessoryItem[];
  amount: number;
  payment_method: string;
  proof_url: string | null;
  status: string;
  matched_student_id: string | null;
  matched_invoice_id: string | null;
  created_at: string;
}

export interface SubmitAccessoryPaymentInput {
  first_name: string;
  last_name: string;
  email: string;
  branch_id: string;
  date_of_birth: string; // yyyy-MM-dd
  current_belt: string | null;
  items: AccessoryItem[];
  amount: number;
  payment_method: 'paynow' | 'bank_transfer';
  proof_file: File;
}

export const getPublicAccessoryProducts = async (
  branchId: string,
): Promise<PublicAccessoryProduct[]> => {
  if (!branchId) return [];
  const { data, error } = await supabase.rpc(
    'get_public_accessory_products' as any,
    { p_branch_id: branchId },
  );
  if (error) throw error;
  return (data || []) as PublicAccessoryProduct[];
};

export const getPublicAccessoryList = async (): Promise<AccessorySubmissionRow[]> => {
  const { data, error } = await supabase.rpc('get_public_accessory_list' as any);
  if (error) throw error;
  return ((data || []) as any[]).map((r) => ({
    ...r,
    items: Array.isArray(r.items) ? r.items : [],
  })) as AccessorySubmissionRow[];
};

export const submitAccessoryPayment = async (
  input: SubmitAccessoryPaymentInput,
): Promise<{ id: string; reference_number: string }> => {
  if (!input.items.length) throw new Error('No items selected');

  const ext = input.proof_file.name.split('.').pop() || 'jpg';
  const ts = Date.now();
  const fn = input.first_name.trim().toUpperCase();
  const ln = input.last_name.trim().toUpperCase();
  const safeName = `${fn}_${ln}`.replace(/[^a-z0-9_]/gi, '_');
  const path = `public-accessory/${input.branch_id}/${ts}_${safeName}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('payment-proofs')
    .upload(path, input.proof_file, {
      upsert: false,
      contentType: input.proof_file.type,
    });
  if (uploadError) throw uploadError;

  const { data: signed } = await supabase.storage
    .from('payment-proofs')
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  const proofUrl = signed?.signedUrl ?? path;

  const { data, error } = await supabase
    .from('accessory_payment_submissions' as any)
    .insert({
      first_name: fn,
      last_name: ln,
      display_name: `${fn} ${ln}`.trim(),
      email: input.email.trim().toLowerCase() || null,
      branch_id: input.branch_id,
      date_of_birth: input.date_of_birth,
      current_belt: input.current_belt || null,
      items: input.items as any,
      amount: input.amount,
      payment_method: input.payment_method,
      proof_url: proofUrl,
      status: 'pending_verification',
    })
    .select('id, reference_number')
    .single();

  if (error) throw error;
  return data as unknown as { id: string; reference_number: string };
};

export const verifyAccessorySubmission = async (
  id: string,
  verifiedBy: string,
): Promise<{ matched: boolean; student_id?: string; invoice_id?: string; invoice_number?: string }> => {
  const { data, error } = await supabase.rpc(
    'admin_verify_accessory_submission' as any,
    { p_id: id, p_verified_by: verifiedBy },
  );
  if (error) throw error;
  return (data || { matched: false }) as any;
};

export const rejectAccessorySubmission = async (
  id: string,
  reason: string,
  reviewedBy: string,
): Promise<void> => {
  const { error } = await supabase.rpc(
    'admin_reject_accessory_submission' as any,
    { p_id: id, p_reason: reason, p_reviewed_by: reviewedBy },
  );
  if (error) throw error;
};
