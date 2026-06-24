/**
 * Admin edit dialog for a single competition_payment_submissions row.
 * Opened from the Competitions tab pencil icon on /grading-list.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { getBeltLevelsForCountry } from '@/constants/beltLevels';
import {
  getCompetitionSubmissionForEdit,
  adminPatchCompetitionSubmission,
  adminReplaceCompetitionSubmissionFile,
  updateCompetitionSubmissionCategories,
  getPublicCompetitionEvents,
} from '@/services/competitionPaymentSubmissionService';
import { getPublicBranches } from '@/services/gradingPaymentSubmissionService';
import { SignedImage } from '@/components/common/SignedMedia';

interface Props {
  submissionId: string | null;
  onClose: () => void;
  onSaved?: () => void;
}

const POOMSAE_OPTIONS = [
  'Taegeuk 1','Taegeuk 2','Taegeuk 3','Taegeuk 4','Taegeuk 5','Taegeuk 6','Taegeuk 7','Taegeuk 8',
  'Koryo','Keumgang','Taebaek','Pyongwon','Sipjin','Jitae','Chonkwon','Hansu',
];

const FILE_FIELDS: Array<{ kind: 'proof' | 'certificate' | 'signature' | 'indemnity' | 'passport' | 'photo'; label: string; col: string }> = [
  { kind: 'proof', label: 'Payment proof', col: 'proof_url' },
  { kind: 'certificate', label: 'Belt certificate', col: 'certificate_url' },
  { kind: 'signature', label: 'Signature', col: 'signature_url' },
  { kind: 'indemnity', label: 'Indemnity form', col: 'indemnity_form_url' },
  { kind: 'passport', label: 'Passport', col: 'passport_url' },
  { kind: 'photo', label: 'Photo', col: 'photo_url' },
];

const EditCompetitionSubmissionDialog: React.FC<Props> = ({ submissionId, onClose, onSaved }) => {
  const open = !!submissionId;

  const { data: row, refetch, isLoading } = useQuery({
    queryKey: ['competition-submission-edit', submissionId],
    queryFn: () => getCompetitionSubmissionForEdit(submissionId!),
    enabled: !!submissionId,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['public-branches'],
    queryFn: getPublicBranches,
    staleTime: 5 * 60 * 1000,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['public-competition-events'],
    queryFn: getPublicCompetitionEvents,
    staleTime: 5 * 60 * 1000,
  });

  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [uploadingKind, setUploadingKind] = useState<string | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [extraCategoryLines, setExtraCategoryLines] = useState<Array<{ label: string; amount: number }>>([]);
  const [otherExtraLines, setOtherExtraLines] = useState<any[]>([]);
  const [originalCategoryIds, setOriginalCategoryIds] = useState<string[]>([]);

  useEffect(() => {
    if (row) {
      setForm({
        first_name: row.first_name ?? '',
        last_name: row.last_name ?? '',
        email: row.email ?? '',
        date_of_birth: row.date_of_birth ?? '',
        gender: row.gender ?? '',
        branch_id: row.branch_id ?? '',
        current_belt: row.current_belt ?? '',
        amount: row.amount ?? 0,
        poomsae_1: row.poomsae_1 ?? '',
        poomsae_2: row.poomsae_2 ?? '',
        court: row.court ?? '',
        competition_at: row.competition_at ? String(row.competition_at).slice(0, 16) : '',
        reporting_at: row.reporting_at ? String(row.reporting_at).slice(0, 16) : '',
        coaching_label: row.coaching_label ?? '',
        coaching_amount: row.coaching_amount ?? 0,
        weight_kg: row.weight_kg ?? '',
      });
      const catIds: string[] = Array.isArray(row.category_product_ids) ? row.category_product_ids : [];
      setSelectedCategoryIds(catIds);
      setOriginalCategoryIds(catIds);
      const extras: any[] = Array.isArray(row.extra_lines) ? row.extra_lines : [];
      setExtraCategoryLines(
        extras
          .filter((l) => l && l.kind !== 'other')
          .map((l) => ({ label: String(l.label || ''), amount: Number(l.amount || 0) })),
      );
      setOtherExtraLines(extras.filter((l) => l && l.kind === 'other'));
    }
  }, [row]);

  const branchObj = branches.find((b: any) => b.id === form.branch_id);
  const beltOptions = getBeltLevelsForCountry((branchObj as any)?.country || 'Singapore');

  const eventCategoryOptions = useMemo(() => {
    if (!row?.event_id) return [] as Array<{ product_id: string; name: string; base_price: number }>;
    const ev = (events as any[]).find((e: any) => e.id === row.event_id);
    return ((ev?.categories ?? []) as any[]).map((c: any) => ({
      product_id: String(c.product_id),
      name: String(c.name || ''),
      base_price: Number(c.base_price || 0),
    }));
  }, [events, row?.event_id]);

  const selectedCategoryTotal = useMemo(() => {
    const sum = eventCategoryOptions
      .filter((c) => selectedCategoryIds.includes(c.product_id))
      .reduce((acc, c) => acc + (Number(c.base_price) || 0), 0);
    const extraSum = extraCategoryLines.reduce((acc, l) => acc + (Number(l.amount) || 0), 0);
    return sum + extraSum;
  }, [eventCategoryOptions, selectedCategoryIds, extraCategoryLines]);

  const setField = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const toggleCategory = (id: string, checked: boolean) => {
    setSelectedCategoryIds((prev) =>
      checked ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id),
    );
  };

  const handleSave = async () => {
    if (!submissionId) return;
    setSaving(true);
    try {
      const cleanedExtras = extraCategoryLines
        .map((l) => ({ label: l.label.trim(), amount: Number(l.amount) || 0, kind: 'category' as const }))
        .filter((l) => l.label.length > 0);
      const mergedExtraLines = [...cleanedExtras, ...otherExtraLines];

      await adminPatchCompetitionSubmission(submissionId, {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender,
        branch_id: form.branch_id,
        current_belt: form.current_belt,
        amount: Number(form.amount) || 0,
        poomsae_1: form.poomsae_1 || null,
        poomsae_2: form.poomsae_2 || null,
        court: form.court || null,
        competition_at: form.competition_at ? new Date(form.competition_at).toISOString() : null,
        reporting_at: form.reporting_at ? new Date(form.reporting_at).toISOString() : null,
        coaching_label: form.coaching_label,
        coaching_amount: Number(form.coaching_amount) || 0,
        extra_lines: mergedExtraLines,
        weight_kg: form.weight_kg === '' || form.weight_kg == null ? null : Number(form.weight_kg),
      });

      if (row?.event_id) {
        const a = [...selectedCategoryIds].sort().join(',');
        const b = [...originalCategoryIds].sort().join(',');
        if (a !== b) {
          await updateCompetitionSubmissionCategories(submissionId, selectedCategoryIds);
        }
      }

      toast.success('Saved');
      onSaved?.();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleFile = async (kind: typeof FILE_FIELDS[number]['kind'], file: File | null) => {
    if (!file || !submissionId || !form.branch_id) return;
    setUploadingKind(kind);
    try {
      await adminReplaceCompetitionSubmissionFile(submissionId, kind, file, form.branch_id);
      toast.success(`${kind} updated`);
      await refetch();
      onSaved?.();
    } catch (e: any) {
      toast.error(e?.message || `${kind} upload failed`);
    } finally {
      setUploadingKind(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">Edit competition submission</DialogTitle>
        </DialogHeader>

        {isLoading || !row ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">First name</Label>
                <Input className="h-8 text-xs" value={form.first_name || ''} onChange={(e) => setField('first_name', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Last name</Label>
                <Input className="h-8 text-xs" value={form.last_name || ''} onChange={(e) => setField('last_name', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input className="h-8 text-xs" value={form.email || ''} onChange={(e) => setField('email', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Date of birth</Label>
                <Input className="h-8 text-xs" type="date" value={form.date_of_birth || ''} onChange={(e) => setField('date_of_birth', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Gender</Label>
                <Select value={form.gender || ''} onValueChange={(v) => setField('gender', v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">male</SelectItem>
                    <SelectItem value="female">female</SelectItem>
                    <SelectItem value="other">other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Branch</Label>
                <Select value={form.branch_id || ''} onValueChange={(v) => setField('branch_id', v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Current belt</Label>
                <Select value={form.current_belt || ''} onValueChange={(v) => setField('current_belt', v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {beltOptions.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Amount</Label>
                <Input className="h-8 text-xs" type="number" step="0.01" value={form.amount ?? ''} onChange={(e) => setField('amount', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Coaching label</Label>
                <Input className="h-8 text-xs" value={form.coaching_label || ''} onChange={(e) => setField('coaching_label', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Coaching amount</Label>
                <Input className="h-8 text-xs" type="number" step="0.01" value={form.coaching_amount ?? ''} onChange={(e) => setField('coaching_amount', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Competition at</Label>
                <Input className="h-8 text-xs" type="datetime-local" value={form.competition_at || ''} onChange={(e) => setField('competition_at', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Reporting at</Label>
                <Input className="h-8 text-xs" type="datetime-local" value={form.reporting_at || ''} onChange={(e) => setField('reporting_at', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Court</Label>
                <Input className="h-8 text-xs" value={form.court || ''} onChange={(e) => setField('court', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Poomsae 1</Label>
                <Select value={form.poomsae_1 || '__none'} onValueChange={(v) => setField('poomsae_1', v === '__none' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">—</SelectItem>
                    {POOMSAE_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Poomsae 2</Label>
                <Select value={form.poomsae_2 || '__none'} onValueChange={(v) => setField('poomsae_2', v === '__none' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">—</SelectItem>
                    {POOMSAE_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Categories</Label>
              {row?.event_id ? (
                eventCategoryOptions.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 border rounded p-2">
                    {eventCategoryOptions.map((c) => {
                      const checked = selectedCategoryIds.includes(c.product_id);
                      return (
                        <label key={c.product_id} className="flex items-center gap-2 text-xs cursor-pointer py-0.5">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => toggleCategory(c.product_id, v === true)}
                          />
                          <span className="flex-1 truncate">{c.name}</span>
                          <span className="text-muted-foreground">${Number(c.base_price).toFixed(2)}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground">No categories configured for this event.</div>
                )
              ) : (
                <div className="text-[11px] text-muted-foreground">No event linked — only extra categories editable.</div>
              )}

              <div className="space-y-1">
                <div className="text-[11px] text-muted-foreground">Extra categories</div>
                {extraCategoryLines.map((l, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      className="h-7 text-xs flex-1"
                      placeholder="Label"
                      value={l.label}
                      onChange={(e) =>
                        setExtraCategoryLines((prev) => prev.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))
                      }
                    />
                    <Input
                      className="h-7 text-xs w-24"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={l.amount}
                      onChange={(e) =>
                        setExtraCategoryLines((prev) => prev.map((x, i) => (i === idx ? { ...x, amount: Number(e.target.value) || 0 } : x)))
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setExtraCategoryLines((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setExtraCategoryLines((prev) => [...prev, { label: '', amount: 0 }])}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add extra category
                </Button>
              </div>

              <div className="text-[11px] text-muted-foreground">
                Selected categories subtotal: ${selectedCategoryTotal.toFixed(2)}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Weight (kg)</Label>
                <Input
                  className="h-8 text-xs"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.weight_kg ?? ''}
                  onChange={(e) => setField('weight_kg', e.target.value)}
                />
              </div>
            </div>


            <div>
              <Label className="text-xs font-semibold">Files</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                {FILE_FIELDS.map((f) => {
                  const currentUrl = (row as any)[f.col];
                  return (
                    <div key={f.kind} className="border rounded p-2 space-y-2">
                      <div className="text-[11px] font-medium">{f.label}</div>
                      {currentUrl ? (
                        <SignedImage src={currentUrl} alt={f.label} className="h-20 w-20 object-cover rounded border" fallback={<span className="text-[10px] text-muted-foreground">…</span>} />
                      ) : (
                        <div className="text-[10px] text-muted-foreground">No file</div>
                      )}
                      <Input
                        type="file"
                        accept="image/*"
                        className="h-7 text-[11px]"
                        disabled={uploadingKind === f.kind}
                        onChange={(e) => handleFile(f.kind, e.target.files?.[0] ?? null)}
                      />
                      {uploadingKind === f.kind && <div className="text-[10px] text-muted-foreground">Uploading…</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || isLoading}>{saving ? 'Saving…' : 'Save changes'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditCompetitionSubmissionDialog;
