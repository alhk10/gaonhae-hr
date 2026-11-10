import jsPDF from 'jspdf';
import { formatDate } from '@/utils/dateFormat';
import { PROGRESS_SECTIONS, RATING_LABELS, READINESS_LABELS, ratingKey, type Rating } from '@/utils/progressCard';
import type { ProgressReportRow } from '@/services/progressCardService';

const BLUE: [number, number, number] = [21, 63, 145];
const RED: [number, number, number] = [200, 30, 45];

export function buildProgressReportPdf(rows: ProgressReportRow[], branchName: string, termLabel: string) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, M = 14;

  // Summary
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(...BLUE);
  doc.text('PROGRESS REPORT SUMMARY', W / 2, 20, { align: 'center' });
  doc.setFontSize(10); doc.setTextColor(60); doc.setFont('helvetica', 'normal');
  doc.text(`${branchName} · ${termLabel}`, W / 2, 27, { align: 'center' });
  const cols = [{ t: '#', w: 10 }, { t: 'Name', w: 78 }, { t: 'Birth Date', w: 30 }, { t: 'Ready for Grading Test', w: 34 }, { t: 'Paid date', w: 30 }];
  let y = 36;
  const header = () => {
    doc.setFillColor(...BLUE); doc.rect(M, y - 5, W - 2 * M, 7, 'F');
    doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    let x = M + 2; cols.forEach((c) => { doc.text(c.t, x, y); x += c.w; });
    y += 7; doc.setFont('helvetica', 'normal'); doc.setTextColor(30);
  };
  header();
  rows.forEach((r, i) => {
    const name = doc.splitTextToSize(r.name, cols[1].w - 3) as string[];
    const h = Math.max(6, name.length * 4.5 + 1.5);
    if (y + h > 285) { doc.addPage(); y = 20; header(); }
    const vals = [String(i + 1), name, r.dob ? formatDate(r.dob) : '—', r.grading_readiness ? READINESS_LABELS[r.grading_readiness] : '—', r.paid_date ? formatDate(r.paid_date) : '—'];
    let x = M + 2; vals.forEach((v, k) => { doc.text(v as any, x, y); x += cols[k].w; });
    doc.setDrawColor(220); doc.line(M, y + h - 4.5, W - M, y + h - 4.5);
    y += h;
  });
  if (!rows.length) doc.text('No progress cards for this term yet.', M, y);

  // One card per student
  rows.forEach((r) => {
    doc.addPage();
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
    doc.setTextColor(...BLUE); doc.text('PROGRESS', W / 2 - 2, 20, { align: 'right' });
    doc.setTextColor(...RED); doc.text('REPORT CARD', W / 2 + 2, 20);
    doc.setFontSize(8); doc.setTextColor(90); doc.text('TRAINING TODAY, LEADING TOMORROW!', W / 2, 26, { align: 'center' });
    doc.setDrawColor(...BLUE); doc.roundedRect(M, 30, W - 2 * M, 18, 2, 2);
    doc.setFontSize(9); doc.setTextColor(30);
    const info = (l: string, v: string, x: number, yy: number) => { doc.setFont('helvetica', 'bold'); doc.text(`${l}:`, x, yy); doc.setFont('helvetica', 'normal'); doc.text(v, x + 26, yy); };
    info('Name', r.name, M + 4, 37); info('Current Belt', r.belt || 'No belt', W / 2 + 4, 37);
    info('Age', r.age != null ? String(r.age) : '—', M + 4, 44); info('Report Date', `${formatDate(r.report_date)} · ${r.term_label || termLabel}`, W / 2 + 4, 44);

    const bw = (W - 2 * M - 6) / 2;
    PROGRESS_SECTIONS.forEach((s, idx) => {
      const bx = M + (idx % 2) * (bw + 6), by = 54 + Math.floor(idx / 2) * 78;
      const col = idx % 2 === 0 ? BLUE : RED;
      doc.setDrawColor(...col); doc.roundedRect(bx, by, bw, 72, 2, 2);
      doc.setFillColor(...col); doc.rect(bx, by, bw, 8, 'F');
      doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text(s.title.toUpperCase(), bx + 3, by + 5.5);
      const rx = [bx + bw - 45, bx + bw - 28, bx + bw - 11];
      doc.setTextColor(60); doc.setFontSize(6.5);
      (Object.keys(RATING_LABELS) as Rating[]).forEach((rt, k) => doc.text(doc.splitTextToSize(RATING_LABELS[rt], 15), rx[k], by + 13, { align: 'center' }));
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(30);
      s.items.forEach((it, j) => {
        const iy = by + 25 + j * 10;
        doc.text(doc.splitTextToSize(it, bw - 52), bx + 3, iy);
        (Object.keys(RATING_LABELS) as Rating[]).forEach((rt, k) => {
          doc.setDrawColor(120); doc.circle(rx[k], iy - 1, 2);
          if (r.ratings?.[ratingKey(s.key, it)] === rt) { doc.setFillColor(...col); doc.circle(rx[k], iy - 1, 1.4, 'F'); }
        });
      });
    });

    const gy = 214;
    doc.setDrawColor(...BLUE); doc.roundedRect(M, gy, W - 2 * M, 22, 2, 2);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...BLUE);
    doc.text('READY FOR GRADING TEST?', W / 2, gy + 7, { align: 'center' });
    (['yes', 'nearly', 'no'] as const).forEach((k, i) => {
      const x = M + 25 + i * 55;
      doc.setDrawColor(100); doc.rect(x, gy + 11, 6, 6);
      if (r.grading_readiness === k) { doc.setFillColor(...BLUE); doc.rect(x + 1, gy + 12, 4, 4, 'F'); }
      doc.setTextColor(30); doc.setFontSize(10); doc.text(READINESS_LABELS[k].toUpperCase(), x + 9, gy + 16);
    });
    if (r.comments) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text('Comments', M, 246);
      doc.setFont('helvetica', 'normal'); doc.text(doc.splitTextToSize(r.comments, W - 2 * M), M, 252);
    }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...BLUE);
    doc.text('RESPECT  •  DISCIPLINE  •  CONFIDENCE  •  PERSEVERANCE', W / 2, 288, { align: 'center' });
  });

  doc.save(`progress-report-${branchName.replace(/\s+/g, '-').toLowerCase()}-${termLabel.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}
