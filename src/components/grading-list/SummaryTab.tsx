import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, PackageOpen, ClipboardList, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { getPendingStudentApprovals } from '@/services/publicStudentApprovalService';
import { formatDateTime } from '@/utils/dateFormat';
import { getPublicGradingList, getPendingGradingSubmissionMeta, getPublicBranches, getPublicStudentCountsByMonth } from '@/services/gradingPaymentSubmissionService';
import { getPublicCompetitionList } from '@/services/competitionPaymentSubmissionService';
import { getPublicSeminarList } from '@/services/seminarPaymentSubmissionService';
import { listGuardsPurchases } from '@/services/guardsPurchaseService';
import { getSchoolFeesList } from '@/services/schoolFeesSubmissionService';
import PendingApprovalsSection from '@/components/grading-list/PendingApprovalsSection';
import PaymentShortageList from '@/components/common/PaymentShortageList';
import SummaryApprovalRow from './SummaryApprovalRow';
import StudentProfileDialog from './StudentProfileDialog';
import InvoiceDetailDialog from './InvoiceDetailDialog';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];


const NO_BRANCH = '—';

const isPending = (s?: string | null) => {
  const v = (s || '').toLowerCase().replace(/_/g, ' ');
  return v === 'pending' || v === 'pending verification' || v === 'unverified';
};

interface Counts {
  schoolFees: number;
  grading: number;
  competitions: number;
  seminars: number;
  guards: number;
}

const emptyCounts = (): Counts => ({ schoolFees: 0, grading: 0, competitions: 0, seminars: 0, guards: 0 });

const money = (n: number) => `$${n.toFixed(2)}`;
export type SummaryDrillTab = 'school-fees' | 'grading' | 'competitions' | 'seminars' | 'guards';
export type SummaryDrillIntent = 'pending' | 'uncollected';

interface SummaryTabProps {
  /** When set, only this branch is shown (branch-password access) */
  lockedBranchName?: string;
  lockedBranchId?: string;
  canApprove?: boolean;
  onDrill?: (tab: SummaryDrillTab, branch: string, intent: SummaryDrillIntent, gradingDate?: string | null) => void;
  onStudentDrill?: (payFilter: string, branchId?: string) => void;
}

type ApprovalType = 'registration' | 'update_request' | SummaryDrillTab;
const TYPE_LABEL: Record<ApprovalType, string> = {
  registration: 'New student',
  update_request: 'Detail change',
  'school-fees': 'School fees',
  grading: 'Grading',
  competitions: 'Competition',
  seminars: 'Seminar',
  guards: 'Guards',
};
interface ApprovalItem {
  key: string;
  type: ApprovalType;
  at: string;
  name: string;
  branch: string;
  amount: number | null;
  gradingDate?: string | null;
  raw?: any;
}
const rowName = (r: any) =>
  String(r.student_name || r.display_name || [r.first_name, r.last_name].filter(Boolean).join(' ') || '—').toUpperCase();
const rowAmount = (r: any): number | null => {
  const v = r.amount ?? r.total ?? r.amount_paid ?? null;
  return v == null ? null : Number(v);
};
const rowDate = (r: any) => r.created_at || r.submitted_at || '';

const DrillCell: React.FC<{
  value: number;
  branch: string;
  tab: SummaryDrillTab;
  intent?: SummaryDrillIntent;
  onDrill?: (tab: SummaryDrillTab, branch: string, intent: SummaryDrillIntent) => void;
}> = ({ value, branch, tab, intent = 'pending', onDrill }) => {
  if (!value) return <span>–</span>;
  if (!onDrill) return <span>{value}</span>;
  return (
    <button
      type="button"
      onClick={() => onDrill(tab, branch, intent)}
      className="text-primary underline-offset-2 hover:underline font-medium"
    >
      {value}
    </button>
  );
};

const SummaryTab: React.FC<SummaryTabProps> = ({ lockedBranchName, lockedBranchId, canApprove, onDrill, onStudentDrill }) => {
  const { data: gradingRows = [], isLoading: l1 } = useQuery({
    queryKey: ['public-grading-list'],
    queryFn: () => getPublicGradingList({}),
    staleTime: 30 * 1000,
  });
  const { data: gradingMeta = [] } = useQuery({
    queryKey: ['pending-grading-submission-meta'],
    queryFn: getPendingGradingSubmissionMeta,
    staleTime: 30 * 1000,
  });
  const { data: competitionRows = [], isLoading: l2 } = useQuery({
    queryKey: ['public-competition-list', 'v2-dob', 'all'],
    queryFn: () => getPublicCompetitionList(null),
    staleTime: 30 * 1000,
  });
  const { data: seminarRows = [], isLoading: l3 } = useQuery({
    queryKey: ['public-seminar-list', 'all', 'all', 'all'],
    queryFn: () => getPublicSeminarList(null, null, null),
    staleTime: 30 * 1000,
  });
  const { data: guardsRows = [], isLoading: l4 } = useQuery({
    queryKey: ['guards-purchases'],
    queryFn: listGuardsPurchases,
    staleTime: 30 * 1000,
  });
  const { data: schoolFeesRows = [], isLoading: l5 } = useQuery({
    queryKey: ['school-fees-list', 'all'],
    queryFn: () => getSchoolFeesList(null, null),
    staleTime: 30 * 1000,
  });
  const { data: branches = [] } = useQuery({
    queryKey: ['public-branches'],
    queryFn: getPublicBranches,
    staleTime: 5 * 60 * 1000,
  });

  const currentYear = new Date().getFullYear();
  const [countYear, setCountYear] = useState<number>(currentYear);
  const { data: studentCounts = [], isLoading: loadingCounts } = useQuery({
    queryKey: ['public-student-counts-by-month', countYear],
    queryFn: () => getPublicStudentCountsByMonth(countYear),
    staleTime: 60 * 1000,
  });
  const { data: studentApprovals = [] } = useQuery({
    queryKey: ['public-pending-student-approvals', lockedBranchId || 'all'],
    queryFn: () => getPendingStudentApprovals(lockedBranchId || null),
    staleTime: 30 * 1000,
  });
  const { data: paySummary = [], isLoading: loadingPay } = useQuery({
    queryKey: ['access-student-payment-summary', lockedBranchId || 'all'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_access_student_payment_summary', {
        p_branch_id: lockedBranchId || null,
      });
      if (error) throw error;
      return (data || []) as Array<{ branch_id: string | null; branch_name: string | null; current_count: number; paid_count: number; unpaid_count: number; no_invoice_count: number }>;
    },
    staleTime: 30 * 1000,
  });

  const [profileId, setProfileId] = useState<string | null>(null);
  const [invoiceView, setInvoiceView] = useState<{ id: string; number?: string | null } | null>(null);
  const [typeFilter, setTypeFilter] = useState<ApprovalType | 'all'>('all');

  const studentCountTable = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const r of studentCounts) {
      const b = r.branch_name || NO_BRANCH;
      if (!map.has(b)) map.set(b, Array(12).fill(0));
      if (r.month >= 1 && r.month <= 12) map.get(b)![r.month - 1] = r.student_count;
    }
    const rows = Array.from(map.entries())
      .map(([branch, months]) => ({ branch, months, peak: Math.max(0, ...months) }))
      .filter((r) => r.peak > 0)
      .filter((r) => !lockedBranchName || r.branch === lockedBranchName)
      .sort((a, b) => a.branch.localeCompare(b.branch));
    const totals = Array(12).fill(0) as number[];
    for (const r of rows) r.months.forEach((v, i) => (totals[i] += v));
    return { rows, totals, peakTotal: Math.max(0, ...totals) };
  }, [studentCounts, lockedBranchName]);

  const isLoading = l1 || l2 || l3 || l4 || l5;

  const branchNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of branches as any[]) m.set(b.id, b.name);
    return m;
  }, [branches]);

  const approvals = useMemo(() => {
    const items: ApprovalItem[] = [];
    const push = (type: ApprovalType, r: any, branch: string | null | undefined) =>
      items.push({ key: `${type}-${r.id}`, type, at: rowDate(r), name: rowName(r), branch: branch || NO_BRANCH, amount: rowAmount(r), raw: r });
    for (const r of studentApprovals as any[]) push(r.kind, r, r.branch_name);
    for (const r of schoolFeesRows as any[]) if (isPending(r.status)) push('school-fees', r, r.branch_name);
    const metaById = new Map(gradingMeta.map((m) => [m.id, m]));
    for (const r of gradingRows as any[]) {
      if (r.source !== 'submission' || !isPending(r.paid_status)) continue;
      const m = metaById.get(r.submission_id);
      items.push({
        key: `grading-${r.submission_id}`, type: 'grading', at: m?.created_at || '', name: rowName(r),
        branch: r.branch_name || NO_BRANCH, amount: rowAmount(r), gradingDate: r.grading_date || null, raw: r,
      });
    }
    for (const r of competitionRows as any[]) if (isPending(r.paid_status)) push('competitions', r, r.branch_name);
    for (const r of seminarRows as any[]) if (isPending(r.paid_status)) push('seminars', r, r.branch_name);
    for (const r of guardsRows as any[]) if (isPending(r.sale_status)) push('guards', r, branchNameById.get(r.branch_id));
    return items
      .filter((i) => !lockedBranchName || i.branch === lockedBranchName)
      .sort((a, b) => (a.at || '').localeCompare(b.at || ''));
  }, [studentApprovals, schoolFeesRows, gradingRows, competitionRows, seminarRows, guardsRows, branchNameById, lockedBranchName, gradingMeta]);

  const typeCounts = useMemo(() => {
    const m = new Map<ApprovalType, number>();
    for (const a of approvals) m.set(a.type, (m.get(a.type) || 0) + 1);
    return m;
  }, [approvals]);
  const shownApprovals = typeFilter === 'all' ? approvals : approvals.filter((a) => a.type === typeFilter);

  const uncollected = useMemo(() => {
    const rows = (guardsRows as any[])
      .filter((r) => {
        const st = (r.sale_status || '').toLowerCase();
        return !r.collected && st !== 'rejected' && st !== 'cancelled';
      })
      .map((r) => ({
        id: r.id,
        at: r.created_at,
        name: rowName(r),
        branch: branchNameById.get(r.branch_id) ?? NO_BRANCH,
        items: (Array.isArray(r.items) ? r.items : [])
          .map((it: any) => `${it.name || it.product_name || 'Item'}${it.qty > 1 ? ` ×${it.qty}` : ''}`)
          .join(', '),
        amount: Number(r.total || 0),
      }))
      .filter((r) => !lockedBranchName || r.branch === lockedBranchName)
      .sort((a, b) => (a.at || '').localeCompare(b.at || ''));
    return { rows, amount: rows.reduce((s, r) => s + r.amount, 0) };
  }, [guardsRows, branchNameById, lockedBranchName]);

  const payTotals = useMemo(
    () =>
      paySummary.reduce(
        (a, r) => ({
          current: a.current + r.current_count,
          paid: a.paid + r.paid_count,
          unpaid: a.unpaid + r.unpaid_count,
          none: a.none + r.no_invoice_count,
        }),
        { current: 0, paid: 0, unpaid: 0, none: 0 },
      ),
    [paySummary],
  );

  const chartData = MONTH_LABELS.map((m, i) => ({ month: m, students: studentCountTable.totals[i] }));

  const openApproval = (a: ApprovalItem) => {
    if (a.type === 'registration' || a.type === 'update_request') {
      document.getElementById('summary-student-approvals')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    onDrill?.(a.type, a.branch, 'pending', a.gradingDate);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading summary…
      </div>
    );
  }

  const tiles: Array<{ label: string; value: number; filter: string; key: 'current_count' | 'paid_count' | 'unpaid_count' | 'no_invoice_count'; tone: string }> = [
    { label: 'Current students', value: payTotals.current, filter: 'all', key: 'current_count', tone: 'text-foreground' },
    { label: 'Paid', value: payTotals.paid, filter: 'any_paid', key: 'paid_count', tone: 'text-primary' },
    { label: 'Unpaid', value: payTotals.unpaid, filter: 'any_unpaid', key: 'unpaid_count', tone: 'text-destructive' },
    { label: 'No invoice', value: payTotals.none, filter: 'none', key: 'no_invoice_count', tone: 'text-muted-foreground' },
  ];

  return (
    <div className="space-y-4">
      {/* 1. Student snapshot */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <Card
            key={t.label}
            role="button"
            tabIndex={0}
            onClick={() => onStudentDrill?.(t.filter, lockedBranchId)}
            className="cursor-pointer transition-shadow hover:shadow-md"
          >
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{t.label}</p>
              <p className={`text-2xl font-semibold ${t.tone}`}>{loadingPay ? '…' : t.value}</p>
              {!lockedBranchName && paySummary.length > 1 && (
                <div className="mt-2 space-y-0.5">
                  {paySummary.map((r) => (
                    <div key={`${t.key}-${r.branch_id}`} className="flex justify-between text-[11px] text-muted-foreground">
                      <span className="truncate pr-2">{r.branch_name || NO_BRANCH}</span>
                      <span className="font-medium text-foreground">{r[t.key]}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground -mt-2">
        Current = active and trial students. Paid / Unpaid / No invoice is based on each student's current-term invoice.
      </p>

      <PaymentShortageList mode="access" lockedBranchName={lockedBranchName} />

      {/* 2. Approvals & verifications */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Approvals &amp; verifications
            <Badge variant={approvals.length > 0 ? 'destructive' : 'secondary'} className="text-[10px]">
              {approvals.length}
            </Badge>
          </CardTitle>
          {approvals.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              <Button size="sm" variant={typeFilter === 'all' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => setTypeFilter('all')}>
                All ({approvals.length})
              </Button>
              {Array.from(typeCounts.entries()).map(([t, n]) => (
                <Button key={t} size="sm" variant={typeFilter === t ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => setTypeFilter(t)}>
                  {TYPE_LABEL[t]} ({n})
                </Button>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-3 pt-0">
          {shownApprovals.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nothing waiting for approval.</p>
          ) : (
            <ul className="divide-y max-h-[480px] overflow-y-auto">
              {shownApprovals.map((a) =>
                a.type === 'registration' || a.type === 'update_request' ? (
                <li key={a.key} className="py-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm">
                  <span className="text-muted-foreground w-[120px] shrink-0">{a.at ? formatDateTime(a.at) : '—'}</span>
                  <Badge variant="outline" className="text-[10px] shrink-0">{TYPE_LABEL[a.type]}</Badge>
                  <span className="font-medium flex-1 min-w-[140px] break-words">{a.name}</span>
                  <span className="text-muted-foreground">{a.branch}</span>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-primary" onClick={() => openApproval(a)}>
                    Review
                  </Button>
                </li>
                ) : (
                <SummaryApprovalRow
                  key={a.key}
                  type={a.type}
                  typeLabel={TYPE_LABEL[a.type]}
                  raw={a.raw}
                  at={a.at}
                  name={a.name}
                  branch={a.branch}
                  amount={a.amount}
                  canApprove={canApprove}
                  onOpenStudent={setProfileId}
                  onOpenInvoice={(id, number) => setInvoiceView({ id, number })}
                />
                ),
              )}
            </ul>
          )}
        </CardContent>
      </Card>

      {studentApprovals.length > 0 && (
        <div id="summary-student-approvals">
          <PendingApprovalsSection lockedBranchName={lockedBranchName} lockedBranchId={lockedBranchId} canApprove={canApprove} />
        </div>
      )}

      {/* 3. Uncollected guards */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 flex-wrap">
            <PackageOpen className="h-4 w-4" />
            Uncollected guards
            <Badge variant={uncollected.rows.length > 0 ? 'destructive' : 'secondary'} className="text-[10px]">
              {uncollected.rows.length}
            </Badge>
            {uncollected.rows.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground">{money(uncollected.amount)}</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          {uncollected.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">All guards orders collected.</p>
          ) : (
            <ul className="divide-y max-h-[420px] overflow-y-auto">
              {uncollected.rows.map((r) => (
                <li key={r.id} className="py-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm">
                  <span className="text-muted-foreground w-[120px] shrink-0">{r.at ? formatDateTime(r.at) : '—'}</span>
                  <span className="font-medium min-w-[140px] break-words">{r.name}</span>
                  <span className="text-muted-foreground">{r.branch}</span>
                  <span className="flex-1 min-w-[160px] text-muted-foreground break-words">{r.items}</span>
                  <span className="w-[72px] text-right">{money(r.amount)}</span>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-primary" onClick={() => onDrill?.('guards', r.branch, 'uncollected')}>
                    Open
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 4. Student count by month */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Student count by month
            </span>
            <Select value={String(countYear)} onValueChange={(v) => setCountYear(Number(v))}>
              <SelectTrigger className="h-7 w-[92px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                  <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          {loadingCounts ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading counts…
            </div>
          ) : studentCountTable.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No paid lessons recorded for {countYear}.</p>
          ) : (
            <>
              <div className="h-[180px] mb-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="students" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs whitespace-nowrap">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left font-medium py-2 pr-2 sticky left-0 bg-background">Branch</th>
                      {MONTH_LABELS.map((m) => (
                        <th key={m} className="text-right font-medium py-2 px-1.5">{m}</th>
                      ))}
                      <th className="text-right font-medium py-2 pl-2">Peak</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentCountTable.rows.map((r) => (
                      <tr key={r.branch} className="border-b last:border-0">
                        <td className="py-2 pr-2 font-medium sticky left-0 bg-background">{r.branch}</td>
                        {r.months.map((v, i) => (
                          <td key={i} className="py-2 px-1.5 text-right">{v || '–'}</td>
                        ))}
                        <td className="py-2 pl-2 text-right font-semibold">{r.peak}</td>
                      </tr>
                    ))}
                    <tr className="bg-muted/50">
                      <td className="py-2 pr-2 font-semibold sticky left-0 bg-muted/50">Total</td>
                      {studentCountTable.totals.map((v, i) => (
                        <td key={i} className="py-2 px-1.5 text-right font-semibold">{v || '–'}</td>
                      ))}
                      <td className="py-2 pl-2 text-right font-semibold">{studentCountTable.peakTotal}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
          <p className="text-[11px] text-muted-foreground mt-2">
            Term payments count in every month they cover; 4-week payments count only in their starting month.
          </p>
        </CardContent>
      </Card>
      <StudentProfileDialog studentId={profileId} open={!!profileId} onOpenChange={(o) => !o && setProfileId(null)} />
      <InvoiceDetailDialog
        invoiceId={invoiceView?.id ?? null}
        invoiceNumber={invoiceView?.number ?? null}
        open={!!invoiceView}
        onOpenChange={(o) => !o && setInvoiceView(null)}
      />
    </div>
  );
};

export default SummaryTab;
