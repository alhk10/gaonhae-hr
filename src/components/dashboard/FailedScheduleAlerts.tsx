import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarX } from 'lucide-react';
import { formatDateTime } from '@/utils/dateFormat';

/**
 * Surfaces /hello payments where the chosen lesson times could not be saved
 * after the payment went through. These are only written to the chat event
 * log (`planned_schedule_failed`), so without this card staff would never see
 * them. Staff should open the invoice and confirm the schedule manually.
 */
const FailedScheduleAlerts: React.FC = () => {
  const { data: failures = [] } = useQuery({
    queryKey: ['planned-schedule-failures'],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('public_chat_events')
        .select('id, session_id, payload, created_at')
        .eq('step', 'planned_schedule_failed')
        .gte('created_at', since)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const events = data || [];
      const invoiceIds = [...new Set(events.map((e: any) => e.payload?.invoice_id).filter(Boolean))];
      let invoiceMap = new Map<string, any>();
      if (invoiceIds.length > 0) {
        const { data: invoices } = await supabase
          .from('invoices')
          .select('id, invoice_number, students(first_name, last_name)')
          .in('id', invoiceIds);
        invoiceMap = new Map((invoices || []).map((i: any) => [i.id, i]));
      }
      return events.map((e: any) => ({ ...e, invoice: invoiceMap.get(e.payload?.invoice_id) }));
    },
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  if (failures.length === 0) return null;

  return (
    <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
      <CardHeader className="px-3 py-3 sm:px-6 sm:py-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <CalendarX className="w-4 h-4 text-red-600" />
          Lesson Bookings Needing Attention
          <Badge variant="destructive" className="text-xs">{failures.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6 space-y-2">
        <p className="text-xs text-muted-foreground">
          These /hello payments went through, but saving the chosen lesson times failed. Please confirm the schedule with the parent and book the lessons manually.
        </p>
        {failures.map((f: any) => (
          <div key={f.id} className="p-2.5 sm:p-3 bg-background rounded-lg border text-sm">
            <p className="font-medium">
              {f.invoice?.invoice_number || 'Unknown invoice'}
              {f.invoice?.students && (
                <span className="font-normal text-muted-foreground">
                  {' '}— {f.invoice.students.first_name} {f.invoice.students.last_name}
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDateTime(new Date(f.created_at))}
              {f.payload?.error && <span className="block truncate">Error: {f.payload.error}</span>}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default FailedScheduleAlerts;
