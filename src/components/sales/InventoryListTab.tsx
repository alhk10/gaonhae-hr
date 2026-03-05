/**
 * Inventory List Tab
 * Displays inventory across all branches with filtering
 * Shows ALL products including those with 0 stock
 * Cascading variant display (size & color)
 */

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Package, AlertTriangle, PackageX, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useBranches } from '@/hooks/useBranches';

interface VariantRow {
  label: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  cost_per_unit: number | null;
}

interface ProductGroup {
  product_id: string;
  product_name: string;
  product_sku: string;
  branch_id: string | null;
  branch_name: string;
  warn_below_quantity: number | null;
  totalQty: number;
  totalReserved: number;
  totalAvailable: number;
  avgCost: number | null;
  variants: VariantRow[];
  hasVariants: boolean;
}

/** Build a human-readable label from size_variant + variant_combination */
function variantLabel(sizeVariant: string | null, variantCombination: any): string {
  const parts: string[] = [];
  if (sizeVariant) parts.push(sizeVariant);
  if (variantCombination && typeof variantCombination === 'object') {
    for (const [key, value] of Object.entries(variantCombination)) {
      if (value) parts.push(`${value}`);
    }
  }
  return parts.length > 0 ? parts.join(' / ') : '—';
}

const InventoryListTab: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  // Fetch branches for filter
  const { branches } = useBranches();

  // Fetch ALL non-service products
  const { data: allProducts = [], isLoading: productsLoading } = useQuery({
    queryKey: ['inventory-all-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, is_service, warn_below_quantity, requires_size, available_sizes')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch inventory items with location details (to resolve branch_id)
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

  const isLoading = productsLoading || inventoryLoading;

  // Build a map of branch_id -> branch_name from branches hook
  const branchNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of branches) map.set(b.id, b.name);
    return map;
  }, [branches]);

  // Build product groups with cascading variants — grouped by product + branch
  const productGroups: ProductGroup[] = useMemo(() => {
    const groupKey = (pid: string, branchId: string) => `${pid}__${branchId}`;
    const invByGroup = new Map<string, typeof inventoryItems>();
    const productsWithInventory = new Set<string>();

    for (const item of inventoryItems) {
      const branchId = (item as any)?.location?.branch_id as string | undefined;
      if (!branchId) continue;
      productsWithInventory.add(item.product_id);
      const key = groupKey(item.product_id, branchId);
      if (!invByGroup.has(key)) invByGroup.set(key, []);
      invByGroup.get(key)!.push(item);
    }

    const groups: ProductGroup[] = [];

    for (const product of allProducts) {
      if (product.is_service) continue;

      const productInvKeys = Array.from(invByGroup.keys()).filter(k => k.startsWith(`${product.id}__`));

      if (productInvKeys.length === 0) {
        groups.push({
          product_id: product.id,
          product_name: product.name,
          product_sku: product.sku || '-',
          branch_id: null,
          branch_name: '—',
          warn_below_quantity: product.warn_below_quantity ?? null,
          totalQty: 0,
          totalReserved: 0,
          totalAvailable: 0,
          avgCost: null,
          variants: [],
          hasVariants: false,
        });
        continue;
      }

      for (const key of productInvKeys) {
        const items = invByGroup.get(key)!;
        const branchId = (items[0] as any)?.location?.branch_id as string;
        const branchName = branchNameMap.get(branchId) || 'Unknown';

        const hasSize = items.some(i => i.size_variant);
        const hasCombo = items.some(i => i.variant_combination && Object.keys(i.variant_combination as object).length > 0);
        const hasVariants = hasSize || hasCombo;

        const variants: VariantRow[] = [];
        if (hasVariants) {
          const definedSizes = Array.isArray(product.available_sizes) ? (product.available_sizes as string[]) : [];
          const seenLabels = new Set<string>();

          for (const item of items) {
            const label = variantLabel(item.size_variant, item.variant_combination);
            seenLabels.add(label);
            variants.push({
              label,
              quantity_on_hand: item.quantity_on_hand,
              quantity_reserved: item.quantity_reserved,
              cost_per_unit: item.cost_per_unit,
            });
          }

          for (const size of definedSizes) {
            if (!seenLabels.has(size)) {
              variants.push({ label: size, quantity_on_hand: 0, quantity_reserved: 0, cost_per_unit: null });
            }
          }
        }

        const totalQty = items.reduce((s, i) => s + i.quantity_on_hand, 0);
        const totalReserved = items.reduce((s, i) => s + i.quantity_reserved, 0);
        const costsWithValue = items.filter(i => i.cost_per_unit != null);
        const avgCost = costsWithValue.length > 0
          ? costsWithValue.reduce((s, i) => s + (i.cost_per_unit || 0), 0) / costsWithValue.length
          : null;

        groups.push({
          product_id: product.id,
          product_name: product.name,
          product_sku: product.sku || '-',
          branch_id: branchId,
          branch_name: branchName,
          warn_below_quantity: product.warn_below_quantity ?? null,
          totalQty,
          totalReserved,
          totalAvailable: totalQty - totalReserved,
          avgCost,
          variants,
          hasVariants,
        });
      }
    }

    return groups;
  }, [allProducts, inventoryItems, branchNameMap]);

  const getStockStatus = (qty: number, reserved: number, warnBelow: number | null) => {
    const available = qty - reserved;
    if (available < 0) return 'negative';
    if (available === 0 && qty === 0) return 'out_of_stock';
    if (available === 0) return 'out_of_stock';
    if (warnBelow != null && qty <= warnBelow) return 'low_stock';
    return 'in_stock';
  };

  const filteredItems = productGroups.filter(item => {
    const matchesSearch =
      item.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product_sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBranch = branchFilter === 'all' || item.branch_id === branchFilter;
    const status = getStockStatus(item.totalQty, item.totalReserved, item.warn_below_quantity);
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    return matchesSearch && matchesBranch && matchesStatus;
  });

  const totalItems = filteredItems.length;
  const totalValue = filteredItems.reduce((sum, item) =>
    sum + (item.totalQty * (item.avgCost || 0)), 0
  );
  const lowStockCount = filteredItems.filter(item => getStockStatus(item.totalQty, item.totalReserved, item.warn_below_quantity) === 'low_stock').length;
  const outOfStockCount = filteredItems.filter(item => getStockStatus(item.totalQty, item.totalReserved, item.warn_below_quantity) === 'out_of_stock').length;

  const toggleExpanded = (key: string) => {
    setExpandedProducts(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderStatusBadge = (status: string, available: number) => {
    switch (status) {
      case 'negative':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Negative ({available})
          </Badge>
        );
      case 'out_of_stock':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <PackageX className="w-3 h-3" />
            Out of Stock
          </Badge>
        );
      case 'low_stock':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Low Stock
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 flex items-center gap-1">
            <Package className="w-3 h-3" />
            In Stock
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-sm text-muted-foreground">Total Items</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
            <p className="text-sm text-muted-foreground">Total Value</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{lowStockCount}</div>
            <p className="text-sm text-muted-foreground">Low Stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-destructive">{outOfStockCount}</div>
            <p className="text-sm text-muted-foreground">Out of Stock</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by product name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="in_stock">In Stock</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cascading Product List */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No inventory items found</div>
          ) : (
            <div className="border rounded-lg divide-y">
              {filteredItems.map((group, idx) => {
                const groupKey = `${group.product_id}__${group.branch_id || 'none'}`;
                const isExpanded = expandedProducts.has(groupKey);
                const status = getStockStatus(group.totalQty, group.totalReserved, group.warn_below_quantity);

                if (!group.hasVariants) {
                  // Simple product row
                  return (
                    <div key={groupKey} className="p-4 flex items-center justify-between hover:bg-muted/50">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{group.product_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {group.product_sku !== '-' && <>SKU: {group.product_sku} • </>}
                           {group.branch_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        {group.warn_below_quantity != null && (
                          <span className="flex items-center gap-1 text-xs text-yellow-600">
                            <AlertTriangle className="w-3 h-3" />
                            {group.warn_below_quantity}
                          </span>
                        )}
                        <span className="font-mono text-sm w-12 text-right">{group.totalQty}</span>
                        {group.avgCost != null && (
                          <span className="text-sm text-muted-foreground w-20 text-right">${group.avgCost.toFixed(2)}</span>
                        )}
                        {renderStatusBadge(status, group.totalAvailable)}
                      </div>
                    </div>
                  );
                }

                // Product with variants - collapsible
                return (
                  <Collapsible key={groupKey} open={isExpanded} onOpenChange={() => toggleExpanded(groupKey)}>
                    <CollapsibleTrigger asChild>
                      <div className="p-4 flex items-center justify-between hover:bg-muted/50 cursor-pointer">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{group.product_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {group.product_sku !== '-' && <>SKU: {group.product_sku} • </>}
                              {group.branch_name} • {group.variants.length} variant{group.variants.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          {group.warn_below_quantity != null && (
                            <span className="flex items-center gap-1 text-xs text-yellow-600">
                              <AlertTriangle className="w-3 h-3" />
                              {group.warn_below_quantity}
                            </span>
                          )}
                          <span className="font-mono text-sm w-12 text-right">{group.totalQty}</span>
                          {group.avgCost != null && (
                            <span className="text-sm text-muted-foreground w-20 text-right">${group.avgCost.toFixed(2)}</span>
                          )}
                          {renderStatusBadge(status, group.totalAvailable)}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t bg-muted/20">
                        {group.variants.map((variant, vIdx) => {
                          const vAvailable = variant.quantity_on_hand - variant.quantity_reserved;
                          const vStatus = getStockStatus(variant.quantity_on_hand, variant.quantity_reserved, null);
                          return (
                            <div key={vIdx} className="px-4 py-2 pl-12 flex items-center justify-between border-b last:border-b-0">
                              <span className="text-sm">{variant.label}</span>
                              <div className="flex items-center gap-4">
                                <span className="font-mono text-sm w-12 text-right">{variant.quantity_on_hand}</span>
                                {variant.cost_per_unit != null && (
                                  <span className="text-sm text-muted-foreground w-20 text-right">${variant.cost_per_unit.toFixed(2)}</span>
                                )}
                                {renderStatusBadge(vStatus, vAvailable)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryListTab;
