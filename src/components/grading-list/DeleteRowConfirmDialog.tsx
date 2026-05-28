/**
 * Shared confirmation dialog for admin row deletions across the
 * /grading-list page (grading, competitions, guards tabs).
 *
 * Surfaces critical context before the destructive action:
 * - Linked student name (if matched)
 * - Linked invoice number (if an invoice was already created)
 *   plus a warning that the invoice itself will NOT be removed.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, User as UserIcon, FileText, Loader2 } from 'lucide-react';
import {
  getGradingRowDeleteContext,
  type DeleteRowContext,
} from '@/services/gradingPaymentSubmissionService';
import { getCompetitionSubmissionDeleteContext } from '@/services/competitionPaymentSubmissionService';
import { getGuardsPurchaseDeleteContext } from '@/services/guardsPurchaseService';
import { getSeminarSubmissionDeleteContext } from '@/services/seminarPaymentSubmissionService';

export type DeleteKind =
  | { kind: 'grading'; source: 'submission' | 'registration'; id: string; studentName: string }
  | { kind: 'competition'; id: string; studentName: string }
  | { kind: 'guards'; id: string; studentName: string }
  | { kind: 'seminar'; id: string; studentName: string };

interface Props {
  pending: DeleteKind | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading?: boolean;
}

const titleFor = (k: DeleteKind | null) => {
  if (!k) return 'Delete row?';
  if (k.kind === 'grading') return 'Delete grading row?';
  if (k.kind === 'competition') return 'Delete competition entry?';
  return 'Delete guards purchase?';
};

const DeleteRowConfirmDialog: React.FC<Props> = ({ pending, onOpenChange, onConfirm, loading }) => {
  const open = !!pending;

  const { data: ctx, isLoading } = useQuery<DeleteRowContext>({
    queryKey: ['delete-row-context', pending?.kind, (pending as any)?.source, pending?.id],
    queryFn: async () => {
      if (!pending) return { student_matched: false, student_name: null, invoice_number: null };
      if (pending.kind === 'grading') return getGradingRowDeleteContext(pending.source, pending.id);
      if (pending.kind === 'competition') return getCompetitionSubmissionDeleteContext(pending.id);
      return getGuardsPurchaseDeleteContext(pending.id);
    },
    enabled: open,
    staleTime: 0,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{titleFor(pending)}</DialogTitle>
          <DialogDescription>
            {pending?.studentName || 'This row'} — this cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 text-xs">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Checking links…
            </div>
          ) : (
            <>
              {ctx?.student_matched && ctx.student_name && (
                <div className="flex items-start gap-2 rounded border border-blue-200 bg-blue-50 p-2 text-blue-900">
                  <UserIcon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <div>
                    Linked to student:{' '}
                    <span className="font-medium">{ctx.student_name}</span>
                  </div>
                </div>
              )}
              {ctx?.invoice_number && (
                <div className="flex items-start gap-2 rounded border border-amber-300 bg-amber-50 p-2 text-amber-900">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      Invoice already created:{' '}
                      <span className="font-mono font-medium">{ctx.invoice_number}</span>
                    </div>
                    <div className="text-[11px]">
                      Deleting this row will <strong>NOT</strong> delete the linked invoice — handle it
                      separately in Sales.
                    </div>
                  </div>
                </div>
              )}
              {!ctx?.student_matched && !ctx?.invoice_number && (
                <div className="text-muted-foreground">
                  No linked student or invoice was found for this row.
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading || isLoading}>
            {loading ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteRowConfirmDialog;
