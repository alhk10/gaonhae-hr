import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export interface RentalSettings {
  branch_id: string;
  branch_name: string;
  country: string | null;
  enabled: boolean;
  hourly_rate: number;
  discounted_rate: number;
  monthly_threshold_hours: number;
  deposit_amount: number;
}

export interface RentalSession { date: string; start: string; end: string; hours?: number }

export interface RentalQuote {
  months: { month: string; hours: number; previous_hours: number; rate: number; amount: number }[];
  total_hours: number;
  rental_amount: number;
  deposit_amount: number;
  gst_rate: number;
  gst_inclusive: boolean;
  gst_amount: number;
  total_amount: number;
}

export interface RentalRow {
  id: string; reference_number: string; branch_id: string; branch_name: string;
  renter_name: string; nric_uen: string; contact_number: string; email: string;
  sessions: RentalSession[]; total_hours: number; rental_amount: number; deposit_amount: number;
  gst_amount: number; total_amount: number; payment_method: string; proof_url: string | null;
  status: string; reviewed_by: string | null; reviewed_at: string | null; review_note: string | null;
  signed_at: string; created_at: string;
  invoice_id: string | null; invoice_number: string | null; invoice_status: string | null;
  is_commercial: boolean; id_document_url: string | null; liability_cert_url: string | null;
}

export const getRentalSettings = async (): Promise<RentalSettings[]> => {
  const { data, error } = await db.rpc('get_studio_rental_settings');
  if (error) throw error;
  return (data || []).map((r: any) => ({
    ...r,
    hourly_rate: Number(r.hourly_rate), discounted_rate: Number(r.discounted_rate),
    monthly_threshold_hours: Number(r.monthly_threshold_hours), deposit_amount: Number(r.deposit_amount),
  }));
};

export const saveRentalSettings = async (s: RentalSettings) => {
  const { error } = await db.rpc('admin_upsert_studio_rental_settings', {
    p_branch_id: s.branch_id, p_enabled: s.enabled, p_hourly: s.hourly_rate,
    p_discounted: s.discounted_rate, p_threshold: s.monthly_threshold_hours, p_deposit: s.deposit_amount,
  });
  if (error) throw error;
};

export const quoteRental = async (branchId: string, nric: string, email: string, sessions: RentalSession[]): Promise<RentalQuote> => {
  const { data, error } = await db.rpc('quote_studio_rental', {
    p_branch_id: branchId, p_nric: nric, p_email: email, p_sessions: sessions,
  });
  if (error) throw error;
  return data as RentalQuote;
};

const uploadRentalFile = async (file: File, clientRef: string, kind: string) => {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `studio-rental/${clientRef}-${kind}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const up = await supabase.storage.from('payment-proofs')
    .upload(path, file, { upsert: false, contentType: file.type });
  if (up.error) throw new Error('Could not upload your file, please try again.');
  return `payment-proofs/${path}`;
};

export const submitRental = async (input: {
  clientRef: string; branchId: string; renterName: string; nric: string; contact: string; email: string;
  sessions: RentalSession[]; agreementText: string; signature: string; paymentMethod: string; proofFile: File;
  isCommercial: boolean; idDocumentFile: File; liabilityCertFile?: File | null;
}) => {
  const ext = (input.proofFile.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `studio-rental/${input.clientRef}-proof-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const up = await supabase.storage.from('payment-proofs')
    .upload(path, input.proofFile, { upsert: false, contentType: input.proofFile.type });
  if (up.error) throw new Error('Could not upload your file, please try again.');
  const idUrl = await uploadRentalFile(input.idDocumentFile, input.clientRef, 'id');
  const certUrl = input.isCommercial && input.liabilityCertFile
    ? await uploadRentalFile(input.liabilityCertFile, input.clientRef, 'liability')
    : null;
  const { data, error } = await db.rpc('submit_studio_rental', {
    p_client_ref: input.clientRef, p_branch_id: input.branchId, p_renter_name: input.renterName,
    p_nric: input.nric, p_contact: input.contact, p_email: input.email, p_sessions: input.sessions,
    p_agreement_text: input.agreementText, p_signature: input.signature,
    p_payment_method: input.paymentMethod, p_proof_url: `payment-proofs/${path}`,
    p_is_commercial: input.isCommercial, p_id_document_url: idUrl, p_liability_cert_url: certUrl,
  });
  if (error) throw error;
  return data as { id: string; reference: string; total_amount: number };
};

export const getRentalList = async (branchId?: string | null): Promise<RentalRow[]> => {
  const { data, error } = await db.rpc('get_studio_rental_list', { p_branch_id: branchId ?? null });
  if (error) throw error;
  return data || [];
};

export const getRentalAgreement = async (id: string) => {
  const { data, error } = await db.rpc('get_studio_rental_agreement', { p_id: id });
  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) as {
    agreement_text: string; signature_data: string; signed_at: string; renter_name: string; reference_number: string;
  };
};

export const reviewRental = async (id: string, status: 'verified' | 'rejected', note?: string) => {
  const { error } = await db.rpc('admin_review_studio_rental', { p_id: id, p_status: status, p_by: 'access', p_note: note ?? null });
  if (error) throw error;
};

const money = (n: number) => `$${Number(n).toFixed(2).replace(/\.00$/, '')}`;

export const AGREEMENT_PLACEHOLDERS = ['{branch}','{renter_name}','{nric_uen}','{contact}','{hourly_rate}','{discounted_rate}','{threshold}','{deposit}','{law_country}'];

/** Default agreement wording; placeholders are filled per branch/renter. */
export const DEFAULT_AGREEMENT_TEMPLATE = `STUDIO RENTAL AGREEMENT

Gaonhae Taekwondo LLP ("Gaonhae")
Renter: {renter_name}
NRIC/UEN: {nric_uen}
Contact: {contact}

1. Studio Use
Gaonhae permits the Renter to use the designated studio at Gaonhae Taekwondo {branch} for yoga lessons/practice during confirmed booking times.
Commercial use is not permitted unless approved in writing by Gaonhae and the Renter provides valid Public Liability Insurance.

2. Rental Rates
- {hourly_rate}/hour for up to {threshold} hours per calendar month.
- {discounted_rate}/hour for all hours once monthly usage exceeds {threshold} hours.
- Minimum booking: 1 hour.
- Additional bookings in 30-minute increments.
All fees must be paid in full before use. Bookings are confirmed only upon payment.

3. Booking & Cancellation
Bookings are subject to availability and must be made in advance.
- Cancellations made at least 24 hours before the booking may be rescheduled or refunded.
- Cancellations made less than 24 hours before the booking, or no-shows, are non-refundable.
- Changes to booking times are subject to availability.
- The Renter must not use the studio beyond the confirmed booking period without prior approval.

4. Deposit
A {deposit} security deposit is payable before the first use.
The deposit may be used for unpaid fees, cleaning or damage. If damage exceeds {deposit}, the Renter remains responsible for the full additional cost of repair or replacement.

5. Setup & Cleaning
The Renter is allowed 10 minutes before and 10 minutes after each booked session for setup, cleaning and pack-up. All activities must be completed within these periods.

6. Responsibility
The Renter is responsible for themselves and all participants, including any injury, loss or damage arising from their activities, and must comply with applicable laws and safety requirements.

7. Studio Rules
The Renter must keep the studio clean and tidy and must not:
- damage or modify the premises;
- obstruct exits or safety equipment;
- smoke, vape, consume alcohol or illegal substances; or
- use Gaonhae's name or logo without permission.

8. No Transfer
The Renter may not transfer, sublet or allow another person/business to use the studio without Gaonhae's written consent.

9. Termination
Either party may terminate this agreement by giving 7 days' written notice.
Gaonhae may terminate immediately for non-payment, damage, unsafe or unlawful conduct, unauthorised commercial use, or other serious breach.

10. General
This agreement does not create a partnership, employment or agency relationship. Use is subject to landlord/building requirements.
{law_country} law applies.`;

export const getAgreementTemplate = async (): Promise<string | null> => {
  const { data, error } = await db.rpc('get_studio_rental_agreement_template');
  if (error) throw error;
  return (data as string | null) || null;
};

export const saveAgreementTemplate = async (text: string | null) => {
  const { error } = await db.rpc('admin_save_studio_rental_agreement_template', { p_text: text, p_actor: 'access' });
  if (error) throw error;
};

/** The Studio Rental Agreement text with branch details filled in. */
export const buildAgreementText = (p: {
  branchName: string; renterName: string; nric: string; contact: string;
  hourly: number; discounted: number; threshold: number; deposit: number; lawCountry: string;
}, template?: string | null) => {
  const vals: Record<string, string> = {
    branch: p.branchName, renter_name: p.renterName || '________', nric_uen: p.nric || '________',
    contact: p.contact || '________', hourly_rate: money(p.hourly), discounted_rate: money(p.discounted),
    threshold: String(p.threshold), deposit: money(p.deposit), law_country: p.lawCountry,
  };
  return (template || DEFAULT_AGREEMENT_TEMPLATE).replace(/\{(\w+)\}/g, (m, k) => (k in vals ? vals[k] : m));
};
