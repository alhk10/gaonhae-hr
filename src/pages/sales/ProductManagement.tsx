/**
 * Product Management Page
 * Main page for Milestone 5 - Product catalog management
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import ProductManagementList from '@/components/sales/ProductManagementList';
import ProductCategoriesManager from '@/components/sales/ProductCategoriesManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  Calendar,
  CheckCircle,
  Clock
} from 'lucide-react';

const ProductManagement: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <ResponsiveLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Product Management</h1>
            <p className="text-muted-foreground">
              Manage classes, courses, and merchandise - Milestone 5
            </p>
          </div>
          <Badge variant="default" className="bg-green-100 text-green-800">
            Milestone 5 - Complete
          </Badge>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">
                Classes, courses, merchandise
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Product Categories</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">
                Organized by type
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inventory Items</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">
                Stock management
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Price Lists</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">
                Flexible pricing
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Features Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Milestone 5 Features
            </CardTitle>
            <CardDescription>
              Complete product catalog management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">🚧 In Progress</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Product catalog with categories</li>
                  <li>• Class and course management</li>
                  <li>• Merchandise inventory</li>
                  <li>• Price list management</li>
                  <li>• Product search and filtering</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">📋 Planned</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Bulk product operations</li>
                  <li>• CSV import/export</li>
                  <li>• Product variants and options</li>
                  <li>• Inventory tracking</li>
                  <li>• Product analytics</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Product Management Interface */}
        <ProductManagementList />

        {/* Product Categories Management */}
        <ProductCategoriesManager />
      </div>
    </ResponsiveLayout>
  );
};

export default ProductManagement;