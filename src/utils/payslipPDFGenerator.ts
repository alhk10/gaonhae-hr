
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
  const doc = new jsPDF();
  
  // Set font
  doc.setFont('helvetica');
  
  // Generate PayslipID (using employee ID and month)
  const payslipId = `PS-${data.employee.id}-${data.month.replace(' ', '').substring(0, 3).toLowerCase()}${new Date().getFullYear()}`;
  
  // Company details (top left) - replaced logo placeholder
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Gaonhae Taekwondo LLP | T18LL1687K', 20, 20);
  doc.setFont('helvetica', 'normal');
  doc.text('271 Bukit Timah Road #02-08 Singapore 259708', 20, 26);
  
  // Header - PAYSLIP (centered, moved down 2 lines)
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYSLIP', 105, 34, { align: 'center' });
  
  // Pay period (moved to right)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`PAY PERIOD: ${data.month.toUpperCase()}`, 190, 20, { align: 'right' });
  
  // PayslipID
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`PayslipID: ${payslipId}`, 20, 42);
  
  // Employee details section
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPLOYEE DETAILS:', 20, 52);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  
  // Employee info (removed employee ID, branch, and pay date)
  doc.text(`Name: ${data.employee.name}`, 20, 58);
  doc.text(`NRIC/FIN: ${data.employee.nric}`, 20, 62);
  doc.text(`Position: ${data.employee.position || 'N/A'}`, 20, 66);
  
  // Line separator
  doc.line(20, 70, 190, 70);
  
  // Earnings section
  let yPos = 76;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('EARNINGS:', 20, yPos);
  yPos += 5;
  
  // Table headers
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Description', 20, yPos);
  doc.text('Amount (S$)', 150, yPos, { align: 'right' });
  yPos += 3;
  doc.line(20, yPos, 190, yPos);
  yPos += 4;
  
  // Basic salary
  doc.setFont('helvetica', 'normal');
  doc.text('Basic Salary', 20, yPos);
  doc.text(data.baseSalary.toFixed(2), 150, yPos, { align: 'right' });
  yPos += 4;
  
  // Add allowances
  data.allowances.forEach(allowance => {
    doc.text(allowance.name, 20, yPos);
    doc.text(allowance.amount.toFixed(2), 150, yPos, { align: 'right' });
    yPos += 4;
  });
  
  // Add approved claims if any
  if (data.approvedClaims > 0) {
    doc.text('Approved Claims', 20, yPos);
    doc.text(data.approvedClaims.toFixed(2), 150, yPos, { align: 'right' });
    yPos += 4;
  }
  
  // Gross earnings line
  yPos += 2;
  doc.line(20, yPos, 150, yPos);
  yPos += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('Gross Earnings', 20, yPos);
  doc.text((data.grossSalary + data.approvedClaims).toFixed(2), 150, yPos, { align: 'right' });
  yPos += 8;
  
  // Deductions section
  doc.setFontSize(10);
  doc.text('DEDUCTIONS:', 20, yPos);
  yPos += 5;
  
  // Table headers for deductions
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Description', 20, yPos);
  doc.text('Amount (S$)', 150, yPos, { align: 'right' });
  yPos += 3;
  doc.line(20, yPos, 190, yPos);
  yPos += 4;
  
  // CPF Employee contribution
  doc.setFont('helvetica', 'normal');
  doc.text('CPF (Employee 20%)', 20, yPos);
  doc.text(data.employeeCPF.toFixed(2), 150, yPos, { align: 'right' });
  yPos += 4;
  
  // Add other deductions
  data.deductions.forEach(deduction => {
    doc.text(deduction.name, 20, yPos);
    doc.text(deduction.amount.toFixed(2), 150, yPos, { align: 'right' });
    yPos += 4;
  });
  
  // Total deductions line
  yPos += 2;
  doc.line(20, yPos, 150, yPos);
  yPos += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('Total Deductions', 20, yPos);
  doc.text((data.employeeCPF + data.totalDeductions).toFixed(2), 150, yPos, { align: 'right' });
  yPos += 8;
  
  // Net pay (highlighted)
  doc.setDrawColor(0);
  doc.setFillColor(240, 240, 240);
  doc.rect(20, yPos - 3, 170, 8, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('NET PAY', 25, yPos + 3);
  doc.text(`S$ ${data.netSalary.toFixed(2)}`, 145, yPos + 3, { align: 'right' });
  yPos += 13;
  
  // Bank details section
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('BANK TRANSFER DETAILS:', 20, yPos);
  yPos += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Bank Name: ${data.employee.bankName || 'N/A'}`, 20, yPos);
  yPos += 4;
  doc.text(`Account Number: ${data.employee.bankAccount || 'N/A'}`, 20, yPos);
  yPos += 8;
  
  // CPF contributions summary
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CPF CONTRIBUTIONS SUMMARY:', 20, yPos);
  yPos += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  // CPF table
  doc.text('Employee CPF (20%)', 20, yPos);
  doc.text(data.employeeCPF.toFixed(2), 150, yPos, { align: 'right' });
  yPos += 4;
  doc.text('Employer CPF (17%)', 20, yPos);
  doc.text(data.employerCPF.toFixed(2), 150, yPos, { align: 'right' });
  yPos += 4;
  doc.line(20, yPos, 150, yPos);
  yPos += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('Total CPF Contributions', 20, yPos);
  doc.text(data.totalCPF.toFixed(2), 150, yPos, { align: 'right' });
  
  // Footer (simplified)
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text('This payslip is computer generated and does not require signature.', 105, 275, { align: 'center' });
  
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
