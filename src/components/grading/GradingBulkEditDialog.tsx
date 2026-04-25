/**
 * GradingBulkEditDialog
 * Shared bulk-edit dialog for grading registrations. Used by both:
 *  - BranchGradingList (Branch Dashboard)
 *  - GradingListTab    (Sales / Superadmin)
 *
 * Lets staff change Grading Slot and/or Result on N selected students at once.
 * "Leave unchanged" is the default for both fields, so saving a single field
 * never affects the other. Result changes only apply to rows whose grading
 * fee has been paid (matches the existing per-row inline rule).
 */

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatDate } from '@/utils/dateFormat';
import { computeAutoResult, type ScorecardRow } from '@/constants/scorecardLabels';

export interface BulkEditStudent {
  student_id: string;
  student_name: string;
  registration_id: string | null;
  current_belt: string | null;
  grading_paid: 'paid' | 'unpaid' | 'n/a';
  ready_for_grading: boolean;
  result: string | null;
}

export interface BulkEditSlot {
  id: string;
  title: string | null;
  grading_date: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: BulkEditStudent[];
  availableSlots: BulkEditSlot[];
  selectedTermId: string;
  termStarted: boolean;
  /** Query keys to invalidate after a successful save. */
  invalidateKeys?: any[][];
}

const RESULT_OPTIONS = [
  { value: 'double', label: 'Double' },
  { value: 'pass', label: 'Pass' },
  { value: 'fail', label: 'Fail' },
  { value: 'confirmed', label: 'Confirmed' },
];

const UNCHANGED = '__unchanged__';
const NONE = '__none__';

const GradingBulkEditDialog: React.FC<Props> = ({
  open, onOpenChange, students, availableSlots, selectedTermId, termStarted, invalidateKeys = [],
}) => {
  const queryClient = useQueryClient();
  const [slotChoice, setSlotChoice] = useState<string>(UNCHANGED);
  const [resultChoice, setResultChoice] = useState<string>(UNCHANGED);

  // Reset when reopened
  useEffect(() => {
    if (open) {
      setSlotChoice(UNCHANGED);
      setResultChoice(UNCHANGED);
    }
  }, [open]);

  // Sort slots earliest date first
  const sortedSlots = [...availableSlots].sort((a, b) =>
    (a.grading_date || '').localeCompare(b.grading_date || '')
  );

  const paidCount = students.filter(s => s.grading_paid === 'paid').length;
  const willChangeResult = resultChoice !== UNCHANGED;
  const willChangeSlot = slotChoice !== UNCHANGED;

  const applyMutation = useMutation({
    mutationFn: async () => {
      const ops: Promise<any>[] = [];

      const slotPayload = slotChoice === UNCHANGED
        ? undefined
        : (slotChoice === NONE ? null : slotChoice);
      const resultPayload = resultChoice === UNCHANGED
        ? undefined
        : (resultChoice === NONE ? null : resultChoice);

      for (const student of students) {
        const updates: Record<string, any> = {};
        if (slotPayload !== undefined) updates.grading_slot_id = slotPayload;
        // Result only applies to paid grading rows (mirrors per-row inline rule)
        if (resultPayload !== undefined && student.grading_paid === 'paid') {
          updates.result = resultPayload;
        }

        // Lazy DB sync: if the term has started and the row has no result,
        // converge ready_for_grading to true on this save.
        const finalResult = updates.result !== undefined ? updates.result : student.result;
        if (
          termStarted &&
          !student.ready_for_grading &&
          !finalResult
        ) {
          updates.ready_for_grading = true;
        }

        if (Object.keys(updates).length === 0) continue;

        if (student.registration_id) {
          ops.push(
            supabase
              .from('grading_registrations')
              .update(updates)
              .eq('id', student.registration_id)
              .then(({ error }) => { if (error) throw error; }) as Promise<any>
          );
        } else {
          // No registration row yet — create one with the chosen values.
          const { getNextBeltLevel } = await import('@/constants/beltLevels');
          const currentBelt = student.current_belt || 'White';
          const nextBelt = getNextBeltLevel(currentBelt) || currentBelt;
          ops.push(
            supabase
              .from('grading_registrations')
              .insert([{
                student_id: student.student_id,
                current_belt: currentBelt,
                target_belt: nextBelt,
                grading_slot_id: updates.grading_slot_id ?? null,
                ready_for_grading: updates.ready_for_grading ?? (termStarted && !updates.result),
                result: updates.result ?? null,
                term_id: selectedTermId || null,
              }])
              .then(({ error }) => { if (error) throw error; }) as Promise<any>
          );
        }
      }

      await Promise.all(ops);
    },
    onSuccess: () => {
      toast.success(`Updated ${students.length} student${students.length !== 1 ? 's' : ''}`);
      invalidateKeys.forEach(k => queryClient.invalidateQueries({ queryKey: k }));
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to apply bulk edit'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update {students.length} student{students.length !== 1 ? 's' : ''}</DialogTitle>
          <DialogDescription>
            Choose what to change. Fields left as <em>Leave unchanged</em> stay as they are.
            Result changes only apply to {paidCount} of {students.length} selected
            {paidCount === 1 ? ' (the one' : ' (those'} whose grading fee is paid.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Grading Slot</Label>
            <Select value={slotChoice} onValueChange={setSlotChoice}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNCHANGED}>Leave unchanged</SelectItem>
                <SelectItem value={NONE}>Not Assigned</SelectItem>
                {sortedSlots.map(slot => (
                  <SelectItem key={slot.id} value={slot.id}>
                    {slot.title || 'Slot'}{slot.grading_date ? ` · ${formatDate(new Date(slot.grading_date))}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Result</Label>
            <Select value={resultChoice} onValueChange={setResultChoice}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNCHANGED}>Leave unchanged</SelectItem>
                <SelectItem value={NONE}>Clear</SelectItem>
                {RESULT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={applyMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => applyMutation.mutate()}
            disabled={applyMutation.isPending || (!willChangeSlot && !willChangeResult)}
          >
            {applyMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GradingBulkEditDialog;
