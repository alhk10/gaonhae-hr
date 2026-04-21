import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { updateBranch, type Branch } from '@/services/settingsService';

const COUNTRY_OPTIONS = [
  { value: 'Singapore', label: 'Singapore', currency: 'SGD' },
  { value: 'Malaysia', label: 'Malaysia', currency: 'MYR' },
  { value: 'Indonesia', label: 'Indonesia', currency: 'IDR' },
  { value: 'Thailand', label: 'Thailand', currency: 'THB' },
  { value: 'Philippines', label: 'Philippines', currency: 'PHP' },
  { value: 'Vietnam', label: 'Vietnam', currency: 'VND' },
  { value: 'United States', label: 'United States', currency: 'USD' },
  { value: 'United Kingdom', label: 'United Kingdom', currency: 'GBP' },
  { value: 'Australia', label: 'Australia', currency: 'AUD' },
  { value: 'Japan', label: 'Japan', currency: 'JPY' },
  { value: 'China', label: 'China', currency: 'CNY' },
  { value: 'India', label: 'India', currency: 'INR' },
];

const CURRENCY_OPTIONS = [
  'SGD', 'MYR', 'IDR', 'THB', 'PHP', 'VND', 'USD', 'GBP', 'AUD', 'JPY', 'CNY', 'INR'
];

const COLOR_OPTIONS = [
  { value: 'bg-blue-500', label: 'Blue', color: '#3b82f6' },
  { value: 'bg-red-500', label: 'Red', color: '#ef4444' },
  { value: 'bg-green-500', label: 'Green', color: '#22c55e' },
  { value: 'bg-yellow-500', label: 'Yellow', color: '#eab308' },
  { value: 'bg-purple-500', label: 'Purple', color: '#8b5cf6' },
  { value: 'bg-pink-500', label: 'Pink', color: '#ec4899' },
  { value: 'bg-indigo-500', label: 'Indigo', color: '#6366f1' },
  { value: 'bg-gray-500', label: 'Gray', color: '#6b7280' },
];

interface GeneralTabProps {
  branch: Branch;
  onSaved: () => void;
}

export const GeneralTab: React.FC<GeneralTabProps> = ({ branch, onSaved }) => {
  const [form, setForm] = useState({
    name: branch.name,
    address: branch.address,
    color: branch.color || 'bg-blue-500',
    country: branch.country || 'Singapore',
    currency: branch.currency || 'SGD',
    stripe_account_id: branch.stripe_account_id || '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      name: branch.name,
      address: branch.address,
      color: branch.color || 'bg-blue-500',
      country: branch.country || 'Singapore',
      currency: branch.currency || 'SGD',
      stripe_account_id: branch.stripe_account_id || '',
    });
  }, [branch]);

  const handleSave = async () => {
    if (!form.name.trim() || !form.address.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      await updateBranch({
        ...branch,
        name: form.name.trim(),
        address: form.address.trim(),
        color: form.color,
        country: form.country,
        currency: form.currency,
        stripe_account_id: form.stripe_account_id.trim() || undefined,
      });
      toast.success('Branch updated successfully');
      onSaved();
    } catch (e) {
      console.error(e);
      toast.error('Failed to update branch');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <Label htmlFor="bs-name">Branch Name *</Label>
        <Input
          id="bs-name"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
        />
      </div>
      <div>
        <Label htmlFor="bs-address">Address *</Label>
        <Input
          id="bs-address"
          value={form.address}
          onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Country</Label>
          <Select
            value={form.country}
            onValueChange={(value) => {
              const c = COUNTRY_OPTIONS.find((x) => x.value === value);
              setForm((p) => ({ ...p, country: value, currency: c?.currency || p.currency }));
            }}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {COUNTRY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Currency</Label>
          <Select value={form.currency} onValueChange={(v) => setForm((p) => ({ ...p, currency: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCY_OPTIONS.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Branch Color</Label>
        <Select value={form.color} onValueChange={(v) => setForm((p) => ({ ...p, color: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {COLOR_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: o.color }} />
                  {o.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Stripe Account ID</Label>
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="acct_..."
            value={form.stripe_account_id}
            onChange={(e) => setForm((p) => ({ ...p, stripe_account_id: e.target.value }))}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Optional. Used for Stripe Connect payment integration.
        </p>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
};
