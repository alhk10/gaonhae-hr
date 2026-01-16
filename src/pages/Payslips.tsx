
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import PageAccessGuard from '@/components/auth/PageAccessGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Calendar, FileText, Settings } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getEmployeeById } from '@/services/employeeService';
import { getEmployeePayrollRecords, type PayrollData } from '@/services/payrollService';
import { EmployeeProfile } from '@/types/employee';
import { generatePayslipPDF } from '@/utils/payslipPDFGenerator';
import { generateCasualPayslipPDF, type SlotEntry } from '@/utils/casualPayslipPDFGenerator';
import PayslipManagementContent from '@/components/payroll/PayslipManagementContent';

interface PayslipDisplayData extends PayrollData {
  month: string;
  employeeType?: string;
  slotBreakdown?: Array<{
    date: string;
    branchName: string;
    pay: number;
    hasAttendance?: boolean;
    checkIn?: string | null;
    checkOut?: string | null;
    hoursWorked?: number;
  }>;
  slotBookingPay?: number;
  calculationMethod?: string;
}

const PayslipsContent = () => {
  const { user, userrole } = useAuth();
  const [currentEmployee, setCurrentEmployee] = useState<EmployeeProfile | null>(null);
  const [payslips, setPayslips] = useState<PayslipDisplayData[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if user can manage payslips (Senior Partner or Superadmin)
  const isSeniorPartner = currentEmployee?.position?.toLowerCase() === 'senior partner';
  const canManagePayslips = userrole === 'superadmin' || isSeniorPartner;
  
  const loadEmployeeData = async () => {
    try {
      if (!user?.employeeId) {
        console.error('No employee ID found for current user');
        return;
      }

      console.log('Loading employee data from Supabase for ID:', user.employeeId);
      
      const employee = await getEmployeeById(user.employeeId);
      console.log('Loaded employee from Supabase:', employee);
      setCurrentEmployee(employee);
      
      if (!employee) {
        console.error('Employee not found in Supabase:', user.employeeId);
        toast.error("Employee record not found");
        return;
      }
      
      console.log('Fetching live payroll records from Supabase...');
      const existingRecords = await getEmployeePayrollRecords(user.employeeId);
      console.log('Live payroll records from Supabase:', existingRecords);
      
      if (!existingRecords || existingRecords.length === 0) {
        console.log('No payroll records found in Supabase for employee:', user.employeeId);
        toast.info("No payroll records found");
        setPayslips([]);
        return;
      }
      
      const transformedPayslips: PayslipDisplayData[] = existingRecords.map(record => ({
        month: record.month,
        ...record.payrollData,
        employeeType: (record.payrollData as any).employeeType,
        slotBreakdown: (record.payrollData as any).slotBreakdown,
        slotBookingPay: (record.payrollData as any).slotBookingPay,
        calculationMethod: (record.payrollData as any).calculationMethod,
      }));
      
      transformedPayslips.sort((a, b) => {
        return b.month.localeCompare(a.month);
      });
      
      setPayslips(transformedPayslips);
      console.log('Live payslips loaded from Supabase:', transformedPayslips);
      
    } catch (error) {
      console.error('Error loading live payroll data from Supabase:', error);
      toast.error("Error loading payroll data from Supabase");
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      if (user?.employeeId) {
        await loadEmployeeData();
      }
      setLoading(false);
    };

    initializeData();
  }, [user?.employeeId]);

  const handleDownloadPayslipPDF = async (month: string) => {
    try {
      console.log('Starting PDF download for month:', month);
      
      if (!currentEmployee) {
        console.error('No current employee data available');
        toast.error("Error: No employee data available");
        return;
      }

      const payslipData = payslips.find(p => p.month === month);
      if (!payslipData) {
        toast.error("Payslip data not found for this month");
        return;
      }

      const isCasualEmployee = currentEmployee.type === 'Casual' || payslipData.employeeType === 'Casual';
      
      if (isCasualEmployee && payslipData.slotBreakdown && payslipData.slotBreakdown.length > 0) {
        const slots: SlotEntry[] = payslipData.slotBreakdown.map(slot => ({
          date: slot.date,
          branchName: slot.branchName,
          clockIn: slot.checkIn || null,
          clockOut: slot.checkOut || null,
          hoursWorked: slot.hoursWorked || 0,
          expectedHours: (slot as any).expectedHours,
          pay: slot.pay
        }));

        const casualPdfData = {
          employee: {
            id: currentEmployee.id,
            name: currentEmployee.name,
            nric: currentEmployee.nric,
            branch: currentEmployee.branch,
            position: currentEmployee.position,
            bankName: currentEmployee.bankName,
            bankAccount: currentEmployee.bankAccount
          },
          month,
          slots,
          totalSlotPay: payslipData.slotBookingPay || slots.reduce((sum, s) => sum + s.pay, 0),
          totalAllowances: payslipData.totalAllowances,
          totalDeductions: payslipData.totalDeductions,
          approvedClaims: payslipData.approvedClaims,
          grossSalary: payslipData.grossSalary,
          employeeCPF: payslipData.employeeCPF,
          employerCPF: payslipData.employerCPF,
          totalCPF: payslipData.totalCPF,
          netSalary: payslipData.netSalary,
          allowances: payslipData.allowances,
          deductions: payslipData.deductions
        };

        await generateCasualPayslipPDF(casualPdfData);
        toast.success(`Casual payslip with timesheet downloaded for ${month}`);
      } else {
        const pdfData = {
          employee: {
            id: currentEmployee.id,
            name: currentEmployee.name,
            nric: currentEmployee.nric,
            branch: currentEmployee.branch,
            position: currentEmployee.position,
            bankName: currentEmployee.bankName,
            bankAccount: currentEmployee.bankAccount
          },
          month,
          baseSalary: payslipData.baseSalary,
          totalAllowances: payslipData.totalAllowances,
          totalDeductions: payslipData.totalDeductions,
          grossSalary: payslipData.grossSalary,
          employeeCPF: payslipData.employeeCPF,
          employerCPF: payslipData.employerCPF,
          totalCPF: payslipData.totalCPF,
          approvedClaims: payslipData.approvedClaims,
          netSalary: payslipData.netSalary,
          allowances: payslipData.allowances,
          deductions: payslipData.deductions
        };

        await generatePayslipPDF(pdfData);
        toast.success(`PDF payslip downloaded for ${month}`);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error(`Error generating PDF for ${month}`, {
        description: 'Please check console for details'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payslip data...</p>
        </div>
      </div>
    );
  }

  if (!user?.employeeId) {
    return (
      <div className="text-center">
        <p className="text-red-600">No employee ID found for current user</p>
        <p className="text-sm text-gray-500 mt-2">Please contact your administrator</p>
      </div>
    );
  }

  if (!currentEmployee) {
    return (
      <div className="text-center space-y-4">
        <p className="text-red-600">Employee record not found</p>
        <p className="text-sm text-gray-500">
          Employee ID: {user.employeeId} could not be found in the system
        </p>
      </div>
    );
  }

  const totalEarningsYear = payslips.reduce((sum, payslip) => sum + (payslip.grossSalary || 0) + (payslip.approvedClaims || 0), 0);
  const totalCPFYear = payslips.reduce((sum, payslip) => sum + (payslip.totalCPF || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">My Payslips</h2>
      </div>

      <Tabs defaultValue="my-payslips" className="w-full">
        <TabsList className={`grid w-full ${canManagePayslips ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <TabsTrigger value="my-payslips">
            <FileText className="w-4 h-4 mr-2" />
            My Payslips
          </TabsTrigger>
          {canManagePayslips && (
            <TabsTrigger value="manage">
              <Settings className="w-4 h-4 mr-2" />
              Manage Payslips
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="my-payslips" className="space-y-6">
          {payslips.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">No Payslips Found</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Earnings (Year)</p>
                        <p className="text-2xl font-bold text-gray-900">S${totalEarningsYear.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Including claims: S${(payslips.reduce((sum, p) => sum + (p.approvedClaims || 0), 0)).toLocaleString()}
                        </p>
                      </div>
                      <DollarSign className="w-8 h-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">CPF Contributions (Year)</p>
                        <p className="text-2xl font-bold text-gray-900">S${totalCPFYear.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Employee + Employer CPF
                        </p>
                      </div>
                      <Calendar className="w-8 h-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Payslips</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {payslips.map((payslip, index) => {
                      const isCasual = payslip.employeeType === 'Casual' || currentEmployee?.type === 'Casual';
                      const hasTimesheet = payslip.slotBreakdown && payslip.slotBreakdown.length > 0;
                      
                      return (
                        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-gray-900">{payslip.month}</p>
                              {isCasual && (
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                  Casual
                                </Badge>
                              )}
                              {hasTimesheet && (
                                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                  {payslip.slotBreakdown?.length} slots
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              Net: S${(payslip.netSalary || 0).toLocaleString()} • 
                              Gross: S${((payslip.grossSalary || 0) + (payslip.approvedClaims || 0)).toLocaleString()} • 
                              CPF: S${(payslip.totalCPF || 0).toLocaleString()}
                              {(payslip.approvedClaims || 0) > 0 && ` • Claims: S${(payslip.approvedClaims || 0).toLocaleString()}`}
                            </p>
                            <p className="text-xs text-gray-400">
                              {isCasual && hasTimesheet ? (
                                <>Slot Pay: S${(payslip.slotBookingPay || 0).toLocaleString()}</>
                              ) : (
                                <>Base: S${(payslip.baseSalary || 0).toLocaleString()}</>
                              )}
                              {' • '}
                              Allowances: S${(payslip.totalAllowances || 0).toLocaleString()} • 
                              Deductions: S${(payslip.totalDeductions || 0).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="default" 
                              size="sm"
                              onClick={() => handleDownloadPayslipPDF(payslip.month)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              {isCasual && hasTimesheet ? 'Download with Timesheet' : 'Download PDF'}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {canManagePayslips && (
          <TabsContent value="manage" className="space-y-6">
            <PayslipManagementContent />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

const Payslips = () => {
  return (
    <PageAccessGuard requiredPermission="payslips">
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <PayslipsContent />
          </main>
        </div>
      </div>
    </PageAccessGuard>
  );
};

export default Payslips;
