import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
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
import { Loader2, Search, Users, AlertTriangle } from 'lucide-react';
import {
  findDuplicateStudentGroups,
  mergeStudents,
  type DuplicateCriteria,
  type DuplicateGroup,
} from '@/services/duplicateStudentService';
import { formatDate } from '@/utils/dateFormat';

const REASON_LABEL: Record<string, string> = {
  name: 'Same Name',
  phone: 'Same Phone',
  email: 'Same Email',
  dob_name: 'Same DOB + Name',
};

const DuplicateStudentsManager: React.FC = () => {
  const [criteria, setCriteria] = useState<DuplicateCriteria>({
    name: true,
    phone: true,
    email: true,
    dob_name: true,
  });
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [keepSelection, setKeepSelection] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<{ group: DuplicateGroup; keepId: string } | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [merging, setMerging] = useState(false);

  const scan = async () => {
    setLoading(true);
    try {
      const result = await findDuplicateStudentGroups(criteria);
      setGroups(result);
      const sel: Record<string, string> = {};
      result.forEach((g) => {
        sel[g.group_key] = g.students[0]?.id;
      });
      setKeepSelection(sel);
      toast.success(`Found ${result.length} duplicate group(s)`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to scan duplicates');
    } finally {
      setLoading(false);
    }
  };

  const runMerge = async () => {
    if (!confirm) return;
    if (confirmText !== 'MERGE') {
      toast.error('Type MERGE to confirm');
      return;
    }
    setMerging(true);
    try {
      const dropIds = confirm.group.students
        .filter((s) => s.id !== confirm.keepId)
        .map((s) => s.id);
      const counts = await mergeStudents(confirm.keepId, dropIds);
      const summary = Object.entries(counts)
        .filter(([, n]) => (n as number) > 0)
        .map(([k, n]) => `${k}: ${n}`)
        .join(', ');
      toast.success(`Merged. ${summary || 'No related records moved.'}`);
      setGroups((prev) => prev.filter((g) => g.group_key !== confirm.group.group_key));
      setConfirm(null);
      setConfirmText('');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Merge failed');
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Duplicate Students
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Detect student records that likely belong to the same person and merge them. The kept
            student receives all related invoices, payments, attendance, enrollments, grading and
            other records. This action cannot be undone.
          </div>
          <div className="flex flex-wrap gap-4 items-center">
            {(['name', 'phone', 'email', 'dob_name'] as const).map((k) => (
              <label key={k} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={criteria[k]}
                  onCheckedChange={(v) => setCriteria((c) => ({ ...c, [k]: !!v }))}
                />
                {REASON_LABEL[k]}
              </label>
            ))}
            <Button onClick={scan} disabled={loading} className="ml-auto">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Scan for duplicates
            </Button>
          </div>
        </CardContent>
      </Card>

      {groups.length === 0 && !loading && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No duplicate groups loaded. Click "Scan for duplicates" to start.
          </CardContent>
        </Card>
      )}

      {groups.map((g) => {
        const keepId = keepSelection[g.group_key];
        return (
          <Card key={g.group_key}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{REASON_LABEL[g.match_reason]}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {g.students.length} records
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={!keepId}
                  onClick={() => {
                    setConfirmText('');
                    setConfirm({ group: g, keepId });
                  }}
                >
                  Merge group
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground border-b">
                    <tr className="text-left">
                      <th className="py-1 pr-2">Keep</th>
                      <th className="py-1 pr-2">Name</th>
                      <th className="py-1 pr-2">Phone</th>
                      <th className="py-1 pr-2">Email</th>
                      <th className="py-1 pr-2">DOB</th>
                      <th className="py-1 pr-2">Belt</th>
                      <th className="py-1 pr-2">Branch</th>
                      <th className="py-1 pr-2">Status</th>
                      <th className="py-1 pr-2">Last Activity</th>
                      <th className="py-1 pr-2">Inv</th>
                      <th className="py-1 pr-2">Enr</th>
                      <th className="py-1 pr-2">Att</th>
                      <th className="py-1 pr-2">Grd</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.students.map((s, idx) => {
                      const isKeep = keepId === s.id;
                      return (
                        <tr
                          key={s.id}
                          className={`border-b ${isKeep ? 'bg-primary/5' : ''}`}
                        >
                          <td className="py-1 pr-2">
                            <input
                              type="radio"
                              name={`keep-${g.group_key}`}
                              checked={isKeep}
                              onChange={() =>
                                setKeepSelection((p) => ({ ...p, [g.group_key]: s.id }))
                              }
                            />
                          </td>
                          <td className="py-1 pr-2 font-medium uppercase">
                            {s.first_name} {s.last_name || ''}
                            {idx === 0 && (
                              <Badge variant="outline" className="ml-1 text-[10px]">
                                latest
                              </Badge>
                            )}
                            <div className="text-[10px] text-muted-foreground">{s.student_number}</div>
                          </td>
                          <td className="py-1 pr-2">{s.phone || '—'}</td>
                          <td className="py-1 pr-2">{s.email || '—'}</td>
                          <td className="py-1 pr-2">{s.date_of_birth ? formatDate(s.date_of_birth) : '—'}</td>
                          <td className="py-1 pr-2">{s.current_belt || '—'}</td>
                          <td className="py-1 pr-2">{s.branch_id || '—'}</td>
                          <td className="py-1 pr-2 capitalize">{s.status || '—'}</td>
                          <td className="py-1 pr-2">
                            {s.last_activity_at ? formatDate(s.last_activity_at) : '—'}
                          </td>
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
            </CardContent>
          </Card>
        );
      })}

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Merge
            </AlertDialogTitle>
            <AlertDialogDescription>
              All related records from {confirm ? confirm.group.students.length - 1 : 0} duplicate
              student(s) will be moved to the kept student. The duplicate student rows will be
              deleted. This cannot be undone. Type <strong>MERGE</strong> to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="MERGE"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={merging}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={merging || confirmText !== 'MERGE'}
              onClick={(e) => {
                e.preventDefault();
                runMerge();
              }}
            >
              {merging ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Merge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DuplicateStudentsManager;
