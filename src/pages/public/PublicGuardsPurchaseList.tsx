/**
 * Public guards purchase list (no auth, password gated).
 * Mounted at /guardspurchase-list.
 */
import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Lock, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import { SignedImage } from '@/components/common/SignedMedia';
import { useBranches } from '@/hooks/useBranches';
import { useAuth } from '@/contexts/AuthContext';
import {
  listGuardsPurchases,
  updateGuardsPurchase,
  setGuardsCollected,
  getComponentsForCart,
  isVariantSelectionComplete,
  type GuardsPurchaseRow,
  type VariantSelectionsMap,
} from '@/services/guardsPurchaseService';

const PASSWORDS = ['Hp97533488', 'Hp84311884'];
const SS_KEY = 'guards_list_unlocked_v1';

const statusVariant = (s: string) => {
  if (s === 'verified') return 'bg-green-100 text-green-800 border-green-200';
  if (s === 'rejected' || s === 'cancelled') return 'bg-red-100 text-red-800 border-red-200';
  return 'bg-yellow-100 text-yellow-800 border-yellow-200';
};

interface PublicGuardsPurchaseListProps {
  embedded?: boolean;
  canDelete?: boolean;
  onRequestDelete?: (id: string, studentName: string) => void;
}

const PublicGuardsPurchaseList: React.FC<PublicGuardsPurchaseListProps> = ({ embedded = false, canDelete: canDeleteProp, onRequestDelete }) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { branches } = useBranches();
  const [unlocked, setUnlocked] = useState<boolean>(() => embedded || sessionStorage.getItem(SS_KEY) === '1');
  const [pwInput, setPwInput] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [collectedFilter, setCollectedFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [detailsRow, setDetailsRow] = useState<GuardsPurchaseRow | null>(null);
  const canDelete = canDeleteProp ?? (typeof window !== 'undefined' && sessionStorage.getItem('guards_list_unlock_level_v1') === 'full');

  // Auto-lock after 15 minutes of inactivity (standalone only)
  React.useEffect(() => {
    if (embedded || !unlocked) return;
    const TIMEOUT_MS = 15 * 60 * 1000;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        sessionStorage.removeItem(SS_KEY);
        sessionStorage.removeItem('guards_list_unlock_level_v1');
        setUnlocked(false);
        toast.info('Auto-locked after 15 minutes of inactivity');
      }, TIMEOUT_MS);
    };
    const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'touchstart', 'click', 'scroll'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [embedded, unlocked]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['guards-purchases'],
    queryFn: listGuardsPurchases,
    enabled: unlocked,
    staleTime: 30 * 1000,
  });

  const tryUnlock = () => {
    if (PASSWORDS.includes(pwInput)) {
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
    <div className="min-h-screen bg-muted/30 p-3">
      <div className="max-w-6xl mx-auto space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h1 className="text-lg font-semibold">Guards Purchase List</h1>
        </div>

        <Card>
          <CardContent className="p-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Branch" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending_verification">Pending Verification</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={collectedFilter} onValueChange={setCollectedFilter}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Collection" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Collection</SelectItem>
                <SelectItem value="yes">Collected</SelectItem>
                <SelectItem value="no">Not Collected</SelectItem>
              </SelectContent>
            </Select>
            <Input className="h-8 text-xs" placeholder="Search name / phone / email / ref" value={search} onChange={e => setSearch(e.target.value)} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            {isLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="[&_th]:h-8 [&_th]:px-2 [&_th]:text-[11px]">
                    <TableHead>Branch</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Proof</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Variants</TableHead>
                    <TableHead>Collected</TableHead>
                    <TableHead></TableHead>
                    {canDelete && onRequestDelete && <TableHead></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody className="[&_td]:px-2 [&_td]:py-1.5 [&_td]:text-xs">
                  {filtered.map(r => {
                    const items = (r.items || []) as any[];
                    const components = getComponentsForCart(items, r.gender);
                    const selections = (r.variant_selections || {}) as VariantSelectionsMap;
                    const variantsComplete = isVariantSelectionComplete(items, r.gender, selections);
                    const collectedBlocked = r.sale_status !== 'verified' || !variantsComplete;

                    const updateSelection = async (productId: string, patch: { size?: string; color?: string; gender?: 'male' | 'female' }) => {
                      const next: VariantSelectionsMap = {
                        ...selections,
                        [productId]: { ...selections[productId], ...patch },
                      };
                      setBusyId(r.id);
                      try {
                        await updateGuardsPurchase(r.id, { variant_selections: next } as any);
                        refresh();
                      } catch (e: any) {
                        toast.error(e.message);
                      } finally {
                        setBusyId(null);
                      }
                    };

                    return (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap">{branchMap.get(r.branch_id || '') || '—'}</TableCell>
                        <TableCell>
                          <div className="font-medium">{r.first_name} {r.last_name}</div>
                        </TableCell>
                        <TableCell>
                          {items.map((it, i) => (
                            <div key={i} className="leading-tight">{it.qty}× {it.label}</div>
                          ))}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          ${Number(r.total).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {r.proof_url ? (
                            <button
                              type="button"
                              onClick={() => setLightboxUrl(r.proof_url)}
                              className="block h-10 w-10 rounded border overflow-hidden hover:opacity-80"
                              title="View proof"
                            >
                              <SignedImage src={r.proof_url} alt="proof" className="h-full w-full object-cover" />
                            </button>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${statusVariant(r.sale_status)} text-[10px]`}>
                            {r.sale_status.replace(/_/g, ' ')}
                          </Badge>
                          {r.sale_status === 'pending_verification' && (
                            <div className="flex gap-1 mt-1">
                              <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => handleVerify(r)} disabled={busyId === r.id}>
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" className="h-6 w-6 p-0 text-red-600" onClick={() => handleReject(r)} disabled={busyId === r.id}>
                                <XCircle className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {components.length === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <div className="space-y-1 min-w-[180px]">
                              {components.map((c) => {
                                const sel = selections[c.product_id] || {};
                                return (
                                  <div key={c.product_id} className="flex items-center gap-1">
                                    <span className="text-[10px] text-muted-foreground w-[88px] truncate" title={c.name}>{c.name}</span>
                                    {c.genderChoice && (
                                      <Select
                                        value={sel.gender || ''}
                                        onValueChange={(v) => updateSelection(c.product_id, { gender: v as 'male' | 'female' } as any)}
                                      >
                                        <SelectTrigger className="h-6 text-[10px] px-1 w-[72px]"><SelectValue placeholder="M/F" /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="male" className="text-xs">Male</SelectItem>
                                          <SelectItem value="female" className="text-xs">Female</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    )}
                                    <Select
                                      value={sel.size || ''}
                                      onValueChange={(v) => updateSelection(c.product_id, { size: v })}
                                    >
                                      <SelectTrigger className="h-6 text-[10px] px-1 w-[68px]"><SelectValue placeholder="Size" /></SelectTrigger>
                                      <SelectContent>
                                        {c.sizes.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                    {c.colors.length > 0 && (
                                      <Select
                                        value={sel.color || ''}
                                        onValueChange={(v) => updateSelection(c.product_id, { color: v })}
                                      >
                                        <SelectTrigger className="h-6 text-[10px] px-1 w-[64px]"><SelectValue placeholder="Color" /></SelectTrigger>
                                        <SelectContent>
                                          {c.colors.map(co => <SelectItem key={co} value={co} className="text-xs">{co}</SelectItem>)}
                                        </SelectContent>
                                      </Select>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-1.5 ${collectedBlocked ? 'opacity-40' : ''}`}>
                            <Checkbox
                              checked={r.collected}
                              onCheckedChange={(v) => handleCollectedToggle(r, v === true)}
                              disabled={busyId === r.id || collectedBlocked}
                            />
                            {r.collected_at && <span className="text-[10px] text-muted-foreground">{formatDate(r.collected_at)}</span>}
                          </div>
                          {r.sale_status === 'verified' && !variantsComplete && (
                            <div className="text-[9px] text-muted-foreground mt-0.5">Select all variants</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setDetailsRow(r)}>
                            Details
                          </Button>
                        </TableCell>
                        {canDelete && onRequestDelete && (
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                              onClick={() => onRequestDelete(r.id, `${r.first_name} ${r.last_name}`.trim())}
                              title="Delete row"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={canDelete && onRequestDelete ? 10 : 9} className="text-center text-sm text-muted-foreground py-6">No purchases found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Details dialog */}
      <Dialog open={!!detailsRow} onOpenChange={(o) => !o && setDetailsRow(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Purchase Details</DialogTitle>
          </DialogHeader>
          {detailsRow && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                <div><span className="text-muted-foreground">Submitted:</span> {formatDateTime(detailsRow.created_at)}</div>
                <div><span className="text-muted-foreground">Reference:</span> <span className="font-mono">{detailsRow.reference_number || '—'}</span></div>
                <div><span className="text-muted-foreground">Branch:</span> {branchMap.get(detailsRow.branch_id || '') || '—'}</div>
                <div><span className="text-muted-foreground">Status:</span> {detailsRow.sale_status.replace(/_/g, ' ')}</div>
              </div>

              <div className="border-t pt-2">
                <div className="font-medium mb-1">Buyer</div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  <div><span className="text-muted-foreground">Name:</span> {detailsRow.first_name} {detailsRow.last_name}</div>
                  <div><span className="text-muted-foreground">DOB:</span> {detailsRow.date_of_birth ? formatDate(detailsRow.date_of_birth) : '—'}</div>
                  <div><span className="text-muted-foreground">Gender:</span> {detailsRow.gender || '—'}</div>
                  <div><span className="text-muted-foreground">Belt:</span> {detailsRow.current_belt || '—'}</div>
                  <div><span className="text-muted-foreground">Email:</span> {detailsRow.email || '—'}</div>
                  <div><span className="text-muted-foreground">Phone:</span> {detailsRow.phone || '—'}</div>
                </div>
              </div>

              <div className="border-t pt-2">
                <div className="font-medium mb-1">Items</div>
                <div className="space-y-0.5">
                  {((detailsRow.items || []) as any[]).map((it, i) => (
                    <div key={i} className="flex justify-between">
                      <span>{it.qty}× {it.label}</span>
                      {it.unit_price != null && <span>${(Number(it.unit_price) * Number(it.qty || 1)).toFixed(2)}</span>}
                    </div>
                  ))}
                </div>
                <div className="border-t mt-1.5 pt-1.5 flex justify-between font-medium">
                  <span>Total</span>
                  <span>${Number(detailsRow.total).toFixed(2)}</span>
                </div>
                {Number(detailsRow.gst_amount) > 0 && (
                  <div className="text-[10px] text-muted-foreground text-right">incl. ${Number(detailsRow.gst_amount).toFixed(2)} GST</div>
                )}
              </div>

              <div className="border-t pt-2">
                <div className="font-medium mb-1">Payment</div>
                <div><span className="text-muted-foreground">Method:</span> {detailsRow.payment_method}</div>
                {detailsRow.proof_url && (
                  <button
                    type="button"
                    onClick={() => setLightboxUrl(detailsRow.proof_url)}
                    className="mt-1.5 block h-24 w-24 rounded border overflow-hidden hover:opacity-80"
                  >
                    <SignedImage src={detailsRow.proof_url} alt="proof" className="h-full w-full object-cover" />
                  </button>
                )}
              </div>
            </div>
          )}
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
