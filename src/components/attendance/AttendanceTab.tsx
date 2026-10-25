import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Settings, UserPlus, X, Check, Ban, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/dateFormat';
import { addDays, classColor, classColorTint, classColorVar, mondayOf, parseIsoDate, toIsoDate, visibleDays, WEEKDAY_LABELS } from '@/utils/attendanceWeek';
import { getAttendanceSettings } from '@/services/lessonBookingService';
import {
  addStudentToSlot, getAttendanceWeek, markBooking, removeBooking, reviewBookingRequest, searchAttendanceStudents,
  type LessonBooking, type TimetableSlot,
} from '@/services/lessonBookingService';
import AttendanceSettingsDialog from './AttendanceSettingsDialog';

interface Props {
  lockedBranchId?: string;
  branches: { id: string; name: string }[];
  canEdit: boolean;
}

const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : '');

const slotMeta = (s: TimetableSlot) => {
  const parts: string[] = [];
  if (s.class_type) parts.push(s.class_type);
  if (s.age_from != null || s.age_to != null) parts.push(`Age ${s.age_from ?? '?'}–${s.age_to ?? '+'}`);
  if (s.belt_levels && s.belt_levels.length > 0) parts.push(s.belt_levels.join(', '));
  if (s.instructor_name) parts.push(s.instructor_name);
  return parts.join(' · ');
};

const AddStudentButton: React.FC<{
  branchId: string; date: string; disabled?: boolean;
  onPick: (s: { id: string; name: string }) => void;
}> = ({ branchId, date, disabled, onPick }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: options = [], isFetching } = useQuery({
    queryKey: ['attendance-students', branchId, date, search],
    queryFn: () => searchAttendanceStudents(branchId, search, date),
    enabled: open,
    staleTime: 15_000,
  });
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="h-7 text-xs" disabled={disabled}>
          <UserPlus className="mr-1 h-3.5 w-3.5" /> Add student
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(92vw,22rem)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search student name" value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>{isFetching ? 'Searching…' : 'No students found'}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.id}
                  value={o.id}
                  onSelect={() => { setOpen(false); setSearch(''); onPick({ id: o.id, name: o.name }); }}
                  className="flex flex-wrap items-center justify-between gap-1 text-xs"
                >
                  <span className="font-medium">{o.name}</span>
                  <span className="text-muted-foreground">
                    {o.current_belt || 'No belt'} · {o.unlimited ? 'Unlimited' : `${o.available} lesson${o.available === 1 ? '' : 's'} left`}
                    {o.status === 'trial' ? ' · Trial' : ''}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const AttendanceTab: React.FC<Props> = ({ lockedBranchId, branches, canEdit }) => {
  const qc = useQueryClient();
  const [pickedBranch, setPickedBranch] = useState<string>('');
  const branchId = lockedBranchId || pickedBranch || branches[0]?.id || '';
  const [day, setDay] = useState<Date>(() => new Date());
  const monday = mondayOf(day);
  const weekStart = toIsoDate(monday);
  const dayIso = toIsoDate(day);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [limitPrompt, setLimitPrompt] = useState<null | { slot: TimetableSlot; date: string; student: { id: string; name: string }; remaining: number; pending: number }>(null);

  const queryKey = ['access-attendance-week', branchId, weekStart];
  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => getAttendanceWeek(branchId, weekStart),
    enabled: !!branchId,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['access-attendance-week', branchId] });

  const days = useMemo(() => {
    if (!data) return [];
    return visibleDays([dayIso], data.slots || [], (data.holidays || []).map((h) => h.date), data.breaks || []);
  }, [data, dayIso]);

  const { data: settings } = useQuery({
    queryKey: ['access-attendance-settings', branchId],
    queryFn: () => getAttendanceSettings(branchId),
    enabled: !!branchId,
  });
  const savedColors = useMemo(() => {
    const m: Record<string, string | null | undefined> = {};
    (settings?.class_types || []).forEach((c) => { m[c.name.trim().toLowerCase()] = c.color; });
    return m;
  }, [settings]);
  const colorOf = (name?: string | null) => classColor(name, savedColors[(name || '').trim().toLowerCase()]);
  const legend = useMemo(() => Array.from(new Set(days.flatMap((d) => d.slots.map((s) => s.class_type).filter(Boolean) as string[]))), [days]);

  const bookingsBySlot = useMemo(() => {
    const m: Record<string, LessonBooking[]> = {};
    (data?.bookings || []).forEach((b) => { (m[`${b.lesson_date}_${b.timetable_id}`] ||= []).push(b); });
    return m;
  }, [data]);

  const hiddenHolidays = (data?.holidays || []).filter((h) => h.date === dayIso);
  const inBreak = (data?.breaks || []).some((b) => dayIso >= b.start_date && dayIso <= b.end_date);
  const termLabel = (data?.terms || []).map((t) => t.name).join(', ');

  const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    try { await fn(); if (ok) toast.success(ok); refresh(); }
    catch (e: any) { toast.error(e?.message || 'Something went wrong'); }
    finally { setBusy(null); }
  };

  const doAdd = async (slot: TimetableSlot, date: string, student: { id: string; name: string }, force = false) => {
    setBusy(`add-${slot.id}-${date}`);
    try {
      const res = await addStudentToSlot(slot.id, date, student.id, force);
      if (!res.ok && res.limit_reached) {
        setLimitPrompt({ slot, date, student, remaining: res.remaining ?? 0, pending: res.pending ?? 0 });
        return;
      }
      toast.success(`${student.name} added`);
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Could not add student');
    } finally {
      setBusy(null);
    }
  };

  const today = toIsoDate(new Date());

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {!lockedBranchId && branches.length > 0 && (
          <Select value={branchId} onValueChange={setPickedBranch}>
            <SelectTrigger className="h-8 w-[12rem] text-xs"><SelectValue placeholder="Branch" /></SelectTrigger>
            <SelectContent>
              {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <div className="flex items-center gap-1">
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setDay(addDays(day, -1))} aria-label="Previous day">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setDay(new Date())}>Today</Button>
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setDay(addDays(day, 1))} aria-label="Next day">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <span className="text-xs font-medium">
          {WEEKDAY_LABELS[day.getDay()]} {formatDate(dayIso)}
          {termLabel && <span className="text-muted-foreground"> · {termLabel}</span>}
        </span>
        {canEdit && branchId && (
          <Button size="sm" variant="outline" className="ml-auto h-8 text-xs" onClick={() => setSettingsOpen(true)}>
            <Settings className="mr-1 h-3.5 w-3.5" /> Settings
          </Button>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{(error as Error).message}</p>}

      {(data?.requests || []).length > 0 && (
        <Card className="border-primary/40">
          <CardHeader className="px-3 py-2"><CardTitle className="text-sm">Requests from /hello ({data!.requests.length})</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 px-3 pb-3">
            {data!.requests.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded border px-2 py-1.5 text-xs">
                <span className="font-medium">{r.student_name}</span>
                <span>{WEEKDAY_LABELS[parseIsoDate(r.lesson_date).getDay()]} {formatDate(r.lesson_date)} · {hhmm(r.start_time)}–{hhmm(r.end_time)}{r.class_type ? ` · ${r.class_type}` : ''}</span>
                <Badge variant={r.cancel_requested ? 'destructive' : 'secondary'} className="text-[10px]">
                  {r.cancel_requested ? 'Cancel request' : 'Booking request'}
                </Badge>
                {r.notes && <span className="text-muted-foreground">“{r.notes}”</span>}
                <span className="ml-auto flex gap-1">
                  <Button size="sm" className="h-7 text-xs" disabled={!canEdit || busy === r.id}
                    onClick={() => run(r.id, () => reviewBookingRequest(r.id, true), r.cancel_requested ? 'Lesson cancelled' : 'Booking approved')}>
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" disabled={!canEdit || busy === r.id}
                    onClick={() => run(r.id, () => reviewBookingRequest(r.id, false), 'Request rejected')}>
                    Reject
                  </Button>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {legend.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
          {legend.map((n) => (
            <span key={n} className="flex items-center gap-1"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: classColorVar(colorOf(n)) }} />{n}</span>
          ))}
        </div>
      )}
      {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
      {!isLoading && data && days.length === 0 && (
        <Card><CardContent className="p-4 text-xs text-muted-foreground">
          No lessons {dayIso === today ? 'today' : 'on this day'}{hiddenHolidays.length > 0 ? ` (public holiday: ${hiddenHolidays.map((h) => h.name).join(', ')})` : inBreak ? ' (term break)' : ''}.
        </CardContent></Card>
      )}

      {days.map((day) => (
        <Card key={day.date} className={cn(day.date === today && 'border-primary')}>
          <CardHeader className="px-3 py-2">
            <CardTitle className="text-sm">
              {WEEKDAY_LABELS[parseIsoDate(day.date).getDay()]} {formatDate(day.date)}
              {day.date === today && <Badge className="ml-2 text-[10px]">Today</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-3 pb-3">
            {day.slots.map((slot) => {
              const list = (bookingsBySlot[`${day.date}_${slot.id}`] || []);
              const count = list.length;
              const full = slot.max_capacity != null && count >= slot.max_capacity;
              return (
                <div key={slot.id} className="rounded-md border border-l-4" style={{ borderLeftColor: classColorVar(colorOf(slot.class_type)) }}>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b px-2 py-1.5 text-xs" style={{ backgroundColor: classColorTint(colorOf(slot.class_type)) }}>
                    <span className="flex items-center gap-1 font-semibold"><Clock className="h-3.5 w-3.5" />{hhmm(slot.start_time)}–{hhmm(slot.end_time)}</span>
                    <span className="text-muted-foreground">{slotMeta(slot)}</span>
                    <Badge variant={full ? 'destructive' : 'outline'} className="text-[10px]">{count}/{slot.max_capacity ?? '∞'}</Badge>
                    {canEdit && (
                      <span className="ml-auto">
                        <AddStudentButton branchId={branchId} date={day.date} disabled={busy === `add-${slot.id}-${day.date}`}
                          onPick={(s) => doAdd(slot, day.date, s)} />
                      </span>
                    )}
                  </div>
                  {list.length === 0 ? (
                    <p className="px-2 py-1.5 text-xs text-muted-foreground">No students yet.</p>
                  ) : (
                    <ul className="divide-y">
                      {list.map((b) => (
                        <li key={b.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-2 py-1 text-xs">
                          <span className="min-w-0 font-medium">{b.student_name}</span>
                          <span className="text-muted-foreground">{b.current_belt || 'No belt'}</span>
                          {b.status === 'requested' && <Badge variant="secondary" className="text-[10px]">Requested</Badge>}
                          {b.cancel_requested && <Badge variant="destructive" className="text-[10px]">Cancel requested</Badge>}
                          {b.student_status === 'trial' && <Badge variant="outline" className="text-[10px]">Trial</Badge>}
                          <span className="ml-auto flex items-center gap-1">
                            {b.status !== 'requested' && (
                              <>
                                <Button size="sm" variant={b.status === 'attended' ? 'default' : 'outline'} className="h-7 px-2 text-xs"
                                  disabled={!canEdit || busy === b.id}
                                  onClick={() => run(b.id, () => markBooking(b.id, b.status === 'attended' ? 'booked' : 'attended'))}>
                                  <Check className="mr-1 h-3.5 w-3.5" />Attended
                                </Button>
                                <Button size="sm" variant={b.status === 'absent' ? 'destructive' : 'outline'} className="h-7 px-2 text-xs"
                                  disabled={!canEdit || busy === b.id}
                                  onClick={() => run(b.id, () => markBooking(b.id, b.status === 'absent' ? 'booked' : 'absent'))}>
                                  <Ban className="mr-1 h-3.5 w-3.5" />Absent
                                </Button>
                              </>
                            )}
                            {b.status === 'requested' && canEdit && (
                              <Button size="sm" className="h-7 px-2 text-xs" disabled={busy === b.id}
                                onClick={() => run(b.id, () => reviewBookingRequest(b.id, true), 'Booking approved')}>Approve</Button>
                            )}
                            {canEdit && (
                              <Button size="icon" variant="ghost" className="h-7 w-7" disabled={busy === b.id} aria-label="Remove from timeslot"
                                onClick={() => {
                                  if (!window.confirm(`Remove ${b.student_name} from this timeslot?`)) return;
                                  run(b.id, () => removeBooking(b.id), 'Removed');
                                }}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      <AlertDialog open={!!limitPrompt} onOpenChange={(o) => !o && setLimitPrompt(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Term lesson limit reached</AlertDialogTitle>
            <AlertDialogDescription>
              {limitPrompt?.student.name} has no paid lessons left this term
              ({limitPrompt?.remaining ?? 0} unused, {limitPrompt?.pending ?? 0} already booked). Add to this timeslot anyway?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              const p = limitPrompt; setLimitPrompt(null);
              if (p) doAdd(p.slot, p.date, p.student, true);
            }}>Add anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {settingsOpen && branchId && (
        <AttendanceSettingsDialog open={settingsOpen} onOpenChange={(o) => { setSettingsOpen(o); if (!o) refresh(); }} branchId={branchId} />
      )}
    </div>
  );
};

export default AttendanceTab;
