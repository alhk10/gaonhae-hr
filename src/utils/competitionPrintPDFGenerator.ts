/**
 * Competition scoring print PDF (A4 landscape).
 * Columns: # | Branch | Name | Belt | Category | Poomsae 1 | P1 Score | Poomsae 2 | P2 Score | Remarks
 */
import jsPDF from 'jspdf';
import { formatDate } from '@/utils/dateFormat';

export interface CompetitionPrintRow {
  branch_name: string | null;
  student_name: string;
  current_belt: string | null;
  category: string | null;
  poomsae_1: string | null;
  poomsae_2: string | null;
  competition_at: string | null;
  reporting_at: string | null;
  court: string | null;
}

export interface CompetitionPrintPDFOptions {
  rows: CompetitionPrintRow[];
  eventName: string;
  branchName: string;
}

export function generateCompetitionPrintPDF({ rows, eventName, branchName }: CompetitionPrintPDFOptions) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const pageWidth = 297;
  const pageHeight = 210;
  const marginL = 10;
  const marginR = 10;
  const usableW = pageWidth - marginL - marginR; // 277mm

  const cols = [
    { key: 'idx', label: '#', w: 7, align: 'center' as const },
    { key: 'comp', label: 'Comp Time', w: 18, align: 'center' as const },
    { key: 'report', label: 'Report Time', w: 18, align: 'center' as const },
    { key: 'court', label: 'Court', w: 13, align: 'center' as const },
    { key: 'branch', label: 'Branch', w: 22, align: 'left' as const },
    { key: 'name', label: 'Name', w: 40, align: 'left' as const },
    { key: 'belt', label: 'Belt', w: 18, align: 'left' as const },
    { key: 'category', label: 'Category', w: 40, align: 'left' as const },
    { key: 'p1', label: 'Poomsae 1', w: 24, align: 'left' as const },
    { key: 'p1s', label: 'P1 Score', w: 18, align: 'center' as const },
    { key: 'p2', label: 'Poomsae 2', w: 24, align: 'left' as const },
    { key: 'p2s', label: 'P2 Score', w: 18, align: 'center' as const },
    { key: 'remarks', label: 'Remarks', w: 17, align: 'left' as const },
  ];

  const bodyRowH = 8;
  const lineH = 3.2;

  const drawHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(`Competition Scoring — ${eventName}`, marginL, 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Branch: ${branchName}`, marginL, 19);
    doc.text(`Generated: ${formatDate(new Date().toISOString().slice(0, 10))}`, pageWidth - marginR, 14, { align: 'right' });
    doc.text(`Total: ${rows.length}`, pageWidth - marginR, 19, { align: 'right' });
  };

  const drawTableHeader = (y: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const wrapped = cols.map(c => doc.splitTextToSize(c.label, c.w - 2) as string[]);
    const maxLines = Math.max(...wrapped.map(w => w.length));
    const headerH = Math.max(bodyRowH, maxLines * lineH + 2.5);

    doc.setDrawColor(0);
    doc.setLineWidth(0.2);

    let x = marginL;
    cols.forEach((c, i) => {
      const lines = wrapped[i];
      const totalTextH = lines.length * lineH;
      const startY = y + (headerH - totalTextH) / 2 + lineH - 0.6;
      const tx = c.align === 'center' ? x + c.w / 2 : x + 1.5;
      lines.forEach((ln, li) => {
        doc.text(ln, tx, startY + li * lineH, { align: c.align });
      });
      x += c.w;
    });

    doc.line(marginL, y, marginL + usableW, y);
    doc.line(marginL, y + headerH, marginL + usableW, y + headerH);
    let vx = marginL;
    doc.line(vx, y, vx, y + headerH);
    cols.forEach(c => {
      vx += c.w;
      doc.line(vx, y, vx, y + headerH);
    });

    doc.setFont('helvetica', 'normal');
    return y + headerH;
  };

  const truncate = (text: string, w: number) => {
    let t = text;
    if (doc.getTextWidth(t) <= w - 2) return t;
    while (t.length > 0 && doc.getTextWidth(t + '…') > w - 2) {
      t = t.slice(0, -1);
    }
    return t + '…';
  };

  const drawRow = (y: number, idx: number, r: CompetitionPrintRow) => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    let x = marginL;
    const fmtTime = (iso: string | null): string => {
      if (!iso) return '';
      const m = String(iso).match(/T(\d{2}:\d{2})/);
      if (m) return m[1];
      const m2 = String(iso).match(/(\d{2}:\d{2})/);
      return m2 ? m2[1] : '';
    };
    const values: Record<string, string> = {
      idx: String(idx),
      comp: fmtTime(r.competition_at),
      report: fmtTime(r.reporting_at),
      court: r.court || '',
      branch: r.branch_name || '',
      name: (r.student_name || '').toUpperCase(),
      belt: r.current_belt || '',
      category: (r.category || '').replace(/Singapore Open Poomsae — Category: /, ''),
      p1: r.poomsae_1 || '',
      p1s: '',
      p2: r.poomsae_2 || '',
      p2s: '',
      remarks: '',
    };
    const textY = y + 5.2;
    cols.forEach(c => {
      const v = values[c.key];
      if (v) {
        const tx = c.align === 'center' ? x + c.w / 2 : x + 1.5;
        doc.text(truncate(v, c.w), tx, textY, { align: c.align });
      }
      x += c.w;
    });

    doc.setLineWidth(0.15);
    doc.line(marginL, y + bodyRowH, marginL + usableW, y + bodyRowH);
    let vx = marginL;
    doc.line(vx, y, vx, y + bodyRowH);
    cols.forEach(c => {
      vx += c.w;
      doc.line(vx, y, vx, y + bodyRowH);
    });
    return y + bodyRowH;
  };

  drawHeader();
  let y = 24;
  y = drawTableHeader(y);

  rows.forEach((r, i) => {
    if (y + bodyRowH > pageHeight - 12) {
      doc.addPage();
      drawHeader();
      y = 24;
      y = drawTableHeader(y);
    }
    y = drawRow(y, i + 1, r);
  });

  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text(`Page ${p} of ${total}`, pageWidth - marginR, pageHeight - 5, { align: 'right' });
  }

  const safe = (s: string) => s.replace(/[^a-z0-9]+/gi, '_');
  doc.save(`Competition_${safe(eventName)}_${safe(branchName)}.pdf`);
}

// -----------------------------------------------------------------------------
// Competition Payment Report — grouped by branch (Name, Amount Paid, Total, GST)
// -----------------------------------------------------------------------------

export interface CompetitionPaymentReportRow {
  branch_name: string | null;
  student_name: string;
  amount: number | null;
  paid: boolean;
}

export interface CompetitionPaymentReportOptions {
  rows: CompetitionPaymentReportRow[];
  eventName: string;
  gstRate?: number; // inclusive; defaults to 0.09
}

export function generateCompetitionPaymentReportPDF({
  rows,
  eventName,
  gstRate = 0.09,
}: CompetitionPaymentReportOptions) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageWidth = 210;
  const pageHeight = 297;
  const marginL = 12;
  const marginR = 12;
  const usableW = pageWidth - marginL - marginR;

  const fmt = (n: number) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Group rows by branch
  const groups = new Map<string, CompetitionPaymentReportRow[]>();
  for (const r of rows) {
    const key = r.branch_name || '—';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  const branchNames = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b));

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`Competition Payment Report — ${eventName}`, marginL, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Generated: ${formatDate(new Date().toISOString().slice(0, 10))}`, pageWidth - marginR, 14, { align: 'right' });

  let y = 22;
  const rowH = 6;
  const colX = {
    name: marginL,
    paid: marginL + usableW - 90,
    total: marginL + usableW - 60,
    gst: marginL + usableW - 30,
  };
  const colEnd = marginL + usableW;

  const drawColHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Name', colX.name, y);
    doc.text('Amount Paid', colX.paid + 28, y, { align: 'right' });
    doc.text('Total', colX.total + 28, y, { align: 'right' });
    doc.text('GST', colEnd, y, { align: 'right' });
    y += 1.5;
    doc.setDrawColor(0);
    doc.setLineWidth(0.2);
    doc.line(marginL, y, marginL + usableW, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 12) {
      doc.addPage();
      y = 14;
    }
  };

  let grandPaid = 0;
  let grandTotal = 0;
  let grandGst = 0;

  branchNames.forEach((branch) => {
    const items = groups.get(branch)!;
    ensureSpace(20);
    // Branch header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(branch, marginL, y);
    y += 4;
    drawColHeader();

    let subPaid = 0;
    let subTotal = 0;
    let subGst = 0;

    items.forEach((r) => {
      ensureSpace(rowH);
      const total = Number(r.amount || 0);
      const paid = r.paid ? total : 0;
      const gst = total - total / (1 + gstRate);
      subPaid += paid;
      subTotal += total;
      subGst += gst;

      doc.setFontSize(9);
      doc.text((r.student_name || '').slice(0, 60), colX.name, y);
      doc.text(fmt(paid), colX.paid + 28, y, { align: 'right' });
      doc.text(fmt(total), colX.total + 28, y, { align: 'right' });
      doc.text(fmt(gst), colEnd, y, { align: 'right' });
      y += rowH;
    });

    ensureSpace(rowH + 2);
    doc.setDrawColor(0);
    doc.setLineWidth(0.15);
    doc.line(marginL, y - rowH + 1.5, marginL + usableW, y - rowH + 1.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Subtotal', colX.name, y);
    doc.text(fmt(subPaid), colX.paid + 28, y, { align: 'right' });
    doc.text(fmt(subTotal), colX.total + 28, y, { align: 'right' });
    doc.text(fmt(subGst), colEnd, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += rowH + 4;

    grandPaid += subPaid;
    grandTotal += subTotal;
    grandGst += subGst;
  });

  ensureSpace(rowH + 4);
  doc.setDrawColor(0);
  doc.setLineWidth(0.4);
  doc.line(marginL, y - 2, marginL + usableW, y - 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Grand Total', colX.name, y + 3);
  doc.text(fmt(grandPaid), colX.paid + 28, y + 3, { align: 'right' });
  doc.text(fmt(grandTotal), colX.total + 28, y + 3, { align: 'right' });
  doc.text(fmt(grandGst), colEnd, y + 3, { align: 'right' });

  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text(`Page ${p} of ${total}`, pageWidth - marginR, pageHeight - 5, { align: 'right' });
  }

  const safe = (s: string) => s.replace(/[^a-z0-9]+/gi, '_');
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  doc.save(`Competition_Payment_Report_${safe(eventName)}_${stamp}.pdf`);
}
