import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calendar, Package, DollarSign, Users, Clock, Settings } from 'lucide-react';
import { Product } from '@/services/productService';

interface ProductDetailDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProductDetailDialog: React.FC<ProductDetailDialogProps> = ({
  product,
  open,
  onOpenChange
}) => {
  if (!product) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrencyValue = (amount: number) => {
    return new Intl.NumberFormat('en-SG', {
      style: 'currency',
      currency: 'SGD'
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">{product.name}</DialogTitle>
            <Badge variant={product.is_active ? "default" : "secondary"}>
              {product.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">SKU</p>
                  <p className="text-base">{product.sku}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Category</p>
                  <p className="text-base">{product.category_name || 'No Category'}</p>
                </div>
              </div>
              
              {product.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="text-base">{product.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pricing Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Pricing Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Base Price</p>
                  <p className="text-xl font-semibold">{formatCurrencyValue(Number(product.base_price))}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tax Rate</p>
                  <p className="text-base">{product.tax_rate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Belt Level Requirements */}
          {product.requires_belt_level && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Belt Level Requirements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Minimum Belt Level</p>
                    <p className="text-base">{product.min_belt_level || 'No Minimum'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Maximum Belt Level</p>
                    <p className="text-base">{product.max_belt_level || 'No Maximum'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sessions & Validity */}
          {(product.session_count > 0 || product.validity_months > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Sessions & Validity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {product.session_count > 0 && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Session Count</p>
                      <p className="text-base">{product.session_count} sessions</p>
                    </div>
                  )}
                  {product.validity_months > 0 && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Validity Period</p>
                      <p className="text-base">{product.validity_months} months</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Recurring</p>
                    <Badge variant={product.is_recurring ? "default" : "secondary"}>
                      {product.is_recurring ? "Yes" : "No"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Size Options */}
          {product.requires_size && product.available_sizes && product.available_sizes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Size Options
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Available Sizes</p>
                  <div className="flex flex-wrap gap-2">
                    {product.available_sizes.map((size) => (
                      <Badge key={size} variant="outline">
                        {size}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* System Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                System Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created</p>
                  <p className="text-base">{formatDate(product.created_at)}</p>
                  {product.created_by && (
                    <p className="text-sm text-muted-foreground">by {product.created_by}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                  <p className="text-base">{formatDate(product.updated_at)}</p>
                  {product.updated_by && (
                    <p className="text-sm text-muted-foreground">by {product.updated_by}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          {product.metadata && Object.keys(product.metadata).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm bg-muted p-3 rounded-md overflow-auto">
                  {JSON.stringify(product.metadata, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};