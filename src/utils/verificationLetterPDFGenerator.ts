import jsPDF from 'jspdf';
import { format } from 'date-fns';

interface StudentData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nricPassport: string;
  currentBelt: string;
  enrollmentDate: string;
}

interface EmployeeData {
  name: string;
  dateOfBirth: string;
  nric: string;
  position: string;
  baseSalary: number;
  joinDate: string;
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
    .replace(/{joinDate}/g, data.joinDate);
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
  doc.text('This letter is computer generated and does not require signature.', 105, 280, { align: 'center' });

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
  doc.text('This letter is computer generated and does not require signature.', 105, 280, { align: 'center' });

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
  doc.text('This letter is computer generated and does not require signature.', 105, 280, { align: 'center' });

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
  doc.text('This letter is computer generated and does not require signature.', 105, 280, { align: 'center' });

  // Open print dialog
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
};
