import jsPDF from 'jspdf';

interface PayslipData {
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
  baseSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  grossSalary: number;
  employeeCPF: number;
  employerCPF: number;
  totalCPF: number;
  approvedClaims: number;
  netSalary: number;
  allowances: Array<{ name: string; amount: number }>;
  deductions: Array<{ name: string; amount: number }>;
}

export const generatePayslipPDF = async (data: PayslipData) => {
  // Change paper size to A5
  const doc = new jsPDF('p', 'mm', 'a5');
  
  // Set font
  doc.setFont('helvetica');
  
  // Generate PayslipID (using employee ID and month)
  const payslipId = `PS-${data.employee.id}-${data.month.replace(' ', '').substring(0, 3).toLowerCase()}${new Date().getFullYear()}`;
  
  // Add logo and company text centered together
  const pageWidth = 148; // A5 width in mm
  const logoWidth = 25;
  const textWidth = 65;
  const totalWidth = logoWidth + 3 + textWidth; // logo + gap + text
  const startX = (pageWidth - totalWidth) / 2;
  
  // Add logo to the left side of centered block
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      logoImg.onload = () => resolve();
      logoImg.onerror = () => reject(new Error('Failed to load logo'));
      logoImg.src = '/images/company-logo.jpg';
    });
    
    const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
    doc.addImage(logoImg, 'JPEG', startX, 6, logoWidth, Math.min(logoHeight, 14));
  } catch (error) {
    console.warn('Could not load logo for PDF:', error);
  }
  
  // Company details to the right of logo, vertically centered
  const textX = startX + logoWidth + 3;
  doc.setFontSize(7.48);
  doc.setFont('helvetica', 'bold');
  doc.text('Gaonhae Taekwondo LLP | T18LL1687K', textX, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.48);
  doc.text('271 Bukit Timah Road #02-08 Singapore 259708', textX, 14);
  
  // Header - PAYSLIP (centered) - adjusted for A5
  doc.setFontSize(11.34);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYSLIP', 74, 25, { align: 'center' });
  
  // Pay period (left-aligned under payslip) - added extra line space
  doc.setFontSize(8.1);
  doc.setFont('helvetica', 'bold');
  doc.text(`PAY PERIOD: ${data.month.toUpperCase()}`, 10, 35);
  
  // PayslipID moved under pay period - adjusted spacing
  doc.setFontSize(6.48);
  doc.setFont('helvetica', 'normal');
  doc.text(`PayslipID: ${payslipId}`, 10, 39);
  
  // Employee details section (left side) - adjusted spacing
  doc.setFontSize(8.1);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPLOYEE DETAILS:', 10, 45);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.48);
  
  // Employee info - adjusted spacing
  doc.text(`Name: ${data.employee.name}`, 10, 49);
  doc.text(`NRIC/FIN: ${data.employee.nric}`, 10, 52);
  doc.text(`Position: ${data.employee.position || 'N/A'}`, 10, 55);
  
  // Bank Transfer Details (right side of employee details) - adjusted for A5
  doc.setFontSize(8.1);
  doc.setFont('helvetica', 'bold');
  doc.text('BANK TRANSFER DETAILS:', 75, 45);
  doc.setFontSize(6.48);
  doc.setFont('helvetica', 'normal');
  doc.text(`Bank Name: ${data.employee.bankName || 'N/A'}`, 75, 49);
  doc.text(`Account Number: ${data.employee.bankAccount || 'N/A'}`, 75, 52);
  
  // Line separator - adjusted for A5
  doc.line(10, 59, 138, 59);
  
  // Earnings section - adjusted spacing
  let yPos = 63;
  doc.setFontSize(8.1);
  doc.setFont('helvetica', 'bold');
  doc.text('EARNINGS:', 10, yPos);
  yPos += 4;
  
  // Line separator under earnings title
  doc.line(10, yPos, 138, yPos);
  yPos += 3;
  
  // Basic salary - reduced spacing, adjusted positioning
  doc.setFontSize(6.48);
  doc.setFont('helvetica', 'normal');
  doc.text('Basic Salary', 10, yPos);
  doc.text(data.baseSalary.toFixed(2), 130, yPos, { align: 'right' });
  yPos += 3;
  
  // Add allowances - reduced spacing, adjusted positioning
  data.allowances.forEach(allowance => {
    doc.text(allowance.name, 10, yPos);
    doc.text(allowance.amount.toFixed(2), 130, yPos, { align: 'right' });
    yPos += 3;
  });
  
  // Add approved claims if any - reduced spacing, adjusted positioning
  if (data.approvedClaims > 0) {
    doc.text('Approved Claims', 10, yPos);
    doc.text(data.approvedClaims.toFixed(2), 130, yPos, { align: 'right' });
    yPos += 3;
  }
  
  // Gross earnings line - reduced spacing, adjusted positioning
  yPos += 1;
  doc.line(10, yPos, 130, yPos);
  yPos += 3;
  doc.setFont('helvetica', 'bold');
  doc.text('Gross Earnings', 10, yPos);
  doc.text((data.grossSalary + data.approvedClaims).toFixed(2), 130, yPos, { align: 'right' });
  yPos += 5;
  
  // Deductions section - reduced spacing
  doc.setFontSize(8.1);
  doc.text('DEDUCTIONS:', 10, yPos);
  yPos += 4;
  
  // Line separator under deductions title
  doc.line(10, yPos, 138, yPos);
  yPos += 3;
  
  // CPF Employee contribution - reduced spacing, adjusted positioning
  doc.setFontSize(6.48);
  doc.setFont('helvetica', 'normal');
  doc.text('CPF (Employee 20%)', 10, yPos);
  doc.text(data.employeeCPF.toFixed(2), 130, yPos, { align: 'right' });
  yPos += 3;
  
  // Add other deductions - reduced spacing, adjusted positioning
  data.deductions.forEach(deduction => {
    doc.text(deduction.name, 10, yPos);
    doc.text(deduction.amount.toFixed(2), 130, yPos, { align: 'right' });
    yPos += 3;
  });
  
  // Total deductions line - reduced spacing, adjusted positioning
  yPos += 1;
  doc.line(10, yPos, 130, yPos);
  yPos += 3;
  doc.setFont('helvetica', 'bold');
  doc.text('Total Deductions', 10, yPos);
  doc.text((data.employeeCPF + data.totalDeductions).toFixed(2), 130, yPos, { align: 'right' });
  yPos += 5;
  
  // Net pay (highlighted) - adjusted for A5 and reduced spacing, better width utilization
  doc.setDrawColor(0);
  doc.setFillColor(240, 240, 240);
  doc.rect(10, yPos - 2, 128, 6, 'F');
  doc.setFontSize(9.72);
  doc.setFont('helvetica', 'bold');
  doc.text('NET PAY', 15, yPos + 1);
  doc.text(`S$ ${data.netSalary.toFixed(2)}`, 125, yPos + 1, { align: 'right' });
  yPos += 8;
  
  // CPF contributions summary - reduced spacing, adjusted positioning
  doc.setFontSize(8.1);
  doc.setFont('helvetica', 'bold');
  doc.text('CPF CONTRIBUTIONS SUMMARY:', 10, yPos);
  yPos += 4;
  doc.setFontSize(6.48);
  doc.setFont('helvetica', 'normal');
  
  // CPF table - reduced spacing, adjusted positioning
  doc.text('Employee CPF (20%)', 10, yPos);
  doc.text(data.employeeCPF.toFixed(2), 130, yPos, { align: 'right' });
  yPos += 3;
  doc.text('Employer CPF (17%)', 10, yPos);
  doc.text(data.employerCPF.toFixed(2), 130, yPos, { align: 'right' });
  yPos += 3;
  doc.line(10, yPos, 130, yPos);
  yPos += 3;
  doc.setFont('helvetica', 'bold');
  doc.text('Total CPF Contributions', 10, yPos);
  doc.text(data.totalCPF.toFixed(2), 130, yPos, { align: 'right' });
  
  // Footer (simplified) - adjusted for A5
  doc.setFontSize(4.86);
  doc.setFont('helvetica', 'normal');
  doc.text('This payslip is computer generated and does not require signature.', 74, 195, { align: 'center' });
  
  // Save the PDF with proper filename including PayslipID
  const fileName = `${payslipId}_${data.employee.name.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
  
  console.log('PDF generated successfully:', fileName);
  console.log('PayslipID:', payslipId);
  console.log('Employee data:', data.employee);
  console.log('Payslip calculations:', {
    baseSalary: data.baseSalary,
    totalAllowances: data.totalAllowances,
    grossSalary: data.grossSalary,
    employeeCPF: data.employeeCPF,
    employerCPF: data.employerCPF,
    totalDeductions: data.totalDeductions,
    netSalary: data.netSalary
  });
};
