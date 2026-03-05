/**
 * Inventory List Tab
 * Displays inventory across all branches with filtering
 * Shows ALL products including those with 0 stock
 */

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Package, AlertTriangle, PackageX } from 'lucide-react';

interface InventoryRow {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  location_id: string | null;
  location_name: string | null;
  size_variant: string | null;
  quantity_on_hand: number;
  quantity_reserved: number;
  cost_per_unit: number | null;
  reorder_point: number | null;
  warn_below_quantity: number | null;
}

const InventoryListTab: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch ALL non-service products
  const { data: allProducts = [], isLoading: productsLoading } = useQuery({
    queryKey: ['inventory-all-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, is_service, warn_below_quantity')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch inventory items with location details
  const { data: inventoryItems = [], isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          *,
          product:products(name, sku),
          location:inventory_locations(name, branch_id)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch locations for filter
  const { data: locations = [] } = useQuery({
    queryKey: ['inventory-locations-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_locations')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  const isLoading = productsLoading || inventoryLoading;

  // Build combined list: all products + inventory items, including 0-stock products
  const combinedRows: InventoryRow[] = useMemo(() => {
    const rows: InventoryRow[] = [];
    const productsWithInventory = new Set<string>();

    // Add all existing inventory items
    for (const item of inventoryItems) {
      productsWithInventory.add(item.product_id);
      const product = allProducts.find(p => p.id === item.product_id);
      rows.push({
        id: item.id,
        product_id: item.product_id,
        product_name: (item as any).product?.name || product?.name || 'Unknown Product',
        product_sku: (item as any).product?.sku || product?.sku || '-',
        location_id: item.location_id,
        location_name: (item as any).location?.name || 'Unknown',
        size_variant: item.size_variant,
        quantity_on_hand: item.quantity_on_hand,
        quantity_reserved: item.quantity_reserved,
        cost_per_unit: item.cost_per_unit,
        reorder_point: item.reorder_point,
        warn_below_quantity: product?.warn_below_quantity ?? null,
      });
    }

    // Add products that have NO inventory records (0 stock)
    for (const product of allProducts) {
      if (product.is_service) continue;
      if (productsWithInventory.has(product.id)) continue;
      rows.push({
        id: `synthetic-${product.id}`,
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku || '-',
        location_id: null,
        location_name: '—',
        size_variant: null,
        quantity_on_hand: 0,
        quantity_reserved: 0,
        cost_per_unit: null,
        reorder_point: null,
        warn_below_quantity: product.warn_below_quantity ?? null,
      });
    }

    return rows;
  }, [allProducts, inventoryItems]);

  const getStockStatus = (item: InventoryRow) => {
    const available = item.quantity_on_hand - item.quantity_reserved;
    if (available < 0) return 'negative';
    if (available === 0) return 'out_of_stock';
    if (item.warn_below_quantity != null && item.quantity_on_hand <= item.warn_below_quantity) return 'low_stock';
    if (item.reorder_point && item.quantity_on_hand <= item.reorder_point) return 'low_stock';
    return 'in_stock';
  };

  const filteredItems = combinedRows.filter(item => {
    const matchesSearch =
      item.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product_sku?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesLocation = locationFilter === 'all' || item.location_id === locationFilter;

    const status = getStockStatus(item);
    const matchesStatus = statusFilter === 'all' || status === statusFilter;

    return matchesSearch && matchesLocation && matchesStatus;
  });

  // Calculate totals
  const totalItems = filteredItems.length;
  const totalValue = filteredItems.reduce((sum, item) =>
    sum + (item.quantity_on_hand * (item.cost_per_unit || 0)), 0
  );
  const lowStockCount = filteredItems.filter(item => getStockStatus(item) === 'low_stock').length;
  const outOfStockCount = filteredItems.filter(item => getStockStatus(item) === 'out_of_stock').length;

  const renderStatusBadge = (item: InventoryRow) => {
    const status = getStockStatus(item);
    switch (status) {
      case 'negative':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Negative ({item.quantity_on_hand - item.quantity_reserved})
          </Badge>
        );
      case 'out_of_stock':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <PackageX className="w-3 h-3" />
            Out of Stock
          </Badge>
        );
      case 'low_stock':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Low Stock
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 flex items-center gap-1">
            <Package className="w-3 h-3" />
            In Stock
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-sm text-muted-foreground">Total Items</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
            <p className="text-sm text-muted-foreground">Total Value</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{lowStockCount}</div>
            <p className="text-sm text-muted-foreground">Low Stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-destructive">{outOfStockCount}</div>
            <p className="text-sm text-muted-foreground">Out of Stock</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by product name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="in_stock">In Stock</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Variant</TableHead>
                    <TableHead className="text-right">On Hand</TableHead>
                    <TableHead className="text-right">Reserved</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Cost/Unit</TableHead>
                    <TableHead className="text-right">Warn Below</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        No inventory items found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.product_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.product_sku}
                        </TableCell>
                        <TableCell>{item.location_name}</TableCell>
                        <TableCell>{item.size_variant || '-'}</TableCell>
                        <TableCell className="text-right">{item.quantity_on_hand}</TableCell>
                        <TableCell className="text-right">{item.quantity_reserved}</TableCell>
                        <TableCell className="text-right font-medium">
                          {item.quantity_on_hand - item.quantity_reserved}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.cost_per_unit != null ? `$${item.cost_per_unit.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.warn_below_quantity != null ? (
                            <span className="flex items-center justify-end gap-1 text-yellow-600">
                              <AlertTriangle className="w-3 h-3" />
                              {item.warn_below_quantity}
                            </span>
                          ) : '—'}
                        </TableCell>
                        <TableCell>{renderStatusBadge(item)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryListTab;
