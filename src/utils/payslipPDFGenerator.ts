
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
  
  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYSLIP', 105, 20, { align: 'center' });
  
  // Company details
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('ABC Learning Centre Pte Ltd', 20, 35);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('123 Main Street, Singapore 123456', 20, 42);
  doc.text('Tel: +65 6123 4567 | Email: hr@abclearning.com.sg', 20, 47);
  
  // Line separator
  doc.line(20, 52, 190, 52);
  
  // Pay period
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`PAY PERIOD: ${data.month.toUpperCase()}`, 20, 62);
  
  // Employee details section
  doc.setFont('helvetica', 'bold');
  doc.text('EMPLOYEE DETAILS:', 20, 75);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  // Left column - Employee info
  doc.text(`Name: ${data.employee.name}`, 20, 85);
  doc.text(`Employee ID: ${data.employee.id}`, 20, 92);
  doc.text(`NRIC/FIN: ${data.employee.nric}`, 20, 99);
  
  // Right column - Position info
  doc.text(`Branch: ${data.employee.branch || 'N/A'}`, 110, 85);
  doc.text(`Position: ${data.employee.position || 'N/A'}`, 110, 92);
  doc.text(`Pay Date: ${new Date().toLocaleDateString('en-SG')}`, 110, 99);
  
  // Line separator
  doc.line(20, 107, 190, 107);
  
  // Earnings section
  let yPos = 120;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('EARNINGS:', 20, yPos);
  yPos += 10;
  
  // Table headers
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Description', 20, yPos);
  doc.text('Amount (S$)', 150, yPos, { align: 'right' });
  yPos += 5;
  doc.line(20, yPos, 190, yPos);
  yPos += 8;
  
  // Basic salary
  doc.setFont('helvetica', 'normal');
  doc.text('Basic Salary', 20, yPos);
  doc.text(data.baseSalary.toFixed(2), 150, yPos, { align: 'right' });
  yPos += 7;
  
  // Add allowances
  data.allowances.forEach(allowance => {
    doc.text(allowance.name, 20, yPos);
    doc.text(allowance.amount.toFixed(2), 150, yPos, { align: 'right' });
    yPos += 7;
  });
  
  // Add approved claims if any
  if (data.approvedClaims > 0) {
    doc.text('Approved Claims', 20, yPos);
    doc.text(data.approvedClaims.toFixed(2), 150, yPos, { align: 'right' });
    yPos += 7;
  }
  
  // Gross earnings line
  yPos += 3;
  doc.line(20, yPos, 150, yPos);
  yPos += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Gross Earnings', 20, yPos);
  doc.text((data.grossSalary + data.approvedClaims).toFixed(2), 150, yPos, { align: 'right' });
  yPos += 15;
  
  // Deductions section
  doc.setFontSize(12);
  doc.text('DEDUCTIONS:', 20, yPos);
  yPos += 10;
  
  // Table headers for deductions
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Description', 20, yPos);
  doc.text('Amount (S$)', 150, yPos, { align: 'right' });
  yPos += 5;
  doc.line(20, yPos, 190, yPos);
  yPos += 8;
  
  // CPF Employee contribution
  doc.setFont('helvetica', 'normal');
  doc.text('CPF (Employee 20%)', 20, yPos);
  doc.text(data.employeeCPF.toFixed(2), 150, yPos, { align: 'right' });
  yPos += 7;
  
  // Add other deductions
  data.deductions.forEach(deduction => {
    doc.text(deduction.name, 20, yPos);
    doc.text(deduction.amount.toFixed(2), 150, yPos, { align: 'right' });
    yPos += 7;
  });
  
  // Total deductions line
  yPos += 3;
  doc.line(20, yPos, 150, yPos);
  yPos += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Total Deductions', 20, yPos);
  doc.text((data.employeeCPF + data.totalDeductions).toFixed(2), 150, yPos, { align: 'right' });
  yPos += 15;
  
  // Net pay (highlighted)
  doc.setDrawColor(0);
  doc.setFillColor(240, 240, 240);
  doc.rect(20, yPos - 5, 170, 15, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('NET PAY', 25, yPos + 5);
  doc.text(`S$ ${data.netSalary.toFixed(2)}`, 145, yPos + 5, { align: 'right' });
  yPos += 25;
  
  // Bank details section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('BANK TRANSFER DETAILS:', 20, yPos);
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Bank Name: ${data.employee.bankName || 'N/A'}`, 20, yPos);
  yPos += 7;
  doc.text(`Account Number: ${data.employee.bankAccount || 'N/A'}`, 20, yPos);
  yPos += 15;
  
  // CPF contributions summary
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('CPF CONTRIBUTIONS SUMMARY:', 20, yPos);
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // CPF table
  doc.text('Employee CPF (20%)', 20, yPos);
  doc.text(data.employeeCPF.toFixed(2), 150, yPos, { align: 'right' });
  yPos += 7;
  doc.text('Employer CPF (17%)', 20, yPos);
  doc.text(data.employerCPF.toFixed(2), 150, yPos, { align: 'right' });
  yPos += 7;
  doc.line(20, yPos, 150, yPos);
  yPos += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Total CPF Contributions', 20, yPos);
  doc.text(data.totalCPF.toFixed(2), 150, yPos, { align: 'right' });
  
  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('This payslip is computer generated and does not require signature.', 105, 270, { align: 'center' });
  doc.text('For queries, please contact HR Department at hr@abclearning.com.sg', 105, 275, { align: 'center' });
  doc.text(`Generated on: ${new Date().toLocaleString('en-SG')}`, 105, 280, { align: 'center' });
  
  // Save the PDF with proper filename
  const fileName = `Payslip_${data.employee.name.replace(/\s+/g, '_')}_${data.month.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
  
  console.log('PDF generated successfully:', fileName);
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
