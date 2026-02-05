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

const loadLogo = async (): Promise<HTMLImageElement | null> => {
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      logoImg.onload = () => resolve();
      logoImg.onerror = () => reject(new Error('Failed to load logo'));
      logoImg.src = '/images/company-logo.jpg';
    });
    return logoImg;
  } catch (error) {
    console.warn('Could not load logo for PDF:', error);
    return null;
  }
};

const loadSignatureImage = async (url: string): Promise<HTMLImageElement | null> => {
  if (!url) return null;
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load signature'));
      img.src = url;
    });
    return img;
  } catch (error) {
    console.warn('Could not load signature for PDF:', error);
    return null;
  }
};

const addLetterhead = async (doc: jsPDF, logoImg: HTMLImageElement | null) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoWidth = 38.5;
  const totalWidth = logoWidth + 5 + 120; // logo + gap + text area
  const startX = (pageWidth - totalWidth) / 2;

  // Add logo - centered with text
  if (logoImg) {
    const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
    doc.addImage(logoImg, 'JPEG', startX, 15, logoWidth, Math.min(logoHeight, 27.5));
  }

  // Company details - inline with logo, right of it
  const textX = startX + logoWidth + 5;
  doc.setTextColor(54, 54, 54);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Gaonhae Taekwondo LLP | T18LL1687K', textX, 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('271 Bukit Timah Road #02-08 Singapore 259708', textX, 28);
  doc.text('gaonhaetaekwondo.com | gaonhaetaekwondo@gmail.com', textX, 34);

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

const parseFormattedText = (text: string): TextSegment[] => {
  const segments: TextSegment[] = [];
  let remaining = text;
  
  // Simple regex-based parsing for **bold**, _italic_, and __underline__
  const regex = /(\*\*(.+?)\*\*|__(.+?)__|_(.+?)_)/g;
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      segments.push({
        text: text.substring(lastIndex, match.index),
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
    } else if (match[0].startsWith('__')) {
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
  if (lastIndex < text.length) {
    segments.push({
      text: text.substring(lastIndex),
      bold: false,
      italic: false,
      underline: false,
    });
  }
  
  return segments.length > 0 ? segments : [{ text, bold: false, italic: false, underline: false }];
};

const renderFormattedText = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number
): number => {
  // For simplicity, render as plain text with basic formatting stripped
  // jsPDF doesn't support inline formatting well, so we render without markers
  const cleanText = text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1');
  
  const lines = doc.splitTextToSize(cleanText, maxWidth);
  doc.text(lines, x, y);
  return lines.length * 6;
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
      doc.addImage(signatureImg, 'PNG', 20, yPos, sigWidth, Math.min(sigHeight, 20));
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

  // Date
  doc.setFontSize(11);
  doc.text(currentDate, 20, yPos);
  yPos += 10;

  // Addressee block
  const addresseeName = template.addressee_name ? replaceStudentPlaceholders(template.addressee_name, studentPlaceholders) : '';
  yPos = addAddresseeBlock(doc, yPos, addresseeName);
  yPos += 5;

  // Salutation
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(template.salutation || 'To Whom It May Concern', 20, yPos);
  yPos += 15;

  // Title - centered
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(template.title, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Body paragraph 1
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const bodyText = replaceStudentPlaceholders(template.body_text, studentPlaceholders);
  yPos += renderFormattedText(doc, bodyText, 20, yPos, 170);
  yPos += 5;

  // Body paragraph 2 (if provided)
  if (template.body_text_2) {
    const bodyText2 = replaceStudentPlaceholders(template.body_text_2, studentPlaceholders);
    yPos += renderFormattedText(doc, bodyText2, 20, yPos, 170);
    yPos += 5;
  }

  yPos += 10;

  // Signature block
  yPos = await addSignatureBlock(
    doc,
    yPos,
    template.signatory_name,
    template.signatory_position,
    template.signature_image_url,
    template.company_name
  );

  // Footer - use template footer or default
  const footerText = template.footer_text || DEFAULT_FOOTER_TEXT;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(footerText, 105, 280, { align: 'center' });

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

  // Date
  doc.setFontSize(11);
  doc.text(currentDate, 20, yPos);
  yPos += 10;

  // Addressee block
  const addresseeName = template.addressee_name ? replaceStudentPlaceholders(template.addressee_name, studentPlaceholders) : '';
  yPos = addAddresseeBlock(doc, yPos, addresseeName);
  yPos += 5;

  // Salutation
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(template.salutation || 'To Whom It May Concern', 20, yPos);
  yPos += 15;

  // Title - centered
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(template.title, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Body paragraph 1
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const bodyText = replaceStudentPlaceholders(template.body_text, studentPlaceholders);
  yPos += renderFormattedText(doc, bodyText, 20, yPos, 170);
  yPos += 5;

  // Body paragraph 2 (if provided)
  if (template.body_text_2) {
    const bodyText2 = replaceStudentPlaceholders(template.body_text_2, studentPlaceholders);
    yPos += renderFormattedText(doc, bodyText2, 20, yPos, 170);
    yPos += 5;
  }

  yPos += 10;

  // Signature block
  yPos = await addSignatureBlock(
    doc,
    yPos,
    template.signatory_name,
    template.signatory_position,
    template.signature_image_url,
    template.company_name
  );

  // Footer
  const footerText = template.footer_text || DEFAULT_FOOTER_TEXT;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(footerText, 105, 280, { align: 'center' });

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

  // Date
  doc.setFontSize(11);
  doc.text(currentDate, 20, yPos);
  yPos += 10;

  // Addressee block - replace placeholders in template fields
  const addresseeName = template.addressee_name ? replaceEmployeePlaceholders(template.addressee_name, employeePlaceholders) : '';
  const addressText = template.address ? replaceEmployeePlaceholders(template.address, employeePlaceholders) : '';
  const contactText = template.contact_number ? replaceEmployeePlaceholders(template.contact_number, employeePlaceholders) : '';
  
  yPos = addAddresseeBlock(doc, yPos, addresseeName, addressText, contactText);
  yPos += 5;

  // Salutation
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(template.salutation || 'To Whom It May Concern', 20, yPos);
  yPos += 15;

  // Title - centered
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(template.title, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Body paragraph 1
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const bodyText = replaceEmployeePlaceholders(template.body_text, employeePlaceholders);
  yPos += renderFormattedText(doc, bodyText, 20, yPos, 170);
  yPos += 5;

  // Body paragraph 2 (if provided)
  if (template.body_text_2) {
    const bodyText2 = replaceEmployeePlaceholders(template.body_text_2, employeePlaceholders);
    yPos += renderFormattedText(doc, bodyText2, 20, yPos, 170);
    yPos += 5;
  }

  yPos += 10;

  // Signature block
  yPos = await addSignatureBlock(
    doc,
    yPos,
    template.signatory_name,
    template.signatory_position,
    template.signature_image_url,
    template.company_name
  );

  // Footer - use template footer or default
  const footerText = template.footer_text || DEFAULT_FOOTER_TEXT;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(footerText, 105, 280, { align: 'center' });

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

  // Date
  doc.setFontSize(11);
  doc.text(currentDate, 20, yPos);
  yPos += 10;

  // Addressee block - replace placeholders in template fields
  const addresseeName = template.addressee_name ? replaceEmployeePlaceholders(template.addressee_name, employeePlaceholders) : '';
  const addressText = template.address ? replaceEmployeePlaceholders(template.address, employeePlaceholders) : '';
  const contactText = template.contact_number ? replaceEmployeePlaceholders(template.contact_number, employeePlaceholders) : '';
  
  yPos = addAddresseeBlock(doc, yPos, addresseeName, addressText, contactText);
  yPos += 5;

  // Salutation
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(template.salutation || 'To Whom It May Concern', 20, yPos);
  yPos += 15;

  // Title - centered
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(template.title, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Body paragraph 1
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const bodyText = replaceEmployeePlaceholders(template.body_text, employeePlaceholders);
  yPos += renderFormattedText(doc, bodyText, 20, yPos, 170);
  yPos += 5;

  // Body paragraph 2 (if provided)
  if (template.body_text_2) {
    const bodyText2 = replaceEmployeePlaceholders(template.body_text_2, employeePlaceholders);
    yPos += renderFormattedText(doc, bodyText2, 20, yPos, 170);
    yPos += 5;
  }

  yPos += 10;

  // Signature block
  yPos = await addSignatureBlock(
    doc,
    yPos,
    template.signatory_name,
    template.signatory_position,
    template.signature_image_url,
    template.company_name
  );

  // Footer
  const footerText = template.footer_text || DEFAULT_FOOTER_TEXT;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(footerText, 105, 280, { align: 'center' });

  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
};
