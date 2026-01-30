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
import { 
  Search, 
  Filter, 
  Download, 
  Plus, 
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Send,
  DollarSign,
  Calendar,
  FileText,
  History
} from 'lucide-react';
import { toast } from 'sonner';
import { getInvoices, deleteInvoice, updateInvoiceStatus, type Invoice } from '@/services/invoiceService';
import { getStudents } from '@/services/studentService';
import CreateInvoiceDialog from './CreateInvoiceDialog';
import InvoiceChangeLogDialog from './InvoiceChangeLogDialog';
import ViewEditInvoiceDialog from './ViewEditInvoiceDialog';
import { formatCurrency } from '@/utils/currencyUtils';
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

  const handleDeleteInvoice = async (invoiceId: string, branchId?: string) => {
    // Check delete permission for this branch
    if (branchId && !canDelete(branchId)) {
      toast.error('You do not have permission to delete invoices for this branch');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    
    try {
      await deleteInvoice(invoiceId);
      toast.success('Invoice deleted');
      loadInvoices();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice');
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'sent': return 'secondary';
      case 'draft': return 'outline';
      case 'overdue': return 'destructive';
      case 'cancelled': return 'secondary';
      default: return 'outline';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-SG');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Invoice Management</h2>
          <p className="text-muted-foreground">
            Create and manage student invoices
          </p>
        </div>
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
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Search and filter invoices</CardDescription>
        </CardHeader>
        <CardContent>
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
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
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
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>
            {totalInvoices} total invoice(s)
          </CardDescription>
        </CardHeader>
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
                        <Badge variant={getStatusBadgeVariant(invoice.status)}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
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
                          <InvoiceChangeLogDialog
                            invoiceId={invoice.id}
                            invoiceNumber={invoice.invoice_number}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Edit Invoice"
                            disabled={!canEdit(invoice.branch_id || '')}
                            onClick={() => {
                              setSelectedInvoiceId(invoice.id);
                              setDialogMode('edit');
                              setViewDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            title="Delete Invoice"
                            onClick={() => handleDeleteInvoice(invoice.id, invoice.branch_id || undefined)}
                            disabled={!canDelete(invoice.branch_id || '')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
    </div>
  );
};

export default InvoiceManagementList;