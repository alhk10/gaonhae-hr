/**
 * Inventory Order Approvals
 * Dashboard widget for superadmins to approve/reject purchase orders
 */

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  getInventoryOrders, 
  approveInventoryOrder, 
  rejectInventoryOrder,
  InventoryOrder 
} from '@/services/inventoryOrderService';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
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
    refetchInterval: 60 * 1000 // Refetch every minute
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Pending Purchase Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingOrders.length === 0) {
    return null; // Don't show if no pending orders
  }

  return (
    <>
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-orange-600" />
            Pending Purchase Orders
            <Badge variant="secondary" className="bg-orange-100 text-orange-800 ml-2">
              {pendingOrders.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            Review and approve inventory purchase orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pendingOrders.map(order => (
              <div 
                key={order.id} 
                className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Package className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium">{order.product?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.order_number} • {order.quantity} units @ ${order.unit_cost.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.location?.name} • Requested by {order.requested_by_email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-bold">${order.total_cost.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(order.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 hover:bg-green-50 border-green-200"
                      onClick={() => {
                        setSelectedOrder(order);
                        setApproveDialogOpen(true);
                      }}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:bg-destructive/10 border-destructive/30"
                      onClick={() => {
                        setSelectedOrder(order);
                        setRejectDialogOpen(true);
                      }}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Purchase Order</AlertDialogTitle>
            <AlertDialogDescription>
              This will approve order <strong>{selectedOrder?.order_number}</strong> and add{' '}
              <strong>{selectedOrder?.quantity} units</strong> of{' '}
              <strong>{selectedOrder?.product?.name}</strong> to inventory.
              <br /><br />
              <strong>Cost:</strong> ${selectedOrder?.unit_cost.toFixed(2)} per unit
              <br />
              <strong>Total:</strong> ${selectedOrder?.total_cost.toFixed(2)}
              <br /><br />
              The inventory cost will be recalculated using the average cost method.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleApprove}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? 'Processing...' : 'Approve Order'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Purchase Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject order <strong>{selectedOrder?.order_number}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReject}
              disabled={isProcessing}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isProcessing ? 'Processing...' : 'Reject Order'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default InventoryOrderApprovals;
