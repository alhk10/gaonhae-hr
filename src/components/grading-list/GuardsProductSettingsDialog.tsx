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

const ageText = (p: { min_age?: number | null; max_age?: number | null }) => {
  const { min_age: a, max_age: b } = p;
  if (a != null && b != null) return `Age ${a}–${b}`;
  if (a != null) return `Age ${a}+`;
  if (b != null) return `Up to ${b}`;
  return 'All ages';
};
const beltText = (p: { allowed_belt_levels?: string[] | null }) => {
  const l = p.allowed_belt_levels || [];
  if (!l.length) return 'All belts';
  return l.length === 1 ? l[0] : `${l[0]} – ${l[l.length - 1]}`;
};
import { getPublicBranches } from '@/services/gradingPaymentSubmissionService';
import {
  getGuardsProductsForBranchAdmin,
  setGuardsProductBranchSetting,
  setGuardsProductRestrictions,
  type GuardsBranchAdminItem,
} from '@/services/guardsPurchaseService';
import { BELT_LEVELS_ARRAY } from '@/constants/beltLevels';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actor?: string | null;
}

interface DraftRow {
  available: boolean;
  price: string;
  minAge: string;
  maxAge: string;
  beltFrom: string; // '' = all belts, 'custom' = non-contiguous saved list
  beltTo: string;
}

const ALL = '__all__';
const CUSTOM = '__custom__';

const beltRangeOf = (levels?: string[] | null): { from: string; to: string } => {
  const l = levels || [];
  if (!l.length) return { from: ALL, to: ALL };
  const idx = l.map((b) => BELT_LEVELS_ARRAY.indexOf(b)).sort((a, b) => a - b);
  if (idx.some((i) => i < 0)) return { from: CUSTOM, to: CUSTOM };
  const lo = idx[0], hi = idx[idx.length - 1];
  if (hi - lo + 1 !== idx.length) return { from: CUSTOM, to: CUSTOM };
  return { from: BELT_LEVELS_ARRAY[lo], to: BELT_LEVELS_ARRAY[hi] };
};

const initialDraft = (p: GuardsBranchAdminItem): DraftRow => {
  const r = beltRangeOf(p.allowed_belt_levels);
  return {
    available: p.is_available,
    price: p.price_override === null ? '' : String(p.price_override),
    minAge: p.min_age == null ? '' : String(p.min_age),
    maxAge: p.max_age == null ? '' : String(p.max_age),
    beltFrom: r.from,
    beltTo: r.to,
  };
};

const restrictionsDirty = (p: GuardsBranchAdminItem, d: DraftRow) => {
  const o = initialDraft(p);
  return d.minAge.trim() !== o.minAge || d.maxAge.trim() !== o.maxAge || d.beltFrom !== o.beltFrom || d.beltTo !== o.beltTo;
};

const beltsFromRange = (from: string, to: string): string[] | null => {
  if (from === ALL || to === ALL) return null;
  let a = BELT_LEVELS_ARRAY.indexOf(from), b = BELT_LEVELS_ARRAY.indexOf(to);
  if (a < 0 || b < 0) throw new Error('Choose both belts');
  if (a > b) [a, b] = [b, a];
  return BELT_LEVELS_ARRAY.slice(a, b + 1);
};

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
    (items as GuardsBranchAdminItem[]).forEach((p) => { next[p.item_key] = initialDraft(p); });
    setDraft(next);
  }, [items]);

  const dirtyKeys = useMemo(() => {
    return (items as GuardsBranchAdminItem[])
      .filter((p) => {
        const d = draft[p.item_key];
        if (!d) return false;
        const original = p.price_override === null ? '' : String(p.price_override);
        return d.available !== p.is_available || d.price.trim() !== original || (!!p.product_id && restrictionsDirty(p, d));
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
        const original = row.price_override === null ? '' : String(row.price_override);
        if (d.available !== row.is_available || raw !== original) {
          await setGuardsProductBranchSetting(branchId, key, row.product_id, d.available, price, actor);
        }
        if (row.product_id && restrictionsDirty(row, d)) {
          const mn = d.minAge.trim() === '' ? null : parseInt(d.minAge, 10);
          const mx = d.maxAge.trim() === '' ? null : parseInt(d.maxAge, 10);
          if ((mn !== null && Number.isNaN(mn)) || (mx !== null && Number.isNaN(mx))) throw new Error('Enter a valid age');
          const belts = d.beltFrom === CUSTOM
            ? (row.allowed_belt_levels || null)
            : beltsFromRange(d.beltFrom, d.beltTo);
          await setGuardsProductRestrictions(row.product_id, mn, mx, belts, actor);
        }
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

  const setRow = (key: string, patch: Partial<DraftRow>) =>
    setDraft((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const renderRestrictionEditor = (p: GuardsBranchAdminItem, d: DraftRow) => {
    if (!p.product_id) {
      return <div className="text-[11px] text-muted-foreground">{ageText(p)} · {beltText(p)}</div>;
    }
    const beltSelect = (value: string, field: 'beltFrom' | 'beltTo', label: string) => (
      <Select
        value={value}
        onValueChange={(v) => {
          if (v === ALL) setRow(p.item_key, { beltFrom: ALL, beltTo: ALL });
          else {
            const other = field === 'beltFrom' ? d.beltTo : d.beltFrom;
            const otherVal = other === ALL || other === CUSTOM ? v : other;
            setRow(p.item_key, field === 'beltFrom' ? { beltFrom: v, beltTo: otherVal } : { beltTo: v, beltFrom: otherVal });
          }
        }}
      >
        <SelectTrigger className="h-7 text-[11px] px-1.5" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL} className="text-xs">All belts</SelectItem>
          {value === CUSTOM && <SelectItem value={CUSTOM} className="text-xs">Custom</SelectItem>}
          {BELT_LEVELS_ARRAY.map((b) => (
            <SelectItem key={b} value={b} className="text-xs">{b}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
    return (
      <div className="space-y-1 min-w-[150px]">
        <div className="flex items-center gap-1">
          <Input type="number" min={0} max={99} value={d.minAge} placeholder="age from" aria-label="Age from"
            onChange={(e) => setRow(p.item_key, { minAge: e.target.value })} className="h-7 text-xs px-1.5" />
          <span className="text-xs text-muted-foreground">–</span>
          <Input type="number" min={0} max={99} value={d.maxAge} placeholder="to" aria-label="Age to"
            onChange={(e) => setRow(p.item_key, { maxAge: e.target.value })} className="h-7 text-xs px-1.5" />
        </div>
        <div className="flex items-center gap-1" title={(p.allowed_belt_levels || []).join(', ')}>
          {beltSelect(d.beltFrom, 'beltFrom', 'Belt from')}
          {d.beltFrom !== ALL && (<><span className="text-xs text-muted-foreground">–</span>{beltSelect(d.beltTo, 'beltTo', 'Belt to')}</>)}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Uniforms &amp; Guards availability</DialogTitle>
          <DialogDescription className="text-xs">
            Controls which packages and products appear on the public /guards page for a branch and
            the price charged (GST inclusive). Leave the price blank to use the default price. Age and
            belt limits apply to the product at every branch; leave blank / All belts for no limit.
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
                  <TableHead className="hidden sm:table-cell text-xs w-[170px]">Restrictions</TableHead>
                  <TableHead className="text-xs w-[90px]">Default</TableHead>
                  <TableHead className="text-xs w-[120px]">Price</TableHead>
                  <TableHead className="text-xs w-[90px] text-right">Available</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(items as GuardsBranchAdminItem[]).map((p) => {
                  const d = draft[p.item_key] || initialDraft(p);
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
                        <div className="sm:hidden mt-1">{renderRestrictionEditor(p, d)}</div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell py-1.5">
                        {renderRestrictionEditor(p, d)}
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
