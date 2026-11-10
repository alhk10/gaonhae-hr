import kidThumbs from '@/assets/progress-card/kid-thumbs.png';
import kidKick from '@/assets/progress-card/kid-kick.png';
import kidBow from '@/assets/progress-card/kid-bow.png';
import gaonhaeLogo from '@/assets/certificates/gaonhae-logo-transparent.png';
import jsPDF from 'jspdf';
import { formatDate } from '@/utils/dateFormat';
import { formatBranchCurrency } from '@/utils/branchCurrency';
import { PROGRESS_SECTIONS, RATING_LABELS, READINESS_LABELS, ratingKey, type Rating } from '@/utils/progressCard';
import type { ProgressReportRow } from '@/services/progressCardService';

const BLUE: [number, number, number] = [21, 63, 145];
const RED: [number, number, number] = [200, 30, 45];
let logoData: string | null = null;
const art: Record<string, string | null> = {};
async function toData(url: string): Promise<string | null> {
  try {
    const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
    let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return `data:image/png;base64,${btoa(bin)}`;
  } catch { return null; }
}
async function loadLogo() {
  if (logoData) return;
  const [l, t, k, b] = await Promise.all([toData(gaonhaeLogo), toData(kidThumbs), toData(kidKick), toData(kidBow)]);
  logoData = l; art.thumbs = t; art.kick = k; art.bow = b;
}
const putArt = (doc: jsPDF, key: string, x: number, y: number, h: number, ratio: number) => {
  const d = art[key]; if (!d) return;
  try { doc.addImage(d, 'PNG', x, y, h * ratio, h, key, 'FAST'); } catch { /* optional art */ }
};
const logo = (doc: jsPDF, M: number) => { if (!logoData) return; try { doc.addImage(logoData, 'PNG', M, 6, 27, 16, undefined, 'FAST'); } catch { /* logo optional */ } };

export async function buildProgressReportPdf(rows: ProgressReportRow[], branchName: string, termLabel: string, opts: { cardOnly?: boolean; fileName?: string } = {}) {
  await loadLogo();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, M = 14;
  if (!opts.cardOnly) {

  // Summary
  logo(doc, M);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(...BLUE);
  doc.text('PROGRESS REPORT SUMMARY', W / 2 + 12, 18, { align: 'center' });
  doc.setFontSize(10); doc.setTextColor(60); doc.setFont('helvetica', 'normal');
  doc.text(doc.splitTextToSize(`${branchName} · ${termLabel}`, 120), W / 2 + 12, 25, { align: 'center' });
  const cols = [{ t: '#', w: 9 }, { t: 'Name', w: 57 }, { t: 'Birth Date', w: 24 }, { t: 'Progress Card', w: 30 }, { t: 'Ready for Grading Test', w: 30 }, { t: 'Paid Date / Amount', w: 32 }];
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
    const vals = [String(i + 1), r.name, r.dob ? formatDate(r.dob) : '—', r.has_card === false || !r.report_date ? '-' : formatDate(r.report_date), r.grading_readiness ? READINESS_LABELS[r.grading_readiness] : '—', r.paid_date ? `${formatDate(r.paid_date)}${r.paid_amount != null ? `\n${formatBranchCurrency(Number(r.paid_amount), branchName)}` : ''}` : '—']
      .map((v, k) => doc.splitTextToSize(v, cols[k].w - 2 * PAD) as string[]);
    const h = Math.max(...vals.map((l) => l.length)) * LH + 3;
    if (y + h > 280) { doc.addPage(); y = 16; header(); }
    let x = M; vals.forEach((l, k) => { doc.text(l, x + PAD, y + 4.5); x += cols[k].w; });
    doc.setDrawColor(220); doc.line(M, y + h, W - M, y + h);
    y += h;
  });
  if (!rows.length) doc.text('No active students in this branch.', M, y + 6);

  // Attendance page: one column per class date
  const dateSet = new Set<string>();
  rows.forEach((r) => Object.keys(r.attendance?.marks || {}).forEach((d) => dateSet.add(d)));
  const dates = [...dateSet].sort();
  const land = dates.length > 22;
  doc.addPage('a4', land ? 'landscape' : 'portrait');
  const PW = land ? 297 : 210, PH = land ? 210 : 297;
  logo(doc, M);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(...BLUE);
  doc.text('TERM ATTENDANCE RECORD', PW / 2 + 12, 18, { align: 'center' });
  doc.setFontSize(10); doc.setTextColor(60); doc.setFont('helvetica', 'normal');
  doc.text(doc.splitTextToSize(`${branchName} · ${termLabel}`, 120), PW / 2 + 12, 25, { align: 'center' });
  const numW = 7, totW = 9, avail = PW - 2 * M - numW - totW;
  const nameW = Math.min(55, Math.max(35, avail - dates.length * 9));
  const dW = dates.length ? Math.min(12, (avail - nameW) / dates.length) : 0;
  const fs = Math.max(5, Math.min(8, dW * 0.9));
  const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
  const bottom = PH - 22;
  y = 38;
  const aheader = () => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(fs);
    doc.setFillColor(...BLUE); doc.rect(M, y, PW - 2 * M, 8, 'F'); doc.setTextColor(255);
    doc.text('#', M + 1, y + 5.2); doc.text('Name', M + numW + 1, y + 5.2);
    dates.forEach((d, k) => doc.text(ddmm(d), M + numW + nameW + k * dW + dW / 2, y + 5.2, { align: 'center' }));
    doc.text('P', M + numW + nameW + dates.length * dW + totW / 2, y + 5.2, { align: 'center' });
    y += 8; doc.setFont('helvetica', 'normal'); doc.setTextColor(30);
  };
  aheader();
  rows.forEach((r, i) => {
    doc.setFontSize(fs + 0.5);
    const nl = doc.splitTextToSize(r.name, nameW - 2) as string[];
    const h = Math.max(1, nl.length) * (fs * 0.45) + 2.5;
    if (y + h > bottom) { doc.addPage('a4', land ? 'landscape' : 'portrait'); y = 16; aheader(); doc.setFontSize(fs + 0.5); }
    doc.text(String(i + 1), M + 1, y + 3.6); doc.text(nl, M + numW + 1, y + 3.6);
    const marks = r.attendance?.marks || {};
    let p = 0;
    dates.forEach((d, k) => {
      const m = marks[d]; const cx = M + numW + nameW + k * dW + dW / 2;
      if (m === 'attended') { p++; doc.setTextColor(20, 120, 60); doc.text('P', cx, y + 3.6, { align: 'center' }); }
      else if (m === 'absent') { doc.setTextColor(...RED); doc.text('A', cx, y + 3.6, { align: 'center' }); }
    });
    doc.setTextColor(30); doc.setFont('helvetica', 'bold');
    doc.text(String(p), M + numW + nameW + dates.length * dW + totW / 2, y + 3.6, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setDrawColor(225); doc.line(M, y + h, PW - M, y + h);
    y += h;
  });
  if (!dates.length) { doc.setFontSize(9); doc.text('No attendance marked this term.', M, y + 6); }
  doc.setFontSize(8); doc.setTextColor(60);
  doc.text('Legend:  P = Present   ·   A = Absent   ·   blank = not booked / not marked   ·   P column = total present', M, PH - 14);

  const total = doc.getNumberOfPages(), now = new Date();
  const stamp = `Report generated ${formatDate(now)} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  for (let pg = 1; pg <= total; pg++) {
    doc.setPage(pg); doc.setFontSize(8); doc.setTextColor(110); doc.setFont('helvetica', 'normal');
    const ps = doc.internal.pageSize, pw = ps.getWidth(), ph = ps.getHeight();
    doc.text(stamp, M, ph - 7); doc.text(`Page ${pg} of ${total}`, pw - M, ph - 7, { align: 'right' });
  }
  doc.setPage(total);
  }

  // One card per student
  rows.filter((r) => r.has_card !== false && !!r.report_date).forEach((r, idx) => {
    if (!opts.cardOnly || idx > 0) doc.addPage('a4', 'portrait');
    if (logoData) { try { doc.addImage(logoData, 'PNG', M, 4, 31, 18.4, undefined, 'FAST'); } catch { /* optional */ } }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
    const t1 = 'PROGRESS ', t2 = 'REPORT CARD', tw = doc.getTextWidth(t1) + doc.getTextWidth(t2), tx = W / 2 - tw / 2;
    doc.setTextColor(...BLUE); doc.text(t1, tx, 18);
    doc.setTextColor(...RED); doc.text(t2, tx + doc.getTextWidth(t1), 18);
    putArt(doc, 'kick', W - M - 18, 1, 28.6, 213 / 360);
    doc.setFontSize(8); doc.setTextColor(90); doc.text('TRAINING TODAY, LEADING TOMORROW!', W / 2, 26, { align: 'center' });
    doc.setDrawColor(...BLUE); doc.roundedRect(M, 30, W - 2 * M, 21, 2, 2);
    doc.setFontSize(9); doc.setTextColor(30);
    const info = (l: string, v: string, x: number, yy: number) => { doc.setFont('helvetica', 'bold'); doc.text(`${l}:`, x, yy); doc.setFont('helvetica', 'normal'); doc.text(doc.splitTextToSize(v, W / 2 - M - 32) as string[], x + 26, yy); };
    info('Name', r.name, M + 4, 37); info('Current Belt', r.belt || 'No belt', W / 2 + 4, 37);
    info('Age', r.age != null ? String(r.age) : '—', M + 4, 46.5); info('Report Date', `${formatDate(r.report_date)} · ${r.term_label || termLabel}`, W / 2 + 4, 46.5);

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
    const gw = W - 2 * M - 42;
    doc.setDrawColor(...BLUE); doc.roundedRect(M, gy, gw, 22, 2, 2);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...BLUE);
    doc.text('READY FOR GRADING TEST?', M + gw / 2, gy + 7, { align: 'center' });
    putArt(doc, 'thumbs', W - M - 29.5, gy - 6, 30, 201 / 360);
    (['yes', 'no'] as const).forEach((k, i) => {
      const x = M + gw / 2 - 30 + i * 36;
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
