
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
import { Calculator, Users, FileText, Settings, DollarSign } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePayroll } from '@/contexts/PayrollContext';
import { toast } from '@/components/ui/sonner';
import { getAllPayrollRecords } from '@/services/payrollService';

const PayrollContent = () => {
  const { user } = useAuth();
  const { payrollState, calculatePayrollTotal, savePayrollToSupabase } = usePayroll();
  const [activeTab, setActiveTab] = useState('overview');
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

      <PayrollPeriodManager />
      <PayrollSummaryCards 
        currentTotal={currentTotal} 
        totalEmployees={totalEmployees} 
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Full-Time Employees</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{payrollState.fullTimeEmployees.length}</div>
                <p className="text-xs text-muted-foreground">
                  Total: S${payrollState.fullTimeEmployees.reduce((sum, emp) => sum + emp.netPay, 0).toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Casual Employees</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{payrollState.casualEmployees.length}</div>
                <p className="text-xs text-muted-foreground">
                  Total: S${payrollState.casualEmployees.reduce((sum, emp) => sum + emp.totalPay, 0).toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">{payrollState.status}</div>
                <p className="text-xs text-muted-foreground">
                  Last updated: {payrollState.lastUpdated.toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Payroll Records</CardTitle>
            </CardHeader>
            <CardContent>
              {payrollRecords.length > 0 ? (
                <div className="space-y-2">
                  {payrollRecords.slice(0, 5).map((record: any) => (
                    <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{record.month} {record.year}</p>
                        <p className="text-sm text-gray-600">Employee ID: {record.employee_id}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">S${record.payroll_data?.netSalary?.toLocaleString() || '0'}</p>
                        <p className="text-xs text-gray-500">
                          {record.is_locked ? 'Locked' : 'Unlocked'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No payroll records found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employees" className="space-y-6">
          <PayrollEmployeeManager payrollPeriod={payrollState.currentPeriod} />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payroll Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Monthly Summary</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Complete payroll summary for {payrollState.currentPeriod}
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total Employees:</span>
                        <span>{totalEmployees}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Gross Pay:</span>
                        <span>S${(payrollState.fullTimeEmployees.reduce((sum, emp) => sum + emp.grossPay, 0) + 
                          payrollState.casualEmployees.reduce((sum, emp) => sum + emp.grossPay, 0)).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total CPF:</span>
                        <span>S${(payrollState.fullTimeEmployees.reduce((sum, emp) => sum + emp.cpfEmployee + emp.cpfEmployer, 0) + 
                          payrollState.casualEmployees.reduce((sum, emp) => sum + emp.employeeCPF + emp.employerCPF, 0)).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Net Pay:</span>
                        <span>S${currentTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Export Options</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Download reports in various formats
                    </p>
                    <div className="space-y-2">
                      <button className="w-full text-left p-2 hover:bg-gray-50 rounded">
                        📊 Excel Summary
                      </button>
                      <button className="w-full text-left p-2 hover:bg-gray-50 rounded">
                        📄 PDF Report
                      </button>
                      <button className="w-full text-left p-2 hover:bg-gray-50 rounded">
                        💾 CSV Export
                      </button>
                    </div>
                  </div>
                </div>
              </div>
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
