import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Save, Search } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { upsertBranchPrice } from '@/services/priceRulesService';
import { formatCurrency, getCurrencySymbol } from '@/utils/currencyUtils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  branchId: string;
  branchName: string;
  branchCurrency: string;
}

interface ProductRow {
  id: string;
  name: string;
  sku: string;
  base_price: number;
  category_id: string | null;
  category_name: string | null;
  is_visible: boolean;
  price_override: number | null;
  rule_id?: string;
  // edit state
  editVisible: boolean;
  editPrice: string;
  dirty: boolean;
}

interface CategoryOption {
  id: string;
  name: string;
}

export const ProductsPricingTab: React.FC<Props> = ({ branchId, branchName, branchCurrency }) => {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        supabase
          .from('products')
          .select('id, name, sku, base_price, category_id, product_categories(name)')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('product_categories')
          .select('id, name')
          .eq('is_active', true)
          .order('name'),
      ]);
      if (productsRes.error) throw productsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      const products = productsRes.data || [];
      setCategories((categoriesRes.data || []) as CategoryOption[]);

      const productIds = products.map((p) => p.id);
      let ruleMap = new Map<string, { id: string; price_override: number | null; is_active: boolean | null }>();
      if (productIds.length > 0) {
        const { data: rules, error: re } = await supabase
          .from('price_rules')
          .select('id, product_id, price_override, is_active')
          .eq('branch_id', branchId)
          .in('product_id', productIds);
        if (re) throw re;
        for (const r of rules || []) {
          ruleMap.set(r.product_id, { id: r.id, price_override: r.price_override, is_active: r.is_active });
        }
      }

      const built: ProductRow[] = products.map((p: any) => {
        const rule = ruleMap.get(p.id);
        const visible = rule ? rule.is_active !== false : true;
        const priceOverride = rule?.price_override ?? null;
        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          base_price: p.base_price,
          category_id: p.category_id ?? null,
          category_name: p.product_categories?.name ?? null,
          is_visible: visible,
          price_override: priceOverride,
          rule_id: rule?.id,
          editVisible: visible,
          editPrice: priceOverride !== null ? String(priceOverride) : '',
          dirty: false,
        };
      });
      setRows(built);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (categoryFilter !== 'all' && r.category_id !== categoryFilter) return false;
      if (!q) return true;
      return r.name.toLowerCase().includes(q) || (r.sku || '').toLowerCase().includes(q);
    });
  }, [rows, search, categoryFilter]);

  const updateRow = (id: string, patch: Partial<ProductRow>) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch, dirty: true } : r))
    );
  };

  const dirtyCount = rows.filter((r) => r.dirty).length;

  const handleSaveAll = async () => {
    const dirty = rows.filter((r) => r.dirty);
    if (dirty.length === 0) {
      toast.info('No changes to save');
      return;
    }
    setSaving(true);
    try {
      for (const r of dirty) {
        const newPrice = r.editPrice.trim() === '' ? null : parseFloat(r.editPrice);
        if (newPrice !== null && Number.isNaN(newPrice)) continue;
        const isHidden = !r.editVisible;
        await upsertBranchPrice(
          r.id,
          branchId,
          branchName,
          newPrice,
          null,
          null,
          isHidden,
          r.rule_id
        );
      }
      toast.success(`Saved ${dirty.length} product${dirty.length === 1 ? '' : 's'}`);
      await load();
    } catch (e) {
      console.error(e);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <p className="text-sm text-muted-foreground">
          Toggle visibility per branch and set price overrides. Leave price blank to use the product's base price.
        </p>
        <div className="flex items-center gap-2">
          {dirtyCount > 0 && (
            <Badge variant="secondary">{dirtyCount} unsaved</Badge>
          )}
          <Button onClick={handleSaveAll} disabled={saving || dirtyCount === 0}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            className="pl-8 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-9 w-[200px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Base Price</TableHead>
              <TableHead className="w-[180px]">Branch Price ({branchCurrency})</TableHead>
              <TableHead className="w-[120px] text-center">Visible</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No products match your search.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id} className={r.dirty ? 'bg-primary/5' : ''}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.sku}</TableCell>
                  <TableCell className="text-right text-sm">
                    {formatCurrency(r.base_price, 'SGD')}
                  </TableCell>
                  <TableCell>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        {getCurrencySymbol(branchCurrency)}
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder={r.base_price.toFixed(2)}
                        value={r.editPrice}
                        onChange={(e) => updateRow(r.id, { editPrice: e.target.value })}
                        className="h-8 pl-7 text-right text-sm"
                        disabled={!r.editVisible}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={r.editVisible}
                      onCheckedChange={(v) => updateRow(r.id, { editVisible: v })}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
