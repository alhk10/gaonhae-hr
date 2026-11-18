import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PaymentInfoDisplay from '@/components/payment/PaymentInfoDisplay';
import ProofOfPaymentUpload from '@/components/payment/ProofOfPaymentUpload';
import { getPublicLimitedEditions, limitedEditionKey, type LimitedEditionProduct } from '@/services/limitedEditionService';
import { getPublicPaymentOptions } from '@/services/gradingPaymentSubmissionService';
import { submitGuardsPurchase, type GuardsCartItem } from '@/services/guardsPurchaseService';
import { taxRound } from '@/utils/invoiceTotals';
import { newClientRef } from '@/utils/publicPaymentValidation';

interface Props {
  /** True when no other /hello popup is showing for the recognised student. */
  enabled: boolean;
  studentKey: string;
  branchId: string;
  country?: string | null;
  student: { first_name: string; last_name: string; gender?: string | null; current_belt?: string | null };
  dateOfBirth: string | null;
  email: string;
  phone: string;
  /** Increment to reopen the list (menu button). */
  openSignal?: number;
}

interface Line { itemId: string; design: string; size: string; qty: number }

const LimitedEditionPopup: React.FC<Props> = ({ enabled, studentKey, branchId, country, student, dateOfBirth, email, phone, openSignal = 0 }) => {
  const isSG = (country || '').toLowerCase() === 'singapore';
  const cur = (country || '').toLowerCase() === 'australia' ? 'A$' : 'S$';
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);
  const [orderOpen, setOrderOpen] = useState(false);
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [payMethod, setPayMethod] = useState<'paynow' | 'bank_transfer'>(isSG ? 'paynow' : 'bank_transfer');
  const [proof, setProof] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [doneRef, setDoneRef] = useState<string | null>(null);
  const [clientRef] = useState(() => newClientRef());

  const { data: items = [] } = useQuery({
    queryKey: ['hello-limited-editions', branchId],
    queryFn: () => getPublicLimitedEditions(branchId),
    enabled: !!branchId,
    staleTime: 60_000,
  });
  const { data: payOpts } = useQuery({
    queryKey: ['public-payment-options-hello', branchId],
    queryFn: () => getPublicPaymentOptions(branchId, 'White'),
    enabled: !!branchId && orderOpen,
  });
  const [forced, setForced] = useState(false);
  useEffect(() => { if (openSignal > 0) setForced(true); }, [openSignal]);
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  useEffect(() => { setPayMethod(isSG ? 'paynow' : 'bank_transfer'); }, [isSG]);

  const showPopup = items.length > 0 && !orderOpen && (forced || (enabled && dismissedFor !== studentKey));

  const newLine = (it: LimitedEditionProduct): Line => ({ itemId: it.id, design: it.designs[0] || '', size: it.sizes[0] || '', qty: 1 });
  const startOrder = (it: LimitedEditionProduct) => {
    setLines([newLine(it)]);
    setProof(null); setDoneRef(null);
    setDismissedFor(studentKey); setForced(false);
    setOrderOpen(true);
  };
  const update = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const subtotal = lines.reduce((s, l) => s + (byId.get(l.itemId)?.price || 0) * l.qty, 0);
  const gst = isSG ? taxRound(subtotal * 0.09) : 0;
  const total = Number((subtotal + gst).toFixed(2));

  const submit = async () => {
    if (!lines.length) return;
    for (const l of lines) {
      const it = byId.get(l.itemId);
      if (!it) return toast.error('Item is no longer available');
      if (it.sizes.length && !l.size) return toast.error(`Choose a size for ${it.name}`);
      if (it.designs.length && !l.design) return toast.error(`Choose a design for ${it.name}`);
      if (!(l.qty >= 1)) return toast.error('Quantity must be at least 1');
      const want = lines.filter((x) => x.itemId === it.id).reduce((s, x) => s + x.qty, 0);
      if (it.remaining != null && want > it.remaining) return toast.error(`Only ${it.remaining} ${it.name} left`);
    }
    if (!proof) return toast.error('Please upload your payment proof');
    setBusy(true);
    try {
      const cart: GuardsCartItem[] = lines.map((l) => {
        const it = byId.get(l.itemId)!;
        const variant = [l.design, l.size].filter(Boolean).join(' / ');
        return {
          key: limitedEditionKey(it.id, l.design, l.size),
          label: `Limited Edition - ${it.name}${variant ? ` (${variant})` : ''}`,
          qty: l.qty,
          unit_price_inc: it.price,
          product_id: it.product_id,
          size: l.size || null,
          design: l.design || null,
        } as GuardsCartItem;
      });
      const res = await submitGuardsPurchase({
        first_name: student.first_name,
        last_name: student.last_name,
        date_of_birth: dateOfBirth,
        branch_id: branchId,
        gender: student.gender || '',
        current_belt: student.current_belt || '',
        email, phone,
        items: cart,
        payment_method: payMethod,
        proof_file: proof,
        is_singapore: isSG,
        client_ref: clientRef,
      } as any);
      setDoneRef(res.reference_number || 'received');
    } catch (e: any) {
      toast.error(e?.message || 'Order failed');
    } finally {
      setBusy(false);
    }
  };

  const incl = (n: number) => (isSG ? taxRound(n * 1.09) : n);
  return (
    <>
      <Dialog open={!!zoomUrl} onOpenChange={(o) => { if (!o) setZoomUrl(null); }}>
        <DialogContent className="max-w-[98vw] w-auto p-1 sm:max-w-3xl">
          {zoomUrl && <img src={zoomUrl} alt="Zoomed product" className="max-w-full max-h-[88vh] w-auto h-auto mx-auto object-contain rounded-md cursor-zoom-out" onClick={() => setZoomUrl(null)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={showPopup} onOpenChange={(o) => { if (!o) { setDismissedFor(studentKey); setForced(false); } }}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-md max-h-[85vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6">
          <DialogHeader><DialogTitle className="text-base">Limited Edition</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {items.map((it) => (
              <div key={it.id} className="rounded-md border p-3 space-y-2">
                {it.image_urls.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory">
                    {it.image_urls.map((u) => <img key={u} src={u} alt={it.name} className="w-full h-auto shrink-0 snap-center rounded-md cursor-zoom-in" onClick={() => setZoomUrl(u)} />)}
                  </div>
                )}
                <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-0.5">
                  <p className="font-semibold text-sm break-words min-w-0">{it.name}</p>
                  <p className="text-sm font-semibold whitespace-nowrap">{cur}{incl(it.price).toFixed(2)}</p>
                </div>
                {it.description && <p className="text-xs text-muted-foreground whitespace-pre-line break-words">{it.description}</p>}
                {it.remaining != null && <p className="text-[11px] text-muted-foreground">{it.remaining} left</p>}
                <Button size="sm" className="w-full" onClick={() => startOrder(it)}>Order</Button>
              </div>
            ))}
            <Button variant="outline" className="w-full" onClick={() => { setDismissedFor(studentKey); setForced(false); }}>Later</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={orderOpen} onOpenChange={(o) => { if (!o && !busy) setOrderOpen(false); }}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-md max-h-[85vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6">
          <DialogHeader><DialogTitle className="text-base">Order Limited Edition</DialogTitle></DialogHeader>
          {doneRef ? (
            <div className="space-y-3">
              <p className="text-sm">Thank you! Your order has been received{doneRef !== 'received' ? ` (ref ${doneRef})` : ''}. We'll let you know when it's ready to collect.</p>
              <Button className="w-full" onClick={() => setOrderOpen(false)}>Done</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {lines.map((l, i) => {
                const it = byId.get(l.itemId);
                return (
                  <div key={i} className="rounded-md border p-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <Select value={l.itemId} onValueChange={(v) => { const n = byId.get(v); if (n) update(i, newLine(n)); }}>
                        <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{items.map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent>
                      </Select>
                      {lines.length > 1 && (
                        <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Remove line" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {it && it.designs.length > 0 && (
                        <div><Label className="text-[11px]">Design</Label>
                          <Select value={l.design} onValueChange={(v) => update(i, { design: v })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Design" /></SelectTrigger>
                            <SelectContent>{it.designs.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                          </Select></div>
                      )}
                      {it && it.sizes.length > 0 && (
                        <div><Label className="text-[11px]">Size</Label>
                          <Select value={l.size} onValueChange={(v) => update(i, { size: v })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Size" /></SelectTrigger>
                            <SelectContent>{it.sizes.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                          </Select></div>
                      )}
                      <div><Label className="text-[11px]">Qty</Label>
                        <Input type="number" min={1} className="h-8 text-xs" value={l.qty}
                          onChange={(e) => update(i, { qty: Math.max(1, Math.floor(Number(e.target.value) || 1)) })} /></div>
                    </div>
                    {it && <p className="text-[11px] text-muted-foreground text-right">{cur}{incl(it.price * l.qty).toFixed(2)}</p>}
                  </div>
                );
              })}
              <Button variant="outline" size="sm" className="w-full" onClick={() => setLines((ls) => [...ls, newLine(byId.get(ls[ls.length - 1]?.itemId) || items[0])])}>
                <Plus className="h-4 w-4 mr-1" /> Add another item
              </Button>
              <div className="text-sm space-y-0.5 border-t pt-2">
                <div className="flex justify-between"><span>Subtotal</span><span>{cur}{subtotal.toFixed(2)}</span></div>
                {isSG && <div className="flex justify-between"><span>GST 9% (incl.)</span><span>{cur}{gst.toFixed(2)}</span></div>}
                <div className="flex justify-between font-semibold"><span>Total</span><span>{cur}{total.toFixed(2)}</span></div>
              </div>
              {isSG && (
                <Select value={payMethod} onValueChange={(v) => setPayMethod(v as any)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paynow">PayNow</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <PaymentInfoDisplay paymentMethod={payMethod} bankTransferInfo={payOpts?.bank_transfer_info} paynowQrUrl={isSG ? payOpts?.paynow_qr_url : null} />
              <ProofOfPaymentUpload value={proof} onChange={setProof} required label="Upload your payment proof" />
              <Button className="w-full" disabled={busy} onClick={submit}>{busy ? 'Submitting…' : `Submit order · ${cur}${total.toFixed(2)}`}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LimitedEditionPopup;
