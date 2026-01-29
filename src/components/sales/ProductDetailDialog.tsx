import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calendar, Package, DollarSign, Users, Settings, Globe, Building2, Briefcase } from 'lucide-react';
import { Product } from '@/services/productService';
import { getProductBranchPrices, type BranchPrice } from '@/services/priceRulesService';
import { formatCurrency } from '@/utils/currencyUtils';

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
  const [branchPrices, setBranchPrices] = useState<BranchPrice[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);

  useEffect(() => {
    if (open && product) {
      loadBranchPrices();
    }
  }, [open, product]);

  const loadBranchPrices = async () => {
    if (!product) return;
    try {
      setLoadingPrices(true);
      const prices = await getProductBranchPrices(product.id);
      setBranchPrices(prices);
    } catch (error) {
      console.error('Error loading branch prices:', error);
    } finally {
      setLoadingPrices(false);
    }
  };

  if (!product) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Group branch prices by currency
  const groupedBranchPrices = branchPrices.reduce((acc, bp) => {
    const currency = bp.branch_currency;
    if (!acc[currency]) {
      acc[currency] = [];
    }
    acc[currency].push(bp);
    return acc;
  }, {} as Record<string, BranchPrice[]>);

  // Check if any branch has custom pricing
  const hasCustomPricing = branchPrices.some(bp => bp.price !== null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">{product.name}</DialogTitle>
            <div className="flex gap-2">
              {product.is_service && (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-700">
                  <Briefcase className="w-3 h-3 mr-1" />
                  Service
                </Badge>
              )}
              <Badge variant={product.is_active ? "default" : "secondary"}>
                {product.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
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
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Base Price (Default)</p>
                  <p className="text-xl font-semibold">{formatCurrency(Number(product.base_price), 'SGD')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tax Rate</p>
                  <p className="text-base">{product.tax_rate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Branch Pricing */}
          {(hasCustomPricing || Object.keys(groupedBranchPrices).length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Branch Pricing
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingPrices ? (
                  <p className="text-sm text-muted-foreground">Loading branch prices...</p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(groupedBranchPrices).map(([currency, branches]) => (
                      <div key={currency}>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {currency}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {branches.map((bp) => (
                            <div 
                              key={bp.branch_id} 
                              className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                            >
                              <div className="flex items-center gap-2">
                                <Building2 className="w-3 h-3 text-muted-foreground" />
                                <span className="text-sm">{bp.branch_name}</span>
                              </div>
                              <span className={`text-sm font-medium ${bp.price !== null ? 'text-primary' : 'text-muted-foreground'}`}>
                                {bp.price !== null 
                                  ? formatCurrency(bp.price, bp.branch_currency)
                                  : formatCurrency(Number(product.base_price), bp.branch_currency) + ' (default)'
                                }
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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

          {/* Variant Options */}
          {product.available_variants && (
            Object.values(product.available_variants).some((arr: any) => arr && arr.length > 0)
          ) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Product Variants
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {product.available_variants.sizes && product.available_variants.sizes.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Sizes</p>
                    <div className="flex flex-wrap gap-2">
                      {product.available_variants.sizes.map((size) => (
                        <Badge key={size} variant="outline" className="bg-blue-500/10 text-blue-700">
                          {size}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {product.available_variants.colors && product.available_variants.colors.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Colors</p>
                    <div className="flex flex-wrap gap-2">
                      {product.available_variants.colors.map((color) => (
                        <Badge key={color} variant="outline" className="bg-purple-500/10 text-purple-700">
                          {color}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {product.available_variants.belt_ranks && product.available_variants.belt_ranks.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Belt Ranks</p>
                    <div className="flex flex-wrap gap-2">
                      {product.available_variants.belt_ranks.map((rank) => (
                        <Badge key={rank} variant="outline" className="bg-amber-500/10 text-amber-700">
                          {rank}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Legacy Size Options (for backward compatibility) */}
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