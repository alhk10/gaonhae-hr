import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, DollarSign, Check, ChevronsUpDown, Image as ImageIcon, XCircle } from 'lucide-react';
import { openSignedUrl } from '@/components/common/SignedMedia';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import StatusBadge from '@/components/grading-list/StatusBadge';
import InvoiceDetailDialog from '@/components/grading-list/InvoiceDetailDialog';
import { formatCurrency } from '@/utils/currencyUtils';
import { formatDate } from '@/utils/dateFormat';
import { externalInvoiceBreakdown, defaultTaxInclusive } from '@/utils/externalInvoiceTotal';
import { Switch } from '@/components/ui/switch';

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
  proof_url: string | null; pending_payment: boolean; cancel_requested: boolean;
}
interface Line { product_id: string; quantity: number; unit_price: number; size_variant: string }

const rpc = ((fn: string, args?: any) => (supabase.rpc as any).call(supabase, fn, args)) as any;
const accessPw = () => { try { return sessionStorage.getItem('access_pw_v1') || ''; } catch { return ''; } };


const ExternalInvoicesTab: React.FC<Props> = ({ branchFilter, lockedBranchId, canEdit }) => {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [payRow, setPayRow] = useState<Row | null>(null);
  const [view, setView] = useState<{ id: string; number: string } | null>(null);
  const hasPw = true;

  const { data: rows = [], isLoading, error: listError } = useQuery({
    queryKey: ['external-invoices', lockedBranchId ?? null, canEdit, hasPw],
    enabled: canEdit && hasPw,
    retry: false,
    queryFn: async () => {
      const { data, error } = await rpc('list_external_invoices', { p_password: accessPw(), p_branch_id: lockedBranchId ?? null });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
  const visible = useMemo(() => rows.filter(r =>
    lockedBranchId || !branchFilter || branchFilter === 'all' || r.branch_name === branchFilter), [rows, branchFilter, lockedBranchId]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['external-invoices'] });
  const cancel = useMutation({
    mutationFn: async (r: Row) => {
      const reason = window.prompt(`Cancel ${r.invoice_number}? Stock will be returned. Reason:`);
      if (reason === null) return null;
      const { data, error } = await rpc('cancel_external_invoice', { p_password: accessPw(), p_invoice_id: r.id, p_reason: reason });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (res) => { if (!res) return; toast.success(res === 'cancelled' ? 'Invoice cancelled' : 'Cancellation sent to superadmin for approval'); refresh(); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!canEdit) return <Card><CardContent className="p-4 text-sm text-muted-foreground">Unlock edit mode to view external invoices.</CardContent></Card>;


  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">External Invoices ({visible.length})</CardTitle>
        {canEdit && <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" />New invoice</Button>}
      </CardHeader>
      <CardContent className="access-list-shell">
        {listError ? <p className="text-sm text-destructive">Could not load invoices: {(listError as any).message}</p>
          : isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : visible.length === 0 ? (
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
                  <TableCell data-label="Status">
                    <div className="flex flex-wrap gap-1 items-center">
                      <StatusBadge status={r.status} />
                      {r.pending_payment && <Badge variant="outline" className="text-[10px]">Payment pending verification</Badge>}
                      {r.cancel_requested && <Badge variant="outline" className="text-[10px]">Cancel pending approval</Badge>}
                      {r.proof_url && (
                        <button type="button" title="View proof" onClick={() => openSignedUrl(r.proof_url!)}><ImageIcon className="h-4 w-4 text-primary" /></button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell data-label="Actions">
                    <div className="flex flex-wrap gap-1">
                      {r.balance_due > 0 && r.status !== 'cancelled' && (
                        <Button size="sm" variant="outline" className="h-7" onClick={() => setPayRow(r)}><DollarSign className="h-3 w-3 mr-1" />Record payment</Button>
                      )}
                      {r.status !== 'cancelled' && !r.cancel_requested && (
                        <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => cancel.mutate(r)}><XCircle className="h-3 w-3 mr-1" />Cancel</Button>
                      )}
                    </div>
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

interface ProductOption {
  id: string; name: string; category: string; is_active: boolean; is_physical: boolean;
  base_price: number; branch_price: number | null; available_sizes: string[] | null; stock_on_hand: number | null;
  available_variants?: { sizes?: string[]; colors?: string[] } | null; variant_stock?: Record<string, number> | null;
}

export const productVariantKeys = (p: Pick<ProductOption, 'available_sizes' | 'available_variants'>): string[] => {
  const s = (p.available_variants?.sizes ?? []).filter(Boolean);
  const c = (p.available_variants?.colors ?? []).filter(Boolean);
  if (s.length && c.length) return c.flatMap(col => s.map(sz => `${col} / ${sz}`));
  if (s.length || c.length) return s.length ? s : c;
  return (p.available_sizes ?? []).filter(Boolean);
};

interface PickOption { key: string; product: ProductOption; variant: string; stock: number | null }

const ProductPicker: React.FC<{ products: ProductOption[]; value: string; variant: string; onChange: (p: ProductOption, variant: string) => void; loading?: boolean; error?: string | null; hasBranch?: boolean }> = ({ products, value, variant, onChange, loading, error, hasBranch }) => {
  const [open, setOpen] = useState(false);
  const selected = products.find(p => p.id === value);
  const groups = useMemo(() => {
    const m = new Map<string, PickOption[]>();
    products.forEach(p => {
      const k = p.category || 'Other';
      const keys = productVariantKeys(p);
      const opts: PickOption[] = keys.length
        ? keys.map(v => ({ key: `${p.id}__${v}`, product: p, variant: v, stock: p.variant_stock?.[v] ?? (p.is_physical ? 0 : null) }))
        : [{ key: p.id, product: p, variant: '', stock: p.stock_on_hand }];
      m.set(k, [...(m.get(k) || []), ...opts]);
    });
    return [...m.entries()];
  }, [products]);
  const label = selected ? (variant ? `${selected.name} — ${variant}` : selected.name) : null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-7 text-xs flex-1 min-w-[180px] justify-between font-normal">
          <span className="truncate">{label ?? (!hasBranch ? 'Choose a branch first' : error ? 'Products unavailable' : loading ? 'Loading products…' : 'Select product')}</span>
          <ChevronsUpDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[min(90vw,400px)]" align="start">
        <Command>
          <CommandInput placeholder="Search products…" className="text-xs" />
          <CommandList className="max-h-72">
            <CommandEmpty>{error ? `Could not load products: ${error}` : loading ? 'Loading products…' : !hasBranch ? 'Choose a branch first.' : 'No product found.'}</CommandEmpty>
            {groups.map(([cat, items]) => (
              <CommandGroup key={cat} heading={cat}>
                {items.map(o => (
                  <CommandItem key={o.key} value={`${o.product.name} ${o.variant} ${cat} ${o.key}`} onSelect={() => { onChange(o.product, o.variant); setOpen(false); }} className="text-xs">
                    <Check className={`h-3 w-3 mr-1 ${o.product.id === value && o.variant === variant ? 'opacity-100' : 'opacity-0'}`} />
                    <span className="flex-1 break-words">{o.product.name}{o.variant && <span className="text-muted-foreground"> — {o.variant}</span>}</span>
                    {!o.product.is_active && <Badge variant="outline" className="text-[9px] ml-1">Inactive</Badge>}
                    {o.product.is_physical && o.stock != null && <span className="text-[10px] text-muted-foreground ml-1">{o.stock} in stock</span>}
                    <span className="ml-2 text-muted-foreground">{formatCurrency(Number(o.product.branch_price ?? o.product.base_price ?? 0))}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
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
  const { data: products = [], isLoading: productsLoading, error: productsError } = useQuery({
    retry: false,
    queryKey: ['ext-inv-products', branchId],
    enabled: !!branchId,
    queryFn: async () => {
      const { data, error } = await rpc('list_external_invoice_products', { p_password: accessPw(), p_branch_id: branchId });
      if (error) throw error;
      return (data ?? []) as ProductOption[];
    },
  });
  const country = (branches as any[]).find(b => b.id === branchId)?.country;
  const [inclOverride, setInclOverride] = useState<{ branch: string; value: boolean } | null>(null);
  const inclusive = inclOverride?.branch === branchId ? inclOverride.value : defaultTaxInclusive(country);
  const { total, gst, rate } = externalInvoiceBreakdown(lines, country, inclusive);

  const save = useMutation({
    mutationFn: async () => {
      const items = lines.filter(l => l.product_id);
      const { data, error } = await rpc('create_external_invoice', { p_password: accessPw(), p_payload: {
        customer_category: category, customer_name: name, customer_email: email, customer_phone: phone,
        customer_reference: reference, branch_id: branchId, notes, items, tax_inclusive: inclusive, actor: 'access',
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
            return (
              <div key={i} className="flex flex-wrap gap-1 items-center">
                <ProductPicker loading={productsLoading} error={productsError ? (productsError as any).message : null} hasBranch={!!branchId} products={products as ProductOption[]} value={l.product_id} variant={l.size_variant} onChange={(pr, v) =>
                  setLine(i, { product_id: pr.id, unit_price: Number(pr.branch_price ?? pr.base_price ?? 0), size_variant: v })} />
                <Input className="h-7 text-xs w-16" type="number" min={1} value={l.quantity} onChange={e => setLine(i, { quantity: Math.max(1, Number(e.target.value) || 1) })} />
                <Input className="h-7 text-xs w-24" type="number" min={0} step="0.01" value={l.unit_price} onChange={e => setLine(i, { unit_price: Math.max(0, Number(e.target.value) || 0) })} />
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setLines(ls => ls.filter((_, idx) => idx !== i))}><Trash2 className="h-3 w-3" /></Button>
              </div>
            );
          })}
          <Button size="sm" variant="outline" className="h-7" onClick={() => setLines(ls => [...ls, { product_id: '', quantity: 1, unit_price: 0, size_variant: '' }])}><Plus className="h-3 w-3 mr-1" />Add item</Button>
          <div><Label className="text-xs">Notes</Label><Input className="h-7 text-xs" value={notes} onChange={e => setNotes(e.target.value)} /></div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {rate > 0 && <label className="flex items-center gap-2 text-xs"><Switch checked={inclusive} onCheckedChange={v => setInclOverride({ branch: branchId, value: v })} />Prices include GST</label>}
            <div className="text-right font-semibold">Total {rate > 0 ? (inclusive ? `(GST included ${formatCurrency(gst)})` : `(incl. ${Math.round(rate * 100)}% GST ${formatCurrency(gst)})`) : ''}: {formatCurrency(total)}</div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={save.isPending || !name.trim() || !branchId || !lines.some(l => l.product_id) || lines.some(l => {
            const p = (products as any[]).find(x => x.id === l.product_id); return !!p && productVariantKeys(p).length > 0 && !l.size_variant;
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
  const [file, setFile] = useState<File | null>(null);
  const needsProof = method === 'paynow' || method === 'bank_transfer';
  const pay = useMutation({
    mutationFn: async () => {
      let proofUrl: string | null = null;
      if (file) {
        if (!file.type.startsWith('image/')) throw new Error('Proof must be an image (PDF not accepted)');
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
        const path = `external-invoices/${row.id}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
        const up = await supabase.storage.from('payment-proofs').upload(path, file, { upsert: false, contentType: file.type });
        if (up.error) throw new Error('Could not upload the proof, please try again.');
        proofUrl = `payment-proofs/${path}`;
      }
      const { error } = await rpc('record_external_invoice_payment', {
        p_password: accessPw(), p_invoice_id: row.id, p_amount: Number(amount), p_method: method, p_reference: reference, p_proof_url: proofUrl,
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
          <div><Label className="text-xs">Proof of payment (image){needsProof ? '' : ' — optional for cash'}</Label>
            <Input className="h-8 text-xs" type="file" accept="image/*" onChange={e => {
              const f = e.target.files?.[0] || null;
              if (f && !f.type.startsWith('image/')) { toast.error('Please upload an image, not a PDF'); e.target.value = ''; return; }
              setFile(f);
            }} />
            {file && <img src={URL.createObjectURL(file)} alt="Proof preview" className="mt-1 max-h-32 rounded border" />}
            {!(method === 'cash') && <p className="text-[10px] text-muted-foreground mt-1">Non-cash payments are confirmed after staff verification.</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={pay.isPending || !(Number(amount) > 0) || (needsProof && !file)} onClick={() => pay.mutate()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExternalInvoicesTab;
