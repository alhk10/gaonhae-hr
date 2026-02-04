import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
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
import { Loader2, Plus, Trash2, Copy } from 'lucide-react';
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

interface TimeSlot {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
}

interface ClassDetails {
  branch_id: string;
  class_type: string;
  age_from: number | null;
  age_to: number | null;
  belt_levels: string[];
  max_capacity: number | null;
  instructor_name: string | null;
  is_active: boolean;
}

interface ClassScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: Branch[];
  classSchedule?: ClassSchedule | null;
  defaultBranchId?: string;
  onSave: (data: ClassScheduleInput | ClassScheduleInput[]) => Promise<void>;
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
  
  const [classDetails, setClassDetails] = useState<ClassDetails>({
    branch_id: '',
    class_type: 'Little Gaonhae',
    age_from: null,
    age_to: null,
    belt_levels: [],
    max_capacity: null,
    instructor_name: null,
    is_active: true,
  });

  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([
    { id: uuidv4(), weekday: 1, start_time: '09:00', end_time: '10:00' }
  ]);

  const isEditing = !!classSchedule;

  useEffect(() => {
    if (classSchedule) {
      // Edit mode: load existing class data
      setClassDetails({
        branch_id: classSchedule.branch_id,
        class_type: classSchedule.class_type,
        age_from: classSchedule.age_from,
        age_to: classSchedule.age_to,
        belt_levels: classSchedule.belt_levels || [],
        max_capacity: classSchedule.max_capacity,
        instructor_name: classSchedule.instructor_name,
        is_active: classSchedule.is_active,
      });
      setTimeSlots([{
        id: uuidv4(),
        weekday: classSchedule.weekday,
        start_time: classSchedule.start_time,
        end_time: classSchedule.end_time,
      }]);
    } else {
      // Add mode: reset to defaults
      setClassDetails({
        branch_id: defaultBranchId || branches[0]?.id || '',
        class_type: 'Little Gaonhae',
        age_from: null,
        age_to: null,
        belt_levels: [],
        max_capacity: null,
        instructor_name: null,
        is_active: true,
      });
      setTimeSlots([
        { id: uuidv4(), weekday: 1, start_time: '09:00', end_time: '10:00' }
      ]);
    }
  }, [classSchedule, defaultBranchId, branches, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEditing) {
        // Edit mode: update single record
        const slot = timeSlots[0];
        await onSave({
          ...classDetails,
          weekday: slot.weekday,
          start_time: slot.start_time,
          end_time: slot.end_time,
          belt_range_min: null,
          belt_range_max: null,
        });
      } else {
        // Add mode: create multiple records
        const inputs: ClassScheduleInput[] = timeSlots.map(slot => ({
          ...classDetails,
          weekday: slot.weekday,
          start_time: slot.start_time,
          end_time: slot.end_time,
          belt_range_min: null,
          belt_range_max: null,
        }));
        await onSave(inputs);
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleBeltToggle = (belt: string, checked: boolean) => {
    const currentBelts = classDetails.belt_levels || [];
    if (checked) {
      setClassDetails({ ...classDetails, belt_levels: [...currentBelts, belt] });
    } else {
      setClassDetails({ ...classDetails, belt_levels: currentBelts.filter(b => b !== belt) });
    }
  };

  const addTimeSlot = () => {
    setTimeSlots([
      ...timeSlots,
      { id: uuidv4(), weekday: 1, start_time: '09:00', end_time: '10:00' }
    ]);
  };

  const removeTimeSlot = (id: string) => {
    if (timeSlots.length > 1) {
      setTimeSlots(timeSlots.filter(slot => slot.id !== id));
    }
  };

  const duplicateTimeSlot = (id: string) => {
    const slotToDuplicate = timeSlots.find(slot => slot.id === id);
    if (slotToDuplicate) {
      const newSlot: TimeSlot = {
        id: uuidv4(),
        weekday: slotToDuplicate.weekday,
        start_time: slotToDuplicate.start_time,
        end_time: slotToDuplicate.end_time,
      };
      const index = timeSlots.findIndex(slot => slot.id === id);
      const newSlots = [...timeSlots];
      newSlots.splice(index + 1, 0, newSlot);
      setTimeSlots(newSlots);
    }
  };

  const updateTimeSlot = (id: string, field: keyof Omit<TimeSlot, 'id'>, value: number | string) => {
    setTimeSlots(timeSlots.map(slot =>
      slot.id === id ? { ...slot, [field]: value } : slot
    ));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Class' : 'Add Class'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the class schedule details.'
              : 'Add a new class to the branch timetable. You can add multiple time slots for different days.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Branch Selection */}
          <div className="space-y-2">
            <Label htmlFor="branch">Branch *</Label>
            <Select
              value={classDetails.branch_id}
              onValueChange={(value) =>
                setClassDetails({ ...classDetails, branch_id: value })
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

          {/* Class Type */}
          <div className="space-y-2">
            <Label htmlFor="class_type">Class Type *</Label>
            <Select
              value={classDetails.class_type}
              onValueChange={(value) =>
                setClassDetails({ ...classDetails, class_type: value })
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
                value={classDetails.age_from || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseFloat(e.target.value) : null;
                  const rounded = value !== null ? Math.round(value * 2) / 2 : null;
                  setClassDetails({ ...classDetails, age_from: rounded });
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
                value={classDetails.age_to || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseFloat(e.target.value) : null;
                  const rounded = value !== null ? Math.round(value * 2) / 2 : null;
                  setClassDetails({ ...classDetails, age_to: rounded });
                }}
                placeholder="e.g., 6.5"
              />
            </div>
          </div>

          {/* Belt Levels Multi-Select */}
          <div className="space-y-2">
            <Label>Belt Levels</Label>
            <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
              {BELT_LEVELS.map((belt) => (
                <div key={belt} className="flex items-center space-x-2">
                  <Checkbox
                    id={`belt-${belt}`}
                    checked={(classDetails.belt_levels || []).includes(belt)}
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
            {(classDetails.belt_levels || []).length > 0 && (
              <p className="text-xs text-muted-foreground">
                Selected: {(classDetails.belt_levels || []).join(', ')}
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
                value={classDetails.max_capacity || ''}
                onChange={(e) =>
                  setClassDetails({
                    ...classDetails,
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
                value={classDetails.instructor_name || ''}
                onChange={(e) =>
                  setClassDetails({
                    ...classDetails,
                    instructor_name: e.target.value || null,
                  })
                }
                placeholder="Instructor name"
              />
            </div>
          </div>

          {/* Schedule Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Schedule *</Label>
              {!isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTimeSlot}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Slot
                </Button>
              )}
            </div>
            
            <div className="space-y-2">
              {timeSlots.map((slot, index) => (
                <div
                  key={slot.id}
                  className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30"
                >
                  {/* Day */}
                  <Select
                    value={slot.weekday.toString()}
                    onValueChange={(value) =>
                      updateTimeSlot(slot.id, 'weekday', parseInt(value, 10))
                    }
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Day" />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKDAYS.map((day) => (
                        <SelectItem key={day.value} value={day.value.toString()}>
                          {day.short}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Start Time */}
                  <Input
                    type="time"
                    value={slot.start_time}
                    onChange={(e) =>
                      updateTimeSlot(slot.id, 'start_time', e.target.value)
                    }
                    className="w-[110px]"
                    required
                  />

                  <span className="text-muted-foreground">-</span>

                  {/* End Time */}
                  <Input
                    type="time"
                    value={slot.end_time}
                    onChange={(e) =>
                      updateTimeSlot(slot.id, 'end_time', e.target.value)
                    }
                    className="w-[110px]"
                    required
                  />

                  {/* Duplicate and Delete buttons (only show if not editing) */}
                  {!isEditing && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => duplicateTimeSlot(slot.id)}
                        title="Duplicate slot"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      {timeSlots.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeTimeSlot(slot.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
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
              checked={classDetails.is_active}
              onCheckedChange={(checked) =>
                setClassDetails({ ...classDetails, is_active: checked })
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
            <Button type="submit" disabled={saving || !classDetails.branch_id}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing 
                ? 'Update Class' 
                : timeSlots.length > 1 
                  ? `Add Class (${timeSlots.length} slots)` 
                  : 'Add Class'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
