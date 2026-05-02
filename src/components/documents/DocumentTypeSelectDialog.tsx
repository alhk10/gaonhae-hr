import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DOCUMENT_TYPES } from '@/constants/documentTypes';

export interface DocumentMeta {
  document_type: string;
  document_level?: string;
  custom_label?: string;
  notes?: string;
  branch_id?: string;
}

interface Props {
  open: boolean;
  files: File[];
  branches?: { id: string; name: string }[];
  onCancel: () => void;
  onConfirm: (perFile: DocumentMeta[]) => void;
}

const DocumentTypeSelectDialog: React.FC<Props> = ({ open, files, branches, onCancel, onConfirm }) => {
  const [meta, setMeta] = useState<DocumentMeta[]>(() =>
    files.map(() => ({ document_type: '' })),
  );

  React.useEffect(() => {
    setMeta(files.map(() => ({ document_type: '' })));
  }, [files]);

  const update = (i: number, patch: Partial<DocumentMeta>) => {
    setMeta((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  };

  const canSubmit = meta.every((m) => {
    const t = DOCUMENT_TYPES.find((d) => d.value === m.document_type);
    if (!t) return false;
    if (t.hasCustomLabel && !m.custom_label?.trim()) return false;
    if (t.levels && !m.document_level) return false;
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Categorise documents ({files.length})</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {files.map((f, i) => {
            const m = meta[i] || { document_type: '' };
            const typeOpt = DOCUMENT_TYPES.find((d) => d.value === m.document_type);
            return (
              <div key={i} className="border rounded-md p-3 space-y-3">
                <div className="text-sm font-medium truncate">{f.name}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Document Type *</Label>
                    <Select value={m.document_type} onValueChange={(v) => update(i, { document_type: v, document_level: undefined, custom_label: undefined })}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="Select type..." /></SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {typeOpt?.levels && (
                    <div>
                      <Label className="text-xs">Level / Rank *</Label>
                      <Select value={m.document_level} onValueChange={(v) => update(i, { document_level: v })}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Select level..." /></SelectTrigger>
                        <SelectContent>
                          {typeOpt.levels.map((l) => (
                            <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {typeOpt?.hasCustomLabel && (
                    <div className="md:col-span-2">
                      <Label className="text-xs">Label *</Label>
                      <Input className="h-8" value={m.custom_label || ''} onChange={(e) => update(i, { custom_label: e.target.value })} />
                    </div>
                  )}
                  {branches && branches.length > 0 && (
                    <div>
                      <Label className="text-xs">Branch (optional)</Label>
                      <Select value={m.branch_id || 'none'} onValueChange={(v) => update(i, { branch_id: v === 'none' ? undefined : v })}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="No branch" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No branch</SelectItem>
                          {branches.map((b) => (
                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <Label className="text-xs">Notes</Label>
                    <Textarea rows={2} className="text-xs" value={m.notes || ''} onChange={(e) => update(i, { notes: e.target.value })} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button disabled={!canSubmit} onClick={() => onConfirm(meta)}>Upload & match</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentTypeSelectDialog;
