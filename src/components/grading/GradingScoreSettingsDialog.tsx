/** Per-branch scorecard settings (print on certificate, hide body metrics, custom fields). Superadmin / all-branch password only. */
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { X } from 'lucide-react';

export interface BranchScoreSettings { extra_fields: string[]; hide_body_metrics: boolean; print_scorecard: boolean }

const BranchRow: React.FC<{ branch: { id: string; name: string }; settings?: BranchScoreSettings; onChanged: () => void }> = ({ branch, settings, onChanged }) => {
  const [name, setName] = useState('');
  const fields = settings?.extra_fields ?? [];
  const hide = settings?.hide_body_metrics ?? false;
  const printCard = settings?.print_scorecard ?? true;
  const save = async (f: string[], h: boolean, p: boolean) => {
    const { error } = await (supabase.rpc as any)('access_grading_branch_score_settings_set', {
      p_password: sessionStorage.getItem('access_pw_v1') || '', p_branch_id: branch.id,
      p_extra_fields: f, p_hide_body: h, p_print_scorecard: p,
    });
    if (error) { toast.error(error.message); return; }
    onChanged();
  };
  const add = () => {
    const v = name.trim();
    if (!v) return;
    if (fields.some(f => f.toLowerCase() === v.toLowerCase())) { toast.error('Field already exists'); return; }
    setName(''); save([...fields, v], hide, printCard);
  };
  return (
    <div className="space-y-1.5 py-2">
      <div className="text-sm font-medium">{branch.name}</div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <label className="flex items-center gap-1.5">
          <Checkbox checked={printCard} onCheckedChange={(c) => save(fields, hide, !!c)} aria-label={`Print scorecard for ${branch.name}`} />
          Print scorecard on back of certificate
        </label>
        <label className="flex items-center gap-1.5">
          <Checkbox checked={hide} onCheckedChange={(c) => save(fields, !!c, printCard)} aria-label={`Hide height, weight and BMI for ${branch.name}`} />
          Hide height, weight and BMI
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-muted-foreground">Custom fields:</span>
        {fields.map(f => (
          <span key={f} className="inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5">
            {f}
            <button type="button" aria-label={`Remove ${f}`} onClick={() => save(fields.filter(x => x !== f), hide, printCard)}><X className="h-3 w-3" /></button>
          </span>
        ))}
        <Input value={name} maxLength={40} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add(); }} placeholder="New field" className="h-7 w-32 text-xs" />
        <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={add}>Add field</Button>
      </div>
    </div>
  );
};

export const GradingScoreSettingsDialog: React.FC<{
  open: boolean; onOpenChange: (o: boolean) => void;
  branches: { id: string; name: string }[]; settings: Record<string, BranchScoreSettings>; onChanged: () => void;
}> = ({ open, onOpenChange, branches, settings, onChanged }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Scorecard settings by branch</DialogTitle></DialogHeader>
      <div className="divide-y">
        {branches.map(b => <BranchRow key={b.id} branch={b} settings={settings[b.id]} onChanged={onChanged} />)}
      </div>
    </DialogContent>
  </Dialog>
);
export default GradingScoreSettingsDialog;
