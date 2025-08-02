
import React, { useState, useEffect } from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { PayrollProvider, usePayroll } from '@/contexts/PayrollContext';
import PayrollSummaryCards from '@/components/payroll/PayrollSummaryCards';
import PayrollPeriodSelector from '@/components/payroll/PayrollPeriodSelector';
import PayrollEmployeeManager from '@/components/payroll/PayrollEmployeeManager';
import { useAuth } from '@/contexts/AuthContext';

import { toast } from '@/components/ui/sonner';
import { getAllPayrollRecords } from '@/services/payrollService';

const PayrollContent = () => {
  console.log('🚀 Payroll page loading - comprehensive version');
  
  const { user } = useAuth();
  const { payrollState, calculatePayrollTotal, savePayrollToSupabase, setCurrentPeriod } = usePayroll();
  
  const [hasEmployees, setHasEmployees] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [payrollRecords, setPayrollRecords] = useState([]);

  useEffect(() => {
    const totalEmployees = payrollState.fullTimeEmployees.length + payrollState.casualEmployees.length;
    setHasEmployees(totalEmployees > 0);
  }, [payrollState.fullTimeEmployees, payrollState.casualEmployees]);

  useEffect(() => {
    loadPayrollRecords();
  }, []);

  const loadPayrollRecords = async () => {
    try {
      const records = await getAllPayrollRecords();
      setPayrollRecords(records);
      console.log('📊 Loaded payroll records:', records.length);
    } catch (error) {
      console.error('Error loading payroll records:', error);
    }
  };

  const handleProcessPayroll = () => {
    toast.success('Payroll processing initiated');
  };

  const handlePaymentSummary = () => {
    window.open('/payment-summary', '_blank');
  };

  const handleGeneratePDF = () => {
    toast.info('Generating payroll report...');
  };

  const handleSavePayroll = async () => {
    setIsSaving(true);
    try {
      await savePayrollToSupabase();
      await loadPayrollRecords();
      toast.success('Payroll data saved successfully');
    } catch (error) {
      console.error('Error saving payroll:', error);
      toast.error('Error saving payroll data');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePeriodChange = (period: string) => {
    setCurrentPeriod(period);
    loadPayrollRecords();
  };

  const currentTotal = calculatePayrollTotal();
  const totalEmployees = payrollState.fullTimeEmployees.length + payrollState.casualEmployees.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payroll Management</h1>
          <p className="text-gray-600 mt-1">Manage employee payroll and compensation</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm text-gray-500">Current Period</p>
            <p className="font-semibold">{payrollState.currentPeriod}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Total Amount</p>
            <p className="font-semibold text-green-600">S${currentTotal.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <PayrollPeriodSelector
        selectedPeriod={payrollState.currentPeriod}
        onPeriodChange={handlePeriodChange}
        isLoading={payrollState.isLoading}
      />

      <PayrollSummaryCards 
        currentTotal={currentTotal} 
        totalEmployees={totalEmployees} 
        nextProcessingDays={7} 
      />

      <PayrollEmployeeManager payrollPeriod={payrollState.currentPeriod} />
    </div>
  );
};

const Payroll = () => {
  console.log('💼 Payroll page component mounted');
  
  return (
    <AuthGuard>
      <ResponsiveLayout>
        <div data-testid="payroll-provider">
          <PayrollProvider>
            <PayrollContent />
          </PayrollProvider>
        </div>
      </ResponsiveLayout>
    </AuthGuard>
  );
};

export default Payroll;
