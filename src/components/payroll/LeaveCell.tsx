/** Leave summary for a payroll row with overridable unpaid days and encashment. */
import React, { useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '@/utils/currencyUtils';
import type { MonthAdjustment } from '@/services/payrollAdjustmentsService';

interface Props {
  adj?: MonthAdjustment;
  unpaidDeduction: number;
  disabled?: boolean;
  onSave: (v: { unpaid: number | null; encashment: number | null }) => Promise<void>;
}

const LeaveCell: React.FC<Props> = ({ adj, unpaidDeduction, disabled, onSave }) => {
  const [open, setOpen] = useState(false);
  const [unpaid, setUnpaid] = useState('');
  const [enc, setEnc] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) {
      setUnpaid(adj?.unpaidOverridden ? String(adj.totalUnpaidDays) : '');
      setEnc(adj?.encashmentOverridden ? String(adj.encashment) : '');
    }
  }, [open, adj]);

  if (!adj) return <span className="text-muted-foreground">—</span>;
  const taken = adj.annualTakenMonth + adj.otherLeaveMonth + adj.unpaidLeaveDays;

  const summary = (
    <div className="text-left leading-tight">
      <div>{taken ? `${taken}d taken` : <span className="text-muted-foreground">No leave</span>}</div>
      {adj.annualBalance != null && <div className="text-[11px] text-muted-foreground">AL left {adj.annualBalance}d</div>}
      {adj.totalUnpaidDays > 0 && (
        <div className="text-[11px] text-destructive">
          −{formatCurrency(unpaidDeduction)} · {adj.totalUnpaidDays}d unpaid
          {adj.excessAnnualDays > 0 && !adj.unpaidOverridden ? ` (${adj.excessAnnualDays} excess AL)` : ''}
        </div>
      )}
      {adj.encashment > 0 && <div className="text-[11px] text-primary">+{formatCurrency(adj.encashment)} encash</div>}
    </div>
  );

  if (disabled) return summary;
  const save = async (reset = false) => {
    setSaving(true);
    try {
      await onSave(reset ? { unpaid: null, encashment: null } : {
        unpaid: unpaid.trim() === '' ? null : Number(unpaid),
        encashment: enc.trim() === '' ? null : Number(enc),
      });
      setOpen(false);
    } finally { setSaving(false); }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="w-full rounded px-1 -mx-1 hover:bg-muted" aria-label="Edit leave">{summary}</button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 space-y-2 text-xs" align="start">
        <p className="font-medium">Leave this month</p>
        <p className="text-muted-foreground">
          Annual {adj.annualTakenMonth}d · Other {adj.otherLeaveMonth}d · Unpaid {adj.unpaidLeaveDays}d
          {adj.annualEntitlement != null && <> · Entitled {adj.annualEntitlement}d, used {adj.annualTakenYear}d this year</>}
        </p>
        <label className="block">Unpaid days (auto {adj.unpaidLeaveDays + adj.excessAnnualDays})
          <Input className="h-7 text-xs mt-1" type="number" step="0.5" min={0} value={unpaid} placeholder="auto"
            onChange={(e) => setUnpaid(e.target.value)} />
        </label>
        <label className="block">Encashment amount
          <Input className="h-7 text-xs mt-1" type="number" step="0.01" min={0} value={enc} placeholder="auto"
            onChange={(e) => setEnc(e.target.value)} />
        </label>
        <div className="flex justify-between pt-1">
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => save(true)} disabled={saving}>Use auto</Button>
          <Button size="sm" className="h-7 text-xs" onClick={() => save()} disabled={saving}>
            {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />} Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default LeaveCell;
