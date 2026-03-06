import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Search, UserPlus, X, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  getSlotAttendance,
  getBranchStudentsForClass,
  recordAttendance,
  addStudentToSlot,
  removeStudentFromSlot,
  autoPopulateAttendanceFromSchedule,
  ClassAttendanceRecord,
  StudentForAttendance,
} from '@/services/classAttendanceService';

interface SlotAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  slot: {
    timetableId: string;
    date: string; // YYYY-MM-DD
    startTime: string;
    endTime: string;
    classType: string;
    beltLevels?: string[];
    ageFrom?: number;
    ageTo?: number;
  } | null;
}

const SlotAttendanceDialog: React.FC<SlotAttendanceDialogProps> = ({
  open,
  onOpenChange,
  branchId,
  slot,
}) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingChanges, setPendingChanges] = useState<Record<string, 'present' | 'absent'>>({});

  // Fetch attendance records for this slot
  const { data: attendance = [], isLoading: attendanceLoading } = useQuery({
    queryKey: ['slot-attendance', branchId, slot?.timetableId, slot?.date],
    queryFn: async () => {
      // Auto-populate attendance from scheduled students first
      await autoPopulateAttendanceFromSchedule(branchId, slot!.timetableId, slot!.date);
      // Then fetch the attendance list
      return getSlotAttendance(branchId, slot!.timetableId, slot!.date);
    },
    enabled: open && !!slot,
  });

  // Fetch all branch students eligible for this class
  const { data: allStudents = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['branch-students-class', branchId, slot?.beltLevels, slot?.ageFrom, slot?.ageTo],
    queryFn: () => getBranchStudentsForClass(
      branchId,
      slot?.beltLevels,
      slot?.ageFrom,
      slot?.ageTo
    ),
    enabled: open && !!slot,
  });

  // Get students not yet in attendance
  const studentsInAttendance = useMemo(() => {
    return new Set(attendance.map(a => a.student_id));
  }, [attendance]);

  const availableStudents = useMemo(() => {
    return allStudents.filter(s => !studentsInAttendance.has(s.id));
  }, [allStudents, studentsInAttendance]);

  // Filter available students by search
  const filteredAvailableStudents = useMemo(() => {
    if (!searchQuery.trim()) return availableStudents;
    const query = searchQuery.toLowerCase();
    return availableStudents.filter(s =>
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(query) ||
      s.current_belt?.toLowerCase().includes(query)
    );
  }, [availableStudents, searchQuery]);

  // Add student mutation
  const addStudentMutation = useMutation({
    mutationFn: async (studentId: string) => {
      return addStudentToSlot(studentId, branchId, slot!.timetableId, slot!.date);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slot-attendance', branchId, slot?.timetableId, slot?.date] });
      toast.success('Student added to class');
    },
    onError: (error) => {
      toast.error('Failed to add student');
      console.error(error);
    },
  });

  // Remove student mutation
  const removeStudentMutation = useMutation({
    mutationFn: async (attendanceId: string) => {
      return removeStudentFromSlot(attendanceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slot-attendance', branchId, slot?.timetableId, slot?.date] });
      toast.success('Student removed from class');
    },
    onError: (error) => {
      toast.error('Failed to remove student');
      console.error(error);
    },
  });

  // Update attendance mutation
  const updateAttendanceMutation = useMutation({
    mutationFn: async ({ studentId, status }: { studentId: string; status: 'present' | 'absent' }) => {
      return recordAttendance(studentId, branchId, slot!.timetableId, slot!.date, status);
    },
    onSuccess: (_, variables) => {
      // Remove from pending changes after successful update
      setPendingChanges(prev => {
        const next = { ...prev };
        delete next[variables.studentId];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['slot-attendance', branchId, slot?.timetableId, slot?.date] });
    },
    onError: (error) => {
      toast.error('Failed to update attendance');
      console.error(error);
    },
  });

  const handleAttendanceChange = (record: ClassAttendanceRecord, checked: boolean) => {
    const newStatus = checked ? 'present' : 'absent';
    setPendingChanges(prev => ({ ...prev, [record.student_id]: newStatus }));
    updateAttendanceMutation.mutate({ studentId: record.student_id, status: newStatus });
  };

  const getEffectiveStatus = (record: ClassAttendanceRecord): 'present' | 'absent' => {
    return pendingChanges[record.student_id] || (record.status === 'present' ? 'present' : 'absent');
  };

  const formatTimeDisplay = (time: string): string => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const isLoading = attendanceLoading || studentsLoading;

  if (!slot) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex flex-col gap-1">
            <span className="text-lg">{slot.classType}</span>
            <span className="text-sm font-normal text-muted-foreground">
              {format(new Date(slot.date), 'EEEE, MMMM d, yyyy')} • {formatTimeDisplay(slot.startTime)}
            </span>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <Tabs defaultValue="attendance" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="attendance">
                Attendance ({attendance.length})
              </TabsTrigger>
              <TabsTrigger value="add">
                Add Students ({availableStudents.length})
              </TabsTrigger>
            </TabsList>

            {/* Attendance Tab */}
            <TabsContent value="attendance" className="flex-1 min-h-0 mt-4">
              <ScrollArea className="h-[400px] pr-4">
                {attendance.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No students in this class yet.</p>
                    <p className="text-sm mt-1">Use the "Add Students" tab to add students.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {attendance.map((record) => {
                      const effectiveStatus = getEffectiveStatus(record);
                      const isUpdating = pendingChanges[record.student_id] !== undefined;
                      
                      return (
                        <div
                          key={record.id}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            effectiveStatus === 'present'
                              ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
                              : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={effectiveStatus === 'present'}
                              onCheckedChange={(checked) => handleAttendanceChange(record, !!checked)}
                              disabled={isUpdating}
                              className="h-5 w-5"
                            />
                            <div>
                              <p className="font-medium">{record.student_name}</p>
                              {record.current_belt && (
                                <Badge variant="outline" className="text-xs mt-0.5">
                                  {record.current_belt}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                            <Badge
                              variant={effectiveStatus === 'present' ? 'default' : 'destructive'}
                              className="text-xs"
                            >
                              {effectiveStatus === 'present' ? (
                                <><Check className="h-3 w-3 mr-1" /> Present</>
                              ) : (
                                <><X className="h-3 w-3 mr-1" /> Absent</>
                              )}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => removeStudentMutation.mutate(record.id)}
                              disabled={removeStudentMutation.isPending}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Add Students Tab */}
            <TabsContent value="add" className="flex-1 min-h-0 mt-4 flex flex-col">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <ScrollArea className="h-[350px] pr-4">
                {filteredAvailableStudents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchQuery ? (
                      <p>No matching students found.</p>
                    ) : (
                      <p>All eligible students are already in this class.</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredAvailableStudents.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div>
                          <p className="font-medium">
                            {student.first_name} {student.last_name}
                          </p>
                          {student.current_belt && (
                            <Badge variant="outline" className="text-xs mt-0.5">
                              {student.current_belt}
                            </Badge>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => addStudentMutation.mutate(student.id)}
                          disabled={addStudentMutation.isPending}
                        >
                          <UserPlus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SlotAttendanceDialog;
