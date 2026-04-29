import type { PnlResult, PnlRow } from '@/services/branchPnlLiveService';
import { formatDate } from '@/utils/dateFormat';

const fmt = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Section = 'income' | 'cogs' | 'expenses';

function findPrior(prior: PnlResult | null | undefined, section: Section, accountId: string): PnlRow | undefined {
  if (!prior) return undefined;
  return prior[section].find((x) => x.account_id === accountId);
}

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

  const writeSection = (label: string, section: Section, list: PnlRow[]) => {
    list.forEach((r) => {
      const p = findPrior(prior, section, r.account_id);
      rows.push(`"${label}","${r.account_code}","${r.account_name.replace(/"/g, '""')}","${fmt(r.amount)}","${p ? fmt(p.amount) : ''}"`);
    });
  };
  writeSection('Income', 'income', current.income);
  rows.push(`"Total Income","","","${fmt(current.totals.income)}","${prior ? fmt(prior.totals.income) : ''}"`);
  writeSection('Cost of Sales', 'cogs', current.cogs);
  rows.push(`"Gross Profit","","","${fmt(current.totals.grossProfit)}","${prior ? fmt(prior.totals.grossProfit) : ''}"`);
  writeSection('Expenses', 'expenses', current.expenses);
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

export async function exportPnlPdf(opts: {
  current: PnlResult;
  prior?: PnlResult | null;
  branchName: string;
  from: string;
  to: string;
}) {
  const jsPDFModule = await import('jspdf');
  const JsPDFCtor = (jsPDFModule as any).default || (jsPDFModule as any).jsPDF;
  const doc = new JsPDFCtor();
  const { current, prior, branchName, from, to } = opts;

  const pageWidth = doc.internal.pageSize.getWidth();
  const leftX = 14;
  const amtX = pageWidth - 60;
  const priorX = pageWidth - 14;
  let y = 16;

  doc.setFontSize(14);
  doc.text(`Branch P&L — ${branchName}`, leftX, y);
  y += 6;
  doc.setFontSize(10);
  doc.text(`${formatDate(from)} to ${formatDate(to)}`, leftX, y);
  y += 8;

  const writeHeader = (label: string) => {
    doc.setFillColor(240, 240, 240);
    doc.rect(leftX - 2, y - 4, pageWidth - leftX - 12, 6, 'F');
    doc.setFont(undefined, 'bold');
    doc.text(label, leftX, y);
    doc.setFont(undefined, 'normal');
    y += 6;
  };
  const writeRow = (label: string, amt: number, priorAmt?: number, bold = false) => {
    if (y > 280) { doc.addPage(); y = 20; }
    if (bold) doc.setFont(undefined, 'bold');
    doc.text(label.slice(0, 60), leftX, y);
    doc.text(fmt(amt), amtX, y, { align: 'right' });
    if (priorAmt !== undefined) doc.text(fmt(priorAmt), priorX, y, { align: 'right' });
    if (bold) doc.setFont(undefined, 'normal');
    y += 5;
  };

  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text('Account', leftX, y);
  doc.text('This period', amtX, y, { align: 'right' });
  doc.text('Prior', priorX, y, { align: 'right' });
  doc.setFont(undefined, 'normal');
  y += 5;

  const renderSection = (sectionLabel: string, section: Section, list: PnlRow[]) => {
    writeHeader(sectionLabel);
    list.forEach((r) => writeRow(`${r.account_code}  ${r.account_name}`, r.amount, findPrior(prior, section, r.account_id)?.amount));
  };

  renderSection('INCOME', 'income', current.income);
  writeRow('Total Income', current.totals.income, prior?.totals.income, true);
  if (current.cogs.length) renderSection('COST OF SALES', 'cogs', current.cogs);
  writeRow('Gross Profit', current.totals.grossProfit, prior?.totals.grossProfit, true);
  renderSection('EXPENSES', 'expenses', current.expenses);
  writeRow('Total Expenses', current.totals.expenses, prior?.totals.expenses, true);
  y += 2;
  doc.setFillColor(220, 240, 220);
  doc.rect(leftX - 2, y - 4, pageWidth - leftX - 12, 6, 'F');
  writeRow('NET PROFIT', current.totals.netProfit, prior?.totals.netProfit, true);

  doc.save(`branch-pnl-${branchName}-${from}-to-${to}.pdf`);
}
