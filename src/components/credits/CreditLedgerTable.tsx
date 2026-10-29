import React from 'react';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/utils/dateFormat';
import type { CreditLedgerRow } from '@/services/studentCreditService';

export const creditTypeLabel = (type: string) => ({
  overpayment: 'Overpayment', refund: 'Refund', item_refund: 'Item refund', manual_adjustment: 'Adjustment',
  credit_applied: 'Applied', credit_hold: 'On hold', credit_hold_released: 'Hold released', refund_pending: 'Refund pending',
} as Record<string, string>)[type] || type;

interface Props {
  rows: CreditLedgerRow[];
  showStudent?: boolean;
  onStudentClick?: (row: CreditLedgerRow) => void;
  onInvoiceClick?: (row: CreditLedgerRow) => void;
  onReverse?: (row: CreditLedgerRow) => void;
}

const money = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(n).toFixed(2)}`;

const CreditLedgerTable: React.FC<Props> = ({ rows, showStudent, onStudentClick, onInvoiceClick, onReverse }) => {
  if (rows.length === 0) return <p className="text-center py-6 text-muted-foreground text-sm">No transactions</p>;
  return (
    <div className="divide-y text-sm">
      <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
        <div className="col-span-1">Date</div>
        {showStudent && <div className="col-span-2">Student</div>}
        <div className="col-span-1">Type</div>
        <div className="col-span-1 text-right">Amount</div>
        <div className="col-span-1 text-right">Balance</div>
        <div className="col-span-2">Invoice</div>
        <div className={showStudent ? 'col-span-3' : 'col-span-5'}>Description</div>
        <div className="col-span-1">By</div>
      </div>
      {rows.map(r => (
        <div key={r.id} className="grid grid-cols-2 md:grid-cols-12 gap-x-2 gap-y-1 px-3 py-2 items-start">
          <div className="md:col-span-1 text-xs text-muted-foreground">{formatDate(new Date(r.created_at))}</div>
          {showStudent && (
            <div className="md:col-span-2 font-medium text-right md:text-left">
              <button type="button" className="hover:underline text-left" onClick={() => onStudentClick?.(r)}>{r.student_name}</button>
            </div>
          )}
          <div className="md:col-span-1"><Badge variant="outline" className="text-[10px]">{creditTypeLabel(r.type)}</Badge>
            {r.reversed && <Badge variant="secondary" className="text-[10px] ml-1">Reversed</Badge>}</div>
          <div className={`md:col-span-1 text-right font-medium ${r.amount >= 0 ? 'text-primary' : 'text-destructive'}`}>
            {r.amount >= 0 ? '+' : ''}{money(r.amount)}
            <span className="md:hidden text-xs text-muted-foreground font-normal"> → {money(r.balance_after)}</span>
          </div>
          <div className="hidden md:block md:col-span-1 text-right">{money(r.balance_after)}</div>
          <div className="md:col-span-2 text-xs">
            {r.invoice_number ? (
              <button type="button" className="text-primary hover:underline" onClick={() => onInvoiceClick?.(r)}>{r.invoice_number}</button>
            ) : <span className="text-muted-foreground">—</span>}
          </div>
          <div className={`col-span-2 ${showStudent ? 'md:col-span-3' : 'md:col-span-5'} text-xs text-muted-foreground break-words`}>{r.description}</div>
          <div className="col-span-2 md:col-span-1 text-[11px] text-muted-foreground break-all">{r.created_by || '—'}
            {onReverse && r.reversible && (
              <button type="button" className="block mt-1 text-destructive hover:underline text-[11px]" onClick={() => onReverse(r)}>Reverse</button>
            )}</div>
        </div>
      ))}
    </div>
  );
};

export default CreditLedgerTable;
