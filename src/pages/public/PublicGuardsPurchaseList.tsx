/**
 * Public guards purchase list (no auth, password gated).
 * Mounted at /guardspurchase-list.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Lock, Unlock, CheckCircle, XCircle, UserPlus, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import { SignedImage } from '@/components/common/SignedMedia';
import { useBranches } from '@/hooks/useBranches';
import { useAuth } from '@/contexts/AuthContext';
import {
  listGuardsPurchases,
  updateGuardsPurchase,
  setGuardsCollected,
  findStudentMatches,
  createStudentFromPurchase,
  createInvoiceForPurchase,
  type GuardsPurchaseRow,
  type StudentMatchCandidate,
} from '@/services/guardsPurchaseService';

const PASSWORD = 'Hp97533488';
const SS_KEY = 'guards_list_unlocked_v1';

const statusVariant = (s: string) => {
  if (s === 'verified') return 'bg-green-100 text-green-800 border-green-200';
  if (s === 'rejected' || s === 'cancelled') return 'bg-red-100 text-red-800 border-red-200';
  return 'bg-yellow-100 text-yellow-800 border-yellow-200';
};

const PublicGuardsPurchaseList: React.FC = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { branches } = useBranches();
  const [unlocked, setUnlocked] = useState<boolean>(() => sessionStorage.getItem(SS_KEY) === '1');
  const [pwInput, setPwInput] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [collectedFilter, setCollectedFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [matchRow, setMatchRow] = useState<GuardsPurchaseRow | null>(null);
  const [matches, setMatches] = useState<StudentMatchCandidate[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['guards-purchases'],
    queryFn: listGuardsPurchases,
    enabled: unlocked,
    staleTime: 30 * 1000,
  });

  const tryUnlock = () => {
    if (pwInput === PASSWORD) {
      sessionStorage.setItem(SS_KEY, '1');
      setUnlocked(true);
      setPwInput('');
    } else {
      toast.error('Incorrect password');
    }
  };

  const branchMap = useMemo(() => new Map(branches.map(b => [b.id, b.name])), [branches]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (branchFilter !== 'all' && r.branch_id !== branchFilter) return false;
      if (statusFilter !== 'all' && r.sale_status !== statusFilter) return false;
      if (collectedFilter === 'yes' && !r.collected) return false;
      if (collectedFilter === 'no' && r.collected) return false;
      if (q) {
        const hay = `${r.first_name} ${r.last_name} ${r.email || ''} ${r.phone || ''} ${r.reference_number || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, branchFilter, statusFilter, collectedFilter, search]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['guards-purchases'] });

  const openMatch = async (r: GuardsPurchaseRow) => {
    setMatchRow(r);
    setMatchLoading(true);
    setMatches([]);
    try {
      const m = await findStudentMatches(r);
      setMatches(m);
    } catch (e: any) {
      toast.error(e.message || 'Failed to search');
    } finally {
      setMatchLoading(false);
    }
  };

  const handleConfirmMatch = async (studentId: string) => {
    if (!matchRow) return;
    setBusyId(matchRow.id);
    try {
      await createInvoiceForPurchase(matchRow, studentId);
      toast.success('Invoice created and linked');
      setMatchRow(null);
      refresh();
    } catch (e: any) {
      toast.error(e.message || 'Failed to create invoice');
    } finally {
      setBusyId(null);
    }
  };

  const handleCreateStudentAndInvoice = async () => {
    if (!matchRow) return;
    setBusyId(matchRow.id);
    try {
      const studentId = await createStudentFromPurchase(matchRow);
      await createInvoiceForPurchase(matchRow, studentId);
      toast.success('Student and invoice created');
      setMatchRow(null);
      refresh();
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleVerify = async (r: GuardsPurchaseRow) => {
    setBusyId(r.id);
    try {
      await updateGuardsPurchase(r.id, { sale_status: 'verified' } as any);
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (r: GuardsPurchaseRow) => {
    if (!confirm('Reject this order?')) return;
    setBusyId(r.id);
    try {
      await updateGuardsPurchase(r.id, { sale_status: 'rejected' } as any);
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleCollectedToggle = async (r: GuardsPurchaseRow, v: boolean) => {
    setBusyId(r.id);
    try {
      await setGuardsCollected(r.id, v, user?.email || 'staff');
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  };

  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4" /> Restricted</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Label>Password</Label>
            <Input type="password" value={pwInput} onChange={e => setPwInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && tryUnlock()} />
            <Button onClick={tryUnlock} className="w-full">Unlock</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4">
      <div className="max-w-7xl mx-auto space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h1 className="text-xl font-semibold">Guards Purchase List</h1>
          <Button variant="outline" size="sm" onClick={() => { sessionStorage.removeItem(SS_KEY); setUnlocked(false); }}>
            <Unlock className="h-4 w-4 mr-1" /> Lock
          </Button>
        </div>

        <Card>
          <CardContent className="p-3 grid grid-cols-1 sm:grid-cols-4 gap-2">
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger><SelectValue placeholder="Branch" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending_verification">Pending Verification</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={collectedFilter} onValueChange={setCollectedFilter}>
              <SelectTrigger><SelectValue placeholder="Collection" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Collection</SelectItem>
                <SelectItem value="yes">Collected</SelectItem>
                <SelectItem value="no">Not Collected</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Search name / phone / email / ref" value={search} onChange={e => setSearch(e.target.value)} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            {isLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Collected</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => {
                    const items = (r.items || []) as any[];
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {formatDateTime(r.created_at)}
                          {r.reference_number && <div className="text-[10px] font-mono text-muted-foreground">{r.reference_number}</div>}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="font-medium">{r.first_name} {r.last_name}</div>
                          <div className="text-muted-foreground">
                            {r.date_of_birth ? formatDate(r.date_of_birth) : ''}
                            {r.gender ? ` · ${r.gender}` : ''}
                          </div>
                          {r.current_belt && <div className="text-[10px]">{r.current_belt}</div>}
                        </TableCell>
                        <TableCell className="text-xs">{branchMap.get(r.branch_id || '') || r.branch_id}</TableCell>
                        <TableCell className="text-xs">
                          <div>{r.email}</div>
                          <div className="text-muted-foreground">{r.phone}</div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {items.map((it, i) => (
                            <div key={i}>{it.qty}× {it.label}</div>
                          ))}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          ${Number(r.total).toFixed(2)}
                          {Number(r.gst_amount) > 0 && (
                            <div className="text-[10px] text-muted-foreground">incl. ${Number(r.gst_amount).toFixed(2)} GST</div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div>{r.payment_method}</div>
                          {r.proof_url && (
                            <button
                              type="button"
                              onClick={() => setLightboxUrl(r.proof_url)}
                              className="text-blue-600 underline text-[10px]"
                            >
                              View proof
                            </button>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusVariant(r.sale_status)}>
                            {r.sale_status.replace(/_/g, ' ')}
                          </Badge>
                          {r.sale_status === 'pending_verification' && (
                            <div className="flex gap-1 mt-1">
                              <Button size="sm" variant="outline" className="h-6 px-2" onClick={() => handleVerify(r)} disabled={busyId === r.id}>
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" className="h-6 px-2 text-red-600" onClick={() => handleReject(r)} disabled={busyId === r.id}>
                                <XCircle className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={r.collected}
                              onCheckedChange={(v) => handleCollectedToggle(r, v === true)}
                              disabled={busyId === r.id}
                            />
                            {r.collected_at && <span className="text-[10px] text-muted-foreground">{formatDate(r.collected_at)}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {r.invoice_id ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700"><LinkIcon className="h-3 w-3 mr-1" />Invoiced</Badge>
                          ) : (
                            <Button size="sm" variant="outline" className="h-7" onClick={() => openMatch(r)} disabled={busyId === r.id}>
                              Match
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-6">No purchases found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Match student dialog */}
      <Dialog open={!!matchRow} onOpenChange={(o) => !o && setMatchRow(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Match to Student — {matchRow?.first_name} {matchRow?.last_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {matchLoading ? (
              <p className="text-sm text-muted-foreground">Searching…</p>
            ) : matches.length === 0 ? (
              <p className="text-sm text-muted-foreground">No matching students found.</p>
            ) : (
              <div className="space-y-2">
                {matches.map(m => (
                  <div key={m.id} className="flex items-center justify-between border rounded p-2 text-sm">
                    <div>
                      <div className="font-medium">{m.first_name} {m.last_name} {m.student_number && <span className="text-xs text-muted-foreground">({m.student_number})</span>}</div>
                      <div className="text-xs text-muted-foreground">
                        DOB: {m.date_of_birth ? formatDate(m.date_of_birth) : '—'} · Branch: {branchMap.get(m.branch_id || '') || '—'} · Belt: {m.current_belt || '—'}
                      </div>
                      <div className="text-xs text-muted-foreground">{m.email} · {m.phone}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">score {m.score}</Badge>
                      <Button size="sm" onClick={() => handleConfirmMatch(m.id)} disabled={busyId === matchRow?.id}>Confirm</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setMatchRow(null)}>Cancel</Button>
            <Button onClick={handleCreateStudentAndInvoice} disabled={busyId === matchRow?.id}>
              <UserPlus className="h-4 w-4 mr-1" /> Create new student &amp; invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Proof lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={(o) => !o && setLightboxUrl(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Proof of Payment</DialogTitle></DialogHeader>
          {lightboxUrl && <SignedImage src={lightboxUrl} alt="Proof" className="w-full h-auto" />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PublicGuardsPurchaseList;
