import jsPDF from 'jspdf';
import { format } from 'date-fns';

export interface StudentData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nricPassport: string;
  currentBelt: string;
  enrollmentDate: string;
}

export interface EmployeeData {
  name: string;
  dateOfBirth: string;
  nric: string;
  position: string;
  baseSalary: number;
  joinDate: string;
  address?: string;
  phone?: string;
}

export interface LetterTemplateData {
  id: string;
  name: string;
  type: 'student' | 'employee';
  title: string;
  body_text: string;
  body_text_2?: string;
  closing_text: string;
  signatory_name?: string;
  signatory_position?: string;
  signature_image_url?: string;
  company_name?: string;
  footer_text?: string;
  addressee_name?: string;
  address?: string;
  contact_number?: string;
  salutation?: string;
  show_horizontal_line?: boolean;
}

interface LetterTemplates {
  studentBody: string;
  studentClosing: string;
  employeeBody: string;
  employeeClosing: string;
}

const DEFAULT_TEMPLATES: LetterTemplates = {
  studentBody: 'This is to certify that {fullName} is a student currently registered at Gaonhae Taekwondo.',
  studentClosing: 'This letter is issued upon request for {fullName}\'s reference.',
  employeeBody: 'This is to certify that {fullName} is employed at Gaonhae Taekwondo LLP.',
  employeeClosing: 'This letter is issued upon request for {fullName}\'s reference.',
};

const DEFAULT_FOOTER_TEXT = 'This letter is computer generated and does not require signature.';

const STORAGE_KEY = 'verification-letter-templates';

const getLetterTemplates = (): LetterTemplates => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_TEMPLATES, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Error loading templates:', error);
  }
  return DEFAULT_TEMPLATES;
};

interface StudentPlaceholders {
  fullName: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nricPassport: string;
  currentBelt: string;
  enrollmentDate: string;
}

interface EmployeePlaceholders {
  fullName: string;
  dateOfBirth: string;
  nric: string;
  position: string;
  salary: string;
  joinDate: string;
  address: string;
  phone: string;
}

const replaceStudentPlaceholders = (template: string, data: StudentPlaceholders): string => {
  return template
    .replace(/{fullName}/g, data.fullName)
    .replace(/{firstName}/g, data.firstName)
    .replace(/{lastName}/g, data.lastName)
    .replace(/{dateOfBirth}/g, data.dateOfBirth)
    .replace(/{nricPassport}/g, data.nricPassport)
    .replace(/{currentBelt}/g, data.currentBelt)
    .replace(/{enrollmentDate}/g, data.enrollmentDate);
};

const replaceEmployeePlaceholders = (template: string, data: EmployeePlaceholders): string => {
  return template
    .replace(/{fullName}/g, data.fullName)
    .replace(/{dateOfBirth}/g, data.dateOfBirth)
    .replace(/{nric}/g, data.nric)
    .replace(/{position}/g, data.position)
    .replace(/{salary}/g, data.salary)
    .replace(/{joinDate}/g, data.joinDate)
    .replace(/{address}/g, data.address)
    .replace(/{phone}/g, data.phone);
};

const loadImageAsDataUrl = async (url: string, maxWidth = 200, maxHeight = 200): Promise<{ data: string; width: number; height: number } | null> => {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
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
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    return { data: canvas.toDataURL('image/jpeg', 0.7), width: img.width, height: img.height };
  } catch (error) {
    console.warn('Could not load image for PDF:', error);
    return null;
  }
};

const loadSignatureImage = async (url: string): Promise<{ data: string; width: number; height: number } | null> => {
  if (!url) return null;
  return loadImageAsDataUrl(url, 200, 100);
};

const addLetterhead = async (doc: jsPDF, logoData: { data: string; width: number; height: number } | null) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoWidth = 42.35;
  const totalWidth = logoWidth + 5 + 120;
  const startX = (pageWidth - totalWidth) / 2 + 8;

  if (logoData) {
    const logoHeight = (logoData.height / logoData.width) * logoWidth;
    doc.addImage(logoData.data, 'JPEG', startX, 15, logoWidth, Math.min(logoHeight, 30.25), undefined, 'FAST');
  }

  // Company details - inline with logo, right of it
  // Decreased line spacing by 30% (original gap ~6, now ~4.2)
  const textX = startX + logoWidth + 5;
  const lineSpacing = 4.2; // Reduced from 6
  doc.setTextColor(54, 54, 54);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Gaonhae Taekwondo LLP | T18LL1687K', textX, 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('271 Bukit Timah Road #02-08 Singapore 259708', textX, 22 + lineSpacing);
  doc.text('gaonhaetaekwondo.com | gaonhaetaekwondo@gmail.com', textX, 22 + lineSpacing * 2);

  // Reset text color
  doc.setTextColor(0, 0, 0);
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return 'N/A';
  try {
    return format(new Date(dateStr), 'd MMMM yyyy');
  } catch {
    return dateStr;
  }
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 2,
  }).format(amount);
};

// Parse and render formatted text with basic styling
interface TextSegment {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

type TextAlignment = 'left' | 'center' | 'right';

interface ParsedLine {
  segments: TextSegment[];
  alignment: TextAlignment;
}

// Parse a single line for formatting markers
const parseLineFormatting = (line: string): ParsedLine => {
  let alignment: TextAlignment = 'left';
  let processedLine = line;
  
  // Check for alignment markers at start of line
  if (line.startsWith('<<')) {
    alignment = 'left';
    processedLine = line.substring(2);
  } else if (line.startsWith('><')) {
    alignment = 'center';
    processedLine = line.substring(2);
  } else if (line.startsWith('>>')) {
    alignment = 'right';
    processedLine = line.substring(2);
  }
  
  const segments: TextSegment[] = [];
  // Updated regex: **bold**, ~~underline~~, _italic_
  const regex = /(\*\*(.+?)\*\*|~~(.+?)~~|_([^_]+?)_)/g;
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(processedLine)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      segments.push({
        text: processedLine.substring(lastIndex, match.index),
        bold: false,
        italic: false,
        underline: false,
      });
    }
    
    // Determine the type of formatting
    if (match[0].startsWith('**')) {
      segments.push({
        text: match[2],
        bold: true,
        italic: false,
        underline: false,
      });
    } else if (match[0].startsWith('~~')) {
      segments.push({
        text: match[3],
        bold: false,
        italic: false,
        underline: true,
      });
    } else if (match[0].startsWith('_')) {
      segments.push({
        text: match[4],
        bold: false,
        italic: true,
        underline: false,
      });
    }
    
    lastIndex = regex.lastIndex;
  }
  
  // Add remaining text
  if (lastIndex < processedLine.length) {
    segments.push({
      text: processedLine.substring(lastIndex),
      bold: false,
      italic: false,
      underline: false,
    });
  }
  
  if (segments.length === 0) {
    segments.push({ text: processedLine, bold: false, italic: false, underline: false });
  }
  
  return { segments, alignment };
};

// Render formatted line with proper styling
const renderFormattedLine = (
  doc: jsPDF,
  parsedLine: ParsedLine,
  x: number,
  y: number,
  contentWidth: number,
  pageWidth: number,
  marginLeft: number
): void => {
  const { segments, alignment } = parsedLine;
  
  // Calculate total line width for alignment
  let totalWidth = 0;
  segments.forEach(seg => {
    doc.setFont('helvetica', seg.bold ? 'bold' : (seg.italic ? 'italic' : 'normal'));
    totalWidth += doc.getTextWidth(seg.text);
  });
  
  // Determine starting X based on alignment
  let currentX = x;
  if (alignment === 'center') {
    currentX = (pageWidth - totalWidth) / 2;
  } else if (alignment === 'right') {
    currentX = pageWidth - marginLeft - totalWidth;
  }
  
  // Render each segment
  segments.forEach(seg => {
    doc.setFont('helvetica', seg.bold ? 'bold' : (seg.italic ? 'italic' : 'normal'));
    doc.text(seg.text, currentX, y);
    
    // Draw underline if needed
    if (seg.underline) {
      const textWidth = doc.getTextWidth(seg.text);
      doc.setLineWidth(0.3);
      doc.line(currentX, y + 0.5, currentX + textWidth, y + 0.5);
    }
    
    currentX += doc.getTextWidth(seg.text);
  });
  
  // Reset font
  doc.setFont('helvetica', 'normal');
};

// Clean text of all formatting markers for width calculation
const cleanFormattingMarkers = (text: string): string => {
  return text
    .replace(/^(<<|>>|><)/gm, '') // Alignment markers
    .replace(/\*\*(.+?)\*\*/g, '$1') // Bold
    .replace(/~~(.+?)~~/g, '$1') // Underline
    .replace(/_([^_]+?)_/g, '$1'); // Italic
};

// Word wrap text while preserving formatting segments
const wrapFormattedText = (
  doc: jsPDF,
  segments: TextSegment[],
  contentWidth: number
): TextSegment[][] => {
  const lines: TextSegment[][] = [];
  let currentLine: TextSegment[] = [];
  let currentLineWidth = 0;
  const spaceWidth = doc.getTextWidth(' ');

  for (const segment of segments) {
    // Split segment text into words
    const words = segment.text.split(/(\s+)/); // Keep spaces as separate elements
    
    for (const word of words) {
      if (!word) continue;
      
      // Set font for accurate width calculation
      doc.setFont('helvetica', segment.bold ? 'bold' : (segment.italic ? 'italic' : 'normal'));
      const wordWidth = doc.getTextWidth(word);
      
      // Check if word fits on current line
      if (currentLineWidth + wordWidth > contentWidth && currentLine.length > 0) {
        // Push current line and start new one
        lines.push(currentLine);
        currentLine = [];
        currentLineWidth = 0;
      }
      
      // Add word to current segment in line
      const lastSeg = currentLine[currentLine.length - 1];
      if (lastSeg && lastSeg.bold === segment.bold && lastSeg.italic === segment.italic && lastSeg.underline === segment.underline) {
        // Same formatting, append to existing segment
        lastSeg.text += word;
      } else {
        // Different formatting, create new segment
        currentLine.push({
          text: word,
          bold: segment.bold,
          italic: segment.italic,
          underline: segment.underline,
        });
      }
      currentLineWidth += wordWidth;
    }
  }
  
  // Don't forget the last line
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }
  
  return lines;
};

// Render a single wrapped line of segments
const renderWrappedLine = (
  doc: jsPDF,
  segments: TextSegment[],
  x: number,
  y: number,
  alignment: TextAlignment,
  contentWidth: number,
  pageWidth: number,
  marginLeft: number
): void => {
  // Calculate total line width for alignment
  let totalWidth = 0;
  segments.forEach(seg => {
    doc.setFont('helvetica', seg.bold ? 'bold' : (seg.italic ? 'italic' : 'normal'));
    totalWidth += doc.getTextWidth(seg.text);
  });
  
  // Determine starting X based on alignment
  let currentX = x;
  if (alignment === 'center') {
    currentX = (pageWidth - totalWidth) / 2;
  } else if (alignment === 'right') {
    currentX = pageWidth - marginLeft - totalWidth;
  }
  
  // Render each segment
  segments.forEach(seg => {
    doc.setFont('helvetica', seg.bold ? 'bold' : (seg.italic ? 'italic' : 'normal'));
    doc.text(seg.text, currentX, y);
    
    // Draw underline if needed
    if (seg.underline) {
      const textWidth = doc.getTextWidth(seg.text);
      doc.setLineWidth(0.3);
      doc.line(currentX, y + 0.5, currentX + textWidth, y + 0.5);
    }
    
    currentX += doc.getTextWidth(seg.text);
  });
  
  // Reset font
  doc.setFont('helvetica', 'normal');
};

// Render a paragraph with formatting support - improved word wrapping with proper page break handling
const renderFormattedParagraph = (
  doc: jsPDF,
  text: string,
  marginLeft: number,
  startYPos: number,
  contentWidth: number,
  pageWidth: number,
  lineHeight: number,
  pageHeight: number,
  marginBottom: number,
  marginTop: number = 20
): number => {
  let yPos = startYPos;
  
  // Internal page break check that properly updates yPos
  const checkAndHandlePageBreak = (requiredHeight: number): void => {
    if (yPos + requiredHeight > pageHeight - marginBottom) {
      doc.addPage();
      yPos = marginTop;
    }
  };
  
  // Split by explicit newlines first
  const paragraphs = text.split('\n');
  
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      checkAndHandlePageBreak(lineHeight);
      yPos += lineHeight;
      continue;
    }
    
    // Parse the line for formatting and alignment
    const parsedLine = parseLineFormatting(paragraph);
    
    // Wrap text while preserving formatting
    const wrappedLines = wrapFormattedText(doc, parsedLine.segments, contentWidth);
    
    for (const lineSegments of wrappedLines) {
      // Check if we need a new page BEFORE rendering this line
      checkAndHandlePageBreak(lineHeight);
      renderWrappedLine(doc, lineSegments, marginLeft, yPos, parsedLine.alignment, contentWidth, pageWidth, marginLeft);
      yPos += lineHeight;
    }
  }
  
  return yPos;
};

// Calculate content height for dynamic spacing
const calculateContentHeight = (
  doc: jsPDF,
  sections: { content: string; lineHeight?: number }[]
): number => {
  let height = 0;
  sections.forEach(section => {
    if (section.content) {
      const lines = doc.splitTextToSize(section.content, 170);
      height += lines.length * (section.lineHeight || 6) + 8;
    }
  });
  return height;
};

const addSignatureBlock = async (
  doc: jsPDF,
  yPos: number,
  signatoryName?: string,
  signatoryPosition?: string,
  signatureImageUrl?: string,
  companyName?: string
): Promise<number> => {
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Yours faithfully,', 20, yPos);
  yPos += 10;

  // Add signature image if provided
  if (signatureImageUrl) {
    const signatureImg = await loadSignatureImage(signatureImageUrl);
    if (signatureImg) {
      const sigWidth = 40;
      const sigHeight = (signatureImg.height / signatureImg.width) * sigWidth;
      doc.addImage(signatureImg.data, 'JPEG', 20, yPos, sigWidth, Math.min(sigHeight, 20), undefined, 'FAST');
      yPos += Math.min(sigHeight, 20) + 5;
    }
  } else {
    yPos += 10;
  }

  // Signatory name
  doc.setFont('helvetica', 'bold');
  doc.text(signatoryName || 'Gaonhae Taekwondo LLP', 20, yPos);
  
  // Signatory position
  if (signatoryPosition) {
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(signatoryPosition, 20, yPos);
  }

  // Company name
  if (companyName) {
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(companyName, 20, yPos);
  }

  return yPos;
};

// Add addressee block (name, address, contact)
const addAddresseeBlock = (
  doc: jsPDF,
  yPos: number,
  addresseeName?: string,
  address?: string,
  contactNumber?: string
): number => {
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  // Addressee name
  if (addresseeName && addresseeName.trim()) {
    doc.text(addresseeName, 20, yPos);
    yPos += 6;
  }

  // Address (multiline support)
  if (address && address.trim()) {
    const addressLines = doc.splitTextToSize(address, 170);
    doc.text(addressLines, 20, yPos);
    yPos += addressLines.length * 5 + 2;
  }

  // Contact number
  if (contactNumber && contactNumber.trim()) {
    doc.text(`Tel: ${contactNumber}`, 20, yPos);
    yPos += 6;
  }

  return yPos;
};

export const generateStudentVerificationLetter = async (data: StudentData): Promise<void> => {
  const doc = new jsPDF('p', 'mm', 'a4');
  doc.setFont('helvetica');

  const logoImg = await loadLogo();
  await addLetterhead(doc, logoImg);

  const templates = getLetterTemplates();
  const fullName = `${data.firstName} ${data.lastName}`.trim();
  const currentDate = format(new Date(), 'dd MMMM yyyy');
  
  const studentPlaceholders: StudentPlaceholders = {
    fullName,
    firstName: data.firstName,
    lastName: data.lastName,
    dateOfBirth: formatDate(data.dateOfBirth),
    nricPassport: data.nricPassport || 'N/A',
    currentBelt: data.currentBelt || 'N/A',
    enrollmentDate: formatDate(data.enrollmentDate),
  };

  let yPos = 55;
  const pageWidth = doc.internal.pageSize.getWidth();

  // Date
  doc.setFontSize(11);
  doc.text(currentDate, 20, yPos);
  yPos += 20;

  // To Whom It May Concern
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('To Whom It May Concern', 20, yPos);
  yPos += 15;

  // Title - centered
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('STUDENT VERIFICATION LETTER', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Body paragraph - using template
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const bodyText = replaceStudentPlaceholders(templates.studentBody, studentPlaceholders);
  const bodyLines = doc.splitTextToSize(bodyText, 170);
  doc.text(bodyLines, 20, yPos);
  yPos += bodyLines.length * 6 + 10;

  // Student Details section
  doc.setFont('helvetica', 'bold');
  doc.text('Student Details:', 20, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  const details = [
    { label: 'Full Name', value: fullName },
    { label: 'Date of Birth', value: formatDate(data.dateOfBirth) },
    { label: 'NRIC/Passport', value: data.nricPassport || 'N/A' },
    { label: 'Current Belt', value: data.currentBelt || 'N/A' },
    { label: 'Member Since', value: formatDate(data.enrollmentDate) },
  ];

  details.forEach((detail) => {
    doc.text(`• ${detail.label}: ${detail.value}`, 25, yPos);
    yPos += 7;
  });

  yPos += 10;

  // Closing statement - using template
  const closingText = replaceStudentPlaceholders(templates.studentClosing, studentPlaceholders);
  doc.text(closingText, 20, yPos);
  yPos += 20;

  // Sign off
  doc.text('Yours faithfully,', 20, yPos);
  yPos += 15;
  doc.setFont('helvetica', 'bold');
  doc.text('Gaonhae Taekwondo LLP', 20, yPos);

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(DEFAULT_FOOTER_TEXT, 105, 280, { align: 'center' });

  // Save PDF
  const fileName = `Student_Verification_${fullName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  doc.save(fileName);
};

export const generateEmploymentVerificationLetter = async (data: EmployeeData): Promise<void> => {
  const doc = new jsPDF('p', 'mm', 'a4');
  doc.setFont('helvetica');

  const logoImg = await loadLogo();
  await addLetterhead(doc, logoImg);

  const templates = getLetterTemplates();
  const currentDate = format(new Date(), 'dd MMMM yyyy');
  
  const employeePlaceholders: EmployeePlaceholders = {
    fullName: data.name,
    dateOfBirth: formatDate(data.dateOfBirth),
    nric: data.nric || 'N/A',
    position: data.position || 'N/A',
    salary: formatCurrency(data.baseSalary || 0),
    joinDate: formatDate(data.joinDate),
    address: data.address || '',
    phone: data.phone || '',
  };

  let yPos = 55;
  const pageWidth = doc.internal.pageSize.getWidth();

  // Date
  doc.setFontSize(11);
  doc.text(currentDate, 20, yPos);
  yPos += 20;

  // To Whom It May Concern
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('To Whom It May Concern', 20, yPos);
  yPos += 15;

  // Title - centered
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPLOYMENT VERIFICATION LETTER', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Body paragraph - using template
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const bodyText = replaceEmployeePlaceholders(templates.employeeBody, employeePlaceholders);
  const bodyLines = doc.splitTextToSize(bodyText, 170);
  doc.text(bodyLines, 20, yPos);
  yPos += bodyLines.length * 6 + 5;


  // Closing statement - using template
  const closingText = replaceEmployeePlaceholders(templates.employeeClosing, employeePlaceholders);
  doc.text(closingText, 20, yPos);
  yPos += 20;

  // Sign off
  doc.text('Yours faithfully,', 20, yPos);
  yPos += 15;
  doc.setFont('helvetica', 'bold');
  doc.text('Gaonhae Taekwondo LLP', 20, yPos);

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(DEFAULT_FOOTER_TEXT, 105, 280, { align: 'center' });

  // Save PDF
  const fileName = `Employment_Verification_${data.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  doc.save(fileName);
};

export const printStudentVerificationLetter = async (data: StudentData): Promise<void> => {
  const doc = new jsPDF('p', 'mm', 'a4');
  doc.setFont('helvetica');

  const logoImg = await loadLogo();
  await addLetterhead(doc, logoImg);

  const templates = getLetterTemplates();
  const fullName = `${data.firstName} ${data.lastName}`.trim();
  const currentDate = format(new Date(), 'dd MMMM yyyy');
  
  const studentPlaceholders: StudentPlaceholders = {
    fullName,
    firstName: data.firstName,
    lastName: data.lastName,
    dateOfBirth: formatDate(data.dateOfBirth),
    nricPassport: data.nricPassport || 'N/A',
    currentBelt: data.currentBelt || 'N/A',
    enrollmentDate: formatDate(data.enrollmentDate),
  };

  let yPos = 55;
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(11);
  doc.text(currentDate, 20, yPos);
  yPos += 20;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('To Whom It May Concern', 20, yPos);
  yPos += 15;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('STUDENT VERIFICATION LETTER', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const bodyText = replaceStudentPlaceholders(templates.studentBody, studentPlaceholders);
  const bodyLines = doc.splitTextToSize(bodyText, 170);
  doc.text(bodyLines, 20, yPos);
  yPos += bodyLines.length * 6 + 10;

  doc.setFont('helvetica', 'bold');
  doc.text('Student Details:', 20, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  const details = [
    { label: 'Full Name', value: fullName },
    { label: 'Date of Birth', value: formatDate(data.dateOfBirth) },
    { label: 'NRIC/Passport', value: data.nricPassport || 'N/A' },
    { label: 'Current Belt', value: data.currentBelt || 'N/A' },
    { label: 'Member Since', value: formatDate(data.enrollmentDate) },
  ];

  details.forEach((detail) => {
    doc.text(`• ${detail.label}: ${detail.value}`, 25, yPos);
    yPos += 7;
  });

  yPos += 10;

  const closingText = replaceStudentPlaceholders(templates.studentClosing, studentPlaceholders);
  doc.text(closingText, 20, yPos);
  yPos += 20;

  doc.text('Yours faithfully,', 20, yPos);
  yPos += 15;
  doc.setFont('helvetica', 'bold');
  doc.text('Gaonhae Taekwondo LLP', 20, yPos);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(DEFAULT_FOOTER_TEXT, 105, 280, { align: 'center' });

  // Open print dialog
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
};

export const printEmploymentVerificationLetter = async (data: EmployeeData): Promise<void> => {
  const doc = new jsPDF('p', 'mm', 'a4');
  doc.setFont('helvetica');

  const logoImg = await loadLogo();
  await addLetterhead(doc, logoImg);

  const templates = getLetterTemplates();
  const currentDate = format(new Date(), 'dd MMMM yyyy');
  
  const employeePlaceholders: EmployeePlaceholders = {
    fullName: data.name,
    dateOfBirth: formatDate(data.dateOfBirth),
    nric: data.nric || 'N/A',
    position: data.position || 'N/A',
    salary: formatCurrency(data.baseSalary || 0),
    joinDate: formatDate(data.joinDate),
    address: data.address || '',
    phone: data.phone || '',
  };

  let yPos = 55;
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(11);
  doc.text(currentDate, 20, yPos);
  yPos += 20;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('To Whom It May Concern', 20, yPos);
  yPos += 15;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPLOYMENT VERIFICATION LETTER', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const bodyText = replaceEmployeePlaceholders(templates.employeeBody, employeePlaceholders);
  const bodyLines = doc.splitTextToSize(bodyText, 170);
  doc.text(bodyLines, 20, yPos);
  yPos += bodyLines.length * 6 + 5;


  const closingText = replaceEmployeePlaceholders(templates.employeeClosing, employeePlaceholders);
  doc.text(closingText, 20, yPos);
  yPos += 20;

  doc.text('Yours faithfully,', 20, yPos);
  yPos += 15;
  doc.setFont('helvetica', 'bold');
  doc.text('Gaonhae Taekwondo LLP', 20, yPos);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(DEFAULT_FOOTER_TEXT, 105, 280, { align: 'center' });

  // Open print dialog
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
};

// Template-based generation functions
export const generateStudentVerificationLetterWithTemplate = async (
  data: StudentData,
  template: LetterTemplateData
): Promise<void> => {
  const doc = new jsPDF('p', 'mm', 'a4');
  doc.setFont('helvetica');

  const logoImg = await loadLogo();
  await addLetterhead(doc, logoImg);

  const fullName = `${data.firstName} ${data.lastName}`.trim();
  const currentDate = format(new Date(), 'dd MMMM yyyy');
  
  const studentPlaceholders: StudentPlaceholders = {
    fullName,
    firstName: data.firstName,
    lastName: data.lastName,
    dateOfBirth: formatDate(data.dateOfBirth),
    nricPassport: data.nricPassport || 'N/A',
    currentBelt: data.currentBelt || 'N/A',
    enrollmentDate: formatDate(data.enrollmentDate),
  };

  let yPos = 55;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginBottom = 25;
  const marginLeft = 20;
  const contentWidth = 170;

  // Helper to check and add new page if needed
  const checkPageBreak = (requiredHeight: number): void => {
    if (yPos + requiredHeight > pageHeight - marginBottom) {
      doc.addPage();
      yPos = 20;
    }
  };

  // Date
  doc.setFontSize(11);
  doc.text(currentDate, marginLeft, yPos);
  yPos += 10;

  // Addressee block
  const addresseeName = template.addressee_name ? replaceStudentPlaceholders(template.addressee_name, studentPlaceholders) : '';
  yPos = addAddresseeBlock(doc, yPos, addresseeName);
  yPos += 5;

  // Salutation - replace placeholders and use default if empty
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  let salutationText = template.salutation || 'To Whom It May Concern';
  salutationText = replaceStudentPlaceholders(salutationText, studentPlaceholders);
  doc.text(salutationText, marginLeft, yPos);
  yPos += 15;

  // Title - centered
  checkPageBreak(15);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(template.title, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Body paragraph 1 - with formatting and alignment support
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const bodyText = replaceStudentPlaceholders(template.body_text, studentPlaceholders);
  yPos = renderFormattedParagraph(doc, bodyText, marginLeft, yPos, contentWidth, pageWidth, 6, pageHeight, marginBottom);
  yPos += 5;

  // Signature block - after body paragraph 1
  checkPageBreak(50);
  yPos = await addSignatureBlock(
    doc,
    yPos,
    template.signatory_name,
    template.signatory_position,
    template.signature_image_url,
    template.company_name
  );

  // Horizontal line before body paragraph 2 (if enabled)
  if (template.show_horizontal_line && template.body_text_2) {
    yPos += 5;
    checkPageBreak(10);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, yPos, pageWidth - marginLeft, yPos);
    yPos += 10;
  }

  // Body paragraph 2 (if provided) - with formatting and alignment support
  if (template.body_text_2) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const bodyText2 = replaceStudentPlaceholders(template.body_text_2, studentPlaceholders);
    yPos = renderFormattedParagraph(doc, bodyText2, marginLeft, yPos, contentWidth, pageWidth, 6, pageHeight, marginBottom);
    yPos += 5;
  }

  // Footer - only show if provided (optional)
  if (template.footer_text && template.footer_text.trim()) {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(template.footer_text, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }
  }

  const fileName = `${template.name.replace(/\s+/g, '_')}_${fullName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  doc.save(fileName);
};

export const printStudentVerificationLetterWithTemplate = async (
  data: StudentData,
  template: LetterTemplateData
): Promise<void> => {
  const doc = new jsPDF('p', 'mm', 'a4');
  doc.setFont('helvetica');

  const logoImg = await loadLogo();
  await addLetterhead(doc, logoImg);

  const fullName = `${data.firstName} ${data.lastName}`.trim();
  const currentDate = format(new Date(), 'dd MMMM yyyy');
  
  const studentPlaceholders: StudentPlaceholders = {
    fullName,
    firstName: data.firstName,
    lastName: data.lastName,
    dateOfBirth: formatDate(data.dateOfBirth),
    nricPassport: data.nricPassport || 'N/A',
    currentBelt: data.currentBelt || 'N/A',
    enrollmentDate: formatDate(data.enrollmentDate),
  };

  let yPos = 55;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginBottom = 25;
  const marginLeft = 20;
  const contentWidth = 170;

  // Helper to check and add new page if needed
  const checkPageBreak = (requiredHeight: number): void => {
    if (yPos + requiredHeight > pageHeight - marginBottom) {
      doc.addPage();
      yPos = 20;
    }
  };

  // Date
  doc.setFontSize(11);
  doc.text(currentDate, marginLeft, yPos);
  yPos += 10;

  // Addressee block
  const addresseeName = template.addressee_name ? replaceStudentPlaceholders(template.addressee_name, studentPlaceholders) : '';
  yPos = addAddresseeBlock(doc, yPos, addresseeName);
  yPos += 5;

  // Salutation - replace placeholders and use default if empty
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  let salutationText = template.salutation || 'To Whom It May Concern';
  salutationText = replaceStudentPlaceholders(salutationText, studentPlaceholders);
  doc.text(salutationText, marginLeft, yPos);
  yPos += 15;

  // Title - centered
  checkPageBreak(15);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(template.title, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Body paragraph 1 - with formatting and alignment support
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const bodyText = replaceStudentPlaceholders(template.body_text, studentPlaceholders);
  yPos = renderFormattedParagraph(doc, bodyText, marginLeft, yPos, contentWidth, pageWidth, 6, pageHeight, marginBottom);
  yPos += 5;

  // Signature block - after body paragraph 1
  checkPageBreak(50);
  yPos = await addSignatureBlock(
    doc,
    yPos,
    template.signatory_name,
    template.signatory_position,
    template.signature_image_url,
    template.company_name
  );

  // Horizontal line before body paragraph 2 (if enabled)
  if (template.show_horizontal_line && template.body_text_2) {
    yPos += 5;
    checkPageBreak(10);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, yPos, pageWidth - marginLeft, yPos);
    yPos += 10;
  }

  // Body paragraph 2 (if provided) - with formatting and alignment support
  if (template.body_text_2) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const bodyText2 = replaceStudentPlaceholders(template.body_text_2, studentPlaceholders);
    yPos = renderFormattedParagraph(doc, bodyText2, marginLeft, yPos, contentWidth, pageWidth, 6, pageHeight, marginBottom);
    yPos += 5;
  }

  // Footer - only show if provided (optional)
  if (template.footer_text && template.footer_text.trim()) {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(template.footer_text, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }
  }

  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
};

export const generateEmployeeVerificationLetterWithTemplate = async (
  data: EmployeeData,
  template: LetterTemplateData
): Promise<void> => {
  const doc = new jsPDF('p', 'mm', 'a4');
  doc.setFont('helvetica');

  const logoImg = await loadLogo();
  await addLetterhead(doc, logoImg);

  const currentDate = format(new Date(), 'dd MMMM yyyy');
  
  const employeePlaceholders: EmployeePlaceholders = {
    fullName: data.name,
    dateOfBirth: formatDate(data.dateOfBirth),
    nric: data.nric || 'N/A',
    position: data.position || 'N/A',
    salary: formatCurrency(data.baseSalary || 0),
    joinDate: formatDate(data.joinDate),
    address: data.address || '',
    phone: data.phone || '',
  };

  let yPos = 55;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginBottom = 25; // Space for footer
  const marginLeft = 20;
  const contentWidth = 170;

  // Helper to check and add new page if needed
  const checkPageBreak = (requiredHeight: number): void => {
    if (yPos + requiredHeight > pageHeight - marginBottom) {
      doc.addPage();
      yPos = 20;
    }
  };

  // Date
  doc.setFontSize(11);
  doc.text(currentDate, marginLeft, yPos);
  yPos += 10;

  // Addressee block - replace placeholders in template fields
  const addresseeName = template.addressee_name ? replaceEmployeePlaceholders(template.addressee_name, employeePlaceholders) : '';
  const addressText = template.address ? replaceEmployeePlaceholders(template.address, employeePlaceholders) : '';
  const contactText = template.contact_number ? replaceEmployeePlaceholders(template.contact_number, employeePlaceholders) : '';
  
  yPos = addAddresseeBlock(doc, yPos, addresseeName, addressText, contactText);
  yPos += 5;

  // Salutation - replace placeholders and use default if empty
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  let salutationText = template.salutation || 'To Whom It May Concern';
  salutationText = replaceEmployeePlaceholders(salutationText, employeePlaceholders);
  doc.text(salutationText, marginLeft, yPos);
  yPos += 15;

  // Title - centered
  checkPageBreak(15);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(template.title, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Body paragraph 1 - with formatting and alignment support
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const bodyText = replaceEmployeePlaceholders(template.body_text, employeePlaceholders);
  yPos = renderFormattedParagraph(doc, bodyText, marginLeft, yPos, contentWidth, pageWidth, 6, pageHeight, marginBottom);
  yPos += 5;

  // Signature block - after body paragraph 1
  checkPageBreak(50);
  yPos = await addSignatureBlock(
    doc,
    yPos,
    template.signatory_name,
    template.signatory_position,
    template.signature_image_url,
    template.company_name
  );

  // Horizontal line before body paragraph 2 (if enabled)
  if (template.show_horizontal_line && template.body_text_2) {
    yPos += 5;
    checkPageBreak(10);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, yPos, pageWidth - marginLeft, yPos);
    yPos += 10;
  }

  // Body paragraph 2 (if provided) - with formatting and alignment support
  if (template.body_text_2) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const bodyText2 = replaceEmployeePlaceholders(template.body_text_2, employeePlaceholders);
    yPos = renderFormattedParagraph(doc, bodyText2, marginLeft, yPos, contentWidth, pageWidth, 6, pageHeight, marginBottom);
    yPos += 5;
  }

  // Footer - only show if provided (optional)
  if (template.footer_text && template.footer_text.trim()) {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(template.footer_text, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }
  }

  const fileName = `${template.name.replace(/\s+/g, '_')}_${data.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  doc.save(fileName);
};

export const printEmployeeVerificationLetterWithTemplate = async (
  data: EmployeeData,
  template: LetterTemplateData
): Promise<void> => {
  const doc = new jsPDF('p', 'mm', 'a4');
  doc.setFont('helvetica');

  const logoImg = await loadLogo();
  await addLetterhead(doc, logoImg);

  const currentDate = format(new Date(), 'dd MMMM yyyy');
  
  const employeePlaceholders: EmployeePlaceholders = {
    fullName: data.name,
    dateOfBirth: formatDate(data.dateOfBirth),
    nric: data.nric || 'N/A',
    position: data.position || 'N/A',
    salary: formatCurrency(data.baseSalary || 0),
    joinDate: formatDate(data.joinDate),
    address: data.address || '',
    phone: data.phone || '',
  };

  let yPos = 55;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginBottom = 25;
  const marginLeft = 20;
  const contentWidth = 170;

  // Helper to check and add new page if needed
  const checkPageBreak = (requiredHeight: number): void => {
    if (yPos + requiredHeight > pageHeight - marginBottom) {
      doc.addPage();
      yPos = 20;
    }
  };

  // Date
  doc.setFontSize(11);
  doc.text(currentDate, marginLeft, yPos);
  yPos += 10;

  // Addressee block - replace placeholders in template fields
  const addresseeName = template.addressee_name ? replaceEmployeePlaceholders(template.addressee_name, employeePlaceholders) : '';
  const addressText = template.address ? replaceEmployeePlaceholders(template.address, employeePlaceholders) : '';
  const contactText = template.contact_number ? replaceEmployeePlaceholders(template.contact_number, employeePlaceholders) : '';
  
  yPos = addAddresseeBlock(doc, yPos, addresseeName, addressText, contactText);
  yPos += 5;

  // Salutation - replace placeholders and use default if empty
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  let salutationText = template.salutation || 'To Whom It May Concern';
  salutationText = replaceEmployeePlaceholders(salutationText, employeePlaceholders);
  doc.text(salutationText, marginLeft, yPos);
  yPos += 15;

  // Title - centered
  checkPageBreak(15);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(template.title, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Body paragraph 1 - with formatting and alignment support
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const bodyText = replaceEmployeePlaceholders(template.body_text, employeePlaceholders);
  yPos = renderFormattedParagraph(doc, bodyText, marginLeft, yPos, contentWidth, pageWidth, 6, pageHeight, marginBottom);
  yPos += 5;

  // Signature block - after body paragraph 1
  checkPageBreak(50);
  yPos = await addSignatureBlock(
    doc,
    yPos,
    template.signatory_name,
    template.signatory_position,
    template.signature_image_url,
    template.company_name
  );

  // Horizontal line before body paragraph 2 (if enabled)
  if (template.show_horizontal_line && template.body_text_2) {
    yPos += 5;
    checkPageBreak(10);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, yPos, pageWidth - marginLeft, yPos);
    yPos += 10;
  }

  // Body paragraph 2 (if provided) - with formatting and alignment support
  if (template.body_text_2) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const bodyText2 = replaceEmployeePlaceholders(template.body_text_2, employeePlaceholders);
    yPos = renderFormattedParagraph(doc, bodyText2, marginLeft, yPos, contentWidth, pageWidth, 6, pageHeight, marginBottom);
    yPos += 5;
  }

  // Footer - only show if provided (optional)
  if (template.footer_text && template.footer_text.trim()) {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(template.footer_text, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }
  }

  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
};
