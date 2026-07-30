/**
 * Branch class availability + pricing manager, opened from the School Fees tab
 * in /access. Controls which class products appear on the public /fees page for
 * a branch and the weekly price charged there.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
  getClassProductsForBranchAdmin,
  setClassProductBranchPricing,
  type BranchClassProduct,
} from '@/services/schoolFeesSubmissionService';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actor?: string | null;
}

interface DraftRow {
  available: boolean;
  price: string;
}

const SchoolFeeProductSettingsDialog: React.FC<Props> = ({ open, onOpenChange, actor }) => {
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

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['branch-class-products', branchId],
    queryFn: () => getClassProductsForBranchAdmin(branchId),
    enabled: open && !!branchId,
  });

  // reset the draft whenever a fresh product list lands
  useEffect(() => {
    const next: Record<string, DraftRow> = {};
    (products as BranchClassProduct[]).forEach((p) => {
      next[p.product_id] = {
        available: p.is_available,
        price: p.price_override === null ? '' : String(p.price_override),
      };
    });
    setDraft(next);
  }, [products]);

  const dirtyIds = useMemo(() => {
    return (products as BranchClassProduct[])
      .filter((p) => {
        const d = draft[p.product_id];
        if (!d) return false;
        const original = p.price_override === null ? '' : String(p.price_override);
        return d.available !== p.is_available || d.price.trim() !== original;
      })
      .map((p) => p.product_id);
  }, [products, draft]);

  const handleSave = async () => {
    if (!branchId || dirtyIds.length === 0) return;
    setSaving(true);
    try {
      for (const id of dirtyIds) {
        const d = draft[id];
        const raw = d.price.trim();
        const price = raw === '' ? null : Number(raw);
        if (price !== null && (Number.isNaN(price) || price < 0)) {
          throw new Error('Enter a valid price');
        }
        await setClassProductBranchPricing(branchId, id, d.available, price, actor);
      }
      toast.success('Class settings saved');
      qc.invalidateQueries({ queryKey: ['branch-class-products'] });
      qc.invalidateQueries({ queryKey: ['public-class-products'] });
    } catch (e: any) {
      toast.error(e?.message || 'Could not save class settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Class availability &amp; pricing</DialogTitle>
          <DialogDescription className="text-xs">
            Controls which classes appear on the public /fees page for a branch and the weekly
            price charged. Leave the price blank to use the product's base price.
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
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading classes…
          </div>
        ) : products.length === 0 ? (
          <p className="text-xs text-muted-foreground py-8 text-center">
            No class products found.
          </p>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Class</TableHead>
                  <TableHead className="text-xs w-[90px]">Base</TableHead>
                  <TableHead className="text-xs w-[120px]">Price /wk</TableHead>
                  <TableHead className="text-xs w-[90px] text-right">Available</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(products as BranchClassProduct[]).map((p) => {
                  const d = draft[p.product_id] || { available: false, price: '' };
                  return (
                    <TableRow key={p.product_id} className={d.available ? '' : 'opacity-60'}>
                      <TableCell className="text-xs py-1.5">{p.product_name}</TableCell>
                      <TableCell className="text-xs py-1.5 text-muted-foreground">
                        {formatCurrency(p.base_price)}
                      </TableCell>
                      <TableCell className="py-1.5">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={d.price}
                          placeholder={String(p.base_price)}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              [p.product_id]: { ...d, price: e.target.value },
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
                              [p.product_id]: { ...d, available: v },
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
            disabled={saving || dirtyIds.length === 0}
            onClick={handleSave}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1" />
            )}
            Save{dirtyIds.length > 0 ? ` (${dirtyIds.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SchoolFeeProductSettingsDialog;
