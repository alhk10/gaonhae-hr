/**
 * Product Management List Component
 * Comprehensive product catalog with CRUD operations for Milestone 5
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { 
  Package, 
  Search, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  Filter,
  Download,
  Upload,
  PackagePlus,
  CheckCircle2,
  XCircle,
  Boxes,
  Briefcase
} from 'lucide-react';
import { getProducts, Product, getProductCategories, deleteProduct } from '@/services/productService';
import { getProductInventory, ProductInventory } from '@/services/inventoryService';
import { bulkUpdateProductStatus, bulkDeleteProducts } from '@/services/productStatsService';
import AddProductDialog from './AddProductDialog';
import { EditProductDialog } from './EditProductDialog';
import { ProductDetailDialog } from './ProductDetailDialog';
import { InventoryStatusBadge } from './InventoryStatusBadge';
import { InventoryAdjustmentDialog } from './InventoryAdjustmentDialog';

interface ProductManagementListProps {
  onDataChange?: () => void;
}

const ProductManagementList: React.FC<ProductManagementListProps> = ({ onDataChange }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [currentPage, setCurrentPage] = useState(1);
  const [categories, setCategories] = useState<Array<{id: string, name: string}>>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [inventoryProduct, setInventoryProduct] = useState<Product | null>(null);
  const [inventory, setInventory] = useState<Record<string, ProductInventory>>({});
  const [bulkAction, setBulkAction] = useState<'activate' | 'deactivate' | 'delete' | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  
  const itemsPerPage = 20;

  const loadCategories = async () => {
    try {
      const data = await getProductCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const result = await getProducts(
        currentPage, 
        itemsPerPage, 
        searchQuery.trim() || undefined,
        categoryFilter !== 'all' ? categoryFilter : undefined
      );
      
      let filteredProducts = result.products;
      if (statusFilter !== 'all') {
        filteredProducts = filteredProducts.filter(p => p.is_active === (statusFilter === 'active'));
      }
      
      setProducts(filteredProducts);
      setTotal(result.total);
      
      // Load inventory for the products
      if (filteredProducts.length > 0) {
        const productIds = filteredProducts.map(p => p.id);
        const inventoryData = await getProductInventory(productIds);
        setInventory(inventoryData);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setCurrentPage(1);
      loadProducts();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, categoryFilter, statusFilter]);

  useEffect(() => {
    loadProducts();
  }, [currentPage]);

  const handleSelectProduct = (productId: string, checked: boolean) => {
    setSelectedProducts(prev => 
      checked 
        ? [...prev, productId]
        : prev.filter(id => id !== productId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(products.map(p => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  const getStatusBadgeVariant = (isActive: boolean) => {
    return isActive ? 'default' : 'secondary';
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
  };

  const handleViewProduct = (product: Product) => {
    setViewingProduct(product);
  };

  const handleInventoryAdjust = (product: Product) => {
    setInventoryProduct(product);
  };

  const handleDeleteProduct = async (product: Product) => {
    try {
      await deleteProduct(product.id);
      toast.success('Product deleted successfully');
      loadProducts();
      onDataChange?.();
      setDeletingProduct(null);
    } catch (error) {
      console.error('Failed to delete product:', error);
      toast.error('Failed to delete product');
    }
  };

  const handleBulkActivate = () => {
    setBulkAction('activate');
  };

  const handleBulkDeactivate = () => {
    setBulkAction('deactivate');
  };

  const handleBulkDelete = () => {
    setBulkAction('delete');
  };

  const confirmBulkAction = async () => {
    if (!bulkAction || selectedProducts.length === 0) return;
    
    setBulkLoading(true);
    try {
      let result: { success: number; failed: number };
      
      if (bulkAction === 'activate') {
        result = await bulkUpdateProductStatus(selectedProducts, true);
        toast.success(`Activated ${result.success} product(s)`);
      } else if (bulkAction === 'deactivate') {
        result = await bulkUpdateProductStatus(selectedProducts, false);
        toast.success(`Deactivated ${result.success} product(s)`);
      } else if (bulkAction === 'delete') {
        result = await bulkDeleteProducts(selectedProducts);
        toast.success(`Deleted ${result.success} product(s)`);
      }
      
      setSelectedProducts([]);
      loadProducts();
      onDataChange?.();
    } catch (error) {
      console.error('Bulk action failed:', error);
      toast.error('Bulk action failed');
    } finally {
      setBulkLoading(false);
      setBulkAction(null);
    }
  };

  const totalPages = Math.ceil(total / itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Product Catalog</h2>
          <p className="text-muted-foreground">
            Manage classes, courses, and merchandise
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => toast.info('Import feature coming soon')}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Import
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.info('Export feature coming soon')}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
          <AddProductDialog
            trigger={
              <Button className="flex items-center gap-2">
                <PackagePlus className="w-4 h-4" />
                Add Product
              </Button>
            }
            onProductAdded={() => {
              loadProducts();
              onDataChange?.();
            }}
          />
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="w-4 h-4" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('all');
                  setStatusFilter('active');
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedProducts.length > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkActivate}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Activate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDeactivate}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Deactivate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.info('Bulk export coming soon')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="w-4 h-4" />
            Products ({total})
          </CardTitle>
          <CardDescription>
            {loading ? 'Loading...' : `Showing ${products.length} of ${total} products`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No products found</p>
              <AddProductDialog
                trigger={
                  <Button className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Product
                  </Button>
                }
                onProductAdded={() => {
                  loadProducts();
                  onDataChange?.();
                }}
              />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedProducts.length === products.length && products.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                     <TableHead>Product</TableHead>
                     <TableHead>SKU</TableHead>
                     <TableHead>Belt Level</TableHead>
                     <TableHead>Price</TableHead>
                     <TableHead>Inventory</TableHead>
                     <TableHead>Status</TableHead>
                     <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                   {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedProducts.includes(product.id)}
                            onCheckedChange={(checked) => handleSelectProduct(product.id, !!checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {product.description || 'No description'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-sm">{product.sku}</div>
                        </TableCell>
                        <TableCell>
                  <Badge variant="outline">
                    {product.min_belt_level || 'Any Level'}
                  </Badge>
                        </TableCell>
                         <TableCell>
                           <div className="font-medium">
                             S${product.base_price?.toFixed(2) || '0.00'}
                           </div>
                           <div className="text-xs text-muted-foreground">Base price</div>
                         </TableCell>
                         <TableCell>
                           {product.is_service ? (
                             <Badge variant="outline" className="bg-blue-500/10 text-blue-700">
                               <Briefcase className="w-3 h-3 mr-1" />
                               Service
                             </Badge>
                           ) : inventory[product.id] ? (
                             <InventoryStatusBadge
                               status={inventory[product.id].status}
                               quantity={inventory[product.id].available_quantity}
                               reorderNeeded={inventory[product.id].reorder_needed}
                             />
                           ) : (
                             <Badge variant="outline" className="bg-muted text-muted-foreground">
                               No Inventory
                             </Badge>
                           )}
                         </TableCell>
                         <TableCell>
                           <Badge variant={getStatusBadgeVariant(product.is_active)}>
                             {product.is_active ? 'Active' : 'Inactive'}
                           </Badge>
                         </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewProduct(product)}
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditProduct(product)}
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleInventoryAdjust(product)}
                              title="Adjust Inventory"
                            >
                              <Boxes className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingProduct(product)}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                   ))}
                 </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => prev - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => prev + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Product Dialog */}
      <EditProductDialog
        product={editingProduct!}
        open={!!editingProduct}
        onOpenChange={(open) => !open && setEditingProduct(null)}
        onProductUpdated={() => {
          loadProducts();
          onDataChange?.();
        }}
      />

      {/* Product Detail Dialog */}
      <ProductDetailDialog
        product={viewingProduct}
        open={!!viewingProduct}
        onOpenChange={(open) => !open && setViewingProduct(null)}
      />

      {/* Inventory Adjustment Dialog */}
      <InventoryAdjustmentDialog
        product={inventoryProduct}
        open={!!inventoryProduct}
        onOpenChange={(open) => !open && setInventoryProduct(null)}
        onAdjustmentComplete={() => {
          loadProducts();
          onDataChange?.();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingProduct} onOpenChange={(open) => !open && setDeletingProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingProduct?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deletingProduct && handleDeleteProduct(deletingProduct)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Action Confirmation Dialog */}
      <AlertDialog open={!!bulkAction} onOpenChange={(open) => !open && setBulkAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkAction === 'activate' && 'Activate Products'}
              {bulkAction === 'deactivate' && 'Deactivate Products'}
              {bulkAction === 'delete' && 'Delete Products'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkAction === 'activate' && `Are you sure you want to activate ${selectedProducts.length} product(s)?`}
              {bulkAction === 'deactivate' && `Are you sure you want to deactivate ${selectedProducts.length} product(s)?`}
              {bulkAction === 'delete' && `Are you sure you want to delete ${selectedProducts.length} product(s)? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmBulkAction}
              disabled={bulkLoading}
              className={bulkAction === 'delete' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {bulkLoading ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProductManagementList;
