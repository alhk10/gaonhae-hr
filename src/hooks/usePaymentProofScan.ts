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
  const pending = useRef<Promise<ProofScanResult | null> | null>(null);

  const reset = useCallback(() => {
    runId.current += 1;
    pending.current = null;
    setScanning(false);
    setResult(null);
  }, []);

  const scan = useCallback((file: File | null, expectedAmount: number, currency = 'SGD') => {
    const promise = runScan(file, expectedAmount, currency);
    pending.current = promise;
    return promise;
  }, []);

  /** Resolves once any in-flight scan has finished, so results are never lost on submit. */
  const waitForResult = useCallback(async () => {
    try {
      return (await pending.current) ?? null;
    } catch {
      return null;
    }
  }, []);

  const runScan = useCallback(async (file: File | null, expectedAmount: number, currency = 'SGD') => {
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

  return { scanning, result, scan, reset, waitForResult };
}

export type ProofScanSource = 'grading' | 'competition' | 'seminar' | 'school_fees' | 'guards';

/** Saves the scan result against a submission. Never throws. */
export const recordProofScan = async (
  source: ProofScanSource,
  submissionId: string | null | undefined,
  result: ProofScanResult | null,
) => {
  if (!submissionId || !result) return;
  try {
    await supabase.rpc('record_proof_scan' as any, {
      p_source: source,
      p_id: submissionId,
      p_status: result.status,
      p_amount: result.amount,
      p_details: result.details as any,
    });
  } catch (e) {
    console.warn('Could not save proof scan result', e);
  }
};

/** Saves the scan result against the payment created by a /hello chat payment. */
export const recordProofScanForInvoice = async (
  sessionId: string | null | undefined,
  invoiceId: string | null | undefined,
  result: ProofScanResult | null,
) => {
  if (!sessionId || !invoiceId || !result) return;
  try {
    await supabase.rpc('record_proof_scan_for_invoice' as any, {
      p_session_id: sessionId,
      p_invoice_id: invoiceId,
      p_status: result.status,
      p_amount: result.amount,
      p_details: result.details as any,
    });
  } catch (e) {
    console.warn('Could not save proof scan result', e);
  }
};

/** Saves the scan result against the latest /hello submission of a chat session. */
export const recordProofScanBySession = async (
  sessionId: string | null | undefined,
  result: ProofScanResult | null,
) => {
  if (!sessionId || !result) return;
  try {
    await supabase.rpc('record_proof_scan_by_session' as any, {
      p_session_id: sessionId,
      p_status: result.status,
      p_amount: result.amount,
      p_details: result.details as any,
    });
  } catch (e) {
    console.warn('Could not save proof scan result', e);
  }
};
