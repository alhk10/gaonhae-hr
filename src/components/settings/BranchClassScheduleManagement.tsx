import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
import { toast } from 'sonner';
import {
  Building2,
  Plus,
  Clock,
  Users,
  Edit,
  Trash2,
  Loader2,
  GraduationCap,
  Award,
  Copy,
} from 'lucide-react';
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
import { ClassScheduleDialog } from './ClassScheduleDialog';
import { supabase } from '@/integrations/supabase/client';
import { getClassTypeBadgeClasses } from '@/utils/classTypeColors';

interface Branch {
  id: string;
  name: string;
}

export function BranchClassScheduleManagement() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [classes, setClasses] = useState<ClassSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassSchedule | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<ClassSchedule | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load branches
      const { data: branchData } = await supabase
        .from('branches')
        .select('id, name')
        .order('name');
      setBranches(branchData || []);

      // Load all class schedules
      const classData = await getClassSchedules();
      setClasses(classData);
    } catch (error) {
      toast.error('Failed to load class schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleAddClass = (branchId?: string) => {
    setEditingClass(null);
    setSelectedBranchId(branchId);
    setDialogOpen(true);
  };

  const handleEditClass = (classSchedule: ClassSchedule) => {
    setEditingClass(classSchedule);
    setSelectedBranchId(classSchedule.branch_id);
    setDialogOpen(true);
  };

  const handleDeleteClass = (classSchedule: ClassSchedule) => {
    setClassToDelete(classSchedule);
    setDeleteDialogOpen(true);
  };

  const handleDuplicateClass = async (classSchedule: ClassSchedule) => {
    setDuplicating(classSchedule.id);
    try {
      await createClassSchedule({
        branch_id: classSchedule.branch_id,
        weekday: classSchedule.weekday,
        start_time: classSchedule.start_time,
        end_time: classSchedule.end_time,
        class_type: classSchedule.class_type,
        age_group: classSchedule.age_group,
        age_from: classSchedule.age_from,
        age_to: classSchedule.age_to,
        belt_levels: classSchedule.belt_levels,
        belt_range_min: classSchedule.belt_range_min,
        belt_range_max: classSchedule.belt_range_max,
        max_capacity: classSchedule.max_capacity,
        instructor_name: classSchedule.instructor_name,
        is_active: classSchedule.is_active,
      });
      toast.success('Class duplicated successfully');
      loadData();
    } catch (error) {
      toast.error('Failed to duplicate class');
    } finally {
      setDuplicating(null);
    }
  };

  const confirmDelete = async () => {
    if (!classToDelete) return;
    setDeleting(true);
    try {
      await deleteClassSchedule(classToDelete.id);
      toast.success('Class deleted successfully');
      loadData();
    } catch (error) {
      toast.error('Failed to delete class');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setClassToDelete(null);
    }
  };

  const handleSaveClass = async (data: ClassScheduleInput | ClassScheduleInput[]) => {
    try {
      if (editingClass) {
        // Edit mode: single record update
        const singleData = Array.isArray(data) ? data[0] : data;
        await updateClassSchedule(editingClass.id, singleData);
        toast.success('Class updated successfully');
      } else {
        // Add mode: may be single or multiple records
        const dataArray = Array.isArray(data) ? data : [data];
        for (const item of dataArray) {
          await createClassSchedule(item);
        }
        toast.success(
          dataArray.length > 1 
            ? `${dataArray.length} class slots added successfully` 
            : 'Class added successfully'
        );
      }
      loadData();
    } catch (error) {
      toast.error('Failed to save class');
      throw error;
    }
  };

  const getClassesForBranch = (branchId: string): ClassSchedule[] => {
    return classes.filter((c) => c.branch_id === branchId);
  };

  const getClassCount = (branchId: string): number => {
    return getClassesForBranch(branchId).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <GraduationCap className="w-5 h-5" />
          <p className="text-sm">
            Configure class schedules for each branch with timing, age groups, and
            belt levels.
          </p>
        </div>
        <Button onClick={() => handleAddClass()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Class
        </Button>
      </div>

      <Accordion type="multiple" className="space-y-3">
        {branches.map((branch) => {
          const branchClasses = getClassesForBranch(branch.id);
          return (
            <AccordionItem
              key={branch.id}
              value={branch.id}
              className="border rounded-lg bg-card"
            >
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium">{branch.name}</span>
                  <Badge variant="secondary">
                    {getClassCount(branch.id)} classes
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4">
                  {/* Add class button for this branch */}
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddClass(branch.id)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Class to {branch.name}
                    </Button>
                  </div>

                  {/* Classes grouped by day */}
                  {branchClasses.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>No classes scheduled for this branch.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {WEEKDAYS.map((day) => {
                        const dayClasses = getClassesByDay(
                          branchClasses,
                          day.value
                        );
                        if (dayClasses.length === 0) return null;

                        return (
                          <div key={day.value}>
                            <h4 className="font-medium text-sm mb-2 text-muted-foreground">
                              {day.label}
                            </h4>
                            <div className="space-y-2">
                              {dayClasses.map((cls) => (
                                <ClassCard
                                  key={cls.id}
                                  classSchedule={cls}
                                  onEdit={() => handleEditClass(cls)}
                                  onDelete={() => handleDeleteClass(cls)}
                                  onDuplicate={() => handleDuplicateClass(cls)}
                                  isDuplicating={duplicating === cls.id}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {branches.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No branches found.</p>
            <p className="text-sm">Add branches in the Branches tab first.</p>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <ClassScheduleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        branches={branches}
        classSchedule={editingClass}
        defaultBranchId={selectedBranchId}
        onSave={handleSaveClass}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Class</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this class? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Class Card Component
function ClassCard({
  classSchedule,
  onEdit,
  onDelete,
  onDuplicate,
  isDuplicating,
}: {
  classSchedule: ClassSchedule;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  isDuplicating?: boolean;
}) {
  const getAgeRange = () => {
    if (classSchedule.age_from && classSchedule.age_to) {
      if (classSchedule.age_from === classSchedule.age_to) {
        return `Age ${classSchedule.age_from}`;
      }
      return `Ages ${classSchedule.age_from}-${classSchedule.age_to}`;
    }
    if (classSchedule.age_from) return `Ages ${classSchedule.age_from}+`;
    if (classSchedule.age_to) return `Up to age ${classSchedule.age_to}`;
    return null;
  };

  const getBeltLevels = () => {
    if (classSchedule.belt_levels && classSchedule.belt_levels.length > 0) {
      if (classSchedule.belt_levels.length <= 3) {
        return classSchedule.belt_levels.join(', ');
      }
      return `${classSchedule.belt_levels.length} belt levels`;
    }
    return null;
  };

  const ageRange = getAgeRange();
  const beltLevels = getBeltLevels();

  return (
    <div
      className={`flex items-start justify-between p-3 rounded-lg border ${
        classSchedule.is_active
          ? 'bg-card'
          : 'bg-muted/50 opacity-60'
      }`}
    >
      <div className="space-y-1 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-muted-foreground" />
            {formatTime(classSchedule.start_time)} -{' '}
            {formatTime(classSchedule.end_time)}
          </span>
          <Badge variant="outline" className={getClassTypeBadgeClasses(classSchedule.class_type)}>{classSchedule.class_type}</Badge>
          {!classSchedule.is_active && (
            <Badge variant="secondary">Inactive</Badge>
          )}
        </div>

        <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
          {ageRange && (
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {ageRange}
            </span>
          )}
          {beltLevels && (
            <span className="flex items-center gap-1">
              <Award className="w-3.5 h-3.5" />
              {beltLevels}
            </span>
          )}
          {classSchedule.max_capacity && (
            <span>Max: {classSchedule.max_capacity}</span>
          )}
          {classSchedule.instructor_name && (
            <span>Instructor: {classSchedule.instructor_name}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 ml-2">
        <Button variant="ghost" size="icon" onClick={onEdit}>
          <Edit className="w-4 h-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onDuplicate}
          disabled={isDuplicating}
          title="Duplicate class"
        >
          {isDuplicating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
