/**
 * Product Categories Management Component
 * Manages product categories with CRUD operations
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
import { formatDate } from '@/utils/dateFormat';
  FolderPlus, 
  Search, 
  Edit, 
  Trash2, 
  FolderOpen,
  ArrowUpDown
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ProductCategoryDialog } from './ProductCategoryDialog';

interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  sort_order?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product_count?: number;
}

const ProductCategoriesManager: React.FC = () => {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<ProductCategory | null>(null);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);

  const loadCategories = async () => {
    try {
      setLoading(true);

      // Get categories with product counts
      const { data, error } = await supabase
        .from('product_categories')
        .select(`
          *,
          products:products(count)
        `)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      const categoriesWithCount = data?.map(cat => ({
        ...cat,
        product_count: cat.products?.[0]?.count || 0
      })) || [];

      // Filter by search query
      const filteredCategories = searchQuery.trim()
        ? categoriesWithCount.filter(cat => 
            cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            cat.description?.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : categoriesWithCount;

      setCategories(filteredCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      loadCategories();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleEdit = (category: ProductCategory) => {
    setEditingCategory(category);
    setShowCategoryDialog(true);
  };

  const handleAdd = () => {
    setEditingCategory(null);
    setShowCategoryDialog(true);
  };

  const handleDelete = async (category: ProductCategory) => {
    if (category.product_count && category.product_count > 0) {
      toast.error(`Cannot delete category "${category.name}" - it has ${category.product_count} product(s)`);
      return;
    }

    setDeletingCategory(category);
  };

  const confirmDelete = async () => {
    if (!deletingCategory) return;

    try {
      const { error } = await supabase
        .from('product_categories')
        .delete()
        .eq('id', deletingCategory.id);

      if (error) throw error;

      toast.success('Category deleted successfully');
      loadCategories();
      setDeletingCategory(null);
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  const formatDate = (dateString: string) => {formatDate(
    return new Date(dateString));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              Product Categories
            </CardTitle>
            <CardDescription>
              Manage product categories and organization
            </CardDescription>
          </div>
          <Button onClick={handleAdd}>
            <FolderPlus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Categories Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <div className="flex items-center gap-1">
                    Name
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading categories...
                  </TableCell>
                </TableRow>
              ) : categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    {searchQuery ? 'No categories found matching your search' : 'No categories found'}
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div className="font-medium">{category.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Sort: {category.sort_order || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate">
                        {category.description || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {category.product_count || 0} products
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={category.is_active ? "default" : "secondary"}>
                        {category.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(category.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(category)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(category)}
                          disabled={category.product_count && category.product_count > 0}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Category Dialog */}
      <ProductCategoryDialog
        category={editingCategory}
        open={showCategoryDialog}
        onOpenChange={setShowCategoryDialog}
        onSave={loadCategories}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingCategory} onOpenChange={() => setDeletingCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the category "{deletingCategory?.name}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default ProductCategoriesManager;