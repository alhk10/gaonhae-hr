import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowRightLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { createTransferRequest } from '@/services/inventoryTransferService';

interface StockTransferRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromBranchId: string;
  onRequestCreated?: () => void;
}

const StockTransferRequestDialog: React.FC<StockTransferRequestDialogProps> = ({
  open, onOpenChange, fromBranchId, onRequestCreated
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    to_branch_id: '',
    product_id: '',
    quantity: '',
    size_variant: '',
    reason: '',
  });

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
      const { data } = await supabase.from('products').select('id, name, sku').eq('is_active', true).order('name');
      return data || [];
    },
    enabled: open,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.to_branch_id || !formData.product_id || !formData.quantity) return;

    setLoading(true);
    const success = await createTransferRequest({
      from_branch_id: fromBranchId,
      to_branch_id: formData.to_branch_id,
      product_id: formData.product_id,
      quantity: parseInt(formData.quantity),
      size_variant: formData.size_variant || undefined,
      reason: formData.reason || undefined,
      requested_by: user?.email || '',
    });

    if (success) {
      setFormData({ to_branch_id: '', product_id: '', quantity: '', size_variant: '', reason: '' });
      onOpenChange(false);
      onRequestCreated?.();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" />
            Request Stock Transfer
          </DialogTitle>
          <DialogDescription>
            Submit a transfer request for superadmin approval.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Destination Branch *</Label>
            <Select value={formData.to_branch_id} onValueChange={v => setFormData(p => ({ ...p, to_branch_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
              <SelectContent>
                {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Product *</Label>
            <Select value={formData.product_id} onValueChange={v => setFormData(p => ({ ...p, product_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
              <SelectContent>
                {products.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} {p.sku ? `(${p.sku})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Quantity *</Label>
            <Input
              type="number"
              min="1"
              value={formData.quantity}
              onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))}
              placeholder="Enter quantity"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea
              value={formData.reason}
              onChange={e => setFormData(p => ({ ...p, reason: e.target.value }))}
              placeholder="Why is this transfer needed?"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading || !formData.to_branch_id || !formData.product_id || !formData.quantity}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StockTransferRequestDialog;
