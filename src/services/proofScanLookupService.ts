/**
 * Reads the automatic payment-screenshot check results for staff dashboards.
 * Keyed by "<source>-<submission id>" so the unified approvals list can show
 * whether the uploaded screenshot amount matched what was due.
 */
import { supabase } from '@/integrations/supabase/client';
import type { ProofScanStatus } from '@/hooks/usePaymentProofScan';

export interface ProofScanRecord {
  status: ProofScanStatus;
  amount: number | null;
  details: Record<string, any> | null;
}

const TABLES: { key: string; table: string }[] = [
  { key: 'grading', table: 'grading_payment_submissions' },
  { key: 'competition', table: 'competition_payment_submissions' },
  { key: 'seminar', table: 'seminar_payment_submissions' },
  { key: 'school_fees', table: 'public_chat_payment_submissions' },
  { key: 'guards', table: 'guards_purchases' },
];

export const getProofScanMap = async (): Promise<Record<string, ProofScanRecord>> => {
  const map: Record<string, ProofScanRecord> = {};
  await Promise.all(
    TABLES.map(async ({ key, table }) => {
      const { data, error } = await (supabase as any)
        .from(table)
        .select('id, proof_scan_status, proof_scan_amount, proof_scan_details')
        .not('proof_scan_status', 'is', null)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error || !data) return;
      for (const row of data as any[]) {
        map[`${key}-${row.id}`] = {
          status: row.proof_scan_status as ProofScanStatus,
          amount: row.proof_scan_amount === null ? null : Number(row.proof_scan_amount),
          details: row.proof_scan_details ?? null,
        };
      }
    }),
  );
  return map;
};
