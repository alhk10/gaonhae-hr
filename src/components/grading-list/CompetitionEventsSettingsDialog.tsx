import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Pencil } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  getPublicCompetitionEvents,
  adminUpsertCompetitionEvent,
  adminDeleteCompetitionEvent,
  adminSetCompetitionEventActive,
  type CompetitionEvent,
} from '@/services/competitionPaymentSubmissionService';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProductLite { id: string; name: string; base_price: number; tax_rate: number }

const fetchProducts = async (): Promise<ProductLite[]> => {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, base_price, tax_rate, is_active')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return (data || []) as any;
};

const emptyForm = () => ({
  id: null as string | null,
  name: '',
  is_active: true,
  display_order: 0,
  coaching_product_id: null as string | null,
  indemnity_clause: '',
  require_indemnity_form: false,
  require_passport: false,
  require_photo: false,
  category_product_ids: [] as string[],
});

const CompetitionEventsSettingsDialog: React.FC<Props> = ({ open, onOpenChange }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);
  const formPanelRef = useRef<HTMLDivElement>(null);

  const handleNewClick = () => {
    setForm(emptyForm());
    setProductSearch('');
    requestAnimationFrame(() => {
      formPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      nameInputRef.current?.focus();
    });
  };

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['competition-events-admin'],
    queryFn: getPublicCompetitionEvents,
    enabled: open,
  });
  const { data: products = [] } = useQuery({
    queryKey: ['competition-events-products'],
    queryFn: fetchProducts,
    enabled: open,
  });

  useEffect(() => {
    if (!open) {
      setForm(emptyForm());
      setProductSearch('');
    }
  }, [open]);

  const filteredProducts = useMemo(() => {
    const t = productSearch.trim().toLowerCase();
    if (!t) return products;
    return products.filter(p => p.name.toLowerCase().includes(t));
  }, [products, productSearch]);

  const startEdit = (e: CompetitionEvent) => {
    setForm({
      id: e.id,
      name: e.name,
      is_active: e.is_active,
      display_order: e.display_order,
      coaching_product_id: e.coaching_product_id,
      indemnity_clause: e.indemnity_clause || '',
      require_indemnity_form: e.require_indemnity_form,
      require_passport: e.require_passport,
      require_photo: e.require_photo,
      category_product_ids: e.categories.map(c => c.product_id),
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      await adminUpsertCompetitionEvent({
        id: form.id,
        name: form.name.trim(),
        is_active: form.is_active,
        display_order: form.display_order,
        coaching_product_id: form.coaching_product_id,
        indemnity_clause: form.indemnity_clause.trim() || null,
        require_indemnity_form: form.require_indemnity_form,
        require_passport: form.require_passport,
        require_photo: form.require_photo,
        category_product_ids: form.category_product_ids,
      });
      toast.success(form.id ? 'Event updated' : 'Event created');
      qc.invalidateQueries({ queryKey: ['competition-events-admin'] });
      qc.invalidateQueries({ queryKey: ['public-competition-events'] });
      setForm(emptyForm());
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (e: CompetitionEvent, next: boolean) => {
    try {
      await adminSetCompetitionEventActive(e.id, next);
      qc.invalidateQueries({ queryKey: ['competition-events-admin'] });
      qc.invalidateQueries({ queryKey: ['public-competition-events'] });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update');
    }
  };

  const handleDelete = async (e: CompetitionEvent) => {
    if (!window.confirm(`Delete event "${e.name}"? This cannot be undone.`)) return;
    try {
      await adminDeleteCompetitionEvent(e.id);
      toast.success('Event deleted');
      qc.invalidateQueries({ queryKey: ['competition-events-admin'] });
      qc.invalidateQueries({ queryKey: ['public-competition-events'] });
      if (form.id === e.id) setForm(emptyForm());
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete');
    }
  };

  const toggleCategory = (id: string, checked: boolean) => {
    setForm(prev => ({
      ...prev,
      category_product_ids: checked
        ? Array.from(new Set([...prev.category_product_ids, id]))
        : prev.category_product_ids.filter(x => x !== id),
    }));
  };

  const signatureRequired = form.indemnity_clause.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Competition Events</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Events list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Events</h3>
              <Button size="sm" variant="outline" onClick={handleNewClick}>
                <Plus className="h-3 w-3 mr-1" /> New
              </Button>
            </div>
            {isLoading && <div className="text-xs text-muted-foreground">Loading…</div>}
            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {events.map(e => (
                <div
                  key={e.id}
                  className={`flex items-center gap-2 border rounded p-2 text-sm ${form.id === e.id ? 'bg-muted/50 border-primary' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate flex items-center gap-2">
                      {e.name}
                      {!e.is_active && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {e.categories.length} {e.categories.length === 1 ? 'category' : 'categories'}
                      {e.coaching_product_name ? ` · ${e.coaching_product_name}` : ''}
                    </div>
                  </div>
                  <Switch
                    checked={e.is_active}
                    onCheckedChange={(v) => handleToggleActive(e, v)}
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(e)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" onClick={() => handleDelete(e)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              {!isLoading && events.length === 0 && (
                <div className="text-xs text-muted-foreground border rounded p-3 text-center">
                  No events yet. Create one on the right.
                </div>
              )}
            </div>
          </div>

          {/* Edit/create form */}
          <div className="space-y-3 border-l md:pl-4">
            <h3 className="text-sm font-medium">{form.id ? 'Edit event' : 'New event'}</h3>

            <div className="space-y-1">
              <Label className="text-xs">Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Singapore Open Poomsae 2026"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Display order</Label>
                <Input
                  type="number"
                  value={form.display_order}
                  onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Active</Label>
                <div className="flex items-center h-10">
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Coaching fee product</Label>
              <Select
                value={form.coaching_product_id ?? ''}
                onValueChange={(v) => setForm({ ...form, coaching_product_id: v || null })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select coaching product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — ${Number(p.base_price).toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Category products</Label>
              <Input
                placeholder="Search products…"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="h-8"
              />
              <div className="border rounded p-2 max-h-48 overflow-y-auto space-y-1">
                {filteredProducts.map(p => {
                  const checked = form.category_product_ids.includes(p.id);
                  return (
                    <div key={p.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        id={`prod-${p.id}`}
                        checked={checked}
                        onCheckedChange={(c) => toggleCategory(p.id, c === true)}
                      />
                      <Label htmlFor={`prod-${p.id}`} className="flex-1 cursor-pointer font-normal text-xs">
                        {p.name}
                      </Label>
                      <span className="text-xs text-muted-foreground">${Number(p.base_price).toFixed(2)}</span>
                    </div>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <div className="text-xs text-muted-foreground">No matching products.</div>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {form.category_product_ids.length} selected
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Indemnity clause text</Label>
              <Textarea
                value={form.indemnity_clause}
                onChange={(e) => setForm({ ...form, indemnity_clause: e.target.value })}
                placeholder="Leave blank if no indemnity required. Signature is auto-required when this is filled."
                rows={4}
              />
              <p className="text-[11px] text-muted-foreground">
                {signatureRequired
                  ? 'Signature will be required on the public form.'
                  : 'No clause set — signature will not be requested.'}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Required uploads</Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="req-indemnity"
                  checked={form.require_indemnity_form}
                  onCheckedChange={(c) => setForm({ ...form, require_indemnity_form: c === true })}
                />
                <Label htmlFor="req-indemnity" className="text-xs font-normal cursor-pointer">
                  Indemnity form upload
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="req-passport"
                  checked={form.require_passport}
                  onCheckedChange={(c) => setForm({ ...form, require_passport: c === true })}
                />
                <Label htmlFor="req-passport" className="text-xs font-normal cursor-pointer">
                  Passport upload
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="req-photo"
                  checked={form.require_photo}
                  onCheckedChange={(c) => setForm({ ...form, require_photo: c === true })}
                />
                <Label htmlFor="req-photo" className="text-xs font-normal cursor-pointer">
                  Photo upload
                </Label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {form.id && (
                <Button variant="outline" onClick={() => setForm(emptyForm())} disabled={saving}>
                  Cancel
                </Button>
              )}
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : form.id ? 'Save changes' : 'Create event'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompetitionEventsSettingsDialog;
