import jsPDF from 'jspdf';
import { format } from 'date-fns';

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

const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), 'dd MMM yyyy');
  } catch {
    return dateString;
  }
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
  
  // Map 'draft' to 'Unpaid' for display and apply color coding
  let rawStatus = invoice.status || 'unpaid';
  if (rawStatus === 'draft') rawStatus = 'unpaid';
  const statusText = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
  
  // Apply color coding: Paid = Green, Unpaid = Red
  if (rawStatus === 'paid') {
    doc.setTextColor(34, 139, 34); // Forest green
  } else if (rawStatus === 'unpaid') {
    doc.setTextColor(220, 53, 69); // Red
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
      qrData = await loadImage(invoice.template!.paynow_qr_url!);
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
      doc.addImage(qrData.data, 'PNG', qrX, qrStartY, qrSize, qrSize);
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
  doc.text(`Generated on ${format(new Date(), 'dd MMM yyyy HH:mm')}`, pageWidth / 2, footerY + 5, { align: 'center' });

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

export const shareInvoiceViaWhatsApp = async (
  invoice: InvoiceData,
  whatsappNumber: string
): Promise<void> => {
  // First download the PDF
  await downloadInvoicePDF(invoice);
  
  // Clean the phone number (remove spaces, dashes, etc.)
  const cleanNumber = whatsappNumber.replace(/[\s\-\(\)]/g, '');
  
  // Prepare the message
  const message = encodeURIComponent(
    `Hello! Here is your invoice ${invoice.invoice_number} for ${formatCurrency(invoice.total_amount)}. ` +
    `Balance due: ${formatCurrency(invoice.balance_due)}. Please find the PDF attachment.`
  );
  
  // Open WhatsApp Web
  window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
};
