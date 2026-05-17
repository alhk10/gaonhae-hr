/**
 * Public grading list page (no auth).
 * Mounted at /grading-list. Intended subdomain: gradinglist.gaonhae.app.
 *
 * Shows upcoming grading registrations and unmatched public payment
 * submissions, grouped by grading slot (date → start_time → branch).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate } from '@/utils/dateFormat';
import {
  getPublicGradingList,
  type PublicGradingListRow,
} from '@/services/gradingPaymentSubmissionService';

const statusVariant = (status: string) => {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  }
};

const PublicGradingList: React.FC = () => {
  const [dateFilter, setDateFilter] = useState<string>('all');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['public-grading-list'],
    queryFn: () => getPublicGradingList({}),
    staleTime: 30 * 1000,
  });

  // Distinct upcoming grading dates, sorted ascending
  const dateOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (r.grading_date) set.add(r.grading_date);
    }
    return Array.from(set).sort();
  }, [rows]);

  // Default to earliest upcoming date once data arrives
  useEffect(() => {
    if (dateFilter === 'all' && dateOptions.length > 0) {
      setDateFilter(dateOptions[0]);
    }
  }, [dateOptions, dateFilter]);

  const filteredRows = useMemo(
    () => (dateFilter === 'all' ? rows : rows.filter((r) => r.grading_date === dateFilter)),
    [rows, dateFilter],
  );

  // Group rows by slot (date + branch + start_time), sorted earliest first
  const groups = useMemo(() => {
    const map = new Map<string, { header: PublicGradingListRow; items: PublicGradingListRow[] }>();
    for (const r of filteredRows) {
      const key = `${r.grading_date || 'unscheduled'}|${r.start_time || ''}|${r.branch_id || ''}`;
      if (!map.has(key)) {
        map.set(key, { header: r, items: [] });
      }
      map.get(key)!.items.push(r);
    }
    return Array.from(map.values()).sort((a, b) => {
      const da = a.header.grading_date || '9999-12-31';
      const db = b.header.grading_date || '9999-12-31';
      if (da !== db) return da.localeCompare(db);
      const ta = a.header.start_time || '99:99:99';
      const tb = b.header.start_time || '99:99:99';
      return ta.localeCompare(tb);
    });
  }, [filteredRows]);

  return (
    <div className="min-h-screen bg-muted/30 py-6 px-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Grading List</h1>
          <p className="text-sm text-muted-foreground">
            Upcoming gradings and payment status
          </p>
        </div>

        <Card>
          <CardContent className="p-3">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All dates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All dates</SelectItem>
                {dateOptions.map((d) => (
                  <SelectItem key={d} value={d}>
                    {formatDate(d)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {isLoading && (
          <p className="text-center text-sm text-muted-foreground">Loading...</p>
        )}

        {!isLoading && groups.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No grading registrations found.
            </CardContent>
          </Card>
        )}

        {groups.map((g, idx) => (
          <Card key={idx}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between flex-wrap gap-2">
                <span>
                  {g.header.grading_date
                    ? formatDate(g.header.grading_date)
                    : 'Unscheduled'}
                  {g.header.start_time && (
                    <span className="text-muted-foreground ml-2 font-normal">
                      {g.header.start_time.slice(0, 5)}
                      {g.header.end_time ? `–${g.header.end_time.slice(0, 5)}` : ''}
                    </span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground font-normal">
                  {g.header.branch_name || g.header.branch_id || '—'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="divide-y">
                {g.items.map((r, i) => (
                  <li key={i} className="py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{r.student_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.current_belt || '—'}
                        {r.target_belt ? ` → ${r.target_belt}` : ''}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={statusVariant(r.paid_status)}
                    >
                      {r.paid_status}
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PublicGradingList;
