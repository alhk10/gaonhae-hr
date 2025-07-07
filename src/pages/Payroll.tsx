import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { DollarSign, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { usePayroll } from '@/contexts/PayrollContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import PayrollPeriodManager from '@/components/payroll/PayrollPeriodManager';
import PayrollSummaryCards from '@/components/payroll/PayrollSummaryCards';
import PayrollEmployeeManager from '@/components/payroll/PayrollEmployeeManager';
import PayrollActionButtons from '@/components/payroll/PayrollActionButtons';

const Payroll = () => {
  const navigate = useNavigate();
  const { payrollState, calculatePayrollTotal, savePayrollToSupabase, isLoading } = usePayroll();
  const [isSaving, setIsSaving] = useState(false);

  const handleProcessPayroll = () => {
    if (payrollState.fullTimeEmployees.length === 0 && payrollState.casualEmployees.length === 0) {
      toast.error('No employees found in payroll. Please add employees before processing.');
      return;
    }
    navigate('/payroll-processing');
  };

  const handleIncrementPlanning = () => {
    navigate('/increment-planning');
  };

  const handlePaymentSummary = () => {
    navigate('/payment-summary');
  };

  const handleSavePayroll = async () => {
    if (payrollState.fullTimeEmployees.length === 0 && payrollState.casualEmployees.length === 0) {
      toast.error('No employees to save in payroll');
      return;
    }

    setIsSaving(true);
    try {
      await savePayrollToSupabase();
      toast.success('Payroll saved successfully');
    } catch (error) {
      console.error('Error saving payroll:', error);
      toast.error('Error saving payroll');
    } finally {
      setIsSaving(false);
    }
  };

  const generatePDF = (month: string) => {
    if (payrollState.fullTimeEmployees.length === 0 && payrollState.casualEmployees.length === 0) {
      toast.error('No employees found. Cannot generate payroll report.');
      return;
    }

    const pdfContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Payroll Summary - ${month}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
        .section { margin: 20px 0; }
        .row { display: flex; justify-content: space-between; margin: 5px 0; }
        .total { font-weight: bold; border-top: 1px solid #000; padding-top: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #000; padding: 8px; text-align: left; }
        th { background-color: #f0f0f0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>PAYROLL SUMMARY</h1>
        <h2>${month.toUpperCase()}</h2>
        <p>ABC Learning Centre Pte Ltd</p>
    </div>
    
    <div class="section">
        <h3>PAYROLL OVERVIEW</h3>
        <div class="row"><span>Total Employees:</span><span>${payrollState.fullTimeEmployees.length + payrollState.casualEmployees.length}</span></div>
        <div class="row"><span>Full-Time Employees:</span><span>${payrollState.fullTimeEmployees.length}</span></div>
        <div class="row"><span>Casual Employees:</span><span>${payrollState.casualEmployees.length}</span></div>
        <div class="row total"><span>Total Payroll Amount:</span><span>S$ ${calculatePayrollTotal().toLocaleString()}</span></div>
    </div>
    
    <div class="section">
        <h3>FULL-TIME EMPLOYEES</h3>
        <table>
            <tr><th>Name</th><th>Base Salary</th><th>Allowances</th><th>CPF</th><th>Net Pay</th></tr>
            ${payrollState.fullTimeEmployees.map(emp => 
              `<tr><td>${emp.name}</td><td>S$ ${(emp.baseSalary || 0).toLocaleString()}</td><td>S$ ${emp.allowances.reduce((sum, a) => sum + a.amount, 0).toLocaleString()}</td><td>S$ ${(emp.cpfEmployee || 0).toLocaleString()}</td><td>S$ ${(emp.netPay || 0).toLocaleString()}</td></tr>`
            ).join('')}
        </table>
    </div>
    
    <div class="section">
        <h3>CASUAL EMPLOYEES</h3>
        <table>
            <tr><th>Name</th><th>Payment Type</th><th>Rate</th><th>Hours/Days</th><th>Total</th></tr>
            ${payrollState.casualEmployees.map(emp => {
              const rate = emp.hourlyRate || emp.dailyRate || emp.baseSalary || 0;
              const workAmount = emp.hoursWorked || emp.daysWorked || 0;
              const rateDisplay = emp.hourlyRate ? `S$ ${rate.toFixed(2)}/hr` : 
                                emp.dailyRate ? `S$ ${rate.toFixed(2)}/day` : 
                                `S$ ${rate.toFixed(2)}/month`;
              return `<tr><td>${emp.name}</td><td>${emp.paymentType || 'Monthly'}</td><td>${rateDisplay}</td><td>${workAmount}</td><td>S$ ${(emp.totalPay || 0).toLocaleString()}</td></tr>`;
            }).join('')}
        </table>
    </div>
</body>
</html>
    `;

    const blob = new Blob([pdfContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payroll-summary-${month.replace(' ', '-').toLowerCase()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success(`Downloaded payroll summary for ${month}`);
  };

  const getNextProcessingDate = () => {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 2);
    const daysUntil = Math.ceil((nextMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil;
  };

  if (isLoading) {
    return (
      <ResponsiveLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading payroll data...</p>
          </div>
        </div>
      </ResponsiveLayout>
    );
  }

  const currentTotal = calculatePayrollTotal();
  const totalEmployees = payrollState.fullTimeEmployees.length + payrollState.casualEmployees.length;
  const hasEmployees = totalEmployees > 0;
  const nextProcessingDays = getNextProcessingDate();

  return (
    <ResponsiveLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Payroll Management</h2>
            <p className="text-gray-600 mt-1">Manage employee payroll and compensation</p>
          </div>
        </div>

        {/* Encashment Integration Alert */}
        {payrollState.encashmentData.length > 0 && (
          <Alert className="border-green-200 bg-green-50">
            <DollarSign className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Leave encashment data has been integrated into this payroll period. 
              {payrollState.encashmentData.length} employee(s) have encashment amounts included.
            </AlertDescription>
          </Alert>
        )}

        {/* Period Management */}
        <PayrollPeriodManager />

        {/* Summary Cards */}
        <PayrollSummaryCards 
          currentTotal={currentTotal}
          totalEmployees={totalEmployees}
          nextProcessingDays={nextProcessingDays}
        />

        {/* Employee Management Section */}
        <PayrollEmployeeManager payrollPeriod={payrollState.currentPeriod} />

        {/* Action Buttons */}
        <PayrollActionButtons
          hasEmployees={hasEmployees}
          onProcessPayroll={handleProcessPayroll}
          onPaymentSummary={handlePaymentSummary}
          onGeneratePDF={() => generatePDF(payrollState.currentPeriod)}
          onSavePayroll={handleSavePayroll}
          isSaving={isSaving}
        />
      </div>
    </ResponsiveLayout>
  );
};

export default Payroll;
