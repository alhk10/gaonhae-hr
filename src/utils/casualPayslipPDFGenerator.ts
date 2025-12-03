import jsPDF from 'jspdf';

interface SlotEntry {
  date: string;
  branchName: string;
  dayRate?: number;
  clockIn: string | null;
  clockOut: string | null;
  hoursWorked: number;
  expectedHours?: number;
  pay: number;
}

interface CasualPayslipData {
  employee: {
    id: string;
    name: string;
    nric: string;
    branch?: string;
    position?: string;
    bankName?: string;
    bankAccount?: string;
  };
  month: string;
  slots: SlotEntry[];
  totalSlotPay: number;
  totalAllowances: number;
  totalDeductions: number;
  approvedClaims: number;
  grossSalary: number;
  employeeCPF: number;
  employerCPF: number;
  totalCPF: number;
  netSalary: number;
  allowances: Array<{ name: string; amount: number }>;
  deductions: Array<{ name: string; amount: number }>;
}

// Helper to format time from ISO string
const formatTime = (timeStr: string | null): string => {
  if (!timeStr) return '-';
  try {
    // Handle both full ISO strings and time-only strings
    if (timeStr.includes('T')) {
      const date = new Date(timeStr);
      return date.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    // Already in HH:mm format
    return timeStr.substring(0, 5);
  } catch {
    return timeStr;
  }
};

// Helper to format date
const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-SG', { day: '2-digit', month: 'short' });
  } catch {
    return dateStr;
  }
};

export const generateCasualPayslipPDF = async (data: CasualPayslipData) => {
  // Use A4 for more space for timesheet
  const doc = new jsPDF('p', 'mm', 'a4');
  
  doc.setFont('helvetica');
  
  const payslipId = `PS-${data.employee.id}-${data.month.replace(' ', '').substring(0, 3).toLowerCase()}${new Date().getFullYear()}`;
  
  const pageWidth = 210; // A4 width in mm
  const logoWidth = 30;
  const textWidth = 70;
  const totalWidth = logoWidth + 3 + textWidth;
  const startX = (pageWidth - totalWidth) / 2 - 10;
  
  // Add logo
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      logoImg.onload = () => resolve();
      logoImg.onerror = () => reject(new Error('Failed to load logo'));
      logoImg.src = '/images/company-logo.jpg';
    });
    
    const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
    doc.addImage(logoImg, 'JPEG', startX, 8, logoWidth, Math.min(logoHeight, 18));
  } catch (error) {
    console.warn('Could not load logo for PDF:', error);
  }
  
  // Company details
  const textX = startX + logoWidth + 3;
  doc.setTextColor(54, 54, 54);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Gaonhae Taekwondo LLP | T18LL1687K', textX, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('271 Bukit Timah Road #02-08 Singapore 259708', textX, 18);
  
  doc.setTextColor(0, 0, 0);
  
  // Header
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYSLIP - CASUAL EMPLOYEE', 105, 35, { align: 'center' });
  
  // Pay period
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`PAY PERIOD: ${data.month.toUpperCase()}`, 15, 42);
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`PayslipID: ${payslipId}`, 15, 47);
  
  // Employee details (left)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPLOYEE DETAILS:', 15, 55);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Name: ${data.employee.name}`, 15, 60);
  doc.text(`NRIC/FIN: ${data.employee.nric}`, 15, 64);
  doc.text(`Position: ${data.employee.position || 'N/A'}`, 15, 68);
  
  // Bank details (right)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('BANK TRANSFER DETAILS:', 120, 55);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Bank Name: ${data.employee.bankName || 'N/A'}`, 120, 60);
  doc.text(`Account Number: ${data.employee.bankAccount || 'N/A'}`, 120, 64);
  
  // Line separator
  doc.line(15, 73, 195, 73);
  
  // Timesheet section
  let yPos = 80;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('TIMESHEET:', 15, yPos);
  yPos += 6;
  
  // Table headers
  doc.setFillColor(240, 240, 240);
  doc.rect(15, yPos - 4, 180, 7, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('Date', 17, yPos);
  doc.text('Branch', 42, yPos);
  doc.text('Day Rate', 80, yPos);
  doc.text('Clock In', 105, yPos);
  doc.text('Clock Out', 130, yPos);
  doc.text('Hours', 155, yPos);
  doc.text('Pay', 175, yPos);
  yPos += 5;
  
  // Draw header line
  doc.line(15, yPos, 195, yPos);
  yPos += 4;
  
  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  
  data.slots.forEach((slot, index) => {
    // Check if we need a new page
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    // Alternate row background
    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(15, yPos - 3, 180, 5, 'F');
    }
    
    // Calculate day rate if not provided (full rate before proration)
    const expectedHours = slot.expectedHours || slot.hoursWorked || 6.33;
    const dayRate = slot.dayRate || (slot.hoursWorked > 0 ? (slot.pay / slot.hoursWorked) * expectedHours : slot.pay);
    
    doc.text(formatDate(slot.date), 17, yPos);
    doc.text(slot.branchName.substring(0, 15), 42, yPos);
    doc.text(`$${dayRate.toFixed(2)}`, 80, yPos);
    doc.text(formatTime(slot.clockIn), 105, yPos);
    doc.text(formatTime(slot.clockOut), 130, yPos);
    doc.text(slot.hoursWorked.toFixed(1), 157, yPos);
    doc.text(`$${slot.pay.toFixed(2)}`, 175, yPos);
    yPos += 5;
  });
  
  // Timesheet total
  yPos += 2;
  doc.line(15, yPos, 195, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL SLOT PAY', 17, yPos);
  doc.text(`$${data.totalSlotPay.toFixed(2)}`, 175, yPos);
  yPos += 8;
  
  // Earnings section
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('ADDITIONAL EARNINGS:', 15, yPos);
  yPos += 5;
  doc.line(15, yPos, 195, yPos);
  yPos += 5;
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  // Allowances
  if (data.allowances.length > 0) {
    data.allowances.forEach(allowance => {
      doc.text(allowance.name, 17, yPos);
      doc.text(`$${allowance.amount.toFixed(2)}`, 175, yPos);
      yPos += 4;
    });
  } else {
    doc.text('No additional allowances', 17, yPos);
    yPos += 4;
  }
  
  // Claims
  if (data.approvedClaims > 0) {
    doc.text('Approved Claims', 17, yPos);
    doc.text(`$${data.approvedClaims.toFixed(2)}`, 175, yPos);
    yPos += 4;
  }
  
  // Gross earnings
  yPos += 2;
  doc.line(15, yPos, 195, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Gross Earnings', 17, yPos);
  doc.text(`$${data.grossSalary.toFixed(2)}`, 175, yPos);
  yPos += 8;
  
  // Deductions section
  doc.setFontSize(9);
  doc.text('DEDUCTIONS:', 15, yPos);
  yPos += 5;
  doc.line(15, yPos, 195, yPos);
  yPos += 5;
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  // CPF Employee
  doc.text('CPF (Employee)', 17, yPos);
  doc.text(`$${data.employeeCPF.toFixed(2)}`, 175, yPos);
  yPos += 4;
  
  // Other deductions
  if (data.deductions.length > 0) {
    data.deductions.forEach(deduction => {
      doc.text(deduction.name, 17, yPos);
      doc.text(`$${deduction.amount.toFixed(2)}`, 175, yPos);
      yPos += 4;
    });
  }
  
  // Total deductions
  yPos += 2;
  doc.line(15, yPos, 195, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Total Deductions', 17, yPos);
  doc.text(`$${(data.employeeCPF + data.totalDeductions).toFixed(2)}`, 175, yPos);
  yPos += 8;
  
  // Net pay (highlighted)
  doc.setFillColor(240, 240, 240);
  doc.rect(15, yPos - 3, 180, 8, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('NET PAY', 20, yPos + 2);
  doc.text(`S$ ${data.netSalary.toFixed(2)}`, 170, yPos + 2, { align: 'right' });
  yPos += 12;
  
  // CPF summary
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('CPF CONTRIBUTIONS SUMMARY:', 15, yPos);
  yPos += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  doc.text('Employee CPF', 17, yPos);
  doc.text(`$${data.employeeCPF.toFixed(2)}`, 175, yPos);
  yPos += 4;
  doc.text('Employer CPF', 17, yPos);
  doc.text(`$${data.employerCPF.toFixed(2)}`, 175, yPos);
  yPos += 4;
  doc.line(15, yPos, 195, yPos);
  yPos += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('Total CPF Contributions', 17, yPos);
  doc.text(`$${data.totalCPF.toFixed(2)}`, 175, yPos);
  
  // Footer
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text('This payslip is computer generated and does not require signature.', 105, 285, { align: 'center' });
  
  const fileName = `${payslipId}_${data.employee.name.replace(/\s+/g, '_')}_Casual.pdf`;
  doc.save(fileName);
  
  console.log('Casual PDF generated:', fileName);
};

export type { CasualPayslipData, SlotEntry };
