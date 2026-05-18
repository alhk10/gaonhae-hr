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
  beltAchieved: string;         // The belt the student PASSED FROM (pre-grading belt), e.g. "White" → printed as "White Belt"
  gradingDate: Date | string;   // long format on the cert
  scorecard: ScorecardRow[];    // editable list rendered on page 2
  examinerName?: string;        // (no longer printed) kept for backwards compat
  result?: 'pass' | 'double' | 'fail' | null; // displayed in final scorecard row
  /**
   * Ordered list of column labels from the grading list header (left → right).
   * When supplied, scorecard rows on page 2 are sorted to match this order
   * (with Height, Weight, BMI always pinned to the top in that sequence).
   * Rows whose label isn't in `columnOrder` go to the end, preserving their
   * original relative order.
   */
  columnOrder?: string[];
}

const A4_W = 210;
const A4_H = 297;



/**
 * Append " Belt" to color belts (White through Black Tip).
 * Skip the suffix for Foundation, Poom, and Dan ranks.
 */
const formatBeltLabel = (belt: string): string => {
  const trimmed = (belt || '').trim();
  if (!trimmed) return '';
  if (/foundation|poom|dan/i.test(trimmed)) return trimmed;
  if (/\bbelt\b/i.test(trimmed)) return trimmed;
  return `${trimmed} Belt`;
};

/** Add unit suffix to specific scorecard labels for PDF display only. */
const labelWithUnit = (label: string): string => {
  const l = (label || '').trim().toLowerCase();
  if (l === 'height') return 'Height (cm)';
  if (l === 'weight') return 'Weight (kg)';
  return label;
};

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
  doc.text(formatBeltLabel(input.beltAchieved), A4_W / 2, 138, { align: 'center' });

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
  // Footer shifted up 30mm; logos shifted left 10mm
  const footerY = 210;

  // Fit-into-box helper that preserves the image's native aspect ratio.
  const fitBox = (
    nativeW: number,
    nativeH: number,
    maxW: number,
    maxH: number,
  ): { w: number; h: number } => {
    const scale = Math.min(maxW / nativeW, maxH / nativeH);
    return { w: nativeW * scale, h: nativeH * scale };
  };

  // Native aspect ratios (pixels) — see source assets in /assets/certificates/au.
  const WT_NATIVE = { w: 484, h: 231 };
  const KW_NATIVE = { w: 347, h: 244 };
  const SIG_NATIVE = { w: 456, h: 466 };

  // WT logo
  const wtBox = fitBox(WT_NATIVE.w, WT_NATIVE.h, 35.2, 26.4);
  const wtX = 42;
  const wtY = footerY + (24 - wtBox.h) / 2;
  doc.addImage(worldTaekwondoLogo, 'JPEG', wtX, wtY, wtBox.w, wtBox.h, undefined, 'FAST');

  // Kukkiwon logo
  const kwBox = fitBox(KW_NATIVE.w, KW_NATIVE.h, 39.6, 26.4);
  const kwX = 80;
  const kwY = footerY + (24 - kwBox.h) / 2;
  doc.addImage(kukkiwonLogo, 'JPEG', kwX, kwY, kwBox.w, kwBox.h, undefined, 'FAST');

  // "In Affiliation With" — centred between left edge of WT and right edge of Kukkiwon
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  const affiliationCenterX = (wtX + (kwX + kwBox.w)) / 2;
  doc.text('In Affiliation With', affiliationCenterX, footerY - 6, { align: 'center' });

  // Signature on the right
  const sigBox = fitBox(SIG_NATIVE.w, SIG_NATIVE.h, 55, 30.8);
  const sigRightEdge = A4_W - 40;
  const sigX = sigRightEdge - sigBox.w;
  const sigY = footerY - 4 + (28 - sigBox.h) / 2;
  doc.addImage(masterSignature, 'JPEG', sigX, sigY, sigBox.w, sigBox.h, undefined, 'FAST');
};

const isBlankValue = (v?: string): boolean => {
  if (!v) return true;
  const trimmed = v.trim();
  if (trimmed === '') return true;
  if (trimmed === '-' || trimmed === '—' || trimmed === '–') return true;
  return false;
};

const formatResult = (r?: 'pass' | 'double' | 'fail' | null): string => {
  if (!r) return '';
  return r.toUpperCase();
};

const drawScorecardPage = (doc: jsPDF, input: GradingCertificateInput) => {
  doc.addPage();

  // Filter out blank/dash-only scorecard rows
  const filteredRows = withDerivedBmi(
    input.scorecard.filter(r => (r.label?.trim() ?? '') !== '' && !isBlankValue(r.value)),
  );

  // Sort to match grading list column order (Height → Weight → BMI → columnOrder → rest).
  const norm = (s: string) => (s || '').trim().toLowerCase();
  const pinnedRank = (label: string): number => {
    const l = norm(label);
    if (l === 'height') return 0;
    if (l === 'weight') return 1;
    if (l === 'bmi') return 2;
    return -1;
  };
  const orderIndex = new Map<string, number>();
  (input.columnOrder || []).forEach((label, idx) => {
    orderIndex.set(norm(label), idx);
  });
  const dataRows = filteredRows
    .map((row, originalIdx) => ({ row, originalIdx }))
    .sort((a, b) => {
      const ap = pinnedRank(a.row.label);
      const bp = pinnedRank(b.row.label);
      if (ap !== -1 || bp !== -1) {
        if (ap === -1) return 1;
        if (bp === -1) return -1;
        return ap - bp;
      }
      const ai = orderIndex.has(norm(a.row.label)) ? orderIndex.get(norm(a.row.label))! : Number.MAX_SAFE_INTEGER;
      const bi = orderIndex.has(norm(b.row.label)) ? orderIndex.get(norm(b.row.label))! : Number.MAX_SAFE_INTEGER;
      if (ai !== bi) return ai - bi;
      return a.originalIdx - b.originalIdx;
    })
    .map(x => x.row);

  // Build full row list: 3 structural header rows + scorecard rows + Results row
  const allRows: ScorecardRow[] = [
    { label: 'Grading Date', value: longDate(input.gradingDate) },
    { label: 'Student Name', value: input.studentName },
    { label: 'Belt', value: formatBeltLabel(input.beltAchieved) },
    ...dataRows,
    { label: 'Results', value: formatResult(input.result) },
  ];

  // Title (uppercase)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text('GRADING SCORECARD', A4_W / 2, 22, { align: 'center' });

  // Table layout
  const tableX = 25;
  const tableW = A4_W - tableX * 2;
  const labelW = tableW * 0.4;
  const rowH = 11;
  const startY = 35;
  let y = startY;

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);

  allRows.forEach((row, idx) => {
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
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text(labelWithUnit(row.label), tableX + 4, y + 7.2);
    const isResultsRow = row.label === 'Results';
    const isPass = isResultsRow && row.value === 'PASS';
    const isBmiRow = row.label.toLowerCase() === 'bmi';
    const bmiNum = isBmiRow ? parseFloat(row.value) : NaN;
    if (isBmiRow && !isNaN(bmiNum) && bmiNum >= 25) {
      doc.setFont('helvetica', 'bold');
      if (bmiNum >= 32) doc.setTextColor(220, 38, 38);        // red
      else if (bmiNum >= 28) doc.setTextColor(234, 88, 12);   // orange
      else doc.setTextColor(202, 138, 4);                     // yellow/amber
    } else if (isPass) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 139, 34);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(20, 20, 20);
    }
    doc.text(row.value || '', tableX + labelW + 4, y + 7.2);
    y += rowH;
  });

  // Outer border
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.rect(tableX, startY, tableW, y - startY, 'S');
};

/** True when no meaningful scorecard data is supplied (skip page 2). */
const hasScorecardContent = (input: GradingCertificateInput): boolean => {
  if (input.result) return true;
  return (input.scorecard || []).some(
    r => (r.label?.trim() ?? '') !== '' && !isBlankValue(r.value),
  );
};

export const generateGradingCertificatePDF = (input: GradingCertificateInput): jsPDF => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  drawCertificatePage(doc, input);
  if (hasScorecardContent(input)) drawScorecardPage(doc, input);
  return doc;
};

/** Trigger a browser download of the certificate PDF. */
export const downloadGradingCertificatePDF = (input: GradingCertificateInput, filename: string): void => {
  const doc = generateGradingCertificatePDF(input);
  doc.save(filename);
};

/**
 * Generate a single combined PDF containing all supplied certificates.
 * Each input contributes 2 pages (certificate + scorecard). For a "double"
 * promotion, callers should pass both Cert I and Cert II as two entries.
 */
export const generateBulkGradingCertificatesPDF = (inputs: GradingCertificateInput[]): jsPDF => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  inputs.forEach((input, idx) => {
    if (idx > 0) doc.addPage('a4', 'portrait');
    drawCertificatePage(doc, input);
    if (hasScorecardContent(input)) drawScorecardPage(doc, input);
  });
  return doc;
};

/** Trigger a browser download of the combined bulk certificates PDF. */
export const downloadBulkGradingCertificatesPDF = (inputs: GradingCertificateInput[], filename: string): void => {
  const doc = generateBulkGradingCertificatesPDF(inputs);
  doc.save(filename);
};

/**
 * Async variant of {@link generateBulkGradingCertificatesPDF} that yields to
 * the browser between certificates so the UI stays responsive and a progress
 * callback can be invoked. Use this for any non-trivial batch (≥ ~5 inputs)
 * to avoid the "Page Unresponsive" dialog.
 */
export const generateBulkGradingCertificatesPDFAsync = async (
  inputs: GradingCertificateInput[],
  onProgress?: (done: number, total: number) => void,
): Promise<jsPDF> => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  for (let idx = 0; idx < inputs.length; idx++) {
    if (idx > 0) doc.addPage('a4', 'portrait');
    drawCertificatePage(doc, inputs[idx]);
    if (hasScorecardContent(inputs[idx])) drawScorecardPage(doc, inputs[idx]);
    onProgress?.(idx + 1, inputs.length);
    // Yield to the event loop so the browser can repaint and stay responsive.
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  }
  return doc;
};
