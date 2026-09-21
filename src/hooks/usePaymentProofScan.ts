import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ProofScanStatus = 'match' | 'mismatch' | 'unreadable';

export interface ProofScanResult {
  status: ProofScanStatus;
  amount: number | null;
  details: Record<string, unknown> | null;
}

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

/**
 * Reads an uploaded payment screenshot and compares the amount on it with the
 * amount due. Advisory only — a failure never blocks the parent from submitting.
 */
export function usePaymentProofScan() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ProofScanResult | null>(null);
  const runId = useRef(0);

  const reset = useCallback(() => {
    runId.current += 1;
    setScanning(false);
    setResult(null);
  }, []);

  const scan = useCallback(async (file: File | null, expectedAmount: number, currency = 'SGD') => {
    runId.current += 1;
    const id = runId.current;
    if (!file || !file.type.startsWith('image/')) {
      setResult(null);
      setScanning(false);
      return null;
    }
    setScanning(true);
    setResult(null);
    try {
      const imageDataUrl = await fileToDataUrl(file);
      const { data, error } = await supabase.functions.invoke('scan-payment-proof', {
        body: { image_data_url: imageDataUrl, expected_amount: expectedAmount, currency },
      });
      if (id !== runId.current) return null;
      if (error || !data) {
        const fallback: ProofScanResult = { status: 'unreadable', amount: null, details: null };
        setResult(fallback);
        return fallback;
      }
      const next: ProofScanResult = {
        status: (data.status as ProofScanStatus) || 'unreadable',
        amount: typeof data.amount === 'number' ? data.amount : null,
        details: (data.details as Record<string, unknown>) ?? null,
      };
      setResult(next);
      return next;
    } catch (_e) {
      if (id !== runId.current) return null;
      const fallback: ProofScanResult = { status: 'unreadable', amount: null, details: null };
      setResult(fallback);
      return fallback;
    } finally {
      if (id === runId.current) setScanning(false);
    }
  }, []);

  return { scanning, result, scan, reset };
}

export const proofScanFields = (result: ProofScanResult | null) => ({
  proof_scan_status: result?.status ?? null,
  proof_scan_amount: result?.amount ?? null,
  proof_scan_details: result?.details ?? null,
});
