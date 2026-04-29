import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import {
  ACCOUNT_TYPE_LABELS,
  AccountType,
  ChartAccount,
  Country,
  TaxCode,
  createAccount,
  deleteAccount,
  listAccounts,
  listTaxCodes,
  updateAccount,
} from '@/services/accountingService';
import { useAuth } from '@/contexts/AuthContext';

const TYPE_ORDER: AccountType[] = ['asset', 'liability', 'equity', 'income', 'expense'];

interface FormState {
  id?: string;
  code: string;
  name: string;
  type: AccountType;
  subtype: string;
  country: Country;
  default_tax_code_id: string | null;
  is_active: boolean;
  description: string;
  sort_order: number;
}

const emptyForm = (country: Country): FormState => ({
  code: '',
  name: '',
  type: 'expense',
  subtype: '',
  country,
  default_tax_code_id: null,
  is_active: true,
  description: '',
  sort_order: 999,
});

const ChartOfAccounts: React.FC = () => {
  const { userrole } = useAuth();
  const isSuperadmin = userrole === 'superadmin';
  const qc = useQueryClient();

  const [country, setCountry] = useState<Country>('Singapore');
  const [filterType, setFilterType] = useState<AccountType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm('Singapore'));

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['coa', country],
    queryFn: () => listAccounts(country),
  });
  const { data: taxCodes = [] } = useQuery({
    queryKey: ['tax-codes', country],
    queryFn: () => listTaxCodes(country),
  });

  const createMut = useMutation({
    mutationFn: (input: FormState) =>
      createAccount({
        code: input.code,
        name: input.name,
        type: input.type,
        subtype: input.subtype || null,
        country: input.country,
        parent_id: null,
        default_tax_code_id: input.default_tax_code_id,
        is_active: input.is_active,
        description: input.description || null,
        sort_order: input.sort_order,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coa', country] });
      toast.success('Account created');
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ChartAccount> }) => updateAccount(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coa', country] });
      toast.success('Account updated');
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteAccount(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coa', country] });
      toast.success('Account deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return accounts.filter(a => {
      if (filterType !== 'all' && a.type !== filterType) return false;
      if (term && !`${a.code} ${a.name} ${a.subtype || ''}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [accounts, filterType, search]);

  const grouped = useMemo(() => {
    const m: Record<AccountType, ChartAccount[]> = { asset: [], liability: [], equity: [], income: [], expense: [] };
    filtered.forEach(a => m[a.type].push(a));
    return m;
  }, [filtered]);

  const taxCodeName = (id: string | null) => {
    if (!id) return '—';
    const tc = taxCodes.find(t => t.id === id);
    return tc ? `${tc.code} (${(tc.rate * 100).toFixed(0)}%)` : '—';
  };

  const openCreate = () => {
    setForm(emptyForm(country));
    setDialogOpen(true);
  };
  const openEdit = (a: ChartAccount) => {
    setForm({
      id: a.id,
      code: a.code,
      name: a.name,
      type: a.type,
      subtype: a.subtype || '',
      country: a.country,
      default_tax_code_id: a.default_tax_code_id,
      is_active: a.is_active,
      description: a.description || '',
      sort_order: a.sort_order,
    });
    setDialogOpen(true);
  };

  const onSave = () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('Code and name are required');
      return;
    }
    if (form.id) {
      updateMut.mutate({
        id: form.id,
        patch: {
          code: form.code,
          name: form.name,
          type: form.type,
          subtype: form.subtype || null,
          default_tax_code_id: form.default_tax_code_id,
          is_active: form.is_active,
          description: form.description || null,
          sort_order: form.sort_order,
        },
      });
    } else {
      createMut.mutate(form);
    }
  };

  const onDelete = (a: ChartAccount) => {
    if (a.system_account) {
      toast.error('System accounts cannot be deleted');
      return;
    }
    if (!confirm(`Delete account "${a.code} ${a.name}"?`)) return;
    deleteMut.mutate(a.id);
  };

  useEffect(() => {
    setForm(f => ({ ...f, country }));
  }, [country]);

  return (
    <ResponsiveLayout>
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Chart of Accounts</h1>
            <p className="text-sm text-muted-foreground">Manage general ledger accounts per country.</p>
          </div>
          {isSuperadmin && (
            <Button onClick={openCreate} size="sm">
              <Plus className="h-4 w-4 mr-1" /> New Account
            </Button>
          )}
        </div>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap gap-2 items-end">
              <div>
                <Label className="text-xs">Country</Label>
                <Select value={country} onValueChange={(v: Country) => setCountry(v)}>
                  <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Singapore">Singapore</SelectItem>
                    <SelectItem value="Australia">Australia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={filterType} onValueChange={(v) => setFilterType(v as AccountType | 'all')}>
                  <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {TYPE_ORDER.map(t => <SelectItem key={t} value={t}>{ACCOUNT_TYPE_LABELS[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[180px]">
                <Label className="text-xs">Search</Label>
                <Input className="h-8" placeholder="code, name, subtype" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="text-xs text-muted-foreground ml-auto">
                {filtered.length} of {accounts.length} accounts
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 text-sm text-muted-foreground">Loading…</div>
            ) : (
              <div className="space-y-4">
                {TYPE_ORDER.map(type => {
                  const rows = grouped[type];
                  if (rows.length === 0) return null;
                  return (
                    <div key={type}>
                      <div className="px-4 py-2 bg-muted/50 text-xs font-semibold uppercase tracking-wide">
                        {ACCOUNT_TYPE_LABELS[type]} ({rows.length})
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[90px]">Code</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead className="hidden sm:table-cell">Subtype</TableHead>
                            <TableHead className="hidden md:table-cell">Default Tax</TableHead>
                            <TableHead className="w-[80px]">Status</TableHead>
                            {isSuperadmin && <TableHead className="w-[80px]">Actions</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rows.map(a => (
                            <TableRow key={a.id}>
                              <TableCell className="font-mono text-xs">{a.code}</TableCell>
                              <TableCell>
                                {a.name}
                                {a.system_account && <Badge variant="secondary" className="ml-2 text-[10px]">system</Badge>}
                              </TableCell>
                              <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{a.subtype || '—'}</TableCell>
                              <TableCell className="hidden md:table-cell text-xs">{taxCodeName(a.default_tax_code_id)}</TableCell>
                              <TableCell>
                                {a.is_active
                                  ? <Badge className="text-[10px] bg-green-100 text-green-800 hover:bg-green-100">active</Badge>
                                  : <Badge variant="outline" className="text-[10px]">inactive</Badge>}
                              </TableCell>
                              {isSuperadmin && (
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(a)}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    {!a.system_account && (
                                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDelete(a)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="p-6 text-sm text-muted-foreground text-center">No accounts match the filter.</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{form.id ? 'Edit Account' : 'New Account'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-1">
                <Label className="text-xs">Code</Label>
                <Input className="h-8" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
              </div>
              <div className="col-span-1">
                <Label className="text-xs">Country</Label>
                <Select value={form.country} onValueChange={(v: Country) => setForm({ ...form, country: v })} disabled={!!form.id}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Singapore">Singapore</SelectItem>
                    <SelectItem value="Australia">Australia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Name</Label>
                <Input className="h-8" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="col-span-1">
                <Label className="text-xs">Type</Label>
                <Select value={form.type} onValueChange={(v: AccountType) => setForm({ ...form, type: v })}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPE_ORDER.map(t => <SelectItem key={t} value={t}>{ACCOUNT_TYPE_LABELS[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-1">
                <Label className="text-xs">Subtype</Label>
                <Input className="h-8" value={form.subtype} onChange={e => setForm({ ...form, subtype: e.target.value })} placeholder="optional" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Default Tax Code</Label>
                <Select value={form.default_tax_code_id || 'none'} onValueChange={v => setForm({ ...form, default_tax_code_id: v === 'none' ? null : v })}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— none —</SelectItem>
                    {taxCodes.filter(t => t.country === form.country).map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.code} — {t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-1">
                <Label className="text-xs">Sort Order</Label>
                <Input className="h-8" type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} />
              </div>
              <div className="col-span-1 flex items-end gap-2">
                <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} id="is_active" />
                <Label htmlFor="is_active" className="text-xs">Active</Label>
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Description</Label>
                <Input className="h-8" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={onSave} disabled={createMut.isPending || updateMut.isPending}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ResponsiveLayout>
  );
};

export default ChartOfAccounts;
