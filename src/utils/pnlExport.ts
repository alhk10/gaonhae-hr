import type { PnlResult, PnlRow } from '@/services/branchPnlLiveService';
import { formatDate } from '@/utils/dateFormat';

const fmt = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function exportPnlCsv(opts: {
  current: PnlResult;
  prior?: PnlResult | null;
  branchName: string;
  from: string;
  to: string;
}) {
  const { current, prior, branchName, from, to } = opts;
  const rows: string[] = [];
  rows.push(`"Branch P&L","${branchName}"`);
  rows.push(`"Period","${formatDate(from)} - ${formatDate(to)}"`);
  rows.push('');
  rows.push('"Section","Code","Account","This period","Prior"');

  const writeSection = (label: string, list: PnlRow[]) => {
    list.forEach((r) => {
      const p = prior?.[sectionToKey(label)]?.find((x) => x.account_id === r.account_id);
      rows.push(`"${label}","${r.account_code}","${r.account_name.replace(/"/g, '""')}","${fmt(r.amount)}","${p ? fmt(p.amount) : ''}"`);
    });
  };
  writeSection('Income', current.income);
  rows.push(`"Total Income","","","${fmt(current.totals.income)}","${prior ? fmt(prior.totals.income) : ''}"`);
  writeSection('Cost of Sales', current.cogs);
  rows.push(`"Gross Profit","","","${fmt(current.totals.grossProfit)}","${prior ? fmt(prior.totals.grossProfit) : ''}"`);
  writeSection('Expenses', current.expenses);
  rows.push(`"Total Expenses","","","${fmt(current.totals.expenses)}","${prior ? fmt(prior.totals.expenses) : ''}"`);
  rows.push(`"Net Profit","","","${fmt(current.totals.netProfit)}","${prior ? fmt(prior.totals.netProfit) : ''}"`);

  const csv = rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `branch-pnl-${branchName}-${from}-to-${to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function sectionToKey(label: string): keyof PnlResult {
  if (label === 'Income') return 'income';
  if (label === 'Cost of Sales') return 'cogs';
  return 'expenses';
}

export async function exportPnlPdf(opts: {
  current: PnlResult;
  prior?: PnlResult | null;
  branchName: string;
  from: string;
  to: string;
}) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF();
  const { current, prior, branchName, from, to } = opts;

  doc.setFontSize(14);
  doc.text(`Branch P&L — ${branchName}`, 14, 16);
  doc.setFontSize(10);
  doc.text(`${formatDate(from)} to ${formatDate(to)}`, 14, 22);

  const buildBody = (rows: PnlRow[], section: keyof PnlResult) =>
    rows.map((r) => {
      const p = prior?.[section]?.find((x) => x.account_id === r.account_id);
      return [`${r.account_code}  ${r.account_name}`, fmt(r.amount), p ? fmt(p.amount) : ''];
    });

  const body: any[] = [];
  body.push([{ content: 'INCOME', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }]);
  body.push(...buildBody(current.income, 'income'));
  body.push([{ content: 'Total Income', styles: { fontStyle: 'bold' } }, { content: fmt(current.totals.income), styles: { fontStyle: 'bold' } }, prior ? fmt(prior.totals.income) : '']);

  if (current.cogs.length) {
    body.push([{ content: 'COST OF SALES', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }]);
    body.push(...buildBody(current.cogs, 'cogs'));
  }
  body.push([{ content: 'Gross Profit', styles: { fontStyle: 'bold' } }, { content: fmt(current.totals.grossProfit), styles: { fontStyle: 'bold' } }, prior ? fmt(prior.totals.grossProfit) : '']);

  body.push([{ content: 'EXPENSES', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }]);
  body.push(...buildBody(current.expenses, 'expenses'));
  body.push([{ content: 'Total Expenses', styles: { fontStyle: 'bold' } }, { content: fmt(current.totals.expenses), styles: { fontStyle: 'bold' } }, prior ? fmt(prior.totals.expenses) : '']);

  body.push([{ content: 'NET PROFIT', styles: { fontStyle: 'bold', fillColor: [220, 240, 220] } }, { content: fmt(current.totals.netProfit), styles: { fontStyle: 'bold', fillColor: [220, 240, 220] } }, { content: prior ? fmt(prior.totals.netProfit) : '', styles: { fillColor: [220, 240, 220] } }]);

  autoTable(doc, {
    head: [['Account', 'This period', 'Prior']],
    body,
    startY: 28,
    styles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
  });

  doc.save(`branch-pnl-${branchName}-${from}-to-${to}.pdf`);
}
