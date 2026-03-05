/**
 * Inventory List Tab — Compact table with dynamic branch columns
 * One row per product, variants cascade on click
 * Supports inline mass-edit mode for branch stock quantities
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Package, AlertTriangle, PackageX, ChevronRight, Pencil, Save, X, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useBranches } from '@/hooks/useBranches';
import { toast } from 'sonner';

/** Per-branch stock info for a single variant */
interface BranchQty {
  qty: number;
  reserved: number;
}

interface VariantInfo {
  label: string;
  branchQty: Record<string, BranchQty>; // branch_id -> qty
  cost_per_unit: number | null;
}

interface ProductRow {
  product_id: string;
  product_name: string;
  cost_price: number | null;
  sell_price: number | null;
  warn_below_quantity: number | null;
  branchTotals: Record<string, number>; // branch_id -> total qty
  grandTotal: number;
  variants: VariantInfo[];
  hasVariants: boolean;
}

function variantLabel(sizeVariant: string | null, variantCombination: any): string {
  const parts: string[] = [];
  if (sizeVariant) parts.push(sizeVariant);
  if (variantCombination && typeof variantCombination === 'object') {
    for (const [, value] of Object.entries(variantCombination)) {
      if (value) parts.push(`${value}`);
    }
  }
  return parts.length > 0 ? parts.join(' / ') : '—';
}

// Key for edit tracking: productId_variantLabel_branchId
type EditKey = string;
function makeEditKey(productId: string, variantLabel: string, branchId: string): EditKey {
  return `${productId}__${variantLabel}__${branchId}`;
}

const InventoryListTab: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [isEditMode, setIsEditMode] = useState(false);
  const [editValues, setEditValues] = useState<Record<EditKey, string>>({});
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { branches } = useBranches();

  const { data: allProducts = [], isLoading: productsLoading } = useQuery({
    queryKey: ['inventory-all-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, is_service, warn_below_quantity, requires_size, available_sizes, base_price')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  const { data: inventoryItems = [], isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          *,
          product:products(name, sku),
          location:inventory_locations(name, branch_id)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch branch location IDs for creating new inventory items
  const { data: branchLocations = [] } = useQuery({
    queryKey: ['branch-inventory-locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_locations')
        .select('id, branch_id')
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: isEditMode,
  });

  const branchLocationMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const loc of branchLocations) {
      if (loc.branch_id && !map.has(loc.branch_id)) {
        map.set(loc.branch_id, loc.id);
      }
    }
    return map;
  }, [branchLocations]);

  const isLoading = productsLoading || inventoryLoading;

  // Build product rows grouped by product_id only
  const productRows: ProductRow[] = useMemo(() => {
    const invByProduct = new Map<string, typeof inventoryItems>();
    for (const item of inventoryItems) {
      const pid = item.product_id;
      if (!invByProduct.has(pid)) invByProduct.set(pid, []);
      invByProduct.get(pid)!.push(item);
    }

    const rows: ProductRow[] = [];

    for (const product of allProducts) {
      if (product.is_service) continue;

      const items = invByProduct.get(product.id) || [];

      const branchTotals: Record<string, number> = {};
      for (const b of branches) branchTotals[b.id] = 0;

      let grandTotal = 0;
      const costValues: number[] = [];

      const variantMap = new Map<string, Record<string, BranchQty>>();

      const hasSize = items.some(i => i.size_variant);
      const hasCombo = items.some(i => i.variant_combination && Object.keys(i.variant_combination as object).length > 0);
      const hasVariants = hasSize || hasCombo || (product.requires_size && (product.available_sizes as string[] || []).length > 0);

      for (const item of items) {
        const branchId = (item as any)?.location?.branch_id as string | undefined;
        if (!branchId) continue;

        branchTotals[branchId] = (branchTotals[branchId] || 0) + item.quantity_on_hand;
        grandTotal += item.quantity_on_hand;
        if (item.cost_per_unit != null) costValues.push(item.cost_per_unit);

        if (hasVariants) {
          const label = variantLabel(item.size_variant, item.variant_combination);
          if (!variantMap.has(label)) variantMap.set(label, {});
          const bMap = variantMap.get(label)!;
          if (!bMap[branchId]) bMap[branchId] = { qty: 0, reserved: 0 };
          bMap[branchId].qty += item.quantity_on_hand;
          bMap[branchId].reserved += item.quantity_reserved;
        }
      }

      // Add defined sizes with zero stock if missing
      if (hasVariants && Array.isArray(product.available_sizes)) {
        for (const size of product.available_sizes as string[]) {
          if (!variantMap.has(size)) variantMap.set(size, {});
        }
      }

      const variants: VariantInfo[] = [];
      if (hasVariants) {
        for (const [label, bMap] of variantMap.entries()) {
          const matchingItem = items.find(i => variantLabel(i.size_variant, i.variant_combination) === label);
          variants.push({
            label,
            branchQty: bMap,
            cost_per_unit: matchingItem?.cost_per_unit ?? null,
          });
        }
      }

      const avgCost = costValues.length > 0
        ? costValues.reduce((a, b) => a + b, 0) / costValues.length
        : null;

      rows.push({
        product_id: product.id,
        product_name: product.name,
        cost_price: avgCost,
        sell_price: product.base_price ?? null,
        warn_below_quantity: product.warn_below_quantity ?? null,
        branchTotals,
        grandTotal,
        variants,
        hasVariants,
      });
    }

    return rows;
  }, [allProducts, inventoryItems, branches]);

  const getStockStatus = (qty: number, warnBelow: number | null) => {
    if (qty < 0) return 'negative';
    if (qty === 0) return 'out_of_stock';
    if (warnBelow != null && qty <= warnBelow) return 'low_stock';
    return 'in_stock';
  };

  const filteredItems = productRows.filter(item => {
    const matchesSearch = item.product_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const status = getStockStatus(item.grandTotal, item.warn_below_quantity);
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalItems = filteredItems.length;
  const totalValue = filteredItems.reduce((sum, item) => sum + (item.grandTotal * (item.cost_price || 0)), 0);
  const lowStockCount = filteredItems.filter(item => getStockStatus(item.grandTotal, item.warn_below_quantity) === 'low_stock').length;
  const outOfStockCount = filteredItems.filter(item => getStockStatus(item.grandTotal, item.warn_below_quantity) === 'out_of_stock').length;

  const toggleExpanded = (productId: string) => {
    setExpandedProducts(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const enterEditMode = useCallback(() => {
    // Pre-populate editValues from current data and expand all products with variants
    const values: Record<EditKey, string> = {};
    const expanded = new Set<string>();

    for (const row of productRows) {
      if (row.hasVariants) {
        expanded.add(row.product_id);
        for (const v of row.variants) {
          for (const b of branches) {
            const key = makeEditKey(row.product_id, v.label, b.id);
            values[key] = String(v.branchQty[b.id]?.qty || 0);
          }
        }
      } else {
        // Non-variant product: use branchTotals
        for (const b of branches) {
          const key = makeEditKey(row.product_id, '—', b.id);
          values[key] = String(row.branchTotals[b.id] || 0);
        }
      }
    }

    setEditValues(values);
    setExpandedProducts(expanded);
    setIsEditMode(true);
  }, [productRows, branches]);

  const cancelEditMode = () => {
    setIsEditMode(false);
    setEditValues({});
  };

  const handleEditValueChange = (key: EditKey, value: string) => {
    setEditValues(prev => ({ ...prev, [key]: value }));
  };

  const saveEdits = async () => {
    setSaving(true);
    try {
      // Calculate deltas by comparing editValues to current data
      const updates: Array<{
        product_id: string;
        branch_id: string;
        size_variant: string | null;
        new_qty: number;
        current_qty: number;
      }> = [];

      for (const row of productRows) {
        if (row.hasVariants) {
          for (const v of row.variants) {
            for (const b of branches) {
              const key = makeEditKey(row.product_id, v.label, b.id);
              const newQty = parseInt(editValues[key] || '0') || 0;
              const currentQty = v.branchQty[b.id]?.qty || 0;
              if (newQty !== currentQty) {
                updates.push({
                  product_id: row.product_id,
                  branch_id: b.id,
                  size_variant: v.label === '—' ? null : v.label,
                  new_qty: newQty,
                  current_qty: currentQty,
                });
              }
            }
          }
        } else {
          for (const b of branches) {
            const key = makeEditKey(row.product_id, '—', b.id);
            const newQty = parseInt(editValues[key] || '0') || 0;
            const currentQty = row.branchTotals[b.id] || 0;
            if (newQty !== currentQty) {
              updates.push({
                product_id: row.product_id,
                branch_id: b.id,
                size_variant: null,
                new_qty: newQty,
                current_qty: currentQty,
              });
            }
          }
        }
      }

      if (updates.length === 0) {
        toast.info('No changes to save');
        setIsEditMode(false);
        return;
      }

      // Process each update
      for (const update of updates) {
        const locationId = branchLocationMap.get(update.branch_id);
        if (!locationId) {
          console.warn(`No inventory location for branch ${update.branch_id}, skipping`);
          continue;
        }

        // Find existing inventory item
        let query = supabase
          .from('inventory_items')
          .select('id, quantity_on_hand')
          .eq('product_id', update.product_id)
          .eq('location_id', locationId);

        if (update.size_variant) {
          query = query.eq('size_variant', update.size_variant);
        } else {
          query = query.is('size_variant', null);
        }

        const { data: existing } = await query.maybeSingle();

        if (existing) {
          // Update existing
          await supabase
            .from('inventory_items')
            .update({ quantity_on_hand: update.new_qty, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
        } else {
          // Create new inventory item
          await supabase
            .from('inventory_items')
            .insert({
              product_id: update.product_id,
              location_id: locationId,
              quantity_on_hand: update.new_qty,
              quantity_reserved: 0,
              size_variant: update.size_variant,
            });
        }

        // Record movement
        const delta = update.new_qty - update.current_qty;
        await supabase
          .from('inventory_movements')
          .insert({
            product_id: update.product_id,
            location_id: locationId,
            quantity_delta: delta,
            movement_type: delta > 0 ? 'in' : 'out',
            reason: 'Mass stock edit',
            size_variant: update.size_variant,
          });
      }

      toast.success(`Updated ${updates.length} stock entries`);
      setIsEditMode(false);
      setEditValues({});
      queryClient.invalidateQueries({ queryKey: ['inventory-list'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-all-products'] });
    } catch (error) {
      console.error('Error saving stock edits:', error);
      toast.error('Failed to save stock changes');
    } finally {
      setSaving(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'negative':
        return <Badge variant="destructive" className="text-[10px] px-1.5 py-0"><AlertTriangle className="w-2.5 h-2.5 mr-0.5" />NEG</Badge>;
      case 'out_of_stock':
        return <Badge variant="destructive" className="text-[10px] px-1.5 py-0"><PackageX className="w-2.5 h-2.5 mr-0.5" />OOS</Badge>;
      case 'low_stock':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-[10px] px-1.5 py-0"><AlertTriangle className="w-2.5 h-2.5 mr-0.5" />Low</Badge>;
      default:
        return <Badge variant="secondary" className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0"><Package className="w-2.5 h-2.5 mr-0.5" />OK</Badge>;
    }
  };

  const renderBranchCell = (productId: string, vLabel: string, branchId: string, currentQty: number) => {
    if (!isEditMode) {
      return (
        <span className={`font-mono ${currentQty === 0 ? 'text-muted-foreground/40' : ''}`}>
          {currentQty}
        </span>
      );
    }

    const key = makeEditKey(productId, vLabel, branchId);
    const value = editValues[key] ?? String(currentQty);

    return (
      <Input
        type="number"
        min="0"
        value={value}
        onChange={(e) => handleEditValueChange(key, e.target.value)}
        className="h-6 w-14 text-xs text-center font-mono px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    );
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="flex flex-wrap gap-2">
        <Card className="flex-1 min-w-[100px]"><CardContent className="p-2 flex items-center gap-2">
          <span className="text-lg font-bold">{totalItems}</span>
          <span className="text-xs text-muted-foreground">Products</span>
        </CardContent></Card>
        <Card className="flex-1 min-w-[120px]"><CardContent className="p-2 flex items-center gap-2">
          <span className="text-lg font-bold">${totalValue.toFixed(2)}</span>
          <span className="text-xs text-muted-foreground">Value</span>
        </CardContent></Card>
        <Card className="flex-1 min-w-[100px]"><CardContent className="p-2 flex items-center gap-2">
          <span className="text-lg font-bold text-yellow-600">{lowStockCount}</span>
          <span className="text-xs text-muted-foreground">Low Stock</span>
        </CardContent></Card>
        <Card className="flex-1 min-w-[110px]"><CardContent className="p-2 flex items-center gap-2">
          <span className="text-lg font-bold text-destructive">{outOfStockCount}</span>
          <span className="text-xs text-muted-foreground">Out of Stock</span>
        </CardContent></Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-32 h-8 text-sm">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="in_stock">In Stock</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
            {!isEditMode ? (
              <Button variant="outline" size="sm" className="h-8" onClick={enterEditMode}>
                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                Edit Stock
              </Button>
            ) : (
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" className="h-8" onClick={cancelEditMode} disabled={saving}>
                  <X className="w-3.5 h-3.5 mr-1" />
                  Cancel
                </Button>
                <Button size="sm" className="h-8" onClick={saveEdits} disabled={saving}>
                  {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                  Save
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">No inventory items found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="h-8 px-3 text-xs font-semibold min-w-[180px]">Product</TableHead>
                    <TableHead className="h-8 px-2 text-xs font-semibold text-right w-[70px]">Cost</TableHead>
                    <TableHead className="h-8 px-2 text-xs font-semibold text-right w-[70px]">Sell</TableHead>
                    {branches.map(b => (
                      <TableHead key={b.id} className="h-8 px-2 text-xs font-semibold text-center w-[70px]">{b.name}</TableHead>
                    ))}
                    <TableHead className="h-8 px-2 text-xs font-semibold text-center w-[50px]">Total</TableHead>
                    <TableHead className="h-8 px-2 text-xs font-semibold text-center w-[50px]">Warn</TableHead>
                    <TableHead className="h-8 px-2 text-xs font-semibold text-center w-[60px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((row) => {
                    const isExpanded = isEditMode ? (row.hasVariants ? true : false) : expandedProducts.has(row.product_id);
                    const status = getStockStatus(row.grandTotal, row.warn_below_quantity);

                    return (
                      <React.Fragment key={row.product_id}>
                        {/* Product row */}
                        <TableRow
                          className={`${!isEditMode && row.hasVariants ? 'cursor-pointer' : ''} hover:bg-muted/40`}
                          onClick={() => !isEditMode && row.hasVariants && toggleExpanded(row.product_id)}
                        >
                          <TableCell className="py-1.5 px-3 text-sm font-medium">
                            <div className="flex items-center gap-1.5">
                              {row.hasVariants && (
                                <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
                              )}
                              <span className="truncate">{row.product_name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-1.5 px-2 text-xs text-right font-mono text-muted-foreground">
                            {row.cost_price != null ? `$${row.cost_price.toFixed(2)}` : '—'}
                          </TableCell>
                          <TableCell className="py-1.5 px-2 text-xs text-right font-mono text-muted-foreground">
                            {row.sell_price != null ? `$${row.sell_price.toFixed(2)}` : '—'}
                          </TableCell>
                          {branches.map(b => {
                            const qty = row.branchTotals[b.id] || 0;
                            return (
                              <TableCell key={b.id} className="py-1.5 px-2 text-xs text-center">
                                {row.hasVariants ? (
                                  <span className={`font-mono ${qty === 0 ? 'text-muted-foreground/40' : ''}`}>{qty}</span>
                                ) : (
                                  renderBranchCell(row.product_id, '—', b.id, qty)
                                )}
                              </TableCell>
                            );
                          })}
                          <TableCell className="py-1.5 px-2 text-xs text-center font-mono font-semibold">
                            {row.grandTotal}
                          </TableCell>
                          <TableCell className="py-1.5 px-2 text-xs text-center font-mono text-yellow-600">
                            {row.warn_below_quantity != null ? row.warn_below_quantity : '—'}
                          </TableCell>
                          <TableCell className="py-1.5 px-2 text-center">
                            {renderStatusBadge(status)}
                          </TableCell>
                        </TableRow>

                        {/* Variant sub-rows — in edit mode, always show all variants */}
                        {isExpanded && row.variants.map((v, vIdx) => {
                          const vTotal = branches.reduce((sum, b) => sum + (v.branchQty[b.id]?.qty || 0), 0);
                          return (
                            <TableRow key={`${row.product_id}-v-${vIdx}`} className="bg-muted/20">
                              <TableCell className="py-1 px-3 pl-10 text-xs text-muted-foreground">
                                {v.label}
                              </TableCell>
                              <TableCell className="py-1 px-2 text-xs text-right font-mono text-muted-foreground/60">
                                {v.cost_per_unit != null ? `$${v.cost_per_unit.toFixed(2)}` : ''}
                              </TableCell>
                              <TableCell className="py-1 px-2" />
                              {branches.map(b => {
                                const bQty = v.branchQty[b.id]?.qty || 0;
                                return (
                                  <TableCell key={b.id} className="py-1 px-2 text-xs text-center">
                                    {renderBranchCell(row.product_id, v.label, b.id, bQty)}
                                  </TableCell>
                                );
                              })}
                              <TableCell className="py-1 px-2 text-xs text-center font-mono text-muted-foreground">
                                {vTotal}
                              </TableCell>
                              <TableCell className="py-1 px-2" />
                              <TableCell className="py-1 px-2" />
                            </TableRow>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryListTab;