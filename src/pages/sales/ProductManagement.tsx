/**
 * Product Management Page
 * Main page for Milestone 5 - Product catalog management with Inventory tabs
 */

import React, { useState } from 'react';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import ProductManagementList from '@/components/sales/ProductManagementList';
import InventoryListTab from '@/components/sales/InventoryListTab';
import InventoryOrderFormTab from '@/components/sales/InventoryOrderFormTab';
import ClassTypeManagementTab from '@/components/sales/ClassTypeManagementTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  Warehouse,
  ShoppingCart,
  Dumbbell
} from 'lucide-react';

const ProductManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('products');
  
  return (
    <ResponsiveLayout>
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 max-w-lg">
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
            <TabsTrigger value="class-types" className="flex items-center gap-2">
              <Dumbbell className="w-4 h-4" />
              Class Types
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-6 mt-6">
            <ProductManagementList />
          </TabsContent>

          <TabsContent value="inventory" className="mt-6">
            <InventoryListTab />
          </TabsContent>

          <TabsContent value="orders" className="mt-6">
            <InventoryOrderFormTab />
          </TabsContent>

          <TabsContent value="class-types" className="mt-6">
            <ClassTypeManagementTab />
          </TabsContent>
        </Tabs>
      </div>
    </ResponsiveLayout>
  );
};

export default ProductManagement;
