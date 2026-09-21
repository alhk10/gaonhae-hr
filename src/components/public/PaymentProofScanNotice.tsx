import React from 'react';
import { Loader2, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import type { ProofScanResult } from '@/hooks/usePaymentProofScan';

interface Props {
  scanning: boolean;
  result: ProofScanResult | null;
  expectedAmount: number;
}

const money = (v: number) => `$${Number(v || 0).toFixed(2)}`;

export const PaymentProofScanNotice: React.FC<Props> = ({ scanning, result, expectedAmount }) => {
  if (scanning) {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-md border bg-muted/40 px-2 py-1.5 text-[11px] text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Checking the amount on your screenshot…</span>
      </div>
    );
  }
  if (!result) return null;

  if (result.status === 'match') {
    return (
      <div className="mt-2 flex items-start gap-2 rounded-md border border-green-200 bg-green-50 px-2 py-1.5 text-[11px] text-green-800">
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>Screenshot shows {money(result.amount ?? 0)} — matches the amount due.</span>
      </div>
    );
  }

  if (result.status === 'mismatch') {
    return (
      <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Screenshot shows {money(result.amount ?? 0)} but {money(expectedAmount)} is due. Please check
          before submitting — you can still continue and our staff will review it.
        </span>
      </div>
    );
  }

  return (
    <div className="mt-2 flex items-start gap-2 rounded-md border bg-muted/40 px-2 py-1.5 text-[11px] text-muted-foreground">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>We couldn't read the amount on this image; our staff will check it.</span>
    </div>
  );
};

export default PaymentProofScanNotice;
