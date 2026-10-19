import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import StatusBadge from '@/components/grading-list/StatusBadge';
import InvoiceDetailDialog from '@/components/grading-list/InvoiceDetailDialog';
import { formatCurrency } from '@/utils/currencyUtils';
import { formatDate } from '@/utils/dateFormat';

interface Props {
  branchFilter?: string;
  lockedBranchId?: string;
  canEdit: boolean;
}

const CATEGORY_LABEL: Record<string, string> = { trial: 'Trial student', school_club: 'School / Club', retail: 'Retail' };

interface Row {
  id: string; invoice_number: string; customer_name: string; customer_category: string | null;
  customer_email: string | null; customer_phone: string | null; branch_id: string; branch_name: string;
  status: string; total_amount: number; amount_paid: number; balance_due: number; issue_date: string; items: string | null;
}
interface Line { product_id: string; quantity: number; unit_price: number; size_variant: string }

const rpc = supabase.rpc as any;

const ExternalInvoicesTab: React.FC<Props> = ({ branchFilter, lockedBranchId, canEdit }) => {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [payRow, setPayRow] = useState<Row | null>(null);
  const [view, setView] = useState<{ id: string; number: string } | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['external-invoices', lockedBranchId ?? null],
    queryFn: async () => {
      const { data, error } = await rpc('list_external_invoices', { p_branch_id: lockedBranchId ?? null });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
  const visible = useMemo(() => rows.filter(r =>
    lockedBranchId || !branchFilter || branchFilter === 'all' || r.branch_name === branchFilter), [rows, branchFilter, lockedBranchId]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['external-invoices'] });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">External Invoices ({visible.length})</CardTitle>
        {canEdit && <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" />New invoice</Button>}
      </CardHeader>
      <CardContent className="access-list-shell">
        {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">No external invoices yet.</p>
        ) : (
          <Table className="access-list-table">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead><TableHead>Invoice</TableHead><TableHead>Customer</TableHead>
                <TableHead>Branch</TableHead><TableHead>Items</TableHead><TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Balance</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map(r => (
                <TableRow key={r.id}>
                  <TableCell data-label="Date">{formatDate(r.issue_date)}</TableCell>
                  <TableCell data-label="Invoice">
                    <button className="text-primary underline text-xs" onClick={() => setView({ id: r.id, number: r.invoice_number })}>{r.invoice_number}</button>
                  </TableCell>
                  <TableCell data-label="Customer">
                    <div className="font-medium">{r.customer_name}</div>
                    <Badge variant="outline" className="text-[10px]">{CATEGORY_LABEL[r.customer_category ?? 'retail'] ?? 'External'}</Badge>
                    {r.customer_phone && <div className="text-[11px] text-muted-foreground">{r.customer_phone}</div>}
                  </TableCell>
                  <TableCell data-label="Branch">{r.branch_name}</TableCell>
                  <TableCell data-label="Items" className="text-xs break-words">{r.items ?? '—'}</TableCell>
                  <TableCell data-label="Total" className="text-right">{formatCurrency(r.total_amount)}</TableCell>
                  <TableCell data-label="Balance" className="text-right">{formatCurrency(r.balance_due)}</TableCell>
                  <TableCell data-label="Status"><StatusBadge status={r.status} /></TableCell>
                  <TableCell data-label="Actions">
                    {canEdit && r.balance_due > 0 && r.status !== 'cancelled' && (
                      <Button size="sm" variant="outline" className="h-7" onClick={() => setPayRow(r)}><DollarSign className="h-3 w-3 mr-1" />Record payment</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      {createOpen && <CreateDialog lockedBranchId={lockedBranchId} onClose={() => setCreateOpen(false)} onDone={refresh} />}
      {payRow && <PayDialog row={payRow} onClose={() => setPayRow(null)} onDone={refresh} />}
      {view && (
        <InvoiceDetailDialog open invoiceId={view.id} invoiceNumber={view.number} onOpenChange={(o: boolean) => { if (!o) setView(null); }} />
      )}
    </Card>
  );
};

const CreateDialog: React.FC<{ lockedBranchId?: string; onClose: () => void; onDone: () => void }> = ({ lockedBranchId, onClose, onDone }) => {
  const [category, setCategory] = useState('school_club');
  const [name, setName] = useState(''); const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(''); const [reference, setReference] = useState('');
  const [branchId, setBranchId] = useState(lockedBranchId ?? '');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([{ product_id: '', quantity: 1, unit_price: 0, size_variant: '' }]);

  const { data: branches = [] } = useQuery({
    queryKey: ['ext-inv-branches'],
    queryFn: async () => { const { data } = await supabase.from('branches').select('id,name,country').order('name'); return data ?? []; },
  });
  const { data: products = [] } = useQuery({
    queryKey: ['ext-inv-products'],
    queryFn: async () => { const { data, error } = await rpc('list_external_invoice_products'); if (error) throw error; return (data ?? []) as any[]; },
  });
  const country = (branches as any[]).find(b => b.id === branchId)?.country;
  const lineTotal = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);
  const total = country === 'Singapore' ? lineTotal * 1.09 : lineTotal;

  const save = useMutation({
    mutationFn: async () => {
      const items = lines.filter(l => l.product_id);
      const { data, error } = await rpc('create_external_invoice', { p_payload: {
        customer_category: category, customer_name: name, customer_email: email, customer_phone: phone,
        customer_reference: reference, branch_id: branchId, notes, items, actor: 'access',
      } });
      if (error) throw error;
      return data;
    },
    onSuccess: (d: any) => { toast.success(`Invoice ${d?.invoice_number} created`); onDone(); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  const setLine = (i: number, patch: Partial<Line>) => setLines(ls => ls.map((l, idx) => idx === i ? { ...l, ...patch } : l));

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto text-xs">
        <DialogHeader><DialogTitle>New external customer invoice</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div><Label className="text-xs">Customer type</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(CATEGORY_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select></div>
          <div><Label className="text-xs">Branch</Label>
            <Select value={branchId} onValueChange={setBranchId} disabled={!!lockedBranchId}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select branch" /></SelectTrigger>
              <SelectContent>{(branches as any[]).map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
            </Select></div>
          <div><Label className="text-xs">{category === 'school_club' ? 'School / club name' : 'Customer name'}</Label>
            <Input className="h-7 text-xs" value={name} onChange={e => setName(e.target.value.toUpperCase())} /></div>
          <div><Label className="text-xs">{category === 'school_club' ? 'UEN / registration no.' : 'Reference'}</Label>
            <Input className="h-7 text-xs" value={reference} onChange={e => setReference(e.target.value)} /></div>
          <div><Label className="text-xs">Email</Label><Input className="h-7 text-xs" type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div><Label className="text-xs">Phone</Label><Input className="h-7 text-xs" value={phone} onChange={e => setPhone(e.target.value)} /></div>
        </div>
        <div className="space-y-2 mt-2">
          <Label className="text-xs">Items</Label>
          {lines.map((l, i) => {
            const p = (products as any[]).find(x => x.id === l.product_id);
            return (
              <div key={i} className="flex flex-wrap gap-1 items-center">
                <Select value={l.product_id} onValueChange={v => {
                  const pr = (products as any[]).find(x => x.id === v);
                  setLine(i, { product_id: v, unit_price: Number(pr?.base_price ?? 0), size_variant: '' });
                }}>
                  <SelectTrigger className="h-7 text-xs flex-1 min-w-[180px]"><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>{(products as any[]).map(x => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent>
                </Select>
                {p?.available_sizes?.length > 0 && (
                  <Select value={l.size_variant} onValueChange={v => setLine(i, { size_variant: v })}>
                    <SelectTrigger className="h-7 text-xs w-20"><SelectValue placeholder="Size" /></SelectTrigger>
                    <SelectContent>{p.available_sizes.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                )}
                <Input className="h-7 text-xs w-16" type="number" min={1} value={l.quantity} onChange={e => setLine(i, { quantity: Math.max(1, Number(e.target.value) || 1) })} />
                <Input className="h-7 text-xs w-24" type="number" min={0} step="0.01" value={l.unit_price} onChange={e => setLine(i, { unit_price: Math.max(0, Number(e.target.value) || 0) })} />
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setLines(ls => ls.filter((_, idx) => idx !== i))}><Trash2 className="h-3 w-3" /></Button>
              </div>
            );
          })}
          <Button size="sm" variant="outline" className="h-7" onClick={() => setLines(ls => [...ls, { product_id: '', quantity: 1, unit_price: 0, size_variant: '' }])}><Plus className="h-3 w-3 mr-1" />Add item</Button>
          <div><Label className="text-xs">Notes</Label><Input className="h-7 text-xs" value={notes} onChange={e => setNotes(e.target.value)} /></div>
          <div className="text-right font-semibold">Total {country === 'Singapore' ? '(incl. 9% GST)' : country === 'Australia' ? '(GST included)' : ''}: {formatCurrency(total)}</div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={save.isPending || !name.trim() || !branchId || !lines.some(l => l.product_id) || lines.some(l => {
            const p = (products as any[]).find(x => x.id === l.product_id); return p?.available_sizes?.length > 0 && !l.size_variant;
          })} onClick={() => save.mutate()}>Create invoice</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const PayDialog: React.FC<{ row: Row; onClose: () => void; onDone: () => void }> = ({ row, onClose, onDone }) => {
  const [amount, setAmount] = useState(String(row.balance_due));
  const [method, setMethod] = useState('paynow');
  const [reference, setReference] = useState('');
  const pay = useMutation({
    mutationFn: async () => {
      const { error } = await rpc('record_external_invoice_payment', {
        p_invoice_id: row.id, p_amount: Number(amount), p_method: method, p_reference: reference, p_actor: 'access',
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Payment recorded'); onDone(); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-sm text-xs">
        <DialogHeader><DialogTitle>Record payment · {row.invoice_number}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <div><Label className="text-xs">Amount (balance {formatCurrency(row.balance_due)})</Label>
            <Input className="h-7 text-xs" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></div>
          <div><Label className="text-xs">Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="paynow">PayNow</SelectItem><SelectItem value="bank_transfer">Bank transfer</SelectItem>
                <SelectItem value="cash">Cash</SelectItem><SelectItem value="card">Card</SelectItem><SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select></div>
          <div><Label className="text-xs">Reference</Label><Input className="h-7 text-xs" value={reference} onChange={e => setReference(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={pay.isPending || !(Number(amount) > 0)} onClick={() => pay.mutate()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExternalInvoicesTab;
