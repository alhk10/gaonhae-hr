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
import { Loader2 } from 'lucide-react';

// Belt levels for multi-select
const BELT_LEVELS = [
  'Foundation 1', 'Foundation 2', 'Foundation 3',
  'White', 'Yellow Tip', 'Yellow', 'Green Tip', 'Green',
  'Blue Tip', 'Blue', 'Red Tip', 'Red', 'Black Tip',
  'Poom 1', 'Poom 2', 'Poom 3', 'Poom 4',
  'Dan 1', 'Dan 2', 'Dan 3', 'Dan 4', 'Dan 5'
];

interface AddGradingSlotDialogProps {
  trigger: React.ReactNode;
  onSlotCreated?: () => void;
}

const AddGradingSlotDialog: React.FC<AddGradingSlotDialogProps> = ({ trigger, onSlotCreated }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Array<{id: string, name: string}>>([]);
  
  const [formData, setFormData] = useState<CreateGradingSlotData>({
    branch_id: '',
    grading_date: '',
    start_time: '',
    location: '',
    belt_levels: [],
    max_capacity: 20,
    notes: ''
  });

  useEffect(() => {
    if (open) {
      loadBranches();
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
      location: '',
      belt_levels: [],
      max_capacity: 20,
      notes: ''
    });
  };

  const handleInputChange = (field: keyof CreateGradingSlotData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleBeltLevel = (belt: string) => {
    const currentBelts = formData.belt_levels || [];
    const newBelts = currentBelts.includes(belt)
      ? currentBelts.filter(b => b !== belt)
      : [...currentBelts, belt];
    handleInputChange('belt_levels', newBelts);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
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
            <Label htmlFor="location">Location</Label>
            <Input
              value={formData.location || ''}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="e.g., Main Hall, Studio A"
            />
          </div>

          <div className="space-y-2">
            <Label>Belt Levels</Label>
            <div className="flex flex-wrap gap-2">
              {BELT_LEVELS.map((belt) => (
                <Button
                  key={belt}
                  type="button"
                  variant={(formData.belt_levels || []).includes(belt) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleBeltLevel(belt)}
                >
                  {belt}
                </Button>
              ))}
            </div>
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
