import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Plus, Pencil, Trash2, KeyRound } from 'lucide-react';
import {
  listCamerasForBranch,
  createCamera,
  updateCamera,
  deleteCamera,
  type CctvCamera,
} from '@/services/cctvService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface CctvCamerasTabProps {
  branchId: string;
}

interface CameraForm {
  name: string;
  mediamtx_path: string;
  supports_playback: boolean;
  is_active: boolean;
  display_order: number;
}

const blankForm: CameraForm = {
  name: '',
  mediamtx_path: '',
  supports_playback: false,
  is_active: true,
  display_order: 0,
};

export const CctvCamerasTab: React.FC<CctvCamerasTabProps> = ({ branchId }) => {
  const [cameras, setCameras] = useState<CctvCamera[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CctvCamera | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<CameraForm>(blankForm);
  const [saving, setSaving] = useState(false);

  // Secrets dialog
  const [secretsOpen, setSecretsOpen] = useState(false);
  const [secretsCamera, setSecretsCamera] = useState<CctvCamera | null>(null);
  const [secretRtsp, setSecretRtsp] = useState('');
  const [secretUser, setSecretUser] = useState('');
  const [secretPass, setSecretPass] = useState('');
  const [savingSecret, setSavingSecret] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setCameras(await listCamerasForBranch(branchId));
    } catch (err) {
      toast({ title: 'Failed to load cameras', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [branchId]);

  const openCreate = () => {
    setEditing(null);
    setForm(blankForm);
    setFormOpen(true);
  };
  const openEdit = (cam: CctvCamera) => {
    setEditing(cam);
    setForm({
      name: cam.name,
      mediamtx_path: cam.mediamtx_path,
      supports_playback: cam.supports_playback,
      is_active: cam.is_active,
      display_order: cam.display_order,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.mediamtx_path.trim()) {
      toast({ title: 'Name and MediaMTX path required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateCamera(editing.id, form);
        toast({ title: 'Camera updated' });
      } else {
        await createCamera({ branch_id: branchId, ...form });
        toast({ title: 'Camera created' });
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      toast({ title: 'Save failed', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cam: CctvCamera) => {
    if (!confirm(`Delete camera "${cam.name}"?`)) return;
    try {
      await deleteCamera(cam.id);
      toast({ title: 'Camera deleted' });
      await load();
    } catch (err) {
      toast({ title: 'Delete failed', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const openSecrets = async (cam: CctvCamera) => {
    setSecretsCamera(cam);
    setSecretRtsp('');
    setSecretUser('');
    setSecretPass('');
    setSecretsOpen(true);
    // Note: secrets are server-only; we show blank inputs for re-entry.
  };

  const handleSaveSecret = async () => {
    if (!secretsCamera || !secretRtsp.trim()) {
      toast({ title: 'RTSP URL required', variant: 'destructive' });
      return;
    }
    setSavingSecret(true);
    try {
      const { error } = await supabase
        .from('cctv_camera_secrets')
        .upsert(
          {
            camera_id: secretsCamera.id,
            rtsp_url: secretRtsp.trim(),
            username: secretUser.trim() || null,
            password: secretPass || null,
          },
          { onConflict: 'camera_id' },
        );
      if (error) throw error;
      toast({ title: 'Stream credentials saved' });
      setSecretsOpen(false);
    } catch (err) {
      toast({
        title: 'Failed to save credentials',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSavingSecret(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">CCTV Cameras</CardTitle>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Add camera
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : cameras.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No cameras configured for this branch yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>MediaMTX path</TableHead>
                <TableHead>Playback</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-[200px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cameras.map((cam) => (
                <TableRow key={cam.id}>
                  <TableCell className="font-medium">{cam.name}</TableCell>
                  <TableCell className="font-mono text-xs">{cam.mediamtx_path}</TableCell>
                  <TableCell>{cam.supports_playback ? 'Yes' : 'No'}</TableCell>
                  <TableCell>{cam.is_active ? 'Yes' : 'No'}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => openSecrets(cam)} title="Set RTSP credentials">
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(cam)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(cam)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <p className="text-xs text-muted-foreground mt-4">
          Streams are served via a self-hosted MediaMTX server. Set the{' '}
          <code>MEDIAMTX_BASE_URL</code> and <code>MEDIAMTX_JWT_SECRET</code> Supabase secrets, then
          enter each camera's RTSP URL via the key icon.
        </p>
      </CardContent>

      {/* Camera form dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit camera' : 'Add camera'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="cam-name">Name</Label>
              <Input
                id="cam-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Front door"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cam-path">MediaMTX path</Label>
              <Input
                id="cam-path"
                value={form.mediamtx_path}
                onChange={(e) => setForm((f) => ({ ...f, mediamtx_path: e.target.value }))}
                placeholder="balmoral-front"
              />
              <p className="text-xs text-muted-foreground">
                Must match the path configured in MediaMTX (no leading slash).
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cam-order">Display order</Label>
              <Input
                id="cam-order"
                type="number"
                value={form.display_order}
                onChange={(e) => setForm((f) => ({ ...f, display_order: Number(e.target.value) || 0 }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="cam-playback">Supports playback (VOD)</Label>
              <Switch
                id="cam-playback"
                checked={form.supports_playback}
                onCheckedChange={(v) => setForm((f) => ({ ...f, supports_playback: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="cam-active">Active</Label>
              <Switch
                id="cam-active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {editing ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Secrets dialog */}
      <Dialog open={secretsOpen} onOpenChange={setSecretsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Stream credentials — {secretsCamera?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Stored server-side only. Never exposed to viewers.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="rtsp">RTSP URL</Label>
              <Input
                id="rtsp"
                value={secretRtsp}
                onChange={(e) => setSecretRtsp(e.target.value)}
                placeholder="rtsp://10.0.0.20:554/stream1"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rtsp-user">Username (optional)</Label>
              <Input
                id="rtsp-user"
                value={secretUser}
                onChange={(e) => setSecretUser(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rtsp-pass">Password (optional)</Label>
              <Input
                id="rtsp-pass"
                type="password"
                value={secretPass}
                onChange={(e) => setSecretPass(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSecretsOpen(false)} disabled={savingSecret}>
              Cancel
            </Button>
            <Button onClick={handleSaveSecret} disabled={savingSecret}>
              {savingSecret && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Save credentials
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default CctvCamerasTab;
