import gaonhaeLogo from '@/assets/certificates/gaonhae-logo-transparent.png';
import jsPDF from 'jspdf';
import { formatDate } from '@/utils/dateFormat';
import { PROGRESS_SECTIONS, RATING_LABELS, READINESS_LABELS, ratingKey, type Rating } from '@/utils/progressCard';
import type { ProgressReportRow } from '@/services/progressCardService';

const BLUE: [number, number, number] = [21, 63, 145];
const RED: [number, number, number] = [200, 30, 45];
const logo = (doc: jsPDF, M: number) => { try { doc.addImage(gaonhaeLogo, 'PNG', M, 6, 27, 16, undefined, 'FAST'); } catch { /* logo optional */ } };

export function buildProgressReportPdf(rows: ProgressReportRow[], branchName: string, termLabel: string, opts: { cardOnly?: boolean; fileName?: string } = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, M = 14;
  if (!opts.cardOnly) {

  // Summary
  logo(doc, M);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(...BLUE);
  doc.text('PROGRESS REPORT SUMMARY', W / 2 + 12, 18, { align: 'center' });
  doc.setFontSize(10); doc.setTextColor(60); doc.setFont('helvetica', 'normal');
  doc.text(doc.splitTextToSize(`${branchName} · ${termLabel}`, 120), W / 2 + 12, 25, { align: 'center' });
  const cols = [{ t: '#', w: 10 }, { t: 'Name', w: 70 }, { t: 'Birth Date', w: 28 }, { t: 'Ready for Grading Test', w: 38 }, { t: 'Paid Date', w: 36 }];
  const LH = 4.2, PAD = 2;
  let y = 40;
  const header = () => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    const hl = cols.map((c) => doc.splitTextToSize(c.t, c.w - 2 * PAD) as string[]);
    const hh = Math.max(...hl.map((l) => l.length)) * LH + 3;
    doc.setFillColor(...BLUE); doc.rect(M, y, W - 2 * M, hh, 'F'); doc.setTextColor(255);
    let x = M; hl.forEach((l, k) => { doc.text(l, x + PAD, y + 4.5); x += cols[k].w; });
    y += hh; doc.setFont('helvetica', 'normal'); doc.setTextColor(30);
  };
  header();
  rows.forEach((r, i) => {
    doc.setFontSize(9);
    const vals = [String(i + 1), r.name, r.dob ? formatDate(r.dob) : '—', r.grading_readiness ? READINESS_LABELS[r.grading_readiness] : '—', r.paid_date ? formatDate(r.paid_date) : '—']
      .map((v, k) => doc.splitTextToSize(v, cols[k].w - 2 * PAD) as string[]);
    const h = Math.max(...vals.map((l) => l.length)) * LH + 3;
    if (y + h > 280) { doc.addPage(); y = 16; header(); }
    let x = M; vals.forEach((l, k) => { doc.text(l, x + PAD, y + 4.5); x += cols[k].w; });
    doc.setDrawColor(220); doc.line(M, y + h, W - M, y + h);
    y += h;
  });
  if (!rows.length) doc.text('No progress cards for this term yet.', M, y + 6);
  const total = doc.getNumberOfPages(), now = new Date();
  const stamp = `Report generated ${formatDate(now)} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  for (let pg = 1; pg <= total; pg++) {
    doc.setPage(pg); doc.setFontSize(8); doc.setTextColor(110); doc.setFont('helvetica', 'normal');
    doc.text(stamp, M, 290); doc.text(`Page ${pg} of ${total}`, W - M, 290, { align: 'right' });
  }
  doc.setPage(total);
  }

  // One card per student
  rows.forEach((r, idx) => {
    if (!opts.cardOnly || idx > 0) doc.addPage();
    logo(doc, M);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
    doc.setTextColor(...BLUE); doc.text('PROGRESS', W / 2 - 2, 20, { align: 'right' });
    doc.setTextColor(...RED); doc.text('REPORT CARD', W / 2 + 2, 20);
    doc.setFontSize(8); doc.setTextColor(90); doc.text('TRAINING TODAY, LEADING TOMORROW!', W / 2, 26, { align: 'center' });
    doc.setDrawColor(...BLUE); doc.roundedRect(M, 30, W - 2 * M, 18, 2, 2);
    doc.setFontSize(9); doc.setTextColor(30);
    const info = (l: string, v: string, x: number, yy: number) => { doc.setFont('helvetica', 'bold'); doc.text(`${l}:`, x, yy); doc.setFont('helvetica', 'normal'); doc.text(doc.splitTextToSize(v, W / 2 - 34) as string[], x + 26, yy); };
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
    (['yes', 'no'] as const).forEach((k, i) => {
      const x = M + 50 + i * 60;
      doc.setDrawColor(100); doc.rect(x, gy + 11, 6, 6);
      if (r.grading_readiness === k) { doc.setFillColor(...BLUE); doc.rect(x + 1, gy + 12, 4, 4, 'F'); }
      doc.setTextColor(30); doc.setFontSize(10); doc.text(READINESS_LABELS[k].toUpperCase(), x + 9, gy + 16);
    });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...BLUE);
    doc.text('RESPECT  •  DISCIPLINE  •  CONFIDENCE  •  PERSEVERANCE', W / 2, 288, { align: 'center' });
  });

  if (opts.fileName) { doc.save(opts.fileName); return; }
  doc.save(`progress-report-${branchName.replace(/\s+/g, '-').toLowerCase()}-${termLabel.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}
