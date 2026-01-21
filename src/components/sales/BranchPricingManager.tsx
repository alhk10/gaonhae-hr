/**
 * Branch Pricing Manager Component
 * Manages per-branch pricing and tax rates with currency display for products
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Building2, DollarSign, Globe, Loader2, Percent, Save, X } from 'lucide-react';
import { 
  getProductBranchPrices, 
  bulkUpdateBranchPrices, 
  type BranchPrice 
} from '@/services/priceRulesService';
import { formatCurrency, getCurrencySymbol } from '@/utils/currencyUtils';
import { COUNTRY_TAX_RATES, COUNTRY_TAX_INCLUDED, DEFAULT_TAX_RATE, DEFAULT_TAX_INCLUDED } from '@/config/constants';

// Get default tax rate for a country
const getCountryDefaultTax = (country: string): number => {
  return COUNTRY_TAX_RATES[country] ?? DEFAULT_TAX_RATE;
};

// Get default tax inclusion for a country
const getCountryDefaultTaxIncluded = (country: string): boolean => {
  return COUNTRY_TAX_INCLUDED[country] ?? DEFAULT_TAX_INCLUDED;
};

interface BranchPricingManagerProps {
  productId: string;
  productName: string;
  basePrice: number;
  baseTaxRate: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export const BranchPricingManager: React.FC<BranchPricingManagerProps> = ({
  productId,
  productName,
  basePrice,
  baseTaxRate,
  open,
  onOpenChange,
  onSaved,
}) => {
  const [branchPrices, setBranchPrices] = useState<BranchPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalPrices, setOriginalPrices] = useState<BranchPrice[]>([]);

  useEffect(() => {
    if (open && productId) {
      loadBranchPrices();
    }
  }, [open, productId]);

  const loadBranchPrices = async () => {
    try {
      setLoading(true);
      const prices = await getProductBranchPrices(productId);
      setBranchPrices(prices);
      setOriginalPrices(JSON.parse(JSON.stringify(prices)));
      setHasChanges(false);
    } catch (error) {
      console.error('Error loading branch prices:', error);
      toast.error('Failed to load branch prices');
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (branchId: string, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    
    setBranchPrices(prev =>
      prev.map(bp =>
        bp.branch_id === branchId
          ? { ...bp, price: numValue }
          : bp
      )
    );
    setHasChanges(true);
  };

  const handleTaxRateChange = (branchId: string, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    
    setBranchPrices(prev =>
      prev.map(bp =>
        bp.branch_id === branchId
          ? { ...bp, tax_rate: numValue }
          : bp
      )
    );
    setHasChanges(true);
  };

  const handleTaxIncludedChange = (branchId: string, value: string) => {
    const boolValue = value === 'default' ? null : value === 'include';
    
    setBranchPrices(prev =>
      prev.map(bp =>
        bp.branch_id === branchId
          ? { ...bp, tax_included: boolValue }
          : bp
      )
    );
    setHasChanges(true);
  };

  const handleClearBranch = (branchId: string) => {
    setBranchPrices(prev =>
      prev.map(bp =>
        bp.branch_id === branchId
          ? { ...bp, price: null, tax_rate: null, tax_included: null }
          : bp
      )
    );
    setHasChanges(true);
  };

  const handleCopyDefaults = (branchId: string) => {
    setBranchPrices(prev =>
      prev.map(bp =>
        bp.branch_id === branchId
          ? { ...bp, price: basePrice, tax_rate: baseTaxRate }
          : bp
      )
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await bulkUpdateBranchPrices(productId, branchPrices);
      toast.success('Branch pricing saved successfully');
      setOriginalPrices(JSON.parse(JSON.stringify(branchPrices)));
      setHasChanges(false);
      onSaved?.();
    } catch (error) {
      console.error('Error saving branch prices:', error);
      toast.error('Failed to save branch prices');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setBranchPrices(JSON.parse(JSON.stringify(originalPrices)));
    setHasChanges(false);
  };

  // Group branches by currency
  const groupedBranches = branchPrices.reduce((acc, bp) => {
    const currency = bp.branch_currency;
    if (!acc[currency]) {
      acc[currency] = [];
    }
    acc[currency].push(bp);
    return acc;
  }, {} as Record<string, BranchPrice[]>);

  const hasCustomValue = (bp: BranchPrice) => bp.price !== null || bp.tax_rate !== null || bp.tax_included !== null;

  // Get the effective tax inclusion status for display
  const getEffectiveTaxIncluded = (bp: BranchPrice): boolean => {
    return bp.tax_included ?? getCountryDefaultTaxIncluded(bp.branch_country);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Branch Pricing & Tax Rates - {productName}
          </DialogTitle>
        </DialogHeader>

        {/* Default Values Info */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Default Price:</span>
              <span className="font-semibold">{formatCurrency(basePrice, 'SGD')}</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Default Tax:</span>
              <span className="font-semibold">{baseTaxRate}%</span>
            </div>
          </div>
        </div>

        <Separator />

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading branches...</span>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-6">
              {Object.entries(groupedBranches).map(([currency, branches]) => (
                <div key={currency}>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="font-mono">
                      {currency}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      ({getCurrencySymbol(currency)})
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    {branches.map((bp) => (
                      <Card key={bp.branch_id} className={`overflow-hidden ${hasCustomValue(bp) ? 'border-primary/50' : ''}`}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2 min-w-0 w-40">
                              <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium truncate">{bp.branch_name}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 flex-1">
                              {/* Tax Inclusion Select */}
                              <div className="w-24">
                                <Label className="text-xs text-muted-foreground">Tax</Label>
                                <Select 
                                  value={bp.tax_included === null ? 'default' : bp.tax_included ? 'include' : 'exclude'}
                                  onValueChange={(value) => handleTaxIncludedChange(bp.branch_id, value)}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="default">
                                      Default ({getCountryDefaultTaxIncluded(bp.branch_country) ? 'Incl' : 'Excl'})
                                    </SelectItem>
                                    <SelectItem value="exclude">Exclude</SelectItem>
                                    <SelectItem value="include">Include</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Price Input */}
                              <div className="flex-1">
                                <Label className="text-xs text-muted-foreground">Price</Label>
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                                    {getCurrencySymbol(bp.branch_currency)}
                                  </span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder={basePrice.toFixed(2)}
                                    value={bp.price ?? ''}
                                    onChange={(e) => handlePriceChange(bp.branch_id, e.target.value)}
                                    className="h-8 pl-7 pr-2 text-right text-sm"
                                  />
                                </div>
                              </div>
                              
                              {/* Tax Rate Input */}
                              <div className="w-20">
                                <Label className="text-xs text-muted-foreground">Tax %</Label>
                                <div className="relative">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    placeholder={getCountryDefaultTax(bp.branch_country).toString()}
                                    value={bp.tax_rate ?? ''}
                                    onChange={(e) => handleTaxRateChange(bp.branch_id, e.target.value)}
                                    className="h-8 pr-6 text-right text-sm"
                                  />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                                    %
                                  </span>
                                </div>
                              </div>
                              
                              {/* Actions */}
                              <div className="flex items-end gap-1 pb-0.5">
                                {hasCustomValue(bp) ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleClearBranch(bp.branch_id)}
                                    title="Clear (use defaults)"
                                    className="h-8 w-8 p-0"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCopyDefaults(bp.branch_id)}
                                    title="Copy default values"
                                    className="h-8 w-8 p-0"
                                  >
                                    <DollarSign className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {!hasCustomValue(bp) && (
                            <p className="text-xs text-muted-foreground mt-1 ml-6">
                              Using defaults: {formatCurrency(basePrice, bp.branch_currency)} @ {getCountryDefaultTax(bp.branch_country)}% tax {getCountryDefaultTaxIncluded(bp.branch_country) ? '(incl)' : '(excl)'} - {bp.branch_country}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <Separator />

        <DialogFooter className="gap-2 sm:gap-0">
          {hasChanges && (
            <Button variant="outline" onClick={handleReset} disabled={saving}>
              Reset Changes
            </Button>
          )}
          <Button onClick={handleSave} disabled={!hasChanges || saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Prices
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BranchPricingManager;
