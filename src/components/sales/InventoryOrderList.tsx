/**
 * Inventory Order List
 * Displays list of purchase orders with status and approval actions
 */

import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  getInventoryOrders, 
  approveInventoryOrder, 
  rejectInventoryOrder,
  InventoryOrder 
} from '@/services/inventoryOrderService';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { Check, X, Clock, Package, AlertCircle } from 'lucide-react';
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
import { useState } from 'react';

interface InventoryOrderListProps {
  showApprovalActions?: boolean;
}

const InventoryOrderList: React.FC<InventoryOrderListProps> = ({ 
  showApprovalActions = false 
}) => {
  const { userDetails, user } = useAuth();
  const queryClient = useQueryClient();
  const isSuperadmin = userDetails?.position === 'superadmin';
  
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<InventoryOrder | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['inventory-orders', statusFilter],
    queryFn: () => getInventoryOrders(statusFilter !== 'all' ? { status: statusFilter } : undefined)
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

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <Check className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <X className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      case 'received':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <Package className="w-3 h-3 mr-1" />
            Received
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Variant</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit Cost</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              {(showApprovalActions && isSuperadmin) && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              orders.map(order => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-sm">{order.order_number}</TableCell>
                  <TableCell className="font-medium">
                    {order.product?.name || 'Unknown'}
                    <div className="text-xs text-muted-foreground">{order.product?.sku}</div>
                  </TableCell>
                  <TableCell>{order.location?.name || 'Unknown'}</TableCell>
                  <TableCell>{order.size_variant || '-'}</TableCell>
                  <TableCell className="text-right">{order.quantity}</TableCell>
                  <TableCell className="text-right">${order.unit_cost.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-medium">${order.total_cost.toFixed(2)}</TableCell>
                  <TableCell className="text-sm">{order.requested_by_email || order.requested_by}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(order.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>{renderStatusBadge(order.status)}</TableCell>
                  {(showApprovalActions && isSuperadmin) && (
                    <TableCell>
                      {order.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:bg-green-50"
                            onClick={() => {
                              setSelectedOrder(order);
                              setApproveDialogOpen(true);
                            }}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setSelectedOrder(order);
                              setRejectDialogOpen(true);
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Approve Dialog */}
      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Purchase Order</AlertDialogTitle>
            <AlertDialogDescription>
              This will approve order <strong>{selectedOrder?.order_number}</strong> and add{' '}
              <strong>{selectedOrder?.quantity} units</strong> to inventory at{' '}
              <strong>${selectedOrder?.unit_cost.toFixed(2)}</strong> per unit.
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
    </div>
  );
};

export default InventoryOrderList;
