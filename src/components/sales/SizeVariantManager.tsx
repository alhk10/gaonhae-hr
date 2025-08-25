/**
 * Size Variant Management Dialog
 * Manages size options for products
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { X, Plus } from 'lucide-react';

interface SizeVariantManagerProps {
  sizes: string[];
  onSizesChange: (sizes: string[]) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Predefined size systems
const SIZE_PRESETS = {
  'Clothing Sizes': ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
  'Number Sizes': ['Size 1', 'Size 2', 'Size 3', 'Size 4', 'Size 5', 'Size 6'],
  'Children Sizes': ['2T', '3T', '4T', '5T', '6', '7', '8', '10', '12', '14', '16'],
  'Shoe Sizes (US)': ['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12'],
  'Age Groups': ['0-2 years', '3-5 years', '6-8 years', '9-12 years', '13+ years']
};

export const SizeVariantManager: React.FC<SizeVariantManagerProps> = ({
  sizes,
  onSizesChange,
  open,
  onOpenChange
}) => {
  const [currentSizes, setCurrentSizes] = useState<string[]>([]);
  const [newSize, setNewSize] = useState('');

  useEffect(() => {
    setCurrentSizes([...sizes]);
  }, [sizes, open]);

  const addSize = () => {
    const trimmedSize = newSize.trim();
    if (trimmedSize && !currentSizes.includes(trimmedSize)) {
      setCurrentSizes(prev => [...prev, trimmedSize]);
      setNewSize('');
    } else if (currentSizes.includes(trimmedSize)) {
      toast.error('Size already exists');
    }
  };

  const removeSize = (sizeToRemove: string) => {
    setCurrentSizes(prev => prev.filter(size => size !== sizeToRemove));
  };

  const addPresetSizes = (presetSizes: string[]) => {
    const newSizes = [...currentSizes];
    presetSizes.forEach(size => {
      if (!newSizes.includes(size)) {
        newSizes.push(size);
      }
    });
    setCurrentSizes(newSizes);
  };

  const handleSave = () => {
    onSizesChange(currentSizes);
    onOpenChange(false);
    toast.success('Size variants updated');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSize();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Size Variants</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add Custom Size */}
          <div>
            <Label htmlFor="newSize">Add Custom Size</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="newSize"
                value={newSize}
                onChange={(e) => setNewSize(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter size (e.g., S, M, L)"
                maxLength={20}
              />
              <Button onClick={addSize} disabled={!newSize.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Size Presets */}
          <div>
            <Label>Quick Add Size Presets</Label>
            <div className="grid grid-cols-1 gap-2 mt-2">
              {Object.entries(SIZE_PRESETS).map(([name, presetSizes]) => (
                <div key={name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium text-sm">{name}</div>
                    <div className="text-xs text-muted-foreground">
                      {presetSizes.slice(0, 3).join(', ')}
                      {presetSizes.length > 3 && ` +${presetSizes.length - 3} more`}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addPresetSizes(presetSizes)}
                  >
                    Add All
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Current Sizes */}
          <div>
            <Label>Current Size Variants ({currentSizes.length})</Label>
            <div className="mt-2 min-h-[100px] max-h-[200px] overflow-y-auto border rounded-lg p-3">
              {currentSizes.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No sizes added yet
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {currentSizes.map((size, index) => (
                    <Badge key={`${size}-${index}`} variant="secondary" className="flex items-center gap-1">
                      {size}
                      <button
                        onClick={() => removeSize(size)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentSizes([])}
              disabled={currentSizes.length === 0}
            >
              Clear All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentSizes([...sizes])}
              disabled={JSON.stringify(currentSizes) === JSON.stringify(sizes)}
            >
              Reset to Original
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Size Variants
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};