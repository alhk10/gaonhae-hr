import jsPDF from 'jspdf';
import { formatDate } from '@/utils/dateFormat';
import type { TrialBalanceResult } from '@/services/trialBalanceService';
import type { BalanceSheetResult } from '@/services/balanceSheetService';

const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map(r => r.map(v => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function exportTrialBalanceCsv(meta: { country: string; from: string; to: string; basis: string }, tb: TrialBalanceResult) {
  const rows: (string | number)[][] = [
    ['Trial Balance'],
    [`Country: ${meta.country}`, `Period: ${formatDate(meta.from)} - ${formatDate(meta.to)}`, `Basis: ${meta.basis}`],
    [],
    ['Code', 'Account', 'Type', 'Debit', 'Credit', 'Net'],
    ...tb.rows.map(r => [r.account_code, r.account_name, r.account_type, r.debit.toFixed(2), r.credit.toFixed(2), r.net.toFixed(2)]),
    [],
    ['', 'Totals', '', tb.total_debit.toFixed(2), tb.total_credit.toFixed(2), (tb.total_debit - tb.total_credit).toFixed(2)],
  ];
  downloadCsv(`trial-balance-${meta.from}_to_${meta.to}.csv`, rows);
}

export function exportTrialBalancePdf(meta: { country: string; from: string; to: string; basis: string }, tb: TrialBalanceResult) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  let y = 40;
  doc.setFontSize(14); doc.text('Trial Balance', 40, y); y += 18;
  doc.setFontSize(10);
  doc.text(`Country: ${meta.country}`, 40, y); y += 14;
  doc.text(`Period: ${formatDate(meta.from)} – ${formatDate(meta.to)}`, 40, y); y += 14;
  doc.text(`Basis: ${meta.basis}`, 40, y); y += 18;

  doc.setFont(undefined, 'bold');
  doc.text('Code', 40, y); doc.text('Account', 90, y); doc.text('Debit', 380, y, { align: 'right' }); doc.text('Credit', 460, y, { align: 'right' }); doc.text('Net', 540, y, { align: 'right' });
  doc.setFont(undefined, 'normal'); y += 12;
  doc.line(40, y, 555, y); y += 10;

  for (const r of tb.rows) {
    if (y > 780) { doc.addPage(); y = 40; }
    doc.text(r.account_code, 40, y);
    doc.text(r.account_name.slice(0, 50), 90, y);
    doc.text(fmt(r.debit), 380, y, { align: 'right' });
    doc.text(fmt(r.credit), 460, y, { align: 'right' });
    doc.text(fmt(r.net), 540, y, { align: 'right' });
    y += 12;
  }
  y += 4; doc.line(40, y, 555, y); y += 14;
  doc.setFont(undefined, 'bold');
  doc.text('Totals', 90, y);
  doc.text(fmt(tb.total_debit), 380, y, { align: 'right' });
  doc.text(fmt(tb.total_credit), 460, y, { align: 'right' });
  doc.text(fmt(tb.total_debit - tb.total_credit), 540, y, { align: 'right' });

  doc.save(`trial-balance-${meta.from}_to_${meta.to}.pdf`);
}

export function exportBalanceSheetCsv(meta: { country: string; basis: string }, bs: BalanceSheetResult) {
  const rows: (string | number)[][] = [
    ['Balance Sheet'],
    [`Country: ${meta.country}`, `As of: ${formatDate(bs.as_of)}`, `Basis: ${meta.basis}`],
    [],
  ];
  for (const sec of [bs.assets, bs.liabilities, bs.equity]) {
    rows.push([sec.label.toUpperCase()]);
    rows.push(['Code', 'Account', 'Balance']);
    for (const r of sec.rows) rows.push([r.account_code, r.account_name, r.balance.toFixed(2)]);
    rows.push(['', `Total ${sec.label}`, sec.total.toFixed(2)]);
    rows.push([]);
  }
  rows.push(['Total Assets', '', bs.total_assets.toFixed(2)]);
  rows.push(['Total Liabilities + Equity', '', bs.total_liab_equity.toFixed(2)]);
  rows.push(['Balanced', '', bs.is_balanced ? 'Yes' : 'No']);
  downloadCsv(`balance-sheet-${bs.as_of}.csv`, rows);
}

export function exportBalanceSheetPdf(meta: { country: string; basis: string }, bs: BalanceSheetResult) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  let y = 40;
  doc.setFontSize(14); doc.text('Balance Sheet', 40, y); y += 18;
  doc.setFontSize(10);
  doc.text(`Country: ${meta.country}`, 40, y); y += 14;
  doc.text(`As of: ${formatDate(bs.as_of)}`, 40, y); y += 14;
  doc.text(`Basis: ${meta.basis}`, 40, y); y += 18;

  for (const sec of [bs.assets, bs.liabilities, bs.equity]) {
    if (y > 760) { doc.addPage(); y = 40; }
    doc.setFont(undefined, 'bold'); doc.text(sec.label.toUpperCase(), 40, y); y += 14;
    doc.setFont(undefined, 'normal');
    for (const r of sec.rows) {
      if (y > 780) { doc.addPage(); y = 40; }
      doc.text(`${r.account_code}  ${r.account_name.slice(0, 60)}`, 40, y);
      doc.text(fmt(r.balance), 540, y, { align: 'right' });
      y += 12;
    }
    doc.setFont(undefined, 'bold');
    doc.text(`Total ${sec.label}`, 40, y);
    doc.text(fmt(sec.total), 540, y, { align: 'right' });
    doc.setFont(undefined, 'normal');
    y += 18;
  }
  y += 6; doc.line(40, y, 555, y); y += 14;
  doc.setFont(undefined, 'bold');
  doc.text('Total Assets', 40, y); doc.text(fmt(bs.total_assets), 540, y, { align: 'right' }); y += 14;
  doc.text('Total Liabilities + Equity', 40, y); doc.text(fmt(bs.total_liab_equity), 540, y, { align: 'right' }); y += 14;
  doc.text(`Balanced: ${bs.is_balanced ? 'Yes' : 'NO'}`, 40, y);

  doc.save(`balance-sheet-${bs.as_of}.pdf`);
}
