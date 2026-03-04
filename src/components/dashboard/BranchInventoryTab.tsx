import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Package, ArrowRightLeft, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { InventoryAdjustmentDialog } from '@/components/sales/InventoryAdjustmentDialog';
import StockTransferRequestDialog from './StockTransferRequestDialog';
import { getTransferRequestsByBranch, TransferRequestWithDetails } from '@/services/inventoryTransferService';
import { format } from 'date-fns';

interface BranchInventoryTabProps {
  branchId: string;
}

const BranchInventoryTab: React.FC<BranchInventoryTabProps> = ({ branchId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [adjustProduct, setAdjustProduct] = useState<any>(null);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);

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
        .select('id, name, sku, category_id, requires_size, available_sizes, is_service')
        .eq('is_service', false)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = inventoryLoading || productsLoading;

  // Merge: all products + their inventory data (default 0 qty)
  const mergedItems = React.useMemo(() => {
    // Build a map of product_id -> inventory items
    const inventoryByProduct = new Map<string, typeof inventoryItems>();
    for (const item of inventoryItems) {
      const pid = (item.products as any)?.id || item.product_id;
      if (!inventoryByProduct.has(pid)) inventoryByProduct.set(pid, []);
      inventoryByProduct.get(pid)!.push(item);
    }

    const result: Array<{ id: string; products: any; quantity_on_hand: number; size_variant: string | null; hasInventoryRecord: boolean }> = [];

    for (const product of allProducts) {
      const invItems = inventoryByProduct.get(product.id);
      if (invItems && invItems.length > 0) {
        // Use existing inventory rows
        for (const inv of invItems) {
          result.push({
            id: inv.id,
            products: inv.products,
            quantity_on_hand: inv.quantity_on_hand,
            size_variant: inv.size_variant,
            hasInventoryRecord: true,
          });
        }
      } else {
        // No inventory record — show with 0 stock, expand variants if applicable
        const sizes = product.requires_size && Array.isArray(product.available_sizes) && product.available_sizes.length > 0
          ? product.available_sizes as string[]
          : [null];
        for (const size of sizes) {
          result.push({
            id: `virtual-${product.id}-${size || 'default'}`,
            products: product,
            quantity_on_hand: 0,
            size_variant: size,
            hasInventoryRecord: false,
          });
        }
      }
    }

    return result;
  }, [allProducts, inventoryItems]);

  // Fetch transfer requests for this branch
  const { data: transferRequests = [], refetch: refetchTransfers } = useQuery({
    queryKey: ['branch-transfer-requests', branchId],
    queryFn: () => getTransferRequestsByBranch(branchId),
    enabled: !!branchId,
  });

  const pendingTransfers = transferRequests.filter(r => r.status === 'pending');

  const filteredItems = mergedItems.filter(item => {
    const product = item.products as any;
    const name = product?.name?.toLowerCase() || '';
    const sku = product?.sku?.toLowerCase() || '';
    return name.includes(searchTerm.toLowerCase()) || sku.includes(searchTerm.toLowerCase());
  });

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
            Branch Inventory ({filteredItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No inventory items found for this branch
            </div>
          ) : (
            <div className="divide-y">
              {filteredItems.map(item => {
                const product = item.products as any;
                return (
                  <div key={item.id} className="p-4 flex items-center justify-between hover:bg-muted/50">
                    <div>
                      <p className="font-medium">{product?.name || 'Unknown'}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {product?.sku && <span>SKU: {product.sku}</span>}
                        {item.size_variant && <span>• Size: {item.size_variant}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStockBadge(item.quantity_on_hand)}
                      <span className="font-mono font-medium text-sm w-12 text-right">{item.quantity_on_hand}</span>
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
                    <span className="text-xs text-muted-foreground">{format(new Date(req.created_at), 'dd MMM yyyy')}</span>
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
