/**
 * Shown when a public payment form detects an identical submission from the
 * last 24 hours. The person chooses to update the earlier one, send a separate
 * payment anyway, or go back.
 */
import React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { formatDateTime } from '@/utils/dateFormat';
import type { DuplicateSubmissionHit } from '@/services/publicDuplicateSubmissionService';

interface Props {
  hit: DuplicateSubmissionHit | null;
  busy?: boolean;
  onUpdateExisting: () => void;
  onSubmitAnyway: () => void;
  onCancel: () => void;
}

const DuplicateSubmissionPrompt: React.FC<Props> = ({
  hit, busy, onUpdateExisting, onSubmitAnyway, onCancel,
}) => (
  <Dialog open={!!hit} onOpenChange={(o) => { if (!o && !busy) onCancel(); }}>
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          We already have this payment
        </DialogTitle>
        <DialogDescription className="text-xs">
          A payment for the same name and amount was received{' '}
          {hit ? formatDateTime(hit.created_at) : ''}
          {hit?.reference_number ? ` (reference ${hit.reference_number})` : ''}.
          Would you like to update it instead of sending it again?
        </DialogDescription>
      </DialogHeader>

      {hit && !hit.editable && (
        <div className="rounded border border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-900">
          Our staff have already checked that payment, so it can no longer be changed here.
          Please contact your branch if something needs correcting.
        </div>
      )}

      <DialogFooter className="flex-col gap-2 sm:flex-col">
        {hit?.editable && (
          <Button className="w-full" onClick={onUpdateExisting} disabled={busy}>
            {busy ? 'Updating…' : 'Update my earlier submission'}
          </Button>
        )}
        <Button variant="outline" className="w-full" onClick={onSubmitAnyway} disabled={busy}>
          This is a separate payment — send it
        </Button>
        <Button variant="ghost" className="w-full" onClick={onCancel} disabled={busy}>
          Go back
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default DuplicateSubmissionPrompt;
