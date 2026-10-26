/** Shared Edit Student dialog for /access (Students tab and student details window). */
import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Loader2, Search, Users, UserPlus, Merge, X, Plus, FilePlus } from 'lucide-react';
import InvoiceDialog from '@/components/sales/InvoiceDialog';
import { createAccessInvoice } from '@/services/invoiceService';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatDate, toISODate } from '@/utils/dateFormat';
import { formatCurrency } from '@/utils/currencyUtils';
import { useAuth } from '@/contexts/AuthContext';
import StatusBadge, { normalizeStatus } from './StatusBadge';
import {
  getPublicStudentDirectory,
  adminUpdateStudentBasic,
  getStudentContacts,
  setStudentEmployee,
  type PublicStudentDirectoryRow,
} from '@/services/studentDirectoryService';
import { getPublicBranches } from '@/services/gradingPaymentSubmissionService';
import { BELT_LEVELS_ARRAY } from '@/constants/beltLevels';
import { sortAccessStudents } from '@/utils/accessStudentSort';
import { Switch } from '@/components/ui/switch';
import { isBlockedEmail, BLOCKED_EMAIL_MESSAGE } from '@/utils/blockedEmails';
import AddStudentDialog from './AddStudentDialog';
import MergeStudentsDialog from './MergeStudentsDialog';
import StudentProfileDialog from './StudentProfileDialog';
import StudentNameButton from './StudentNameButton';

const BELT_OPTIONS = [...new Set(BELT_LEVELS_ARRAY)];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface EditProps { row: PublicStudentDirectoryRow | null; onClose: () => void; }
export const StudentEditDialog: React.FC<EditProps> = ({ row, onClose }) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const actor = user?.employeeId || user?.email || 'admin';
  const isAllBranch = (() => { try { return sessionStorage.getItem('guards_list_all_branch_v1') === '1'; } catch { return false; } })();
  const { data: branches = [] } = useQuery({ queryKey: ['public-branches'], queryFn: getPublicBranches, staleTime: 5 * 60 * 1000 });
  const [editRow, setEditRow] = useState<PublicStudentDirectoryRow | null>(null);
  const [editBelt, setEditBelt] = useState('');
  const [editBranch, setEditBranch] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editFirst, setEditFirst] = useState('');
  const [editLast, setEditLast] = useState('');
  const [editDay, setEditDay] = useState('');
  const [editMonth, setEditMonth] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAltEmails, setEditAltEmails] = useState<string[]>([]);
  const [editAltPhones, setEditAltPhones] = useState<string[]>([]);
  const [newAltEmail, setNewAltEmail] = useState('');
  const [newAltPhone, setNewAltPhone] = useState('');
  const [contactsLoading, setContactsLoading] = useState(false);
  // Only send the extra contacts back once we know what was stored, otherwise
  // an early save would wipe them.
  const [contactsLoaded, setContactsLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const years = useMemo(() => {
    const cy = new Date().getFullYear();
    const arr: number[] = [];
    for (let y = cy; y >= 1950; y--) arr.push(y);
    return arr;
  }, []);
  const daysInMonth = useMemo(() => {
    const m = editMonth === '' ? 0 : parseInt(editMonth);
    const y = editYear === '' ? 2000 : parseInt(editYear);
    return new Date(y, m + 1, 0).getDate();
  }, [editMonth, editYear]);
  const editDobIso = useMemo(() => {
    if (!editDay || editMonth === '' || !editYear) return null;
    const d = Math.min(parseInt(editDay), new Date(parseInt(editYear), parseInt(editMonth) + 1, 0).getDate());
    return toISODate(new Date(parseInt(editYear), parseInt(editMonth), d));
  }, [editDay, editMonth, editYear]);
  const [editEmployee, setEditEmployee] = useState(false);
  const openEdit = (r: PublicStudentDirectoryRow) => {
    setEditRow(r);
    setEditEmployee(!!r.is_employee);
    setEditBelt(r.current_belt || '');
    setEditBranch(r.branch_id || '');
    setEditStatus(r.status || 'active');
    setEditFirst(r.first_name || '');
    setEditLast(r.last_name || '');
    setEditEmail(r.email || '');
    setEditPhone(r.phone || '');
    setEditAltEmails([]);
    setEditAltPhones([]);
    setNewAltEmail('');
    setNewAltPhone('');
    if (r.date_of_birth) {
      const d = new Date(r.date_of_birth);
      setEditDay(String(d.getDate()));
      setEditMonth(String(d.getMonth()));
      setEditYear(String(d.getFullYear()));
    } else {
      setEditDay(''); setEditMonth(''); setEditYear('');
    }
    setContactsLoaded(false);
    setContactsLoading(true);
    getStudentContacts(r.id)
      .then((c) => {
        setEditAltEmails(c.alt_emails || []);
        setEditAltPhones(c.alt_phones || []);
        if (c.email) setEditEmail(c.email);
        if (c.phone) setEditPhone(c.phone);
        setContactsLoaded(true);
      })
      .catch(() => {
        toast.error('Could not load the extra emails and mobiles — they will be left unchanged.');
      })
      .finally(() => setContactsLoading(false));
  };

  const addAltEmail = () => {
    const v = newAltEmail.trim().toLowerCase();
    if (!v) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { toast.error('Enter a valid email'); return; }
    if (isBlockedEmail(v)) { toast.error(BLOCKED_EMAIL_MESSAGE); return; }
    if (editAltEmails.includes(v) || v === editEmail.trim().toLowerCase()) { toast.error('Email already added'); return; }
    setEditAltEmails((prev) => [...prev, v]);
    setNewAltEmail('');
  };

  const addAltPhone = () => {
    const v = newAltPhone.trim();
    if (!v) return;
    if (editAltPhones.includes(v) || v === editPhone.trim()) { toast.error('Mobile already added'); return; }
    setEditAltPhones((prev) => [...prev, v]);
    setNewAltPhone('');
  };

  const handleSave = async () => {
    if (!editRow) return;
    if (!editFirst.trim()) { toast.error('First name is required'); return; }
    const mainEmail = editEmail.trim().toLowerCase();
    if (mainEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mainEmail)) { toast.error('Enter a valid email'); return; }
    if (mainEmail && isBlockedEmail(mainEmail)) { toast.error(BLOCKED_EMAIL_MESSAGE); return; }
    setSaving(true);
    try {
      const beltChanged = editBelt !== (editRow.current_belt || '');
      await adminUpdateStudentBasic(
        editRow.id,
        {
          belt: beltChanged && editBelt ? editBelt : null,
          clearBelt: beltChanged && !editBelt,
          branchId: editBranch !== (editRow.branch_id || '') ? editBranch : null,
          status: editStatus !== editRow.status ? editStatus : null,
          firstName: editFirst.trim(),
          lastName: editLast.trim(),
          dateOfBirth: editDobIso,
          email: mainEmail || null,
          clearEmail: !mainEmail,
          phone: editPhone.trim() || null,
          clearPhone: !editPhone.trim(),
          // null = leave stored extra contacts untouched
          altEmails: contactsLoaded ? editAltEmails : null,
          altPhones: contactsLoaded ? editAltPhones : null,
        },
        actor,
      );
      if (isAllBranch && editEmployee !== !!editRow.is_employee) {
        await setStudentEmployee(editRow.id, editEmployee);
      }
      toast.success('Student updated');
      setEditRow(null); onClose();
      qc.invalidateQueries({ queryKey: ['public-student-directory'] });
      qc.invalidateQueries({ queryKey: ['public-student-profile'] });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update student');
    } finally {
      setSaving(false);
    }
  };

  React.useEffect(() => { if (row) openEdit(row); else setEditRow(null); }, [row?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
      {/* Edit dialog */}
      <Dialog open={!!editRow} onOpenChange={(o) => { if (!o) { setEditRow(null); onClose(); } }}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>
              {editRow?.name} — update details, belt, branch or status. Withdrawal requires superadmin approval and is not available here.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium">First name</label>
                <Input className="h-9" value={editFirst} onChange={(e) => setEditFirst(e.target.value.toUpperCase())} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Last name</label>
                <Input className="h-9" value={editLast} onChange={(e) => setEditLast(e.target.value.toUpperCase())} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Date of birth</label>
              <div className="grid grid-cols-3 gap-2">
                <Select value={editDay} onValueChange={setEditDay}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Day" /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                      <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={editMonth} onValueChange={setEditMonth}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Month" /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={m} value={String(i)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={editYear} onValueChange={setEditYear}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Year" /></SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {editDobIso && (
                <p className="text-[11px] text-muted-foreground">You selected: {formatDate(editDobIso)}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Email</label>
              <Input className="h-9" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Main email" />
              {editAltEmails.map((em) => (
                <div key={em} className="flex items-center gap-2 rounded border px-2 py-1 text-xs">
                  <span className="flex-1 truncate">{em}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${em}`}
                    onClick={() => setEditAltEmails((prev) => prev.filter((x) => x !== em))}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Input
                  className="h-8 text-xs"
                  value={newAltEmail}
                  onChange={(e) => setNewAltEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAltEmail(); } }}
                  placeholder="Add another email"
                />
                <Button type="button" variant="outline" size="sm" className="h-8" onClick={addAltEmail}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Mobile</label>
              <Input className="h-9" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Main mobile" />
              {editAltPhones.map((ph) => (
                <div key={ph} className="flex items-center gap-2 rounded border px-2 py-1 text-xs">
                  <span className="flex-1 truncate">{ph}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${ph}`}
                    onClick={() => setEditAltPhones((prev) => prev.filter((x) => x !== ph))}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Input
                  className="h-8 text-xs"
                  value={newAltPhone}
                  onChange={(e) => setNewAltPhone(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAltPhone(); } }}
                  placeholder="Add another mobile"
                />
                <Button type="button" variant="outline" size="sm" className="h-8" onClick={addAltPhone}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              {contactsLoading && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading saved contacts...
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Belt</label>
              <Select value={editBelt || '__none__'} onValueChange={(v) => setEditBelt(v === '__none__' ? '' : v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="No belt" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No belt</SelectItem>
                  {BELT_OPTIONS.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Branch</label>
              <Select value={editBranch} onValueChange={setEditBranch}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {(branches as any[]).map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Status</label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">active</SelectItem>
                  <SelectItem value="trial">trial</SelectItem>
                  <SelectItem value="inactive">inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isAllBranch && (
              <div className="flex items-center justify-between rounded-md border p-2">
                <div>
                  <label className="text-xs font-medium">Employee</label>
                  <p className="text-[11px] text-muted-foreground">Not counted as a student; listed last.</p>
                </div>
                <Switch checked={editEmployee} onCheckedChange={setEditEmployee} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditRow(null); onClose(); }} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || contactsLoading}>
              {(saving || contactsLoading) && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
};

export default StudentEditDialog;
