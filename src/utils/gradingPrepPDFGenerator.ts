/**
 * Grading Preparation PDF
 * Printable checklist with filled Student Name + Belt and blank
 * Ready / Paid / Slot / School Fees columns for manual marking.
 */
import jsPDF from 'jspdf';
import { formatDate } from '@/utils/dateFormat';

export interface GradingPrepStudent {
  student_name: string;
  current_belt: string | null;
}

export interface GradingPrepPDFOptions {
  students: GradingPrepStudent[];
  branchName: string;
  termName: string;
}

export function generateGradingPrepPDF({ students, branchName, termName }: GradingPrepPDFOptions) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageWidth = 210;
  const pageHeight = 297;
  const marginL = 12;
  const marginR = 12;
  const usableW = pageWidth - marginL - marginR; // 186mm

  // Columns (mm) — sum must equal usableW (186)
  const cols = [
    { key: 'idx', label: '#', w: 8, align: 'center' as const },
    { key: 'name', label: 'Student Name', w: 56, align: 'left' as const },
    { key: 'belt', label: 'Belt', w: 22, align: 'left' as const },
    { key: 'ready', label: 'Ready for Grading', w: 28, align: 'center' as const },
    { key: 'paid', label: 'Paid', w: 14, align: 'center' as const },
    { key: 'slot', label: 'Slot', w: 40, align: 'center' as const },
    { key: 'fees', label: 'School Fees', w: 18, align: 'center' as const },
  ];

  const bodyRowH = 7;
  const lineH = 3.2;

  const drawHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Grading Preparation', marginL, 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Branch: ${branchName}`, marginL, 22);
    doc.text(`Term: ${termName}`, marginL, 27);
    doc.text(`Generated: ${formatDate(new Date().toISOString().slice(0, 10))}`, pageWidth - marginR, 22, { align: 'right' });
    doc.text(`Total: ${students.length}`, pageWidth - marginR, 27, { align: 'right' });
  };

  const drawTableHeader = (y: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);

    // Pre-wrap labels & compute row height
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

    // Borders
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

  const drawRow = (y: number, idx: number, s: GradingPrepStudent) => {
    doc.setFontSize(8);
    // Bold first data row, normal afterwards
    doc.setFont('helvetica', idx === 1 ? 'bold' : 'normal');

    let x = marginL;
    const values: Record<string, string> = {
      idx: String(idx),
      name: (s.student_name || '').toUpperCase(),
      belt: s.current_belt || '',
      ready: '',
      paid: '',
      slot: '',
      fees: '',
    };
    const textY = y + 4.8;
    cols.forEach(c => {
      const v = values[c.key];
      if (v) {
        const tx = c.align === 'center' ? x + c.w / 2 : x + 1.5;
        let text = v;
        if (c.key === 'name' && doc.getTextWidth(text) > c.w - 2) {
          while (text.length > 0 && doc.getTextWidth(text + '…') > c.w - 2) {
            text = text.slice(0, -1);
          }
          text = text + '…';
        }
        doc.text(text, tx, textY, { align: c.align });
      }
      x += c.w;
    });

    // Borders
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
  let y = 34;
  y = drawTableHeader(y);

  students.forEach((s, i) => {
    if (y + bodyRowH > pageHeight - 14) {
      doc.addPage();
      drawHeader();
      y = 34;
      y = drawTableHeader(y);
    }
    y = drawRow(y, i + 1, s);
  });

  // Footer page numbers
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text(`Page ${p} of ${total}`, pageWidth - marginR, pageHeight - 6, { align: 'right' });
  }

  const safe = (s: string) => s.replace(/[^a-z0-9]+/gi, '_');
  doc.save(`Grading_Prep_${safe(branchName)}_${safe(termName)}.pdf`);
}
