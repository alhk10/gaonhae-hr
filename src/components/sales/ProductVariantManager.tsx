/**
 * Product Variant Manager
 * Unified dialog for managing Size, Color, and Belt Rank variants
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { X, Plus, Ruler, Palette, Award, Loader2 } from 'lucide-react';
import { getVariantTypes, VariantType, VariantPreset, ProductVariants } from '@/services/variantTypesService';

interface ProductVariantManagerProps {
  variants: ProductVariants;
  onVariantsChange: (variants: ProductVariants) => void;
  enabledTypes: {
    size: boolean;
    color: boolean;
    belt_rank: boolean;
  };
  onEnabledTypesChange: (enabledTypes: { size: boolean; color: boolean; belt_rank: boolean }) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const VARIANT_ICONS: Record<string, React.ReactNode> = {
  size: <Ruler className="w-4 h-4" />,
  color: <Palette className="w-4 h-4" />,
  belt_rank: <Award className="w-4 h-4" />
};

const VARIANT_COLORS: Record<string, string> = {
  size: 'bg-blue-500/10 text-blue-700 border-blue-200',
  color: 'bg-purple-500/10 text-purple-700 border-purple-200',
  belt_rank: 'bg-amber-500/10 text-amber-700 border-amber-200'
};

export const ProductVariantManager: React.FC<ProductVariantManagerProps> = ({
  variants,
  onVariantsChange,
  enabledTypes,
  onEnabledTypesChange,
  open,
  onOpenChange
}) => {
  const [variantTypes, setVariantTypes] = useState<VariantType[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentVariants, setCurrentVariants] = useState<ProductVariants>({});
  const [currentEnabled, setCurrentEnabled] = useState(enabledTypes);
  const [newValues, setNewValues] = useState<Record<string, string>>({
    size: '',
    color: '',
    belt_rank: ''
  });
  const [activeTab, setActiveTab] = useState('size');

  // Load variant types from database
  useEffect(() => {
    if (open) {
      loadVariantTypes();
      setCurrentVariants({ ...variants });
      setCurrentEnabled({ ...enabledTypes });
    }
  }, [open, variants, enabledTypes]);

  const loadVariantTypes = async () => {
    try {
      setLoading(true);
      const types = await getVariantTypes();
      setVariantTypes(types);
    } catch (error) {
      console.error('Failed to load variant types:', error);
      toast.error('Failed to load variant types');
    } finally {
      setLoading(false);
    }
  };

  const getVariantArray = (code: string): string[] => {
    switch (code) {
      case 'size': return currentVariants.sizes || [];
      case 'color': return currentVariants.colors || [];
      case 'belt_rank': return currentVariants.belt_ranks || [];
      default: return [];
    }
  };

  const setVariantArray = (code: string, values: string[]) => {
    setCurrentVariants(prev => {
      switch (code) {
        case 'size': return { ...prev, sizes: values };
        case 'color': return { ...prev, colors: values };
        case 'belt_rank': return { ...prev, belt_ranks: values };
        default: return prev;
      }
    });
  };

  const addValue = (code: string) => {
    const trimmedValue = newValues[code]?.trim();
    const currentArray = getVariantArray(code);
    
    if (trimmedValue && !currentArray.includes(trimmedValue)) {
      setVariantArray(code, [...currentArray, trimmedValue]);
      setNewValues(prev => ({ ...prev, [code]: '' }));
    } else if (currentArray.includes(trimmedValue)) {
      toast.error('Value already exists');
    }
  };

  const removeValue = (code: string, valueToRemove: string) => {
    const currentArray = getVariantArray(code);
    setVariantArray(code, currentArray.filter(v => v !== valueToRemove));
  };

  const addPresetValues = (code: string, presetValues: string[]) => {
    const currentArray = getVariantArray(code);
    const newArray = [...currentArray];
    presetValues.forEach(value => {
      if (!newArray.includes(value)) {
        newArray.push(value);
      }
    });
    setVariantArray(code, newArray);
  };

  const clearAll = (code: string) => {
    setVariantArray(code, []);
  };

  const toggleEnabled = (code: string, enabled: boolean) => {
    setCurrentEnabled(prev => ({
      ...prev,
      [code]: enabled
    }));
    // If disabling, clear the values
    if (!enabled) {
      setVariantArray(code, []);
    }
  };

  const handleSave = () => {
    onVariantsChange(currentVariants);
    onEnabledTypesChange(currentEnabled);
    onOpenChange(false);
    toast.success('Product variants updated');
  };

  const handleKeyPress = (e: React.KeyboardEvent, code: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addValue(code);
    }
  };

  const getVariantType = (code: string): VariantType | undefined => {
    return variantTypes.find(vt => vt.code === code);
  };

  const renderVariantTab = (code: string) => {
    const variantType = getVariantType(code);
    const isEnabled = currentEnabled[code as keyof typeof currentEnabled];
    const currentArray = getVariantArray(code);
    const colorClass = VARIANT_COLORS[code] || '';

    return (
      <div className="space-y-4">
        {/* Enable Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            {VARIANT_ICONS[code]}
            <span className="font-medium">Enable {variantType?.name || code} Variants</span>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={(checked) => toggleEnabled(code, checked)}
          />
        </div>

        {isEnabled && (
          <>
            {/* Add Custom Value */}
            <div>
              <Label>Add Custom {variantType?.name || code}</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={newValues[code] || ''}
                  onChange={(e) => setNewValues(prev => ({ ...prev, [code]: e.target.value }))}
                  onKeyPress={(e) => handleKeyPress(e, code)}
                  placeholder={`Enter ${variantType?.name?.toLowerCase() || code}...`}
                  maxLength={50}
                />
                <Button onClick={() => addValue(code)} disabled={!newValues[code]?.trim()}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Presets */}
            {variantType?.presets && variantType.presets.length > 0 && (
              <div>
                <Label>Quick Add Presets</Label>
                <ScrollArea className="h-[180px] mt-2">
                  <div className="space-y-2 pr-4">
                    {variantType.presets.map((preset: VariantPreset) => (
                      <div key={preset.name} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium text-sm">{preset.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {preset.options.slice(0, 4).join(', ')}
                            {preset.options.length > 4 && ` +${preset.options.length - 4} more`}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addPresetValues(code, preset.options)}
                        >
                          Add All
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Current Values */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Current {variantType?.name || code} Variants ({currentArray.length})</Label>
                {currentArray.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => clearAll(code)}>
                    Clear All
                  </Button>
                )}
              </div>
              <div className="min-h-[80px] max-h-[150px] overflow-y-auto border rounded-lg p-3">
                {currentArray.length === 0 ? (
                  <div className="text-center text-muted-foreground py-6">
                    No {variantType?.name?.toLowerCase() || code}s added yet
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {currentArray.map((value, index) => (
                      <Badge 
                        key={`${value}-${index}`} 
                        variant="outline"
                        className={`flex items-center gap-1 ${colorClass}`}
                      >
                        {value}
                        <button
                          onClick={() => removeValue(code, value)}
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
          </>
        )}
      </div>
    );
  };

  // Calculate summary
  const enabledCount = Object.values(currentEnabled).filter(Boolean).length;
  const totalValues = 
    (currentVariants.sizes?.length || 0) + 
    (currentVariants.colors?.length || 0) + 
    (currentVariants.belt_ranks?.length || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Manage Product Variants
            {enabledCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {enabledCount} type{enabledCount !== 1 ? 's' : ''} enabled
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="size" className="flex items-center gap-2">
                <Ruler className="w-4 h-4" />
                Size
                {currentEnabled.size && currentVariants.sizes?.length ? (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {currentVariants.sizes.length}
                  </Badge>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="color" className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Color
                {currentEnabled.color && currentVariants.colors?.length ? (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {currentVariants.colors.length}
                  </Badge>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="belt_rank" className="flex items-center gap-2">
                <Award className="w-4 h-4" />
                Belt Rank
                {currentEnabled.belt_rank && currentVariants.belt_ranks?.length ? (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {currentVariants.belt_ranks.length}
                  </Badge>
                ) : null}
              </TabsTrigger>
            </TabsList>

            <div className="mt-4">
              <TabsContent value="size" className="mt-0">
                {renderVariantTab('size')}
              </TabsContent>
              <TabsContent value="color" className="mt-0">
                {renderVariantTab('color')}
              </TabsContent>
              <TabsContent value="belt_rank" className="mt-0">
                {renderVariantTab('belt_rank')}
              </TabsContent>
            </div>
          </Tabs>
        )}

        {/* Summary */}
        {totalValues > 0 && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-sm font-medium mb-2">Variant Summary</div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {currentEnabled.size && currentVariants.sizes?.length ? (
                <span>Sizes: {currentVariants.sizes.length}</span>
              ) : null}
              {currentEnabled.color && currentVariants.colors?.length ? (
                <span>Colors: {currentVariants.colors.length}</span>
              ) : null}
              {currentEnabled.belt_rank && currentVariants.belt_ranks?.length ? (
                <span>Belt Ranks: {currentVariants.belt_ranks.length}</span>
              ) : null}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Variants
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
