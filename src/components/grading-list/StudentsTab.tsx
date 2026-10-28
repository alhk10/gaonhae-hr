/**
 * Students tab embedded in /access.
 * Public searchable student directory with enrolment, payment and credit info.
 * Unlocked staff can edit belt, branch and status (withdrawal excluded).
 */
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
import StudentEditDialog from './StudentEditDialog';

const BELT_OPTIONS = [...new Set(BELT_LEVELS_ARRAY)];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface Props {
  canEdit?: boolean;
  /** When set, the list is fixed to this branch and the selector is disabled */
  lockedBranchId?: string;
  /** Drill-through from Summary: payment filter / branch applied when drillNonce changes */
  initialPayFilter?: string;
  initialBranchId?: string;
  drillNonce?: number;
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


const StudentsTab: React.FC<Props> = ({ canEdit, lockedBranchId, initialPayFilter, initialBranchId, drillNonce }) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const actor = user?.employeeId || user?.email || 'admin';
  // Signed-in staff save invoices directly; password-only /access sessions
  // save through the create_access_invoice database function instead.
  const canInvoice = true;

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState(lockedBranchId || 'all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [payFilter, setPayFilter] = useState('all');
  React.useEffect(() => {
    if (!drillNonce) return;
    setPayFilter(initialPayFilter || 'all');
    setStatusFilter('all');
    if (!lockedBranchId) setBranchFilter(initialBranchId || 'all');
  }, [drillNonce]); // eslint-disable-line react-hooks/exhaustive-deps

  const [editRow, setEditRow] = useState<PublicStudentDirectoryRow | null>(null);
  const openEdit = (r: PublicStudentDirectoryRow) => setEditRow(r);
  const [addOpen, setAddOpen] = useState(false);
  const [addTrial, setAddTrial] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [invoiceFor, setInvoiceFor] = useState<PublicStudentDirectoryRow | null>(null);


  // Debounce search input
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: allRows = [], isLoading } = useQuery({
    queryKey: ['public-student-directory', debouncedSearch, branchFilter, statusFilter],
    queryFn: () =>
      getPublicStudentDirectory({
        search: debouncedSearch,
        branchId: branchFilter === 'all' ? undefined : branchFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
      }),
    staleTime: 30 * 1000,
  });

  const isAllBranch = (() => { try { return sessionStorage.getItem('guards_list_all_branch_v1') === '1'; } catch { return false; } })();
  const [showEmployees, setShowEmployees] = useState(false);
  const rowsAll = React.useMemo(() => {
    if (payFilter === 'all') return sortAccessStudents(allRows);
    return sortAccessStudents(allRows.filter((r) => {
      const st = normalizeStatus(r.invoice_status);
      switch (payFilter) {
        case 'any_paid': return st === 'paid' || st === 'pending_verification' || st === 'paid_verified';
        case 'any_unpaid': return st !== 'none' && st !== 'paid' && st !== 'pending_verification' && st !== 'paid_verified';
        case 'none': return st === 'none';
        case 'draft': return st === 'draft';
        case 'due': return st === 'unpaid' || st === 'overdue';
        case 'partial': return st === 'partially_paid';
        case 'paid': return st === 'paid' || st === 'pending_verification';
        case 'verified': return st === 'paid_verified';
        default: return true;
      }
    }));
  }, [allRows, payFilter]);
  const rows = React.useMemo(() => (showEmployees ? rowsAll : rowsAll.filter((r) => !r.is_employee)), [rowsAll, showEmployees]);
  const employeeCount = rows.filter((r) => r.is_employee).length;
  const studentCount = rows.length - employeeCount;

  const { data: branches = [] } = useQuery({
    queryKey: ['public-branches'],
    queryFn: getPublicBranches,
    staleTime: 5 * 60 * 1000,
  });

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
        <Select value={branchFilter} onValueChange={setBranchFilter} disabled={!!lockedBranchId}>
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
        {isAllBranch && (
          <label className="flex items-center gap-1.5 text-xs whitespace-nowrap">
            <input type="checkbox" checked={showEmployees} onChange={(e) => setShowEmployees(e.target.checked)} />
            Show employees
          </label>
        )}
        <Select value={payFilter} onValueChange={setPayFilter}>
          <SelectTrigger className="w-full sm:w-[190px] h-9">
            <SelectValue placeholder="All term payments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All term payments</SelectItem>
            <SelectItem value="any_paid">All paid</SelectItem>
            <SelectItem value="any_unpaid">All unpaid</SelectItem>
            <SelectItem value="none">No invoice</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="due">Unpaid / Sent / Overdue</SelectItem>
            <SelectItem value="partial">Partially paid</SelectItem>
            <SelectItem value="paid">Paid (awaiting verification)</SelectItem>
            <SelectItem value="verified">Paid &amp; Verified</SelectItem>
          </SelectContent>
        </Select>
        {canEdit && (
          <div className="flex gap-2">
            <Button size="sm" className="h-9" onClick={() => { setAddTrial(false); setAddOpen(true); }}>
              <UserPlus className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Add Student</span>
            </Button>
            <Button size="sm" variant="outline" className="h-9" onClick={() => { setAddTrial(true); setAddOpen(true); }}>
              <UserPlus className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Add Trial Student</span>
              <span className="sm:hidden text-xs">Trial</span>
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
        initialValues={addTrial ? { status: 'trial' } : undefined}
        lockedBranchId={lockedBranchId}
        onCreated={() => qc.invalidateQueries({ queryKey: ['public-student-directory'] })}
      />
      <MergeStudentsDialog open={mergeOpen} onOpenChange={setMergeOpen} actor={actor} />
      {invoiceFor && (
        <InvoiceDialog
          key={invoiceFor.id}
          mode="create"
          open={!!invoiceFor}
          onOpenChange={(o) => !o && setInvoiceFor(null)}
          branchId={invoiceFor.branch_id || undefined}
          prefilledStudentId={invoiceFor.id}
          onSubmitOverride={user ? undefined : createAccessInvoice}
          onInvoiceCreated={() => {
            setInvoiceFor(null);
            qc.invalidateQueries({ queryKey: ['public-student-directory'] });
            qc.invalidateQueries({ queryKey: ['public-student-profile'] });
          }}
        />
      )}
      <StudentProfileDialog
        studentId={profileId}
        open={!!profileId}
        onOpenChange={(o) => !o && setProfileId(null)}
        canEdit={canEdit}
      />

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
            Showing {studentCount} student{studentCount === 1 ? '' : 's'}{employeeCount ? ` + ${employeeCount} employee${employeeCount === 1 ? '' : 's'}` : ''}{rows.length >= 200 ? ' (first 200 — refine your search)' : ''}
          </p>

          {/* Desktop table */}
          <div className="hidden md:block access-list-shell rounded-md border">
            <Table className="access-list-table students-list [&_th]:text-left [&_td]:text-left [&_td]:align-middle [&_th]:align-middle">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Belt</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Enrolment</TableHead>
                  <TableHead>Term payment</TableHead>
                  <TableHead className="!text-right">Credit</TableHead>
                  {canEdit && <TableHead className="w-20" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="py-2" data-field="student" data-label="Name">
                      <StudentNameButton name={r.name} studentId={r.id} onOpen={setProfileId} className="font-medium text-sm text-left" />
                      {r.is_employee && <Badge variant="secondary" className="ml-1 text-[10px]">Employee</Badge>}
                      {r.class_group && <Badge variant="outline" className="ml-1 text-[10px]">{r.class_group}</Badge>}
                      <div className="text-[11px] text-muted-foreground whitespace-nowrap">
                        {r.student_number || ''}{r.date_of_birth ? `${r.student_number ? ' · ' : ''}DOB ${formatDate(r.date_of_birth)}` : ''}{(() => { const legal = [r.first_name, r.last_name].filter(Boolean).join(' ').toUpperCase(); const parts = [r.display_name && r.display_name.toUpperCase() !== legal ? `Display: ${r.display_name}` : '', r.certificate_name && r.certificate_name.toUpperCase() !== legal ? `Cert: ${r.certificate_name}` : ''].filter(Boolean); return parts.length ? <span className="block">{parts.join(' · ')}</span> : null; })()}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-sm whitespace-nowrap" data-field="belt" data-label="Belt">{r.current_belt || '—'}</TableCell>
                    <TableCell className="py-2 text-sm whitespace-nowrap" data-field="branch" data-label="Branch">{r.branch_name || '—'}</TableCell>
                    <TableCell className="py-2" data-field="status" data-label="Status">
                      <Badge variant="outline" className={statusBadge(r.status)}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="py-2 max-w-[14rem]" data-field="contact" data-label="Contact">
                      <div className="text-sm truncate" title={r.email || undefined}>{r.email || '—'}</div>
                      {r.phone && <div className="text-[11px] text-muted-foreground">{r.phone}</div>}
                    </TableCell>
                    <TableCell className="py-2" data-field="enrolment" data-label="Enrolment">
                      {r.class_type ? (
                        <>
                          <div className="text-sm">{r.class_type}{r.tier_name ? ` (${r.tier_name})` : ''}</div>
                          {r.term_name && <div className="text-[11px] text-muted-foreground">{r.term_name}</div>}
                        </>
                      ) : <span className="text-sm">—</span>}
                    </TableCell>
                    <TableCell className="py-2" data-field="payment" data-label="Term payment">
                      <StatusBadge status={r.invoice_status} />
                      {r.invoice_balance != null && r.invoice_balance > 0 && (
                        <div className="text-[11px] text-destructive mt-0.5">
                          {formatCurrency(r.invoice_balance)} due
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-2 text-sm !text-right whitespace-nowrap" data-field="credit" data-label="Credit">
                      {r.credit_balance > 0 ? formatCurrency(r.credit_balance) : '—'}
                    </TableCell>
                    {canEdit && (
                      <TableCell className="py-2" data-field="actions" data-label="">
                        <div className="flex items-center justify-end gap-1">
                          {canInvoice && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setInvoiceFor(r)} title="Add invoice">
                            <FilePlus className="h-4 w-4" />
                          </Button>}
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)} title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile two-line rows */}
          <div className="md:hidden space-y-2">
            {rows.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <StudentNameButton name={r.name} studentId={r.id} onOpen={setProfileId} className="font-medium text-sm truncate block" />
                      {r.is_employee && <Badge variant="secondary" className="ml-1 text-[10px]">Employee</Badge>}
                      {r.class_group && <Badge variant="outline" className="ml-1 text-[10px]">{r.class_group}</Badge>}
                      <div className="text-[11px] text-muted-foreground">
                        {r.current_belt || 'No belt'} · {r.branch_name || '—'} · {r.status}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <StatusBadge status={r.invoice_status} />
                      {canEdit && (
                        <>
                          {canInvoice && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setInvoiceFor(r)} title="Add invoice">
                            <FilePlus className="h-4 w-4" />
                          </Button>}
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)} title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </>
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

      <StudentEditDialog row={editRow} onClose={() => setEditRow(null)} />
    </div>
  );
};

export default StudentsTab;
