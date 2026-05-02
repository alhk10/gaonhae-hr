import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { searchStudents } from '@/services/studentService';
import { getEmployees } from '@/services/employeeService';
import type { DocumentRecord } from '@/services/documentService';

interface Props {
  open: boolean;
  doc: DocumentRecord | null;
  onCancel: () => void;
  onConfirm: (linkedType: 'student' | 'employee', linkedId: string, branchId?: string | null) => void;
  onSkip: () => void;
}

const DocumentMatchConfirmDialog: React.FC<Props> = ({ open, doc, onCancel, onConfirm, onSkip }) => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Array<{ type: 'student' | 'employee'; id: string; name: string; branch_id?: string | null }>>([]);
  const [chosen, setChosen] = useState<{ type: 'student' | 'employee'; id: string; name: string; branch_id?: string | null } | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    if (!open) return;
    setSearch('');
    setChosen(null);
    setResults([]);
    getEmployees().then(setEmployees).catch(() => setEmployees([]));
    if (doc?.ai_suggestion) {
      setChosen(doc.ai_suggestion as any);
    }
  }, [open, doc?.id]);

  useEffect(() => {
    let cancelled = false;
    if (!search.trim()) {
      setResults([]);
      return;
    }
    (async () => {
      const stu = await searchStudents(search, 8).catch(() => []);
      const emp = (employees || [])
        .filter((e: any) => {
          const n = (e.display_name || e.name || '').toLowerCase();
          return n.includes(search.toLowerCase());
        })
        .slice(0, 8);
      if (cancelled) return;
      setResults([
        ...stu.map((s: any) => ({
          type: 'student' as const,
          id: s.id,
          name: `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim(),
          branch_id: s.branch_id,
        })),
        ...emp.map((e: any) => ({
          type: 'employee' as const,
          id: e.id,
          name: e.display_name || e.name,
          branch_id: null,
        })),
      ]);
    })();
    return () => {
      cancelled = true;
    };
  }, [search, employees]);

  const extracted = doc?.extracted_data || {};

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirm document match</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border p-3 text-xs space-y-1 bg-muted/30">
            <div className="font-medium">Extracted from document</div>
            <div>Name: <span className="font-mono">{extracted.name || '—'}</span></div>
            <div>ID Number: <span className="font-mono">{extracted.id_number || '—'}</span></div>
            <div>DOB: <span className="font-mono">{extracted.date_of_birth || '—'}</span></div>
            {extracted.expiry_date && <div>Expiry: <span className="font-mono">{extracted.expiry_date}</span></div>}
          </div>

          {chosen && (
            <div className="rounded-md border p-3 bg-primary/5 flex items-start justify-between gap-2">
              <div>
                <div className="text-xs text-muted-foreground capitalize">{chosen.type}</div>
                <div className="font-medium">{chosen.name}</div>
                {doc?.match_confidence != null && doc.ai_suggestion?.id === chosen.id && (
                  <Badge variant="outline" className="mt-1">AI confidence {Math.round((doc.match_confidence || 0) * 100)}%</Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setChosen(null)}>Change</Button>
            </div>
          )}

          {!chosen && (
            <div className="space-y-2">
              <Label className="text-xs">Search student or employee</Label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type a name..." />
              <div className="border rounded-md max-h-60 overflow-y-auto divide-y">
                {results.length === 0 && search && (
                  <div className="p-3 text-xs text-muted-foreground">No matches</div>
                )}
                {results.map((r) => (
                  <button
                    key={`${r.type}-${r.id}`}
                    className="w-full text-left p-2 hover:bg-muted flex items-center justify-between"
                    onClick={() => setChosen(r)}
                  >
                    <span className="text-sm">{r.name}</span>
                    <Badge variant="outline" className="capitalize text-[10px]">{r.type}</Badge>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onSkip}>Skip (leave unmatched)</Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button
            disabled={!chosen}
            onClick={() => chosen && onConfirm(chosen.type, chosen.id, chosen.branch_id ?? null)}
          >
            Confirm link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentMatchConfirmDialog;
