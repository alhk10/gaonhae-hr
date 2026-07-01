import React, { useState, useMemo } from 'react';
import { formatDate } from '@/utils/dateFormat';
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
import { Search, UserPlus, X, Check, Loader2, FileText, ChevronDown, ChevronUp, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  getSlotAttendance,
  getBranchStudentsForClass,
  getExcludedStudentsDiagnostics,
  recordAttendance,
  addStudentToSlot,
  removeStudentFromSlot,
  autoPopulateAttendanceFromSchedule,
  ClassAttendanceRecord,
  StudentForAttendance,
} from '@/services/classAttendanceService';
import {
  listPendingLessonRequestsForSlot,
  approveLessonRequestBooking,
  rejectLessonRequest,
} from '@/services/chatLessonRequestService';
import { CalendarClock } from 'lucide-react';

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
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  // Fetch invoices for expanded student
  const { data: studentInvoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['student-invoices-attendance', expandedStudentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, total_amount, status, issue_date, due_date')
        .eq('student_id', expandedStudentId!)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!expandedStudentId,
  });

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
    queryKey: ['branch-students-class', branchId, slot?.beltLevels, slot?.ageFrom, slot?.ageTo, slot?.classType],
    queryFn: () => getBranchStudentsForClass(
      branchId,
      slot?.beltLevels,
      slot?.ageFrom,
      slot?.ageTo,
      slot?.classType
    ),
    enabled: open && !!slot,
  });

  // Fetch diagnostics about excluded students (for debugging empty lists)
  const { data: diagnostics } = useQuery({
    queryKey: ['attendance-diagnostics', branchId, slot?.beltLevels, slot?.ageFrom, slot?.ageTo, slot?.classType],
    queryFn: () => getExcludedStudentsDiagnostics(
      branchId,
      slot?.beltLevels,
      slot?.ageFrom,
      slot?.ageTo,
      slot?.classType
    ),
    enabled: open && !!slot,
  });

  // Fetch pending /hello lesson requests targeting this exact slot
  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['pending-lesson-requests-slot', branchId, slot?.timetableId, slot?.date, slot?.startTime, slot?.endTime],
    queryFn: () => listPendingLessonRequestsForSlot(
      branchId, slot!.date, slot!.startTime, slot!.endTime, slot!.timetableId,
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

  const [approvingId, setApprovingId] = useState<string | null>(null);
  const handleApproveRequest = async (row: any) => {
    setApprovingId(row.id);
    try {
      await approveLessonRequestBooking(row, row.booking);
      toast.success(`${row.student_first_name || 'Student'} added to class`);
      queryClient.invalidateQueries({ queryKey: ['pending-lesson-requests-slot'] });
      queryClient.invalidateQueries({ queryKey: ['pending-lesson-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-lesson-requests-count'] });
      queryClient.invalidateQueries({ queryKey: ['slot-attendance', branchId, slot?.timetableId, slot?.date] });
    } catch (e: any) {
      toast.error(e.message || 'Failed to approve');
    } finally {
      setApprovingId(null);
    }
  };
  const handleRejectRequest = async (row: any) => {
    setApprovingId(row.id);
    try {
      await rejectLessonRequest(row.id, 'Rejected from slot dialog');
      toast.success('Request rejected');
      queryClient.invalidateQueries({ queryKey: ['pending-lesson-requests-slot'] });
      queryClient.invalidateQueries({ queryKey: ['pending-lesson-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-lesson-requests-count'] });
    } catch (e: any) {
      toast.error(e.message || 'Failed to reject');
    } finally {
      setApprovingId(null);
    }
  };

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

        {pendingRequests.length > 0 && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-2 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
              <CalendarClock className="h-3.5 w-3.5" />
              Pending /hello booking{pendingRequests.length === 1 ? '' : 's'} ({pendingRequests.length})
            </div>
            {pendingRequests.map((r: any) => {
              const name = `${r.student_first_name || ''} ${r.student_last_name || ''}`.trim().toUpperCase() || 'Student';
              return (
                <div key={`${r.id}-${r.booking.key}`} className="flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{r.contact_email || r.contact_phone || ''}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => handleApproveRequest(r)}
                      disabled={approvingId === r.id}
                    >
                      {approvingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 px-2 text-xs"
                      onClick={() => handleRejectRequest(r)}
                      disabled={approvingId === r.id}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}


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
                      const isExpanded = expandedStudentId === record.student_id;
                      
                      return (
                        <div key={record.id} className="rounded-lg border overflow-hidden">
                          <div
                            className={`flex items-center justify-between p-3 ${
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
                              <div
                                className="cursor-pointer select-none"
                                onClick={() => setExpandedStudentId(isExpanded ? null : record.student_id)}
                              >
                                <div className="flex items-center gap-1.5">
                                  <p className="font-medium">{record.student_name}</p>
                                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                  {record.current_belt && (
                                    <Badge variant="outline" className="text-xs">
                                      {record.current_belt}
                                    </Badge>
                                  )}
                                  {record.student_phone && (
                                    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                                      <Phone className="h-3 w-3" />
                                      {record.student_phone}
                                    </span>
                                  )}
                                </div>
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
                          {isExpanded && (
                            <div className="p-3 bg-muted/30 border-t space-y-1.5">
                              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                <FileText className="h-3.5 w-3.5" /> Recent Invoices
                              </p>
                              {invoicesLoading ? (
                                <Skeleton className="h-8 w-full" />
                              ) : studentInvoices.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No invoices found.</p>
                              ) : (
                                studentInvoices.map((inv) => (
                                  <div key={inv.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-background border">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-medium">{inv.invoice_number}</span>
                                      <span className="text-muted-foreground">{inv.issue_date ? formatDate(new Date(inv.issue_date)) : '-'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">${Number(inv.total_amount).toFixed(2)}</span>
                                      <Badge variant={
                                        inv.status === 'paid' || inv.status === 'verified' ? 'default' :
                                        inv.status === 'overdue' ? 'destructive' : 'secondary'
                                      } className="text-[10px] px-1.5 py-0">
                                        {inv.status}
                                      </Badge>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
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
                    ) : availableStudents.length === 0 && allStudents.length === 0 ? (
                      <div className="space-y-2">
                        <p>No eligible students found for this class.</p>
                        {diagnostics && diagnostics.excluded > 0 && (
                          <div className="text-xs text-left bg-muted/50 rounded p-3 space-y-1">
                            <p className="font-medium">Diagnostics: {diagnostics.total} active students, {diagnostics.excluded} excluded:</p>
                            {Object.entries(diagnostics.reasons).map(([reason, count]) => (
                              <p key={reason}>• {reason}: {count as number} student{(count as number) > 1 ? 's' : ''}</p>
                            ))}
                          </div>
                        )}
                      </div>
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
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            {student.current_belt && (
                              <Badge variant="outline" className="text-xs">
                                {student.current_belt}
                              </Badge>
                            )}
                            {student.phone && (
                              <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {student.phone}
                              </span>
                            )}
                          </div>
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
