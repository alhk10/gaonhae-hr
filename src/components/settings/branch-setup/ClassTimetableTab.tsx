import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Award,
  Clock,
  Copy,
  Edit,
  Loader2,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  ClassSchedule,
  ClassScheduleInput,
  WEEKDAYS,
  getClassSchedules,
  createClassSchedule,
  updateClassSchedule,
  deleteClassSchedule,
  getClassesByDay,
  formatTime,
} from '@/services/branchTimetableService';
import { ClassScheduleDialog } from '../ClassScheduleDialog';
import { getClassTypeBadgeClasses } from '@/utils/classTypeColors';

interface Props {
  branchId: string;
  branchName: string;
}

export const ClassTimetableTab: React.FC<Props> = ({ branchId, branchName }) => {
  const [classes, setClasses] = useState<ClassSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassSchedule | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<ClassSchedule | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getClassSchedules(branchId);
      setClasses(data);
    } catch (e) {
      toast.error('Failed to load class schedule');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const handleSave = async (data: ClassScheduleInput | ClassScheduleInput[]) => {
    try {
      if (editingClass) {
        const single = Array.isArray(data) ? data[0] : data;
        await updateClassSchedule(editingClass.id, single);
        toast.success('Class updated');
      } else {
        const arr = Array.isArray(data) ? data : [data];
        for (const item of arr) await createClassSchedule({ ...item, branch_id: branchId });
        toast.success(arr.length > 1 ? `${arr.length} classes added` : 'Class added');
      }
      load();
    } catch (e: any) {
      toast.error(`Failed to save: ${e?.message || 'Unknown error'}`);
      throw e;
    }
  };

  const handleDuplicate = async (cls: ClassSchedule) => {
    setDuplicating(cls.id);
    try {
      await createClassSchedule({
        branch_id: cls.branch_id,
        weekday: cls.weekday,
        start_time: cls.start_time,
        end_time: cls.end_time,
        class_type: cls.class_type,
        age_group: cls.age_group,
        age_from: cls.age_from,
        age_to: cls.age_to,
        belt_levels: cls.belt_levels,
        belt_range_min: cls.belt_range_min,
        belt_range_max: cls.belt_range_max,
        max_capacity: cls.max_capacity,
        instructor_name: cls.instructor_name,
        is_active: cls.is_active,
      });
      toast.success('Class duplicated');
      load();
    } catch (e) {
      toast.error('Failed to duplicate');
    } finally {
      setDuplicating(null);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteClassSchedule(toDelete.id);
      toast.success('Class deleted');
      load();
    } catch (e) {
      toast.error('Failed to delete');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
      setToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {classes.length} class{classes.length === 1 ? '' : 'es'} configured
        </p>
        <Button onClick={() => { setEditingClass(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Class
        </Button>
      </div>

      {classes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg">
          <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>No classes scheduled.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {WEEKDAYS.map((day) => {
            const dayClasses = getClassesByDay(classes, day.value);
            if (dayClasses.length === 0) return null;
            return (
              <div key={day.value}>
                <h4 className="font-medium text-sm mb-2 text-muted-foreground">{day.label}</h4>
                <div className="space-y-2">
                  {dayClasses.map((cls) => (
                    <ClassRow
                      key={cls.id}
                      cls={cls}
                      onEdit={() => { setEditingClass(cls); setDialogOpen(true); }}
                      onDelete={() => { setToDelete(cls); setDeleteOpen(true); }}
                      onDuplicate={() => handleDuplicate(cls)}
                      isDuplicating={duplicating === cls.id}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ClassScheduleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        branches={[{ id: branchId, name: branchName }]}
        classSchedule={editingClass}
        defaultBranchId={branchId}
        onSave={handleSave}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Class</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

function ClassRow({
  cls,
  onEdit,
  onDelete,
  onDuplicate,
  isDuplicating,
}: {
  cls: ClassSchedule;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  isDuplicating: boolean;
}) {
  const ageRange = cls.age_from || cls.age_to
    ? `Ages ${cls.age_from ?? '?'}-${cls.age_to ?? '?'}`
    : null;
  const belts = cls.belt_levels && cls.belt_levels.length
    ? cls.belt_levels.length <= 3 ? cls.belt_levels.join(', ') : `${cls.belt_levels.length} belt levels`
    : null;
  return (
    <div className={`flex items-start justify-between p-3 rounded-lg border ${cls.is_active ? 'bg-card' : 'bg-muted/50 opacity-60'}`}>
      <div className="space-y-1 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-muted-foreground" />
            {formatTime(cls.start_time)} - {formatTime(cls.end_time)}
          </span>
          <Badge variant="outline" className={getClassTypeBadgeClasses(cls.class_type)}>{cls.class_type}</Badge>
          {!cls.is_active && <Badge variant="secondary">Inactive</Badge>}
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
          {ageRange && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{ageRange}</span>}
          {belts && <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5" />{belts}</span>}
          {cls.max_capacity && <span>Max: {cls.max_capacity}</span>}
          {cls.instructor_name && <span>Instructor: {cls.instructor_name}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 ml-2">
        <Button variant="ghost" size="icon" onClick={onEdit}><Edit className="w-4 h-4" /></Button>
        <Button variant="ghost" size="icon" onClick={onDuplicate} disabled={isDuplicating} title="Duplicate">
          {isDuplicating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive hover:text-destructive">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
