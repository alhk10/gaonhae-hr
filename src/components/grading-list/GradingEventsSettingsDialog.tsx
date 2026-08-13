/**
 * Grading Events settings dialog — mirror of SeminarEventsSettingsDialog.
 * Opened from the "Events" button on the Grading tab of /access.
 * Manages rows in grading_slots via SECURITY DEFINER admin RPCs.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Pencil, Copy } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { formatDate } from '@/utils/dateFormat';
import { SG_BELT_LEVELS, AU_BELT_LEVELS } from '@/constants/beltLevels';
import { deriveBeltLevels } from '@/utils/gradingProductBelts';
import {
  getPublicBranches,
  adminListGradingSlots,
  adminListGradingProducts,
  adminUpsertGradingSlot,
  adminDeleteGradingSlot,
  type AdminGradingSlot,
} from '@/services/gradingPaymentSubmissionService';

const ALL_BELTS: string[] = Array.from(new Set([...SG_BELT_LEVELS, ...AU_BELT_LEVELS]));

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}

const emptyForm = () => ({
  id: null as string | null,
  branch_id: '',
  grading_date: '',
  start_time: '',
  end_time: '',
  title: '',
  location: '',
  belt_levels: [] as string[],
  grading_product_ids: [] as string[],
  min_age: '' as string,
  max_age: '' as string,
  available_branch_ids: [] as string[],
});

const GradingEventsSettingsDialog: React.FC<Props> = ({ open, onOpenChange, onChanged }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const formPanelRef = useRef<HTMLDivElement>(null);

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ['admin-grading-slots'],
    queryFn: adminListGradingSlots,
    enabled: open,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['public-branches'],
    queryFn: getPublicBranches,
    staleTime: 5 * 60 * 1000,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['admin-grading-products'],
    queryFn: adminListGradingProducts,
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!open) setForm(emptyForm());
  }, [open]);

  const toggleInList = (key: 'belt_levels' | 'available_branch_ids' | 'grading_product_ids', value: string) => {
    setForm(f => {
      const list = f[key] as string[];
      const next = list.includes(value) ? list.filter(v => v !== value) : [...list, value];
      if (key === 'grading_product_ids') {
        const derived = deriveBeltLevels(next, products);
        return { ...f, grading_product_ids: next, belt_levels: derived.length ? derived : f.belt_levels };
      }
      return { ...f, [key]: next };
    });
  };

  const fillForm = (s: AdminGradingSlot, asNew = false) => {
    setForm({
      id: asNew ? null : s.id,
      branch_id: s.branch_id || '',
      grading_date: asNew ? '' : (s.grading_date || ''),
      start_time: s.start_time ? String(s.start_time).slice(0, 5) : '',
      end_time: s.end_time ? String(s.end_time).slice(0, 5) : '',
      title: s.title || '',
      location: s.location || '',
      belt_levels: Array.isArray(s.belt_levels) ? [...s.belt_levels] : [],
      grading_product_ids: Array.isArray(s.grading_product_ids) ? [...s.grading_product_ids] : [],
      min_age: s.min_age != null ? String(s.min_age) : '',
      max_age: s.max_age != null ? String(s.max_age) : '',
      available_branch_ids: Array.isArray(s.available_branch_ids) ? [...s.available_branch_ids] : [],
    });
    requestAnimationFrame(() => formPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-grading-slots'] });
    qc.invalidateQueries({ queryKey: ['public-grading-list'] });
    qc.invalidateQueries({ queryKey: ['public-grading-dates'] });
    qc.invalidateQueries({ queryKey: ['public-grading-slots-by-date'] });
    onChanged?.();
  };

  const handleSave = async () => {
    if (!form.branch_id || !form.grading_date) {
      toast.error('Branch and date are required');
      return;
    }
    setSaving(true);
    try {
      await adminUpsertGradingSlot({
        id: form.id,
        branch_id: form.branch_id,
        grading_date: form.grading_date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        title: form.title.trim() || null,
        location: form.location.trim() || null,
        belt_levels: form.belt_levels,
        grading_product_ids: form.grading_product_ids,
        min_age: form.min_age !== '' ? parseInt(form.min_age, 10) : null,
        max_age: form.max_age !== '' ? parseInt(form.max_age, 10) : null,
        available_branch_ids: form.available_branch_ids,
      });
      toast.success(form.id ? 'Grading event updated' : 'Grading event created');
      setForm(emptyForm());
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save grading event');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s: AdminGradingSlot) => {
    if (s.registration_count > 0) {
      toast.error(`Cannot delete: ${s.registration_count} registration(s) are linked to this event`);
      return;
    }
    const label = `${formatDate(s.grading_date)}${s.branch_name ? ' · ' + s.branch_name : ''}`;
    if (!window.confirm(`Delete grading event ${label}?`)) return;
    try {
      await adminDeleteGradingSlot(s.id);
      toast.success('Grading event deleted');
      if (form.id === s.id) setForm(emptyForm());
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete grading event');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Grading Events</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Events list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Events</h3>
              <Button size="sm" variant="outline" onClick={() => setForm(emptyForm())}>
                <Plus className="h-3 w-3 mr-1" /> New
              </Button>
            </div>
            {isLoading && <div className="text-xs text-muted-foreground">Loading…</div>}
            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {slots.map(s => (
                <div
                  key={s.id}
                  className={`rounded border p-2 ${form.id === s.id ? 'border-primary bg-primary/5' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {formatDate(s.grading_date)}
                        {s.start_time ? ` · ${String(s.start_time).slice(0, 5)}` : ''}
                        {s.branch_name ? ` · ${s.branch_name}` : ''}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {s.title || '—'}
                        {s.registration_count > 0 && (
                          <Badge variant="secondary" className="ml-2 text-[10px]">
                            {s.registration_count} registered
                          </Badge>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="text-blue-600 hover:text-blue-800"
                      onClick={() => fillForm(s)}
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => fillForm(s, true)}
                      title="Duplicate"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="text-red-600 hover:text-red-800"
                      onClick={() => handleDelete(s)}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {!isLoading && slots.length === 0 && (
                <div className="text-xs text-muted-foreground">No grading events yet.</div>
              )}
            </div>
          </div>

          {/* Form */}
          <div className="space-y-3" ref={formPanelRef}>
            <h3 className="text-sm font-medium">{form.id ? 'Edit event' : 'New event'}</h3>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Branch *</Label>
                <Select value={form.branch_id} onValueChange={(v) => setForm(f => ({ ...f, branch_id: v }))}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date *</Label>
                <Input
                  type="date"
                  className="h-8 text-sm"
                  value={form.grading_date}
                  onChange={(e) => setForm(f => ({ ...f, grading_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Start time</Label>
                <Input
                  type="time"
                  className="h-8 text-sm"
                  value={form.start_time}
                  onChange={(e) => setForm(f => ({ ...f, start_time: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End time</Label>
                <Input
                  type="time"
                  className="h-8 text-sm"
                  value={form.end_time}
                  onChange={(e) => setForm(f => ({ ...f, end_time: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Title</Label>
              <Input
                className="h-8 text-sm"
                value={form.title}
                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Term 3 Grading — Colour Belts"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Location</Label>
              <Input
                className="h-8 text-sm"
                value={form.location}
                onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Min age</Label>
                <Input
                  type="number"
                  min={0}
                  max={99}
                  className="h-8 text-sm"
                  value={form.min_age}
                  onChange={(e) => setForm(f => ({ ...f, min_age: e.target.value }))}
                  placeholder="—"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max age</Label>
                <Input
                  type="number"
                  min={0}
                  max={99}
                  className="h-8 text-sm"
                  value={form.max_age}
                  onChange={(e) => setForm(f => ({ ...f, max_age: e.target.value }))}
                  placeholder="—"
                />
              </div>
            </div>

            {/* Available to branches */}
            <div className="space-y-1 border rounded p-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Available to branches</Label>
                {form.available_branch_ids.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[11px]"
                    onClick={() => setForm(f => ({ ...f, available_branch_ids: [] }))}
                  >
                    Clear (all branches)
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto">
                {branches.map(b => (
                  <label key={b.id} className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox
                      checked={form.available_branch_ids.includes(b.id)}
                      onCheckedChange={() => toggleInList('available_branch_ids', b.id)}
                    />
                    {b.name}
                  </label>
                ))}
              </div>
            </div>

            {/* Grading products */}
            <div className="space-y-1 border rounded p-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Grading products</Label>
                {form.grading_product_ids.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[11px]"
                    onClick={() => setForm(f => ({ ...f, grading_product_ids: [] }))}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto">
                {products.map(p => (
                  <label key={p.id} className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox
                      checked={form.grading_product_ids.includes(p.id)}
                      onCheckedChange={() => toggleInList('grading_product_ids', p.id)}
                    />
                    {p.name}
                  </label>
                ))}
                {products.length === 0 && (
                  <div className="text-[11px] text-muted-foreground">No grading products found</div>
                )}
              </div>
            </div>

            {/* Belt levels */}
            <div className="space-y-1 border rounded p-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Belt levels</Label>
                {form.belt_levels.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[11px]"
                    onClick={() => setForm(f => ({ ...f, belt_levels: [] }))}
                  >
                    Clear (all belts)
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto">
                {ALL_BELTS.map(b => (
                  <label key={b} className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox
                      checked={form.belt_levels.includes(b)}
                      onCheckedChange={() => toggleInList('belt_levels', b)}
                    />
                    {b}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              {form.id && (
                <Button variant="outline" size="sm" onClick={() => setForm(emptyForm())} disabled={saving}>
                  Cancel edit
                </Button>
              )}
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {form.id ? 'Save changes' : 'Create event'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GradingEventsSettingsDialog;
