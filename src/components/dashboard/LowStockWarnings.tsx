import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface LowStockItem {
  productId: string;
  productName: string;
  sku: string | null;
  warnBelowQuantity: number;
  branchName: string;
  branchId: string;
  currentStock: number;
}

const LowStockWarnings: React.FC = () => {
  const { data: lowStockItems = [], isLoading } = useQuery({
    queryKey: ['low-stock-warnings'],
    queryFn: async () => {
      // Fetch products with warn_below_quantity set
      const { data: products, error: pError } = await supabase
        .from('products')
        .select('id, name, sku, warn_below_quantity')
        .not('warn_below_quantity', 'is', null)
        .eq('is_service', false);

      if (pError || !products || products.length === 0) return [];

      // Fetch all inventory items for these products with location+branch info
      const productIds = products.map(p => p.id);
      const { data: invItems, error: iError } = await supabase
        .from('inventory_items')
        .select('product_id, quantity_on_hand, inventory_locations(branch_id, branches(name))')
        .in('product_id', productIds);

      if (iError) return [];

      // Fetch branches to also show branches with 0 stock
      const { data: branches } = await supabase.from('branches').select('id, name');

      // Aggregate stock per product per branch
      const stockMap = new Map<string, number>(); // key: productId|branchId
      for (const item of (invItems || [])) {
        const loc = item.inventory_locations as any;
        if (!loc) continue;
        const key = `${item.product_id}|${loc.branch_id}`;
        stockMap.set(key, (stockMap.get(key) || 0) + item.quantity_on_hand);
      }

      const warnings: LowStockItem[] = [];
      for (const product of products) {
        const threshold = (product as any).warn_below_quantity as number;
        for (const branch of (branches || [])) {
          const key = `${product.id}|${branch.id}`;
          const currentStock = stockMap.get(key) || 0;
          if (currentStock <= threshold) {
            warnings.push({
              productId: product.id,
              productName: product.name,
              sku: product.sku,
              warnBelowQuantity: threshold,
              branchName: branch.name,
              branchId: branch.id,
              currentStock,
            });
          }
        }
      }

      return warnings.sort((a, b) => a.currentStock - b.currentStock);
    },
    staleTime: 60 * 1000,
    refetchInterval: 120 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Low Stock Warnings</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (lowStockItems.length === 0) return null;

  return (
    <Card className="border-yellow-300 dark:border-yellow-700">
      <CardHeader className="px-3 py-3 sm:px-6 sm:py-4 pb-2">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          Low Stock ({lowStockItems.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {lowStockItems.map((item, idx) => (
            <div key={`${item.productId}-${item.branchId}-${idx}`} className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{item.productName}</p>
                <p className="text-xs text-muted-foreground">
                  {item.branchName}
                  {item.sku && ` • SKU: ${item.sku}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="font-mono font-medium text-sm text-destructive">{item.currentStock}</span>
                  <span className="text-xs text-muted-foreground"> / {item.warnBelowQuantity}</span>
                </div>
                <Badge variant="destructive" className="text-[10px]">
                  {item.currentStock === 0 ? 'Out' : 'Low'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default LowStockWarnings;
