import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calendar, Package, Tag, Award, Layers, Settings, Building2, Briefcase, Loader2, Eye, EyeOff, Pencil } from 'lucide-react';
import { Product } from '@/services/productService';
import { getProductBranchPrices, type BranchPrice } from '@/services/priceRulesService';
import { formatCurrency, getCurrencySymbol } from '@/utils/currencyUtils';
import { COUNTRY_TAX_RATES, COUNTRY_TAX_INCLUDED, DEFAULT_TAX_RATE, DEFAULT_TAX_INCLUDED } from '@/config/constants';
import { formatDate } from '@/utils/dateFormat';

const getCountryDefaultTax = (country: string): number => {
  return COUNTRY_TAX_RATES[country] ?? DEFAULT_TAX_RATE;
};

const getCountryDefaultTaxIncluded = (country: string): boolean => {
  return COUNTRY_TAX_INCLUDED[country] ?? DEFAULT_TAX_INCLUDED;
};

interface ProductDetailDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (product: Product) => void;
}

export const ProductDetailDialog: React.FC<ProductDetailDialogProps> = ({
  product,
  open,
  onOpenChange,
  onEdit,
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
  // Group branch prices by currency
  const groupedBranchPrices = branchPrices.reduce((acc, bp) => {
    const currency = bp.branch_currency;
    if (!acc[currency]) {
      acc[currency] = [];
    }
    acc[currency].push(bp);
    return acc;
  }, {} as Record<string, BranchPrice[]>);

  const hasVariants = product.available_variants && (
    (product.available_variants.sizes?.length || 0) > 0 ||
    (product.available_variants.colors?.length || 0) > 0
  );

  const hasCustomValue = (bp: BranchPrice) => 
    bp.price !== null || bp.tax_rate !== null || bp.tax_included !== null || bp.is_hidden;

  const handleEdit = () => {
    if (product && onEdit) {
      onOpenChange(false);
      onEdit(product);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>View Product</DialogTitle>
            <div className="flex items-center gap-2">
              {product.is_service && (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-700">
                  <Briefcase className="w-3 h-3 mr-1" />
                  Service
                </Badge>
              )}
              <Badge variant={product.is_active ? "default" : "secondary"}>
                {product.is_active ? "Active" : "Inactive"}
              </Badge>
              {onEdit && (
                <Button variant="outline" size="sm" onClick={handleEdit} className="h-7">
                  <Pencil className="w-3 h-3 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Information Section */}
          <section className="rounded-lg bg-muted/50 p-4 space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Package className="w-4 h-4" />
              Basic Information
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Product Name</p>
                <p className="text-sm font-medium">{product.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">SKU</p>
                <p className="text-sm font-medium">{product.sku}</p>
              </div>
            </div>
            {product.description && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Description</p>
                <p className="text-sm">{product.description}</p>
              </div>
            )}
          </section>

          {/* Pricing & Category Section */}
          <section className="rounded-lg bg-accent/30 p-4 space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Tag className="w-4 h-4" />
              Pricing & Category
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Category</p>
                <p className="text-sm font-medium">{product.category_name || 'No Category'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Base Price</p>
                <p className="text-sm font-medium">{formatCurrency(Number(product.base_price), 'SGD')}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Tax Rate</p>
                <p className="text-sm font-medium">{product.tax_rate}%</p>
              </div>
            </div>

            {/* Branch Pricing */}
            <Separator className="my-3" />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-medium">Branch-specific Pricing</span>
              </div>
              
              {loadingPrices ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-xs text-muted-foreground">Loading...</span>
                </div>
              ) : (
                <div className="space-y-4 max-h-[200px] overflow-y-auto pr-1">
                  {Object.entries(groupedBranchPrices).map(([currency, branches]) => (
                    <div key={currency}>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {currency}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          ({getCurrencySymbol(currency)})
                        </span>
                      </div>
                      
                      <div className="space-y-1.5">
                        {branches.map((bp) => (
                          <Card 
                            key={bp.branch_id} 
                            className={`overflow-hidden ${hasCustomValue(bp) ? 'border-primary/40 bg-primary/5' : ''} ${bp.is_hidden ? 'opacity-50' : ''}`}
                          >
                            <CardContent className="p-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {bp.is_hidden ? (
                                    <EyeOff className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                  ) : (
                                    <Eye className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                  )}
                                  <span className={`text-xs font-medium truncate ${bp.is_hidden ? 'line-through text-muted-foreground' : ''}`}>
                                    {bp.branch_name}
                                  </span>
                                  {bp.is_hidden && (
                                    <Badge variant="secondary" className="text-[9px] px-1">Hidden</Badge>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-3 text-xs">
                                  <div className="text-right">
                                    <span className={bp.price !== null ? 'font-medium' : 'text-muted-foreground'}>
                                      {bp.price !== null 
                                        ? formatCurrency(bp.price, bp.branch_currency)
                                        : formatCurrency(Number(product.base_price), bp.branch_currency)
                                      }
                                    </span>
                                    {bp.price === null && (
                                      <span className="text-[10px] text-muted-foreground ml-1">(default)</span>
                                    )}
                                  </div>
                                  <div className="text-right min-w-[60px]">
                                    <span className={bp.tax_rate !== null ? 'font-medium' : 'text-muted-foreground'}>
                                      {bp.tax_rate ?? getCountryDefaultTax(bp.branch_country)}%
                                    </span>
                                    <span className="text-[10px] text-muted-foreground ml-1">
                                      ({bp.tax_included ?? getCountryDefaultTaxIncluded(bp.branch_country) ? 'incl' : 'excl'})
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Product Variants Section */}
          <section className="rounded-lg bg-muted/50 p-4 space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Layers className="w-4 h-4" />
              Product Variants
            </h3>
            <div className="flex gap-2 flex-wrap">
              {product.requires_size && (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-700">
                  Sizes: {product.available_variants?.sizes?.length || 0}
                </Badge>
              )}
              {product.requires_color && (
                <Badge variant="outline" className="bg-purple-500/10 text-purple-700">
                  Colors: {product.available_variants?.colors?.length || 0}
                </Badge>
              )}
              {!hasVariants && !product.requires_size && !product.requires_color && (
                <span className="text-xs text-muted-foreground">No variants configured</span>
              )}
            </div>
            {product.available_variants?.sizes && product.available_variants.sizes.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Available Sizes</p>
                <div className="flex flex-wrap gap-1">
                  {product.available_variants.sizes.map((size) => (
                    <Badge key={size} variant="outline" className="text-xs">
                      {size}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {product.available_variants?.colors && product.available_variants.colors.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Available Colors</p>
                <div className="flex flex-wrap gap-1">
                  {product.available_variants.colors.map((color) => (
                    <Badge key={color} variant="outline" className="text-xs">
                      {color}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Belt Level Requirements Section */}
          <section className="rounded-lg bg-accent/30 p-4 space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Award className="w-4 h-4" />
              Belt Level Requirements
            </h3>
            {product.requires_belt_level ? (
              <div className="space-y-2">
                <Badge variant="default" className="text-xs">Required</Badge>
                {product.allowed_belt_levels && product.allowed_belt_levels.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Allowed Belt Levels</p>
                    <div className="flex flex-wrap gap-1">
                      {product.allowed_belt_levels.map((belt) => (
                        <Badge key={belt} variant="outline" className="text-xs">
                          {belt}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">No belt level restrictions</span>
            )}
          </section>

          {/* Lesson Configuration Section */}
          {product.is_lesson && (
            <section className="rounded-lg bg-muted/50 p-4 space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Calendar className="w-4 h-4" />
                Lesson Configuration
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Lessons per Week</p>
                  <p className="text-sm font-medium">{product.lessons_per_week || 1}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Available Days</p>
                  <div className="flex flex-wrap gap-1">
                    {product.lesson_days && product.lesson_days.length > 0 ? (
                      product.lesson_days.map((day) => (
                        <Badge key={day} variant="outline" className="text-xs">
                          {day}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">All days</span>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Status & Type Section */}
          <section className="rounded-lg bg-accent/30 p-4 space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Settings className="w-4 h-4" />
              Status & Type
            </h3>
            <div className="flex flex-wrap gap-2">
              {product.is_service && (
                <Badge variant="outline" className="text-xs">
                  <Briefcase className="w-3 h-3 mr-1" />
                  Service (no inventory)
                </Badge>
              )}
              {product.is_lesson && (
                <Badge variant="outline" className="text-xs">
                  <Calendar className="w-3 h-3 mr-1" />
                  Lesson Product
                </Badge>
              )}
              <Badge variant={product.is_active ? "default" : "secondary"} className="text-xs">
                {product.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <p className="text-muted-foreground">Created</p>
                <p>{formatDate(product.created_at)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Last Updated</p>
                <p>{formatDate(product.updated_at)}</p>
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};
