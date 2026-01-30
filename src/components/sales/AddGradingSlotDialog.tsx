/**
 * Add Grading Slot Dialog
 * Form for creating new grading examination slots
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { createGradingSlot, type CreateGradingSlotData } from '@/services/gradingService';
import { getProducts } from '@/services/productService';
import { Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface GradingProduct {
  id: string;
  name: string;
  min_belt_level: string | null;
  max_belt_level: string | null;
}

interface AddGradingSlotDialogProps {
  trigger: React.ReactNode;
  onSlotCreated?: () => void;
}

const AddGradingSlotDialog: React.FC<AddGradingSlotDialogProps> = ({ trigger, onSlotCreated }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Array<{id: string, name: string}>>([]);
  const [gradingProducts, setGradingProducts] = useState<GradingProduct[]>([]);
  
  const [formData, setFormData] = useState<CreateGradingSlotData>({
    branch_id: '',
    grading_date: '',
    start_time: '',
    end_time: '',
    location: '',
    examiner_name: '',
    belt_levels: [],
    max_capacity: 20,
    notes: ''
  });

  useEffect(() => {
    if (open) {
      loadBranches();
      loadGradingProducts();
    }
  }, [open]);

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
      // Fetch products that have belt level requirements (grading fees)
      const response = await getProducts(1, 100, 'active');
      const gradingProds = response.products.filter(p => 
        p.requires_belt_level === true
      ).map(p => ({
        id: p.id,
        name: p.name,
        min_belt_level: p.min_belt_level || null,
        max_belt_level: p.max_belt_level || null
      }));
      setGradingProducts(gradingProds);
    } catch (error) {
      console.error('Error loading grading products:', error);
    }
  };

  // Format belt transition display
  const formatBeltTransition = (product: GradingProduct) => {
    if (product.min_belt_level && product.max_belt_level) {
      return `${product.min_belt_level} >> ${product.max_belt_level}`;
    }
    return product.name;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.branch_id) {
      toast.error('Please select a branch');
      return;
    }

    if (!formData.grading_date) {
      toast.error('Please select a grading date');
      return;
    }

    if (!formData.belt_levels || formData.belt_levels.length === 0) {
      toast.error('Please select at least one belt level requirement');
      return;
    }

    setLoading(true);
    try {
      await createGradingSlot(formData);
      toast.success('Grading slot created successfully');
      setOpen(false);
      resetForm();
      onSlotCreated?.();
    } catch (error) {
      console.error('Error creating grading slot:', error);
      toast.error('Failed to create grading slot');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      branch_id: '',
      grading_date: '',
      start_time: '',
      end_time: '',
      location: '',
      examiner_name: '',
      belt_levels: [],
      max_capacity: 20,
      notes: ''
    });
  };

  const handleInputChange = (field: keyof CreateGradingSlotData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleBeltLevel = (productId: string) => {
    const currentBelts = formData.belt_levels || [];
    const newBelts = currentBelts.includes(productId)
      ? currentBelts.filter(b => b !== productId)
      : [...currentBelts, productId];
    handleInputChange('belt_levels', newBelts);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Grading Slot</DialogTitle>
          <DialogDescription>
            Create a new grading examination slot for students
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="branch_id">Branch *</Label>
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
              <Label htmlFor="end_time">End Time</Label>
              <Input
                type="time"
                value={formData.end_time || ''}
                onChange={(e) => handleInputChange('end_time', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              value={formData.location || ''}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="e.g., Main Hall, Studio A"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="examiner_name">Examiner</Label>
              <Input
                value={formData.examiner_name || ''}
                onChange={(e) => handleInputChange('examiner_name', e.target.value)}
                placeholder="Examiner name"
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
            <Label>Belt Level Requirements *</Label>
            {gradingProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No grading products found. Create products with belt level requirements first.
              </p>
            ) : (
              <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                {gradingProducts.map((product) => (
                  <div key={product.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={product.id}
                      checked={(formData.belt_levels || []).includes(product.id)}
                      onCheckedChange={() => toggleBeltLevel(product.id)}
                    />
                    <label
                      htmlFor={product.id}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {formatBeltTransition(product)}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              value={formData.notes || ''}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Slot
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddGradingSlotDialog;
