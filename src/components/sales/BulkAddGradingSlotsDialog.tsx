/**
 * Bulk Add Grading Slots Dialog
 * Spreadsheet-style interface for creating multiple grading slots at once
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { createGradingSlot } from '@/services/gradingService';
import { BELT_LEVELS } from '@/constants/beltLevels';
import { Plus, Trash2, Copy, Loader2, ChevronDown } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { formatDate } from '@/utils/dateFormat';

interface Branch {
  id: string;
  name: string;
}

interface BulkRow {
  id: string;
  branch_id: string;
  grading_date: string;
  start_time: string;
  title: string;
  belt_levels: string[];
  max_capacity: number;
  min_age: string;
  max_age: string;
  available_branch_ids: string[];
  hasError?: boolean;
}

interface BulkAddGradingSlotsDialogProps {
  trigger: React.ReactNode;
  onSlotsSaved?: () => void;
}

const createEmptyRow = (): BulkRow => ({
  id: uuidv4(),
  branch_id: '',
  grading_date: '',
  start_time: '',
  title: '',
  belt_levels: [],
  max_capacity: 20,
  min_age: '',
  max_age: '',
  available_branch_ids: [],
});

const generateTitle = (branchName: string, date: string, time: string, belts: string[]): string => {
  const dateStr = date
    ? formatDate(date + 'T00:00:00')
    : '';
  const timeStr = time ? time.slice(0, 5) : '';
  const beltStr = belts.length > 0
    ? belts.slice(0, 3).join(', ') + (belts.length > 3 ? '...' : '')
    : '';
  return [branchName, dateStr, timeStr, beltStr].filter(Boolean).join(' - ');
};

const BeltLevelPopover: React.FC<{
  selected: string[];
  onChange: (belts: string[]) => void;
}> = ({ selected, onChange }) => {
  const toggle = (belt: string) => {
    onChange(selected.includes(belt) ? selected.filter(b => b !== belt) : [...selected, belt]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 w-full justify-between text-xs">
          <span className="truncate">
            {selected.length === 0 ? 'Select belts' : `${selected.length} belt${selected.length > 1 ? 's' : ''}`}
          </span>
          <ChevronDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2 max-h-72 overflow-y-auto" align="start">
        <div className="space-y-1">
          {BELT_LEVELS.map(belt => (
            <label key={belt} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted cursor-pointer text-sm">
              <Checkbox
                checked={selected.includes(belt)}
                onCheckedChange={() => toggle(belt)}
              />
              {belt}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

const BranchMultiSelectPopover: React.FC<{
  selected: string[];
  branches: Branch[];
  onChange: (ids: string[]) => void;
}> = ({ selected, branches, onChange }) => {
  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(b => b !== id) : [...selected, id]);
  };

  const label = selected.length === 0
    ? 'All branches'
    : selected.length === 1
      ? branches.find(b => b.id === selected[0])?.name ?? '1 branch'
      : `${selected.length} branches`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 w-full justify-between text-xs">
          <span className="truncate">{label}</span>
          <ChevronDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2 max-h-72 overflow-y-auto" align="start">
        <div className="space-y-1">
          {branches.map(branch => (
            <label key={branch.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted cursor-pointer text-sm">
              <Checkbox
                checked={selected.includes(branch.id)}
                onCheckedChange={() => toggle(branch.id)}
              />
              {branch.name}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

const BulkAddGradingSlotsDialog: React.FC<BulkAddGradingSlotsDialogProps> = ({ trigger, onSlotsSaved }) => {
  const [open, setOpen] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [rows, setRows] = useState<BulkRow[]>([createEmptyRow()]);
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState<{ current: number; total: number } | null>(null);

  useEffect(() => {
    if (open) {
      loadBranches();
      setRows([createEmptyRow()]);
      setSaveProgress(null);
    }
  }, [open]);

  const loadBranches = async () => {
    try {
      const { data } = await supabase.from('branches').select('id, name').order('name');
      setBranches(data?.filter(b => !['Competition', 'Headquarters'].includes(b.name)) || []);
    } catch (err) {
      console.error('Error loading branches:', err);
    }
  };

  const updateRow = (rowId: string, field: keyof BulkRow, value: any) => {
    setRows(prev => prev.map(row => {
      if (row.id !== rowId) return row;
      const updated = { ...row, [field]: value, hasError: false };
      // Auto-generate title when key fields change
      if (['branch_id', 'grading_date', 'start_time', 'belt_levels'].includes(field as string)) {
        const branchName = branches.find(b => b.id === (field === 'branch_id' ? value : updated.branch_id))?.name || '';
        updated.title = generateTitle(
          branchName,
          field === 'grading_date' ? value : updated.grading_date,
          field === 'start_time' ? value : updated.start_time,
          field === 'belt_levels' ? value : updated.belt_levels,
        );
      }
      return updated;
    }));
  };

  const addRow = () => setRows(prev => [...prev, createEmptyRow()]);

  const duplicateLastRow = () => {
    const last = rows[rows.length - 1];
    if (!last) return;
    setRows(prev => [...prev, { ...last, id: uuidv4(), hasError: false }]);
  };

  const removeRow = (rowId: string) => {
    setRows(prev => {
      if (prev.length === 1) return [createEmptyRow()];
      return prev.filter(r => r.id !== rowId);
    });
  };

  const handleSaveAll = async () => {
    // Validate
    const validated = rows.map(row => ({
      ...row,
      hasError: !row.branch_id || !row.grading_date,
    }));
    const invalid = validated.filter(r => r.hasError);
    if (invalid.length > 0) {
      setRows(validated);
      toast.error(`${invalid.length} row${invalid.length > 1 ? 's are' : ' is'} missing branch or date`);
      return;
    }

    setSaving(true);
    let saved = 0;
    const total = rows.length;
    setSaveProgress({ current: 0, total });

    try {
      for (const row of rows) {
        await createGradingSlot({
          branch_id: row.branch_id,
          grading_date: row.grading_date,
          start_time: row.start_time || undefined,
          title: row.title || undefined,
          belt_levels: row.belt_levels.length > 0 ? row.belt_levels : undefined,
          max_capacity: row.max_capacity,
          min_age: row.min_age !== '' ? parseInt(row.min_age) : undefined,
          max_age: row.max_age !== '' ? parseInt(row.max_age) : undefined,
          available_branch_ids: row.available_branch_ids.length > 0 ? row.available_branch_ids : undefined,
        });
        saved++;
        setSaveProgress({ current: saved, total });
      }
      toast.success(`${saved} grading slot${saved > 1 ? 's' : ''} created successfully`);
      setOpen(false);
      onSlotsSaved?.();
    } catch (error) {
      console.error('Error saving grading slots:', error);
      toast.error(`Failed after saving ${saved} of ${total} slots`);
    } finally {
      setSaving(false);
      setSaveProgress(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-6xl w-full">
        <DialogHeader>
          <DialogTitle>Add Grading Slots</DialogTitle>
          <DialogDescription>Add multiple grading slots at once. Fill in the rows below and click Save All.</DialogDescription>
        </DialogHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2 font-medium text-muted-foreground w-40">Branch *</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground w-36">Date *</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground w-28">Time</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Title (auto)</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground w-32">Belt Levels</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground w-40">Avail. to Branches</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground w-16">Min Age</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground w-16">Max Age</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground w-16">Cap</th>
                <th className="py-2 px-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={row.id}
                  className={`border-b last:border-0 ${row.hasError ? 'bg-destructive/5' : 'hover:bg-muted/30'}`}
                >
                  {/* Branch */}
                  <td className="py-1.5 px-2">
                    <Select value={row.branch_id} onValueChange={val => updateRow(row.id, 'branch_id', val)}>
                      <SelectTrigger className={`h-9 text-xs ${row.hasError && !row.branch_id ? 'border-destructive' : ''}`}>
                        <SelectValue placeholder="Branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map(b => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  {/* Date */}
                  <td className="py-1.5 px-2">
                    <Input
                      type="date"
                      value={row.grading_date}
                      onChange={e => updateRow(row.id, 'grading_date', e.target.value)}
                      className={`h-9 text-xs ${row.hasError && !row.grading_date ? 'border-destructive' : ''}`}
                    />
                  </td>
                  {/* Time */}
                  <td className="py-1.5 px-2">
                    <Input
                      type="time"
                      value={row.start_time}
                      onChange={e => updateRow(row.id, 'start_time', e.target.value)}
                      className="h-9 text-xs"
                    />
                  </td>
                  {/* Title */}
                  <td className="py-1.5 px-2">
                    <Input
                      value={row.title}
                      onChange={e => updateRow(row.id, 'title', e.target.value)}
                      placeholder="Auto-generated"
                      className="h-9 text-xs"
                    />
                  </td>
                  {/* Belt Levels */}
                  <td className="py-1.5 px-2">
                    <BeltLevelPopover
                      selected={row.belt_levels}
                      onChange={belts => updateRow(row.id, 'belt_levels', belts)}
                    />
                  </td>
                  {/* Available to Branches */}
                  <td className="py-1.5 px-2">
                    <BranchMultiSelectPopover
                      selected={row.available_branch_ids}
                      branches={branches}
                      onChange={ids => updateRow(row.id, 'available_branch_ids', ids)}
                    />
                  </td>
                  {/* Min Age */}
                  <td className="py-1.5 px-2">
                    <Input
                      type="number"
                      min="0"
                      max="99"
                      value={row.min_age}
                      onChange={e => updateRow(row.id, 'min_age', e.target.value)}
                      placeholder="—"
                      className="h-9 text-xs"
                    />
                  </td>
                  {/* Max Age */}
                  <td className="py-1.5 px-2">
                    <Input
                      type="number"
                      min="0"
                      max="99"
                      value={row.max_age}
                      onChange={e => updateRow(row.id, 'max_age', e.target.value)}
                      placeholder="—"
                      className="h-9 text-xs"
                    />
                  </td>
                  {/* Capacity */}
                  <td className="py-1.5 px-2">
                    <Input
                      type="number"
                      min="1"
                      value={row.max_capacity}
                      onChange={e => updateRow(row.id, 'max_capacity', parseInt(e.target.value) || 20)}
                      className="h-9 text-xs"
                    />
                  </td>
                  {/* Delete */}
                  <td className="py-1.5 px-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeRow(row.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addRow} disabled={saving}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Row
            </Button>
            <Button variant="outline" size="sm" onClick={duplicateLastRow} disabled={saving || rows.length === 0}>
              <Copy className="h-3.5 w-3.5 mr-1" />
              Duplicate Last
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {saveProgress && (
              <span className="text-sm text-muted-foreground">
                Saving {saveProgress.current} of {saveProgress.total}...
              </span>
            )}
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveAll} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Save All ({rows.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkAddGradingSlotsDialog;
