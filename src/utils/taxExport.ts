/**
 * Phase 5 — Tax export (CSV + PDF) for GST F5 / BAS.
 */
import jsPDF from 'jspdf';
import type { TaxReturnComputed } from '@/services/taxService';
import { formatDate } from '@/utils/dateFormat';

const fmt = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function exportTaxCsv(opts: { ret: TaxReturnComputed; branchName: string }) {
  const rows: string[] = [];
  rows.push(['Box', 'Label', 'Amount'].join(','));
  for (const b of opts.ret.boxes) {
    rows.push([b.key, JSON.stringify(b.label), b.amount.toFixed(2)].join(','));
  }
  const country = opts.ret.country === 'Singapore' ? 'GST-F5' : 'BAS';
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${country}_${opts.branchName}_${opts.ret.from}_${opts.ret.to}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export function exportTaxPdf(opts: { ret: TaxReturnComputed; branchName: string }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const title = opts.ret.country === 'Singapore' ? 'GST F5 Return' : 'BAS — GST Labels';
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
  doc.text(title, 15, 18);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.text(`Branch: ${opts.branchName}`, 15, 26);
  doc.text(`Period: ${formatDate(opts.ret.from)} – ${formatDate(opts.ret.to)}`, 15, 32);

  let y = 44;
  doc.setFont('helvetica', 'bold');
  doc.text('Box', 15, y); doc.text('Description', 35, y); doc.text('Amount', 195, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  y += 4;
  doc.line(15, y, 195, y);
  y += 5;

  for (const b of opts.ret.boxes) {
    if (b.isTotal) doc.setFont('helvetica', 'bold');
    doc.text(b.key, 15, y);
    doc.text(b.label.replace(/^[^—]+— /, ''), 35, y);
    doc.text(fmt(b.amount), 195, y, { align: 'right' });
    if (b.isTotal) doc.setFont('helvetica', 'normal');
    y += 6;
    if (y > 280) { doc.addPage(); y = 20; }
  }

  doc.setFont('helvetica', 'italic'); doc.setFontSize(8);
  doc.text(`Generated ${formatDate(new Date().toISOString().slice(0, 10))} — sourced from posted journal entries.`, 15, 290);

  const country = opts.ret.country === 'Singapore' ? 'GST-F5' : 'BAS';
  doc.save(`${country}_${opts.branchName}_${opts.ret.from}_${opts.ret.to}.pdf`);
}
