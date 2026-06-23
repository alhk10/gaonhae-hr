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
  const usableW = pageWidth - marginL - marginR;

  // Columns (mm)
  const cols = [
    { key: 'idx', label: '#', w: 8, align: 'center' as const },
    { key: 'name', label: 'Student Name', w: 60, align: 'left' as const },
    { key: 'belt', label: 'Belt', w: 26, align: 'left' as const },
    { key: 'ready', label: 'Ready for Grading', w: 26, align: 'center' as const },
    { key: 'paid', label: 'Paid', w: 18, align: 'center' as const },
    { key: 'slot', label: 'Slot', w: 36, align: 'center' as const },
    { key: 'fees', label: 'School Fees', w: 22, align: 'center' as const },
  ];
  const tableW = cols.reduce((s, c) => s + c.w, 0);
  // Distribute leftover to name col if any
  const leftover = usableW - tableW;
  if (leftover > 0) cols[1].w += leftover;

  const rowH = 8;

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
    doc.setFontSize(9);
    let x = marginL;
    // Header background line
    doc.setDrawColor(0);
    doc.setLineWidth(0.2);
    doc.line(marginL, y, marginL + usableW, y);
    const textY = y + 5.2;
    cols.forEach(c => {
      const tx = c.align === 'center' ? x + c.w / 2 : x + 1.5;
      doc.text(c.label, tx, textY, { align: c.align });
      x += c.w;
    });
    doc.line(marginL, y + rowH, marginL + usableW, y + rowH);
    // Verticals
    let vx = marginL;
    doc.line(vx, y, vx, y + rowH);
    cols.forEach(c => {
      vx += c.w;
      doc.line(vx, y, vx, y + rowH);
    });
    doc.setFont('helvetica', 'normal');
    return y + rowH;
  };

  const drawRow = (y: number, idx: number, s: GradingPrepStudent) => {
    doc.setFontSize(9);
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
    const textY = y + 5.4;
    cols.forEach(c => {
      const v = values[c.key];
      if (v) {
        const tx = c.align === 'center' ? x + c.w / 2 : x + 1.5;
        // Truncate name if needed
        let text = v;
        if (c.key === 'name' && doc.getTextWidth(text) > c.w - 3) {
          while (text.length > 0 && doc.getTextWidth(text + '…') > c.w - 3) {
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
    doc.line(marginL, y + rowH, marginL + usableW, y + rowH);
    let vx = marginL;
    doc.line(vx, y, vx, y + rowH);
    cols.forEach(c => {
      vx += c.w;
      doc.line(vx, y, vx, y + rowH);
    });
    return y + rowH;
  };

  drawHeader();
  let y = 34;
  y = drawTableHeader(y);

  students.forEach((s, i) => {
    if (y + rowH > pageHeight - 14) {
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
