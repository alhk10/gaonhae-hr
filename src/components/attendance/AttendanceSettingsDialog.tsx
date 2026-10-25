import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/dateFormat';
import { WEEKDAY_OPTIONS } from '@/utils/attendanceWeek';
import {
  getAttendanceSettings, saveClassType, saveTerm, saveTermBreak, saveTimetableSlot,
  type AttendanceTerm, type TimetableSlot,
} from '@/services/lessonBookingService';
import DateField from './DateField';

interface Props { open: boolean; onOpenChange: (o: boolean) => void; branchId: string }

type SlotForm = {
  id?: string; weekday: string; start_time: string; end_time: string; class_type: string;
  age_from: string; age_to: string; belt_levels: string; max_capacity: string; instructor_name: string; is_active: boolean;
};
const emptySlot: SlotForm = { weekday: '1', start_time: '', end_time: '', class_type: '', age_from: '', age_to: '', belt_levels: '', max_capacity: '20', instructor_name: '', is_active: true };
const toForm = (s: TimetableSlot): SlotForm => ({
  id: s.id, weekday: String(s.weekday), start_time: s.start_time?.slice(0, 5) || '', end_time: s.end_time?.slice(0, 5) || '',
  class_type: s.class_type || '', age_from: s.age_from?.toString() ?? '', age_to: s.age_to?.toString() ?? '',
  belt_levels: (s.belt_levels || []).join(', '), max_capacity: s.max_capacity?.toString() ?? '', instructor_name: s.instructor_name || '', is_active: s.is_active,
});

type TermForm = { id?: string; name: string; start_date: string; end_date: string; is_active: boolean };

const AttendanceSettingsDialog: React.FC<Props> = ({ open, onOpenChange, branchId }) => {
  const qc = useQueryClient();
  const key = ['access-attendance-settings', branchId];
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => getAttendanceSettings(branchId), enabled: open });
  const reload = () => qc.invalidateQueries({ queryKey: key });
  const [saving, setSaving] = useState(false);

  const [slotForm, setSlotForm] = useState<SlotForm | null>(null);
  const [newClass, setNewClass] = useState('');
  const [classEdits, setClassEdits] = useState<Record<string, string>>({});
  const [termForm, setTermForm] = useState<TermForm | null>(null);
  const [breakForm, setBreakForm] = useState<Record<string, { name: string; start: string; end: string }>>({});

  const guard = async (fn: () => Promise<unknown>, ok: string) => {
    setSaving(true);
    try { await fn(); toast.success(ok); reload(); return true; }
    catch (e: any) { toast.error(e?.message || 'Could not save'); return false; }
    finally { setSaving(false); }
  };

  const classTypes = (data?.class_types || []).filter((c) => c.is_active);

  const saveSlot = async () => {
    if (!slotForm) return;
    const f = slotForm;
    if (!/^\d{2}:\d{2}$/.test(f.start_time) || !/^\d{2}:\d{2}$/.test(f.end_time)) { toast.error('Enter start and end time as HH:MM'); return; }
    const ok = await guard(() => saveTimetableSlot({
      id: f.id, branch_id: branchId, weekday: Number(f.weekday), start_time: f.start_time, end_time: f.end_time,
      class_type: f.class_type || null, age_from: f.age_from === '' ? null : Number(f.age_from), age_to: f.age_to === '' ? null : Number(f.age_to),
      belt_levels: f.belt_levels.split(',').map((b) => b.trim()).filter(Boolean),
      max_capacity: f.max_capacity === '' ? null : Number(f.max_capacity), instructor_name: f.instructor_name || null, is_active: f.is_active,
    } as any), 'Timeslot saved');
    if (ok) setSlotForm(null);
  };

  const saveTermForm = async () => {
    if (!termForm) return;
    const ok = await guard(() => saveTerm({ ...termForm, branch_id: branchId } as any), 'Term saved');
    if (ok) setTermForm(null);
  };

  const slotsByDay = WEEKDAY_OPTIONS.map((d) => ({ ...d, slots: (data?.slots || []).filter((s) => s.weekday === d.value) }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[5%] max-h-[90vh] max-w-2xl translate-y-0 overflow-y-auto">
        <DialogHeader><DialogTitle>Attendance settings</DialogTitle></DialogHeader>
        {isLoading ? <p className="text-xs text-muted-foreground">Loading…</p> : (
          <Tabs defaultValue="timetable">
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
              <TabsTrigger value="timetable">Timetable</TabsTrigger>
              <TabsTrigger value="classes">Classes</TabsTrigger>
              <TabsTrigger value="terms">Terms</TabsTrigger>
            </TabsList>

            {/* Timetable */}
            <TabsContent value="timetable" className="space-y-3">
              {!slotForm && (
                <Button size="sm" className="h-8 text-xs" onClick={() => setSlotForm({ ...emptySlot })}><Plus className="mr-1 h-3.5 w-3.5" />Add timeslot</Button>
              )}
              {slotForm && (
                <div className="space-y-2 rounded-md border p-2">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div><Label className="text-xs">Day</Label>
                      <Select value={slotForm.weekday} onValueChange={(v) => setSlotForm({ ...slotForm, weekday: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{WEEKDAY_OPTIONS.map((d) => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-xs">Start (HH:MM)</Label><Input className="h-8 text-xs" placeholder="16:00" value={slotForm.start_time} onChange={(e) => setSlotForm({ ...slotForm, start_time: e.target.value })} /></div>
                    <div><Label className="text-xs">End (HH:MM)</Label><Input className="h-8 text-xs" placeholder="17:00" value={slotForm.end_time} onChange={(e) => setSlotForm({ ...slotForm, end_time: e.target.value })} /></div>
                    <div><Label className="text-xs">Capacity</Label><Input className="h-8 text-xs" inputMode="numeric" value={slotForm.max_capacity} onChange={(e) => setSlotForm({ ...slotForm, max_capacity: e.target.value.replace(/\D/g, '') })} /></div>
                    <div className="col-span-2"><Label className="text-xs">Class</Label>
                      <Select value={slotForm.class_type || '__none__'} onValueChange={(v) => setSlotForm({ ...slotForm, class_type: v === '__none__' ? '' : v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select class" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">—</SelectItem>
                          {classTypes.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                          {slotForm.class_type && !classTypes.some((c) => c.name === slotForm.class_type) && (
                            <SelectItem value={slotForm.class_type}>{slotForm.class_type}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-xs">Age from</Label><Input className="h-8 text-xs" inputMode="decimal" value={slotForm.age_from} onChange={(e) => setSlotForm({ ...slotForm, age_from: e.target.value })} /></div>
                    <div><Label className="text-xs">Age to</Label><Input className="h-8 text-xs" inputMode="decimal" value={slotForm.age_to} onChange={(e) => setSlotForm({ ...slotForm, age_to: e.target.value })} /></div>
                    <div className="col-span-2"><Label className="text-xs">Belts (comma separated, blank = all)</Label><Input className="h-8 text-xs" value={slotForm.belt_levels} onChange={(e) => setSlotForm({ ...slotForm, belt_levels: e.target.value })} /></div>
                    <div className="col-span-2"><Label className="text-xs">Instructor</Label><Input className="h-8 text-xs" value={slotForm.instructor_name} onChange={(e) => setSlotForm({ ...slotForm, instructor_name: e.target.value })} /></div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-xs"><Switch checked={slotForm.is_active} onCheckedChange={(v) => setSlotForm({ ...slotForm, is_active: v })} />Active</label>
                    <span className="ml-auto flex gap-2">
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setSlotForm(null)}>Cancel</Button>
                      <Button size="sm" className="h-8 text-xs" disabled={saving} onClick={saveSlot}>Save timeslot</Button>
                    </span>
                  </div>
                </div>
              )}
              {slotsByDay.filter((d) => d.slots.length > 0).map((d) => (
                <div key={d.value} className="space-y-1">
                  <p className="text-xs font-semibold">{d.label}</p>
                  {d.slots.map((s) => (
                    <div key={s.id} className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 rounded border px-2 py-1 text-xs', !s.is_active && 'opacity-50')}>
                      <span className="font-medium">{s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}</span>
                      <span>{s.class_type || '—'}</span>
                      <span className="text-muted-foreground">Cap {s.max_capacity ?? '∞'}{(s.age_from != null || s.age_to != null) ? ` · Age ${s.age_from ?? '?'}–${s.age_to ?? '+'}` : ''}</span>
                      {!s.is_active && <Badge variant="outline" className="text-[10px]">Off</Badge>}
                      <span className="ml-auto flex items-center gap-1">
                        <Switch checked={s.is_active} disabled={saving}
                          onCheckedChange={(v) => guard(() => saveTimetableSlot({ ...s, is_active: v } as any), v ? 'Timeslot on' : 'Timeslot off')} />
                        <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Edit timeslot" onClick={() => setSlotForm(toForm(s))}><Pencil className="h-3.5 w-3.5" /></Button>
                      </span>
                    </div>
                  ))}
                </div>
              ))}
              {(data?.slots || []).length === 0 && <p className="text-xs text-muted-foreground">No timeslots yet.</p>}
            </TabsContent>

            {/* Classes */}
            <TabsContent value="classes" className="space-y-2">
              <div className="flex gap-2">
                <Input className="h-8 text-xs" placeholder="New class name (e.g. Little Gaonhae)" value={newClass} onChange={(e) => setNewClass(e.target.value)} />
                <Button size="sm" className="h-8 text-xs" disabled={saving || !newClass.trim()}
                  onClick={async () => { if (await guard(() => saveClassType(branchId, null, newClass), 'Class added')) setNewClass(''); }}>
                  <Plus className="mr-1 h-3.5 w-3.5" />Add
                </Button>
              </div>
              {(data?.class_types || []).map((c) => (
                <div key={c.id} className={cn('flex items-center gap-2 rounded border px-2 py-1', !c.is_active && 'opacity-50')}>
                  <Input className="h-7 text-xs" value={classEdits[c.id] ?? c.name} onChange={(e) => setClassEdits({ ...classEdits, [c.id]: e.target.value })} />
                  {classEdits[c.id] !== undefined && classEdits[c.id] !== c.name && (
                    <Button size="sm" className="h-7 text-xs" disabled={saving}
                      onClick={async () => { if (await guard(() => saveClassType(branchId, c.id, classEdits[c.id], c.is_active), 'Class renamed')) { const n = { ...classEdits }; delete n[c.id]; setClassEdits(n); } }}>
                      Save
                    </Button>
                  )}
                  <Switch checked={c.is_active} disabled={saving} onCheckedChange={(v) => guard(() => saveClassType(branchId, c.id, c.name, v), v ? 'Class on' : 'Class off')} />
                </div>
              ))}
              <p className="text-[11px] text-muted-foreground">Renaming a class does not change timeslots already using the old name.</p>
            </TabsContent>

            {/* Terms */}
            <TabsContent value="terms" className="space-y-3">
              {!termForm && (
                <Button size="sm" className="h-8 text-xs" onClick={() => setTermForm({ name: '', start_date: '', end_date: '', is_active: true })}><Plus className="mr-1 h-3.5 w-3.5" />Add term</Button>
              )}
              {termForm && (
                <div className="space-y-2 rounded-md border p-2">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div><Label className="text-xs">Term name</Label><Input className="h-8 text-xs" value={termForm.name} onChange={(e) => setTermForm({ ...termForm, name: e.target.value })} /></div>
                    <div><Label className="text-xs">Start date</Label><DateField value={termForm.start_date} onChange={(v) => setTermForm({ ...termForm, start_date: v })} /></div>
                    <div><Label className="text-xs">End date</Label><DateField value={termForm.end_date} onChange={(v) => setTermForm({ ...termForm, end_date: v })} /></div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-xs"><Switch checked={termForm.is_active} onCheckedChange={(v) => setTermForm({ ...termForm, is_active: v })} />Active</label>
                    <span className="ml-auto flex gap-2">
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setTermForm(null)}>Cancel</Button>
                      <Button size="sm" className="h-8 text-xs" disabled={saving} onClick={saveTermForm}>Save term</Button>
                    </span>
                  </div>
                </div>
              )}
              {(data?.terms || []).map((t: AttendanceTerm) => {
                const bf = breakForm[t.id];
                return (
                  <div key={t.id} className={cn('space-y-1 rounded border p-2 text-xs', !t.is_active && 'opacity-60')}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{t.name}</span>
                      <span>{formatDate(t.start_date)} – {formatDate(t.end_date)}</span>
                      {!t.is_active && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                      <Button size="icon" variant="ghost" className="ml-auto h-7 w-7" aria-label="Edit term"
                        onClick={() => setTermForm({ id: t.id, name: t.name, start_date: t.start_date, end_date: t.end_date, is_active: t.is_active })}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {t.breaks.map((b) => (
                      <div key={b.id} className="flex items-center gap-2 pl-2 text-muted-foreground">
                        <span>Break: {b.name} · {formatDate(b.start_date)} – {formatDate(b.end_date)}</span>
                        <Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Delete break" disabled={saving}
                          onClick={() => guard(() => saveTermBreak(t.id, b.id, b.name, b.start_date, b.end_date, true), 'Break removed')}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    {bf ? (
                      <div className="grid grid-cols-1 gap-1.5 pl-2 sm:grid-cols-4">
                        <Input className="h-8 text-xs" placeholder="Break name" value={bf.name} onChange={(e) => setBreakForm({ ...breakForm, [t.id]: { ...bf, name: e.target.value } })} />
                        <DateField value={bf.start} onChange={(v) => setBreakForm({ ...breakForm, [t.id]: { ...bf, start: v } })} placeholder="Start" />
                        <DateField value={bf.end} onChange={(v) => setBreakForm({ ...breakForm, [t.id]: { ...bf, end: v } })} placeholder="End" />
                        <span className="flex gap-1">
                          <Button size="sm" className="h-8 text-xs" disabled={saving}
                            onClick={async () => { if (await guard(() => saveTermBreak(t.id, null, bf.name, bf.start, bf.end), 'Break added')) { const n = { ...breakForm }; delete n[t.id]; setBreakForm(n); } }}>Save</Button>
                          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { const n = { ...breakForm }; delete n[t.id]; setBreakForm(n); }}>Cancel</Button>
                        </span>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setBreakForm({ ...breakForm, [t.id]: { name: '', start: '', end: '' } })}>
                        <Plus className="mr-1 h-3 w-3" />Add break
                      </Button>
                    )}
                  </div>
                );
              })}
              {(data?.terms || []).length === 0 && <p className="text-xs text-muted-foreground">No terms for this branch yet.</p>}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AttendanceSettingsDialog;
