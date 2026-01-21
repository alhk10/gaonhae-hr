/**
 * Branch Pricing Manager Component
 * Manages per-branch pricing with currency display for products
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
import { toast } from 'sonner';
import { Building2, DollarSign, Globe, Loader2, Save, X } from 'lucide-react';
import { 
  getProductBranchPrices, 
  bulkUpdateBranchPrices, 
  type BranchPrice 
} from '@/services/priceRulesService';
import { formatCurrency, getCurrencySymbol } from '@/utils/currencyUtils';

interface BranchPricingManagerProps {
  productId: string;
  productName: string;
  basePrice: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export const BranchPricingManager: React.FC<BranchPricingManagerProps> = ({
  productId,
  productName,
  basePrice,
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

  const handleClearPrice = (branchId: string) => {
    setBranchPrices(prev =>
      prev.map(bp =>
        bp.branch_id === branchId
          ? { ...bp, price: null }
          : bp
      )
    );
    setHasChanges(true);
  };

  const handleSetBasePrice = (branchId: string) => {
    setBranchPrices(prev =>
      prev.map(bp =>
        bp.branch_id === branchId
          ? { ...bp, price: basePrice }
          : bp
      )
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await bulkUpdateBranchPrices(productId, branchPrices);
      toast.success('Branch prices saved successfully');
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Branch Pricing - {productName}
          </DialogTitle>
        </DialogHeader>

        {/* Base Price Info */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Default Base Price:</span>
          </div>
          <span className="font-semibold">{formatCurrency(basePrice, 'SGD')}</span>
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
                      <Card key={bp.branch_id} className="overflow-hidden">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2 min-w-0">
                              <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium truncate">{bp.branch_name}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                                  {getCurrencySymbol(bp.branch_currency)}
                                </span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="Use default"
                                  value={bp.price ?? ''}
                                  onChange={(e) => handlePriceChange(bp.branch_id, e.target.value)}
                                  className="w-32 pl-8 pr-2 text-right"
                                />
                              </div>
                              
                              {bp.price !== null && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleClearPrice(bp.branch_id)}
                                  title="Clear (use default)"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              )}
                              
                              {bp.price === null && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSetBasePrice(bp.branch_id)}
                                  title="Copy base price"
                                >
                                  <DollarSign className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          {bp.price === null && (
                            <p className="text-xs text-muted-foreground mt-1 ml-6">
                              Using default: {formatCurrency(basePrice, bp.branch_currency)}
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
