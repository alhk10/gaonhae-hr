import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { postPaymentJournal, postInvoiceIssuedJournal } from '@/services/accountingPostings';
import { useSessionState } from '@/hooks/useSessionState';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import { 
  Search, 
  CheckCircle,
  XCircle,
  Filter,
  Plus,
  Eye,
  FileText,
  DollarSign,
  Edit,
  Trash2,
  ShieldCheck,
  ExternalLink,
  Settings,
  Download,
  Loader2,
  Users,
  Save,
  X,
  MessageSquare,
  MessageCircle,
  AlertCircle
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subMonths, isSameDay, startOfMonth, endOfMonth } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { toast } from 'sonner';
import { 
  getPendingRequestsByBranch, 
  approveRequest, 
  rejectRequest 
} from '@/services/studentUpdateRequestService';
import { useAuth } from '@/contexts/AuthContext';
import BranchWeeklyTimetable from './BranchWeeklyTimetable';
import BranchGradingList from './BranchGradingList';
import BranchCasualSchedule from './BranchCasualSchedule';
import { BranchSetupDialog } from '@/components/settings/BranchSetupDialog';
import InvoiceDialog from '@/components/sales/InvoiceDialog';
import CreatePaymentDialog from '@/components/sales/CreatePaymentDialog';
import ViewEditPaymentDialog from '@/components/sales/ViewEditPaymentDialog';
import { deleteInvoice, getInvoiceById } from '@/services/invoiceService';
import { getStudentById } from '@/services/studentService';
import { downloadInvoicePDF, shareInvoiceViaSMS, shareInvoiceViaWhatsApp, shareInvoiceOverdueReminderViaSMS, hasUsableMobileNumber, buildCombinedReminderMessage, normalizeWhatsAppTarget, type InvoiceData } from '@/utils/invoicePDFGenerator';
import { resolveInvoiceTermContext } from '@/utils/invoiceTermContext';
import { createInvoiceDeletionRequest } from '@/services/invoiceDeletionRequestService';
import { deletePayment } from '@/services/paymentService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import StudentDetailsDialog from './StudentDetailsDialog';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { getCurrentTerm, getMostRecentTerm, getUpcomingTerm, getNextTerm, getPreviousTerm, getTermById } from '@/services/termCalendarService';
import { formatCurrency } from '@/utils/currencyUtils';

import { Student } from '@/services/studentService';
import NoticeManagementTab from '@/components/notices/NoticeManagementTab';
import BranchInventoryTab from './BranchInventoryTab';
import StudentRegistrationApprovals from './StudentRegistrationApprovals';
import PublicGradingSubmissionApprovals from './PublicGradingSubmissionApprovals';
import PublicCompetitionSubmissionApprovals from './PublicCompetitionSubmissionApprovals';
import PublicGuardsPurchaseApprovals from './PublicGuardsPurchaseApprovals';
import NegativeInventoryAlert from './NegativeInventoryAlert';
import AddStudentDialog from '@/components/sales/AddStudentDialog';
import AddTrialDialog from '@/components/sales/AddTrialDialog';
import { getPendingRegistrationsCount } from '@/services/studentRegistrationService';
import { BELT_LEVELS } from '@/constants/beltLevels';
import { normalizePartyData } from '@/utils/partyUtils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createWithdrawalRequest, directWithdrawStudent } from '@/services/studentWithdrawalRequestService';
import { UserMinus } from 'lucide-react';

interface BranchDashboardProps {
  branchId: string;
}

const BranchDashboard: React.FC<BranchDashboardProps> = ({ branchId }) => {
  const { user, userrole } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const ns = `branch-dash:${branchId}`;
  const [activeTab, setActiveTab] = useSessionState(`${ns}:tab`, 'timetable');
  useScrollRestoration(branchId);
  const hasSetInitialTab = useRef(false);
  const [searchTerm, setSearchTerm] = useSessionState(`${ns}:searchTerm`, '');
  const [statusFilter, setStatusFilter] = useSessionState<string>(`${ns}:statusFilter`, 'active_inactive');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useSessionState<string>(`${ns}:invoiceStatusFilter`, 'unpaid');
  const [selectedStudentId, setSelectedStudentId] = useSessionState<string | null>(`${ns}:selectedStudentId`, null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentDetailsOpen, setStudentDetailsOpen] = useSessionState(`${ns}:studentDetailsOpen`, false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useSessionState<string | null>(`${ns}:invoiceId`, null);
  const [invoiceDialogMode, setInvoiceDialogMode] = useSessionState<'view' | 'edit'>(`${ns}:invoiceDialogMode`, 'view');
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useSessionState(`${ns}:invoiceDialogOpen`, false);
  const [createInvoiceForStudentId, setCreateInvoiceForStudentId] = useSessionState<string | null>(`${ns}:createInvoiceForStudentId`, null);
  const [createInvoiceOpen, setCreateInvoiceOpen] = useSessionState(`${ns}:createInvoiceOpen`, false);
  const [selectedPaymentId, setSelectedPaymentId] = useSessionState<string | null>(`${ns}:paymentId`, null);
  const [paymentDialogMode, setPaymentDialogMode] = useSessionState<'view' | 'edit'>(`${ns}:paymentDialogMode`, 'view');
  const [paymentDialogOpen, setPaymentDialogOpen] = useSessionState(`${ns}:paymentDialogOpen`, false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'invoice' | 'payment'; id: string; label: string } | null>(null);
  const [withdrawTarget, setWithdrawTarget] = useState<{ id: string; name: string } | null>(null);
  const [branchSetupOpen, setBranchSetupOpen] = useSessionState(`${ns}:branchSetupOpen`, false);
  
  const [invoiceDateFilterIso, setInvoiceDateFilterIso] = useSessionState<string | null>(`${ns}:invoiceDateFilterIso`, null);
  const invoiceDateFilter = useMemo<Date | undefined>(
    () => (invoiceDateFilterIso ? new Date(invoiceDateFilterIso) : undefined),
    [invoiceDateFilterIso]
  );
  const setInvoiceDateFilter = useCallback((d: Date | undefined) => {
    setInvoiceDateFilterIso(d ? d.toISOString() : null);
  }, [setInvoiceDateFilterIso]);
  const [invoiceNameFilter, setInvoiceNameFilter] = useSessionState(`${ns}:invoiceNameFilter`, '');
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<any>(null);
  const [massEditMode, setMassEditMode] = useState(false);
  const [massEditData, setMassEditData] = useState<Record<string, Record<string, string>>>({});
  const [massEditSaving, setMassEditSaving] = useState(false);
  const [showAddStudentDialog, setShowAddStudentDialog] = useSessionState(`${ns}:showAddStudentDialog`, false);
  const [showAddTrialDialog, setShowAddTrialDialog] = useSessionState(`${ns}:showAddTrialDialog`, false);
  const [rejectingPayment, setRejectingPayment] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejectingPayment, setIsRejectingPayment] = useState(false);

  // Restore selected student object on refresh from persisted id.
  useEffect(() => {
    let cancelled = false;
    if (selectedStudentId && !selectedStudent) {
      getStudentById(selectedStudentId)
        .then((s) => { if (!cancelled && s) setSelectedStudent(s as Student); })
        .catch(() => { if (!cancelled) setSelectedStudentId(null); });
    }
    if (!selectedStudentId && selectedStudent) {
      setSelectedStudent(null);
    }
    return () => { cancelled = true; };
  }, [selectedStudentId]);

  // Keep persisted id in sync when selection changes locally.
  useEffect(() => {
    if (selectedStudent && selectedStudent.id !== selectedStudentId) {
      setSelectedStudentId(selectedStudent.id);
    }
  }, [selectedStudent?.id]);

  const handleMassEditChange = useCallback((studentId: string, field: string, value: string) => {
    setMassEditData(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value }
    }));
  }, []);

  const handleMassEditSave = async () => {
    const changedIds = Object.keys(massEditData);
    if (changedIds.length === 0) {
      setMassEditMode(false);
      return;
    }
    setMassEditSaving(true);
    try {
      for (const studentId of changedIds) {
        const changes = massEditData[studentId];
        if (Object.keys(changes).length === 0) continue;
        // Convert "No belt" back to null for database constraint
        if (changes.current_belt === 'No belt') {
          changes.current_belt = null;
        }
        const normalized = normalizePartyData(changes);
        // If first_name or last_name changed, also update the name field
        const student = filteredStudents.find(s => s.id === studentId);
        if (student && (normalized.first_name || normalized.last_name)) {
          const firstName = normalized.first_name || student.first_name;
          const lastName = normalized.last_name !== undefined ? normalized.last_name : (student.last_name || '');
          normalized.name = `${firstName} ${lastName}`.trim();
        }
        const { error } = await supabase.from('students').update(normalized).eq('id', studentId);
        if (error) throw error;
      }
      toast.success(`Updated ${changedIds.length} student(s)`);
      setMassEditMode(false);
      setMassEditData({});
      queryClient.invalidateQueries({ queryKey: ['branch-students', branchId] });
      queryClient.invalidateQueries({ queryKey: ['grading-list-students', branchId] });
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setMassEditSaving(false);
    }
  };

  const handleVerifyPayment = useCallback(async (payment: any) => {
    const paymentsQueryKey = ['branch-payments', branchId] as const;
    const invoiceQueryPrefix = ['branch-invoices', branchId] as const;

    await queryClient.cancelQueries({ queryKey: paymentsQueryKey });
    await queryClient.cancelQueries({ queryKey: invoiceQueryPrefix });

    const previousPayments = queryClient.getQueryData<any[]>(paymentsQueryKey);
    const previousInvoiceQueries = queryClient.getQueriesData<any[]>({ queryKey: invoiceQueryPrefix });

    queryClient.setQueryData<any[]>(paymentsQueryKey, (current = []) =>
      current.map((entry) =>
        entry.id === payment.id
          ? {
              ...entry,
              is_verified: true,
              verified_by: user?.employeeId || null,
              verified_at: new Date().toISOString(),
            }
          : entry
      )
    );

    if (payment.invoice_id) {
      queryClient.setQueriesData<any[]>({ queryKey: invoiceQueryPrefix }, (current) => {
        if (!Array.isArray(current)) return current;

        return current.map((invoice) =>
          invoice.id === payment.invoice_id && invoice.status === 'paid'
            ? { ...invoice, status: 'verified' }
            : invoice
        );
      });
    }

    try {
      const verifiedAt = new Date().toISOString();
      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          is_verified: true,
          verified_by: user?.employeeId || null,
          verified_at: verifiedAt,
          verification_status: 'verified',
        })
        .eq('id', payment.id);

      if (paymentError) throw paymentError;

      if (payment.invoice_id) {
        const { error: invoiceError } = await supabase
          .from('invoices')
          .update({ status: 'verified' })
          .eq('id', payment.invoice_id)
          .eq('status', 'paid');

        if (invoiceError) throw invoiceError;
      }

      queryClient.invalidateQueries({ queryKey: paymentsQueryKey });
      queryClient.invalidateQueries({ queryKey: invoiceQueryPrefix });
      queryClient.invalidateQueries({ queryKey: ['outstanding-invoices', branchId] });
      queryClient.invalidateQueries({ queryKey: ['grading-list-count', branchId] });
      void postPaymentJournal(payment.id);
      if (payment.invoice_id) void postInvoiceIssuedJournal(payment.invoice_id);
      toast.success('Payment verified successfully');
    } catch (error) {
      queryClient.setQueryData(paymentsQueryKey, previousPayments);
      previousInvoiceQueries.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      toast.error('Failed to verify payment');
    }
  }, [branchId, queryClient, user?.employeeId]);

  const handleRejectPayment = useCallback(async () => {
    if (!rejectingPayment || !rejectionReason.trim()) return;
    setIsRejectingPayment(true);
    try {
      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          verification_status: 'rejected',
          verification_rejection_reason: rejectionReason.trim(),
          verified_by: user?.employeeId || null,
          verified_at: new Date().toISOString(),
        })
        .eq('id', rejectingPayment.id);
      if (paymentError) throw paymentError;

      if (rejectingPayment.invoice_id) {
        // Fetch the invoice fresh to ensure we have the correct total_amount
        const { data: invoiceRow } = await supabase
          .from('invoices')
          .select('total_amount')
          .eq('id', rejectingPayment.invoice_id)
          .maybeSingle();

        const { data: validPayments } = await supabase
          .from('payments')
          .select('amount, verification_status')
          .eq('invoice_id', rejectingPayment.invoice_id)
          .neq('id', rejectingPayment.id);

        const totalPaid = (validPayments || [])
          .filter((p: any) => p.verification_status !== 'rejected')
          .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
        const invoiceTotal = Number(invoiceRow?.total_amount ?? rejectingPayment.invoices?.total_amount ?? 0);
        const balanceDue = Math.max(0, invoiceTotal - totalPaid);
        const newStatus = invoiceTotal > 0 && balanceDue <= 0 ? 'paid' : totalPaid > 0 ? 'partially_paid' : 'unpaid';

        await supabase
          .from('invoices')
          .update({ amount_paid: totalPaid, balance_due: balanceDue, status: newStatus })
          .eq('id', rejectingPayment.invoice_id);
      }

      queryClient.invalidateQueries({ queryKey: ['branch-payments', branchId] });
      queryClient.invalidateQueries({ queryKey: ['branch-invoices', branchId] });
      queryClient.invalidateQueries({ queryKey: ['outstanding-invoices', branchId] });
      void postPaymentJournal(rejectingPayment.id);
      if (rejectingPayment.invoice_id) void postInvoiceIssuedJournal(rejectingPayment.invoice_id);
      toast.success('Payment verification rejected');
      setRejectingPayment(null);
      setRejectionReason('');
    } catch (error) {
      toast.error('Failed to reject payment');
    } finally {
      setIsRejectingPayment(false);
    }
  }, [rejectingPayment, rejectionReason, branchId, queryClient, user?.employeeId]);

  // Build the InvoiceData payload list to send. If the clicked student has an
  // email shared with siblings, combine all currently unpaid invoices for those
  // siblings (same branch only). Otherwise returns just the clicked invoice.
  const buildShareInvoicePayload = async (
    invoice: any
  ): Promise<{ invoices: InvoiceData[]; terms: any; bankInfo: string | undefined }> => {
    // Resolve branch country & bank-transfer template (shared by all invoices in this branch)
    let branchCountry = 'Singapore';
    if (invoice.branch_id) {
      const { data: branchData } = await supabase.from('branches').select('country').eq('id', invoice.branch_id).single();
      if (branchData?.country) branchCountry = branchData.country;
    }
    const countryCode = branchCountry === 'Australia' ? 'AU' : 'SG';
    const { data: templates } = await supabase.from('invoice_templates').select('bank_transfer_info').eq('country', countryCode).eq('is_active', true).limit(1);
    const template = templates?.[0] || null;
    const templateForInvoice = template ? { bank_transfer_info: template.bank_transfer_info || undefined } : undefined;

    // Always include the originally clicked invoice
    const clickedFull = await getInvoiceById(invoice.id);
    // Direct query for student email — avoids service-layer side-effects that
    // can cause silent fallback to single-invoice send.
    const { data: clickedStudent, error: stuErr } = await supabase
      .from('students')
      .select('id, first_name, last_name, email')
      .eq('id', invoice.student_id)
      .maybeSingle();
    if (stuErr) console.warn('[ShareInvoice] failed to load clicked student', stuErr);
    const clickedEmail = (clickedStudent?.email ?? '').trim().toLowerCase();

    // Resolve term context (anchored to the clicked invoice's items)
    const terms = await resolveInvoiceTermContext(invoice.branch_id, clickedFull?.items);

    // Helper: build full InvoiceData payload from a fetched invoice + student
    const toInvoiceData = (
      inv: any,
      full: any,
      student: { name: string; email?: string | null } | undefined
    ): InvoiceData => {
      const source = full ?? inv;
      return {
        id: inv.id,
        invoice_number: inv.invoice_number,
        issue_date: source.issue_date || null,
        due_date: source.due_date || null,
        subtotal: source.subtotal,
        tax_amount: source.tax_amount,
        discount_amount: source.discount_amount,
        total_amount: source.total_amount,
        amount_paid: source.amount_paid,
        balance_due: source.balance_due,
        notes: source.notes,
        status: source.status,
        student: student ? { name: student.name, email: student.email ?? null } : undefined,
        items: full?.items?.map((item: any) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_amount: item.total_amount,
          tax_rate: item.tax_rate,
          tax_amount: item.tax_amount,
          metadata: item.metadata,
        })) || [],
        branch: branch ? { name: branch.name, address: branch.address } : undefined,
        template: templateForInvoice,
      };
    };

    const clickedStudentName = clickedStudent
      ? `${clickedStudent.first_name || ''} ${clickedStudent.last_name || ''}`.trim() || 'Student'
      : 'Student';

    const clickedPayload = toInvoiceData(invoice, clickedFull, {
      name: clickedStudentName,
      email: clickedStudent?.email,
    });

    // No email → can't match siblings, just send the single clicked invoice
    if (!clickedEmail) {
      return { invoices: [clickedPayload], terms, bankInfo: template?.bank_transfer_info || undefined };
    }

    // No email → can't match siblings, just send the single clicked invoice
    if (!clickedEmail) {
      console.warn('[ShareInvoice] No email on clicked student → single-invoice send', { studentId: invoice.student_id });
      return { invoices: [clickedPayload], terms, bankInfo: template?.bank_transfer_info || undefined };
    }

    // Find siblings sharing this email (case-insensitive)
    const { data: siblings, error: sibErr } = await supabase
      .from('students')
      .select('id, first_name, last_name, email')
      .ilike('email', clickedEmail);
    if (sibErr) console.warn('[ShareInvoice] sibling lookup failed', sibErr);

    const siblingIds = (siblings || []).map((s: any) => s.id).filter((id: string) => id !== invoice.student_id);
    if (siblingIds.length === 0) {
      return { invoices: [clickedPayload], terms, bankInfo: template?.bank_transfer_info || undefined };
    }

    // Pull all currently unpaid invoices for the siblings within the same branch
    const { data: siblingInvoices, error: invErr } = await supabase
      .from('invoices')
      .select('id, invoice_number, student_id, balance_due, status, branch_id, issue_date, due_date, subtotal, tax_amount, discount_amount, total_amount, amount_paid, notes')
      .in('student_id', siblingIds)
      .eq('branch_id', invoice.branch_id)
      .in('status', ['draft', 'sent', 'unpaid', 'partial', 'partially_paid', 'overdue']);
    if (invErr) console.warn('[ShareInvoice] sibling invoices lookup failed', invErr);

    const otherInvoices = (siblingInvoices || []).filter((inv: any) => (inv.balance_due ?? 0) > 0);
    if (otherInvoices.length === 0) {
      return { invoices: [clickedPayload], terms, bankInfo: template?.bank_transfer_info || undefined };
    }

    // Build payloads for sibling invoices in parallel
    const siblingMap = new Map((siblings || []).map((s: any) => [s.id, s]));
    const siblingPayloads = await Promise.all(
      otherInvoices.map(async (inv: any) => {
        const full = await getInvoiceById(inv.id).catch(() => null);
        const sib = siblingMap.get(inv.student_id);
        const sibName = sib
          ? `${sib.first_name || ''} ${sib.last_name || ''}`.trim() || 'Student'
          : 'Student';
        return toInvoiceData(inv, full, { name: sibName, email: sib?.email });
      })
    );

    // Combine + dedupe by invoice id (clicked invoice first), then sort by student name → invoice number
    const all: InvoiceData[] = [clickedPayload, ...siblingPayloads];
    const seen = new Set<string>();
    const deduped = all.filter(p => (seen.has(p.id) ? false : (seen.add(p.id), true)));
    deduped.sort((a, b) => {
      const an = (a.student?.name || '').toLowerCase();
      const bn = (b.student?.name || '').toLowerCase();
      if (an !== bn) return an.localeCompare(bn);
      return (a.invoice_number || '').localeCompare(b.invoice_number || '');
    });

    return { invoices: deduped, terms, bankInfo: template?.bank_transfer_info || undefined };
  };

  // Handle Send invoice via SMS (opens device SMS app, no PDF)
  const handleShareSMS = async (invoice: any) => {
    try {
      const studentData = await getStudentById(invoice.student_id).catch(() => null);
      const number = (studentData?.whatsapp || studentData?.phone || '').trim();
      if (!number) {
        toast.error('No mobile number on file for this student');
        return;
      }

      const { invoices, terms } = await buildShareInvoicePayload(invoice);

      if (invoices.length === 1) {
        await shareInvoiceViaSMS(invoices[0], number, terms);
        return;
      }

      // Combined message for siblings
      const message = buildCombinedReminderMessage(invoices, terms);
      const cleanNumber = number.normalize('NFKC').replace(/[\s\-\(\)]/g, '');
      window.location.href = `sms:${cleanNumber}?&body=${encodeURIComponent(message)}`;

      const distinctStudents = new Set(invoices.map(i => i.student?.name?.trim() || '').filter(Boolean)).size;
      toast.success(`Combined reminder for ${invoices.length} invoices across ${distinctStudents} student(s).`);
    } catch (error) {
      console.error('Error sharing invoice via SMS:', error);
      toast.error('Failed to open SMS app');
    }
  };

  // Handle Send invoice via WhatsApp (whatsapp:// → wa.me fallback, mirrors the rich SMS message)
  const handleShareWhatsApp = async (invoice: any) => {
    try {
      const studentData = await getStudentById(invoice.student_id).catch(() => null);
      const candidate = studentData?.whatsapp || studentData?.phone || '';
      if (!hasUsableMobileNumber(candidate)) {
        toast.error('No mobile number on file for this student');
        return;
      }
      const number = candidate;

      const { invoices, terms } = await buildShareInvoicePayload(invoice);

      if (invoices.length === 1) {
        await shareInvoiceViaWhatsApp(invoices[0], number, terms);
        return;
      }

      // Combined message for siblings
      const message = buildCombinedReminderMessage(invoices, terms);
      const digits = normalizeWhatsAppTarget(number);
      if (!digits) {
        toast.error('No valid mobile number to send WhatsApp message to');
        return;
      }
      const encoded = encodeURIComponent(message);
      const appUrl = `whatsapp://send?phone=${digits}&text=${encoded}`;
      const webUrl = `https://wa.me/${digits}?text=${encoded}`;

      const startedAt = Date.now();
      let fellBack = false;
      const fallback = () => {
        if (fellBack) return;
        fellBack = true;
        window.open(webUrl, '_blank', 'noopener,noreferrer');
      };
      try {
        window.location.href = appUrl;
      } catch {
        fallback();
      }
      window.setTimeout(() => {
        if (Date.now() - startedAt < 2500 && document.visibilityState === 'visible') {
          fallback();
        }
      }, 800);

      const distinctStudents = new Set(invoices.map(i => i.student?.name?.trim() || '').filter(Boolean)).size;
      toast.success(`Combined reminder for ${invoices.length} invoices across ${distinctStudents} student(s).`);
    } catch (error) {
      console.error('Error sharing invoice via WhatsApp:', error);
      toast.error('Failed to open WhatsApp');
    }
  };

  // Helper: is this invoice overdue?
  const isOverdue = (invoice: any): boolean => {
    if (!invoice?.due_date) return false;
    if ((invoice.balance_due ?? 0) <= 0) return false;
    if (['cancelled', 'paid', 'verified'].includes(invoice.status)) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(invoice.due_date) < today;
  };

  // Handle Send overdue reminder via SMS
  const handleShareOverdueSMS = async (invoice: any) => {
    try {
      const studentData = await getStudentById(invoice.student_id).catch(() => null);
      const number = (studentData?.whatsapp || studentData?.phone || '').trim();
      if (!number) {
        toast.error('No mobile number on file for this student');
        return;
      }

      const fullInvoice = await getInvoiceById(invoice.id);

      let branchCountry = 'Singapore';
      if (invoice.branch_id) {
        const { data: branchData } = await supabase.from('branches').select('country').eq('id', invoice.branch_id).single();
        if (branchData?.country) branchCountry = branchData.country;
      }
      const countryCode = branchCountry === 'Australia' ? 'AU' : 'SG';
      const { data: templates } = await supabase.from('invoice_templates').select('bank_transfer_info').eq('country', countryCode).eq('is_active', true).limit(1);
      const template = templates?.[0] || null;

      const sourceInvoice = fullInvoice ?? invoice;
      const invoiceData: InvoiceData = {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        issue_date: sourceInvoice.issue_date || null,
        due_date: sourceInvoice.due_date || null,
        subtotal: sourceInvoice.subtotal,
        tax_amount: sourceInvoice.tax_amount,
        discount_amount: sourceInvoice.discount_amount,
        total_amount: sourceInvoice.total_amount,
        amount_paid: sourceInvoice.amount_paid,
        balance_due: sourceInvoice.balance_due,
        notes: sourceInvoice.notes,
        status: sourceInvoice.status,
        items: fullInvoice?.items?.map((item: any) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_amount: item.total_amount,
          tax_rate: item.tax_rate,
          tax_amount: item.tax_amount,
        })) || [],
        branch: branch ? { name: branch.name, address: branch.address } : undefined,
        template: template ? { bank_transfer_info: template.bank_transfer_info || undefined } : undefined,
      };

      // Resolve current term for the message body
      let currentTerm: { name?: string; start_date?: string; end_date?: string } | null = null;
      if (invoice.branch_id) {
        const current = (await getCurrentTerm(invoice.branch_id)) || (await getMostRecentTerm(invoice.branch_id));
        if (current) currentTerm = { name: current.name, start_date: current.start_date, end_date: current.end_date };
      }

      // Days overdue (whole days)
      let daysOverdue: number | null = null;
      if (sourceInvoice.due_date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(sourceInvoice.due_date);
        due.setHours(0, 0, 0, 0);
        const diff = Math.floor((today.getTime() - due.getTime()) / 86_400_000);
        daysOverdue = Math.max(1, diff);
      }

      await shareInvoiceOverdueReminderViaSMS(invoiceData, number, { currentTerm, daysOverdue });
    } catch (error) {
      console.error('Error sharing overdue reminder via SMS:', error);
      toast.error('Failed to open SMS app');
    }
  };

  // Handle PDF download for invoice
  const handleDownloadPDF = async (invoice: any) => {
    try {
      setPdfLoadingId(invoice.id);
      const fullInvoice = await getInvoiceById(invoice.id);
      let studentData;
      try { studentData = await getStudentById(invoice.student_id); } catch { studentData = null; }
      
      let branchCountry = 'Singapore';
      if (invoice.branch_id) {
        const { data: branchData } = await supabase.from('branches').select('country').eq('id', invoice.branch_id).single();
        if (branchData?.country) branchCountry = branchData.country;
      }
      const countryCode = branchCountry === 'Australia' ? 'AU' : 'SG';
      const { data: templates } = await supabase.from('invoice_templates').select('letterhead_url, paynow_qr_url, country, default_notes, footer_text, bank_transfer_info').eq('country', countryCode).eq('is_active', true).limit(1);
      const template = templates?.[0] || null;

      const termIds: string[] = [];
      const gradingSlotIds: string[] = [];
      fullInvoice?.items?.forEach((item: any) => {
        const metadata = item.metadata as { term_id?: string; grading_slot_id?: string } | null;
        if (metadata?.term_id) termIds.push(metadata.term_id);
        if (metadata?.grading_slot_id) gradingSlotIds.push(metadata.grading_slot_id);
      });

      const termMap: Record<string, any> = {};
      if (termIds.length > 0) {
        const { data: termsData } = await supabase.from('term_calendars').select('id, name, start_date, end_date').in('id', termIds);
        termsData?.forEach(t => { termMap[t.id] = t; });
      }
      const gradingMap: Record<string, any> = {};
      if (gradingSlotIds.length > 0) {
        const { data: gradingData } = await supabase.from('grading_slots').select('id, grading_date, start_time').in('id', gradingSlotIds);
        gradingData?.forEach(s => { gradingMap[s.id] = s; });
      }

      const fmtShort = (d: string) => { try { return formatDate(d); } catch { return d; } };
      const fmtFull = (d: string) => { try { return formatDate(d); } catch { return d; } };

      const sourceInvoice = fullInvoice ?? invoice;

      const invoiceData: InvoiceData = {
        id: invoice.id, invoice_number: invoice.invoice_number,
        issue_date: sourceInvoice.issue_date || null, due_date: sourceInvoice.due_date || null,
        subtotal: sourceInvoice.subtotal, tax_amount: sourceInvoice.tax_amount, discount_amount: sourceInvoice.discount_amount,
        total_amount: sourceInvoice.total_amount, amount_paid: sourceInvoice.amount_paid, balance_due: sourceInvoice.balance_due,
        notes: sourceInvoice.notes, status: sourceInvoice.status,
        student: studentData ? { name: `${studentData.first_name} ${studentData.last_name}`, address: studentData.address, phone: studentData.phone, email: studentData.email } : undefined,
        items: fullInvoice?.items?.map((item: any) => {
          const metadata = item.metadata as { term_id?: string; grading_slot_id?: string } | null;
          let term_info: string | undefined;
          let grading_info: string | undefined;
          if (metadata?.term_id && termMap[metadata.term_id]) {
            const t = termMap[metadata.term_id];
            term_info = `${t.name} (${fmtShort(t.start_date)} - ${fmtShort(t.end_date)})`;
          }
          if (metadata?.grading_slot_id && gradingMap[metadata.grading_slot_id]) {
            const s = gradingMap[metadata.grading_slot_id];
            grading_info = s.start_time ? `${fmtFull(s.grading_date)} at ${s.start_time.substring(0, 5)}` : fmtFull(s.grading_date);
          }
          return { id: item.id, description: item.description, quantity: item.quantity, unit_price: item.unit_price, total_amount: item.total_amount, tax_rate: item.tax_rate, tax_amount: item.tax_amount, metadata, term_info, grading_info };
        }) || [],
        branch: branch ? { name: branch.name, address: branch.address } : undefined,
        template: template ? { letterhead_url: template.letterhead_url || undefined, paynow_qr_url: template.paynow_qr_url || undefined, country: template.country || undefined, default_notes: template.default_notes || undefined, footer_text: template.footer_text || undefined, bank_transfer_info: template.bank_transfer_info || undefined } : undefined
      };
      await downloadInvoicePDF(invoiceData);
      toast.success('Invoice PDF downloaded');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setPdfLoadingId(null);
    }
  };

  // Fetch branch info
  const { data: branch } = useQuery({
    queryKey: ['branch', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('id', branchId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!branchId,
  });

  // Fetch students for this branch
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['branch-students', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('branch_id', branchId)
        .neq('status', 'withdrawn')
        .order('first_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!branchId,
  });

  // Fetch invoices for this branch with student names (last 6 months)
  const sixMonthsAgo = subMonths(new Date(), 6);
  const { data: invoices = [] } = useQuery({
    queryKey: ['branch-invoices', branchId, invoiceStatusFilter, 'last-6-months'],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select('*, students(first_name, last_name)')
        .eq('branch_id', branchId)
        .gte('created_at', sixMonthsAgo.toISOString())
        .order('created_at', { ascending: false });

      if (invoiceStatusFilter === 'unpaid') {
        query = query.in('status', ['draft', 'sent', 'unpaid', 'partial', 'partially_paid', 'overdue']);
      } else if (invoiceStatusFilter === 'paid') {
        query = query.in('status', ['paid', 'verified']);
      } else if (invoiceStatusFilter === 'cancelled') {
        query = query.eq('status', 'cancelled');
      } else if (invoiceStatusFilter === 'replaced') {
        query = query.eq('status', 'replaced');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!branchId,
  });

  // Fetch payments for this branch's invoices
  const { data: payments = [] } = useQuery({
    queryKey: ['branch-payments', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, invoices!inner(invoice_number, branch_id, total_amount, status, students(first_name, last_name))')
        .eq('invoices.branch_id', branchId)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!branchId,
  });

  // Fetch pending update requests
  const { data: pendingRequests = [], refetch: refetchRequests } = useQuery({
    queryKey: ['pending-requests', branchId],
    queryFn: () => getPendingRequestsByBranch(branchId),
    enabled: !!branchId,
  });

  // Fetch current term for this branch
  const { data: currentTerm } = useQuery({
    queryKey: ['current-term', branchId],
    queryFn: () => getCurrentTerm(branchId),
    enabled: !!branchId,
  });

  // Fetch upcoming term as preferred fallback during inter-term gaps
  const { data: upcomingTerm } = useQuery({
    queryKey: ['upcoming-term', branchId],
    queryFn: () => getUpcomingTerm(branchId),
    enabled: !!branchId && !currentTerm,
  });

  // Fetch most recent term as final fallback (for grading metrics when no current/upcoming term)
  const { data: mostRecentTerm } = useQuery({
    queryKey: ['most-recent-term', branchId],
    queryFn: () => getMostRecentTerm(branchId),
    enabled: !!branchId && !currentTerm && !upcomingTerm,
  });

  // Precedence: current → upcoming (covers inter-term gap) → most recent past
  const displayTerm = currentTerm || upcomingTerm || mostRecentTerm || null;

  // Fetch active students (students who have paid invoices this term)
  const { data: activeStudentIds = [] } = useQuery({
    queryKey: ['active-students-paid', branchId, currentTerm?.id],
    queryFn: async () => {
      if (!currentTerm) return [];
      
      const { data: paidInvoices } = await supabase
        .from('invoices')
        .select('student_id')
        .eq('branch_id', branchId)
        .eq('status', 'paid')
        .gte('issue_date', currentTerm.start_date)
        .lte('issue_date', currentTerm.end_date);
      
      const uniqueStudentIds = [...new Set((paidInvoices || []).map(inv => inv.student_id))];
      return uniqueStudentIds;
    },
    enabled: !!branchId && !!currentTerm,
  });

  // Fetch outstanding invoice count + amount for current/display term.
  // Match invoices via line-item metadata.term_id (consistent with Students/Grading tabs),
  // not invoice issue_date — so upcoming-term drafts issued before term start are included.
  const { data: outstandingData = { count: 0, amount: 0 } } = useQuery({
    queryKey: ['outstanding-invoices', branchId, displayTerm?.id],
    queryFn: async () => {
      if (!displayTerm) return { count: 0, amount: 0 };

      const UNPAID = ['unpaid', 'partial', 'partially_paid', 'draft', 'sent', 'overdue'];

      const { data: items } = await supabase
        .from('invoice_items')
        .select(`
          metadata,
          invoices!inner (
            id,
            balance_due,
            status,
            branch_id
          )
        `)
        .eq('invoices.branch_id', branchId)
        .in('invoices.status', UNPAID);

      const map = new Map<string, number>();
      (items || []).forEach((row: any) => {
        const md = row.metadata as Record<string, any> | null;
        if (md?.term_id !== displayTerm.id) return;
        const inv = row.invoices;
        if (!inv) return;
        if (!map.has(inv.id)) map.set(inv.id, Number(inv.balance_due) || 0);
      });

      const balances = Array.from(map.values());
      return {
        count: balances.length,
        amount: balances.reduce((s, n) => s + n, 0),
      };
    },
    enabled: !!branchId && !!displayTerm,
  });

  // Fetch grading metrics: grading paid, ready for grading, term paid counts
  const { data: gradingMetrics = { total: 0, gradingPaid: 0, ready: 0, termPaid: 0, totalTermStudents: 0 } } = useQuery({
    queryKey: ['grading-list-count', branchId, displayTerm?.id],
    queryFn: async () => {
      if (!displayTerm) return { total: 0, gradingPaid: 0, ready: 0, termPaid: 0, totalTermStudents: 0 };
      const termToUse = displayTerm;
      // Get lesson products first (needed for both grading metrics and total term students)
      const { data: lessonProducts } = await supabase
        .from('products')
        .select('id')
        .eq('is_lesson', true);

      const lessonProductIds = (lessonProducts || []).map(p => p.id);

      // Count total term students (all students with lesson invoices for this term, any non-cancelled status)
      let totalTermStudents = 0;
      if (lessonProductIds.length > 0) {
        const { data: allTermInvoiceItems } = await supabase
          .from('invoice_items')
          .select(`
            metadata,
            invoices!inner (
              student_id,
              branch_id,
              status
            )
          `)
          .in('product_id', lessonProductIds)
          .eq('invoices.branch_id', branchId)
          .in('invoices.status', ['draft', 'sent', 'unpaid', 'partial', 'partially_paid', 'overdue', 'paid', 'verified']);

        const allTermStudentIds = new Set<string>();
        (allTermInvoiceItems || []).forEach(item => {
          const metadata = item.metadata as Record<string, any> | null;
          if (metadata?.term_id === termToUse.id) {
            allTermStudentIds.add((item.invoices as any).student_id);
          }
        });
        totalTermStudents = allTermStudentIds.size;
      }

      // Get grading registrations filtered by term_id
      const { data: registrations } = await supabase
        .from('grading_registrations')
        .select('id, student_id, invoice_item_id, ready_for_grading')
        .eq('term_id', termToUse.id);

      if (!registrations || registrations.length === 0) return { total: 0, gradingPaid: 0, ready: 0, termPaid: 0, totalTermStudents };

      // Get unique students (total)
      const allStudentIds = new Set(registrations.map(r => r.student_id));
      const total = allStudentIds.size;

      // Count ready for grading (unique students)
      const readyStudentIds = new Set(
        registrations.filter(r => r.ready_for_grading === true).map(r => r.student_id)
      );
      const ready = readyStudentIds.size;

      // Get invoice_item_ids to check grading payment status
      const gradingItemIds = registrations
        .filter(r => r.invoice_item_id)
        .map(r => r.invoice_item_id as string);

      let gradingPaid = 0;
      if (gradingItemIds.length > 0) {
        const { data: paidItems } = await supabase
          .from('invoice_items')
          .select('id, invoices!inner(status, student_id)')
          .in('id', gradingItemIds)
          .in('invoices.status', ['paid', 'verified']);

        const paidStudentIds = new Set(
          (paidItems || []).map(item => (item.invoices as any).student_id)
        );
        gradingPaid = paidStudentIds.size;
      }

      // Count term paid: students with paid lesson invoices for this term
      let termPaid = 0;

      if (lessonProductIds.length > 0) {
        const { data: invoiceItems } = await supabase
          .from('invoice_items')
          .select(`
            metadata,
            invoices!inner (
              student_id,
              branch_id,
              status
            )
          `)
          .in('product_id', lessonProductIds)
          .eq('invoices.branch_id', branchId)
          .in('invoices.status', ['paid', 'verified']);

        const termPaidStudentIds = new Set<string>();
        (invoiceItems || []).forEach(item => {
          const metadata = item.metadata as Record<string, any> | null;
          if (metadata?.term_id === termToUse.id) {
            const studentId = (item.invoices as any).student_id;
            if (allStudentIds.has(studentId)) {
              termPaidStudentIds.add(studentId);
            }
          }
        });
        termPaid = termPaidStudentIds.size;
      }

      return { total, gradingPaid, ready, termPaid, totalTermStudents };
    },
    enabled: !!branchId && !!displayTerm,
  });

  const gradingListCount = gradingMetrics.total;
  const gradingPaidCount = gradingMetrics.gradingPaid;
  const gradingReadyCount = gradingMetrics.ready;
  const gradingTermPaidCount = gradingMetrics.termPaid;
  const totalTermStudents = gradingMetrics.totalTermStudents;

  // Fetch IDs of students who have ANY non-cancelled lesson invoice for the displayTerm
  const { data: invoicedTermStudentIdsArr = [] } = useQuery({
    queryKey: ['invoiced-term-student-ids', branchId, displayTerm?.id],
    queryFn: async () => {
      if (!displayTerm) return [] as string[];
      const { data: lessonProducts } = await supabase
        .from('products')
        .select('id')
        .eq('is_lesson', true);
      const lessonProductIds = (lessonProducts || []).map(p => p.id);
      if (lessonProductIds.length === 0) return [] as string[];

      const { data: invoiceItems } = await supabase
        .from('invoice_items')
        .select(`
          metadata,
          invoices!inner (
            student_id,
            branch_id,
            status
          )
        `)
        .in('product_id', lessonProductIds)
        .eq('invoices.branch_id', branchId)
        .neq('invoices.status', 'cancelled');

      const ids = new Set<string>();
      (invoiceItems || []).forEach(item => {
        const metadata = item.metadata as Record<string, any> | null;
        if (metadata?.term_id === displayTerm.id) {
          ids.add((item.invoices as any).student_id);
        }
      });
      return Array.from(ids);
    },
    enabled: !!branchId && !!displayTerm,
  });
  const invoicedTermStudentIds = React.useMemo(
    () => new Set(invoicedTermStudentIdsArr),
    [invoicedTermStudentIdsArr]
  );

  // Counts for the Uninvoiced filter UI (active+inactive students for displayTerm)
  const eligibleTermStudents = React.useMemo(
    () => students.filter(s => {
      const st = s.status?.toLowerCase();
      return st === 'active' || st === 'inactive';
    }),
    [students]
  );
  const totalActiveTerm = eligibleTermStudents.length;
  const uninvoicedCount = React.useMemo(
    () => displayTerm
      ? eligibleTermStudents.filter(s => !invoicedTermStudentIds.has(s.id)).length
      : 0,
    [eligibleTermStudents, invoicedTermStudentIds, displayTerm]
  );

  // Check if casual employees have bookings this month
  const { data: hasCasualBookings = false } = useQuery({
    queryKey: ['casual-bookings-exists', branchId],
    queryFn: async () => {
      const now = new Date();
      const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
      const { count, error } = await supabase
        .from('slot_bookings' as any)
        .select('id', { count: 'exact', head: true })
        .eq('branch_id', branchId)
        .eq('status', 'approved')
        .gte('booking_date', monthStart)
        .lte('booking_date', monthEnd);
      if (error) return false;
      return (count || 0) > 0;
    },
    enabled: !!branchId,
  });

  const activeStudentsCount = activeStudentIds.length;
  const branchCurrency = branch?.currency || 'SGD';

  const unverifiedPayments = payments.filter(
    (p: any) => !p.is_verified && p.proof_of_payment_url && p.payment_method !== 'cash' && (!p.verification_status || p.verification_status === 'pending')
  );

  const { data: pendingRegCount = 0 } = useQuery({
    queryKey: ['pending-registrations-count', branchId],
    queryFn: () => getPendingRegistrationsCount(branchId),
    enabled: !!branchId,
  });

  const hasApprovals = pendingRequests.length > 0 || unverifiedPayments.length > 0 || pendingRegCount > 0;

  const invalidateAllBranchData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['branch-invoices', branchId] });
    queryClient.invalidateQueries({ queryKey: ['branch-payments', branchId] });
    queryClient.invalidateQueries({ queryKey: ['outstanding-invoices', branchId] });
    queryClient.invalidateQueries({ queryKey: ['grading-list-count', branchId] });
    queryClient.invalidateQueries({ queryKey: ['active-students-paid', branchId] });
    queryClient.invalidateQueries({ queryKey: ['scheduled-classes', branchId] });
    queryClient.invalidateQueries({ queryKey: ['week-attendance', branchId] });
    queryClient.invalidateQueries({ queryKey: ['branch-students', branchId] });
    queryClient.invalidateQueries({ queryKey: ['invoiced-term-student-ids', branchId] });
  }, [queryClient, branchId]);

  // Realtime subscription for invoice/payment/registration changes to auto-refresh all metrics
  useEffect(() => {
    const invalidateRegistrations = () => {
      queryClient.invalidateQueries({ queryKey: ['pending-registrations-count', branchId] });
      queryClient.invalidateQueries({ queryKey: ['pending-registrations', branchId, false] });
      queryClient.invalidateQueries({ queryKey: ['pending-registrations'] });
    };

    const invalidateApprovalCounts = () => {
      // Refreshes the Approvals tab badge by invalidating every contributing query
      queryClient.invalidateQueries({ queryKey: ['pending-requests', branchId] });
      queryClient.invalidateQueries({ queryKey: ['pending-requests'] });
      queryClient.invalidateQueries({ queryKey: ['branch-payments', branchId] });
      invalidateRegistrations();
      // Approval list query keys (so open lists also refresh)
      queryClient.invalidateQueries({ queryKey: ['pending-withdrawal-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-invoice-deletions'] });
      queryClient.invalidateQueries({ queryKey: ['pending-payment-deletions'] });
      queryClient.invalidateQueries({ queryKey: ['pending-invoice-actions'] });
      queryClient.invalidateQueries({ queryKey: ['pending-discount-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['pending-slot-booking-edits'] });
      queryClient.invalidateQueries({ queryKey: ['pending-slot-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['pending-grading-deletions'] });
      queryClient.invalidateQueries({ queryKey: ['pending-stock-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['pending-inventory-orders'] });
      queryClient.invalidateQueries({ queryKey: ['pending-leave-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['pending-claims-approvals'] });
    };

    const channel = supabase
      .channel(`branch-data-${branchId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices', filter: `branch_id=eq.${branchId}` }, () => {
        invalidateAllBranchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        invalidateAllBranchData();
        invalidateApprovalCounts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoice_items' }, () => {
        queryClient.invalidateQueries({ queryKey: ['invoiced-term-student-ids', branchId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_scheduled_classes' }, () => {
        queryClient.invalidateQueries({ queryKey: ['scheduled-classes', branchId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_registrations', filter: `branch_id=eq.${branchId}` }, () => {
        invalidateRegistrations();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_update_requests' }, () => {
        invalidateApprovalCounts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_withdrawal_requests' }, () => {
        invalidateApprovalCounts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoice_deletion_requests' }, () => {
        invalidateApprovalCounts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_deletion_requests' }, () => {
        invalidateApprovalCounts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoice_action_requests' }, () => {
        invalidateApprovalCounts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoice_discount_approval_requests' }, () => {
        invalidateApprovalCounts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'slot_booking_edit_requests' }, () => {
        invalidateApprovalCounts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'slot_bookings_new' }, () => {
        invalidateApprovalCounts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'grading_deletion_requests' }, () => {
        invalidateApprovalCounts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_transfer_requests' }, () => {
        invalidateApprovalCounts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_orders' }, () => {
        invalidateApprovalCounts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, () => {
        invalidateApprovalCounts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'claims' }, () => {
        invalidateApprovalCounts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [branchId, queryClient, invalidateAllBranchData]);

  // Auto-switch to Approvals tab on first load OR when approvals first appear (e.g. realtime insert).
  // Skip the initial auto-switch when a persisted tab from sessionStorage exists (resume-on-refresh).
  const hadPersistedTabRef = useRef(
    typeof window !== 'undefined' &&
      window.sessionStorage.getItem(`lov-resume:${ns}:tab`) !== null
  );
  const prevHasApprovalsRef = useRef(false);
  useEffect(() => {
    if (!hasSetInitialTab.current) {
      if (hasApprovals && !hadPersistedTabRef.current) {
        setActiveTab('approvals');
      }
      hasSetInitialTab.current = true;
      prevHasApprovalsRef.current = hasApprovals;
      return;
    }
    // After initial mount: if approvals transition from 0 -> >0 and user hasn't navigated away from default tab, switch
    if (!prevHasApprovalsRef.current && hasApprovals && activeTab === 'timetable') {
      setActiveTab('approvals');
    }
    prevHasApprovalsRef.current = hasApprovals;
  }, [pendingRequests, unverifiedPayments, pendingRegCount, hasApprovals, activeTab]);

  const filteredStudents = students.filter(student => {
    // Always exclude withdrawn students
    if (student.status?.toLowerCase() === 'withdrawn') return false;
    
    const displayName = (student.display_name || `${student.first_name} ${student.last_name}`).toLowerCase();
    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
    const matchesSearch = displayName.includes(searchTerm.toLowerCase()) ||
           fullName.includes(searchTerm.toLowerCase()) ||
           student.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = false;
    const studentStatus = student.status?.toLowerCase() || '';
    if (statusFilter === 'active_inactive') {
      matchesStatus = studentStatus === 'active' || studentStatus === 'inactive';
    } else if (statusFilter === 'active') {
      matchesStatus = studentStatus === 'active';
    } else if (statusFilter === 'inactive') {
      matchesStatus = studentStatus === 'inactive';
    } else if (statusFilter === 'trial') {
      matchesStatus = studentStatus === 'trial';
    } else if (statusFilter === 'uninvoiced_term') {
      matchesStatus =
        (studentStatus === 'active' || studentStatus === 'inactive') &&
        !!displayTerm &&
        !invoicedTermStudentIds.has(student.id);
    }
    
    return matchesSearch && matchesStatus;
  });

  const handleApproveRequest = async (requestId: string) => {
    if (!user?.employeeId) return;
    
    const success = await approveRequest(requestId, user.employeeId);
    if (success) {
      toast.success('Changes approved and applied');
      refetchRequests();
    } else {
      toast.error('Failed to approve changes');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!user?.employeeId) return;
    
    const success = await rejectRequest(requestId, user.employeeId, 'Rejected by branch manager');
    if (success) {
      toast.success('Request rejected');
      refetchRequests();
    } else {
      toast.error('Failed to reject request');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'invoice') {
        if (userrole !== 'superadmin') {
          await createInvoiceDeletionRequest(deleteTarget.id);
          toast.success('Deletion request submitted for superadmin approval');
        } else {
          await deleteInvoice(deleteTarget.id);
          toast.success('Invoice deleted');
        }
      } else {
        await deletePayment(deleteTarget.id);
        toast.success('Payment deleted');
      }
      invalidateAllBranchData();
    } catch (error: any) {
      toast.error(error?.message || `Failed to delete ${deleteTarget.type}`);
    } finally {
      setDeleteTarget(null);
    }
  };

  const refreshData = () => {
    invalidateAllBranchData();
  };

  return (
    <div className="space-y-6">
      <NegativeInventoryAlert branchId={branchId} />
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-2xl font-bold text-foreground">
          {branch?.name || 'Loading...'} Dashboard
        </h2>
        {userrole === 'superadmin' && branch && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBranchSetupOpen(true)}
            className="gap-1.5"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Branch Setup</span>
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="timetable" className="text-xs sm:text-sm">Weekly Timetable</TabsTrigger>
          <TabsTrigger value="students" className="text-xs sm:text-sm">Students{displayTerm ? ` (${uninvoicedCount}/${totalActiveTerm})` : ''}</TabsTrigger>
          <TabsTrigger value="invoices" className="text-xs sm:text-sm">Invoice & Payment ({outstandingData.count} | {formatCurrency(outstandingData.amount, branchCurrency)})</TabsTrigger>
          <TabsTrigger value="grading" className="text-xs sm:text-sm">Grading ({gradingPaidCount}/{totalTermStudents})</TabsTrigger>
          {hasCasualBookings && (
            <TabsTrigger value="casual-schedule" className="text-xs sm:text-sm">Casual Schedule</TabsTrigger>
          )}
          <TabsTrigger value="inventory" className="text-xs sm:text-sm">Inventory</TabsTrigger>
          <TabsTrigger value="notices" className="text-xs sm:text-sm">Notices</TabsTrigger>
          {hasApprovals && (
            <TabsTrigger value="approvals" className="text-xs sm:text-sm bg-orange-100 text-orange-700 font-semibold data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              Approvals ({pendingRequests.length + unverifiedPayments.length + pendingRegCount})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="students" className="space-y-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs sm:text-sm"
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-2 sm:px-3 text-xs sm:text-sm shrink-0">
                  <Filter className="w-3.5 h-3.5 mr-1" />
                  Filter
                  {statusFilter !== 'active_inactive' && (
                    <Badge variant="secondary" className="ml-1 text-[10px] px-1">
                      {statusFilter === 'active' ? 'Active'
                        : statusFilter === 'inactive' ? 'Inactive'
                        : statusFilter === 'trial' ? 'Trial'
                        : statusFilter === 'uninvoiced_term' ? 'Uninvoiced Term'
                        : ''}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setStatusFilter('active_inactive')}>
                  Active + Inactive
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('active')}>
                  Active Only
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('inactive')}>
                  Inactive Only
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('trial')}>
                  Trial
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('uninvoiced_term')}>
                  Uninvoiced Class Fees (Current Term)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>




            {userrole === 'superadmin' && !massEditMode && (
              <Button size="sm" variant="outline" className="h-8 px-2 sm:px-3 text-xs sm:text-sm shrink-0" onClick={() => { setMassEditMode(true); setMassEditData({}); }}>
                <Users className="w-3.5 h-3.5 mr-1" />
                <span className="hidden sm:inline">Mass Edit</span>
                <span className="sm:hidden">Mass</span>
              </Button>
            )}
            {massEditMode && (
              <div className="flex gap-1.5">
                <Button size="sm" variant="default" className="h-8 px-3 text-xs" onClick={handleMassEditSave} disabled={massEditSaving}>
                  {massEditSaving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                  Save
                </Button>
                <Button size="sm" variant="outline" className="h-8 px-3 text-xs" onClick={() => { setMassEditMode(false); setMassEditData({}); }} disabled={massEditSaving}>
                  <X className="w-3.5 h-3.5 mr-1" />
                  Cancel
                </Button>
              </div>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="h-8 px-2 sm:px-3 text-xs sm:text-sm shrink-0">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span className="hidden sm:inline">Add Student/Trial</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowAddStudentDialog(true)}>
                  Add New Student
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowAddTrialDialog(true)}>
                  Add New Trial
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Card>
            <CardContent className="p-0">
              {studentsLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  {statusFilter === 'uninvoiced_term' && !displayTerm
                    ? 'No active term configured for this branch'
                    : 'No students found'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead className="text-xs py-2">Display Name</TableHead>
                        {userrole === 'superadmin' && (
                          <>
                            <TableHead className="text-xs py-2 hidden sm:table-cell">First Name</TableHead>
                            <TableHead className="text-xs py-2 hidden sm:table-cell">Last Name</TableHead>
                          </>
                        )}
                        <TableHead className="text-xs py-2">Belt</TableHead>
                        <TableHead className="text-xs py-2">Contact</TableHead>
                        <TableHead className="text-xs py-2 hidden sm:table-cell">Email</TableHead>
                        {!massEditMode && <TableHead className="text-xs py-2 w-20">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((student) => {
                        const edits = massEditData[student.id] || {};
                        const getVal = (field: string, original: string | null) => edits[field] !== undefined ? edits[field] : (original || '');
                        return (
                          <TableRow
                            key={student.id}
                            className={`${massEditMode ? '' : 'cursor-pointer'} hover:bg-muted/50 text-xs`}
                            onClick={() => {
                              if (!massEditMode) {
                                setSelectedStudent(student as Student);
                                setStudentDetailsOpen(true);
                              }
                            }}
                          >
                            <TableCell className="py-1 px-1.5">
                              {massEditMode ? (
                                <Input className="h-7 text-xs uppercase" value={getVal('display_name', student.display_name)} onChange={(e) => handleMassEditChange(student.id, 'display_name', e.target.value.toUpperCase())} onClick={(e) => e.stopPropagation()} />
                              ) : (
                                <span className="font-semibold uppercase tracking-wide text-xs">{student.display_name || `${student.first_name} ${student.last_name}`}</span>
                              )}
                            </TableCell>
                            {userrole === 'superadmin' && (
                              <>
                                <TableCell className="py-1 px-1.5 hidden sm:table-cell">
                                  {massEditMode ? (
                                    <Input className="h-7 text-xs uppercase" value={getVal('first_name', student.first_name)} onChange={(e) => handleMassEditChange(student.id, 'first_name', e.target.value.toUpperCase())} onClick={(e) => e.stopPropagation()} />
                                  ) : (
                                    <span className="uppercase text-xs">{student.first_name}</span>
                                  )}
                                </TableCell>
                                <TableCell className="py-1 px-1.5 hidden sm:table-cell">
                                  {massEditMode ? (
                                    <Input className="h-7 text-xs uppercase" value={getVal('last_name', student.last_name)} onChange={(e) => handleMassEditChange(student.id, 'last_name', e.target.value.toUpperCase())} onClick={(e) => e.stopPropagation()} />
                                  ) : (
                                    <span className="uppercase text-xs">{student.last_name || '—'}</span>
                                  )}
                                </TableCell>
                              </>
                            )}
                            <TableCell className="py-1 px-1.5">
                              {massEditMode ? (
                                <Select value={getVal('current_belt', student.current_belt)} onValueChange={(v) => handleMassEditChange(student.id, 'current_belt', v)}>
                                  <SelectTrigger className="h-7 text-[10px] w-28" onClick={(e) => e.stopPropagation()}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    
                                    {BELT_LEVELS.map(belt => (
                                      <SelectItem key={belt} value={belt}>{belt}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge variant={student.current_belt ? 'default' : 'outline'} className="text-[10px]">
                                  {student.current_belt || 'No belt'}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="py-1 px-1.5">
                              {massEditMode ? (
                                <Input className="h-7 text-xs w-32" value={getVal('phone', student.phone)} onChange={(e) => handleMassEditChange(student.id, 'phone', e.target.value)} onClick={(e) => e.stopPropagation()} />
                              ) : (
                                <span className="text-xs text-muted-foreground">{student.phone || '—'}</span>
                              )}
                            </TableCell>
                            <TableCell className="py-1 px-1.5 hidden sm:table-cell">
                              {massEditMode ? (
                                <Input className="h-7 text-xs" value={getVal('email', student.email)} onChange={(e) => handleMassEditChange(student.id, 'email', e.target.value)} onClick={(e) => e.stopPropagation()} />
                              ) : (
                                <span className="text-xs text-muted-foreground">{student.email || '—'}</span>
                              )}
                            </TableCell>
                            {!massEditMode && (
                              <TableCell className="py-1 px-1.5">
                                {student.status !== 'withdrawn' && (
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      title="Create Invoice"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCreateInvoiceForStudentId(student.id);
                                        setCreateInvoiceOpen(true);
                                      }}
                                    >
                                      <FileText className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      title="Withdraw"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setWithdrawTarget({
                                          id: student.id,
                                          name: student.display_name || `${student.first_name} ${student.last_name}`,
                                        });
                                      }}
                                    >
                                      <UserMinus className="w-3 h-3" />
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Student Details Dialog */}
          <StudentDetailsDialog
            open={studentDetailsOpen}
            onOpenChange={(open) => {
              setStudentDetailsOpen(open);
              if (!open) setSelectedStudentId(null);
            }}
            student={selectedStudent}
            branchId={branchId}
            onStudentUpdated={async () => {
              await queryClient.invalidateQueries({ queryKey: ['branch-students', branchId] });
              // Also invalidate attendance student queries so Add Students list refreshes
              await queryClient.invalidateQueries({ queryKey: ['branch-students-class'] });
              // Refresh selectedStudent directly from the database to avoid stale cache
              if (selectedStudent) {
                try {
                  const freshStudent = await getStudentById(selectedStudent.id);
                  if (freshStudent) setSelectedStudent(freshStudent);
                } catch (e) {
                  // Fallback to cache if direct fetch fails
                  const updatedStudents = queryClient.getQueryData<Student[]>(['branch-students', branchId]);
                  const updated = updatedStudents?.find(s => s.id === selectedStudent.id);
                  if (updated) setSelectedStudent(updated);
                }
              }
            }}
            onViewInvoice={(invoiceId) => {
              setStudentDetailsOpen(false);
              setSelectedInvoiceId(invoiceId);
              setInvoiceDialogMode('view');
              setInvoiceDialogOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader className="px-3 py-3 sm:px-6 sm:py-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-sm sm:text-base">Invoices & Payments</CardTitle>
                <div className="flex gap-1.5 sm:gap-2 items-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 text-xs">
                        <Filter className="w-3.5 h-3.5 mr-1" />
                        {invoiceStatusFilter === 'unpaid' ? 'Unpaid' : invoiceStatusFilter === 'paid' ? 'Paid' : invoiceStatusFilter === 'cancelled' ? 'Cancelled' : 'Replaced'}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Invoice Status</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setInvoiceStatusFilter('unpaid')}>Unpaid</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setInvoiceStatusFilter('paid')}>Paid</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setInvoiceStatusFilter('cancelled')}>Cancelled</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setInvoiceStatusFilter('replaced')}>Replaced</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <InvoiceDialog
                    mode="create"
                    trigger={
                      <Button size="sm" className="h-7 text-xs">
                        <FileText className="w-3.5 h-3.5 mr-1" />
                        <span className="hidden sm:inline">Create Invoice</span>
                        <span className="sm:hidden">Create</span>
                      </Button>
                    }
                    branchId={branchId}
                    onInvoiceCreated={() => {
                      queryClient.invalidateQueries({ queryKey: ['branch-invoices', branchId] });
                      queryClient.invalidateQueries({ queryKey: ['outstanding-invoices', branchId] });
                    }}
                  />
                </div>
              </div>
              {/* Name & Date filter row */}
              <div className="flex items-center gap-1.5 mt-2">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                  <Input
                    placeholder="Search name..."
                    value={invoiceNameFilter}
                    onChange={(e) => setInvoiceNameFilter(e.target.value)}
                    className="pl-8 h-7 text-xs"
                  />
                </div>
                <DatePicker
                  selected={invoiceDateFilter}
                  onSelect={setInvoiceDateFilter}
                  placeholder="Date"
                  className="h-7 text-xs w-[130px] sm:w-[160px]"
                />
                {(invoiceNameFilter || invoiceDateFilter) && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs px-2 shrink-0" onClick={() => { setInvoiceNameFilter(''); setInvoiceDateFilter(undefined); }}>
                    Clear
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Invoices Section */}
              <div>
                
                {(() => {
                  const filteredInvoices = invoices.filter((invoice: any) => {
                    const studentName = invoice.students
                      ? `${invoice.students.first_name} ${invoice.students.last_name}`
                      : '';
                    const matchesName = !invoiceNameFilter || studentName.toLowerCase().includes(invoiceNameFilter.toLowerCase());
                    const matchesDate = !invoiceDateFilter || isSameDay(new Date(invoice.created_at), invoiceDateFilter);
                    return matchesName && matchesDate;
                  });
                  return filteredInvoices.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No invoices found</p>
                  ) : (
                    <div className="space-y-1.5">
                      {filteredInvoices.map((invoice: any) => {
                        const studentName = invoice.students
                          ? `${invoice.students.first_name} ${invoice.students.last_name}`.toUpperCase()
                          : 'Unknown';
                        return (
                          <div key={invoice.id} className="px-2 py-1.5 bg-muted/50 rounded-lg space-y-1">
                            {/* Line 1: Student name, invoice number, amount, status */}
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-xs truncate min-w-0">{studentName}</span>
                              <span className="text-[11px] text-muted-foreground whitespace-nowrap">{invoice.invoice_number}</span>
                              <span className="font-medium text-xs whitespace-nowrap ml-auto">${invoice.total_amount?.toFixed(2)}</span>
                              <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'} className="text-[10px] px-1 h-4 shrink-0">
                                {invoice.status}
                              </Badge>
                            </div>
                            {/* Line 2: Date + action buttons */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-muted-foreground whitespace-nowrap">{formatDate(new Date(invoice.created_at))}</span>
                              <div className="flex items-center shrink-0 ml-auto">
                                {['draft', 'sent', 'unpaid', 'partially_paid', 'partial', 'overdue'].includes(invoice.status) && (Number(invoice.balance_due ?? 0) > 0) && (
                                  <CreatePaymentDialog
                                    trigger={
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-primary" title="Add Payment">
                                        <DollarSign className="w-3 h-3" />
                                      </Button>
                                    }
                                    preSelectedInvoiceId={invoice.id}
                                    onPaymentCreated={() => invalidateAllBranchData()}
                                  />
                                )}
                                <Button variant="ghost" size="icon" className="h-6 w-6" title="Download PDF" onClick={() => handleDownloadPDF(invoice)} disabled={pdfLoadingId === invoice.id}>
                                  {pdfLoadingId === invoice.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-600" title="Send via SMS" onClick={(e) => { e.stopPropagation(); handleShareSMS(invoice); }}>
                                  <MessageSquare className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600" title="Send via WhatsApp" onClick={(e) => { e.stopPropagation(); handleShareWhatsApp(invoice); }}>
                                  <MessageCircle className="w-3 h-3" />
                                </Button>
                                {isOverdue(invoice) && (
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-red-600" title="Send overdue reminder" onClick={(e) => { e.stopPropagation(); handleShareOverdueSMS(invoice); }}>
                                    <AlertCircle className="w-3 h-3" />
                                  </Button>
                                )}
                                {!isMobile && (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" title="View" onClick={() => { setSelectedInvoiceId(invoice.id); setInvoiceDialogMode('view'); setInvoiceDialogOpen(true); }}>
                                      <Eye className="w-3 h-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" title="Edit" onClick={() => { setSelectedInvoiceId(invoice.id); setInvoiceDialogMode('edit'); setInvoiceDialogOpen(true); }}>
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" title="Delete" onClick={() => setDeleteTarget({ type: 'invoice', id: invoice.id, label: invoice.invoice_number })}>
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

            </CardContent>
          </Card>

        </TabsContent>

        <TabsContent value="notices" className="mt-4">
          <NoticeManagementTab role="branch" branchId={branchId} userEmail={user?.email || ''} />
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4">
          {/* Payment Verification Section */}
          {unverifiedPayments.length > 0 && (
            <div className="border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-orange-600" />
                <h4 className="font-medium text-foreground">Payment Verification</h4>
                <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                  {unverifiedPayments.length} pending
                </Badge>
              </div>
              <div className="space-y-2">
                {unverifiedPayments.map((payment: any) => (
                  <div key={payment.id} className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                    <a href={payment.proof_of_payment_url} target="_blank" rel="noopener noreferrer" className="shrink-0 w-[100px] sm:w-[252px] rounded border overflow-hidden hover:opacity-80 transition-opacity cursor-pointer">
                      <img src={payment.proof_of_payment_url} alt="Payment proof" className="w-full h-auto object-contain" />
                    </a>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">{payment.invoices?.invoice_number || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">
                        {payment.invoices?.students ? `${payment.invoices.students.first_name} ${payment.invoices.students.last_name}` : 'Unknown'}{' '}
                        · ${payment.amount?.toFixed(2)} · {formatDate(new Date(payment.payment_date))} ·{' '}
                        <span className="capitalize">{payment.payment_method?.replace('_', ' ')}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="destructive" className="text-xs h-7" onClick={() => { setRejectingPayment(payment); setRejectionReason(''); }}>
                        <XCircle className="w-3 h-3 mr-1" />
                        Reject
                      </Button>
                      <Button size="sm" className="text-xs h-7" onClick={() => handleVerifyPayment(payment)}>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verify
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <StudentRegistrationApprovals branchId={branchId} />
          <PublicGradingSubmissionApprovals branchId={branchId} />
          <PublicGuardsPurchaseApprovals branchId={branchId} />

          {pendingRequests.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {pendingRequests.map((request) => (
                    <Card key={request.id} className="border-orange-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{request.student_name}</p>
                            <p className="text-sm text-muted-foreground">
                              Requested {formatDateTime(new Date(request.requested_at))}
                            </p>
                            <div className="mt-2">
                              <p className="text-sm font-medium">Requested Changes:</p>
                              <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto max-w-md">
                                {JSON.stringify(request.requested_changes, null, 2)}
                              </pre>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600"
                              onClick={() => handleApproveRequest(request.id)}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600"
                              onClick={() => handleRejectRequest(request.id)}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="grading">
          <BranchGradingList branchId={branchId} onStudentClick={async (studentId) => {
            const cached = queryClient.getQueryData<Student[]>(['branch-students', branchId]);
            let student = cached?.find(s => s.id === studentId);
            if (!student) {
              const { data } = await supabase.from('students').select('*').eq('id', studentId).single();
              if (data) student = data as Student;
            }
            if (student) {
              setSelectedStudent(student);
              setStudentDetailsOpen(true);
            }
          }} />
        </TabsContent>

        <TabsContent value="casual-schedule">
          <BranchCasualSchedule branchId={branchId} />
        </TabsContent>
        <TabsContent value="timetable">
          <BranchWeeklyTimetable branchId={branchId} />
        </TabsContent>
        <TabsContent value="inventory">
          <BranchInventoryTab branchId={branchId} />
        </TabsContent>
      </Tabs>

      {/* Invoice View/Edit Dialog */}
      {selectedInvoiceId && (
        <InvoiceDialog
          mode={invoiceDialogMode}
          invoiceId={selectedInvoiceId}
          open={invoiceDialogOpen}
          onOpenChange={(open) => { setInvoiceDialogOpen(open); if (!open) setSelectedInvoiceId(null); }}
          onInvoiceUpdated={refreshData}
        />
      )}

      {/* Per-row Create Invoice Dialog */}
      {createInvoiceForStudentId && (
        <InvoiceDialog
          mode="create"
          branchId={branchId}
          prefilledStudentId={createInvoiceForStudentId}
          open={createInvoiceOpen}
          onOpenChange={(open) => {
            setCreateInvoiceOpen(open);
            if (!open) setCreateInvoiceForStudentId(null);
          }}
          onInvoiceCreated={() => {
            queryClient.invalidateQueries({ queryKey: ['branch-invoices', branchId] });
            queryClient.invalidateQueries({ queryKey: ['outstanding-invoices', branchId] });
          }}
        />
      )}

      {/* Payment View/Edit Dialog */}
      {selectedPaymentId && (
        <ViewEditPaymentDialog
          paymentId={selectedPaymentId}
          open={paymentDialogOpen}
          onOpenChange={(open) => { setPaymentDialogOpen(open); if (!open) setSelectedPaymentId(null); }}
          onPaymentUpdated={refreshData}
          initialMode={paymentDialogMode}
        />
      )}

      {/* Withdraw Confirmation */}
      <AlertDialog open={!!withdrawTarget} onOpenChange={(open) => { if (!open) setWithdrawTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {userrole === 'superadmin' ? `Withdraw ${withdrawTarget?.name}?` : `Request withdrawal for ${withdrawTarget?.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {userrole === 'superadmin'
                ? `This will mark ${withdrawTarget?.name} as withdrawn immediately. This action requires no further approval.`
                : `Submit a withdrawal request for ${withdrawTarget?.name}? A superadmin must approve before the student is withdrawn.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!withdrawTarget) return;
                const target = withdrawTarget;
                try {
                  if (userrole === 'superadmin') {
                    await directWithdrawStudent(target.id);
                    toast.success(`${target.name} withdrawn`);
                    queryClient.invalidateQueries({ queryKey: ['branch-students', branchId] });
                    queryClient.invalidateQueries({ queryKey: ['pending-withdrawal-requests'] });
                  } else {
                    await createWithdrawalRequest(
                      target.id,
                      target.name,
                      branchId,
                      user?.email || ''
                    );
                    toast.success('Withdrawal request submitted for superadmin approval');
                  }
                } catch (err: any) {
                  toast.error(err.message || 'Failed to withdraw student');
                } finally {
                  setWithdrawTarget(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {userrole === 'superadmin' ? 'Withdraw' : 'Submit Request'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.type === 'invoice' && userrole !== 'superadmin' ? 'Request Deletion?' : `Delete ${deleteTarget?.type}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === 'invoice' && userrole !== 'superadmin'
                ? `This will submit a deletion request for invoice "${deleteTarget?.label}" to the superadmin for approval.`
                : `Are you sure you want to delete ${deleteTarget?.type} "${deleteTarget?.label}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteTarget?.type === 'invoice' && userrole !== 'superadmin' ? 'Submit Request' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AddStudentDialog
        open={showAddStudentDialog}
        onOpenChange={setShowAddStudentDialog}
        onStudentAdded={() => {
          queryClient.invalidateQueries({ queryKey: ['branch-students', branchId] });
        }}
      />

      <AddTrialDialog
        open={showAddTrialDialog}
        onOpenChange={setShowAddTrialDialog}
        onTrialAdded={() => {
          queryClient.invalidateQueries({ queryKey: ['branch-students', branchId] });
        }}
      />

      {/* Reject Payment Dialog */}
      <Dialog open={!!rejectingPayment} onOpenChange={(open) => { if (!open) { setRejectingPayment(null); setRejectionReason(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject Payment Verification</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              {rejectingPayment?.invoices?.invoice_number} — {rejectingPayment?.invoices?.students
                ? `${rejectingPayment.invoices.students.first_name} ${rejectingPayment.invoices.students.last_name}`
                : 'Unknown'}
              {' '}· ${rejectingPayment?.amount?.toFixed(2)}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="branch-rejection-reason">Reason for Rejection *</Label>
              <Textarea
                id="branch-rejection-reason"
                placeholder="e.g. Proof is blurry, amount doesn't match..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectingPayment(null); setRejectionReason(''); }} disabled={isRejectingPayment}>Cancel</Button>
            <Button variant="destructive" onClick={handleRejectPayment} disabled={isRejectingPayment || !rejectionReason.trim()}>
              {isRejectingPayment ? 'Rejecting...' : 'Reject Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {branch && (
        <BranchSetupDialog
          branch={branch as any}
          open={branchSetupOpen}
          onOpenChange={setBranchSetupOpen}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['branch', branchId] });
          }}
        />
      )}
    </div>
  );
};

export default BranchDashboard;
