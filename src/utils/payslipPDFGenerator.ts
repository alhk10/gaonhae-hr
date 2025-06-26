
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

export const generatePayslipPDF = (data: PayslipData) => {
  // Change paper size to A5
  const doc = new jsPDF('p', 'mm', 'a5');
  
  // Set font
  doc.setFont('helvetica');
  
  // Generate PayslipID (using employee ID and month)
  const payslipId = `PS-${data.employee.id}-${data.month.replace(' ', '').substring(0, 3).toLowerCase()}${new Date().getFullYear()}`;
  
  // Company details (top left) - adjusted for A5
  doc.setFontSize(6.48);
  doc.setFont('helvetica', 'bold');
  doc.text('Gaonhae Taekwondo LLP | T18LL1687K', 10, 16);
  doc.setFont('helvetica', 'normal');
  doc.text('271 Bukit Timah Road #02-08 Singapore 259708', 10, 20);
  
  // Header - PAYSLIP (centered) - adjusted for A5
  doc.setFontSize(11.34);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYSLIP', 74, 30, { align: 'center' });
  
  // Pay period (left-aligned under payslip) - increased spacing
  doc.setFontSize(8.1);
  doc.setFont('helvetica', 'bold');
  doc.text(`PAY PERIOD: ${data.month.toUpperCase()}`, 10, 38);
  
  // PayslipID moved under pay period - increased spacing
  doc.setFontSize(6.48);
  doc.setFont('helvetica', 'normal');
  doc.text(`PayslipID: ${payslipId}`, 10, 44);
  
  // Employee details section (left side) - increased spacing
  doc.setFontSize(8.1);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPLOYEE DETAILS:', 10, 52);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.48);
  
  // Employee info - increased spacing
  doc.text(`Name: ${data.employee.name}`, 10, 58);
  doc.text(`NRIC/FIN: ${data.employee.nric}`, 10, 62);
  doc.text(`Position: ${data.employee.position || 'N/A'}`, 10, 66);
  
  // Bank Transfer Details (right side of employee details) - adjusted for A5
  doc.setFontSize(8.1);
  doc.setFont('helvetica', 'bold');
  doc.text('BANK TRANSFER DETAILS:', 75, 52);
  doc.setFontSize(6.48);
  doc.setFont('helvetica', 'normal');
  doc.text(`Bank Name: ${data.employee.bankName || 'N/A'}`, 75, 58);
  doc.text(`Account Number: ${data.employee.bankAccount || 'N/A'}`, 75, 62);
  
  // Line separator - adjusted for A5
  doc.line(10, 72, 138, 72);
  
  // Earnings section - increased spacing
  let yPos = 78;
  doc.setFontSize(8.1);
  doc.setFont('helvetica', 'bold');
  doc.text('EARNINGS:', 10, yPos);
  yPos += 6;
  
  // Table headers - increased spacing
  doc.setFontSize(6.48);
  doc.setFont('helvetica', 'bold');
  doc.text('Description', 10, yPos);
  doc.text('Amount (S$)', 120, yPos, { align: 'right' });
  yPos += 4;
  doc.line(10, yPos, 138, yPos);
  yPos += 5;
  
  // Basic salary - increased spacing
  doc.setFont('helvetica', 'normal');
  doc.text('Basic Salary', 10, yPos);
  doc.text(data.baseSalary.toFixed(2), 120, yPos, { align: 'right' });
  yPos += 5;
  
  // Add allowances - increased spacing
  data.allowances.forEach(allowance => {
    doc.text(allowance.name, 10, yPos);
    doc.text(allowance.amount.toFixed(2), 120, yPos, { align: 'right' });
    yPos += 5;
  });
  
  // Add approved claims if any - increased spacing
  if (data.approvedClaims > 0) {
    doc.text('Approved Claims', 10, yPos);
    doc.text(data.approvedClaims.toFixed(2), 120, yPos, { align: 'right' });
    yPos += 5;
  }
  
  // Gross earnings line - increased spacing
  yPos += 2;
  doc.line(10, yPos, 120, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Gross Earnings', 10, yPos);
  doc.text((data.grossSalary + data.approvedClaims).toFixed(2), 120, yPos, { align: 'right' });
  yPos += 8;
  
  // Deductions section - increased spacing
  doc.setFontSize(8.1);
  doc.text('DEDUCTIONS:', 10, yPos);
  yPos += 6;
  
  // Table headers for deductions - increased spacing
  doc.setFontSize(6.48);
  doc.setFont('helvetica', 'bold');
  doc.text('Description', 10, yPos);
  doc.text('Amount (S$)', 120, yPos, { align: 'right' });
  yPos += 4;
  doc.line(10, yPos, 138, yPos);
  yPos += 5;
  
  // CPF Employee contribution - increased spacing
  doc.setFont('helvetica', 'normal');
  doc.text('CPF (Employee 20%)', 10, yPos);
  doc.text(data.employeeCPF.toFixed(2), 120, yPos, { align: 'right' });
  yPos += 5;
  
  // Add other deductions - increased spacing
  data.deductions.forEach(deduction => {
    doc.text(deduction.name, 10, yPos);
    doc.text(deduction.amount.toFixed(2), 120, yPos, { align: 'right' });
    yPos += 5;
  });
  
  // Total deductions line - increased spacing
  yPos += 2;
  doc.line(10, yPos, 120, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Total Deductions', 10, yPos);
  doc.text((data.employeeCPF + data.totalDeductions).toFixed(2), 120, yPos, { align: 'right' });
  yPos += 8;
  
  // Net pay (highlighted) - adjusted for A5 and increased spacing
  doc.setDrawColor(0);
  doc.setFillColor(240, 240, 240);
  doc.rect(10, yPos - 3, 128, 8, 'F');
  doc.setFontSize(9.72);
  doc.setFont('helvetica', 'bold');
  doc.text('NET PAY', 15, yPos + 1);
  doc.text(`S$ ${data.netSalary.toFixed(2)}`, 115, yPos + 1, { align: 'right' });
  yPos += 12;
  
  // CPF contributions summary - increased spacing
  doc.setFontSize(8.1);
  doc.setFont('helvetica', 'bold');
  doc.text('CPF CONTRIBUTIONS SUMMARY:', 10, yPos);
  yPos += 6;
  doc.setFontSize(6.48);
  doc.setFont('helvetica', 'normal');
  
  // CPF table - increased spacing
  doc.text('Employee CPF (20%)', 10, yPos);
  doc.text(data.employeeCPF.toFixed(2), 120, yPos, { align: 'right' });
  yPos += 5;
  doc.text('Employer CPF (17%)', 10, yPos);
  doc.text(data.employerCPF.toFixed(2), 120, yPos, { align: 'right' });
  yPos += 5;
  doc.line(10, yPos, 120, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Total CPF Contributions', 10, yPos);
  doc.text(data.totalCPF.toFixed(2), 120, yPos, { align: 'right' });
  
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
