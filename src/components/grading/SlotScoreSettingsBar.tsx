/** Per-slot extra score fields + "hide height, weight and BMI" switch for /access grading. */
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { X } from 'lucide-react';

export interface SlotScoreSettings { extra_fields: string[]; hide_body_metrics: boolean; print_scorecard?: boolean }

export const SlotScoreSettingsBar: React.FC<{ slotId: string; settings?: SlotScoreSettings; onChanged: () => void }> = ({ slotId, settings, onChanged }) => {
  const [name, setName] = useState('');
  const fields = settings?.extra_fields ?? [];
  const hide = settings?.hide_body_metrics ?? false;
  const printCard = settings?.print_scorecard ?? true;
  const save = async (nextFields: string[], nextHide: boolean, nextPrint: boolean = printCard) => {
    const pw = sessionStorage.getItem('access_pw_v1') || '';
    const { error } = await (supabase.rpc as any)('access_grading_slot_score_settings_set', {
      p_password: pw, p_slot_id: slotId, p_extra_fields: nextFields, p_hide_body: nextHide, p_print_scorecard: nextPrint,
    });
    if (error) { toast.error(error.message); return; }
    onChanged();
  };
  const add = () => {
    const v = name.trim();
    if (!v) return;
    if (fields.some(f => f.toLowerCase() === v.toLowerCase())) { toast.error('Field already exists'); return; }
    setName('');
    save([...fields, v], hide);
  };
  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-1 text-[11px] text-muted-foreground">
      <label className="flex items-center gap-1">
        <Checkbox checked={hide} onCheckedChange={(c) => save(fields, !!c)} aria-label="Hide height, weight and BMI" />
        Hide height, weight and BMI
      </label>
      <label className="flex items-center gap-1">
        <Checkbox checked={printCard} onCheckedChange={(c) => save(fields, hide, !!c)} aria-label="Print scorecard on certificate" />
        Print scorecard on certificate
      </label>
      <span>Custom fields:</span>
      {fields.map(f => (
        <span key={f} className="inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5">
          {f}
          <button type="button" aria-label={`Remove ${f}`} onClick={() => save(fields.filter(x => x !== f), hide)}><X className="h-3 w-3" /></button>
        </span>
      ))}
      <Input value={name} maxLength={40} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add(); }} placeholder="New field" className="h-6 w-28 text-xs" />
      <Button type="button" size="sm" variant="outline" className="h-6 px-2 text-[11px]" onClick={add}>Add field</Button>
    </div>
  );
};
export default SlotScoreSettingsBar;
