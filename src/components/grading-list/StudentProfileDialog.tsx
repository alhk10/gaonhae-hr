/**
 * Read-only student card shown from any /access list (school fees, students,
 * grading, competitions, seminars, uniforms & guards). Shows who the student is
 * plus their invoices, with line items and payments on tap.
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { formatDate } from '@/utils/dateFormat';
import { formatCurrency } from '@/utils/currencyUtils';
import { calculateAgeYears } from '@/utils/birthDate';
import { getPublicStudentProfile } from '@/services/studentDirectoryService';

interface Props {
  studentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}


const Row: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex gap-2 text-xs">
      <span className="text-muted-foreground min-w-[92px]">{label}</span>
      <span className="font-medium break-all">{value}</span>
    </div>
  );
};

export const StudentProfileDialog: React.FC<Props> = ({ studentId, open, onOpenChange }) => {
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['public-student-profile', studentId],
    queryFn: () => getPublicStudentProfile(studentId!),
    enabled: open && !!studentId,
  });

  const student = data?.student;
  const enrolment = data?.enrolment;
  const invoices = data?.invoices || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            {student?.name || 'Student'}
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {!isLoading && !student && (
          <p className="text-xs text-muted-foreground">This student record could not be found.</p>
        )}

        {!isLoading && student && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
              <Row label="Student no." value={student.student_number} />
              <Row label="Branch" value={student.branch_name || student.branch_id} />
              <Row label="Belt" value={student.current_belt || '—'} />
              <Row label="Status" value={<span className="capitalize">{student.status}</span>} />
              <Row
                label="Birth date"
                value={
                  student.date_of_birth
                    ? `${formatDate(student.date_of_birth)}${
                        calculateAgeYears(student.date_of_birth) != null
                          ? ` (${calculateAgeYears(student.date_of_birth)} yrs)`
                          : ''
                      }`
                    : undefined
                }
              />
              <Row label="Gender" value={student.gender} />
              <Row label="Email" value={student.email} />
              <Row label="Phone" value={student.phone} />
              {(student.alt_emails || []).length > 0 && (
                <Row label="Other emails" value={student.alt_emails.join(', ')} />
              )}
              {(student.alt_phones || []).length > 0 && (
                <Row label="Other phones" value={student.alt_phones.join(', ')} />
              )}
              <Row label="Credits" value={formatCurrency(Number(student.credit_balance || 0))} />
            </div>

            {enrolment && (
              <>
                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                  <Row label="Term" value={enrolment.term_name} />
                  <Row label="Class" value={enrolment.class_type} />
                  <Row label="Package" value={enrolment.tier_name} />
                  <Row label="Days" value={(enrolment.enrolled_weekdays || []).join(', ')} />
                </div>
              </>
            )}

            <Separator />
            <div>
              <p className="text-xs font-semibold mb-1">Invoices ({invoices.length})</p>
              {invoices.length === 0 && (
                <p className="text-xs text-muted-foreground">No invoices yet.</p>
              )}
              <div className="space-y-1">
                {invoices.map((inv) => {
                  const isOpen = expanded === inv.id;
                  return (
                    <div key={inv.id} className="border rounded-md">
                      <button
                        type="button"
                        className="w-full text-left px-2 py-1.5 flex items-start gap-2"
                        onClick={() => setExpanded(isOpen ? null : inv.id)}
                      >
                        {isOpen ? (
                          <ChevronDown className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium">{inv.invoice_number}</span>
                            <StatusBadge status={inv.status} className="text-[10px]" />
                            <span className="text-[11px] text-muted-foreground">
                              {inv.issue_date ? formatDate(inv.issue_date) : ''}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Total {formatCurrency(Number(inv.total_amount || 0))} · Paid{' '}
                            {formatCurrency(Number(inv.amount_paid || 0))} · Balance{' '}
                            {formatCurrency(Number(inv.balance_due || 0))}
                          </div>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="px-2 pb-2 space-y-2">
                          <div>
                            <p className="text-[11px] font-semibold">Items</p>
                            {(inv.items || []).length === 0 && (
                              <p className="text-[11px] text-muted-foreground">No items.</p>
                            )}
                            {(inv.items || []).map((it) => (
                              <div key={it.id} className="flex justify-between gap-2 text-[11px]">
                                <span className="flex-1 break-words">
                                  {it.description}
                                  {Number(it.quantity || 1) > 1 ? ` x${it.quantity}` : ''}
                                </span>
                                <span>{formatCurrency(Number(it.total_amount || 0))}</span>
                              </div>
                            ))}
                            <div className="flex justify-between text-[11px] mt-1">
                              <span className="text-muted-foreground">Subtotal</span>
                              <span>{formatCurrency(Number(inv.subtotal || 0))}</span>
                            </div>
                            {Number(inv.tax_amount || 0) > 0 && (
                              <div className="flex justify-between text-[11px]">
                                <span className="text-muted-foreground">GST</span>
                                <span>{formatCurrency(Number(inv.tax_amount || 0))}</span>
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold">Payments</p>
                            {(inv.payments || []).length === 0 && (
                              <p className="text-[11px] text-muted-foreground">No payments recorded.</p>
                            )}
                            {(inv.payments || []).map((p) => (
                              <div key={p.id} className="flex justify-between gap-2 text-[11px]">
                                <span className="flex-1 break-words">
                                  {p.payment_number} · {p.payment_date ? formatDate(p.payment_date) : ''} ·{' '}
                                  {p.payment_method}
                                  {p.verification_status ? ` (${p.verification_status})` : ''}
                                </span>
                                <span>{formatCurrency(Number(p.amount || 0))}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StudentProfileDialog;
