import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowRightLeft, Plus, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { createTransferRequest } from '@/services/inventoryTransferService';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

interface StockTransferRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromBranchId: string;
  onRequestCreated?: () => void;
}

interface TransferItem {
  id: string;
  product_id: string;
  quantity: string;
  size_variant: string;
}

let itemIdCounter = 0;
const makeItem = (): TransferItem => ({ id: `item-${++itemIdCounter}`, product_id: '', quantity: '', size_variant: '' });

const StockTransferRequestDialog: React.FC<StockTransferRequestDialogProps> = ({
  open, onOpenChange, fromBranchId, onRequestCreated
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [toBranchId, setToBranchId] = useState('');
  const [reason, setReason] = useState('');
  const [items, setItems] = useState<TransferItem[]>([makeItem()]);

  const { data: branches = [] } = useQuery({
    queryKey: ['branches-for-transfer'],
    queryFn: async () => {
      const { data } = await supabase.from('branches').select('id, name').order('name');
      return (data || []).filter(b => b.id !== fromBranchId);
    },
    enabled: open,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products-for-transfer'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('id, name, sku, requires_size, available_sizes').eq('is_active', true).eq('is_service', false).order('name');
      return data || [];
    },
    enabled: open,
  });

  const resetForm = () => {
    setToBranchId('');
    setReason('');
    setItems([makeItem()]);
  };

  const updateItem = (id: string, field: keyof TransferItem, value: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const addItem = () => {
    setItems(prev => [...prev, makeItem()]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const validItems = items.filter(item => item.product_id && item.quantity && parseInt(item.quantity) > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toBranchId || validItems.length === 0) {
      toast.error('Please select a destination branch and add at least one product');
      return;
    }

    setLoading(true);
    let successCount = 0;
    for (const item of validItems) {
      const success = await createTransferRequest({
        from_branch_id: fromBranchId,
        to_branch_id: toBranchId,
        product_id: item.product_id,
        quantity: parseInt(item.quantity),
        size_variant: item.size_variant || undefined,
        reason: reason || undefined,
        requested_by: user?.email || '',
      });
      if (success) successCount++;
    }

    if (successCount > 0) {
      toast.success(`${successCount} transfer request(s) submitted for approval`);
      resetForm();
      onOpenChange(false);
      onRequestCreated?.();
    }
    setLoading(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) resetForm();
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" />
            Request Stock Transfer
          </DialogTitle>
          <DialogDescription>
            Add multiple products to transfer in one go. Each requires superadmin approval.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="space-y-2">
            <Label>Destination Branch *</Label>
            <Select value={toBranchId} onValueChange={setToBranchId}>
              <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
              <SelectContent>
                {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Product rows */}
          <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between">
              <Label>Products ({items.length})</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-3 h-3 mr-1" />
                Add Product
              </Button>
            </div>

            <ScrollArea className="flex-1 max-h-[300px] pr-2">
              <div className="space-y-3">
                {items.map((item, index) => {
                  const selectedProduct = products.find(p => p.id === item.product_id);
                  const hasSizes = selectedProduct?.requires_size && Array.isArray(selectedProduct?.available_sizes) && selectedProduct.available_sizes.length > 0;

                  return (
                    <div key={item.id} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Item {index + 1}</span>
                        {items.length > 1 && (
                          <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeItem(item.id)}>
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        )}
                      </div>
                      <Select value={item.product_id} onValueChange={v => updateItem(item.id, 'product_id', v)}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} {p.sku ? `(${p.sku})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e => updateItem(item.id, 'quantity', e.target.value)}
                          placeholder="Qty"
                          className="h-9 text-sm flex-1"
                        />
                        {hasSizes && (
                          <Select value={item.size_variant} onValueChange={v => updateItem(item.id, 'size_variant', v)}>
                            <SelectTrigger className="h-9 text-sm flex-1">
                              <SelectValue placeholder="Size" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Any size</SelectItem>
                              {(selectedProduct.available_sizes as string[]).map(s => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Why is this transfer needed?"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading || !toBranchId || validItems.length === 0}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit {validItems.length > 0 ? `${validItems.length} Request${validItems.length > 1 ? 's' : ''}` : 'Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StockTransferRequestDialog;
