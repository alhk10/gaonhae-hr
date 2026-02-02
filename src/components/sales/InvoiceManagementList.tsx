/**
 * Invoice Management List Component
 * Displays and manages invoices in the sales module
 * Supports branch-based access control for non-superadmin users
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Search, 
  Filter, 
  Download, 
  Plus, 
  MoreHorizontal,
  Eye,
  Trash2,
  Send,
  DollarSign,
  Calendar,
  FileText,
  Loader2,
  FileDown,
  MessageCircle,
  Mail
} from 'lucide-react';
import { toast } from 'sonner';
import { getInvoices, deleteInvoice, updateInvoiceStatus, type Invoice, getInvoiceById } from '@/services/invoiceService';
import { createInvoiceDeletionRequest } from '@/services/invoiceDeletionRequestService';
import { getStudents, getStudentById } from '@/services/studentService';
import CreateInvoiceDialog from './CreateInvoiceDialog';
import ViewEditInvoiceDialog from './ViewEditInvoiceDialog';
import CreatePaymentDialog from './CreatePaymentDialog';
import { formatCurrency } from '@/utils/currencyUtils';
import { downloadInvoicePDF, shareInvoiceViaWhatsApp, getInvoicePDFBase64, type InvoiceData } from '@/utils/invoicePDFGenerator';
import { supabase } from '@/integrations/supabase/client';
import { useInvoiceAccess } from '@/hooks/useInvoiceAccess';

const InvoiceManagementList: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [students, setStudents] = useState<Array<{id: string, name: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [studentFilter, setStudentFilter] = useState('');
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const { accessibleBranches, isSuperadmin, canEdit, canDelete, canCreate, hasAccess } = useInvoiceAccess();
  
  // View/Edit dialog state
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit'>('view');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const pageSize = 20;
  const totalPages = Math.ceil(totalInvoices / pageSize);
  
  // Delete request dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);
  
  // Email dialog state
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [invoiceForEmail, setInvoiceForEmail] = useState<Invoice | null>(null);
  const [emailAddress, setEmailAddress] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  // PDF loading state
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);

  useEffect(() => {
    loadInvoices();
    loadStudents();
  }, [currentPage, searchQuery, statusFilter, studentFilter]);

  const loadStudents = async () => {
    try {
      const response = await getStudents(1, 1000); // Get all students for filter
      setStudents(response.students.map(s => ({ id: s.id, name: `${s.first_name} ${s.last_name}` })));
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const response = await getInvoices(
        currentPage,
        pageSize,
        searchQuery || undefined,
        statusFilter && statusFilter !== 'all' ? statusFilter : undefined,
        studentFilter && studentFilter !== 'all' ? studentFilter : undefined
      );
      
      // Filter invoices by accessible branches for non-superadmins
      let filteredInvoices = response.invoices;
      if (!isSuperadmin && accessibleBranches.length > 0) {
        const accessibleBranchIds = accessibleBranches.map(b => b.branch_id);
        filteredInvoices = response.invoices.filter(
          inv => inv.branch_id && accessibleBranchIds.includes(inv.branch_id)
        );
      }
      
      setInvoices(filteredInvoices);
      setTotalInvoices(isSuperadmin ? response.total : filteredInvoices.length);
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectInvoice = (invoiceId: string, selected: boolean) => {
    if (selected) {
      setSelectedInvoices([...selectedInvoices, invoiceId]);
    } else {
      setSelectedInvoices(selectedInvoices.filter(id => id !== invoiceId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedInvoices(invoices.map(invoice => invoice.id));
    } else {
      setSelectedInvoices([]);
    }
  };

  const handleStatusChange = async (invoiceId: string, newStatus: Invoice['status']) => {
    try {
      await updateInvoiceStatus(invoiceId, newStatus);
      toast.success('Invoice status updated');
      loadInvoices();
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast.error('Failed to update invoice status');
    }
  };

  const handleOpenDeleteDialog = (invoice: Invoice) => {
    setInvoiceToDelete(invoice);
    setDeleteReason('');
    setDeleteDialogOpen(true);
  };

  const handleSubmitDeleteRequest = async () => {
    if (!invoiceToDelete) return;
    
    try {
      setIsSubmittingDelete(true);
      await createInvoiceDeletionRequest(invoiceToDelete.id, deleteReason || undefined);
      toast.success('Deletion request submitted for superadmin approval');
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
      setDeleteReason('');
    } catch (error) {
      console.error('Error submitting deletion request:', error);
      toast.error('Failed to submit deletion request');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'unpaid': return 'destructive';
      case 'draft': return 'destructive'; // Map draft to unpaid styling
      case 'overdue': return 'destructive';
      case 'cancelled': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'unpaid': return 'bg-red-100 text-red-800 border-red-200';
      case 'draft': return 'bg-red-100 text-red-800 border-red-200'; // Map draft to unpaid styling
      default: return '';
    }
  };

  const getDisplayStatus = (status: string) => {
    // Map 'draft' to 'Unpaid' for display
    if (status === 'draft') return 'Unpaid';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-SG');
  };

  // Prepare invoice data for PDF generation
  const prepareInvoiceDataForPDF = async (invoice: Invoice): Promise<InvoiceData> => {
    // Get full invoice details with items
    const fullInvoice = await getInvoiceById(invoice.id);
    
    // Get student details
    let studentData;
    try {
      studentData = await getStudentById(invoice.student_id);
    } catch {
      studentData = null;
    }

    // Get branch details to determine country for template matching
    let branchCountry = 'Singapore';
    if (invoice.branch_id) {
      const { data: branchData } = await supabase
        .from('branches')
        .select('country')
        .eq('id', invoice.branch_id)
        .single();
      if (branchData?.country) {
        branchCountry = branchData.country;
      }
    }

    // Find matching template by country
    const countryCode = branchCountry === 'Australia' ? 'AU' : 'SG';
    const { data: templates } = await supabase
      .from('invoice_templates')
      .select('letterhead_url, paynow_qr_url, country')
      .eq('country', countryCode)
      .eq('is_active', true)
      .limit(1);
    
    const template = templates?.[0] || null;

    // Collect term_ids and grading_slot_ids from items
    const termIds: string[] = [];
    const gradingSlotIds: string[] = [];
    
    fullInvoice?.items?.forEach(item => {
      const metadata = item.metadata as { term_id?: string; grading_slot_id?: string } | null;
      if (metadata?.term_id) termIds.push(metadata.term_id);
      if (metadata?.grading_slot_id) gradingSlotIds.push(metadata.grading_slot_id);
    });

    // Fetch term calendar data
    const termMap: Record<string, { name: string; start_date: string; end_date: string }> = {};
    if (termIds.length > 0) {
      const { data: termsData } = await supabase
        .from('term_calendars')
        .select('id, name, start_date, end_date')
        .in('id', termIds);
      
      termsData?.forEach(term => {
        termMap[term.id] = {
          name: term.name,
          start_date: term.start_date,
          end_date: term.end_date
        };
      });
    }

    // Fetch grading slot data
    const gradingMap: Record<string, { grading_date: string; start_time: string | null }> = {};
    if (gradingSlotIds.length > 0) {
      const { data: gradingData } = await supabase
        .from('grading_slots')
        .select('id, grading_date, start_time')
        .in('id', gradingSlotIds);
      
      gradingData?.forEach(slot => {
        gradingMap[slot.id] = {
          grading_date: slot.grading_date,
          start_time: slot.start_time
        };
      });
    }

    // Format date helper
    const formatShortDate = (dateStr: string) => {
      try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      } catch {
        return dateStr;
      }
    };

    const formatFullDate = (dateStr: string) => {
      try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      } catch {
        return dateStr;
      }
    };

    const formatTime = (timeStr: string | null) => {
      if (!timeStr) return '';
      // Time format is HH:MM:SS, convert to HH:MM
      return timeStr.substring(0, 5);
    };
    
    return {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      issue_date: invoice.issue_date || null,
      due_date: invoice.due_date || null,
      subtotal: invoice.subtotal,
      tax_amount: invoice.tax_amount,
      discount_amount: invoice.discount_amount,
      total_amount: invoice.total_amount,
      amount_paid: invoice.amount_paid,
      balance_due: invoice.balance_due,
      notes: invoice.notes,
      status: invoice.status,
      student: studentData ? {
        name: `${studentData.first_name} ${studentData.last_name}`,
        address: studentData.address,
        phone: studentData.phone,
        email: studentData.email,
        whatsapp: studentData.whatsapp
      } : undefined,
      items: fullInvoice?.items?.map(item => {
        const metadata = item.metadata as { term_id?: string; grading_slot_id?: string } | null;
        let term_info: string | undefined;
        let grading_info: string | undefined;

        // Build term info string
        if (metadata?.term_id && termMap[metadata.term_id]) {
          const term = termMap[metadata.term_id];
          term_info = `${term.name} (${formatShortDate(term.start_date)} - ${formatShortDate(term.end_date)})`;
        }

        // Build grading info string
        if (metadata?.grading_slot_id && gradingMap[metadata.grading_slot_id]) {
          const slot = gradingMap[metadata.grading_slot_id];
          const timeStr = formatTime(slot.start_time);
          grading_info = timeStr 
            ? `${formatFullDate(slot.grading_date)} at ${timeStr}`
            : formatFullDate(slot.grading_date);
        }

        return {
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_amount: item.total_amount,
          tax_rate: item.tax_rate,
          tax_amount: item.tax_amount,
          metadata,
          term_info,
          grading_info
        };
      }) || [],
      template: template ? {
        letterhead_url: template.letterhead_url || undefined,
        paynow_qr_url: template.paynow_qr_url || undefined,
        country: template.country || undefined
      } : undefined
    };
  };

  // Handle PDF download
  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      setPdfLoadingId(invoice.id);
      const invoiceData = await prepareInvoiceDataForPDF(invoice);
      await downloadInvoicePDF(invoiceData);
      toast.success('Invoice PDF downloaded');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setPdfLoadingId(null);
    }
  };

  // Handle WhatsApp share
  const handleShareWhatsApp = async (invoice: Invoice) => {
    try {
      setPdfLoadingId(invoice.id);
      
      // Get student details to get WhatsApp number
      let studentData;
      try {
        studentData = await getStudentById(invoice.student_id);
      } catch {
        studentData = null;
      }
      
      const whatsappNumber = studentData?.whatsapp || studentData?.phone;
      if (!whatsappNumber) {
        toast.error('No WhatsApp or phone number found for this student');
        return;
      }
      
      const invoiceData = await prepareInvoiceDataForPDF(invoice);
      await shareInvoiceViaWhatsApp(invoiceData, whatsappNumber);
      toast.success('PDF downloaded. Please attach it to the WhatsApp chat.');
    } catch (error) {
      console.error('Error sharing via WhatsApp:', error);
      toast.error('Failed to share via WhatsApp');
    } finally {
      setPdfLoadingId(null);
    }
  };

  // Handle email dialog open
  const handleOpenEmailDialog = async (invoice: Invoice) => {
    try {
      const studentData = await getStudentById(invoice.student_id);
      setEmailAddress(studentData?.email || '');
    } catch {
      setEmailAddress('');
    }
    setInvoiceForEmail(invoice);
    setEmailDialogOpen(true);
  };

  // Handle send email
  const handleSendEmail = async () => {
    if (!invoiceForEmail || !emailAddress) {
      toast.error('Email address is required');
      return;
    }
    
    try {
      setIsSendingEmail(true);
      
      // Prepare invoice data and generate PDF
      const invoiceData = await prepareInvoiceDataForPDF(invoiceForEmail);
      const pdfBase64 = await getInvoicePDFBase64(invoiceData);
      
      // Get student data
      let studentName = invoiceForEmail.student_name || 'Customer';
      
      // Call edge function to send email
      const { data, error } = await supabase.functions.invoke('send-invoice-email', {
        body: {
          recipientEmail: emailAddress,
          invoiceNumber: invoiceForEmail.invoice_number,
          studentName,
          totalAmount: invoiceForEmail.total_amount,
          balanceDue: invoiceForEmail.balance_due,
          pdfBase64
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to send email');
      }
      
      toast.success(`Invoice sent to ${emailAddress}`);
      setEmailDialogOpen(false);
      setInvoiceForEmail(null);
      setEmailAddress('');
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error(error.message || 'Failed to send email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Invoice Management</h2>
        <div className="flex gap-2">
          <Button variant="outline" disabled>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          {hasAccess && (
            <CreateInvoiceDialog 
              trigger={
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Invoice
                </Button>
              }
              onInvoiceCreated={loadInvoices}
            />
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by invoice number or notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={studentFilter} onValueChange={setStudentFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All Students" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setStudentFilter('all');
              }}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedInvoices.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedInvoices.length} invoice(s) selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled>
                  <Send className="w-4 h-4 mr-2" />
                  Send Selected
                </Button>
                <Button variant="outline" size="sm" disabled>
                  <Download className="w-4 h-4 mr-2" />
                  Export Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice Table */}
      <Card>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No invoices found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter || studentFilter 
                  ? 'Try adjusting your search criteria'
                  : 'Create your first invoice to get started'
                }
              </p>
              {!searchQuery && !statusFilter && !studentFilter && (
                <CreateInvoiceDialog 
                  trigger={
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Invoice
                    </Button>
                  }
                  onInvoiceCreated={loadInvoices}
                />
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedInvoices.length === invoices.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedInvoices.includes(invoice.id)}
                          onCheckedChange={(checked) => handleSelectInvoice(invoice.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell>
                        {invoice.student_name || 'Unknown Student'}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{formatCurrency(invoice.total_amount, invoice.branch_currency || 'SGD')}</div>
                          {invoice.balance_due > 0 && (
                            <div className="text-sm text-muted-foreground">
                              Balance: {formatCurrency(invoice.balance_due, invoice.branch_currency || 'SGD')}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={getStatusBadgeVariant(invoice.status)}
                          className={getStatusBadgeClass(invoice.status)}
                        >
                          {getDisplayStatus(invoice.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(invoice.issue_date)}</TableCell>
                      <TableCell>{formatDate(invoice.due_date)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="View Invoice"
                            onClick={() => {
                              setSelectedInvoiceId(invoice.id);
                              setDialogMode('view');
                              setViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Download PDF"
                            onClick={() => handleDownloadPDF(invoice)}
                            disabled={pdfLoadingId === invoice.id}
                          >
                            {pdfLoadingId === invoice.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <FileDown className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Share via WhatsApp"
                            onClick={() => handleShareWhatsApp(invoice)}
                            disabled={pdfLoadingId === invoice.id}
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Send via Email"
                            onClick={() => handleOpenEmailDialog(invoice)}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                            <CreatePaymentDialog
                              trigger={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="Add Payment"
                                >
                                  <DollarSign className="h-4 w-4" />
                                </Button>
                              }
                              preSelectedInvoiceId={invoice.id}
                              onPaymentCreated={loadInvoices}
                            />
                          )}
                          {hasAccess && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              title="Request Delete"
                              onClick={() => handleOpenDeleteDialog(invoice)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalInvoices)} of {totalInvoices} invoices
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* View/Edit Invoice Dialog */}
      {selectedInvoiceId && (
        <ViewEditInvoiceDialog
          invoiceId={selectedInvoiceId}
          open={viewDialogOpen}
          onOpenChange={setViewDialogOpen}
          onInvoiceUpdated={loadInvoices}
          initialMode={dialogMode}
        />
      )}

      {/* Delete Request Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Invoice Deletion</DialogTitle>
            <DialogDescription>
              This deletion request will be sent to a superadmin for approval.
            </DialogDescription>
          </DialogHeader>
          
          {invoiceToDelete && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Invoice #:</span>
                  <span className="font-medium">{invoiceToDelete.invoice_number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Student:</span>
                  <span className="font-medium">{invoiceToDelete.student_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span className="font-medium">{formatCurrency(invoiceToDelete.total_amount)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delete-reason">Reason for deletion (optional)</Label>
                <Textarea
                  id="delete-reason"
                  placeholder="Please provide a reason for this deletion request..."
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleSubmitDeleteRequest}
              disabled={isSubmittingDelete}
            >
              {isSubmittingDelete && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Confirmation Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Invoice via Email</DialogTitle>
            <DialogDescription>
              Send the invoice PDF to the specified email address.
            </DialogDescription>
          </DialogHeader>
          
          {invoiceForEmail && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Invoice #:</span>
                  <span className="font-medium">{invoiceForEmail.invoice_number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Student:</span>
                  <span className="font-medium">{invoiceForEmail.student_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span className="font-medium">{formatCurrency(invoiceForEmail.total_amount)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-address">Email Address *</Label>
                <Input
                  id="email-address"
                  type="email"
                  placeholder="Enter email address..."
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendEmail}
              disabled={isSendingEmail || !emailAddress}
            >
              {isSendingEmail && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoiceManagementList;