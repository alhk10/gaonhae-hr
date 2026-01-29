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
  const leftMargin = 20;
  const logoWidth = 38.5; // 10% bigger than 35mm

  // Add logo - left aligned
  if (logoImg) {
    const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
    doc.addImage(logoImg, 'JPEG', leftMargin, 15, logoWidth, Math.min(logoHeight, 27.5));
  }

  // Company details - left aligned next to logo
  const textX = leftMargin + logoWidth + 5;
  doc.setTextColor(54, 54, 54);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Gaonhae Taekwondo LLP | T18LL1687K', textX, 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('271 Bukit Timah Road #02-08 Singapore 259708', textX, 28);

  // Reset text color
  doc.setTextColor(0, 0, 0);
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return 'N/A';
  try {
    return format(new Date(dateStr), 'dd/MM/yyyy');
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

  const fullName = `${data.firstName} ${data.lastName}`.trim();
  const currentDate = format(new Date(), 'dd MMMM yyyy');

  let yPos = 55;

  // Date
  doc.setFontSize(11);
  doc.text(currentDate, 20, yPos);
  yPos += 15;

  // To Whom It May Concern
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TO WHOM IT MAY CONCERN', 20, yPos);
  yPos += 15;

  // Title
  doc.setFontSize(14);
  doc.text('STUDENT VERIFICATION LETTER', 20, yPos);
  yPos += 15;

  // Body paragraph
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const bodyText = `This is to certify that ${fullName} is a student currently registered at Gaonhae Taekwondo.`;
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

  // Closing statement
  const closingText = `This letter is issued upon request for ${fullName}'s reference.`;
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

  const currentDate = format(new Date(), 'dd MMMM yyyy');

  let yPos = 55;

  // Date
  doc.setFontSize(11);
  doc.text(currentDate, 20, yPos);
  yPos += 15;

  // To Whom It May Concern
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TO WHOM IT MAY CONCERN', 20, yPos);
  yPos += 15;

  // Title
  doc.setFontSize(14);
  doc.text('EMPLOYMENT VERIFICATION LETTER', 20, yPos);
  yPos += 15;

  // Body paragraph
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const bodyText = `This is to certify that ${data.name} is employed at Gaonhae Taekwondo LLP.`;
  const bodyLines = doc.splitTextToSize(bodyText, 170);
  doc.text(bodyLines, 20, yPos);
  yPos += bodyLines.length * 6 + 10;

  // Employment Details section
  doc.setFont('helvetica', 'bold');
  doc.text('Employment Details:', 20, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  const details = [
    { label: 'Full Name', value: data.name },
    { label: 'Date of Birth', value: formatDate(data.dateOfBirth) },
    { label: 'NRIC', value: data.nric || 'N/A' },
    { label: 'Position', value: data.position || 'N/A' },
    { label: 'Monthly Salary', value: formatCurrency(data.baseSalary || 0) },
    { label: 'Employment Start Date', value: formatDate(data.joinDate) },
  ];

  details.forEach((detail) => {
    doc.text(`• ${detail.label}: ${detail.value}`, 25, yPos);
    yPos += 7;
  });

  yPos += 10;

  // Closing statement
  const closingText = `This letter is issued upon request for ${data.name}'s reference.`;
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

  const fullName = `${data.firstName} ${data.lastName}`.trim();
  const currentDate = format(new Date(), 'dd MMMM yyyy');

  let yPos = 55;

  doc.setFontSize(11);
  doc.text(currentDate, 20, yPos);
  yPos += 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TO WHOM IT MAY CONCERN', 20, yPos);
  yPos += 15;

  doc.setFontSize(14);
  doc.text('STUDENT VERIFICATION LETTER', 20, yPos);
  yPos += 15;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const bodyText = `This is to certify that ${fullName} is a student currently registered at Gaonhae Taekwondo.`;
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

  const closingText = `This letter is issued upon request for ${fullName}'s reference.`;
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

  const currentDate = format(new Date(), 'dd MMMM yyyy');

  let yPos = 55;

  doc.setFontSize(11);
  doc.text(currentDate, 20, yPos);
  yPos += 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TO WHOM IT MAY CONCERN', 20, yPos);
  yPos += 15;

  doc.setFontSize(14);
  doc.text('EMPLOYMENT VERIFICATION LETTER', 20, yPos);
  yPos += 15;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const bodyText = `This is to certify that ${data.name} is employed at Gaonhae Taekwondo LLP.`;
  const bodyLines = doc.splitTextToSize(bodyText, 170);
  doc.text(bodyLines, 20, yPos);
  yPos += bodyLines.length * 6 + 10;

  doc.setFont('helvetica', 'bold');
  doc.text('Employment Details:', 20, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  const details = [
    { label: 'Full Name', value: data.name },
    { label: 'Date of Birth', value: formatDate(data.dateOfBirth) },
    { label: 'NRIC', value: data.nric || 'N/A' },
    { label: 'Position', value: data.position || 'N/A' },
    { label: 'Monthly Salary', value: formatCurrency(data.baseSalary || 0) },
    { label: 'Employment Start Date', value: formatDate(data.joinDate) },
  ];

  details.forEach((detail) => {
    doc.text(`• ${detail.label}: ${detail.value}`, 25, yPos);
    yPos += 7;
  });

  yPos += 10;

  const closingText = `This letter is issued upon request for ${data.name}'s reference.`;
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
