import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Save, Search } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  branchId: string;
  branchName: string;
}

interface Row {
  product_id: string;
  product_name: string;
  product_sku: string;
  size_variant: string | null;
  current_qty: number;
  edit_qty: string;
  inventory_id?: string;
  dirty: boolean;
}

const variantLabel = (v: string | null) => (v && v.trim() ? v : '—');

export const InventoryTab: React.FC<Props> = ({ branchId, branchName }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [creatingLocation, setCreatingLocation] = useState(false);

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
        .select('id, name, sku, requires_size, available_sizes, is_service')
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

      const built: Row[] = [];
      for (const p of products || []) {
        if (p.is_service) continue;
        const sizes: string[] = Array.isArray(p.available_sizes) ? (p.available_sizes as string[]) : [];

        if (sizes.length > 0 && p.requires_size) {
          for (const size of sizes) {
            const k = `${p.id}__${size}`;
            const inv = invMap.get(k);
            built.push({
              product_id: p.id,
              product_name: p.name,
              product_sku: p.sku,
              size_variant: size,
              current_qty: inv?.qty ?? 0,
              edit_qty: String(inv?.qty ?? 0),
              inventory_id: inv?.id,
              dirty: false,
            });
          }
          // Also include any extra variants with stock not in available_sizes
          for (const it of invItems) {
            if (it.product_id !== p.id) continue;
            if (it.size_variant && !sizes.includes(it.size_variant)) {
              built.push({
                product_id: p.id,
                product_name: p.name,
                product_sku: p.sku,
                size_variant: it.size_variant,
                current_qty: it.quantity_on_hand,
                edit_qty: String(it.quantity_on_hand),
                inventory_id: it.id,
                dirty: false,
              });
            }
          }
        } else {
          const k = `${p.id}__`;
          const inv = invMap.get(k);
          built.push({
            product_id: p.id,
            product_name: p.name,
            product_sku: p.sku,
            size_variant: null,
            current_qty: inv?.qty ?? 0,
            edit_qty: String(inv?.qty ?? 0),
            inventory_id: inv?.id,
            dirty: false,
          });
        }
      }

      setRows(built);
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
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.product_name.toLowerCase().includes(q) ||
        (r.product_sku || '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const dirtyCount = rows.filter((r) => r.dirty).length;

  const updateQty = (idx: number, value: string) => {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, edit_qty: value, dirty: true } : r))
    );
  };

  const handleSave = async () => {
    if (!locationId) {
      toast.error('No inventory location for this branch');
      return;
    }
    const dirty = rows.filter((r) => r.dirty);
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
            size_variant: r.size_variant,
          });
        }

        await supabase.from('inventory_movements').insert({
          product_id: r.product_id,
          location_id: locationId,
          quantity_delta: delta,
          movement_type: delta > 0 ? 'in' : 'out',
          reason: 'Branch setup edit',
          size_variant: r.size_variant,
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
          On-hand stock at this branch. Includes all physical products.
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
              filtered.map((r, i) => {
                const idx = rows.indexOf(r);
                return (
                  <TableRow key={`${r.product_id}-${r.size_variant ?? 'none'}`} className={r.dirty ? 'bg-primary/5' : ''}>
                    <TableCell className="font-medium">{r.product_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.product_sku}</TableCell>
                    <TableCell className="text-sm">{variantLabel(r.size_variant)}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min="0"
                        value={r.edit_qty}
                        onChange={(e) => updateQty(idx, e.target.value)}
                        className="h-8 w-24 ml-auto text-right font-mono"
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
