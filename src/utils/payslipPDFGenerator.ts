
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
  const doc = new jsPDF('p', 'mm', 'a4');
  
  // Set font
  doc.setFont('helvetica');
  
  // Generate PayslipID (using employee ID and month)
  const payslipId = `PS-${data.employee.id}-${data.month.replace(' ', '').substring(0, 3).toLowerCase()}${new Date().getFullYear()}`;
  
  // Company details (top left)
  doc.setFontSize(6.48);
  doc.setFont('helvetica', 'bold');
  doc.text('Gaonhae Taekwondo LLP | T18LL1687K', 20, 16);
  doc.setFont('helvetica', 'normal');
  doc.text('271 Bukit Timah Road #02-08 Singapore 259708', 20, 19.72);
  
  // PayslipID
  doc.setFontSize(6.48);
  doc.setFont('helvetica', 'normal');
  doc.text(`PayslipID: ${payslipId}`, 20, 24.34);
  
  // Header - PAYSLIP (centered)
  doc.setFontSize(11.34);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYSLIP', 105, 30.24, { align: 'center' });
  
  // Pay period (left-aligned under payslip)
  doc.setFontSize(8.1);
  doc.setFont('helvetica', 'bold');
  doc.text(`PAY PERIOD: ${data.month.toUpperCase()}`, 20, 34.86);
  
  // Employee details section (left side)
  doc.setFontSize(8.1);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPLOYEE DETAILS:', 20, 41.58);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.48);
  
  // Employee info
  doc.text(`Name: ${data.employee.name}`, 20, 46.2);
  doc.text(`NRIC/FIN: ${data.employee.nric}`, 20, 49.14);
  doc.text(`Position: ${data.employee.position || 'N/A'}`, 20, 52.08);
  
  // Bank Transfer Details (right side of employee details)
  doc.setFontSize(8.1);
  doc.setFont('helvetica', 'bold');
  doc.text('BANK TRANSFER DETAILS:', 105, 41.58);
  doc.setFontSize(6.48);
  doc.setFont('helvetica', 'normal');
  doc.text(`Bank Name: ${data.employee.bankName || 'N/A'}`, 105, 46.2);
  doc.text(`Account Number: ${data.employee.bankAccount || 'N/A'}`, 105, 49.14);
  
  // Line separator
  doc.line(20, 55.02, 190, 55.02);
  
  // Earnings section
  let yPos = 58.02;
  doc.setFontSize(8.1);
  doc.setFont('helvetica', 'bold');
  doc.text('EARNINGS:', 20, yPos);
  yPos += 1.25;
  
  // Table headers
  doc.setFontSize(6.48);
  doc.setFont('helvetica', 'bold');
  doc.text('Description', 20, yPos);
  doc.text('Amount (S$)', 150, yPos, { align: 'right' });
  yPos += 0.75;
  doc.line(20, yPos, 190, yPos);
  yPos += 1;
  
  // Basic salary
  doc.setFont('helvetica', 'normal');
  doc.text('Basic Salary', 20, yPos);
  doc.text(data.baseSalary.toFixed(2), 150, yPos, { align: 'right' });
  yPos += 1;
  
  // Add allowances
  data.allowances.forEach(allowance => {
    doc.text(allowance.name, 20, yPos);
    doc.text(allowance.amount.toFixed(2), 150, yPos, { align: 'right' });
    yPos += 1;
  });
  
  // Add approved claims if any
  if (data.approvedClaims > 0) {
    doc.text('Approved Claims', 20, yPos);
    doc.text(data.approvedClaims.toFixed(2), 150, yPos, { align: 'right' });
    yPos += 1;
  }
  
  // Gross earnings line
  yPos += 0.5;
  doc.line(20, yPos, 150, yPos);
  yPos += 1;
  doc.setFont('helvetica', 'bold');
  doc.text('Gross Earnings', 20, yPos);
  doc.text((data.grossSalary + data.approvedClaims).toFixed(2), 150, yPos, { align: 'right' });
  yPos += 2;
  
  // Deductions section
  doc.setFontSize(8.1);
  doc.text('DEDUCTIONS:', 20, yPos);
  yPos += 1.25;
  
  // Table headers for deductions
  doc.setFontSize(6.48);
  doc.setFont('helvetica', 'bold');
  doc.text('Description', 20, yPos);
  doc.text('Amount (S$)', 150, yPos, { align: 'right' });
  yPos += 0.75;
  doc.line(20, yPos, 190, yPos);
  yPos += 1;
  
  // CPF Employee contribution
  doc.setFont('helvetica', 'normal');
  doc.text('CPF (Employee 20%)', 20, yPos);
  doc.text(data.employeeCPF.toFixed(2), 150, yPos, { align: 'right' });
  yPos += 1;
  
  // Add other deductions
  data.deductions.forEach(deduction => {
    doc.text(deduction.name, 20, yPos);
    doc.text(deduction.amount.toFixed(2), 150, yPos, { align: 'right' });
    yPos += 1;
  });
  
  // Total deductions line
  yPos += 0.5;
  doc.line(20, yPos, 150, yPos);
  yPos += 1;
  doc.setFont('helvetica', 'bold');
  doc.text('Total Deductions', 20, yPos);
  doc.text((data.employeeCPF + data.totalDeductions).toFixed(2), 150, yPos, { align: 'right' });
  yPos += 2;
  
  // Net pay (highlighted)
  doc.setDrawColor(0);
  doc.setFillColor(240, 240, 240);
  doc.rect(20, yPos - 0.75, 170, 2, 'F');
  doc.setFontSize(9.72);
  doc.setFont('helvetica', 'bold');
  doc.text('NET PAY', 25, yPos + 0.75);
  doc.text(`S$ ${data.netSalary.toFixed(2)}`, 145, yPos + 0.75, { align: 'right' });
  yPos += 3.25;
  
  // CPF contributions summary
  doc.setFontSize(8.1);
  doc.setFont('helvetica', 'bold');
  doc.text('CPF CONTRIBUTIONS SUMMARY:', 20, yPos);
  yPos += 1.25;
  doc.setFontSize(6.48);
  doc.setFont('helvetica', 'normal');
  
  // CPF table
  doc.text('Employee CPF (20%)', 20, yPos);
  doc.text(data.employeeCPF.toFixed(2), 150, yPos, { align: 'right' });
  yPos += 1;
  doc.text('Employer CPF (17%)', 20, yPos);
  doc.text(data.employerCPF.toFixed(2), 150, yPos, { align: 'right' });
  yPos += 1;
  doc.line(20, yPos, 150, yPos);
  yPos += 1;
  doc.setFont('helvetica', 'bold');
  doc.text('Total CPF Contributions', 20, yPos);
  doc.text(data.totalCPF.toFixed(2), 150, yPos, { align: 'right' });
  
  // Footer (simplified)
  doc.setFontSize(4.86);
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
