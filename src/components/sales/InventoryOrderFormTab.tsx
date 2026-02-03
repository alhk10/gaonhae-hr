/**
 * Inventory Order Form Tab
 * Container for creating and viewing purchase orders
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ShoppingCart, Clock, CheckCircle, XCircle } from 'lucide-react';
import { getPendingOrdersCount, getInventoryOrders } from '@/services/inventoryOrderService';
import CreateInventoryOrderDialog from './CreateInventoryOrderDialog';
import InventoryOrderList from './InventoryOrderList';
import { useAuth } from '@/contexts/AuthContext';

const InventoryOrderFormTab: React.FC = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { userDetails } = useAuth();
  const isSuperadmin = userDetails?.position === 'superadmin';

  // Get order counts
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['pending-orders-count'],
    queryFn: getPendingOrdersCount
  });

  const { data: allOrders = [] } = useQuery({
    queryKey: ['inventory-orders'],
    queryFn: () => getInventoryOrders()
  });

  const approvedCount = allOrders.filter(o => o.status === 'approved').length;
  const rejectedCount = allOrders.filter(o => o.status === 'rejected').length;
  const totalValue = allOrders
    .filter(o => o.status === 'approved')
    .reduce((sum, o) => sum + o.total_cost, 0);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{allOrders.length}</div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
                <p className="text-sm text-muted-foreground">Pending Approval</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <XCircle className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
                <p className="text-sm text-muted-foreground">Total Approved Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Purchase Orders</CardTitle>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Order
          </Button>
        </CardHeader>
        <CardContent>
          <InventoryOrderList showApprovalActions={isSuperadmin} />
        </CardContent>
      </Card>

      <CreateInventoryOrderDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen} 
      />
    </div>
  );
};

export default InventoryOrderFormTab;
