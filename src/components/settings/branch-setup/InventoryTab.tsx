import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Save, Search, ChevronRight, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Props {
  branchId: string;
  branchName: string;
}

interface VariantRow {
  product_id: string;
  variant_key: string; // unique label, also stored as size_variant in DB
  current_qty: number;
  edit_qty: string;
  inventory_id?: string;
  dirty: boolean;
}

interface ProductGroup {
  product_id: string;
  product_name: string;
  product_sku: string;
  variants: VariantRow[]; // always at least 1 entry; if no variants defined, single entry with variant_key=''
  hasVariants: boolean;
}

const buildVariantKeys = (sizes: string[], colors: string[]): string[] => {
  const s = sizes.filter(Boolean);
  const c = colors.filter(Boolean);
  if (s.length === 0 && c.length === 0) return [];
  if (s.length > 0 && c.length > 0) {
    const combos: string[] = [];
    for (const col of c) for (const sz of s) combos.push(`${col} / ${sz}`);
    return combos;
  }
  return s.length > 0 ? s : c;
};

export const InventoryTab: React.FC<Props> = ({ branchId, branchName }) => {
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [creatingLocation, setCreatingLocation] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const ensureLocation = async (): Promise<string | null> => {
    const { data: locs, error: le } = await supabase
      .from('inventory_locations')
      .select('id')
      .eq('branch_id', branchId)
      .eq('is_active', true)
      .limit(1);
    if (le) throw le;
    if (locs && locs.length > 0) return locs[0].id;

    setCreatingLocation(true);
    const { data: newLoc, error: ce } = await supabase
      .from('inventory_locations')
      .insert({
        branch_id: branchId,
        name: `${branchName} Inventory`,
        is_active: true,
      })
      .select('id')
      .single();
    setCreatingLocation(false);
    if (ce) throw ce;
    return newLoc?.id || null;
  };

  const load = async () => {
    setLoading(true);
    try {
      const locId = await ensureLocation();
      setLocationId(locId);

      const { data: products, error: pe } = await supabase
        .from('products')
        .select('id, name, sku, requires_size, available_sizes, available_variants, is_service')
        .eq('is_active', true)
        .order('name');
      if (pe) throw pe;

      let invItems: any[] = [];
      if (locId) {
        const { data, error } = await supabase
          .from('inventory_items')
          .select('id, product_id, size_variant, quantity_on_hand')
          .eq('location_id', locId);
        if (error) throw error;
        invItems = data || [];
      }

      const invMap = new Map<string, { id: string; qty: number }>();
      for (const it of invItems) {
        const key = `${it.product_id}__${it.size_variant ?? ''}`;
        invMap.set(key, { id: it.id, qty: it.quantity_on_hand });
      }

      const built: ProductGroup[] = [];
      for (const p of products || []) {
        if (p.is_service) continue;

        const av = (p.available_variants as any) || {};
        const sizes: string[] = Array.isArray(av.sizes) ? av.sizes : [];
        const colors: string[] = Array.isArray(av.colors) ? av.colors : [];
        let variantKeys = buildVariantKeys(sizes, colors);

        // Fallback to legacy available_sizes column
        if (variantKeys.length === 0 && Array.isArray(p.available_sizes) && p.available_sizes.length > 0) {
          variantKeys = (p.available_sizes as string[]).filter(Boolean);
        }

        // Merge any extra variants found in inventory but not in product config
        const productInv = invItems.filter((it) => it.product_id === p.id);
        for (const it of productInv) {
          if (it.size_variant && !variantKeys.includes(it.size_variant)) {
            variantKeys.push(it.size_variant);
          }
        }

        const hasVariants = variantKeys.length > 0;
        const keysToUse = hasVariants ? variantKeys : [''];

        const variants: VariantRow[] = keysToUse.map((k) => {
          const inv = invMap.get(`${p.id}__${k}`);
          return {
            product_id: p.id,
            variant_key: k,
            current_qty: inv?.qty ?? 0,
            edit_qty: String(inv?.qty ?? 0),
            inventory_id: inv?.id,
            dirty: false,
          };
        });

        built.push({
          product_id: p.id,
          product_name: p.name,
          product_sku: p.sku,
          variants,
          hasVariants,
        });
      }

      setGroups(built);
      // Default expand all groups with variants for visibility
      const exp: Record<string, boolean> = {};
      for (const g of built) if (g.hasVariants) exp[g.product_id] = true;
      setExpanded(exp);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) =>
        g.product_name.toLowerCase().includes(q) ||
        (g.product_sku || '').toLowerCase().includes(q)
    );
  }, [groups, search]);

  const dirtyCount = useMemo(
    () => groups.reduce((acc, g) => acc + g.variants.filter((v) => v.dirty).length, 0),
    [groups]
  );

  const updateQty = (productId: string, variantKey: string, value: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.product_id !== productId
          ? g
          : {
              ...g,
              variants: g.variants.map((v) =>
                v.variant_key === variantKey ? { ...v, edit_qty: value, dirty: true } : v
              ),
            }
      )
    );
  };

  const toggleExpand = (productId: string) => {
    setExpanded((prev) => ({ ...prev, [productId]: !prev[productId] }));
  };

  const handleSave = async () => {
    if (!locationId) {
      toast.error('No inventory location for this branch');
      return;
    }
    const dirty: VariantRow[] = [];
    for (const g of groups) for (const v of g.variants) if (v.dirty) dirty.push(v);
    if (dirty.length === 0) {
      toast.info('No changes to save');
      return;
    }
    setSaving(true);
    try {
      for (const r of dirty) {
        const newQty = parseInt(r.edit_qty || '0', 10) || 0;
        if (newQty === r.current_qty) continue;
        const delta = newQty - r.current_qty;

        if (r.inventory_id) {
          await supabase
            .from('inventory_items')
            .update({ quantity_on_hand: newQty, updated_at: new Date().toISOString() })
            .eq('id', r.inventory_id);
        } else {
          await supabase.from('inventory_items').insert({
            product_id: r.product_id,
            location_id: locationId,
            quantity_on_hand: newQty,
            quantity_reserved: 0,
            size_variant: r.variant_key || null,
          });
        }

        await supabase.from('inventory_movements').insert({
          product_id: r.product_id,
          location_id: locationId,
          quantity_delta: delta,
          movement_type: delta > 0 ? 'in' : 'out',
          reason: 'Branch setup edit',
          size_variant: r.variant_key || null,
        });
      }
      toast.success(`Saved ${dirty.length} stock change${dirty.length === 1 ? '' : 's'}`);
      await load();
    } catch (e) {
      console.error(e);
      toast.error('Failed to save inventory');
    } finally {
      setSaving(false);
    }
  };

  if (loading || creatingLocation) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <p className="text-sm text-muted-foreground">
          On-hand stock at this branch. One row per variant. Click a product to expand its variants.
        </p>
        <div className="flex items-center gap-2">
          {dirtyCount > 0 && <Badge variant="secondary">{dirtyCount} unsaved</Badge>}
          <Button onClick={handleSave} disabled={saving || dirtyCount === 0}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Variant</TableHead>
              <TableHead className="w-[140px] text-right">On Hand</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No products match your search.
                </TableCell>
              </TableRow>
            ) : (
              filtered.flatMap((g) => {
                const isOpen = !!expanded[g.product_id];
                const groupTotal = g.variants.reduce(
                  (acc, v) => acc + (parseInt(v.edit_qty || '0', 10) || 0),
                  0
                );
                const groupDirty = g.variants.some((v) => v.dirty);

                // Single-variant product (no variants configured) - render as one flat row
                if (!g.hasVariants) {
                  const v = g.variants[0];
                  return [
                    <TableRow
                      key={g.product_id}
                      className={v.dirty ? 'bg-primary/5' : ''}
                    >
                      <TableCell className="font-medium">{g.product_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{g.product_sku}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">—</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          value={v.edit_qty}
                          onChange={(e) => updateQty(g.product_id, v.variant_key, e.target.value)}
                          className="h-8 w-24 ml-auto text-right font-mono"
                        />
                      </TableCell>
                    </TableRow>,
                  ];
                }

                // Cascading parent + child rows
                const rows: React.ReactNode[] = [
                  <TableRow
                    key={g.product_id}
                    className={cn(
                      'cursor-pointer hover:bg-muted/50',
                      groupDirty && 'bg-primary/5'
                    )}
                    onClick={() => toggleExpand(g.product_id)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1">
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        {g.product_name}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{g.product_sku}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {g.variants.length} variant{g.variants.length === 1 ? '' : 's'}
                    </TableCell>
                    <TableCell className="text-right text-sm font-mono text-muted-foreground">
                      {groupTotal}
                    </TableCell>
                  </TableRow>,
                ];

                if (isOpen) {
                  for (const v of g.variants) {
                    rows.push(
                      <TableRow
                        key={`${g.product_id}-${v.variant_key}`}
                        className={cn('bg-muted/20', v.dirty && 'bg-primary/5')}
                      >
                        <TableCell className="pl-10 text-sm text-muted-foreground">
                          ↳ {g.product_name}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{g.product_sku}</TableCell>
                        <TableCell className="text-sm">{v.variant_key}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="0"
                            value={v.edit_qty}
                            onChange={(e) => updateQty(g.product_id, v.variant_key, e.target.value)}
                            className="h-8 w-24 ml-auto text-right font-mono"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  }
                }
                return rows;
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
