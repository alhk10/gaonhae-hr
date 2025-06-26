
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
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYSLIP', 105, 20, { align: 'center' });
  
  // Company details
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('ABC Learning Centre Pte Ltd', 20, 35);
  doc.setFont('helvetica', 'normal');
  doc.text('123 Main Street, Singapore 123456', 20, 42);
  
  // Pay period
  doc.setFont('helvetica', 'bold');
  doc.text(`PAY PERIOD: ${data.month.toUpperCase()}`, 20, 55);
  
  // Employee details
  doc.setFont('helvetica', 'bold');
  doc.text('EMPLOYEE DETAILS:', 20, 70);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${data.employee.name}`, 20, 80);
  doc.text(`Employee ID: ${data.employee.id}`, 20, 87);
  doc.text(`NRIC/FIN: ${data.employee.nric}`, 20, 94);
  doc.text(`Branch: ${data.employee.branch || 'N/A'}`, 20, 101);
  doc.text(`Position: ${data.employee.position || 'N/A'}`, 20, 108);
  
  // Earnings section
  let yPos = 125;
  doc.setFont('helvetica', 'bold');
  doc.text('EARNINGS:', 20, yPos);
  yPos += 10;
  
  doc.setFont('helvetica', 'normal');
  doc.text('Basic Salary', 20, yPos);
  doc.text(`S$ ${data.baseSalary.toFixed(2)}`, 150, yPos, { align: 'right' });
  yPos += 7;
  
  // Add allowances
  data.allowances.forEach(allowance => {
    doc.text(allowance.name, 20, yPos);
    doc.text(`S$ ${allowance.amount.toFixed(2)}`, 150, yPos, { align: 'right' });
    yPos += 7;
  });
  
  // Add approved claims if any
  if (data.approvedClaims > 0) {
    doc.text('Approved Claims', 20, yPos);
    doc.text(`S$ ${data.approvedClaims.toFixed(2)}`, 150, yPos, { align: 'right' });
    yPos += 7;
  }
  
  // Gross earnings line
  yPos += 3;
  doc.line(20, yPos, 150, yPos);
  yPos += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Gross Earnings', 20, yPos);
  doc.text(`S$ ${(data.grossSalary + data.approvedClaims).toFixed(2)}`, 150, yPos, { align: 'right' });
  yPos += 15;
  
  // Deductions section
  doc.text('DEDUCTIONS:', 20, yPos);
  yPos += 10;
  
  doc.setFont('helvetica', 'normal');
  doc.text('CPF (Employee)', 20, yPos);
  doc.text(`S$ ${data.employeeCPF.toFixed(2)}`, 150, yPos, { align: 'right' });
  yPos += 7;
  
  // Add deductions
  data.deductions.forEach(deduction => {
    doc.text(deduction.name, 20, yPos);
    doc.text(`S$ ${deduction.amount.toFixed(2)}`, 150, yPos, { align: 'right' });
    yPos += 7;
  });
  
  // Total deductions line
  yPos += 3;
  doc.line(20, yPos, 150, yPos);
  yPos += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Total Deductions', 20, yPos);
  doc.text(`S$ ${(data.employeeCPF + data.totalDeductions).toFixed(2)}`, 150, yPos, { align: 'right' });
  yPos += 15;
  
  // Net pay
  doc.line(20, yPos, 150, yPos);
  yPos += 7;
  doc.setFontSize(14);
  doc.text('NET PAY', 20, yPos);
  doc.text(`S$ ${data.netSalary.toFixed(2)}`, 150, yPos, { align: 'right' });
  yPos += 15;
  
  // Bank details
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('BANK TRANSFER DETAILS:', 20, yPos);
  yPos += 10;
  doc.setFont('helvetica', 'normal');
  doc.text(`Bank: ${data.employee.bankName || 'N/A'}`, 20, yPos);
  yPos += 7;
  doc.text(`Account Number: ${data.employee.bankAccount || 'N/A'}`, 20, yPos);
  yPos += 15;
  
  // CPF contributions
  doc.setFont('helvetica', 'bold');
  doc.text('CPF CONTRIBUTIONS:', 20, yPos);
  yPos += 10;
  doc.setFont('helvetica', 'normal');
  doc.text('Employee CPF', 20, yPos);
  doc.text(`S$ ${data.employeeCPF.toFixed(2)}`, 150, yPos, { align: 'right' });
  yPos += 7;
  doc.text('Employer CPF', 20, yPos);
  doc.text(`S$ ${data.employerCPF.toFixed(2)}`, 150, yPos, { align: 'right' });
  yPos += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Total CPF', 20, yPos);
  doc.text(`S$ ${data.totalCPF.toFixed(2)}`, 150, yPos, { align: 'right' });
  
  // Footer
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('This payslip is computer generated and does not require signature.', 105, 280, { align: 'center' });
  doc.text('For queries, please contact HR Department.', 105, 287, { align: 'center' });
  
  // Save the PDF
  const fileName = `payslip-${data.employee.name.replace(/\s+/g, '-')}-${data.month.replace(/\s+/g, '-').toLowerCase()}.pdf`;
  doc.save(fileName);
};
