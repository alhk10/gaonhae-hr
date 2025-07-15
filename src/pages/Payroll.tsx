
import React, { useState, useEffect } from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { PayrollProvider } from '@/contexts/PayrollContext';
import PayrollSummaryCards from '@/components/payroll/PayrollSummaryCards';
import PayrollPeriodManager from '@/components/payroll/PayrollPeriodManager';
import PayrollEmployeeManager from '@/components/payroll/PayrollEmployeeManager';
import PayrollActionButtons from '@/components/payroll/PayrollActionButtons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, Users, FileText, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/sonner';

const PayrollContent = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [hasEmployees, setHasEmployees] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleProcessPayroll = () => {
    toast('Payroll processing initiated');
  };

  const handlePaymentSummary = () => {
    window.open('/payment-summary', '_blank');
  };

  const handleGeneratePDF = () => {
    toast('Generating payroll report...');
  };

  const handleSavePayroll = async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate save
      toast('Payroll data saved successfully');
    } catch (error) {
      toast('Error saving payroll data');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payroll Management</h1>
          <p className="text-gray-600 mt-1">Manage employee payroll and compensation</p>
        </div>
      </div>

      <PayrollPeriodManager />
      <PayrollSummaryCards 
        currentTotal={0} 
        totalEmployees={0} 
        nextProcessingDays={7} 
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center">
            <Calculator className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="employees" className="flex items-center">
            <Users className="w-4 h-4 mr-2" />
            Employees
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="actions" className="flex items-center">
            <Settings className="w-4 h-4 mr-2" />
            Actions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payroll Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Welcome to the payroll management system. Use the tabs above to navigate between different sections.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employees" className="space-y-6">
          <PayrollEmployeeManager onEmployeeCountChange={setHasEmployees} />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payroll Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Generate and download payroll reports for the selected period.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-6">
          <PayrollActionButtons
            hasEmployees={hasEmployees}
            onProcessPayroll={handleProcessPayroll}
            onPaymentSummary={handlePaymentSummary}
            onGeneratePDF={handleGeneratePDF}
            onSavePayroll={handleSavePayroll}
            isSaving={isSaving}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const Payroll = () => {
  return (
    <AuthGuard>
      <ResponsiveLayout>
        <PayrollProvider>
          <PayrollContent />
        </PayrollProvider>
      </ResponsiveLayout>
    </AuthGuard>
  );
};

export default Payroll;
