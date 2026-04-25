/**
 * Grading Certificate PDF Generator (AU / Morley template — Phase 1)
 *
 * Produces a 2-page A4 portrait certificate matching the uploaded
 * Grading_Certificate_Template_Morley.pdf:
 *   • Page 1 — formal "GRADE CERTIFICATE" with student name, belt achieved,
 *     long-format grading date, in-affiliation logos, and examiner signature.
 *   • Page 2 — flexible scorecard table rendered from
 *     `grading_registrations.scorecard` (JSON array of {label, value}).
 *     BMI is appended automatically when both Height and Weight rows are
 *     present so it never has to be entered manually.
 *
 * Singapore branches will get a separate generator in Phase 2 — this file
 * is AU-only. All assets are bundled under `src/assets/certificates/au/`.
 */

import jsPDF from 'jspdf';
import { format } from 'date-fns';

import gaonhaeLogo from '@/assets/certificates/au/gaonhae-logo.jpg';
import worldTaekwondoLogo from '@/assets/certificates/au/world-taekwondo.jpg';
import kukkiwonLogo from '@/assets/certificates/au/kukkiwon.jpg';
import masterSignature from '@/assets/certificates/au/master-signature.jpg';

import {
  ScorecardRow,
  computeBmi,
  extractNumeric,
} from '@/constants/scorecardLabels';

export interface GradingCertificateInput {
  studentName: string;          // pre-formatted full name
  beltAchieved: string;         // e.g. "Yellow Belt" — printed verbatim
  gradingDate: Date | string;   // long format on the cert
  scorecard: ScorecardRow[];    // editable list rendered on page 2
  examinerName?: string;        // (no longer printed) kept for backwards compat
  result?: 'pass' | 'double' | 'fail' | null; // displayed in final scorecard row
}

const A4_W = 210;
const A4_H = 297;

const MASTER_DEFAULT = 'Master Alvin Lee';

const longDate = (d: Date | string): string => {
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return format(date, 'd MMMM yyyy');
};

/** Append a derived "BMI" row when Height + Weight are present and BMI not already supplied. */
const withDerivedBmi = (rows: ScorecardRow[]): ScorecardRow[] => {
  const hasBmi = rows.some(r => /bmi/i.test(r.label));
  if (hasBmi) return rows;
  const heightRow = rows.find(r => /height/i.test(r.label));
  const weightRow = rows.find(r => /weight/i.test(r.label));
  if (!heightRow?.value || !weightRow?.value) return rows;
  const h = extractNumeric(heightRow.value);
  const w = extractNumeric(weightRow.value);
  const bmi = computeBmi(h ?? undefined, w ?? undefined);
  if (bmi === null) return rows;
  return [...rows, { label: 'BMI', value: String(bmi) }];
};

const drawCertificatePage = (doc: jsPDF, input: GradingCertificateInput) => {
  // Header logo — GaonHae Taekwondo (centered top)
  const logoW = 60;
  const logoH = 32;
  doc.addImage(gaonhaeLogo, 'JPEG', (A4_W - logoW) / 2, 16, logoW, logoH, undefined, 'FAST');

  // Title
  doc.setFont('times', 'bold');
  doc.setFontSize(36);
  doc.setTextColor(20, 20, 20);
  doc.text('GRADE CERTIFICATE', A4_W / 2, 70, { align: 'center' });

  // Student name
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(28);
  doc.setTextColor(0, 0, 0);
  doc.text(input.studentName, A4_W / 2, 100, { align: 'center' });

  // "Has successfully passed the"
  doc.setFont('times', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(60, 60, 60);
  doc.text('Has successfully passed the', A4_W / 2, 118, { align: 'center' });

  // Belt achieved
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(26);
  doc.setTextColor(0, 0, 0);
  doc.text(input.beltAchieved, A4_W / 2, 138, { align: 'center' });

  // "Grading Test held on"
  doc.setFont('times', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(60, 60, 60);
  doc.text('Grading Test held on', A4_W / 2, 156, { align: 'center' });

  // Date
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(22);
  doc.setTextColor(0, 0, 0);
  doc.text(longDate(input.gradingDate), A4_W / 2, 174, { align: 'center' });

  // ── Footer block ──
  // "In Affiliation With" + WT/Kukkiwon logos on the left
  const footerY = 230;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text('In Affiliation With', 30, footerY - 6);

  // WT logo
  doc.addImage(worldTaekwondoLogo, 'JPEG', 22, footerY, 36, 24, undefined, 'FAST');
  // Kukkiwon logo
  doc.addImage(kukkiwonLogo, 'JPEG', 64, footerY, 36, 24, undefined, 'FAST');

  // Signature block on the right (image only — name/label removed per template update)
  const sigW = 50;
  const sigH = 28;
  const sigX = A4_W - 30 - sigW;
  doc.addImage(masterSignature, 'JPEG', sigX, footerY - 4, sigW, sigH, undefined, 'FAST');
};

const drawScorecardPage = (doc: jsPDF, input: GradingCertificateInput) => {
  doc.addPage();

  const rows = withDerivedBmi(input.scorecard.filter(r => r.label?.trim() || r.value?.trim()));

  // Header strip with student + belt + date so the scorecard is self-contained
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text('Grading Scorecard', A4_W / 2, 22, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(
    `${input.studentName}  ·  ${input.beltAchieved}  ·  ${longDate(input.gradingDate)}`,
    A4_W / 2,
    29,
    { align: 'center' },
  );

  // Table layout
  const tableX = 25;
  const tableW = A4_W - tableX * 2;
  const labelW = tableW * 0.4;
  const valueW = tableW - labelW;
  const rowH = 11;
  let y = 45;

  // Header row
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.setFillColor(245, 245, 245);
  doc.rect(tableX, y, tableW, rowH, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  doc.text('Field', tableX + 4, y + 7.2);
  doc.text('Result', tableX + labelW + 4, y + 7.2);
  y += rowH;

  // Data rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);

  if (rows.length === 0) {
    doc.rect(tableX, y, tableW, rowH * 3, 'S');
    doc.setTextColor(140, 140, 140);
    doc.text(
      'No scorecard entries recorded.',
      A4_W / 2,
      y + (rowH * 3) / 2 + 2,
      { align: 'center' },
    );
    return;
  }

  rows.forEach((row, idx) => {
    if (y + rowH > A4_H - 20) {
      doc.addPage();
      y = 25;
    }
    if (idx % 2 === 1) {
      doc.setFillColor(250, 250, 250);
      doc.rect(tableX, y, tableW, rowH, 'F');
    }
    doc.setDrawColor(220, 220, 220);
    doc.line(tableX, y + rowH, tableX + tableW, y + rowH);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text(row.label || '—', tableX + 4, y + 7.2);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(20, 20, 20);
    doc.text(row.value || '—', tableX + labelW + 4, y + 7.2);
    y += rowH;
  });

  // Outer border
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.rect(tableX, 45, tableW, y - 45, 'S');
};

export const generateGradingCertificatePDF = (input: GradingCertificateInput): jsPDF => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  drawCertificatePage(doc, input);
  drawScorecardPage(doc, input);
  return doc;
};

/** Trigger a browser download of the certificate PDF. */
export const downloadGradingCertificatePDF = (input: GradingCertificateInput, filename: string): void => {
  const doc = generateGradingCertificatePDF(input);
  doc.save(filename);
};
