/**
 * Grading Events settings dialog — grouped by date.
 * A grading date (+ host branch) is an "event"; the individual times are slots inside it.
 * Opened from the "Events" button on the Grading tab of /access.
 * Manages rows in grading_slots via SECURITY DEFINER admin RPCs.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Pencil, Copy, ChevronDown, ChevronRight } from 'lucide-react';
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

interface SlotForm {
  id: string | null;
  start_time: string;
  end_time: string;
  title: string;
  belt_levels: string[];
  grading_product_ids: string[];
  min_age: string;
  max_age: string;
  available_branch_ids: string[];
  registration_count: number;
}

interface EventForm {
  key: string | null;          // original group key (date|branch), null when new
  grading_date: string;
  branch_id: string;
  location: string;
  slots: SlotForm[];
  deletedIds: string[];
}

interface EventGroup {
  key: string;
  grading_date: string;
  branch_id: string | null;
  branch_name: string | null;
  location: string;
  slots: AdminGradingSlot[];
  registration_count: number;
}

const emptySlot = (): SlotForm => ({
  id: null,
  start_time: '',
  end_time: '',
  title: '',
  belt_levels: [],
  grading_product_ids: [],
  min_age: '',
  max_age: '',
  available_branch_ids: [],
  registration_count: 0,
});

const emptyEvent = (): EventForm => ({
  key: null,
  grading_date: '',
  branch_id: '',
  location: '',
  slots: [emptySlot()],
  deletedIds: [],
});

const timeStr = (t: string | null | undefined) => (t ? String(t).slice(0, 5) : '');

/** Replace any DD/MM/YYYY or YYYY-MM-DD occurrence in a title with the new event date. */
const retitleWithDate = (title: string, isoDate: string): string => {
  if (!title || !isoDate) return title;
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return title;
  return title
    .replace(/\b\d{2}\/\d{2}\/\d{4}\b/g, `${d}/${m}/${y}`)
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, `${y}-${m}-${d}`);
};

const GradingEventsSettingsDialog: React.FC<Props> = ({ open, onOpenChange, onChanged }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState<EventForm>(emptyEvent());
  const [openSlot, setOpenSlot] = useState<number | null>(0);
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
    if (!open) {
      setForm(emptyEvent());
      setOpenSlot(0);
    }
  }, [open]);

  // Group slots by date + branch
  const groups = useMemo<EventGroup[]>(() => {
    const map = new Map<string, EventGroup>();
    for (const s of slots) {
      const key = `${s.grading_date}|${s.branch_id || ''}`;
      let g = map.get(key);
      if (!g) {
        g = {
          key,
          grading_date: s.grading_date,
          branch_id: s.branch_id,
          branch_name: s.branch_name,
          location: s.location || '',
          slots: [],
          registration_count: 0,
        };
        map.set(key, g);
      }
      g.slots.push(s);
      g.registration_count += Number(s.registration_count || 0);
      if (!g.location && s.location) g.location = s.location;
    }
    const list = Array.from(map.values());
    list.forEach(g => g.slots.sort((a, b) => timeStr(a.start_time).localeCompare(timeStr(b.start_time))));
    list.sort((a, b) => b.grading_date.localeCompare(a.grading_date));
    return list;
  }, [slots]);

  const toSlotForm = (s: AdminGradingSlot, asNew: boolean): SlotForm => ({
    id: asNew ? null : s.id,
    start_time: timeStr(s.start_time),
    end_time: timeStr(s.end_time),
    title: s.title || '',
    belt_levels: Array.isArray(s.belt_levels) ? [...s.belt_levels] : [],
    grading_product_ids: Array.isArray(s.grading_product_ids) ? [...s.grading_product_ids] : [],
    min_age: s.min_age != null ? String(s.min_age) : '',
    max_age: s.max_age != null ? String(s.max_age) : '',
    available_branch_ids: Array.isArray(s.available_branch_ids) ? [...s.available_branch_ids] : [],
    registration_count: asNew ? 0 : Number(s.registration_count || 0),
  });

  const fillForm = (g: EventGroup, asNew = false) => {
    setForm({
      key: asNew ? null : g.key,
      grading_date: asNew ? '' : g.grading_date,
      branch_id: g.branch_id || '',
      location: g.location || '',
      slots: g.slots.map(s => toSlotForm(s, asNew)),
      deletedIds: [],
    });
    setOpenSlot(null);
    requestAnimationFrame(() => formPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-grading-slots'] });
    qc.invalidateQueries({ queryKey: ['public-grading-list'] });
    qc.invalidateQueries({ queryKey: ['public-grading-dates'] });
    qc.invalidateQueries({ queryKey: ['public-grading-slots-by-date'] });
    onChanged?.();
  };

  const updateSlot = (idx: number, patch: Partial<SlotForm>) => {
    setForm(f => ({
      ...f,
      slots: f.slots.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));
  };

  const toggleSlotList = (
    idx: number,
    key: 'belt_levels' | 'available_branch_ids' | 'grading_product_ids',
    value: string,
  ) => {
    setForm(f => ({
      ...f,
      slots: f.slots.map((s, i) => {
        if (i !== idx) return s;
        const list = s[key];
        const next = list.includes(value) ? list.filter(v => v !== value) : [...list, value];
        if (key === 'grading_product_ids') {
          const derived = deriveBeltLevels(next, products);
          return { ...s, grading_product_ids: next, belt_levels: derived.length ? derived : s.belt_levels };
        }
        return { ...s, [key]: next };
      }),
    }));
  };

  const addSlot = () => {
    setForm(f => ({ ...f, slots: [...f.slots, emptySlot()] }));
    setOpenSlot(form.slots.length);
  };

  const duplicateSlot = (idx: number) => {
    setForm(f => {
      const copy = { ...f.slots[idx], id: null, registration_count: 0 };
      const next = [...f.slots];
      next.splice(idx + 1, 0, copy);
      return { ...f, slots: next };
    });
    setOpenSlot(idx + 1);
  };

  const removeSlot = (idx: number) => {
    const s = form.slots[idx];
    if (s.registration_count > 0) {
      toast.error(`Cannot remove: ${s.registration_count} registration(s) linked to this slot`);
      return;
    }
    setForm(f => ({
      ...f,
      slots: f.slots.filter((_, i) => i !== idx),
      deletedIds: s.id ? [...f.deletedIds, s.id] : f.deletedIds,
    }));
    setOpenSlot(null);
  };

  const handleSave = async () => {
    if (!form.branch_id || !form.grading_date) {
      toast.error('Branch and date are required');
      return;
    }
    if (form.slots.length === 0) {
      toast.error('Add at least one slot');
      return;
    }
    setSaving(true);
    try {
      for (const id of form.deletedIds) {
        await adminDeleteGradingSlot(id);
      }
      for (const s of form.slots) {
        await adminUpsertGradingSlot({
          id: s.id,
          branch_id: form.branch_id,
          grading_date: form.grading_date,
          start_time: s.start_time || null,
          end_time: s.end_time || null,
          title: s.title.trim() || null,
          location: form.location.trim() || null,
          belt_levels: s.belt_levels,
          grading_product_ids: s.grading_product_ids,
          min_age: s.min_age !== '' ? parseInt(s.min_age, 10) : null,
          max_age: s.max_age !== '' ? parseInt(s.max_age, 10) : null,
          available_branch_ids: s.available_branch_ids,
        });
      }
      toast.success(form.key ? 'Grading event updated' : 'Grading event created');
      setForm(emptyEvent());
      setOpenSlot(0);
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save grading event');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (g: EventGroup) => {
    if (g.registration_count > 0) {
      toast.error(`Cannot delete: ${g.registration_count} registration(s) are linked to this event`);
      return;
    }
    const label = `${formatDate(g.grading_date)}${g.branch_name ? ' · ' + g.branch_name : ''}`;
    if (!window.confirm(`Delete grading event ${label} and all ${g.slots.length} slot(s)?`)) return;
    try {
      for (const s of g.slots) {
        await adminDeleteGradingSlot(s.id);
      }
      toast.success('Grading event deleted');
      if (form.key === g.key) setForm(emptyEvent());
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete grading event');
    }
  };

  const slotLabel = (s: SlotForm) => {
    const t = [s.start_time, s.end_time].filter(Boolean).join('–');
    return `${t || 'No time'}${s.title ? ' · ' + s.title : ''}`;
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
              <Button size="sm" variant="outline" onClick={() => { setForm(emptyEvent()); setOpenSlot(0); }}>
                <Plus className="h-3 w-3 mr-1" /> New
              </Button>
            </div>
            {isLoading && <div className="text-xs text-muted-foreground">Loading…</div>}
            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {groups.map(g => (
                <div
                  key={g.key}
                  className={`rounded border p-2 ${form.key === g.key ? 'border-primary bg-primary/5' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {formatDate(g.grading_date)}
                        {g.branch_name ? ` · ${g.branch_name}` : ''}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {g.slots.length} slot{g.slots.length === 1 ? '' : 's'}
                        {g.registration_count > 0 && (
                          <Badge variant="secondary" className="ml-2 text-[10px]">
                            {g.registration_count} registered
                          </Badge>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="text-blue-600 hover:text-blue-800"
                      onClick={() => fillForm(g)}
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => fillForm(g, true)}
                      title="Duplicate"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="text-red-600 hover:text-red-800"
                      onClick={() => handleDeleteEvent(g)}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {!isLoading && groups.length === 0 && (
                <div className="text-xs text-muted-foreground">No grading events yet.</div>
              )}
            </div>
          </div>

          {/* Form */}
          <div className="space-y-3" ref={formPanelRef}>
            <h3 className="text-sm font-medium">{form.key ? 'Edit event' : 'New event'}</h3>

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

            <div className="space-y-1">
              <Label className="text-xs">Location</Label>
              <Input
                className="h-8 text-sm"
                value={form.location}
                onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))}
              />
            </div>

            {/* Slots */}
            <div className="space-y-2 border rounded p-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Slots ({form.slots.length})</Label>
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={addSlot}>
                  <Plus className="h-3 w-3 mr-1" /> Add slot
                </Button>
              </div>

              {form.slots.map((s, idx) => {
                const expanded = openSlot === idx;
                return (
                  <div key={idx} className="rounded border">
                    <div className="flex items-center gap-2 p-2">
                      <button
                        type="button"
                        className="flex-1 min-w-0 flex items-center gap-1 text-left"
                        onClick={() => setOpenSlot(expanded ? null : idx)}
                      >
                        {expanded
                          ? <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                          : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                        <span className="text-xs truncate">{slotLabel(s)}</span>
                        {s.registration_count > 0 && (
                          <Badge variant="secondary" className="text-[10px]">{s.registration_count}</Badge>
                        )}
                      </button>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => duplicateSlot(idx)}
                        title="Duplicate slot"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="text-red-600 hover:text-red-800"
                        onClick={() => removeSlot(idx)}
                        title="Remove slot"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {expanded && (
                      <div className="space-y-2 border-t p-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Start time</Label>
                            <Input
                              type="time"
                              className="h-8 text-sm"
                              value={s.start_time}
                              onChange={(e) => updateSlot(idx, { start_time: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">End time</Label>
                            <Input
                              type="time"
                              className="h-8 text-sm"
                              value={s.end_time}
                              onChange={(e) => updateSlot(idx, { end_time: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Title</Label>
                          <Input
                            className="h-8 text-sm"
                            value={s.title}
                            onChange={(e) => updateSlot(idx, { title: e.target.value })}
                            placeholder="e.g. Stage 1 - 3"
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
                              value={s.min_age}
                              onChange={(e) => updateSlot(idx, { min_age: e.target.value })}
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
                              value={s.max_age}
                              onChange={(e) => updateSlot(idx, { max_age: e.target.value })}
                              placeholder="—"
                            />
                          </div>
                        </div>

                        {/* Available to branches */}
                        <div className="space-y-1 border rounded p-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Available to branches</Label>
                            {s.available_branch_ids.length > 0 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-[11px]"
                                onClick={() => updateSlot(idx, { available_branch_ids: [] })}
                              >
                                Clear (all branches)
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto">
                            {branches.map(b => (
                              <label key={b.id} className="flex items-center gap-2 text-xs cursor-pointer">
                                <Checkbox
                                  checked={s.available_branch_ids.includes(b.id)}
                                  onCheckedChange={() => toggleSlotList(idx, 'available_branch_ids', b.id)}
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
                            {s.grading_product_ids.length > 0 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-[11px]"
                                onClick={() => updateSlot(idx, { grading_product_ids: [] })}
                              >
                                Clear
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto">
                            {products.map(p => (
                              <label key={p.id} className="flex items-center gap-2 text-xs cursor-pointer">
                                <Checkbox
                                  checked={s.grading_product_ids.includes(p.id)}
                                  onCheckedChange={() => toggleSlotList(idx, 'grading_product_ids', p.id)}
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
                            {s.belt_levels.length > 0 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-[11px]"
                                onClick={() => updateSlot(idx, { belt_levels: [] })}
                              >
                                Clear (all belts)
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto">
                            {ALL_BELTS.map(b => (
                              <label key={b} className="flex items-center gap-2 text-xs cursor-pointer">
                                <Checkbox
                                  checked={s.belt_levels.includes(b)}
                                  onCheckedChange={() => toggleSlotList(idx, 'belt_levels', b)}
                                />
                                {b}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {form.slots.length === 0 && (
                <div className="text-[11px] text-muted-foreground">No slots — add at least one.</div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              {form.key && (
                <Button variant="outline" size="sm" onClick={() => { setForm(emptyEvent()); setOpenSlot(0); }} disabled={saving}>
                  Cancel edit
                </Button>
              )}
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {form.key ? 'Save changes' : 'Create event'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GradingEventsSettingsDialog;
