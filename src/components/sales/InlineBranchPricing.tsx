/**
 * Inline Branch Pricing Component
 * Displays branch-specific pricing directly within the product edit form
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Building2, Eye, EyeOff, Loader2, Save, X, AlertCircle, Check } from 'lucide-react';
import { 
  getProductBranchPrices, 
  bulkUpdateBranchPrices, 
  type BranchPrice,
} from '@/services/priceRulesService';
import { getCurrencySymbol } from '@/utils/currencyUtils';
import { COUNTRY_TAX_RATES, COUNTRY_TAX_INCLUDED, DEFAULT_TAX_RATE, DEFAULT_TAX_INCLUDED } from '@/config/constants';

const getCountryDefaultTax = (country: string): number => {
  return COUNTRY_TAX_RATES[country] ?? DEFAULT_TAX_RATE;
};

const getCountryDefaultTaxIncluded = (country: string): boolean => {
  return COUNTRY_TAX_INCLUDED[country] ?? DEFAULT_TAX_INCLUDED;
};

interface InlineBranchPricingProps {
  productId: string;
  basePrice: number;
  baseTaxRate: number;
}

export const InlineBranchPricing: React.FC<InlineBranchPricingProps> = ({
  productId,
  basePrice,
  baseTaxRate,
}) => {
  const [branchPrices, setBranchPrices] = useState<BranchPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalPrices, setOriginalPrices] = useState<BranchPrice[]>([]);

  useEffect(() => {
    if (productId) {
      loadBranchPrices();
    }
  }, [productId]);

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
        bp.branch_id === branchId ? { ...bp, price: numValue } : bp
      )
    );
    setHasChanges(true);
  };

  const handleTaxRateChange = (branchId: string, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    setBranchPrices(prev =>
      prev.map(bp =>
        bp.branch_id === branchId ? { ...bp, tax_rate: numValue } : bp
      )
    );
    setHasChanges(true);
  };

  const handleTaxIncludedChange = (branchId: string, value: string) => {
    const boolValue = value === 'default' ? null : value === 'include';
    setBranchPrices(prev =>
      prev.map(bp =>
        bp.branch_id === branchId ? { ...bp, tax_included: boolValue } : bp
      )
    );
    setHasChanges(true);
  };

  const handleClearBranch = (branchId: string) => {
    setBranchPrices(prev =>
      prev.map(bp =>
        bp.branch_id === branchId
          ? { ...bp, price: null, tax_rate: null, tax_included: null, is_hidden: false }
          : bp
      )
    );
    setHasChanges(true);
  };

  const handleToggleHidden = (branchId: string) => {
    setBranchPrices(prev =>
      prev.map(bp =>
        bp.branch_id === branchId ? { ...bp, is_hidden: !bp.is_hidden } : bp
      )
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await bulkUpdateBranchPrices(productId, branchPrices);
      toast.success('Branch pricing saved');
      setOriginalPrices(JSON.parse(JSON.stringify(branchPrices)));
      setHasChanges(false);
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

  const hasCustomValue = (bp: BranchPrice) => 
    bp.price !== null || bp.tax_rate !== null || bp.tax_included !== null || bp.is_hidden;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-xs text-muted-foreground">Loading branches...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with save actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium">Branch-specific Pricing</span>
          {hasChanges && (
            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700">
              <AlertCircle className="w-3 h-3 mr-1" />
              Unsaved
            </Badge>
          )}
        </div>
        {hasChanges && (
          <div className="flex gap-1">
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              onClick={handleReset} 
              disabled={saving}
              className="h-7 text-xs"
            >
              Reset
            </Button>
            <Button 
              type="button" 
              variant="default" 
              size="sm" 
              onClick={handleSave} 
              disabled={saving}
              className="h-7 text-xs"
            >
              {saving ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Check className="w-3 h-3 mr-1" />
              )}
              Save Prices
            </Button>
          </div>
        )}
      </div>

      <Separator />

      {/* Branch list */}
      <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1">
        {Object.entries(groupedBranches).map(([currency, branches]) => (
          <div key={currency}>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="font-mono text-[10px]">
                {currency}
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                ({getCurrencySymbol(currency)})
              </span>
            </div>
            
            <div className="space-y-2">
              {branches.map((bp) => (
                <Card 
                  key={bp.branch_id} 
                  className={`overflow-hidden transition-all ${hasCustomValue(bp) ? 'border-primary/40 bg-primary/5' : ''} ${bp.is_hidden ? 'opacity-50' : ''}`}
                >
                  <CardContent className="p-2">
                    <div className="flex items-center gap-2">
                      {/* Branch name */}
                      <div className="flex items-center gap-1.5 min-w-0 w-28">
                        <span className={`text-xs font-medium truncate ${bp.is_hidden ? 'line-through text-muted-foreground' : ''}`}>
                          {bp.branch_name}
                        </span>
                        {bp.is_hidden && (
                          <Badge variant="secondary" className="text-[9px] px-1">Hidden</Badge>
                        )}
                      </div>
                      
                      {/* Price Input */}
                      <div className="flex-1 min-w-0">
                        <div className="relative">
                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">
                            {getCurrencySymbol(bp.branch_currency)}
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder={basePrice.toFixed(2)}
                            value={bp.price ?? ''}
                            onChange={(e) => handlePriceChange(bp.branch_id, e.target.value)}
                            className="h-7 pl-5 pr-1 text-right text-xs"
                            disabled={bp.is_hidden}
                          />
                        </div>
                      </div>

                      {/* Tax Inclusion Select */}
                      <div className="w-20">
                        <Select 
                          value={bp.tax_included === null ? 'default' : bp.tax_included ? 'include' : 'exclude'}
                          onValueChange={(value) => handleTaxIncludedChange(bp.branch_id, value)}
                          disabled={bp.is_hidden}
                        >
                          <SelectTrigger className="h-7 text-[10px] px-1.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default" className="text-xs">
                              Default ({getCountryDefaultTaxIncluded(bp.branch_country) ? 'Incl' : 'Excl'})
                            </SelectItem>
                            <SelectItem value="exclude" className="text-xs">Exclude</SelectItem>
                            <SelectItem value="include" className="text-xs">Include</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Tax Rate Input */}
                      <div className="w-14">
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            placeholder={getCountryDefaultTax(bp.branch_country).toString()}
                            value={bp.tax_rate ?? ''}
                            onChange={(e) => handleTaxRateChange(bp.branch_id, e.target.value)}
                            className="h-7 pr-4 text-right text-xs"
                            disabled={bp.is_hidden}
                          />
                          <span className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">
                            %
                          </span>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleHidden(bp.branch_id)}
                          title={bp.is_hidden ? 'Show' : 'Hide'}
                          className="h-7 w-7 p-0"
                        >
                          {bp.is_hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
                        </Button>
                        {hasCustomValue(bp) && !bp.is_hidden && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleClearBranch(bp.branch_id)}
                            title="Clear"
                            className="h-7 w-7 p-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground">
        Leave fields empty to use default price ({basePrice.toFixed(2)}) and tax rate ({baseTaxRate}%)
      </p>
    </div>
  );
};

export default InlineBranchPricing;
