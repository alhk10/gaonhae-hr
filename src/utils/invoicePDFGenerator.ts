import jsPDF from 'jspdf';

import { formatDate, formatDateTime } from '@/utils/dateFormat';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  tax_rate: number;
  tax_amount: number;
  metadata?: {
    term_id?: string;
    grading_slot_id?: string;
  };
  term_info?: string;      // e.g., "Term 1 2026 (19 Jan - 10 Apr)"
  grading_info?: string;   // e.g., "11 Apr 2026 at 08:40"
}

export interface InvoiceTemplate {
  letterhead_url?: string;
  paynow_qr_url?: string;
  country?: string;
  default_notes?: string;
  footer_text?: string;
  bank_transfer_info?: string;
}

export interface InvoiceData {
  id: string;
  invoice_number: string;
  issue_date: string | null;
  due_date: string | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  notes: string | null;
  status: string | null;
  student?: {
    name: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    whatsapp?: string | null;
  };
  items?: InvoiceItem[];
  branch?: {
    name: string;
    address?: string;
  };
  template?: InvoiceTemplate;
}

const COMPANY_INFO = {
  name: 'GAONHAE TAEKWONDO LLP',
  address: 'Singapore',
  phone: '+65 9XXX XXXX',
  email: 'info@gaonhae.com',
  uen: 'T24LL0001A'
};

interface LoadedImage {
  data: string;
  width: number;
  height: number;
}

const loadImage = (url: string, maxWidth = 300, maxHeight = 300): Promise<LoadedImage | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Downscale to target render size
      let w = img.width;
      let h = img.height;
      if (w > maxWidth || h > maxHeight) {
        const scale = Math.min(maxWidth / w, maxHeight / h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
        resolve({
          data: canvas.toDataURL('image/jpeg', 0.7),
          width: w,
          height: h
        });
      } else {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

const formatCurrency = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};


const normalizeInvoiceStatus = (status: string | null | undefined): string => {
  if (!status) return 'unpaid';
  if (status === 'draft' || status === 'sent') return 'unpaid';
  if (status === 'partial') return 'partially_paid';
  return status;
};

const resolveInvoiceStatus = (invoice: InvoiceData): string => {
  const normalizedStatus = normalizeInvoiceStatus(invoice.status);

  if (['cancelled', 'refunded', 'verified', 'overdue'].includes(normalizedStatus)) {
    return normalizedStatus;
  }

  const total = Number(invoice.total_amount || 0);
  const paid = Number(invoice.amount_paid || 0);
  const rawBalance = invoice.balance_due ?? total - paid;
  const balance = Math.max(0, Number(rawBalance || 0));

  if (paid > 0 && balance > 0) return 'partially_paid';
  if (total > 0 && balance <= 0) return 'paid';

  return normalizedStatus;
};

export const generateInvoicePDF = async (invoice: InvoiceData): Promise<jsPDF> => {
  const doc = new jsPDF({ compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  // Load and add logo with proper aspect ratio (downscaled to ~200px)
  const logoResult = await loadImage('/images/company-logo.jpg', 200, 200);
  const targetLogoHeight = 18.54; // Fixed height (18 * 1.03 = 18.54), width calculated to maintain aspect ratio
  let logoWidth = 0;
  let logoHeight = 0;
  
  if (logoResult) {
    // Calculate width to maintain aspect ratio
    const aspectRatio = logoResult.width / logoResult.height;
    logoHeight = targetLogoHeight;
    logoWidth = targetLogoHeight * aspectRatio;
    doc.addImage(logoResult.data, 'JPEG', margin, yPos, logoWidth, logoHeight, undefined, 'FAST');
  }
  
  // Render letterhead text (multi-line company info) to the right of logo
  const letterheadText = invoice.template?.letterhead_url;
  const textStartX = margin + (logoResult ? logoWidth + 5 : 0); // Offset if logo exists
  
  if (letterheadText && letterheadText.trim()) {
    // Render letterhead as multi-line text
    const lines = letterheadText.split('\n');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    
    lines.forEach((line, index) => {
      // First line bold, rest normal
      if (index > 0) {
        doc.setFont('helvetica', 'normal');
      }
      doc.text(line.trim(), textStartX, yPos + 5 + (index * 5));
    });
  } else {
    // Fallback: Draw default text manually
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(COMPANY_INFO.name, margin, yPos + 8);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(COMPANY_INFO.address, margin, yPos + 15);
    doc.text(`UEN: ${COMPANY_INFO.uen}`, margin, yPos + 21);
  }

  // Invoice title on the right
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth - margin, yPos + 10, { align: 'right' });

  yPos += 40;

  // Draw a line
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // Invoice details section
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Number:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.invoice_number, margin + 35, yPos);

  doc.setFont('helvetica', 'bold');
  doc.text('Issue Date:', pageWidth - margin - 60, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(invoice.issue_date), pageWidth - margin - 25, yPos);

  yPos += 7;

  doc.setFont('helvetica', 'bold');
  doc.text('Status:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  
  // Resolve status with financial-state fallback to prevent stale DB status in PDFs
  const rawStatus = resolveInvoiceStatus(invoice);
  
  const statusDisplayMap: Record<string, string> = {
    'paid': 'Paid',
    'unpaid': 'Unpaid',
    'partially_paid': 'Partially Paid',
    'overdue': 'Overdue',
    'verified': 'Verified',
    'cancelled': 'Cancelled',
    'refunded': 'Refunded',
  };
  const statusText = statusDisplayMap[rawStatus] || rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
  
  // Apply color coding
  if (rawStatus === 'paid' || rawStatus === 'verified') {
    doc.setTextColor(34, 139, 34); // Forest green
  } else if (rawStatus === 'unpaid' || rawStatus === 'overdue') {
    doc.setTextColor(220, 53, 69); // Red
  } else if (rawStatus === 'partially_paid') {
    doc.setTextColor(204, 133, 0); // Dark yellow/orange
  } else if (rawStatus === 'cancelled' || rawStatus === 'refunded') {
    doc.setTextColor(108, 117, 125); // Grey
  }
  
  doc.text(statusText, margin + 35, yPos);
  doc.setTextColor(0, 0, 0); // Reset to black

  doc.setFont('helvetica', 'bold');
  doc.text('Due Date:', pageWidth - margin - 60, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(invoice.due_date), pageWidth - margin - 25, yPos);

  yPos += 15;

  // Bill To section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', margin, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (invoice.student) {
    doc.text(invoice.student.name, margin, yPos);
    yPos += 5;
    if (invoice.student.address) {
      doc.text(invoice.student.address, margin, yPos);
      yPos += 5;
    }
    if (invoice.student.phone) {
      doc.text(`Phone: ${invoice.student.phone}`, margin, yPos);
      yPos += 5;
    }
    if (invoice.student.email) {
      doc.text(`Email: ${invoice.student.email}`, margin, yPos);
      yPos += 5;
    }
  }

  yPos += 10;

  // Items table header
  const tableStartY = yPos;
  // Table header background
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPos - 5, pageWidth - margin * 2, 10, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Products/Services', margin + 2, yPos);
  doc.text('Total', pageWidth - margin - 2, yPos, { align: 'right' });

  yPos += 8;

  // Table rows
  doc.setFont('helvetica', 'normal');
  if (invoice.items && invoice.items.length > 0) {
    invoice.items.forEach((item) => {
      // Check if we need a new page
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(item.description.substring(0, 80), margin + 2, yPos);
      doc.text(formatCurrency(item.total_amount), pageWidth - margin - 2, yPos, { align: 'right' });
      
      yPos += 6;

      // Add grading info if available (gray, smaller text - 9pt)
      if (item.grading_info) {
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`  Grading: ${item.grading_info}`, margin + 2, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 5;
      }

      // Add term info if available (gray, smaller text - 9pt)
      if (item.term_info) {
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`  ${item.term_info}`, margin + 2, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 5;
      }

      yPos += 2;
    });
  } else {
    doc.text('No items', margin + 2, yPos);
    yPos += 7;
  }

  // Draw line after items
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // Totals section (aligned right)
  const totalsX = pageWidth - margin - 80;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Subtotal:', totalsX, yPos);
  doc.text(formatCurrency(invoice.subtotal), pageWidth - margin - 2, yPos, { align: 'right' });
  yPos += 6;

  doc.text('Tax:', totalsX, yPos);
  doc.text(formatCurrency(invoice.tax_amount), pageWidth - margin - 2, yPos, { align: 'right' });
  yPos += 6;

  if (invoice.discount_amount > 0) {
    doc.text('Discount:', totalsX, yPos);
    doc.text(`-${formatCurrency(invoice.discount_amount)}`, pageWidth - margin - 2, yPos, { align: 'right' });
    yPos += 6;
  }

  // Total line
  doc.setDrawColor(100, 100, 100);
  doc.line(totalsX - 5, yPos - 2, pageWidth - margin, yPos - 2);
  yPos += 4;

  // Total (reduced from 11pt to 10pt)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Total:', totalsX, yPos);
  doc.text(formatCurrency(invoice.total_amount), pageWidth - margin - 2, yPos, { align: 'right' });
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Amount Paid:', totalsX, yPos);
  doc.text(formatCurrency(invoice.amount_paid), pageWidth - margin - 2, yPos, { align: 'right' });
  yPos += 6;

  // Balance Due (increased from 10pt to 11pt)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Balance Due:', totalsX, yPos);
  doc.text(formatCurrency(invoice.balance_due), pageWidth - margin - 2, yPos, { align: 'right' });

  yPos += 20;

  // Notes, Bank Transfer Info and PayNow QR Code section
  const hasQrCode = invoice.template?.paynow_qr_url;
  const hasDefaultNotes = invoice.template?.default_notes?.trim();
  const hasInvoiceNotes = invoice.notes?.trim();
  const hasBankTransferInfo = invoice.template?.bank_transfer_info?.trim();
  
  if (hasQrCode || hasDefaultNotes || hasInvoiceNotes || hasBankTransferInfo) {
    // Check if we need a new page
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }
    
    const qrSize = 42; // 5% larger than original 40
    const qrX = pageWidth - margin - qrSize; // Right-aligned
    let qrData: LoadedImage | null = null;
    
    // Load QR code if available
    if (hasQrCode) {
      qrData = await loadImage(invoice.template!.paynow_qr_url!, 168, 168);
    }
    
    // Calculate max width for notes (leave space for bank info/QR if present)
    const rightColumnWidth = 60; // Width for bank transfer info + QR
    const hasRightColumn = hasBankTransferInfo || qrData;
    const notesMaxWidth = hasRightColumn ? (pageWidth - margin * 2 - rightColumnWidth - 10) : (pageWidth - margin * 2);
    const notesStartY = yPos;
    const rightColumnX = pageWidth - margin - rightColumnWidth;
    
    // Render notes on the left
    if (hasDefaultNotes || hasInvoiceNotes) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Notes:', margin, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      
      // Template default notes first
      if (hasDefaultNotes) {
        const splitDefaultNotes = doc.splitTextToSize(invoice.template!.default_notes!, notesMaxWidth);
        doc.text(splitDefaultNotes, margin, yPos);
        yPos += splitDefaultNotes.length * 4 + 4;
      }
      
      // Invoice-specific notes
      if (hasInvoiceNotes) {
        const splitNotes = doc.splitTextToSize(invoice.notes!, notesMaxWidth);
        doc.text(splitNotes, margin, yPos);
        yPos += splitNotes.length * 4;
      }
    }
    
    // Render bank transfer info on the right (above QR code)
    let bankInfoEndY = notesStartY;
    if (hasBankTransferInfo) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Bank Transfer:', rightColumnX, notesStartY);
      doc.setFont('helvetica', 'normal');
      
      const bankLines = invoice.template!.bank_transfer_info!.split('\n');
      let bankY = notesStartY + 5;
      bankLines.forEach((line) => {
        doc.text(line.trim(), rightColumnX, bankY);
        bankY += 4;
      });
      bankInfoEndY = bankY + 2;
    }
    
    // Add QR code on the right (below bank transfer info)
    if (qrData) {
      const qrStartY = hasBankTransferInfo ? bankInfoEndY : notesStartY;
      doc.addImage(qrData.data, 'JPEG', qrX, qrStartY, qrSize, qrSize, undefined, 'FAST');
      // Ensure yPos accounts for QR height if notes are shorter
      const qrEndY = qrStartY + qrSize;
      if (yPos < qrEndY) {
        yPos = qrEndY;
      }
    } else if (hasBankTransferInfo && yPos < bankInfoEndY) {
      yPos = bankInfoEndY;
    }
    
    yPos += 10;
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(128, 128, 128);
  const footerText = invoice.template?.footer_text?.trim() || 'Thank you for your business!';
  doc.text(footerText, pageWidth / 2, footerY, { align: 'center' });
  doc.text(`Generated on ${formatDateTime(new Date())}`, pageWidth / 2, footerY + 5, { align: 'center' });

  return doc;
};

export const downloadInvoicePDF = async (invoice: InvoiceData): Promise<void> => {
  const doc = await generateInvoicePDF(invoice);
  doc.save(`Invoice_${invoice.invoice_number}.pdf`);
};

export const getInvoicePDFBlob = async (invoice: InvoiceData): Promise<Blob> => {
  const doc = await generateInvoicePDF(invoice);
  return doc.output('blob');
};

export const getInvoicePDFBase64 = async (invoice: InvoiceData): Promise<string> => {
  const doc = await generateInvoicePDF(invoice);
  return doc.output('datauristring').split(',')[1];
};

// Phone target normalization helpers
// Strip invisible/zero-width characters and normalize Unicode before any further cleanup.
// Covers: zero-width space (U+200B), ZWNJ (U+200C), ZWJ (U+200D), BOM/word-joiner
// (U+FEFF, U+2060), non-breaking spaces (U+00A0, U+202F, U+205F), ideographic space (U+3000),
// and the soft hyphen (U+00AD).
const HIDDEN_CHARS_RE = /[\u200B-\u200D\u2060\uFEFF\u00A0\u202F\u205F\u3000\u00AD]/g;
const stripHiddenAndTrim = (v: string): string =>
  (v ?? '').normalize('NFKC').replace(HIDDEN_CHARS_RE, '').trim();

// WhatsApp deep links require digits-only (no '+', no spaces).
export const normalizeWhatsAppTarget = (v: string): string =>
  stripHiddenAndTrim(v).replace(/\D/g, '');
// SMS scheme keeps the leading '+' for international dialing; only strip formatting chars.
const normalizeSmsTarget = (v: string): string =>
  stripHiddenAndTrim(v).replace(/[\s\-\(\)]/g, '');

/**
 * Returns true if the raw value contains at least one digit after stripping
 * hidden characters and whitespace. Use as a pre-check before opening WhatsApp.
 */
export const hasUsableMobileNumber = (v?: string | null): boolean =>
  !!v && stripHiddenAndTrim(v).replace(/\D/g, '').length > 0;

export interface SmsTermInfo {
  name?: string;
  start_date?: string;
  end_date?: string;
}

/**
 * Build the rich term-reminder message body shared by SMS and WhatsApp.
 * Includes opening (ending + upcoming term with date range), itemized list,
 * total, bank transfer details, and the Gaonhae signature.
 */
export const buildTermReminderMessage = (
  invoice: InvoiceData,
  terms?: { current?: SmsTermInfo | null; next?: SmsTermInfo | null }
): string => {
  // Build items list (en-dash separator)
  const itemsList = invoice.items && invoice.items.length > 0
    ? invoice.items.map(item => `${item.description} \u2013 ${formatCurrency(item.total_amount)}`).join('\n')
    : 'No items';

  // Build bank transfer info if available
  const bankInfo = invoice.template?.bank_transfer_info?.trim() || '(Bank transfer details not configured)';

  // Opening line — term context with graceful fallbacks.
  // If we know the ending term name (e.g. "Term 2 2026"), derive a sensible
  // next-term label ("Term 3 2026") when the explicit next term is missing.
  const currentName = terms?.current?.name?.trim() || 'the current term';
  const explicitNextName = terms?.next?.name?.trim();
  const deriveNextName = (cur?: string): string | null => {
    if (!cur) return null;
    const m = cur.match(/^Term\s+(\d+)\s+(\d{4})$/i);
    if (!m) return null;
    return `Term ${parseInt(m[1], 10) + 1} ${m[2]}`;
  };
  const nextName = explicitNextName || deriveNextName(terms?.current?.name?.trim()) || 'The next term';

  const nextStart = terms?.next?.start_date ? formatDate(terms.next.start_date) : null;
  const nextEnd = terms?.next?.end_date ? formatDate(terms.next.end_date) : null;

  const nextRange = nextStart && nextEnd
    ? ` and will run from ${nextStart} to ${nextEnd}`
    : '';

  const opening = `We have now reached the end of ${currentName}. ${nextName} will commence next week${nextRange}.`;

  // Time-of-day greeting based on sender's local clock
  const hour = new Date().getHours();
  const timeOfDay = hour >= 5 && hour < 12
    ? 'Morning'
    : hour >= 12 && hour < 18
      ? 'Afternoon'
      : 'Evening';
  const greeting = `Good ${timeOfDay},`;

  return (
    `${greeting}\n\n` +
    `${opening}\n\n` +
    `Kindly arrange payment before the start of the term as follows:\n\n` +
    `Items:\n${itemsList}\n\n` +
    `Total: ${formatCurrency(invoice.total_amount)}\n\n` +
    `Payment can be made via bank transfer using the details below:\n${bankInfo}\n\n` +
    `Thank you for your continued support.\n` +
    `Gaonhae Taekwondo (${invoice.branch?.name || 'Branch'})`
  );
};

export const shareInvoiceViaWhatsApp = async (
  invoice: InvoiceData,
  whatsappNumber: string,
  terms?: { current?: SmsTermInfo | null; next?: SmsTermInfo | null }
): Promise<void> => {
  // Digits-only target (wa.me requires no '+', no spaces)
  const digits = normalizeWhatsAppTarget(whatsappNumber);

  // Build the same rich term-reminder body used by SMS
  const message = buildTermReminderMessage(invoice, terms);

  // Open WhatsApp via the simpler wa.me link in a new tab
  const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
};

export const shareInvoiceViaSMS = async (
  invoice: InvoiceData,
  phoneNumber: string,
  terms?: { current?: SmsTermInfo | null; next?: SmsTermInfo | null }
): Promise<void> => {
  // Clean the phone number (preserve leading '+' for SMS scheme)
  const cleanNumber = normalizeSmsTarget(phoneNumber);

  const message = buildTermReminderMessage(invoice, terms);

  // Open SMS app
  window.location.href = `sms:${cleanNumber}?&body=${encodeURIComponent(message)}`;
};

export const shareInvoiceOverdueReminderViaSMS = async (
  invoice: InvoiceData,
  phoneNumber: string,
  context?: { currentTerm?: SmsTermInfo | null; daysOverdue?: number | null }
): Promise<void> => {
  // Clean the phone number (preserve leading '+' for SMS scheme)
  const cleanNumber = normalizeSmsTarget(phoneNumber);

  // Build items list (en-dash separator)
  const itemsList = invoice.items && invoice.items.length > 0
    ? invoice.items.map(item => `${item.description} \u2013 ${formatCurrency(item.total_amount)}`).join('\n')
    : 'No items';

  // Bank transfer info
  const bankInfo = invoice.template?.bank_transfer_info?.trim() || '(Bank transfer details not configured)';

  // Term name + days overdue with graceful fallbacks
  const currentName = context?.currentTerm?.name?.trim() || 'the current term';
  const daysOverdueLabel = context?.daysOverdue && context.daysOverdue > 0
    ? `${context.daysOverdue}`
    : 'several';

  const message =
    `This is a reminder that your payment for ${currentName} is now ${daysOverdueLabel} days overdue.\n\n` +
    `Please arrange payment immediately as follows:\n\n` +
    `Items:\n${itemsList}\n\n` +
    `Total: ${formatCurrency(invoice.total_amount)}\n\n` +
    `Payment can be made via bank transfer using the details below:\n${bankInfo}\n\n` +
    `Please note that students may be barred from attending classes until the outstanding amount has been settled.\n\n` +
    `We appreciate your prompt attention to this matter.\n` +
    `Gaonhae Taekwondo (${invoice.branch?.name || 'Branch'})`;

  // Open SMS app
  window.location.href = `sms:${cleanNumber}?&body=${encodeURIComponent(message)}`;
};
