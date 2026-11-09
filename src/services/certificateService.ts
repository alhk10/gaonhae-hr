/** STF / Kukkiwon certificates and Poom → Dan conversion status. */
import { supabase } from '@/integrations/supabase/client';
import { accessPassword } from '@/services/lessonBookingService';

export interface StudentCertificate {
  id: string; invoice_id: string | null; series: 'stf' | 'kukkiwon'; rank: string | null; source: string;
  image_path: string | null; scan: any; issue_date: string | null;
  status: 'awaiting_upload' | 'pending' | 'verified' | 'rejected' | 'manual'; review_reason?: string | null; created_at: string;
  student_id?: string; student_name?: string; branch?: string;
}
export interface GradingRecords {
  student?: { belt: string | null; dob: string | null; last_dan_conversion_at: string | null; pre_conversion_poom: string | null; certificate_name?: string | null };
  history: { id: string; date: string | null; belt_from: string | null; belt_to: string | null; result: string | null; scorecard?: any[]; country?: string | null; fee_name?: string | null }[];
  certificates: StudentCertificate[];
}
export interface ConversionStatus { id: string; belt: string | null; dob: string | null; last_dan_conversion_at: string | null; pre_conversion_poom: string | null; pending_certificate: boolean }

const rpc = async <T,>(fn: string, args: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.rpc(fn as any, args as any);
  if (error) throw new Error(error.message);
  return data as T;
};
const pw = () => accessPassword() || null;

export const getConversionStatus = (ids: string[]) =>
  ids.length ? rpc<ConversionStatus[]>('access_conversion_status', { p_password: pw(), p_student_ids: ids }) : Promise.resolve([]);
export const getGradingRecords = (studentId: string) =>
  rpc<GradingRecords>('access_student_grading_records', { p_password: pw(), p_student_id: studentId });
export const getHelloGradingRecords = (sessionId: string, studentId: string) =>
  rpc<GradingRecords>('hello_student_grading_records', { p_session_id: sessionId, p_student_id: studentId });
export const getPendingCertificates = () => rpc<StudentCertificate[]>('access_pending_certificates', { p_password: pw() });
export const reviewCertificate = (id: string, approve: boolean, opts: { series?: string; rank?: string; issueDate?: string; reason?: string } = {}) =>
  rpc('access_review_certificate', { p_password: pw(), p_id: id, p_approve: approve, p_series: opts.series ?? null, p_rank: opts.rank ?? null, p_issue_date: opts.issueDate ?? null, p_reason: opts.reason ?? null });

type Who = { sessionId?: string };
const invoke = async <T,>(body: Record<string, unknown>, who: Who = {}): Promise<T> => {
  const { data, error } = await supabase.functions.invoke('student-certificate', {
    body: { ...body, ...(who.sessionId ? { session_id: who.sessionId } : { access_password: pw() }) },
  });
  if (error) {
    let msg = error.message;
    try { msg = (await (error as any).context?.json())?.error || msg; } catch { /* keep */ }
    throw new Error(msg);
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
};

export const fileToDataUrl = (f: File) => new Promise<string>((res, rej) => {
  const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f);
});

export const uploadCertificate = async (studentId: string, file: File, opts: { series: 'stf' | 'kukkiwon'; rank?: string | null; certificateId?: string | null }, who: Who = {}) =>
  invoke<{ id: string; status: string; scan: any; issue_date: string | null; rank: string | null }>({
    action: 'upload', student_id: studentId, series: opts.series, rank: opts.rank ?? null, certificate_id: opts.certificateId ?? null,
    image_data_url: await fileToDataUrl(file),
  }, who);

export const signCertificate = (studentId: string, path: string, who: Who = {}) =>
  invoke<{ url: string | null }>({ action: 'sign', student_id: studentId, path }, who).then((r) => r.url);

export const CERT_STATUS_LABEL: Record<string, string> = {
  awaiting_upload: 'Certificate needed', pending: 'Waiting approval', verified: 'Verified', manual: 'Approved', rejected: 'Rejected',
};
