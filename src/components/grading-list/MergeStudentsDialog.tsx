/**
 * Merge Students dialog for the /access Students tab.
 * Scans for likely duplicates and submits a merge request for superadmin approval.
 */
import React, { useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { formatDate } from '@/utils/dateFormat';
import {
  findDuplicateStudentsPublic,
  requestStudentMerge,
  type PublicDuplicateGroup,
} from '@/services/studentDirectoryService';

const REASON_LABEL: Record<string, string> = {
  name: 'Same name',
  phone: 'Same mobile',
  email: 'Same email',
  dob_name: 'Same birth date + name',
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  actor: string;
}

const MergeStudentsDialog: React.FC<Props> = ({ open, onOpenChange, actor }) => {
  const [criteria, setCriteria] = useState({ name: true, phone: true, email: true, dob_name: true });
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<PublicDuplicateGroup[]>([]);
  const [keep, setKeep] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [busyGroup, setBusyGroup] = useState<string | null>(null);

  const scan = async () => {
    setLoading(true);
    try {
      const result = await findDuplicateStudentsPublic(criteria);
      setGroups(result);
      const sel: Record<string, string> = {};
      result.forEach((g) => { sel[g.group_key] = g.students[0]?.student_id; });
      setKeep(sel);
      setSubmitted({});
      toast.success(`Found ${result.length} possible duplicate group${result.length === 1 ? '' : 's'}`);
    } catch (e: any) {
      toast.error(e?.message || 'Scan failed');
    } finally {
      setLoading(false);
    }
  };

  const submit = async (g: PublicDuplicateGroup) => {
    const keepId = keep[g.group_key];
    if (!keepId) return;
    const dropIds = g.students.filter((s) => s.student_id !== keepId).map((s) => s.student_id);
    setBusyGroup(g.group_key);
    try {
      await requestStudentMerge(keepId, dropIds, actor, {
        match_reason: g.match_reason,
        students: g.students,
        keep_id: keepId,
      });
      setSubmitted((p) => ({ ...p, [g.group_key]: true }));
      toast.success('Merge request sent for superadmin approval');
    } catch (e: any) {
      toast.error(e?.message || 'Could not send the merge request');
    } finally {
      setBusyGroup(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[96vw] sm:max-w-4xl top-[4%] translate-y-0 max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Merge Students</DialogTitle>
          <DialogDescription className="text-xs">
            Choose which record to keep. Merging is done only after a superadmin approves, because it cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-3">
          {(['name', 'phone', 'email', 'dob_name'] as const).map((k) => (
            <label key={k} className="flex items-center gap-1.5 text-xs">
              <Checkbox
                checked={criteria[k]}
                onCheckedChange={(v) => setCriteria((c) => ({ ...c, [k]: !!v }))}
              />
              {REASON_LABEL[k]}
            </label>
          ))}
          <Button size="sm" className="ml-auto h-8" onClick={scan} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Search className="h-4 w-4 mr-1" />}
            Scan
          </Button>
        </div>

        {!loading && groups.length === 0 && (
          <div className="py-8 text-center text-xs text-muted-foreground">
            Click Scan to look for duplicate student records.
          </div>
        )}

        <div className="space-y-3">
          {groups.map((g) => {
            const keepId = keep[g.group_key];
            const done = submitted[g.group_key];
            return (
              <div key={g.group_key} className="rounded-md border p-2">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[11px]">{REASON_LABEL[g.match_reason]}</Badge>
                    <span className="text-[11px] text-muted-foreground">{g.students.length} records</span>
                  </div>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    variant={done ? 'outline' : 'destructive'}
                    disabled={!keepId || done || busyGroup === g.group_key}
                    onClick={() => submit(g)}
                  >
                    {busyGroup === g.group_key && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                    {done ? 'Awaiting approval' : 'Request merge'}
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead className="text-muted-foreground border-b">
                      <tr className="text-left">
                        <th className="py-1 pr-2">Keep</th>
                        <th className="py-1 pr-2">Name</th>
                        <th className="py-1 pr-2">Mobile</th>
                        <th className="py-1 pr-2">Email</th>
                        <th className="py-1 pr-2">DOB</th>
                        <th className="py-1 pr-2">Belt</th>
                        <th className="py-1 pr-2">Branch</th>
                        <th className="py-1 pr-2">Status</th>
                        <th className="py-1 pr-2">Last activity</th>
                        <th className="py-1 pr-2">Inv</th>
                        <th className="py-1 pr-2">Enr</th>
                        <th className="py-1 pr-2">Att</th>
                        <th className="py-1 pr-2">Grd</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.students.map((s) => {
                        const isKeep = keepId === s.student_id;
                        return (
                          <tr key={s.student_id} className={`border-b ${isKeep ? 'bg-primary/5' : ''}`}>
                            <td className="py-1 pr-2">
                              <input
                                type="radio"
                                name={`keep-${g.group_key}`}
                                checked={isKeep}
                                disabled={done}
                                onChange={() => setKeep((p) => ({ ...p, [g.group_key]: s.student_id }))}
                              />
                            </td>
                            <td className="py-1 pr-2 font-medium uppercase whitespace-nowrap">
                              {s.first_name} {s.last_name || ''}
                              <div className="text-[10px] text-muted-foreground normal-case">{s.student_number || ''}</div>
                            </td>
                            <td className="py-1 pr-2">{s.phone || '—'}</td>
                            <td className="py-1 pr-2 break-all">{s.email || '—'}</td>
                            <td className="py-1 pr-2">{s.date_of_birth ? formatDate(s.date_of_birth) : '—'}</td>
                            <td className="py-1 pr-2">{s.current_belt || '—'}</td>
                            <td className="py-1 pr-2">{s.branch_id || '—'}</td>
                            <td className="py-1 pr-2">{s.status || '—'}</td>
                            <td className="py-1 pr-2">{s.last_activity_at ? formatDate(s.last_activity_at) : '—'}</td>
                            <td className="py-1 pr-2">{s.invoices_count}</td>
                            <td className="py-1 pr-2">{s.enrollments_count}</td>
                            <td className="py-1 pr-2">{s.attendance_count}</td>
                            <td className="py-1 pr-2">{s.grading_count}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MergeStudentsDialog;
