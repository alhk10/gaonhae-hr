/**
 * Product Management Page
 * Main page for Milestone 5 - Product catalog management with Inventory tabs
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import ProductManagementList from '@/components/sales/ProductManagementList';
import ProductCategoriesManager from '@/components/sales/ProductCategoriesManager';
import InventoryListTab from '@/components/sales/InventoryListTab';
import InventoryOrderFormTab from '@/components/sales/InventoryOrderFormTab';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  FolderOpen, 
  AlertTriangle,
  PackageX,
  Warehouse,
  ShoppingCart
} from 'lucide-react';
import { getProductStats, ProductStats } from '@/services/productStatsService';

const ProductManagement: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products');
  
  const loadStats = async () => {
    try {
      setStatsLoading(true);
      const data = await getProductStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);
  
  return (
    <ResponsiveLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Product Management</h1>
            <p className="text-muted-foreground">
              Manage products, inventory, and purchase orders
            </p>
          </div>
          <Badge variant="default" className="bg-green-100 text-green-800">
            Milestone 5
          </Badge>
        </div>

        {/* Quick Stats - Only show on Products tab */}
        {activeTab === 'products' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? '...' : stats?.totalProducts || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {statsLoading ? 'Loading...' : `${stats?.activeProducts || 0} active`}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Categories</CardTitle>
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? '...' : stats?.totalCategories || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {statsLoading ? 'Loading...' : `${stats?.activeCategories || 0} active`}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {statsLoading ? '...' : stats?.lowStockCount || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Items need reorder
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
                <PackageX className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {statsLoading ? '...' : stats?.outOfStockCount || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Items unavailable
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabbed Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Warehouse className="w-4 h-4" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Orders
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-6 mt-6">
            {/* Main Product Management Interface */}
            <ProductManagementList onDataChange={loadStats} />

            {/* Product Categories Management */}
            <ProductCategoriesManager />
          </TabsContent>

          <TabsContent value="inventory" className="mt-6">
            <InventoryListTab />
          </TabsContent>

          <TabsContent value="orders" className="mt-6">
            <InventoryOrderFormTab />
          </TabsContent>
        </Tabs>
      </div>
    </ResponsiveLayout>
  );
};

export default ProductManagement;
