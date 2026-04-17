/**
 * Grading Student Detail Dialog
 * Shows Invoice details and Class Attendance for a student in the grading list
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
import { formatDate } from '@/utils/dateFormat';
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, FileText, CalendarDays, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface GradingStudentDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string | null;
  studentName: string;
  branchId: string;
  termId: string;
  termStartDate: string;
  termEndDate: string;
}

interface InvoiceDetail {
  id: string;
  invoice_number: string;
  issue_date: string | null;
  due_date: string | null;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: string | null;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
  }>;
}

interface AttendanceRecord {
  id: string;
  class_date: string;
  status: string;
  timetable_id: string | null;
  class_type: string | null;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
}

const GradingStudentDetailDialog: React.FC<GradingStudentDetailDialogProps> = ({
  open,
  onOpenChange,
  studentId,
  studentName,
  branchId,
  termId,
  termStartDate,
  termEndDate,
}) => {
  const navigate = useNavigate();

  // Fetch invoice details for this student/term/branch
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<InvoiceDetail[]>({
    queryKey: ['grading-student-invoices', studentId, branchId, termId],
    queryFn: async () => {
      if (!studentId) return [];

      // Get all invoices for this student in this branch
      const { data: invoiceData, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, issue_date, due_date, total_amount, amount_paid, balance_due, status')
        .eq('student_id', studentId)
        .eq('branch_id', branchId);

      if (error) throw error;
      if (!invoiceData || invoiceData.length === 0) return [];

      const invoiceIds = invoiceData.map(i => i.id);

      // Get invoice items and filter by term_id in metadata
      const { data: items } = await supabase
        .from('invoice_items')
        .select('id, invoice_id, description, quantity, unit_price, total_amount, metadata')
        .in('invoice_id', invoiceIds);

      // Find invoices that have items with this term_id
      const termInvoiceIds = new Set<string>();
      (items || []).forEach(item => {
        const metadata = item.metadata as Record<string, any> | null;
        if (metadata?.term_id === termId) {
          termInvoiceIds.add(item.invoice_id);
        }
      });

      // Build result with items
      return invoiceData
        .filter(inv => termInvoiceIds.has(inv.id))
        .map(inv => ({
          ...inv,
          items: (items || [])
            .filter(item => item.invoice_id === inv.id)
            .map(item => ({
              id: item.id,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_amount: item.total_amount,
            })),
        }));
    },
    enabled: open && !!studentId,
  });

  // Fetch class attendance records for this student in term date range and branch
  const { data: attendanceRecords = [], isLoading: attendanceLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ['grading-student-attendance', studentId, branchId, termStartDate, termEndDate],
    queryFn: async () => {
      if (!studentId || !termStartDate || !termEndDate) return [];

      const { data, error } = await supabase
        .from('class_attendance')
        .select('id, class_date, status, timetable_id, notes')
        .eq('student_id', studentId)
        .eq('branch_id', branchId)
        .gte('class_date', termStartDate)
        .lte('class_date', termEndDate)
        .order('class_date', { ascending: true });

      if (error) throw error;

      // Fetch timetable info for class type
      const timetableIds = [...new Set((data || []).filter(d => d.timetable_id).map(d => d.timetable_id!))];
      let timetableMap: Record<string, any> = {};
      if (timetableIds.length > 0) {
        const { data: timetables } = await supabase
          .from('branch_timetables')
          .select('id, class_type, start_time, end_time')
          .in('id', timetableIds);
        (timetables || []).forEach(t => { timetableMap[t.id] = t; });
      }

      return (data || []).map(record => {
        const tt = record.timetable_id ? timetableMap[record.timetable_id] : null;
        return {
          id: record.id,
          class_date: record.class_date,
          status: record.status,
          timetable_id: record.timetable_id,
          class_type: tt?.class_type || null,
          start_time: tt?.start_time || null,
          end_time: tt?.end_time || null,
          notes: record.notes,
        };
      });
    },
    enabled: open && !!studentId,
  });

  const presentCount = attendanceRecords.filter(a => a.status === 'present').length;
  const absentCount = attendanceRecords.filter(a => a.status === 'absent').length;

  const formatTime = (time: string | null) => {
    if (!time) return '';
    try {
      const [h, m] = time.split(':');
      const hour = parseInt(h);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${ampm}`;
    } catch {
      return time;
    }
  };

  const isLoading = invoicesLoading || attendanceLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl">{studentName}</DialogTitle>
          <p className="text-sm text-muted-foreground">Invoice &amp; Attendance Details</p>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="flex-1 px-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 160px)' }}>
            <div className="space-y-5 pb-6">
              {/* Invoice Details Section */}
              <section>
                <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
                  <FileText className="w-4 h-4" />
                  Invoice Details
                </h3>
                {invoices.length === 0 ? (
                  <div className="bg-muted/50 rounded-lg p-4 text-center text-sm text-muted-foreground">
                    No invoices found for this term.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {invoices.map(invoice => (
                      <div key={invoice.id} className="bg-muted/50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{invoice.invoice_number}</span>
                            <Badge
                              variant={invoice.status === 'paid' ? 'success' : invoice.status === 'overdue' ? 'destructive' : 'secondary'}
                            >
                              {invoice.status || 'draft'}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              onOpenChange(false);
                              navigate(`/sales/invoices`);
                            }}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            View
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Date: </span>
                            <span>{invoice.issue_date ? formatDate(new Date(invoice.issue_date)) : '-'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total: </span>
                            <span className="font-medium">${invoice.total_amount.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Balance: </span>
                            <span className={invoice.balance_due > 0 ? 'text-destructive font-medium' : 'font-medium'}>
                              ${invoice.balance_due.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        {invoice.items.length > 0 && (
                          <div className="border-t border-border pt-2 mt-2">
                            <p className="text-xs text-muted-foreground mb-1">Items:</p>
                            {invoice.items.map(item => (
                              <div key={item.id} className="flex justify-between text-xs py-0.5">
                                <span>{item.description}</span>
                                <span className="text-muted-foreground">
                                  {item.quantity} × ${item.unit_price.toFixed(2)} = ${item.total_amount.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <Separator />

              {/* Class Attendance Section */}
              <section>
                <h3 className="flex items-center gap-2 text-sm font-semibold mb-2">
                  <CalendarDays className="w-4 h-4" />
                  Class Attendance
                </h3>
                <div className="flex gap-3 mb-3">
                  <Badge variant="success" className="text-xs">
                    Present: {presentCount}
                  </Badge>
                  <Badge variant="destructive" className="text-xs">
                    Absent: {absentCount}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Total: {attendanceRecords.length}
                  </Badge>
                </div>

                {attendanceRecords.length === 0 ? (
                  <div className="bg-muted/50 rounded-lg p-4 text-center text-sm text-muted-foreground">
                    No attendance records found for this term.
                  </div>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Date</TableHead>
                          <TableHead className="text-xs">Class</TableHead>
                          <TableHead className="text-xs">Time</TableHead>
                          <TableHead className="text-xs w-[80px] text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceRecords.map(record => (
                          <TableRow key={record.id}>
                            <TableCell className="text-xs py-1.5">
                              {format(new Date(record.class_date), 'dd MMM yyyy (EEE)')}
                            </TableCell>
                            <TableCell className="text-xs py-1.5">
                              {record.class_type || '-'}
                            </TableCell>
                            <TableCell className="text-xs py-1.5">
                              {record.start_time
                                ? `${formatTime(record.start_time)} - ${formatTime(record.end_time)}`
                                : '-'}
                            </TableCell>
                            <TableCell className="text-center py-1.5">
                              {record.status === 'present' ? (
                                <CheckCircle2 className="w-4 h-4 text-green-600 inline-block" />
                              ) : (
                                <XCircle className="w-4 h-4 text-destructive inline-block" />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </section>
            </div>
          </ScrollArea>
        )}

        <Separator />
        <div className="p-4 flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GradingStudentDetailDialog;
