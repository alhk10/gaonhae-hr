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
    { key: 'idx', label: '#', w: 8, align: 'center' as const },
    { key: 'branch', label: 'Branch', w: 26, align: 'left' as const },
    { key: 'name', label: 'Name', w: 48, align: 'left' as const },
    { key: 'belt', label: 'Belt', w: 22, align: 'left' as const },
    { key: 'category', label: 'Category', w: 47, align: 'left' as const },
    { key: 'p1', label: 'Poomsae 1', w: 26, align: 'left' as const },
    { key: 'p1s', label: 'P1 Score', w: 20, align: 'center' as const },
    { key: 'p2', label: 'Poomsae 2', w: 26, align: 'left' as const },
    { key: 'p2s', label: 'P2 Score', w: 20, align: 'center' as const },
    { key: 'remarks', label: 'Remarks', w: 34, align: 'left' as const },
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
    const values: Record<string, string> = {
      idx: String(idx),
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
