/**
 * Branch availability + pricing manager for the Uniforms & Guards purchase page,
 * opened from the Uniforms & Guards tab in /access. Controls which packages and
 * individual uniform / protection products appear on the public /guards page for
 * a branch and the price charged there.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/currencyUtils';
import { getPublicBranches } from '@/services/gradingPaymentSubmissionService';
import {
  getGuardsProductsForBranchAdmin,
  setGuardsProductBranchSetting,
  type GuardsBranchAdminItem,
} from '@/services/guardsPurchaseService';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actor?: string | null;
}

interface DraftRow {
  available: boolean;
  price: string;
}

const GuardsProductSettingsDialog: React.FC<Props> = ({ open, onOpenChange, actor }) => {
  const qc = useQueryClient();
  const [branchId, setBranchId] = useState<string>('');
  const [draft, setDraft] = useState<Record<string, DraftRow>>({});
  const [saving, setSaving] = useState(false);

  const { data: branches = [] } = useQuery({
    queryKey: ['public-branches'],
    queryFn: getPublicBranches,
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });

  useEffect(() => {
    if (open && !branchId && branches.length > 0) {
      setBranchId((branches[0] as any).branch_id || (branches[0] as any).id || '');
    }
  }, [open, branches, branchId]);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['guards-branch-products', branchId],
    queryFn: () => getGuardsProductsForBranchAdmin(branchId),
    enabled: open && !!branchId,
  });

  useEffect(() => {
    const next: Record<string, DraftRow> = {};
    (items as GuardsBranchAdminItem[]).forEach((p) => {
      next[p.item_key] = {
        available: p.is_available,
        price: p.price_override === null ? '' : String(p.price_override),
      };
    });
    setDraft(next);
  }, [items]);

  const dirtyKeys = useMemo(() => {
    return (items as GuardsBranchAdminItem[])
      .filter((p) => {
        const d = draft[p.item_key];
        if (!d) return false;
        const original = p.price_override === null ? '' : String(p.price_override);
        return d.available !== p.is_available || d.price.trim() !== original;
      })
      .map((p) => p.item_key);
  }, [items, draft]);

  const handleSave = async () => {
    if (!branchId || dirtyKeys.length === 0) return;
    setSaving(true);
    try {
      for (const key of dirtyKeys) {
        const row = (items as GuardsBranchAdminItem[]).find((i) => i.item_key === key)!;
        const d = draft[key];
        const raw = d.price.trim();
        const price = raw === '' ? null : Number(raw);
        if (price !== null && (Number.isNaN(price) || price < 0)) {
          throw new Error('Enter a valid price');
        }
        await setGuardsProductBranchSetting(branchId, key, row.product_id, d.available, price, actor);
      }
      toast.success('Product settings saved');
      qc.invalidateQueries({ queryKey: ['guards-branch-products'] });
      qc.invalidateQueries({ queryKey: ['public-guards-products'] });
    } catch (e: any) {
      toast.error(e?.message || 'Could not save product settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Uniforms &amp; Guards availability</DialogTitle>
          <DialogDescription className="text-xs">
            Controls which packages and products appear on the public /guards page for a branch and
            the price charged (GST inclusive). Leave the price blank to use the default price.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Branch</span>
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger className="h-8 w-[220px] text-xs">
              <SelectValue placeholder="Select branch" />
            </SelectTrigger>
            <SelectContent>
              {(branches as any[]).map((b) => {
                const id = b.branch_id || b.id;
                return (
                  <SelectItem key={id} value={id} className="text-xs">
                    {b.branch_name || b.name || id}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground text-xs">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading products…
          </div>
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-8 text-center">No products found.</p>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Item</TableHead>
                  <TableHead className="text-xs w-[90px]">Default</TableHead>
                  <TableHead className="text-xs w-[120px]">Price</TableHead>
                  <TableHead className="text-xs w-[90px] text-right">Available</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(items as GuardsBranchAdminItem[]).map((p) => {
                  const d = draft[p.item_key] || { available: false, price: '' };
                  return (
                    <TableRow key={p.item_key} className={d.available ? '' : 'opacity-60'}>
                      <TableCell className="text-xs py-1.5">
                        <div className="flex items-center gap-1.5">
                          <span>{p.name}</span>
                          {p.item_type === 'package' && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0">Package</Badge>
                          )}
                        </div>
                        {p.description && (
                          <p className="text-[11px] text-muted-foreground">{p.description}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-xs py-1.5 text-muted-foreground">
                        {formatCurrency(p.default_price)}
                      </TableCell>
                      <TableCell className="py-1.5">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={d.price}
                          placeholder={String(p.default_price)}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              [p.item_key]: { ...d, price: e.target.value },
                            }))
                          }
                          className="h-7 text-xs"
                        />
                      </TableCell>
                      <TableCell className="py-1.5 text-right">
                        <Switch
                          checked={d.available}
                          onCheckedChange={(v) =>
                            setDraft((prev) => ({
                              ...prev,
                              [p.item_key]: { ...d, available: v },
                            }))
                          }
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" className="h-8 text-xs" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            className="h-8 text-xs"
            disabled={saving || dirtyKeys.length === 0}
            onClick={handleSave}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1" />
            )}
            Save{dirtyKeys.length > 0 ? ` (${dirtyKeys.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GuardsProductSettingsDialog;
