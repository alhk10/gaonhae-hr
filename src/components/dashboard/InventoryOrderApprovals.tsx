/**
 * Inventory Order Approvals
 * Dashboard widget for superadmins to approve/reject purchase orders
 */

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/utils/dateFormat';
import { 
  getInventoryOrders, 
  approveInventoryOrder, 
  rejectInventoryOrder,
  InventoryOrder 
} from '@/services/inventoryOrderService';
import { useAuth } from '@/contexts/AuthContext';

import { Check, X, Package, ShoppingCart } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const InventoryOrderApprovals: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<InventoryOrder | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: pendingOrders = [], isLoading } = useQuery({
    queryKey: ['inventory-orders', 'pending'],
    queryFn: () => getInventoryOrders({ status: 'pending' }),
    refetchInterval: 60 * 1000
  });

  const handleApprove = async () => {
    if (!selectedOrder || !user?.email) return;
    setIsProcessing(true);
    try {
      const success = await approveInventoryOrder(selectedOrder.id, user.email);
      if (success) {
        queryClient.invalidateQueries({ queryKey: ['inventory-orders'] });
        queryClient.invalidateQueries({ queryKey: ['inventory-list'] });
        queryClient.invalidateQueries({ queryKey: ['pending-orders-count'] });
      }
    } finally {
      setIsProcessing(false);
      setApproveDialogOpen(false);
      setSelectedOrder(null);
    }
  };

  const handleReject = async () => {
    if (!selectedOrder || !user?.email) return;
    setIsProcessing(true);
    try {
      const success = await rejectInventoryOrder(selectedOrder.id, user.email);
      if (success) {
        queryClient.invalidateQueries({ queryKey: ['inventory-orders'] });
        queryClient.invalidateQueries({ queryKey: ['pending-orders-count'] });
      }
    } finally {
      setIsProcessing(false);
      setRejectDialogOpen(false);
      setSelectedOrder(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="px-3 py-3 sm:px-6 sm:py-4">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Pending Purchase Orders
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
          <div className="space-y-2">
            {[1, 2].map(i => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingOrders.length === 0) return null;

  return (
    <>
      <Card className="border-orange-200">
        <CardHeader className="px-3 py-3 sm:px-6 sm:py-4">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-orange-600" />
            Purchase Orders
            <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs">
              {pendingOrders.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
          <div className="space-y-2">
            {pendingOrders.map(order => (
              <div 
                key={order.id} 
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 sm:p-4 bg-muted/50 rounded-lg border"
              >
                <div className="flex items-start gap-2 sm:gap-4 min-w-0">
                  <div className="p-1.5 sm:p-2 bg-orange-100 rounded-lg shrink-0">
                    <Package className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{order.product?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.order_number} · {order.quantity} units @ ${order.unit_cost.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.location?.name} · {order.requested_by_email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
                  <div className="text-left sm:text-right">
                    <p className="font-bold text-sm">${order.total_cost.toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDate(new Date(order.created_at))}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-destructive"
                      onClick={() => { setSelectedOrder(order); setRejectDialogOpen(true); }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => { setSelectedOrder(order); setApproveDialogOpen(true); }}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Purchase Order</AlertDialogTitle>
            <AlertDialogDescription>
              Approve order <strong>{selectedOrder?.order_number}</strong> — {selectedOrder?.quantity} units of <strong>{selectedOrder?.product?.name}</strong> at ${selectedOrder?.unit_cost.toFixed(2)}/unit (Total: ${selectedOrder?.total_cost.toFixed(2)}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={isProcessing} className="bg-green-600 hover:bg-green-700">
              {isProcessing ? 'Processing...' : 'Approve'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Purchase Order</AlertDialogTitle>
            <AlertDialogDescription>
              Reject order <strong>{selectedOrder?.order_number}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} disabled={isProcessing} className="bg-destructive hover:bg-destructive/90">
              {isProcessing ? 'Processing...' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default InventoryOrderApprovals;
