import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getBranches } from '@/services/settingsService';
import { buildGradingInfoSheet } from '@/utils/gradingInfoSheetPdf';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Branch ids the current password can use; empty = all. */
  allowedBranchIds: string[];
}

export default function InfoSheetBranchDialog({ open, onOpenChange, allowedBranchIds }: Props) {
  const { data: allBranches = [] } = useQuery({ queryKey: ['branches-info-sheet'], queryFn: getBranches, enabled: open });
  const branches = allowedBranchIds.length ? allBranches.filter((b) => allowedBranchIds.includes(b.id)) : allBranches;
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && branches.length && selected.length === 0) {
      setSelected(allowedBranchIds.length ? branches.map((b) => b.id) : []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, branches.length]);

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const download = async () => {
    setBusy(true);
    try {
      const picked = branches.filter((b) => selected.includes(b.id)).map((b) => ({ name: b.name, address: b.address }));
      const blob = await buildGradingInfoSheet(picked);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ready-for-grading-info-sheet.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      onOpenChange(false);
    } catch (e) {
      toast.error('Could not create the info sheet');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Info sheet branches</DialogTitle>
          <DialogDescription className="text-xs">Selected branches appear with map and address on the back.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {branches.map((b) => (
            <label key={b.id} className="flex items-start gap-2 text-sm cursor-pointer">
              <Checkbox checked={selected.includes(b.id)} onCheckedChange={() => toggle(b.id)} />
              <span>
                <span className="font-medium">{b.name}</span>
                <span className="block text-xs text-muted-foreground">{b.address}</span>
              </span>
            </label>
          ))}
        </div>
        <DialogFooter>
          {selected.length > 4 && <span className="text-xs text-muted-foreground mr-auto">More than 4 makes maps small.</span>}
          <Button onClick={download} disabled={busy || selected.length === 0}>
            {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
