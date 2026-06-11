/**
 * Product Variant Manager
 * Unified dialog for managing Size, Color, and Competition variants
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
import { X, Plus, Ruler, Palette, Trophy, Loader2 } from 'lucide-react';
import { getVariantTypes, VariantType, VariantPreset, ProductVariants } from '@/services/variantTypesService';

interface EnabledTypes {
  size: boolean;
  color: boolean;
  competition: boolean;
}

interface ProductVariantManagerProps {
  variants: ProductVariants;
  onVariantsChange: (variants: ProductVariants) => void;
  enabledTypes: EnabledTypes;
  onEnabledTypesChange: (enabledTypes: EnabledTypes) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const VARIANT_ICONS: Record<string, React.ReactNode> = {
  size: <Ruler className="w-4 h-4" />,
  color: <Palette className="w-4 h-4" />,
  competition: <Trophy className="w-4 h-4" />
};

const VARIANT_COLORS: Record<string, string> = {
  size: 'bg-blue-500/10 text-blue-700 border-blue-200',
  color: 'bg-purple-500/10 text-purple-700 border-purple-200',
  competition: 'bg-amber-500/10 text-amber-700 border-amber-200'
};

const VARIANT_NAMES: Record<string, string> = {
  size: 'Size',
  color: 'Color',
  competition: 'Competition'
};

const COMPETITION_FALLBACK: VariantType = {
  id: 'competition-fallback',
  name: 'Competition',
  code: 'competition',
  sort_order: 99,
  is_active: true,
  presets: [
    {
      name: 'Competition Categories',
      options: [
        'Individual',
        'Pair',
        'Team',
        'Kyorugi',
        'Family',
        'Speed Kicking',
        'Board Breaking',
        'High Jump Kick',
        'Long Jump Kick'
      ]
    }
  ]
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
  const [currentEnabled, setCurrentEnabled] = useState<EnabledTypes>({
    size: enabledTypes?.size ?? false,
    color: enabledTypes?.color ?? false,
    competition: enabledTypes?.competition ?? false
  });
  const [newValues, setNewValues] = useState<Record<string, string>>({
    size: '',
    color: '',
    competition: ''
  });
  const [activeTab, setActiveTab] = useState('size');

  useEffect(() => {
    if (open) {
      loadVariantTypes();
      setCurrentVariants({ ...variants });
      setCurrentEnabled({
        size: enabledTypes?.size ?? false,
        color: enabledTypes?.color ?? false,
        competition: enabledTypes?.competition ?? false
      });
    }
  }, [open, variants, enabledTypes]);

  const loadVariantTypes = async () => {
    try {
      setLoading(true);
      const types = await getVariantTypes();
      // Ensure competition type exists (fallback if not in DB)
      if (!types.find(t => t.code === 'competition')) {
        types.push(COMPETITION_FALLBACK);
      }
      setVariantTypes(types);
    } catch (error) {
      console.error('Failed to load variant types:', error);
      toast.error('Failed to load variant types');
      setVariantTypes([COMPETITION_FALLBACK]);
    } finally {
      setLoading(false);
    }
  };

  const getVariantArray = (code: string): string[] => {
    switch (code) {
      case 'size': return currentVariants.sizes || [];
      case 'color': return currentVariants.colors || [];
      case 'competition': return currentVariants.competitions || [];
      default: return [];
    }
  };

  const setVariantArray = (code: string, values: string[]) => {
    setCurrentVariants(prev => {
      switch (code) {
        case 'size': return { ...prev, sizes: values };
        case 'color': return { ...prev, colors: values };
        case 'competition': return { ...prev, competitions: values };
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
    const displayName = variantType?.name || VARIANT_NAMES[code] || code;
    const isEnabled = currentEnabled[code as keyof EnabledTypes];
    const currentArray = getVariantArray(code);
    const colorClass = VARIANT_COLORS[code] || '';

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            {VARIANT_ICONS[code]}
            <span className="font-medium">Enable {displayName} Variants</span>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={(checked) => toggleEnabled(code, checked)}
          />
        </div>

        {isEnabled && (
          <>
            <div>
              <Label>Add Custom {displayName}</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={newValues[code] || ''}
                  onChange={(e) => setNewValues(prev => ({ ...prev, [code]: e.target.value }))}
                  onKeyPress={(e) => handleKeyPress(e, code)}
                  placeholder={`Enter ${displayName.toLowerCase()}...`}
                  maxLength={50}
                />
                <Button onClick={() => addValue(code)} disabled={!newValues[code]?.trim()}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

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

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Current {displayName} Variants ({currentArray.length})</Label>
                {currentArray.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => clearAll(code)}>
                    Clear All
                  </Button>
                )}
              </div>
              <div className="min-h-[80px] max-h-[150px] overflow-y-auto border rounded-lg p-3">
                {currentArray.length === 0 ? (
                  <div className="text-center text-muted-foreground py-6">
                    No {displayName.toLowerCase()}s added yet
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

  const enabledCount = Object.values(currentEnabled).filter(Boolean).length;
  const totalValues = 
    (currentVariants.sizes?.length || 0) + 
    (currentVariants.colors?.length || 0) +
    (currentVariants.competitions?.length || 0);

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
              <TabsTrigger value="competition" className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Competition
                {currentEnabled.competition && currentVariants.competitions?.length ? (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {currentVariants.competitions.length}
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
              <TabsContent value="competition" className="mt-0">
                {renderVariantTab('competition')}
              </TabsContent>
            </div>
          </Tabs>
        )}

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
              {currentEnabled.competition && currentVariants.competitions?.length ? (
                <span>Competitions: {currentVariants.competitions.length}</span>
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
