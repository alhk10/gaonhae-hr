import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface NegativeInventoryAlertProps {
  branchId?: string;
}

const SESSION_KEY = 'negative_inventory_dismissed';

const NegativeInventoryAlert: React.FC<NegativeInventoryAlertProps> = ({ branchId }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const { data: negativeItems = [] } = useQuery({
    queryKey: ['negative-inventory-alert', branchId],
    queryFn: async () => {
      let query = supabase
        .from('inventory_items')
        .select('id, quantity_on_hand, size_variant, product_id, location_id, products(name, sku), inventory_locations(name, branch_id)')
        .lt('quantity_on_hand', 0);

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) return [];

      // Filter by branch if needed
      let filtered = data;
      if (branchId) {
        filtered = data.filter((item: any) => item.inventory_locations?.branch_id === branchId);
      }

      // Get branch names
      const branchIds = [...new Set(filtered.map((item: any) => item.inventory_locations?.branch_id).filter(Boolean))];
      if (branchIds.length === 0) return [];

      const { data: branches } = await supabase
        .from('branches')
        .select('id, name')
        .in('id', branchIds);

      const branchMap = new Map((branches || []).map(b => [b.id, b.name]));

      return filtered.map((item: any) => ({
        id: item.id,
        productName: item.products?.name || 'Unknown',
        sku: item.products?.sku || '',
        sizeVariant: item.size_variant,
        quantity: item.quantity_on_hand,
        branchName: branchMap.get(item.inventory_locations?.branch_id) || 'Unknown',
      }));
    },
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (negativeItems.length > 0 && !sessionStorage.getItem(SESSION_KEY)) {
      setOpen(true);
    }
  }, [negativeItems]);

  const handleDismiss = () => {
    sessionStorage.setItem(SESSION_KEY, 'true');
    setOpen(false);
  };

  const handleGoToInventory = () => {
    sessionStorage.setItem(SESSION_KEY, 'true');
    setOpen(false);
    navigate('/sales/products');
  };

  if (negativeItems.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Negative Inventory Alert
          </DialogTitle>
          <DialogDescription>
            The following items have negative stock levels and need attention.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-60 overflow-y-auto space-y-2">
          {negativeItems.map((item: any) => (
            <div key={item.id} className="flex items-center justify-between p-2 rounded border bg-destructive/5">
              <div className="text-sm">
                <p className="font-medium">{item.productName}</p>
                <p className="text-muted-foreground text-xs">
                  {item.branchName}
                  {item.sizeVariant && ` · ${item.sizeVariant}`}
                </p>
              </div>
              <Badge variant="destructive">{item.quantity}</Badge>
            </div>
          ))}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleDismiss}>Dismiss</Button>
          <Button onClick={handleGoToInventory}>Go to Inventory</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NegativeInventoryAlert;
