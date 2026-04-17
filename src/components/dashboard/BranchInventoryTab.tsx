import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Package, ArrowRightLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { InventoryAdjustmentDialog } from '@/components/sales/InventoryAdjustmentDialog';
import StockTransferRequestDialog from './StockTransferRequestDialog';
import { getTransferRequestsByBranch } from '@/services/inventoryTransferService';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { formatDate } from '@/utils/dateFormat';

interface BranchInventoryTabProps {
  branchId: string;
}

interface VariantRow {
  label: string;
  size_variant: string | null;
  variant_combination: any;
  quantity_on_hand: number;
}

interface ProductGroup {
  product: any;
  totalQty: number;
  variants: VariantRow[];
  hasVariants: boolean;
}

const BranchInventoryTab: React.FC<BranchInventoryTabProps> = ({ branchId }) => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [adjustProduct, setAdjustProduct] = useState<any>(null);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [editingWarnBelow, setEditingWarnBelow] = useState<string | null>(null);
  const [warnBelowValue, setWarnBelowValue] = useState<string>('');

  // Fetch inventory locations for this branch
  const { data: locations = [] } = useQuery({
    queryKey: ['branch-inventory-locations', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_locations')
        .select('id')
        .eq('branch_id', branchId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!branchId,
  });

  const locationIds = locations.map(l => l.id);

  // Fetch inventory items for these locations
  const { data: inventoryItems = [], isLoading: inventoryLoading, refetch: refetchInventory } = useQuery({
    queryKey: ['branch-inventory-items', branchId, locationIds],
    queryFn: async () => {
      if (locationIds.length === 0) return [];
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*, products(id, name, sku, category_id, requires_size, available_sizes)')
        .in('location_id', locationIds)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: locationIds.length > 0,
  });

  // Fetch ALL products so we can show ones with 0 stock too
  const { data: allProducts = [], isLoading: productsLoading } = useQuery({
    queryKey: ['all-products-for-inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, category_id, requires_size, available_sizes, is_service, warn_below_quantity')
        .eq('is_service', false)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = inventoryLoading || productsLoading;

  // Group by product, ensure all variants are represented
  const productGroups = React.useMemo(() => {
    const inventoryByProduct = new Map<string, typeof inventoryItems>();
    for (const item of inventoryItems) {
      const pid = (item.products as any)?.id || item.product_id;
      if (!inventoryByProduct.has(pid)) inventoryByProduct.set(pid, []);
      inventoryByProduct.get(pid)!.push(item);
    }

    const groups: ProductGroup[] = [];

    const buildLabel = (sizeVariant: string | null, variantCombination: any): string => {
      const parts: string[] = [];
      if (sizeVariant) parts.push(sizeVariant);
      if (variantCombination && typeof variantCombination === 'object') {
        for (const [, value] of Object.entries(variantCombination)) {
          if (value) parts.push(`${value}`);
        }
      }
      return parts.length > 0 ? parts.join(' / ') : '—';
    };

    for (const product of allProducts) {
      const invItems = inventoryByProduct.get(product.id) || [];
      const definedSizes = Array.isArray(product.available_sizes) ? (product.available_sizes as string[]) : [];
      
      // Collect all variant rows from inventory
      const variantMap = new Map<string, VariantRow>();
      let hasAnyVariant = false;
      
      for (const inv of invItems) {
        const hasSizeOrCombo = inv.size_variant || (inv.variant_combination && Object.keys(inv.variant_combination as object).length > 0);
        if (hasSizeOrCombo) {
          hasAnyVariant = true;
          const label = buildLabel(inv.size_variant, inv.variant_combination);
          const existing = variantMap.get(label);
          variantMap.set(label, {
            label,
            size_variant: inv.size_variant,
            variant_combination: inv.variant_combination,
            quantity_on_hand: (existing?.quantity_on_hand || 0) + inv.quantity_on_hand,
          });
        }
      }

      const hasSizes = product.requires_size || definedSizes.length > 0 || hasAnyVariant;

      if (hasSizes) {
        // Add defined sizes not yet in inventory
        for (const size of definedSizes) {
          if (!variantMap.has(size)) {
            variantMap.set(size, { label: size, size_variant: size, variant_combination: null, quantity_on_hand: 0 });
          }
        }
        const variants = Array.from(variantMap.values());
        const totalQty = variants.reduce((sum, v) => sum + v.quantity_on_hand, 0);
        groups.push({ product, totalQty, variants, hasVariants: true });
      } else {
        const totalQty = invItems.reduce((sum, inv) => sum + inv.quantity_on_hand, 0);
        groups.push({ product, totalQty, variants: [{ label: '—', size_variant: null, variant_combination: null, quantity_on_hand: totalQty }], hasVariants: false });
      }
    }

    return groups;
  }, [allProducts, inventoryItems]);

  // Fetch transfer requests for this branch
  const { data: transferRequests = [], refetch: refetchTransfers } = useQuery({
    queryKey: ['branch-transfer-requests', branchId],
    queryFn: () => getTransferRequestsByBranch(branchId),
    enabled: !!branchId,
  });

  const pendingTransfers = transferRequests.filter(r => r.status === 'pending');

  const filteredGroups = productGroups.filter(group => {
    const name = group.product?.name?.toLowerCase() || '';
    const sku = group.product?.sku?.toLowerCase() || '';
    return name.includes(searchTerm.toLowerCase()) || sku.includes(searchTerm.toLowerCase());
  });

  const toggleExpanded = (productId: string) => {
    setExpandedProducts(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const saveWarnBelow = async (productId: string) => {
    const val = warnBelowValue.trim() === '' ? null : parseInt(warnBelowValue, 10);
    if (val !== null && isNaN(val)) {
      toast.error('Please enter a valid number');
      return;
    }
    const { error } = await supabase
      .from('products')
      .update({ warn_below_quantity: val } as any)
      .eq('id', productId);
    if (error) {
      toast.error('Failed to update threshold');
    } else {
      toast.success('Threshold updated');
      queryClient.invalidateQueries({ queryKey: ['all-products-for-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock-warnings'] });
    }
    setEditingWarnBelow(null);
  };

  const renderWarnBelow = (product: any) => {
    const warnQty = product.warn_below_quantity;
    if (editingWarnBelow === product.id) {
      return (
        <Input
          type="number"
          className="w-16 h-7 text-xs"
          value={warnBelowValue}
          onChange={(e) => setWarnBelowValue(e.target.value)}
          onBlur={() => saveWarnBelow(product.id)}
          onKeyDown={(e) => { if (e.key === 'Enter') saveWarnBelow(product.id); if (e.key === 'Escape') setEditingWarnBelow(null); }}
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      );
    }
    return (
      <span
        className="text-xs text-muted-foreground cursor-pointer hover:text-foreground min-w-[40px] text-center"
        title="Click to set warn threshold"
        onClick={(e) => {
          e.stopPropagation();
          setEditingWarnBelow(product.id);
          setWarnBelowValue(warnQty != null ? String(warnQty) : '');
        }}
      >
        {warnQty != null ? (
          <span className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-yellow-600" />
            {warnQty}
          </span>
        ) : '—'}
      </span>
    );
  };

  const getStockBadge = (qty: number) => {
    if (qty < 0) return <Badge variant="destructive">Negative ({qty})</Badge>;
    if (qty === 0) return <Badge variant="destructive">Out of Stock</Badge>;
    if (qty <= 5) return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-300">Low Stock</Badge>;
    return <Badge variant="secondary">In Stock</Badge>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge className="bg-yellow-500/20 text-yellow-700">Pending</Badge>;
      case 'approved': return <Badge className="bg-green-500/20 text-green-700">Approved</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Actions Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex-1" />
        <Button size="sm" onClick={() => setTransferDialogOpen(true)}>
          <ArrowRightLeft className="w-4 h-4 mr-2" />
          Request Stock Transfer
        </Button>
      </div>

      {/* Inventory List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5" />
            Branch Inventory ({filteredGroups.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No inventory items found for this branch
            </div>
          ) : (
            <div className="divide-y">
              {filteredGroups.map(group => {
                const product = group.product;
                const isExpanded = expandedProducts.has(product.id);

                if (!group.hasVariants) {
                  // Simple product - no expansion needed
                  return (
                    <div key={product.id} className="p-4 flex items-center justify-between hover:bg-muted/50">
                      <div>
                        <p className="font-medium">{product?.name || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">
                          {product?.sku && <>SKU: {product.sku}</>}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {renderWarnBelow(product)}
                        {getStockBadge(group.totalQty)}
                        <span className="font-mono font-medium text-sm w-12 text-right">{group.totalQty}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAdjustProduct(product);
                            setAdjustDialogOpen(true);
                          }}
                        >
                          Adjust
                        </Button>
                      </div>
                    </div>
                  );
                }

                // Product with variants - collapsible
                return (
                  <Collapsible key={product.id} open={isExpanded} onOpenChange={() => toggleExpanded(product.id)}>
                    <CollapsibleTrigger asChild>
                      <div className="p-4 flex items-center justify-between hover:bg-muted/50 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          <div>
                            <p className="font-medium">{product?.name || 'Unknown'}</p>
                            <p className="text-sm text-muted-foreground">
                              {product?.sku && <>SKU: {product.sku}</>}
                              {' • '}{group.variants.length} variant{group.variants.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {renderWarnBelow(product)}
                          {getStockBadge(group.totalQty)}
                          <span className="font-mono font-medium text-sm w-12 text-right">{group.totalQty}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAdjustProduct(product);
                              setAdjustDialogOpen(true);
                            }}
                          >
                            Adjust
                          </Button>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t bg-muted/20">
                        {group.variants.map((variant, vIdx) => (
                          <div key={variant.label + vIdx} className="px-4 py-2 pl-12 flex items-center justify-between border-b last:border-b-0">
                            <span className="text-sm">{variant.label}</span>
                            <div className="flex items-center gap-3">
                              {getStockBadge(variant.quantity_on_hand)}
                              <span className="font-mono text-sm w-12 text-right">{variant.quantity_on_hand}</span>
                              <div className="w-[68px]" /> {/* spacer to align with Adjust button */}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transfer Requests */}
      {transferRequests.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5" />
              Stock Transfer Requests
              {pendingTransfers.length > 0 && (
                <Badge variant="secondary">{pendingTransfers.length} pending</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {transferRequests.slice(0, 10).map(req => (
                <div key={req.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{req.product_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {req.from_branch_name} → {req.to_branch_name} • Qty: {req.quantity}
                    </p>
                    {req.reason && <p className="text-xs text-muted-foreground mt-1">{req.reason}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{formatDate(new Date(req.created_at))}</span>
                    {getStatusBadge(req.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <InventoryAdjustmentDialog
        product={adjustProduct}
        open={adjustDialogOpen}
        onOpenChange={setAdjustDialogOpen}
        onAdjustmentComplete={() => { refetchInventory(); refetchTransfers(); }}
        branchId={branchId}
      />

      <StockTransferRequestDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        fromBranchId={branchId}
        onRequestCreated={() => refetchTransfers()}
      />
    </div>
  );
};

export default BranchInventoryTab;
