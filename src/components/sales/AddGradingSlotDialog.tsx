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
    title: '',
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
      title: '',
      belt_levels: [],
      max_capacity: 20,
      notes: ''
    });
  };

  // Generate default title based on selected values
  const generateDefaultTitle = (branchId: string, date: string, time: string, belts: string[]) => {
    const branchName = branches.find(b => b.id === branchId)?.name || '';
    const dateStr = date ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
    const timeStr = time ? time.slice(0, 5) : '';
    const beltStr = belts.length > 0 ? belts.slice(0, 3).join(', ') + (belts.length > 3 ? '...' : '') : '';
    
    const parts = [branchName, dateStr, timeStr, beltStr].filter(Boolean);
    return parts.join(' - ');
  };

  const handleInputChange = (field: keyof CreateGradingSlotData, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-generate title when key fields change (if title hasn't been manually edited or is empty)
      if (['branch_id', 'grading_date', 'start_time', 'belt_levels'].includes(field)) {
        const newTitle = generateDefaultTitle(
          field === 'branch_id' ? value : updated.branch_id,
          field === 'grading_date' ? value : updated.grading_date,
          field === 'start_time' ? value : updated.start_time || '',
          field === 'belt_levels' ? value : updated.belt_levels || []
        );
        // Only update if title is empty or matches a previously generated pattern
        if (!prev.title || prev.title === generateDefaultTitle(prev.branch_id, prev.grading_date, prev.start_time || '', prev.belt_levels || [])) {
          updated.title = newTitle;
        }
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
            <Label htmlFor="title">Title</Label>
            <Input
              value={formData.title || ''}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Auto-generated from selections above"
            />
            <p className="text-xs text-muted-foreground">Auto-fills based on branch, date, time, and belt levels</p>
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
