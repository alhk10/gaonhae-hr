/**
 * Grading Slot Dialog
 * Form for creating and editing grading examination slots
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { createGradingSlot, updateGradingSlot, type CreateGradingSlotData, type GradingSlot } from '@/services/gradingService';
import { Loader2, ChevronDown } from 'lucide-react';
import { BELT_LEVELS } from '@/constants/beltLevels';
import { formatDate } from '@/utils/dateFormat';
import { deriveBeltLevels, type NamedGradingProduct } from '@/utils/gradingProductBelts';

interface GradingSlotDialogProps {
  trigger: React.ReactNode;
  onSlotSaved?: () => void;
  editSlot?: GradingSlot | null;
  duplicateSlot?: GradingSlot | null;
  mode?: 'add' | 'edit';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const GradingSlotDialog: React.FC<GradingSlotDialogProps> = ({ 
  trigger, 
  onSlotSaved, 
  editSlot = null,
  duplicateSlot = null,
  mode = 'add',
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Array<{id: string, name: string}>>([]);
  const [gradingProducts, setGradingProducts] = useState<NamedGradingProduct[]>([]);
  
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled
    ? (val: boolean) => controlledOnOpenChange?.(val)
    : setInternalOpen;

  const [formData, setFormData] = useState<CreateGradingSlotData>({
    branch_id: '',
    grading_date: '',
    start_time: '',
    title: '',
    belt_levels: [],
    max_capacity: 20,
    notes: '',
    min_age: undefined,
    max_age: undefined,
    available_branch_ids: [],
    grading_product_ids: [],
  });

  useEffect(() => {
    if (open) {
      const initForm = async () => {
        await Promise.all([loadBranches(), loadGradingProducts()]);
        if (duplicateSlot) {
          setFormData({
            branch_id: duplicateSlot.branch_id,
            grading_date: duplicateSlot.grading_date,
            start_time: duplicateSlot.start_time || '',
            title: duplicateSlot.title ? `${duplicateSlot.title} (Copy)` : '',
            belt_levels: duplicateSlot.belt_levels || [],
            max_capacity: duplicateSlot.max_capacity || 20,
            notes: duplicateSlot.notes || '',
            min_age: (duplicateSlot as any).min_age ?? undefined,
            max_age: (duplicateSlot as any).max_age ?? undefined,
            available_branch_ids: (duplicateSlot as any).available_branch_ids || [],
            grading_product_ids: (duplicateSlot as any).grading_product_ids || [],
          });
        } else if (editSlot && mode === 'edit') {
          setFormData({
            branch_id: editSlot.branch_id,
            grading_date: editSlot.grading_date,
            start_time: editSlot.start_time || '',
            title: editSlot.title || '',
            belt_levels: editSlot.belt_levels || [],
            max_capacity: editSlot.max_capacity || 20,
            notes: editSlot.notes || '',
            min_age: (editSlot as any).min_age ?? undefined,
            max_age: (editSlot as any).max_age ?? undefined,
            available_branch_ids: (editSlot as any).available_branch_ids || [],
            grading_product_ids: (editSlot as any).grading_product_ids || [],
          });
        } else {
          resetForm();
        }
      };
      initForm();
    }
  }, [open, editSlot, duplicateSlot, mode]);

  const loadBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setBranches(data?.filter(b => !['Competition', 'Headquarters'].includes(b.name)) || []);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const loadGradingProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, product_categories!inner(name)')
        .eq('is_active', true)
        .eq('product_categories.name', 'Grading')
        .order('name');
      if (error) throw error;
      setGradingProducts((data || []).map((p: any) => ({ id: p.id, name: p.name })));
    } catch (error) {
      console.error('Error loading grading products:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.grading_date) {
      toast.error('Please select a grading date');
      return;
    }

    setLoading(true);
    try {
      const emptyToNull = (v: any) => (v === '' ? null : v);
      const emptyArrToNull = (v: any) => (Array.isArray(v) && v.length === 0 ? null : v);
      const payload: any = {
        ...formData,
        branch_id: emptyToNull(formData.branch_id),
        start_time: emptyToNull(formData.start_time),
        end_time: emptyToNull((formData as any).end_time),
        location: emptyToNull((formData as any).location),
        examiner_name: emptyToNull((formData as any).examiner_name),
        notes: emptyToNull((formData as any).notes),
        title: emptyToNull((formData as any).title),
        grading_product_ids: emptyArrToNull(formData.grading_product_ids),
        belt_levels: emptyArrToNull(formData.belt_levels),
        available_branch_ids: emptyArrToNull(formData.available_branch_ids),
      };
      if (isEditMode && editSlot) {
        await updateGradingSlot(editSlot.id, payload);
        toast.success('Grading slot updated successfully');
      } else {
        await createGradingSlot(payload);
        toast.success(isDuplicateMode ? 'Grading slot duplicated successfully' : 'Grading slot created successfully');
      }
      setOpen(false);
      resetForm();
      onSlotSaved?.();
    } catch (error) {
      console.error('Error saving grading slot:', error);
      toast.error(`Failed to ${isEditMode ? 'update' : isDuplicateMode ? 'duplicate' : 'create'} grading slot`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      branch_id: '',
      grading_date: '',
      start_time: '',
      title: '',
      belt_levels: [],
      max_capacity: 20,
      notes: '',
      min_age: undefined,
      max_age: undefined,
      available_branch_ids: [],
      grading_product_ids: [],
    });
  };

  // Generate default title based on selected values
  const generateDefaultTitle = (branchId: string, date: string, time: string, belts: string[]) => {
    const branchName = branches.find(b => b.id === branchId)?.name || '';
    const dateStr = date ? formatDate(date + 'T00:00:00') : '';
    const timeStr = time ? time.slice(0, 5) : '';
    const beltStr = belts.length > 0 ? belts.slice(0, 3).join(', ') + (belts.length > 3 ? '...' : '') : '';
    
    const parts = [branchName, dateStr, timeStr, beltStr].filter(Boolean);
    return parts.join(' - ');
  };

  const handleInputChange = (field: keyof CreateGradingSlotData, value: any) => {
    setFormData(prev => {
      const updated: any = { ...prev, [field]: value };

      // When grading products change, auto-derive belt_levels
      if (field === 'grading_product_ids') {
        updated.belt_levels = deriveBeltLevels(value as string[], gradingProducts);
      }

      // Always auto-generate title when key fields change
      if (['branch_id', 'grading_date', 'start_time', 'belt_levels', 'grading_product_ids'].includes(field as string)) {
        updated.title = generateDefaultTitle(
          field === 'branch_id' ? value : updated.branch_id,
          field === 'grading_date' ? value : updated.grading_date,
          field === 'start_time' ? value : updated.start_time || '',
          updated.belt_levels || []
        );
      }

      return updated;
    });
  };

  const toggleBeltLevel = (belt: string) => {
    const currentBelts = formData.belt_levels || [];
    const newBelts = currentBelts.includes(belt)
      ? currentBelts.filter(b => b !== belt)
      : [...currentBelts, belt];
    handleInputChange('belt_levels', newBelts);
  };

  const isEditMode = mode === 'edit' && !duplicateSlot;
  const isDuplicateMode = !!duplicateSlot;

  const dialogTitle = isDuplicateMode ? 'Duplicate Grading Slot' : isEditMode ? 'Edit Grading Slot' : 'Add Grading Slot';
  const dialogDescription = isDuplicateMode
    ? 'Review and adjust details before creating a copy'
    : isEditMode ? 'Update grading slot details' : 'Create a new grading examination slot for students';
  const submitLabel = isDuplicateMode ? 'Create Copy' : isEditMode ? 'Save Changes' : 'Create Slot';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="branch_id">Branch</Label>
              <Select value={formData.branch_id} onValueChange={(value) => handleInputChange('branch_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="grading_date">Date *</Label>
              <Input
                type="date"
                value={formData.grading_date}
                onChange={(e) => handleInputChange('grading_date', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time</Label>
              <Input
                type="time"
                value={formData.start_time || ''}
                onChange={(e) => handleInputChange('start_time', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_capacity">Max Capacity</Label>
              <Input
                type="number"
                min="1"
                value={formData.max_capacity || 20}
                onChange={(e) => handleInputChange('max_capacity', parseInt(e.target.value) || 20)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              value={formData.title || ''}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Auto-generated from selections above"
            />
            <p className="text-xs text-muted-foreground">Auto-fills based on branch, date, time, and belt levels</p>
          </div>

          <div className="space-y-2">
            <Label>Grading Products</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between" type="button">
                  <span className="truncate text-sm">
                    {(formData.grading_product_ids || []).length === 0
                      ? 'Select grading products'
                      : (formData.grading_product_ids || []).length === 1
                        ? gradingProducts.find(p => p.id === formData.grading_product_ids![0])?.name ?? '1 product'
                        : `${formData.grading_product_ids!.length} products selected`}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2 max-h-60 overflow-y-auto bg-popover border shadow-md z-50" align="start">
                <div className="space-y-1">
                  {gradingProducts.length === 0 && (
                    <div className="px-2 py-1 text-xs text-muted-foreground">No grading products found</div>
                  )}
                  {gradingProducts.map(product => (
                    <label key={product.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
                      <Checkbox
                        checked={(formData.grading_product_ids || []).includes(product.id)}
                        onCheckedChange={() => {
                          const current = formData.grading_product_ids || [];
                          handleInputChange(
                            'grading_product_ids',
                            current.includes(product.id)
                              ? current.filter(id => id !== product.id)
                              : [...current, product.id]
                          );
                        }}
                      />
                      {product.name}
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">Belt levels auto-derive from selected products</p>
          </div>

          <div className="space-y-2">
            <Label>Belt Levels</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between" type="button">
                  <span className="truncate text-sm">
                    {(formData.belt_levels || []).length === 0
                      ? 'Select belt levels'
                      : (formData.belt_levels || []).length === 1
                        ? formData.belt_levels![0]
                        : `${formData.belt_levels!.length} belts selected`}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2 max-h-60 overflow-y-auto bg-popover border shadow-md z-50" align="start">
                <div className="space-y-1">
                  {BELT_LEVELS.map(belt => (
                    <label key={belt} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
                      <Checkbox
                        checked={(formData.belt_levels || []).includes(belt)}
                        onCheckedChange={() => toggleBeltLevel(belt)}
                      />
                      {belt}
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Age Range</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Min Age</span>
                <Input
                  type="number"
                  min="0"
                  max="99"
                  value={formData.min_age ?? ''}
                  onChange={e => handleInputChange('min_age', e.target.value !== '' ? parseInt(e.target.value) : undefined)}
                  placeholder="—"
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Max Age</span>
                <Input
                  type="number"
                  min="0"
                  max="99"
                  value={formData.max_age ?? ''}
                  onChange={e => handleInputChange('max_age', e.target.value !== '' ? parseInt(e.target.value) : undefined)}
                  placeholder="—"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Available to Branches</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between" type="button">
                  <span className="truncate text-sm">
                    {!formData.available_branch_ids || formData.available_branch_ids.length === 0
                      ? 'All branches'
                      : formData.available_branch_ids.length === 1
                        ? branches.find(b => b.id === formData.available_branch_ids![0])?.name ?? '1 branch'
                        : `${formData.available_branch_ids.length} branches selected`}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2 max-h-60 overflow-y-auto bg-popover border shadow-md z-50" align="start">
                <div className="space-y-1">
                  {branches.map(branch => (
                    <label key={branch.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
                      <Checkbox
                        checked={(formData.available_branch_ids || []).includes(branch.id)}
                        onCheckedChange={() => {
                          const current = formData.available_branch_ids || [];
                          handleInputChange(
                            'available_branch_ids',
                            current.includes(branch.id) ? current.filter(id => id !== branch.id) : [...current, branch.id]
                          );
                        }}
                      />
                      {branch.name}
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">Leave empty to allow all branches</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Keep backward compatible export
export default GradingSlotDialog;
export { GradingSlotDialog };
