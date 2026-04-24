/**
 * Grading Scorecard Dialog
 *
 * Compact editor for the flexible grading scorecard. Loads the existing
 * `scorecard` JSON from `grading_registrations`, lets the examiner
 * add/remove/reorder rows, and persists changes back to the database.
 *
 * Two save actions:
 *   - Save               → writes to DB and closes.
 *   - Save & Generate PDF → writes to DB then triggers the certificate
 *                          PDF download for the supplied belt.
 *
 * Every save invalidates the `grading-list-students` query so the calling
 * lists pick up the new scorecard immediately. Cancel discards local edits.
 */

import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowDown, ArrowUp, FileDown, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ScorecardRow, buildDefaultScorecard, computeBmi, extractNumeric, DEFAULT_SCORECARD_LABELS } from '@/constants/scorecardLabels';
import { downloadGradingCertificatePDF } from '@/utils/gradingCertificatePDFGenerator';
import { format } from 'date-fns';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registrationId: string;
  studentName: string;
  beltAchieved: string;       // e.g. "Yellow Belt" — printed verbatim on cert
  gradingDate: Date | string | null;
  /** Whether to show the "Save & Generate PDF" action. */
  enableGenerate?: boolean;
  /** Query keys to invalidate after a successful save. */
  invalidateKeys?: any[][];
}

const fetchScorecard = async (registrationId: string): Promise<ScorecardRow[]> => {
  const { data, error } = await supabase
    .from('grading_registrations')
    .select('scorecard')
    .eq('id', registrationId)
    .maybeSingle();
  if (error) throw error;
  const raw = (data?.scorecard ?? []) as unknown;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw
      .filter((r: any) => r && typeof r === 'object')
      .map((r: any) => ({ label: String(r.label ?? ''), value: String(r.value ?? '') }));
  }
  return buildDefaultScorecard();
};

const GradingScorecardDialog: React.FC<Props> = ({
  open, onOpenChange, registrationId, studentName, beltAchieved, gradingDate,
  enableGenerate = true, invalidateKeys = [],
}) => {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<ScorecardRow[]>([]);

  const { data: persisted, isLoading } = useQuery({
    queryKey: ['grading-scorecard', registrationId],
    queryFn: () => fetchScorecard(registrationId),
    enabled: open && !!registrationId,
    staleTime: 0,
  });

  useEffect(() => {
    if (open && persisted) setRows(persisted);
  }, [open, persisted]);

  const setRow = (idx: number, patch: Partial<ScorecardRow>) => {
    setRows(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const moveRow = (idx: number, dir: -1 | 1) => {
    setRows(prev => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const addRow = () => setRows(prev => [...prev, { label: '', value: '' }]);
  const deleteRow = (idx: number) => setRows(prev => prev.filter((_, i) => i !== idx));

  // Live BMI helper
  const heightVal = rows.find(r => /height/i.test(r.label))?.value;
  const weightVal = rows.find(r => /weight/i.test(r.label))?.value;
  const liveBmi = computeBmi(extractNumeric(heightVal) ?? undefined, extractNumeric(weightVal) ?? undefined);

  const saveMutation = useMutation({
    mutationFn: async (next: ScorecardRow[]) => {
      // Drop fully empty rows before persisting
      const cleaned = next
        .map(r => ({ label: (r.label || '').trim(), value: (r.value || '').trim() }))
        .filter(r => r.label.length > 0 || r.value.length > 0);
      const { error } = await supabase
        .from('grading_registrations')
        .update({ scorecard: cleaned as any })
        .eq('id', registrationId);
      if (error) throw error;
      return cleaned;
    },
    onSuccess: (cleaned) => {
      queryClient.setQueryData(['grading-scorecard', registrationId], cleaned);
      invalidateKeys.forEach(k => queryClient.invalidateQueries({ queryKey: k }));
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to save scorecard'),
  });

  const handleSave = async () => {
    await saveMutation.mutateAsync(rows);
    toast.success('Scorecard saved');
    onOpenChange(false);
  };

  const handleSaveAndGenerate = async () => {
    const cleaned = await saveMutation.mutateAsync(rows);
    if (!gradingDate) {
      toast.error('Grading date missing — cannot generate certificate');
      return;
    }
    const safeName = studentName.replace(/[^\w\-]+/g, '_');
    const safeBelt = beltAchieved.replace(/[^\w\-]+/g, '_');
    const dateStr = format(new Date(gradingDate), 'yyyy-MM-dd');
    downloadGradingCertificatePDF(
      {
        studentName,
        beltAchieved,
        gradingDate,
        scorecard: cleaned,
      },
      `Certificate_${safeName}_${safeBelt}_${dateStr}.pdf`,
    );
    toast.success('Certificate generated');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>Scorecard — {studentName}</DialogTitle>
          <DialogDescription>
            {beltAchieved}
            {gradingDate && (
              <> · {format(new Date(gradingDate), 'd MMMM yyyy')}</>
            )}
            {liveBmi !== null && (
              <span className="ml-2 text-foreground/80">· BMI: <strong>{liveBmi}</strong></span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[55vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-[1fr_1fr_auto] gap-1.5 text-[11px] font-medium text-muted-foreground px-1">
                <span>Field</span>
                <span>Result</span>
                <span className="w-[68px] text-right pr-1">Actions</span>
              </div>
              {rows.map((row, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-1.5 items-center">
                  <Input
                    list="scorecard-label-suggestions"
                    value={row.label}
                    onChange={(e) => setRow(idx, { label: e.target.value })}
                    placeholder="Field"
                    className="h-8 text-xs"
                  />
                  <Input
                    value={row.value}
                    onChange={(e) => setRow(idx, { value: e.target.value })}
                    placeholder="Result"
                    className="h-8 text-xs"
                  />
                  <div className="flex gap-0.5">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => moveRow(idx, -1)} disabled={idx === 0} title="Move up">
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => moveRow(idx, 1)} disabled={idx === rows.length - 1} title="Move down">
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => deleteRow(idx)} title="Remove row">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              <datalist id="scorecard-label-suggestions">
                {DEFAULT_SCORECARD_LABELS.map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
              <Button variant="outline" size="sm" className="mt-2 h-8 text-xs" onClick={addRow}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add row
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="gap-1.5">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saveMutation.isPending}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={handleSave} disabled={saveMutation.isPending || isLoading}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Save
          </Button>
          {enableGenerate && (
            <Button onClick={handleSaveAndGenerate} disabled={saveMutation.isPending || isLoading}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileDown className="h-4 w-4 mr-1" />}
              Save & Generate PDF
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GradingScorecardDialog;
