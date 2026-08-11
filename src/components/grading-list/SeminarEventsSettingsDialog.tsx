/**
 * Seminar Events settings dialog — mirror of CompetitionEventsSettingsDialog.
 * Opened from the "Events" button on the Seminars tab of /access.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Pencil, Download, Upload, X, Copy } from 'lucide-react';
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
import { formatDate } from '@/utils/dateFormat';
import {
  getPublicSeminarEvents,
  adminUpsertSeminarEvent,
  adminDeleteSeminarEvent,
  adminSetSeminarEventActive,
  uploadSeminarIndemnityTemplate,
  type SeminarEvent,
  type SeminarPackageOption,
} from '@/services/seminarPaymentSubmissionService';
import { getPublicBranches } from '@/services/gradingPaymentSubmissionService';
import { SG_BELT_LEVELS, AU_BELT_LEVELS } from '@/constants/beltLevels';

const ALL_BELTS: string[] = Array.from(new Set([...SG_BELT_LEVELS, ...AU_BELT_LEVELS]));

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'package';

const emptyForm = () => ({
  id: null as string | null,
  name: '',
  is_active: true,
  display_order: 0,
  packages: [] as SeminarPackageOption[],
  indemnity_clause: '',
  indemnity_template_url: null as string | null,
  indemnity_template_name: null as string | null,
  require_passport: false,
  require_photo: false,
  require_grading_card: false,
  multi_package_discount: false,
  min_packages: 2,
  branch_ids: [] as string[],
  belts: [] as string[],
});

const SeminarEventsSettingsDialog: React.FC<Props> = ({ open, onOpenChange }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const formPanelRef = useRef<HTMLDivElement>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['seminar-events-admin'],
    queryFn: getPublicSeminarEvents,
    enabled: open,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['public-branches'],
    queryFn: getPublicBranches,
    staleTime: 5 * 60 * 1000,
  });

  const toggleInList = (key: 'branch_ids' | 'belts', value: string) => {
    setForm(f => ({
      ...f,
      [key]: (f[key] as string[]).includes(value)
        ? (f[key] as string[]).filter(v => v !== value)
        : [...(f[key] as string[]), value],
    }));
  };

  useEffect(() => {
    if (!open) setForm(emptyForm());
  }, [open]);

  const startEdit = (e: SeminarEvent) => {
    setForm({
      id: e.id,
      name: e.name,
      is_active: e.is_active,
      display_order: e.display_order,
      packages: (e.packages || []).map(p => ({
        code: p.code,
        label: p.label,
        description: p.description ?? '',
        amount: Number(p.amount || 0),
        session_dates: Array.isArray(p.session_dates) ? p.session_dates : [],
      })),
      indemnity_clause: e.indemnity_clause || '',
      indemnity_template_url: e.indemnity_template_url ?? null,
      indemnity_template_name: e.indemnity_template_name ?? null,
      require_passport: e.require_passport === true,
      require_photo: e.require_photo === true,
      require_grading_card: e.require_grading_card === true,
      multi_package_discount: e.multi_package_discount === true,
      min_packages: Math.max(2, Number(e.min_packages) || 2),
      branch_ids: Array.isArray(e.branch_ids) ? [...e.branch_ids] : [],
      belts: Array.isArray(e.belts) ? [...e.belts] : [],
    });
    requestAnimationFrame(() => formPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const duplicateEvent = (e: SeminarEvent) => {
    setForm({
      id: null,
      name: `${e.name} (Copy)`,
      is_active: false,
      display_order: e.display_order,
      packages: (e.packages || []).map(p => ({
        code: p.code,
        label: p.label,
        description: p.description ?? '',
        amount: Number(p.amount || 0),
        session_dates: Array.isArray(p.session_dates) ? [...p.session_dates] : [],
      })),
      indemnity_clause: e.indemnity_clause || '',
      indemnity_template_url: e.indemnity_template_url ?? null,
      indemnity_template_name: e.indemnity_template_name ?? null,
      require_passport: e.require_passport === true,
      require_photo: e.require_photo === true,
      require_grading_card: e.require_grading_card === true,
      multi_package_discount: e.multi_package_discount === true,
      min_packages: Math.max(2, Number(e.min_packages) || 2),
      branch_ids: Array.isArray(e.branch_ids) ? [...e.branch_ids] : [],
      belts: Array.isArray(e.belts) ? [...e.belts] : [],
    });
    requestAnimationFrame(() => {
      formPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      nameInputRef.current?.focus();
    });
    toast.success('Event copied — review and press Create event to save');
  };

  const handleNewClick = () => {
    setForm(emptyForm());
    requestAnimationFrame(() => {
      formPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      nameInputRef.current?.focus();
    });
  };

  const handleTemplateUpload = async (file: File | null) => {
    if (!file) return;
    setUploadingTemplate(true);
    try {
      const url = await uploadSeminarIndemnityTemplate(file);
      setForm(prev => ({ ...prev, indemnity_template_url: url, indemnity_template_name: file.name }));
      toast.success('Template uploaded');
    } catch (err: any) {
      toast.error('Upload failed', { description: err?.message || 'Unknown error' });
    } finally {
      setUploadingTemplate(false);
      if (templateInputRef.current) templateInputRef.current.value = '';
    }
  };

  const updatePackage = (idx: number, patch: Partial<SeminarPackageOption>) => {
    setForm(prev => ({
      ...prev,
      packages: prev.packages.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    }));
  };

  const addPackage = () => {
    setForm(prev => ({
      ...prev,
      packages: [...prev.packages, { code: '', label: '', description: '', amount: 0, session_dates: [] }],
    }));
  };

  const removePackage = (idx: number) => {
    setForm(prev => ({ ...prev, packages: prev.packages.filter((_, i) => i !== idx) }));
  };

  const [dateDrafts, setDateDrafts] = useState<Record<number, string>>({});

  const addSessionDate = (idx: number) => {
    const raw = (dateDrafts[idx] || '').trim();
    // Accept DD/MM/YYYY
    const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) {
      toast.error('Enter the date as DD/MM/YYYY');
      return;
    }
    const iso = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    if (Number.isNaN(new Date(iso).getTime())) {
      toast.error('That date is not valid');
      return;
    }
    const pkg = form.packages[idx];
    if ((pkg.session_dates || []).includes(iso)) {
      toast.error('Date already added');
      return;
    }
    updatePackage(idx, { session_dates: [...(pkg.session_dates || []), iso].sort() });
    setDateDrafts(d => ({ ...d, [idx]: '' }));
  };

  const removeSessionDate = (idx: number, iso: string) => {
    const pkg = form.packages[idx];
    updatePackage(idx, { session_dates: (pkg.session_dates || []).filter(d => d !== iso) });
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Event name is required'); return; }
    const packages = form.packages
      .map(p => ({
        code: (p.code || '').trim() || slugify(p.label),
        label: (p.label || '').trim(),
        description: (p.description || '').trim() || null,
        amount: Number(p.amount) || 0,
        session_dates: p.session_dates || [],
      }))
      .filter(p => p.label);
    if (packages.length === 0) { toast.error('Add at least one package'); return; }
    const codes = new Set<string>();
    for (const p of packages) {
      if (codes.has(p.code)) { toast.error(`Duplicate package code "${p.code}"`); return; }
      codes.add(p.code);
    }

    setSaving(true);
    try {
      await adminUpsertSeminarEvent({
        id: form.id,
        name: form.name.trim(),
        is_active: form.is_active,
        display_order: Number(form.display_order) || 0,
        packages,
        indemnity_clause: form.indemnity_clause.trim() || null,
        indemnity_template_url: form.indemnity_template_url,
        indemnity_template_name: form.indemnity_template_name,
        require_passport: form.require_passport,
        require_photo: form.require_photo,
        require_grading_card: form.require_grading_card,
        multi_package_discount: form.multi_package_discount,
        min_packages: Math.max(2, Number(form.min_packages) || 2),
        branch_ids: form.branch_ids,
        belts: form.belts,
      });
      toast.success(form.id ? 'Event updated' : 'Event created');
      qc.invalidateQueries({ queryKey: ['seminar-events-admin'] });
      qc.invalidateQueries({ queryKey: ['public-seminar-events'] });
      qc.invalidateQueries({ queryKey: ['seminar-events-filter'] });
      setForm(emptyForm());
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (e: SeminarEvent, next: boolean) => {
    try {
      await adminSetSeminarEventActive(e.id, next);
      qc.invalidateQueries({ queryKey: ['seminar-events-admin'] });
      qc.invalidateQueries({ queryKey: ['public-seminar-events'] });
      qc.invalidateQueries({ queryKey: ['seminar-events-filter'] });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update');
    }
  };

  const handleDelete = async (e: SeminarEvent) => {
    if (!window.confirm(`Delete event "${e.name}"? This cannot be undone.`)) return;
    try {
      await adminDeleteSeminarEvent(e.id);
      toast.success('Event deleted');
      qc.invalidateQueries({ queryKey: ['seminar-events-admin'] });
      qc.invalidateQueries({ queryKey: ['public-seminar-events'] });
      qc.invalidateQueries({ queryKey: ['seminar-events-filter'] });
      if (form.id === e.id) setForm(emptyForm());
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Seminar Events</DialogTitle>
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
              {events.map(e => (
                <div
                  key={e.id}
                  className={`rounded border p-2 ${form.id === e.id ? 'border-primary bg-primary/5' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{e.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {(e.packages || []).length} package{(e.packages || []).length === 1 ? '' : 's'}
                        {!e.is_active && <Badge variant="secondary" className="ml-2 text-[10px]">Inactive</Badge>}
                      </div>
                    </div>
                    <Switch
                      checked={e.is_active}
                      onCheckedChange={(v) => handleToggleActive(e, v)}
                    />
                    <button
                      type="button"
                      className="text-blue-600 hover:text-blue-800"
                      onClick={() => startEdit(e)}
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => duplicateEvent(e)}
                      title="Duplicate"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="text-red-600 hover:text-red-800"
                      onClick={() => handleDelete(e)}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {!isLoading && events.length === 0 && (
                <div className="text-xs text-muted-foreground">No events yet.</div>
              )}
            </div>
          </div>

          {/* Form */}
          <div className="space-y-3" ref={formPanelRef}>
            <h3 className="text-sm font-medium">{form.id ? 'Edit event' : 'New event'}</h3>

            <div className="space-y-1">
              <Label className="text-xs">Event name *</Label>
              <Input
                ref={nameInputRef}
                className="h-8 text-sm"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Unarmed Combat Seminar (Jun 2026)"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Display order</Label>
                <Input
                  type="number"
                  className="h-8 text-sm"
                  value={form.display_order}
                  onChange={(e) => setForm(f => ({ ...f, display_order: Number(e.target.value) || 0 }))}
                />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm(f => ({ ...f, is_active: v }))}
                />
                <span className="text-xs">Active (bookable on /seminars)</span>
              </div>
            </div>

            {/* Packages */}
            <div className="space-y-2 border rounded p-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Packages</Label>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addPackage}>
                  <Plus className="h-3 w-3 mr-1" /> Add package
                </Button>
              </div>
              <div className="flex items-start gap-2 rounded bg-muted/40 p-2">
                <Switch
                  checked={form.multi_package_discount}
                  onCheckedChange={(v) => setForm(f => ({ ...f, multi_package_discount: v }))}
                />
                <div className="text-[11px] leading-snug">
                  <div className="font-medium">Multi-package discount</div>
                  <div className="text-muted-foreground">
                    Participants may pick several packages: $10 off once they reach the minimum below, +$10 for each extra package.
                  </div>
                </div>
              </div>
              {form.multi_package_discount && (
                <div className="flex items-center gap-2 rounded bg-muted/40 p-2">
                  <div className="text-[11px] leading-snug flex-1">
                    <div className="font-medium">Minimum number of packages</div>
                    <div className="text-muted-foreground">
                      Discount starts at {Math.max(2, Number(form.min_packages) || 2)} packages ($10 off).
                    </div>
                  </div>
                  <Input
                    type="number"
                    min={2}
                    step={1}
                    className="h-7 w-16 text-xs"
                    value={form.min_packages}
                    onChange={(e) => setForm(f => ({ ...f, min_packages: Math.max(2, Number(e.target.value) || 2) }))}
                  />
                </div>
              )}
              {form.packages.length === 0 && (
                <div className="text-[11px] text-muted-foreground">No packages yet.</div>
              )}
              {form.packages.map((p, idx) => (
                <div key={idx} className="space-y-1 border rounded p-2 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Input
                      className="h-7 text-xs flex-1"
                      placeholder="Package label (shown to the public)"
                      value={p.label}
                      onChange={(e) => updatePackage(idx, { label: e.target.value })}
                    />
                    <Input
                      className="h-7 text-xs w-24"
                      type="number"
                      step="0.01"
                      placeholder="Amount"
                      value={p.amount}
                      onChange={(e) => updatePackage(idx, { amount: Number(e.target.value) || 0 })}
                    />
                    <button
                      type="button"
                      className="text-red-600 hover:text-red-800"
                      onClick={() => removePackage(idx)}
                      title="Remove package"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <Textarea
                    className="text-xs min-h-[48px]"
                    placeholder="Description (optional, shown under the package name)"
                    value={p.description || ''}
                    onChange={(e) => updatePackage(idx, { description: e.target.value })}
                  />

                  <div className="flex flex-wrap items-center gap-1">
                    {(p.session_dates || []).map(d => (
                      <Badge key={d} variant="secondary" className="text-[10px] gap-1">
                        {formatDate(d)}
                        <button type="button" onClick={() => removeSessionDate(idx, d)}>
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    ))}
                    <Input
                      className="h-6 text-[11px] w-28"
                      placeholder="DD/MM/YYYY"
                      value={dateDrafts[idx] || ''}
                      onChange={(e) => setDateDrafts(d => ({ ...d, [idx]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); addSessionDate(idx); }
                      }}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[11px] px-2"
                      onClick={() => addSessionDate(idx)}
                    >
                      Add date
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Indemnity */}
            <div className="space-y-1">
              <Label className="text-xs">Indemnity clause (leave blank to skip signature)</Label>
              <Textarea
                className="text-xs min-h-[100px]"
                value={form.indemnity_clause}
                onChange={(e) => setForm(f => ({ ...f, indemnity_clause: e.target.value }))}
                placeholder="Participants must read and sign this text before submitting."
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Indemnity form template (PDF)</Label>
              <input
                ref={templateInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => handleTemplateUpload(e.target.files?.[0] ?? null)}
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={uploadingTemplate}
                  onClick={() => templateInputRef.current?.click()}
                >
                  <Upload className="h-3 w-3 mr-1" />
                  {uploadingTemplate ? 'Uploading…' : 'Upload template'}
                </Button>
                {form.indemnity_template_url && (
                  <>
                    <a
                      href={form.indemnity_template_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <Download className="h-3 w-3" />
                      {form.indemnity_template_name || 'Template.pdf'}
                    </a>
                    <button
                      type="button"
                      className="text-red-600 hover:text-red-800"
                      onClick={() => setForm(f => ({ ...f, indemnity_template_url: null, indemnity_template_name: null }))}
                      title="Remove template"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Targeting */}
            <div className="space-y-3 border rounded p-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Branches</Label>
                  {form.branch_ids.length > 0 && (
                    <button
                      type="button"
                      className="text-[11px] text-primary hover:underline"
                      onClick={() => setForm(f => ({ ...f, branch_ids: [] }))}
                    >
                      Clear (all branches)
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Leave all unticked to offer this event to every branch.
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {branches.map(b => (
                    <div key={b.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`sem-branch-${b.id}`}
                        checked={form.branch_ids.includes(b.id)}
                        onCheckedChange={() => toggleInList('branch_ids', b.id)}
                      />
                      <Label htmlFor={`sem-branch-${b.id}`} className="text-xs font-normal cursor-pointer">
                        {b.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Belts</Label>
                  {form.belts.length > 0 && (
                    <button
                      type="button"
                      className="text-[11px] text-primary hover:underline"
                      onClick={() => setForm(f => ({ ...f, belts: [] }))}
                    >
                      Clear (all belts)
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Leave all unticked to offer this event to every belt level.
                </p>
                <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto pr-1">
                  {ALL_BELTS.map(b => (
                    <div key={b} className="flex items-center gap-2">
                      <Checkbox
                        id={`sem-belt-${b}`}
                        checked={form.belts.includes(b)}
                        onCheckedChange={() => toggleInList('belts', b)}
                      />
                      <Label htmlFor={`sem-belt-${b}`} className="text-xs font-normal cursor-pointer">
                        {b}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Requirements */}
            <div className="space-y-2 border rounded p-2">
              <Label className="text-xs font-medium">Required uploads</Label>
              {([
                ['require_passport', 'Passport / identification'],
                ['require_photo', 'Photo'],
                ['require_grading_card', 'Grading card'],
              ] as const).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    id={`seminar-${key}`}
                    checked={(form as any)[key]}
                    onCheckedChange={(v) => setForm(f => ({ ...f, [key]: v === true }))}
                  />
                  <Label htmlFor={`seminar-${key}`} className="text-xs font-normal cursor-pointer">
                    {label}
                  </Label>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : form.id ? 'Update event' : 'Create event'}
              </Button>
              {form.id && (
                <Button size="sm" variant="ghost" onClick={() => setForm(emptyForm())}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SeminarEventsSettingsDialog;
