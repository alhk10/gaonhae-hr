/** Quick inline editor for a month's allowances or deductions (popover, no dialog). */
import React, { useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/utils/currencyUtils';

export interface PayItem { name: string; amount: number; type?: string }

interface Props {
  items: PayItem[];
  tone: 'positive' | 'negative';
  disabled?: boolean;
  label: string;
  onSave: (items: PayItem[]) => Promise<void>;
}

const InlineItemsCell: React.FC<Props> = ({ items, tone, disabled, label, onSave }) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PayItem[]>([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setDraft(items.map((i) => ({ ...i }))); }, [open, items]);

  const total = items.reduce((s, i) => s + Number(i.amount || 0), 0);
  const save = async () => {
    const clean = draft.filter((d) => d.name.trim() && !Number.isNaN(Number(d.amount)))
      .map((d) => ({ name: d.name.trim(), amount: Number(d.amount), type: d.type || 'Fixed' }));
    setSaving(true);
    try { await onSave(clean); setOpen(false); } finally { setSaving(false); }
  };

  const trigger = (
    <button
      type="button"
      disabled={disabled}
      className="text-left w-full rounded px-1 -mx-1 hover:bg-muted disabled:hover:bg-transparent disabled:cursor-default"
      aria-label={`Edit ${label}`}
    >
      {items.length ? (
        <span className={tone === 'positive' ? 'text-primary font-medium' : 'text-destructive font-medium'}>
          {tone === 'negative' ? '−' : ''}{formatCurrency(total)}
          <span className="block text-[11px] text-muted-foreground font-normal">{items.length} item{items.length > 1 ? 's' : ''}</span>
        </span>
      ) : (
        <span className="text-muted-foreground">{disabled ? '—' : '+ Add'}</span>
      )}
    </button>
  );

  if (disabled) return trigger;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-80 p-3 space-y-2" align="start">
        <p className="text-xs font-medium">{label} this month</p>
        {draft.map((d, i) => (
          <div key={i} className="flex gap-1.5">
            <Input className="h-7 text-xs" value={d.name} placeholder="Name"
              onChange={(e) => setDraft((p) => p.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
            <Input className="h-7 text-xs w-24" type="number" step="0.01" value={String(d.amount)}
              onChange={(e) => setDraft((p) => p.map((x, j) => (j === i ? { ...x, amount: e.target.value as any } : x)))} />
            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" aria-label="Remove"
              onClick={() => setDraft((p) => p.filter((_, j) => j !== i))}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <div className="flex justify-between pt-1">
          <Button size="sm" variant="outline" className="h-7 text-xs"
            onClick={() => setDraft((p) => [...p, { name: '', amount: 0 }])}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
          <Button size="sm" className="h-7 text-xs" onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />} Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default InlineItemsCell;
