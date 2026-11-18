import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useBranches } from '@/hooks/useBranches';
import {
  listLimitedEditionsAdmin, saveLimitedEdition, deleteLimitedEdition, uploadLimitedEditionImage,
  type LimitedEditionProduct,
} from '@/services/limitedEditionService';
import { formatDate } from '@/utils/dateFormat';

interface Props { open: boolean; onOpenChange: (o: boolean) => void }

type Draft = {
  id?: string; name: string; description: string; image_urls: string[]; sizes: string; designs: string;
  price: string; branch_ids: string[]; is_active: boolean; starts_on: string; ends_on: string; stock_limit: string;
};
const empty: Draft = { name: '', description: '', image_urls: [], sizes: 'XS, S, M, L, XL', designs: '', price: '', branch_ids: [], is_active: true, starts_on: '', ends_on: '', stock_limit: '' };
const toList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
// Dates are typed DD/MM/YYYY and stored as ISO.
const toIso = (s: string) => { const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : ''; };
const fromIso = (s: string | null) => (s ? formatDate(s) : '');

const LimitedEditionSettingsDialog: React.FC<Props> = ({ open, onOpenChange }) => {
  const qc = useQueryClient();
  const { branches } = useBranches();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ['limited-editions-admin'],
    queryFn: listLimitedEditionsAdmin,
    enabled: open,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['limited-editions-admin'] });

  const edit = (r: LimitedEditionProduct) => setDraft({
    id: r.id, name: r.name, description: r.description || '', image_urls: r.image_urls || [],
    sizes: (r.sizes || []).join(', '), designs: (r.designs || []).join(', '), price: String(r.price),
    branch_ids: r.branch_ids || [], is_active: r.is_active, starts_on: fromIso(r.starts_on), ends_on: fromIso(r.ends_on),
    stock_limit: r.stock_limit == null ? '' : String(r.stock_limit),
  });

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim()) return toast.error('Name is required');
    const price = Number(draft.price);
    if (!(price >= 0) || draft.price === '') return toast.error('Enter a price');
    if (draft.starts_on && !toIso(draft.starts_on)) return toast.error('Start date must be DD/MM/YYYY');
    if (draft.ends_on && !toIso(draft.ends_on)) return toast.error('End date must be DD/MM/YYYY');
    setSaving(true);
    try {
      await saveLimitedEdition({
        id: draft.id, name: draft.name.trim(), description: draft.description.trim() || null,
        image_urls: draft.image_urls, sizes: toList(draft.sizes), designs: toList(draft.designs), price,
        branch_ids: draft.branch_ids, is_active: draft.is_active,
        starts_on: toIso(draft.starts_on) || null, ends_on: toIso(draft.ends_on) || null,
        stock_limit: draft.stock_limit ? Math.max(0, Math.floor(Number(draft.stock_limit))) : null,
      } as any);
      toast.success('Saved');
      setDraft(null);
      refresh();
    } catch (e: any) { toast.error(e?.message || 'Save failed'); } finally { setSaving(false); }
  };

  const remove = async (r: LimitedEditionProduct) => {
    if (!confirm(`Delete ${r.name}? Past orders stay in the purchase list.`)) return;
    try { await deleteLimitedEdition(r.id); refresh(); } catch (e: any) { toast.error(e?.message || 'Delete failed'); }
  };

  const addImages = async (files: FileList | null) => {
    if (!files || !draft) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) urls.push(await uploadLimitedEditionImage(f));
      setDraft((d) => (d ? { ...d, image_urls: [...d.image_urls, ...urls] } : d));
    } catch (e: any) { toast.error(e?.message || 'Upload failed'); } finally { setUploading(false); }
  };

  const branchName = (id: string) => branches.find((b) => b.id === id)?.name || id;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setDraft(null); onOpenChange(o); }}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto top-[5%] translate-y-0">
        <DialogHeader><DialogTitle className="text-base">Limited Edition Products</DialogTitle></DialogHeader>
        {draft ? (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div><Label className="text-xs">Name</Label><Input className="h-7 text-xs" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
              <div><Label className="text-xs">Price (before GST for Singapore)</Label><Input className="h-7 text-xs" inputMode="decimal" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} /></div>
            </div>
            <div><Label className="text-xs">Description</Label><Textarea rows={4} className="text-xs" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
            <div>
              <Label className="text-xs">Images</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {draft.image_urls.map((u) => (
                  <div key={u} className="relative">
                    <img src={u} alt="" className="h-20 w-20 rounded-md border object-cover" />
                    <button type="button" aria-label="Remove image" className="absolute -top-1 -right-1 rounded-full bg-background border p-0.5"
                      onClick={() => setDraft({ ...draft, image_urls: draft.image_urls.filter((x) => x !== u) })}><X className="h-3 w-3" /></button>
                  </div>
                ))}
                <label className="h-20 w-20 rounded-md border border-dashed flex flex-col items-center justify-center cursor-pointer text-muted-foreground">
                  <Upload className="h-4 w-4" /><span className="text-[10px]">{uploading ? 'Uploading…' : 'Add'}</span>
                  <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={(e) => { void addImages(e.target.files); e.target.value = ''; }} />
                </label>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div><Label className="text-xs">Sizes (comma separated)</Label><Input className="h-7 text-xs" value={draft.sizes} onChange={(e) => setDraft({ ...draft, sizes: e.target.value })} /></div>
              <div><Label className="text-xs">Designs (comma separated, optional)</Label><Input className="h-7 text-xs" value={draft.designs} onChange={(e) => setDraft({ ...draft, designs: e.target.value })} /></div>
              <div><Label className="text-xs">Start date (DD/MM/YYYY)</Label><Input className="h-7 text-xs" placeholder="DD/MM/YYYY" value={draft.starts_on} onChange={(e) => setDraft({ ...draft, starts_on: e.target.value })} /></div>
              <div><Label className="text-xs">End date (DD/MM/YYYY)</Label><Input className="h-7 text-xs" placeholder="DD/MM/YYYY" value={draft.ends_on} onChange={(e) => setDraft({ ...draft, ends_on: e.target.value })} /></div>
              <div><Label className="text-xs">Stock limit (blank = unlimited)</Label><Input className="h-7 text-xs" inputMode="numeric" value={draft.stock_limit} onChange={(e) => setDraft({ ...draft, stock_limit: e.target.value })} /></div>
              <div className="flex items-center gap-2 pt-4"><Switch checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} /><span>Show on /hello</span></div>
            </div>
            <div>
              <Label className="text-xs">Branches (none ticked = all branches)</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 mt-1">
                {branches.map((b) => (
                  <label key={b.id} className="flex items-center gap-1.5">
                    <Checkbox checked={draft.branch_ids.includes(b.id)} onCheckedChange={(v) => setDraft({
                      ...draft, branch_ids: v ? [...draft.branch_ids, b.id] : draft.branch_ids.filter((x) => x !== b.id),
                    })} />{b.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setDraft(null)} disabled={saving}>Cancel</Button>
              <Button size="sm" className="flex-1" onClick={save} disabled={saving || uploading}>{saving ? 'Saving…' : 'Save'}</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {error && <p className="text-xs text-destructive">{(error as any).message}</p>}
            <Button size="sm" onClick={() => setDraft({ ...empty })}><Plus className="h-4 w-4 mr-1" /> Add limited edition</Button>
            {isLoading ? <p className="text-xs text-muted-foreground">Loading…</p> : rows.length === 0 ? (
              <p className="text-xs text-muted-foreground">No limited edition products yet.</p>
            ) : rows.map((r) => (
              <div key={r.id} className={`flex items-center gap-2 rounded-md border p-2 ${r.is_active ? '' : 'opacity-50'}`}>
                {r.image_urls?.[0] && <img src={r.image_urls[0]} alt="" className="h-12 w-12 rounded object-cover" />}
                <div className="flex-1 min-w-0 text-xs">
                  <p className="font-semibold truncate">{r.name} · ${Number(r.price).toFixed(2)}</p>
                  <p className="text-muted-foreground truncate">
                    {r.branch_ids?.length ? r.branch_ids.map(branchName).join(', ') : 'All branches'}
                    {r.ends_on ? ` · until ${formatDate(r.ends_on)}` : ''}
                    {` · ${r.sold || 0} sold${r.stock_limit != null ? ` / ${r.stock_limit}` : ''}`}
                  </p>
                </div>
                {!r.is_active && <Badge variant="outline">Disabled</Badge>}
                <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Edit" onClick={() => edit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Delete" onClick={() => remove(r)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground">Only the all-branch password or a superadmin can change limited edition products.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LimitedEditionSettingsDialog;
