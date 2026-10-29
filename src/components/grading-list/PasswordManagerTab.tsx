import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const rpc = ((fn: string, args?: any) => (supabase.rpc as any).call(supabase, fn, args)) as any;
const accessPw = () => { try { return sessionStorage.getItem('access_pw_v1') || ''; } catch { return ''; } };

interface Row { password_key: string; label: string | null; is_all: boolean; branch_ids: string[]; is_self: boolean }
interface Props { branches: { id: string; name: string }[] }

export default function PasswordManagerTab({ branches }: Props) {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Row | 'new' | null>(null);
  const [pw, setPw] = useState('');
  const [label, setLabel] = useState('');
  const [all, setAll] = useState(false);
  const [sel, setSel] = useState<string[]>([]);

  const { data = [], isLoading } = useQuery({
    queryKey: ['access-passwords'],
    queryFn: async () => {
      const { data, error } = await rpc('access_password_list', { p_password: accessPw() });
      if (error) throw error;
      return data as Row[];
    },
  });
  const name = (id: string) => branches.find((b) => b.id === id)?.name || id;

  const open = (r: Row | 'new') => {
    setEdit(r); setPw('');
    setLabel(r === 'new' ? '' : r.label || '');
    setAll(r === 'new' ? false : r.is_all);
    setSel(r === 'new' ? [] : r.branch_ids);
  };

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await rpc('access_password_save', {
        p_password: accessPw(), p_key: edit === 'new' ? null : (edit as Row).password_key,
        p_new_password: pw || null, p_all: all, p_branch_ids: all ? [] : sel, p_label: label || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Password saved'); setEdit(null); qc.invalidateQueries({ queryKey: ['access-passwords'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = async (r: Row) => {
    if (!confirm(`Delete password ${r.label || ''}? Staff using it will lose access.`)) return;
    const { error } = await rpc('access_password_delete', { p_password: accessPw(), p_key: r.password_key });
    if (error) return toast.error(error.message);
    toast.success('Password deleted');
    qc.invalidateQueries({ queryKey: ['access-passwords'] });
  };

  return (
    <Card>
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold flex items-center gap-2"><KeyRound className="h-4 w-4" />Branch passwords</h3>
          <Button size="sm" onClick={() => open('new')}><Plus className="h-3.5 w-3.5 mr-1" />Add password</Button>
        </div>
        <p className="text-xs text-muted-foreground">Passwords are stored scrambled and can't be shown again. To change one, type a new password.</p>
        {isLoading ? <p className="text-sm">Loading…</p> : (
          <div className="divide-y border rounded-md">
            {data.map((r) => (
              <div key={r.password_key} className="flex flex-wrap items-center gap-2 p-2">
                <span className="font-mono text-sm min-w-[70px]">{r.label || '••••'}</span>
                <div className="flex flex-wrap gap-1 flex-1">
                  {r.is_all ? <Badge>All branches</Badge> : r.branch_ids.map((b) => <Badge key={b} variant="secondary">{name(b)}</Badge>)}
                  {r.is_self && <Badge variant="outline">In use</Badge>}
                </div>
                {!r.is_self && <>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => open(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => del(r)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{edit === 'new' ? 'Add password' : 'Edit password'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{edit === 'new' ? 'Password' : 'New password (leave blank to keep)'}</Label>
              <Input value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="off" /></div>
            <div><Label>Label (optional)</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Carpe Diem staff" /></div>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={all} onCheckedChange={(v) => setAll(!!v)} />All branches</label>
            {!all && (
              <div className="grid grid-cols-2 gap-1 max-h-60 overflow-auto">
                {branches.map((b) => (
                  <label key={b.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={sel.includes(b.id)} onCheckedChange={(v) => setSel((s) => v ? [...s, b.id] : s.filter((x) => x !== b.id))} />{b.name}
                  </label>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button>
            <Button disabled={save.isPending || (edit === 'new' && !pw)} onClick={() => save.mutate()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
