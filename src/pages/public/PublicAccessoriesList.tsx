/**
 * Public accessories list page. Mounted at /accessories-list.
 * Mirrors the approval pattern of /grading-list:
 * - Two filters: branch + product (default "All")
 * - Verify auto-matches student (name + DOB + branch) and creates a paid combined invoice
 * - Reject with reason
 * - When no student match: "Suggest add" CTA prefilling /register
 */
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, UserPlus, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/utils/dateFormat';
import { useAuth } from '@/contexts/AuthContext';
import {
  getPublicAccessoryList,
  verifyAccessorySubmission,
  rejectAccessorySubmission,
  type AccessorySubmissionRow,
} from '@/services/accessoryPaymentSubmissionService';

const statusClass = (status: string) => {
  switch (status) {
    case 'verified': return 'bg-green-100 text-green-800 border-green-200';
    case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  }
};

const PublicAccessoriesList: React.FC = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const reviewer = user?.employeeId || user?.email || 'system';

  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [rejectRow, setRejectRow] = useState<AccessorySubmissionRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['public-accessory-list'],
    queryFn: getPublicAccessoryList,
    staleTime: 30 * 1000,
  });

  const branchOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.branch_name) set.add(r.branch_name);
    return Array.from(set).sort();
  }, [rows]);

  /**
   * Group items by bundle (bundle_name) when present so display + filter
   * surface the 4 bundle SKUs rather than per-component lines.
   */
  const summarizeItems = (items: AccessorySubmissionRow['items']): string => {
    const groups = new Map<string, number>();
    for (const i of items) {
      const label = i.bundle_name || i.name;
      groups.set(label, (groups.get(label) || 0) + (i.qty || 0));
    }
    // bundle qty is duplicated across components — collapse by max instead of sum
    const out: string[] = [];
    const seen = new Set<string>();
    for (const i of items) {
      const label = i.bundle_name || i.name;
      if (seen.has(label)) continue;
      seen.add(label);
      out.push(`${label} × ${i.qty || 0}`);
    }
    return out.join(', ');
  };

  const productOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) for (const i of r.items) set.add(i.bundle_name || i.name);
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (branchFilter !== 'all' && r.branch_name !== branchFilter) return false;
      if (productFilter !== 'all' && !r.items.some(i => (i.bundle_name || i.name) === productFilter)) return false;
      return true;
    });
  }, [rows, branchFilter, productFilter]);

  const handleVerify = async (row: AccessorySubmissionRow) => {
    setBusyId(row.id);
    try {
      const result = await verifyAccessorySubmission(row.id, reviewer);
      if (result.matched) {
        toast.success(`Verified — invoice ${result.invoice_number} created`);
      } else {
        toast.message('No matching student profile found', {
          description: 'Submission left pending. Use "Suggest Add" to register the student first.',
        });
      }
      qc.invalidateQueries({ queryKey: ['public-accessory-list'] });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to verify');
    } finally {
      setBusyId(null);
    }
  };

  const submitReject = async () => {
    if (!rejectRow) return;
    setBusyId(rejectRow.id);
    try {
      await rejectAccessorySubmission(rejectRow.id, rejectReason.trim(), reviewer);
      toast.success('Submission rejected');
      setRejectRow(null);
      setRejectReason('');
      qc.invalidateQueries({ queryKey: ['public-accessory-list'] });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to reject');
    } finally {
      setBusyId(null);
    }
  };

  const suggestAddLink = (row: AccessorySubmissionRow): string => {
    const params = new URLSearchParams();
    params.set('first_name', row.first_name);
    params.set('last_name', row.last_name);
    params.set('branch_id', row.branch_id);
    return `/register?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-muted/30 py-6 px-3 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Accessories Payments</h1>
          <p className="text-sm text-muted-foreground">Review and verify accessory payment submissions</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Branch</label>
                <Select value={branchFilter} onValueChange={setBranchFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All branches</SelectItem>
                    {branchOptions.map(b => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Product</label>
                <Select value={productFilter} onValueChange={setProductFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All products</SelectItem>
                    {productOptions.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Loading…</TableCell></TableRow>
                  )}
                  {!isLoading && filtered.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No submissions</TableCell></TableRow>
                  )}
                  {filtered.map(r => {
                    const name = `${r.first_name || ''} ${r.last_name || ''}`.trim();
                    const productsLabel = r.items.map(i => `${i.name} × ${i.qty}`).join(', ');
                    const isPending = r.status === 'pending_verification';
                    const showSuggestAdd = isPending && !r.matched_student_id;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm">{formatDate(r.created_at)}</TableCell>
                        <TableCell className="font-mono text-xs">{r.reference_number}</TableCell>
                        <TableCell className="text-sm">{r.branch_name || '—'}</TableCell>
                        <TableCell className="text-sm">{name}</TableCell>
                        <TableCell className="text-xs max-w-xs truncate" title={productsLabel}>{productsLabel}</TableCell>
                        <TableCell className="text-right text-sm">${Number(r.amount).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusClass(r.status)}>{r.status}</Badge>
                          {r.matched_student_id && <Badge variant="outline" className="ml-1">Matched</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 flex-wrap">
                            {r.proof_url && (
                              <Button size="sm" variant="ghost" asChild>
                                <a href={r.proof_url} target="_blank" rel="noreferrer" title="View proof">
                                  <ImageIcon className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                            {isPending && (
                              <>
                                <Button size="sm" variant="outline" disabled={busyId === r.id}
                                  onClick={() => handleVerify(r)}>
                                  <CheckCircle className="h-4 w-4 mr-1" /> Verify
                                </Button>
                                <Button size="sm" variant="outline" disabled={busyId === r.id}
                                  onClick={() => { setRejectRow(r); setRejectReason(''); }}>
                                  <XCircle className="h-4 w-4 mr-1" /> Reject
                                </Button>
                              </>
                            )}
                            {showSuggestAdd && (
                              <Button size="sm" variant="ghost" asChild>
                                <Link to={suggestAddLink(r)}>
                                  <UserPlus className="h-4 w-4 mr-1" /> Suggest Add
                                </Link>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y">
              {isLoading && <div className="p-4 text-center text-muted-foreground text-sm">Loading…</div>}
              {!isLoading && filtered.length === 0 && (
                <div className="p-4 text-center text-muted-foreground text-sm">No submissions</div>
              )}
              {filtered.map(r => {
                const name = `${r.first_name || ''} ${r.last_name || ''}`.trim();
                const productsLabel = r.items.map(i => `${i.name} × ${i.qty}`).join(', ');
                const isPending = r.status === 'pending_verification';
                const showSuggestAdd = isPending && !r.matched_student_id;
                return (
                  <div key={r.id} className="p-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium truncate">{name}</div>
                      <Badge variant="outline" className={statusClass(r.status)}>{r.status}</Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                      <span className="font-mono">{r.reference_number}</span>
                      <span>·</span>
                      <span>{r.branch_name || '—'}</span>
                      <span>·</span>
                      <span>{formatDate(r.created_at)}</span>
                    </div>
                    <div className="text-xs">{productsLabel}</div>
                    <div className="text-xs font-semibold">${Number(r.amount).toFixed(2)}</div>
                    <div className="flex gap-1 flex-wrap pt-1">
                      {r.proof_url && (
                        <Button size="sm" variant="ghost" asChild>
                          <a href={r.proof_url} target="_blank" rel="noreferrer">
                            <ImageIcon className="h-4 w-4 mr-1" /> Proof
                          </a>
                        </Button>
                      )}
                      {isPending && (
                        <>
                          <Button size="sm" variant="outline" disabled={busyId === r.id}
                            onClick={() => handleVerify(r)}>
                            <CheckCircle className="h-4 w-4 mr-1" /> Verify
                          </Button>
                          <Button size="sm" variant="outline" disabled={busyId === r.id}
                            onClick={() => { setRejectRow(r); setRejectReason(''); }}>
                            <XCircle className="h-4 w-4 mr-1" /> Reject
                          </Button>
                        </>
                      )}
                      {showSuggestAdd && (
                        <Button size="sm" variant="ghost" asChild>
                          <Link to={suggestAddLink(r)}>
                            <UserPlus className="h-4 w-4 mr-1" /> Suggest Add
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!rejectRow} onOpenChange={(o) => { if (!o) setRejectRow(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Submission</DialogTitle>
            <DialogDescription>
              Reference: <span className="font-mono">{rejectRow?.reference_number}</span>
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectRow(null)}>Cancel</Button>
            <Button variant="destructive" onClick={submitReject}
              disabled={!rejectReason.trim() || busyId === rejectRow?.id}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PublicAccessoriesList;
