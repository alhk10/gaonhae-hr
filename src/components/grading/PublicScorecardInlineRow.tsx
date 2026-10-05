/**
 * Inline score entry for /access grading (Morley only). Each box saves via
 * the admin_update_grading_scorecard SECURITY DEFINER RPC after a short debounce.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { computeBmi, DEFAULT_SCORECARD_LABELS, ScorecardRow } from '@/constants/scorecardLabels';

const UNIT: Record<string, string> = { Height: 'cm', Weight: 'kg' };
const read = (rows: ScorecardRow[] | null | undefined, label: string) =>
  (rows || []).find(r => String(r.label).toLowerCase() === label.toLowerCase())?.value ?? '';

const Box: React.FC<{ registrationId: string | null; label: string; initial: string; onSaved: (label: string, v: string) => void }> = ({ registrationId, label, initial, onSaved }) => {
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const last = useRef(initial);
  const timer = useRef<number | null>(null);
  useEffect(() => { if (initial !== last.current) { last.current = initial; setValue(initial); } }, [initial]);

  const persist = async (v: string) => {
    if (!registrationId || v === last.current) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc('admin_update_grading_scorecard' as any, { p_registration_id: registrationId, p_label: label, p_value: v });
      if (error) throw error;
      last.current = v;
      onSaved(label, v);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save score');
    } finally { setSaving(false); }
  };

  return (
    <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
      <span>{label}{UNIT[label] ? ` (${UNIT[label]})` : ''}</span>
      <Input
        value={value}
        disabled={!registrationId}
        inputMode="decimal"
        maxLength={20}
        onChange={e => {
          const v = e.target.value; setValue(v);
          if (timer.current) window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => persist(v), 400);
        }}
        onBlur={() => { if (timer.current) window.clearTimeout(timer.current); persist(value); }}
        className={`h-6 w-12 px-1 text-xs ${saving ? 'border-primary' : ''}`}
      />
    </label>
  );
};

interface Props { registrationId: string | null; scorecard: ScorecardRow[] | null | undefined; onSaved: () => void }

export const PublicScorecardInline: React.FC<Props> = ({ registrationId, scorecard, onSaved }) => {
  const [local, setLocal] = useState<ScorecardRow[]>(scorecard || []);
  useEffect(() => { setLocal(scorecard || []); }, [scorecard]);
  const bmi = computeBmi(read(local, 'Height'), read(local, 'Weight'));
  const handleSaved = (label: string, v: string) => {
    setLocal(prev => {
      const next = prev.filter(r => r.label.toLowerCase() !== label.toLowerCase());
      return [...next, { label, value: v }];
    });
    onSaved();
  };
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1">
      {DEFAULT_SCORECARD_LABELS.map(l => (
        <Box key={l} registrationId={registrationId} label={l} initial={read(scorecard, l)} onSaved={handleSaved} />
      ))}
      <span className="text-[10px] text-muted-foreground">BMI <span className="font-medium text-foreground tabular-nums">{bmi ?? '-'}</span></span>
      {!registrationId && <span className="text-[10px] text-muted-foreground italic">Match student first</span>}
    </div>
  );
};

export default PublicScorecardInline;
