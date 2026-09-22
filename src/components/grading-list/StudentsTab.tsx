/**
 * Students tab embedded in /access.
 * Public searchable student directory with enrolment, payment and credit info.
 * Unlocked staff can edit belt, branch and status (withdrawal excluded).
 */
import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Loader2, Search, Users, UserPlus, Merge, X, Plus } from 'lucide-react';
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
import {
  getPublicStudentDirectory,
  adminUpdateStudentBasic,
  getStudentContacts,
  type PublicStudentDirectoryRow,
} from '@/services/studentDirectoryService';
import { getPublicBranches } from '@/services/gradingPaymentSubmissionService';
import { BELT_LEVELS_ARRAY } from '@/constants/beltLevels';
import { isBlockedEmail, BLOCKED_EMAIL_MESSAGE } from '@/utils/blockedEmails';
import AddStudentDialog from './AddStudentDialog';
import MergeStudentsDialog from './MergeStudentsDialog';
import StudentProfileDialog from './StudentProfileDialog';
import StudentNameButton from './StudentNameButton';

const BELT_OPTIONS = [...new Set(BELT_LEVELS_ARRAY)];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface Props {
  canEdit?: boolean;
}

const statusBadge = (s: string) => {
  switch ((s || '').toLowerCase()) {
    case 'active':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'trial':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'withdrawn':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

const invoiceBadge = (s: string | null) => {
  switch ((s || '').toLowerCase()) {
    case 'paid':
    case 'verified':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'partially paid':
    case 'partially_paid':
    case 'partial':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'unpaid':
    case 'overdue':
    case 'sent':
    case 'draft':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

const invoiceLabel = (s: string | null) => {
  if (!s) return 'No invoice';
  const v = s.toLowerCase();
  if (v === 'verified') return 'Paid & Verified';
  return v.charAt(0).toUpperCase() + v.slice(1);
};

const StudentsTab: React.FC<Props> = ({ canEdit }) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const actor = user?.employeeId || user?.email || 'admin';

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

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
  const [addOpen, setAddOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);

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

  // Debounce search input
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['public-student-directory', debouncedSearch, branchFilter, statusFilter],
    queryFn: () =>
      getPublicStudentDirectory({
        search: debouncedSearch,
        branchId: branchFilter === 'all' ? undefined : branchFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
      }),
    staleTime: 30 * 1000,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['public-branches'],
    queryFn: getPublicBranches,
    staleTime: 5 * 60 * 1000,
  });

  const openEdit = (r: PublicStudentDirectoryRow) => {
    setEditRow(r);
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
      toast.success('Student updated');
      setEditRow(null);
      qc.invalidateQueries({ queryKey: ['public-student-directory'] });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update student');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email..."
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-full sm:w-[180px] h-9">
            <SelectValue placeholder="All branches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All branches</SelectItem>
            {(branches as any[]).map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px] h-9">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">active</SelectItem>
            <SelectItem value="trial">trial</SelectItem>
            <SelectItem value="inactive">inactive</SelectItem>
            <SelectItem value="withdrawn">withdrawn</SelectItem>
          </SelectContent>
        </Select>
        {canEdit && (
          <div className="flex gap-2">
            <Button size="sm" className="h-9" onClick={() => setAddOpen(true)}>
              <UserPlus className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Add Student</span>
            </Button>
            <Button size="sm" variant="outline" className="h-9" onClick={() => setMergeOpen(true)}>
              <Merge className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Merge Students</span>
            </Button>
          </div>
        )}
      </div>

      <AddStudentDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        actor={actor}
        onCreated={() => qc.invalidateQueries({ queryKey: ['public-student-directory'] })}
      />
      <MergeStudentsDialog open={mergeOpen} onOpenChange={setMergeOpen} actor={actor} />

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading students...
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No students found</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Showing {rows.length} student{rows.length === 1 ? '' : 's'}{rows.length >= 200 ? ' (first 200 — refine your search)' : ''}
          </p>

          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Belt</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Enrolment</TableHead>
                  <TableHead>Term payment</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  {canEdit && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {r.student_number || ''}{r.date_of_birth ? `${r.student_number ? ' · ' : ''}DOB ${formatDate(r.date_of_birth)}` : ''}
                      </div>
                    </TableCell>
                    <TableCell>{r.current_belt || '—'}</TableCell>
                    <TableCell>{r.branch_name || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusBadge(r.status)}>{r.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">{r.email || '—'}</div>
                      <div className="text-[11px] text-muted-foreground">{r.phone || ''}</div>
                    </TableCell>
                    <TableCell>
                      {r.class_type ? (
                        <>
                          <div className="text-xs">{r.class_type}{r.tier_name ? ` (${r.tier_name})` : ''}</div>
                          <div className="text-[11px] text-muted-foreground">{r.term_name || ''}</div>
                        </>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={invoiceBadge(r.invoice_status)}>
                        {invoiceLabel(r.invoice_status)}
                      </Badge>
                      {r.invoice_balance != null && r.invoice_balance > 0 && (
                        <div className="text-[11px] text-red-600 mt-0.5">
                          {formatCurrency(r.invoice_balance)} due
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.credit_balance > 0 ? formatCurrency(r.credit_balance) : '—'}
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile two-line rows */}
          <div className="lg:hidden space-y-2">
            {rows.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{r.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {r.current_belt || 'No belt'} · {r.branch_name || '—'} · {r.status}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant="outline" className={invoiceBadge(r.invoice_status)}>
                        {invoiceLabel(r.invoice_status)}
                      </Badge>
                      {canEdit && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1 break-words">
                    {r.email || ''}{r.phone ? `${r.email ? ' · ' : ''}${r.phone}` : ''}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] mt-1">
                    {r.class_type && (
                      <span>{r.class_type}{r.tier_name ? ` (${r.tier_name})` : ''}{r.term_name ? ` — ${r.term_name}` : ''}</span>
                    )}
                    {r.invoice_balance != null && r.invoice_balance > 0 && (
                      <span className="text-red-600">{formatCurrency(r.invoice_balance)} due</span>
                    )}
                    {r.credit_balance > 0 && (
                      <span className="text-green-700">Credit {formatCurrency(r.credit_balance)}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRow(null)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || contactsLoading}>
              {(saving || contactsLoading) && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentsTab;
