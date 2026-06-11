import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package, Tag, Award, Layers, Settings, Briefcase, Calendar } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CLASS_TYPES } from '@/services/branchTimetableService';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { updateProduct, getProductCategories, Product, ProductVariants } from '@/services/productService';
import { ProductVariantManager } from './ProductVariantManager';
import { InlineBranchPricing, InlineBranchPricingRef } from './InlineBranchPricing';
import { MultiSelect } from '@/components/ui/multi-select';
import { BELT_LEVELS_ARRAY } from '@/constants/beltLevels';

interface EditProductDialogProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductUpdated?: () => void;
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const EditProductDialog: React.FC<EditProductDialogProps> = ({
  product,
  open,
  onOpenChange,
  onProductUpdated
}) => {
  const [loading, setLoading] = useState(false);
  const branchPricingRef = useRef<InlineBranchPricingRef>(null);
  const [categories, setCategories] = useState<Array<{id: string, name: string}>>([]);
  const [showVariantManager, setShowVariantManager] = useState(false);
  // Removed showBranchPricing state - now inline
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    category_id: '',
    base_price: 0,
    tax_rate: 8,
    available_variants: { sizes: [], colors: [] } as ProductVariants,
    allowed_belt_levels: [] as string[],
    requires_belt_level: false,
    min_age: '' as string | number,
    max_age: '' as string | number,
    is_service: false,
    is_active: true,
    is_lesson: false,
    is_adhoc_lesson: false,
    lessons_per_week: 1,
    lesson_days: [] as string[],
    allowed_class_types: [] as string[],
    metadata: {}
  });
  const [enabledVariantTypes, setEnabledVariantTypes] = useState({
    size: false,
    color: false,
    competition: false
  });

  useEffect(() => {
    if (open && product) {
      loadCategories();
      const variants = product.available_variants || { sizes: [], colors: [] };
      setFormData({
        name: product.name || '',
        sku: product.sku || '',
        description: product.description || '',
        category_id: product.category_id || 'none',
        base_price: Number(product.base_price) || 0,
        tax_rate: Number(product.tax_rate) || 8,
        available_variants: variants,
        allowed_belt_levels: product.allowed_belt_levels || [],
        requires_belt_level: product.requires_belt_level || false,
        min_age: product.min_age ?? '',
        max_age: product.max_age ?? '',
        is_service: product.is_service || false,
        is_active: product.is_active,
        is_lesson: product.is_lesson || false,
        is_adhoc_lesson: product.is_adhoc_lesson || false,
        lessons_per_week: product.lessons_per_week || 1,
        lesson_days: product.lesson_days || [],
        allowed_class_types: product.allowed_class_types || [],
        metadata: product.metadata || {}
      });
      setEnabledVariantTypes({
        size: product.requires_size || (variants.sizes?.length || 0) > 0,
        color: product.requires_color || (variants.colors?.length || 0) > 0,
        competition: (variants.competitions?.length || 0) > 0
      });
    }
  }, [open, product]);

  const loadCategories = async () => {
    try {
      const data = await getProductCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
      toast.error('Failed to load product categories');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.name.trim()) {
        toast.error('Product name is required');
        setLoading(false);
        return;
      }

      if (!formData.sku.trim()) {
        toast.error('SKU is required');
        setLoading(false);
        return;
      }

      if (formData.base_price <= 0) {
        toast.error('Base price must be greater than 0');
        setLoading(false);
        return;
      }

      await updateProduct(product.id, {
        ...formData,
        requires_size: enabledVariantTypes.size,
        requires_color: enabledVariantTypes.color,
        category_id: formData.category_id && formData.category_id !== 'none' ? formData.category_id : undefined,
        requires_belt_level: formData.requires_belt_level,
        allowed_belt_levels: formData.requires_belt_level && formData.allowed_belt_levels.length > 0 ? formData.allowed_belt_levels : null as any,
        min_age: formData.min_age !== '' ? Number(formData.min_age) : null,
        max_age: formData.max_age !== '' ? Number(formData.max_age) : null,
        is_lesson: formData.is_lesson,
        is_adhoc_lesson: formData.is_lesson ? formData.is_adhoc_lesson : false,
        lessons_per_week: formData.is_lesson && !formData.is_adhoc_lesson ? formData.lessons_per_week : null,
        lesson_days: formData.is_lesson && !formData.is_adhoc_lesson ? formData.lesson_days : null,
        allowed_class_types: formData.is_lesson ? formData.allowed_class_types : null
      });

      // Save branch pricing if there are changes
      if (branchPricingRef.current) {
        await branchPricingRef.current.save();
      }

      toast.success('Product updated successfully');
      onProductUpdated?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update product:', error);
      toast.error('Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      // Clear lesson fields when toggling off
      if (field === 'is_lesson' && !value) {
        return { ...prev, [field]: value, is_adhoc_lesson: false, lessons_per_week: 1, lesson_days: [], allowed_class_types: [] };
      }
      return { ...prev, [field]: value };
    });
  };

  const toggleLessonDay = (day: string, checked: boolean) => {
    const newDays = checked 
      ? [...formData.lesson_days, day]
      : formData.lesson_days.filter(d => d !== day);
    setFormData(prev => ({ ...prev, lesson_days: newDays }));
  };

  const toggleClassType = (classType: string, checked: boolean) => {
    const newTypes = checked
      ? [...formData.allowed_class_types, classType]
      : formData.allowed_class_types.filter(t => t !== classType);
    setFormData(prev => ({ ...prev, allowed_class_types: newTypes }));
  };

  if (!product) return null;

  const hasAnyVariants = enabledVariantTypes.size || enabledVariantTypes.color;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Information Section */}
            <section className="rounded-lg bg-muted/50 p-4 space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Package className="w-4 h-4" />
                Basic Information
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Product Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="h-9"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">SKU *</Label>
                  <Input
                    value={formData.sku}
                    onChange={(e) => handleInputChange('sku', e.target.value)}
                    className="h-9"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>
            </section>

            {/* Pricing & Category Section */}
            <section className="rounded-lg bg-accent/30 p-4 space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Tag className="w-4 h-4" />
                Pricing & Category
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Category</Label>
                  <Select value={formData.category_id} onValueChange={(value) => handleInputChange('category_id', value)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Category</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Base Price *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.base_price}
                    onChange={(e) => handleInputChange('base_price', parseFloat(e.target.value) || 0)}
                    className="h-9"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tax Rate (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.tax_rate}
                    onChange={(e) => handleInputChange('tax_rate', parseFloat(e.target.value) || 0)}
                    className="h-9"
                  />
                </div>
              </div>
              
              {/* Inline Branch Pricing */}
              <Separator className="my-3" />
              <InlineBranchPricing
                ref={branchPricingRef}
                productId={product.id}
                basePrice={formData.base_price}
                baseTaxRate={formData.tax_rate}
              />
            </section>

            {/* Product Variants Section */}
            <section className="rounded-lg bg-muted/50 p-4 space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Layers className="w-4 h-4" />
                Product Variants
              </h3>
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {enabledVariantTypes.size && (
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-700">
                      Sizes: {formData.available_variants.sizes?.length || 0}
                    </Badge>
                  )}
                  {enabledVariantTypes.color && (
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-700">
                      Colors: {formData.available_variants.colors?.length || 0}
                    </Badge>
                  )}
                  {enabledVariantTypes.competition && (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-700">
                      Competitions: {formData.available_variants.competitions?.length || 0}
                    </Badge>
                  )}
                  {!hasAnyVariants && (
                    <span className="text-xs text-muted-foreground">No variants configured</span>
                  )}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowVariantManager(true)}>
                  Manage Variants
                </Button>
              </div>
            </section>

            {/* Belt Level Requirements Section */}
            <section className="rounded-lg bg-accent/30 p-4 space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Award className="w-4 h-4" />
                Belt Level Requirements
              </h3>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.requires_belt_level}
                  onCheckedChange={(checked) => handleInputChange('requires_belt_level', checked)}
                />
                <Label className="text-xs">Requires specific belt level</Label>
              </div>
              {formData.requires_belt_level && (
                <div className="space-y-1">
                <Label className="text-xs">Allowed Belt Levels</Label>
                  <MultiSelect
                    values={formData.allowed_belt_levels}
                    onValuesChange={(values) => handleInputChange('allowed_belt_levels', values)}
                    options={BELT_LEVELS_ARRAY}
                    placeholder="Select belt levels..."
                    searchPlaceholder="Search belt levels..."
                    maxDisplayed={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Only students with these belt levels can see this product
                  </p>
                </div>
              )}
            </section>

            {/* Age Requirements Section */}
            <section className="rounded-lg bg-accent/30 p-4 space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Award className="w-4 h-4" />
                Age Requirements
              </h3>
              <p className="text-xs text-muted-foreground">
                Restrict this product to students within a specific age range
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Minimum Age</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="No minimum"
                    value={formData.min_age}
                    onChange={(e) => handleInputChange('min_age', e.target.value === '' ? '' : parseInt(e.target.value))}
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Maximum Age</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="No maximum"
                    value={formData.max_age}
                    onChange={(e) => handleInputChange('max_age', e.target.value === '' ? '' : parseInt(e.target.value))}
                    className="h-8"
                  />
                </div>
              </div>
            </section>

            {/* Lesson Configuration Section */}
            <section className="rounded-lg bg-muted/50 p-4 space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Calendar className="w-4 h-4" />
                Lesson Configuration
              </h3>
              <div className="flex items-center space-x-2">
                <Switch 
                  checked={formData.is_lesson} 
                  onCheckedChange={(checked) => handleInputChange('is_lesson', checked)} 
                />
                <Label className="text-xs">This is a lesson product</Label>
              </div>
              
              {formData.is_lesson && (
                <div className="space-y-3 pt-2">
                  {/* Lesson Type Selector */}
                  <div className="space-y-1">
                    <Label className="text-xs">Lesson Type</Label>
                    <RadioGroup
                      value={formData.is_adhoc_lesson ? 'adhoc' : 'recurring'}
                      onValueChange={(value) => handleInputChange('is_adhoc_lesson', value === 'adhoc')}
                      className="flex gap-4"
                    >
                      <label className="flex items-center gap-2 cursor-pointer">
                        <RadioGroupItem value="recurring" />
                        <span className="text-xs font-medium">Recurring (Weekly)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <RadioGroupItem value="adhoc" />
                        <span className="text-xs font-medium">Ad-Hoc (Once-Off)</span>
                      </label>
                    </RadioGroup>
                    <p className="text-xs text-muted-foreground">
                      {formData.is_adhoc_lesson 
                        ? 'Students can book individual sessions without a fixed weekly schedule'
                        : 'Students attend fixed weekly lessons on set days'}
                    </p>
                  </div>

                  {/* Recurring-only fields */}
                  {!formData.is_adhoc_lesson && (
                    <>
                      <div className="space-y-1">
                        <Label className="text-xs">Lessons per Week</Label>
                        <Select 
                          value={String(formData.lessons_per_week)} 
                          onValueChange={(value) => handleInputChange('lessons_per_week', parseInt(value))}
                        >
                          <SelectTrigger className="h-9 w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6, 7].map(n => (
                              <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-xs">Available Days (days students can attend)</Label>
                        <p className="text-xs text-muted-foreground">Select which days of the week students can choose from for their lessons</p>
                        <div className="grid grid-cols-4 gap-2 pt-1">
                          {WEEKDAYS.map(day => (
                            <label key={day} className="flex items-center gap-2 cursor-pointer">
                              <Checkbox 
                                checked={formData.lesson_days.includes(day)}
                                onCheckedChange={(checked) => toggleLessonDay(day, !!checked)}
                              />
                              <span className="text-xs">{day}</span>
                            </label>
                          ))}
                        </div>
                        {formData.lessons_per_week !== formData.lesson_days.length && formData.lesson_days.length > 0 && (
                          <p className="text-xs text-amber-600 mt-1">
                            Note: Selected {formData.lesson_days.length} day(s) but lessons per week is {formData.lessons_per_week}
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  {/* Class types - shown for both recurring and ad-hoc */}
                  <div className="space-y-1">
                    <Label className="text-xs">Class Type (types students can book)</Label>
                    <p className="text-xs text-muted-foreground">Select which class types are allowed for this product</p>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {CLASS_TYPES.map(ct => (
                        <label key={ct} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox 
                            checked={formData.allowed_class_types.includes(ct)}
                            onCheckedChange={(checked) => toggleClassType(ct, !!checked)}
                          />
                          <span className="text-xs">{ct}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Status Section */}
            <section className="rounded-lg bg-accent/30 p-4 space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Settings className="w-4 h-4" />
                Status & Type
              </h3>
              <div className="flex flex-col gap-3">
                <div className="flex items-center space-x-2">
                  <Switch checked={formData.is_service} onCheckedChange={(checked) => handleInputChange('is_service', checked)} />
                  <Label className="text-xs flex items-center gap-2">
                    <Briefcase className="w-3 h-3" />
                    Service (no inventory tracking)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch checked={formData.is_active} onCheckedChange={(checked) => handleInputChange('is_active', checked)} />
                  <Label className="text-xs">Active Product</Label>
                </div>
              </div>
            </section>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
              <Button type="submit" size="sm" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update Product
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ProductVariantManager
        variants={formData.available_variants}
        onVariantsChange={(variants) => handleInputChange('available_variants', variants)}
        enabledTypes={enabledVariantTypes}
        onEnabledTypesChange={setEnabledVariantTypes}
        open={showVariantManager}
        onOpenChange={setShowVariantManager}
      />

    </>
  );
};
