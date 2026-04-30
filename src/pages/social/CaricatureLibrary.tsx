import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Loader2, Upload, ImageIcon, Save } from 'lucide-react';
import SocialLayout from '@/components/layout/SocialLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import ChipInput from '@/components/social/ChipInput';
import { toast } from 'sonner';
import {
  listCaricatures, uploadCaricatureImage, createCaricature,
  updateCaricature, deleteCaricature, type Caricature,
} from '@/services/social/caricatureService';
import { listBrandSettings } from '@/services/social/brandService';

const BRANCH_ALL = '__all__';

const CaricatureLibrary = () => {
  const qc = useQueryClient();
  const { data: caricatures = [], isLoading } = useQuery({
    queryKey: ['sm-caricatures'],
    queryFn: () => listCaricatures(),
  });
  const { data: brands = [] } = useQuery({ queryKey: ['sm-brands'], queryFn: listBrandSettings });

  const [editing, setEditing] = useState<Partial<Caricature> | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Caricature | null>(null);

  const openNew = () => {
    setEditing({ name: '', description: '', tags: [], branch_name: null, is_active: true });
    setFile(null);
    setPreviewUrl(null);
  };

  const openEdit = (c: Caricature) => {
    setEditing({ ...c });
    setFile(null);
    setPreviewUrl(c.image_url);
  };

  const close = () => {
    setEditing(null);
    setFile(null);
    if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const onFile = (f: File | null) => {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10MB');
      return;
    }
    if (!/^image\/(png|jpe?g|webp)$/i.test(f.type)) {
      toast.error('Only PNG, JPG or WEBP allowed');
      return;
    }
    setFile(f);
    if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.name?.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!editing.id && !file) {
      toast.error('Pick an image');
      return;
    }
    setSaving(true);
    try {
      let image_url = editing.image_url ?? '';
      let storage_path = editing.storage_path ?? '';
      if (file) {
        const up = await uploadCaricatureImage(file);
        image_url = up.url;
        storage_path = up.path;
      }
      if (editing.id) {
        await updateCaricature(editing.id, {
          name: editing.name!,
          description: editing.description ?? null,
          tags: editing.tags ?? [],
          branch_name: editing.branch_name ?? null,
          is_active: editing.is_active ?? true,
          ...(file ? { image_url, storage_path } : {}),
        });
        toast.success('Caricature updated');
      } else {
        await createCaricature({
          name: editing.name!,
          description: editing.description ?? null,
          tags: editing.tags ?? [],
          branch_name: editing.branch_name ?? null,
          is_active: editing.is_active ?? true,
          image_url,
          storage_path,
        });
        toast.success('Caricature added');
      }
      qc.invalidateQueries({ queryKey: ['sm-caricatures'] });
      close();
    } catch (e: any) {
      toast.error(e?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = useMutation({
    mutationFn: (c: Caricature) => updateCaricature(c.id, { is_active: !c.is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sm-caricatures'] }),
    onError: (e: any) => toast.error(e?.message ?? 'Update failed'),
  });

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteCaricature(confirmDelete.id, confirmDelete.storage_path);
      toast.success('Deleted');
      qc.invalidateQueries({ queryKey: ['sm-caricatures'] });
    } catch (e: any) {
      toast.error(e?.message ?? 'Delete failed');
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <SocialLayout
      title="Caricature Library"
      description="Upload reusable character/style references. When a post has no media, AI generates an image using one of these as the visual anchor."
      actions={
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" /> Add caricature
        </Button>
      }
    >
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin h-4 w-4" /> Loading…</div>
      ) : caricatures.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ImageIcon className="mx-auto h-10 w-10 mb-3 opacity-50" />
            <p className="text-sm">No caricatures yet. Add your first one to enable AI image generation.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {caricatures.map((c) => (
            <Card key={c.id} className={c.is_active ? '' : 'opacity-60'}>
              <div className="aspect-square bg-muted overflow-hidden rounded-t-lg">
                <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
              </div>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {c.branch_name ?? 'All branches'}
                    </div>
                  </div>
                  <Switch checked={c.is_active} onCheckedChange={() => toggleActive.mutate(c)} />
                </div>
                {c.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>
                )}
                {c.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {c.tags.slice(0, 4).map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px] py-0 px-1.5">{t}</Badge>
                    ))}
                    {c.tags.length > 4 && <span className="text-[10px] text-muted-foreground">+{c.tags.length - 4}</span>}
                  </div>
                )}
                <div className="flex gap-1 pt-1">
                  <Button size="sm" variant="outline" className="flex-1 h-7" onClick={() => openEdit(c)}>Edit</Button>
                  <Button size="sm" variant="outline" className="h-7" onClick={() => setConfirmDelete(c)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit / Add dialog */}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit caricature' : 'Add caricature'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Image</Label>
                <div className="aspect-square bg-muted rounded-md overflow-hidden border flex items-center justify-center">
                  {previewUrl ? (
                    <img src={previewUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                <label className="block">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                  />
                  <Button type="button" variant="outline" className="w-full" asChild>
                    <span><Upload className="h-4 w-4 mr-2" />{file || editing.id ? 'Replace image' : 'Choose image'}</span>
                  </Button>
                </label>
                <p className="text-[11px] text-muted-foreground">PNG, JPG or WEBP, up to 10MB.</p>
              </div>

              <div className="space-y-3">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={editing.name ?? ''}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    placeholder="e.g. Brave Kid in Dobok"
                  />
                </div>
                <div>
                  <Label>Description (sent to AI)</Label>
                  <Textarea
                    rows={4}
                    value={editing.description ?? ''}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                    placeholder="Cartoon-style young taekwondo student wearing white dobok with yellow belt, friendly smile, bold outlines, flat colours."
                  />
                </div>
                <div>
                  <Label>Branch scope</Label>
                  <Select
                    value={editing.branch_name ?? BRANCH_ALL}
                    onValueChange={(v) => setEditing({ ...editing, branch_name: v === BRANCH_ALL ? null : v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={BRANCH_ALL}>All branches</SelectItem>
                      {brands.map((b) => (
                        <SelectItem key={b.branch_name} value={b.branch_name}>{b.branch_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tags</Label>
                  <ChipInput
                    value={editing.tags ?? []}
                    onChange={(t) => setEditing({ ...editing, tags: t })}
                    placeholder="kid, instructor, kicking…"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editing.is_active ?? true}
                    onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                  />
                  <Label className="cursor-pointer">Active</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete !== null} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this caricature?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <b>{confirmDelete?.name}</b> and its image file.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SocialLayout>
  );
};

export default CaricatureLibrary;
