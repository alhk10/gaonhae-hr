import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, PackageOpen, ClipboardList, Users } from 'lucide-react';
import { getPublicGradingList, getPublicBranches, getPublicStudentCountsByMonth } from '@/services/gradingPaymentSubmissionService';
import { getPublicCompetitionList } from '@/services/competitionPaymentSubmissionService';
import { getPublicSeminarList } from '@/services/seminarPaymentSubmissionService';
import { listGuardsPurchases } from '@/services/guardsPurchaseService';
import { getSchoolFeesList } from '@/services/schoolFeesSubmissionService';

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
  onDrill?: (tab: SummaryDrillTab, branch: string, intent: SummaryDrillIntent) => void;
}

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

const SummaryTab: React.FC<SummaryTabProps> = ({ onDrill }) => {
  const { data: gradingRows = [], isLoading: l1 } = useQuery({
    queryKey: ['public-grading-list'],
    queryFn: () => getPublicGradingList({}),
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

  const isLoading = l1 || l2 || l3 || l4 || l5;

  const branchNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of branches as any[]) m.set(b.id, b.name);
    return m;
  }, [branches]);

  const pending = useMemo(() => {
    const map = new Map<string, Counts>();
    const bump = (branch: string | null | undefined, key: keyof Counts) => {
      const b = branch || NO_BRANCH;
      if (!map.has(b)) map.set(b, emptyCounts());
      map.get(b)![key] += 1;
    };

    for (const r of schoolFeesRows as any[]) {
      if (isPending(r.status)) bump(r.branch_name, 'schoolFees');
    }
    for (const r of gradingRows as any[]) {
      if (r.source === 'submission' && isPending(r.paid_status)) bump(r.branch_name, 'grading');
    }
    for (const r of competitionRows as any[]) {
      if (isPending(r.paid_status)) bump(r.branch_name, 'competitions');
    }
    for (const r of seminarRows as any[]) {
      if (isPending(r.paid_status)) bump(r.branch_name, 'seminars');
    }
    for (const r of guardsRows as any[]) {
      if (isPending(r.sale_status)) bump(branchNameById.get(r.branch_id) ?? null, 'guards');
    }

    const rows = Array.from(map.entries())
      .map(([branch, counts]) => ({
        branch,
        ...counts,
        total: counts.schoolFees + counts.grading + counts.competitions + counts.seminars + counts.guards,
      }))
      .filter((r) => r.total > 0)
      .sort((a, b) => a.branch.localeCompare(b.branch));

    const totals = rows.reduce(
      (acc, r) => ({
        schoolFees: acc.schoolFees + r.schoolFees,
        grading: acc.grading + r.grading,
        competitions: acc.competitions + r.competitions,
        seminars: acc.seminars + r.seminars,
        guards: acc.guards + r.guards,
        total: acc.total + r.total,
      }),
      { ...emptyCounts(), total: 0 },
    );

    return { rows, totals };
  }, [schoolFeesRows, gradingRows, competitionRows, seminarRows, guardsRows, branchNameById]);

  const uncollected = useMemo(() => {
    const map = new Map<string, { count: number; amount: number }>();
    for (const r of guardsRows as any[]) {
      const status = (r.sale_status || '').toLowerCase();
      if (r.collected) continue;
      if (status === 'rejected' || status === 'cancelled') continue;
      const b = branchNameById.get(r.branch_id) ?? NO_BRANCH;
      if (!map.has(b)) map.set(b, { count: 0, amount: 0 });
      const e = map.get(b)!;
      e.count += 1;
      e.amount += Number(r.total || 0);
    }
    const rows = Array.from(map.entries())
      .map(([branch, v]) => ({ branch, ...v }))
      .sort((a, b) => a.branch.localeCompare(b.branch));
    const totals = rows.reduce(
      (acc, r) => ({ count: acc.count + r.count, amount: acc.amount + r.amount }),
      { count: 0, amount: 0 },
    );
    return { rows, totals };
  }, [guardsRows, branchNameById]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading summary…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Pending approvals by branch
            <Badge variant={pending.totals.total > 0 ? 'destructive' : 'secondary'} className="text-[10px]">
              {pending.totals.total}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          {pending.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nothing pending approval.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left font-medium py-2 pr-2">Branch</th>
                    <th className="text-right font-medium py-2 px-2">Fees</th>
                    <th className="text-right font-medium py-2 px-2">Grading</th>
                    <th className="text-right font-medium py-2 px-2">Comps</th>
                    <th className="text-right font-medium py-2 px-2">Seminars</th>
                    <th className="text-right font-medium py-2 px-2">Guards</th>
                    <th className="text-right font-medium py-2 pl-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.rows.map((r) => (
                    <tr key={r.branch} className="border-b last:border-0">
                      <td className="py-2 pr-2 font-medium">{r.branch}</td>
                      <td className="py-2 px-2 text-right"><DrillCell value={r.schoolFees} branch={r.branch} tab="school-fees" onDrill={onDrill} /></td>
                      <td className="py-2 px-2 text-right"><DrillCell value={r.grading} branch={r.branch} tab="grading" onDrill={onDrill} /></td>
                      <td className="py-2 px-2 text-right"><DrillCell value={r.competitions} branch={r.branch} tab="competitions" onDrill={onDrill} /></td>
                      <td className="py-2 px-2 text-right"><DrillCell value={r.seminars} branch={r.branch} tab="seminars" onDrill={onDrill} /></td>
                      <td className="py-2 px-2 text-right"><DrillCell value={r.guards} branch={r.branch} tab="guards" onDrill={onDrill} /></td>
                      <td className="py-2 pl-2 text-right font-semibold">{r.total}</td>
                    </tr>
                  ))}
                  <tr className="bg-muted/50">
                    <td className="py-2 pr-2 font-semibold">Total</td>
                    <td className="py-2 px-2 text-right font-semibold">{pending.totals.schoolFees}</td>
                    <td className="py-2 px-2 text-right font-semibold">{pending.totals.grading}</td>
                    <td className="py-2 px-2 text-right font-semibold">{pending.totals.competitions}</td>
                    <td className="py-2 px-2 text-right font-semibold">{pending.totals.seminars}</td>
                    <td className="py-2 px-2 text-right font-semibold">{pending.totals.guards}</td>
                    <td className="py-2 pl-2 text-right font-semibold">{pending.totals.total}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <PackageOpen className="h-4 w-4" />
            Uncollected guards by branch
            <Badge variant={uncollected.totals.count > 0 ? 'destructive' : 'secondary'} className="text-[10px]">
              {uncollected.totals.count}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          {uncollected.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">All guards orders collected.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left font-medium py-2 pr-2">Branch</th>
                    <th className="text-right font-medium py-2 px-2">Uncollected orders</th>
                    <th className="text-right font-medium py-2 pl-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {uncollected.rows.map((r) => (
                    <tr key={r.branch} className="border-b last:border-0">
                      <td className="py-2 pr-2 font-medium">{r.branch}</td>
                      <td className="py-2 px-2 text-right"><DrillCell value={r.count} branch={r.branch} tab="guards" intent="uncollected" onDrill={onDrill} /></td>
                      <td className="py-2 pl-2 text-right">{money(r.amount)}</td>
                    </tr>
                  ))}
                  <tr className="bg-muted/50">
                    <td className="py-2 pr-2 font-semibold">Total</td>
                    <td className="py-2 px-2 text-right font-semibold">{uncollected.totals.count}</td>
                    <td className="py-2 pl-2 text-right font-semibold">{money(uncollected.totals.amount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SummaryTab;
