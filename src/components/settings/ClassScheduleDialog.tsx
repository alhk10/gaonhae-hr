import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import {
  ClassSchedule,
  ClassScheduleInput,
  WEEKDAYS,
  CLASS_TYPES,
  BELT_LEVELS,
} from '@/services/branchTimetableService';

interface Branch {
  id: string;
  name: string;
}

interface ClassScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: Branch[];
  classSchedule?: ClassSchedule | null;
  defaultBranchId?: string;
  onSave: (data: ClassScheduleInput) => Promise<void>;
}

export function ClassScheduleDialog({
  open,
  onOpenChange,
  branches,
  classSchedule,
  defaultBranchId,
  onSave,
}: ClassScheduleDialogProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<ClassScheduleInput>({
    branch_id: '',
    weekday: 1,
    start_time: '09:00',
    end_time: '10:00',
    class_type: 'Little Gaonhae',
    age_from: null,
    age_to: null,
    belt_levels: [],
    belt_range_min: null,
    belt_range_max: null,
    max_capacity: null,
    instructor_name: null,
    is_active: true,
  });

  useEffect(() => {
    if (classSchedule) {
      setFormData({
        branch_id: classSchedule.branch_id,
        weekday: classSchedule.weekday,
        start_time: classSchedule.start_time,
        end_time: classSchedule.end_time,
        class_type: classSchedule.class_type,
        age_from: classSchedule.age_from,
        age_to: classSchedule.age_to,
        belt_levels: classSchedule.belt_levels || [],
        belt_range_min: classSchedule.belt_range_min,
        belt_range_max: classSchedule.belt_range_max,
        max_capacity: classSchedule.max_capacity,
        instructor_name: classSchedule.instructor_name,
        is_active: classSchedule.is_active,
      });
    } else {
      setFormData({
        branch_id: defaultBranchId || branches[0]?.id || '',
        weekday: 1,
        start_time: '09:00',
        end_time: '10:00',
        class_type: 'Little Gaonhae',
        age_from: null,
        age_to: null,
        belt_levels: [],
        belt_range_min: null,
        belt_range_max: null,
        max_capacity: null,
        instructor_name: null,
        is_active: true,
      });
    }
  }, [classSchedule, defaultBranchId, branches, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleBeltToggle = (belt: string, checked: boolean) => {
    const currentBelts = formData.belt_levels || [];
    if (checked) {
      setFormData({ ...formData, belt_levels: [...currentBelts, belt] });
    } else {
      setFormData({ ...formData, belt_levels: currentBelts.filter(b => b !== belt) });
    }
  };

  const isEditing = !!classSchedule;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Class' : 'Add Class'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the class schedule details.'
              : 'Add a new class to the branch timetable.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Branch Selection */}
          <div className="space-y-2">
            <Label htmlFor="branch">Branch *</Label>
            <Select
              value={formData.branch_id}
              onValueChange={(value) =>
                setFormData({ ...formData, branch_id: value })
              }
              disabled={isEditing}
            >
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

          {/* Day Selection */}
          <div className="space-y-2">
            <Label htmlFor="weekday">Day *</Label>
            <Select
              value={formData.weekday.toString()}
              onValueChange={(value) =>
                setFormData({ ...formData, weekday: parseInt(value, 10) })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {WEEKDAYS.map((day) => (
                  <SelectItem key={day.value} value={day.value.toString()}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time *</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) =>
                  setFormData({ ...formData, start_time: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">End Time *</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) =>
                  setFormData({ ...formData, end_time: e.target.value })
                }
                required
              />
            </div>
          </div>

          {/* Class Type */}
          <div className="space-y-2">
            <Label htmlFor="class_type">Class Type *</Label>
            <Select
              value={formData.class_type}
              onValueChange={(value) =>
                setFormData({ ...formData, class_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select class type" />
              </SelectTrigger>
              <SelectContent>
                {CLASS_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Age Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age_from">Age From</Label>
              <Input
                id="age_from"
                type="number"
                min="1"
                max="100"
                step="0.5"
                value={formData.age_from || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseFloat(e.target.value) : null;
                  const rounded = value !== null ? Math.round(value * 2) / 2 : null;
                  setFormData({ ...formData, age_from: rounded });
                }}
                placeholder="e.g., 4.5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="age_to">Age To</Label>
              <Input
                id="age_to"
                type="number"
                min="1"
                max="100"
                step="0.5"
                value={formData.age_to || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseFloat(e.target.value) : null;
                  const rounded = value !== null ? Math.round(value * 2) / 2 : null;
                  setFormData({
                    ...formData,
                    age_to: rounded,
                  });
                }}
                placeholder="e.g., 6.5"
              />
            </div>
          </div>

          {/* Belt Levels Multi-Select */}
          <div className="space-y-2">
            <Label>Belt Levels</Label>
            <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
              {BELT_LEVELS.map((belt) => (
                <div key={belt} className="flex items-center space-x-2">
                  <Checkbox
                    id={`belt-${belt}`}
                    checked={(formData.belt_levels || []).includes(belt)}
                    onCheckedChange={(checked) => handleBeltToggle(belt, !!checked)}
                  />
                  <label
                    htmlFor={`belt-${belt}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {belt}
                  </label>
                </div>
              ))}
            </div>
            {(formData.belt_levels || []).length > 0 && (
              <p className="text-xs text-muted-foreground">
                Selected: {(formData.belt_levels || []).join(', ')}
              </p>
            )}
          </div>

          {/* Capacity and Instructor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_capacity">Max Capacity</Label>
              <Input
                id="max_capacity"
                type="number"
                min="1"
                value={formData.max_capacity || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    max_capacity: e.target.value
                      ? parseInt(e.target.value, 10)
                      : null,
                  })
                }
                placeholder="e.g., 20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instructor">Instructor</Label>
              <Input
                id="instructor"
                value={formData.instructor_name || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    instructor_name: e.target.value || null,
                  })
                }
                placeholder="Instructor name"
              />
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label>Active</Label>
              <p className="text-sm text-muted-foreground">
                Show this class in the timetable
              </p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_active: checked })
              }
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !formData.branch_id}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Update Class' : 'Add Class'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}