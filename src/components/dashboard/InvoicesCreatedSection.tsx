import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useBranches } from '@/hooks/useBranches';
import { startOfWeek, startOfMonth, format } from 'date-fns';
import { FileText } from 'lucide-react';

const InvoicesCreatedSection = () => {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [branchId, setBranchId] = useState<string>('all');
  const { branches } = useBranches();

  const getDateRange = () => {
    const now = new Date();
    const start = period === 'week' ? startOfWeek(now, { weekStartsOn: 1 }) : startOfMonth(now);
    return { start: start.toISOString(), end: now.toISOString() };
  };

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices-created', period, branchId],
    queryFn: async () => {
      const { start, end } = getDateRange();
      let query = supabase
        .from('invoices')
        .select('id, invoice_number, total_amount, balance_due, status, created_at, student_id, students(first_name, last_name)')
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false });

      if (branchId !== 'all') {
        query = query.eq('branch_id', branchId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 30 * 1000,
  });

  const getStatusVariant = (status: string | null) => {
    switch (status) {
      case 'paid': return 'default';
      case 'partially_paid': return 'secondary';
      case 'overdue': return 'destructive';
      default: return 'outline';
    }
  };

  const formatStatus = (status: string | null) => {
    if (!status) return 'Draft';
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Hide when empty and not loading
  if (!isLoading && invoices.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="px-3 py-3 sm:px-6 sm:py-4 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Invoices
            <Badge variant="secondary" className="text-xs">{invoices.length}</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <ToggleGroup type="single" value={period} onValueChange={(v) => v && setPeriod(v as 'week' | 'month')} size="sm">
              <ToggleGroupItem value="week" className="text-xs px-2 h-7">This Week</ToggleGroupItem>
              <ToggleGroupItem value="month" className="text-xs px-2 h-7">This Month</ToggleGroupItem>
            </ToggleGroup>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger className="h-7 text-xs w-[130px]">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6 pt-0">
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No invoices found for this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs py-2">Student</TableHead>
                  <TableHead className="text-xs py-2 text-right">Amount</TableHead>
                  <TableHead className="text-xs py-2 text-right">Due</TableHead>
                  <TableHead className="text-xs py-2">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv: any) => (
                  <TableRow key={inv.id} className="text-sm">
                    <TableCell className="py-1.5">{(inv.students as any)?.name || 'Unknown'}</TableCell>
                    <TableCell className="py-1.5 text-right">${inv.total_amount?.toFixed(2)}</TableCell>
                    <TableCell className="py-1.5 text-right">${inv.balance_due?.toFixed(2)}</TableCell>
                    <TableCell className="py-1.5">
                      <Badge variant={getStatusVariant(inv.status)} className="text-[10px] px-1.5 py-0">
                        {formatStatus(inv.status)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InvoicesCreatedSection;
