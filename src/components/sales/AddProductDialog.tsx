/**
 * Add Product Dialog Component
 * Form for creating new products in the sales module with multi-variant support
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { createProduct, getProductCategories, ProductVariants } from '@/services/productService';
import { Loader2, Package, Tag, Award, Layers, Settings, Globe, Briefcase, Calendar } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CLASS_TYPES } from '@/services/branchTimetableService';
import { Checkbox } from '@/components/ui/checkbox';
import { ProductVariantManager } from './ProductVariantManager';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MultiSelect } from '@/components/ui/multi-select';
import { BELT_LEVELS_ARRAY } from '@/constants/beltLevels';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface AddProductDialogProps {
  trigger: React.ReactNode;
  onProductAdded?: () => void;
}

const AddProductDialog: React.FC<AddProductDialogProps> = ({ trigger, onProductAdded }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Array<{id: string, name: string}>>([]);
  const [showVariantManager, setShowVariantManager] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    category_id: '',
    base_price: '',
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
    allowed_class_types: [] as string[]
  });
  
  const [enabledVariantTypes, setEnabledVariantTypes] = useState({
    size: false,
    color: false,
    competition: false
  });

  useEffect(() => {
    if (open) {
      loadCategories();
    }
  }, [open]);

  const loadCategories = async () => {
    try {
      const data = await getProductCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Product name is required');
      return;
    }

    if (!formData.sku.trim()) {
      toast.error('Product SKU is required');
      return;
    }

    setLoading(true);
    try {
      const productData = {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        description: formData.description.trim() || undefined,
        category_id: formData.category_id && formData.category_id !== 'none' ? formData.category_id : undefined,
        base_price: formData.base_price ? parseFloat(formData.base_price) : 0,
        available_variants: formData.available_variants,
        requires_size: enabledVariantTypes.size,
        requires_color: enabledVariantTypes.color,
        allowed_belt_levels: formData.requires_belt_level && formData.allowed_belt_levels.length > 0 ? formData.allowed_belt_levels : null as any,
        requires_belt_level: formData.requires_belt_level,
        min_age: formData.min_age !== '' ? Number(formData.min_age) : null,
        max_age: formData.max_age !== '' ? Number(formData.max_age) : null,
        is_service: formData.is_service,
        is_active: formData.is_active,
        is_lesson: formData.is_lesson,
        is_adhoc_lesson: formData.is_lesson ? formData.is_adhoc_lesson : false,
        lessons_per_week: formData.is_lesson && !formData.is_adhoc_lesson ? formData.lessons_per_week : undefined,
        lesson_days: formData.is_lesson && !formData.is_adhoc_lesson ? formData.lesson_days : undefined,
        allowed_class_types: formData.is_lesson ? formData.allowed_class_types : undefined
      };

      await createProduct(productData);
      
      toast.success('Product created successfully');
      setOpen(false);
      resetForm();
      onProductAdded?.();
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error('Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      description: '',
      category_id: '',
      base_price: '',
      available_variants: { sizes: [], colors: [], competitions: [] },
      allowed_belt_levels: [],
      requires_belt_level: false,
      min_age: '',
      max_age: '',
      is_service: false,
      is_active: true,
      is_lesson: false,
      is_adhoc_lesson: false,
      lessons_per_week: 1,
      lesson_days: [],
      allowed_class_types: []
    });
    setEnabledVariantTypes({ size: false, color: false, competition: false });
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

  // Count total variants configured
  const totalVariants = 
    (formData.available_variants.sizes?.length || 0) +
    (formData.available_variants.colors?.length || 0);

  const hasAnyVariants = enabledVariantTypes.size || enabledVariantTypes.color;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information Section */}
          <section className="rounded-lg bg-muted/50 p-4 space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Package className="w-4 h-4" />
              Basic Information
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="name" className="text-xs">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter product name"
                    className="h-9"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sku" className="text-xs">SKU *</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => handleInputChange('sku', e.target.value)}
                    placeholder="Enter product SKU"
                    className="h-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="description" className="text-xs">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter product description"
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
          </section>

          {/* Pricing & Category Section */}
          <section className="rounded-lg bg-accent/30 p-4 space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Tag className="w-4 h-4" />
              Pricing & Category
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="category_id" className="text-xs">Category</Label>
                <Select value={formData.category_id} onValueChange={(value) => handleInputChange('category_id', value)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Category</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="base_price" className="text-xs">Base Price *</Label>
                <Input
                  id="base_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.base_price}
                  onChange={(e) => handleInputChange('base_price', e.target.value)}
                  placeholder="0.00"
                  className="h-9"
                  required
                />
              </div>
            </div>
            
            {/* Branch Pricing Note */}
            <Alert className="bg-muted/50 border-muted">
              <Globe className="w-4 h-4" />
              <AlertDescription className="text-xs">
                Branch-specific pricing and tax rates with multi-currency support can be configured after creating the product.
              </AlertDescription>
            </Alert>
          </section>

          {/* Product Variants Section */}
          <section className="rounded-lg bg-muted/50 p-4 space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Layers className="w-4 h-4" />
              Product Variants
            </h3>
            <p className="text-xs text-muted-foreground">
              Configure Size and Color variants for this product
            </p>
            
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
                {!hasAnyVariants && (
                  <span className="text-xs text-muted-foreground">No variants configured</span>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowVariantManager(true)}
              >
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
                id="requires_belt_level"
                checked={formData.requires_belt_level}
                onCheckedChange={(checked) => handleInputChange('requires_belt_level', checked)}
              />
              <Label htmlFor="requires_belt_level" className="text-xs">Requires specific belt level</Label>
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
                id="is_lesson"
                checked={formData.is_lesson} 
                onCheckedChange={(checked) => handleInputChange('is_lesson', checked)} 
              />
              <Label htmlFor="is_lesson" className="text-xs">This is a lesson product</Label>
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
                <Switch
                  id="is_service"
                  checked={formData.is_service}
                  onCheckedChange={(checked) => handleInputChange('is_service', checked)}
                />
                <Label htmlFor="is_service" className="text-xs flex items-center gap-2">
                  <Briefcase className="w-3 h-3" />
                  Service (no inventory tracking)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                />
                <Label htmlFor="is_active" className="text-xs">Active Product</Label>
              </div>
            </div>
          </section>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Product
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Product Variant Manager Dialog */}
      <ProductVariantManager
        variants={formData.available_variants}
        onVariantsChange={(variants) => handleInputChange('available_variants', variants)}
        enabledTypes={enabledVariantTypes}
        onEnabledTypesChange={setEnabledVariantTypes}
        open={showVariantManager}
        onOpenChange={setShowVariantManager}
      />
    </Dialog>
  );
};

export default AddProductDialog;
