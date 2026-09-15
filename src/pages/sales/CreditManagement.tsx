/**
 * Credit Management Page
 * Admin view for managing student credit balances
 */

import React, { useState, useEffect } from 'react';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import AuthGuard from '@/components/auth/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { DollarSign, Search, Plus, Minus, History, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/utils/dateFormat';
import {
  getAllStudentCredits,
  getStudentCreditHistory,
  addManualCredit,
  issueRefund,
  requestCreditRefund,
  searchStudentsForCredit,
  type CreditStudentOption,
  type StudentCreditSummary,
  type StudentCredit
} from '@/services/studentCreditService';
import { useInvoiceAccess } from '@/hooks/useInvoiceAccess';

const CreditManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [creditSummaries, setCreditSummaries] = useState<StudentCreditSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // History dialog
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentCreditSummary | null>(null);
  const [creditHistory, setCreditHistory] = useState<StudentCredit[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Adjustment dialog
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustStudentId, setAdjustStudentId] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustDescription, setAdjustDescription] = useState('');
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustType, setAdjustType] = useState<'credit' | 'refund'>('credit');
  const [adjustStudentName, setAdjustStudentName] = useState('');

  const { isSuperadmin } = useInvoiceAccess();

  // Add-credit student picker
  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerResults, setPickerResults] = useState<CreditStudentOption[]>([]);
  const [pickerSearching, setPickerSearching] = useState(false);

  useEffect(() => {
    loadCredits();
  }, []);

  const loadCredits = async () => {
    try {
      setLoading(true);
      const data = await getAllStudentCredits();
      setCreditSummaries(data);
    } catch (error) {
      console.error('Error loading credits:', error);
      toast.error('Failed to load credit balances');
    } finally {
      setLoading(false);
    }
  };

  const viewHistory = async (summary: StudentCreditSummary) => {
    setSelectedStudent(summary);
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const history = await getStudentCreditHistory(summary.student_id);
      setCreditHistory(history);
    } catch (error) {
      toast.error('Failed to load credit history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const openAdjustDialog = (studentId: string, type: 'credit' | 'refund', studentName = '') => {
    setAdjustStudentId(studentId);
    setAdjustStudentName(studentName);
    setAdjustType(type);
    setAdjustAmount('');
    setAdjustDescription('');
    setPickerQuery('');
    setPickerResults([]);
    setAdjustOpen(true);
  };

  const runStudentSearch = async (q: string) => {
    setPickerQuery(q);
    if (q.trim().length < 2) {
      setPickerResults([]);
      return;
    }
    setPickerSearching(true);
    try {
      setPickerResults(await searchStudentsForCredit(q));
    } finally {
      setPickerSearching(false);
    }
  };

  const handleAdjust = async () => {
    const amount = parseFloat(adjustAmount);
    if (!adjustStudentId) {
      toast.error('Select a student');
      return;
    }
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (!adjustDescription.trim()) {
      toast.error('Please provide a description');
      return;
    }

    setAdjustLoading(true);
    try {
      if (adjustType === 'refund') {
        if (isSuperadmin) {
          await issueRefund(adjustStudentId, amount, adjustDescription, user?.email || undefined);
          toast.success(`Refund of $${amount.toFixed(2)} issued`);
        } else {
          await requestCreditRefund(
            adjustStudentId,
            adjustStudentName,
            amount,
            adjustDescription,
            user?.email || ''
          );
          toast.success('Refund request submitted for superadmin approval');
        }
      } else {
        await addManualCredit(adjustStudentId, amount, adjustDescription, user?.email || undefined);
        toast.success(`Credit of $${amount.toFixed(2)} added`);
      }
      setAdjustOpen(false);
      loadCredits();
      // Refresh history if open
      if (historyOpen && selectedStudent?.student_id === adjustStudentId) {
        const history = await getStudentCreditHistory(adjustStudentId);
        setCreditHistory(history);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Operation failed');
    } finally {
      setAdjustLoading(false);
    }
  };

  const filtered = creditSummaries.filter(s =>
    s.student_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalCredits = creditSummaries.reduce((sum, s) => sum + Math.max(0, s.credit_balance), 0);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'overpayment': return <Badge variant="default">Overpayment</Badge>;
      case 'refund': return <Badge variant="destructive">Refund</Badge>;
      case 'item_refund': return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Item refund</Badge>;
      case 'manual_adjustment': return <Badge variant="secondary">Adjustment</Badge>;
      case 'credit_applied': return <Badge variant="outline">Applied</Badge>;
      default: return <Badge>{type}</Badge>;
    }
  };

  return (
    <AuthGuard>
      <ResponsiveLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/sales')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Credit Management</h1>
              <p className="text-sm text-muted-foreground">Manage student credit balances and refunds</p>
            </div>
            {isSuperadmin && (
              <Button className="ml-auto" onClick={() => openAdjustDialog('', 'credit')}>
                <Plus className="w-4 h-4 mr-2" />
                Add credit
              </Button>
            )}
          </div>

          {/* Summary Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Outstanding Credits</p>
                  <p className="text-2xl font-bold text-foreground">${totalCredits.toFixed(2)}</p>
                </div>
                <div className="ml-auto">
                  <p className="text-sm text-muted-foreground">Students with Credits</p>
                  <p className="text-2xl font-bold text-foreground">{creditSummaries.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by student name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Credits Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead className="text-right">Credit Balance</TableHead>
                    <TableHead>Last Transaction</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No student credits found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map(summary => (
                      <TableRow key={summary.student_id}>
                        <TableCell className="font-medium">{summary.student_name}</TableCell>
                        <TableCell className="text-right">
                          <span className={summary.credit_balance > 0 ? 'text-green-600 font-semibold' : 'text-destructive font-semibold'}>
                            ${summary.credit_balance.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {summary.last_transaction_date
                            ? formatDate(summary.last_transaction_date)
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => viewHistory(summary)}>
                              <History className="w-4 h-4" />
                            </Button>
                            {isSuperadmin && (
                              <Button variant="ghost" size="sm" onClick={() => openAdjustDialog(summary.student_id, 'credit', summary.student_name)}>
                                <Plus className="w-4 h-4" />
                              </Button>
                            )}
                            {summary.credit_balance > 0 && (
                              <Button variant="ghost" size="sm" onClick={() => openAdjustDialog(summary.student_id, 'refund', summary.student_name)}>
                                <Minus className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* History Dialog */}
          <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Credit History — {selectedStudent?.student_name}</DialogTitle>
                <DialogDescription>
                  Current balance: ${selectedStudent?.credit_balance.toFixed(2)}
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-80 overflow-y-auto">
                {historyLoading ? (
                  <p className="text-center py-4 text-muted-foreground">Loading...</p>
                ) : creditHistory.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">No transactions</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {creditHistory.map(c => (
                        <TableRow key={c.id}>
                          <TableCell className="text-xs">
                            {formatDate(new Date(c.created_at))}
                          </TableCell>
                          <TableCell>{getTypeBadge(c.type)}</TableCell>
                          <TableCell className={`text-right font-medium ${c.amount >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                            {c.amount >= 0 ? '+' : ''}${c.amount.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                            {c.description}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Adjustment Dialog */}
          <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {adjustType === 'refund'
                    ? (isSuperadmin ? 'Issue Refund' : 'Request Refund')
                    : 'Add Credit'}
                </DialogTitle>
                <DialogDescription>
                  {adjustType === 'refund'
                    ? (isSuperadmin
                        ? 'Issue a refund to deduct from the student\'s credit balance.'
                        : 'The amount is held and sent to a superadmin for approval.')
                    : 'Add a manual credit adjustment for this student.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Student</Label>
                  {adjustStudentId ? (
                    <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <span>{adjustStudentName || 'Selected student'}</span>
                      {adjustType === 'credit' && (
                        <Button variant="ghost" size="sm" onClick={() => { setAdjustStudentId(''); setAdjustStudentName(''); }}>
                          Change
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        value={pickerQuery}
                        onChange={(e) => runStudentSearch(e.target.value)}
                        placeholder="Search by name or student number..."
                      />
                      <div className="max-h-40 overflow-y-auto rounded-md border divide-y">
                        {pickerSearching && <div className="px-3 py-2 text-sm text-muted-foreground">Searching…</div>}
                        {!pickerSearching && pickerQuery.trim().length >= 2 && pickerResults.length === 0 && (
                          <div className="px-3 py-2 text-sm text-muted-foreground">No students found</div>
                        )}
                        {pickerResults.map(s => (
                          <button
                            key={s.id}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                            onClick={() => { setAdjustStudentId(s.id); setAdjustStudentName(s.name); }}
                          >
                            {s.name}
                            {s.student_number && (
                              <span className="text-muted-foreground"> · {s.student_number}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <Label>Amount ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={adjustDescription}
                    onChange={(e) => setAdjustDescription(e.target.value)}
                    placeholder={adjustType === 'refund' ? 'Reason for refund...' : 'Reason for credit adjustment...'}
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAdjustOpen(false)}>Cancel</Button>
                <Button onClick={handleAdjust} disabled={adjustLoading || !adjustStudentId}>
                  {adjustLoading
                    ? 'Processing...'
                    : adjustType === 'refund'
                      ? (isSuperadmin ? 'Issue Refund' : 'Submit Request')
                      : 'Add Credit'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </ResponsiveLayout>
    </AuthGuard>
  );
};

export default CreditManagement;
