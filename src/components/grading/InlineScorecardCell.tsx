/**
 * InlineScorecardCell
 *
 * Compact editable input rendered directly in the grading list table.
 * - Reads its value from the row's `scorecard` JSON for a given label.
 * - Debounces saves (400 ms) to `grading_registrations.scorecard`, merging
 *   the new value into the existing array (preserving other labels).
 * - Disabled when the row has no `registrationId` yet.
 * - The BMI variant is read-only and derived from the row's Height + Weight cells.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { computeBmi, extractNumeric, ScorecardRow } from '@/constants/scorecardLabels';

interface Props {
  registrationId: string | null;
  label: string;
  scorecard: ScorecardRow[] | null | undefined;
  invalidateKey: any[];
}

const findValue = (rows: ScorecardRow[] | null | undefined, label: string): string => {
  if (!rows) return '';
  const hit = rows.find(r => String(r.label).toLowerCase() === label.toLowerCase());
  return hit?.value ?? '';
};

export const InlineScorecardCell: React.FC<Props> = ({ registrationId, label, scorecard, invalidateKey }) => {
  const queryClient = useQueryClient();
  const initial = findValue(scorecard, label);
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const timer = useRef<number | null>(null);
  const lastSaved = useRef(initial);

  // Sync when external data changes (and we're not actively editing)
  useEffect(() => {
    const fresh = findValue(scorecard, label);
    if (fresh !== lastSaved.current) {
      lastSaved.current = fresh;
      setValue(fresh);
    }
  }, [scorecard, label]);

  const persist = async (next: string) => {
    if (!registrationId) return;
    setSaving(true);
    try {
      // Read latest, merge, write
      const { data: row, error: readErr } = await supabase
        .from('grading_registrations')
        .select('scorecard')
        .eq('id', registrationId)
        .maybeSingle();
      if (readErr) throw readErr;
      const arr: ScorecardRow[] = Array.isArray(row?.scorecard)
        ? (row!.scorecard as any[]).map((r: any) => ({ label: String(r?.label ?? ''), value: String(r?.value ?? '') }))
        : [];
      const idx = arr.findIndex(r => r.label.toLowerCase() === label.toLowerCase());
      if (idx >= 0) arr[idx] = { label, value: next };
      else arr.push({ label, value: next });

      const { error: updErr } = await supabase
        .from('grading_registrations')
        .update({ scorecard: arr as any })
        .eq('id', registrationId);
      if (updErr) throw updErr;
      lastSaved.current = next;
      queryClient.invalidateQueries({ queryKey: invalidateKey });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue(v);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => persist(v), 400);
  };

  const onBlur = () => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    if (value !== lastSaved.current) persist(value);
  };

  return (
    <Input
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      disabled={!registrationId}
      title={!registrationId ? 'Available after grading registration is created' : label}
      className={`h-7 w-16 text-xs px-1.5 ${saving ? 'border-primary' : ''}`}
    />
  );
};

interface BmiProps {
  scorecard: ScorecardRow[] | null | undefined;
}

export const InlineBmiCell: React.FC<BmiProps> = ({ scorecard }) => {
  const h = extractNumeric(findValue(scorecard, 'Height')) ?? undefined;
  const w = extractNumeric(findValue(scorecard, 'Weight')) ?? undefined;
  const bmi = computeBmi(h, w);
  return (
    <span className="text-xs font-medium tabular-nums">
      {bmi !== null ? bmi : <span className="text-muted-foreground">-</span>}
    </span>
  );
};

export default InlineScorecardCell;
