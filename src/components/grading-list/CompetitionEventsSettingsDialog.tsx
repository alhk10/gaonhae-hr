import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Pencil } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  getPublicCompetitionEvents,
  adminUpsertCompetitionEvent,
  adminDeleteCompetitionEvent,
  adminSetCompetitionEventActive,
  type CompetitionEvent,
  type CompetitionExtraLine,
} from '@/services/competitionPaymentSubmissionService';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const emptyForm = () => ({
  id: null as string | null,
  name: '',
  is_active: true,
  display_order: 0,
  indemnity_clause: '',
  require_indemnity_form: false,
  require_passport: false,
  require_photo: false,
  coaching_label: '',
  coaching_amount: 0,
  coaching_required: true,
  extra_lines: [] as CompetitionExtraLine[],
});

const CompetitionEventsSettingsDialog: React.FC<Props> = ({ open, onOpenChange }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const formPanelRef = useRef<HTMLDivElement>(null);

  const handleNewClick = () => {
    setForm(emptyForm());
    requestAnimationFrame(() => {
      formPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      nameInputRef.current?.focus();
    });
  };

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['competition-events-admin'],
    queryFn: getPublicCompetitionEvents,
    enabled: open,
  });

  useEffect(() => {
    if (!open) setForm(emptyForm());
  }, [open]);

  const startEdit = (e: CompetitionEvent) => {
    setForm({
      id: e.id,
      name: e.name,
      is_active: e.is_active,
      display_order: e.display_order,
      indemnity_clause: e.indemnity_clause || '',
      require_indemnity_form: e.require_indemnity_form,
      require_passport: e.require_passport,
      require_photo: e.require_photo,
      coaching_label: e.coaching_label || '',
      coaching_amount: Number(e.coaching_amount || 0),
      coaching_required: e.coaching_required !== false,
      extra_lines: (e.extra_lines || []).map(l => ({
        label: l.label,
        amount: Number(l.amount || 0),
        required: l.required === true,
      })),
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Event name is required'); return; }
    if (!form.coaching_label.trim()) { toast.error('Coaching item name is required'); return; }
    setSaving(true);
    try {
      await adminUpsertCompetitionEvent({
        id: form.id,
        name: form.name.trim(),
        is_active: form.is_active,
        display_order: form.display_order,
        indemnity_clause: form.indemnity_clause.trim() || null,
        require_indemnity_form: form.require_indemnity_form,
        require_passport: form.require_passport,
        require_photo: form.require_photo,
        coaching_label: form.coaching_label.trim(),
        coaching_amount: Number(form.coaching_amount) || 0,
        coaching_required: form.coaching_required,
        extra_lines: form.extra_lines
          .map(l => ({
            label: (l.label || '').trim(),
            amount: Number(l.amount) || 0,
            required: l.required === true,
          }))
          .filter(l => l.label || l.amount > 0),
      });
      toast.success(form.id ? 'Event updated' : 'Event created');
      qc.invalidateQueries({ queryKey: ['competition-events-admin'] });
      qc.invalidateQueries({ queryKey: ['public-competition-events'] });
      setForm(emptyForm());
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (e: CompetitionEvent, next: boolean) => {
    try {
      await adminSetCompetitionEventActive(e.id, next);
      qc.invalidateQueries({ queryKey: ['competition-events-admin'] });
      qc.invalidateQueries({ queryKey: ['public-competition-events'] });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update');
    }
  };

  const handleDelete = async (e: CompetitionEvent) => {
    if (!window.confirm(`Delete event "${e.name}"? This cannot be undone.`)) return;
    try {
      await adminDeleteCompetitionEvent(e.id);
      toast.success('Event deleted');
      qc.invalidateQueries({ queryKey: ['competition-events-admin'] });
      qc.invalidateQueries({ queryKey: ['public-competition-events'] });
      if (form.id === e.id) setForm(emptyForm());
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete');
    }
  };

  const updateExtra = (idx: number, patch: Partial<CompetitionExtraLine>) => {
    setForm(prev => ({
      ...prev,
      extra_lines: prev.extra_lines.map((l, i) => i === idx ? { ...l, ...patch } : l),
    }));
  };

  const addExtra = () => {
    setForm(prev => ({ ...prev, extra_lines: [...prev.extra_lines, { label: '', amount: 0 }] }));
  };

  const removeExtra = (idx: number) => {
    setForm(prev => ({ ...prev, extra_lines: prev.extra_lines.filter((_, i) => i !== idx) }));
  };

  const signatureRequired = form.indemnity_clause.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Competition Events</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Events list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Events</h3>
              <Button size="sm" variant="outline" onClick={handleNewClick}>
                <Plus className="h-3 w-3 mr-1" /> New
              </Button>
            </div>
            {isLoading && <div className="text-xs text-muted-foreground">Loading…</div>}
            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {events.map(e => {
                const extraCount = (e.extra_lines || []).length;
                return (
                  <div
                    key={e.id}
                    className={`flex items-center gap-2 border rounded p-2 text-sm ${form.id === e.id ? 'bg-muted/50 border-primary' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate flex items-center gap-2">
                        {e.name}
                        {!e.is_active && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {e.coaching_label || 'No coaching item'} · ${Number(e.coaching_amount || 0).toFixed(2)}
                        {extraCount > 0 ? ` · ${extraCount} extra` : ''}
                      </div>
                    </div>
                    <Switch checked={e.is_active} onCheckedChange={(v) => handleToggleActive(e, v)} />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(e)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" onClick={() => handleDelete(e)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
              {!isLoading && events.length === 0 && (
                <div className="text-xs text-muted-foreground border rounded p-3 text-center">
                  No events yet. Create one on the right.
                </div>
              )}
            </div>
          </div>

          {/* Edit/create form */}
          <div ref={formPanelRef} className="space-y-3 border-l md:pl-4">
            <h3 className="text-sm font-medium">{form.id ? 'Edit event' : 'New event'}</h3>

            <div className="space-y-1">
              <Label className="text-xs">Competition Name *</Label>
              <Input
                ref={nameInputRef}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Singapore Open Poomsae 2026"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Display order</Label>
                <Input
                  type="number"
                  value={form.display_order}
                  onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Active</Label>
                <div className="flex items-center h-10">
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 border rounded p-3">
              <Label className="text-xs font-semibold">Coaching line *</Label>
              <div className="grid grid-cols-[1fr_120px] gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Name</Label>
                  <Input
                    value={form.coaching_label}
                    onChange={(e) => setForm({ ...form, coaching_label: e.target.value })}
                    placeholder="e.g. Coaching Fee"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.coaching_amount}
                    onChange={(e) => setForm({ ...form, coaching_amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="coaching-required"
                  checked={form.coaching_required}
                  onCheckedChange={(c) => setForm({ ...form, coaching_required: c === true })}
                />
                <Label htmlFor="coaching-required" className="text-xs font-normal cursor-pointer">
                  Compulsory (auto-added, customer cannot opt out)
                </Label>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Amount entered is the total charged (no GST is added).
              </p>
            </div>

            <div className="space-y-2 border rounded p-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Additional lines</Label>
                <Button type="button" size="sm" variant="outline" onClick={addExtra}>
                  <Plus className="h-3 w-3 mr-1" /> Add line
                </Button>
              </div>
              {form.extra_lines.length === 0 && (
                <p className="text-[11px] text-muted-foreground">No additional lines.</p>
              )}
              <div className="space-y-2">
                {form.extra_lines.map((line, idx) => (
                  <div key={idx} className="space-y-1 border rounded p-2">
                    <div className="grid grid-cols-[1fr_120px_auto] gap-2 items-end">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Name</Label>
                        <Input
                          value={line.label}
                          onChange={(e) => updateExtra(idx, { label: e.target.value })}
                          placeholder="e.g. Individual Poomsae"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Amount</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.amount}
                          onChange={(e) => updateExtra(idx, { amount: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-red-600" onClick={() => removeExtra(idx)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 pl-1">
                      <Checkbox
                        id={`extra-required-${idx}`}
                        checked={line.required === true}
                        onCheckedChange={(c) => updateExtra(idx, { required: c === true })}
                      />
                      <Label htmlFor={`extra-required-${idx}`} className="text-[11px] font-normal cursor-pointer">
                        Compulsory (auto-added, customer cannot opt out)
                      </Label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Indemnity clause text</Label>
              <Textarea
                value={form.indemnity_clause}
                onChange={(e) => setForm({ ...form, indemnity_clause: e.target.value })}
                placeholder="Leave blank if no indemnity required. Signature is auto-required when this is filled."
                rows={4}
              />
              <p className="text-[11px] text-muted-foreground">
                {signatureRequired
                  ? 'Signature will be required on the public form.'
                  : 'No clause set — signature will not be requested.'}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Required uploads</Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="req-indemnity"
                  checked={form.require_indemnity_form}
                  onCheckedChange={(c) => setForm({ ...form, require_indemnity_form: c === true })}
                />
                <Label htmlFor="req-indemnity" className="text-xs font-normal cursor-pointer">
                  Indemnity form upload
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="req-passport"
                  checked={form.require_passport}
                  onCheckedChange={(c) => setForm({ ...form, require_passport: c === true })}
                />
                <Label htmlFor="req-passport" className="text-xs font-normal cursor-pointer">
                  Passport upload
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="req-photo"
                  checked={form.require_photo}
                  onCheckedChange={(c) => setForm({ ...form, require_photo: c === true })}
                />
                <Label htmlFor="req-photo" className="text-xs font-normal cursor-pointer">
                  Photo upload
                </Label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {form.id && (
                <Button variant="outline" onClick={() => setForm(emptyForm())} disabled={saving}>
                  Cancel
                </Button>
              )}
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : form.id ? 'Save changes' : 'Create event'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompetitionEventsSettingsDialog;
