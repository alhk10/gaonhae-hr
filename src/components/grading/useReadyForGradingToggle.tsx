import { useCallback, useRef, useState } from 'react';
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { getGradingTermFeeStatus, setReadyForGrading, type GradingTermFeeStatus } from '@/services/lessonBookingService';

type Choice = 'cancel' | 'plain' | 'override';

/** Ticking Ready warns staff when the term isn't paid enough, with an option to override the fee rule for /hello. */
export function useReadyForGradingToggle() {
  const [status, setStatus] = useState<GradingTermFeeStatus | null>(null);
  const resolver = useRef<((c: Choice) => void) | null>(null);

  const choose = (c: Choice) => { resolver.current?.(c); resolver.current = null; setStatus(null); };

  const toggleReady = useCallback(async (studentId: string, termId: string, next: boolean): Promise<boolean> => {
    if (!next) { await setReadyForGrading(studentId, termId, false); return true; }
    const fee = await getGradingTermFeeStatus(studentId, termId);
    if (fee.grading_eligible) { await setReadyForGrading(studentId, termId, true); return true; }
    const choice = await new Promise<Choice>(res => { resolver.current = res; setStatus(fee); });
    if (choice === 'cancel') return false;
    await setReadyForGrading(studentId, termId, true, choice === 'override');
    return true;
  }, []);

  const dialog = (
    <AlertDialog open={!!status} onOpenChange={o => { if (!o) choose('cancel'); }}>
      <AlertDialogContent className="max-w-[95vw] sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{status?.term_name || 'This term'} has not been paid</AlertDialogTitle>
          <AlertDialogDescription>
            {status?.paid_weeks ?? 0} of {status?.term_weeks ?? '?'} weeks paid. The grading button will not show in /hello until at least half the term is paid, unless you override.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          <AlertDialogCancel onClick={() => choose('cancel')}>Cancel</AlertDialogCancel>
          <Button onClick={() => choose('override')}>Override and allow grading</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { toggleReady, dialog };
}
