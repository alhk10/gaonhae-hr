
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Calendar, FileText } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getEmployeeById } from '@/services/employeeService';
import { getEmployeePayrollData, getEmployeePayrollRecords, savePayrollRecord, type PayrollData } from '@/services/payrollService';
import { EmployeeProfile } from '@/types/employee';
import { generatePayslipPDF } from '@/utils/payslipPDFGenerator';

interface PayslipDisplayData extends PayrollData {
  month: string;
}

const Payslips = () => {
  const { user } = useAuth();
  const [currentEmployee, setCurrentEmployee] = useState<EmployeeProfile | null>(null);
  const [payslips, setPayslips] = useState<PayslipDisplayData[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadEmployeeData = async () => {
      try {
        setLoading(true);
        
        if (!user?.employeeId) {
          console.error('No employee ID found for current user');
          setLoading(false);
          return;
        }

        console.log('Loading employee data for ID:', user.employeeId);
        
        // Load employee details
        const employee = await getEmployeeById(user.employeeId);
        console.log('Loaded employee:', employee);
        setCurrentEmployee(employee);
        
        if (!employee) {
          console.error('Employee not found:', user.employeeId);
          setLoading(false);
          return;
        }
        
        // Try to load existing payroll records first
        const existingRecords = await getEmployeePayrollRecords(user.employeeId);
        console.log('Existing payroll records:', existingRecords);
        
        // Generate current payroll data
        const currentPayrollData = await getEmployeePayrollData(user.employeeId);
        console.log('Current payroll data:', currentPayrollData);
        
        // Generate payslips for recent months
        const months = [
          'December 2024',
          'November 2024', 
          'October 2024',
          'September 2024'
        ];
        
        const generatedPayslips: PayslipDisplayData[] = [];
        
        for (const month of months) {
          // Check if we have existing record for this month
          const existingRecord = existingRecords.find(record => record.month === month);
          
          let payrollData: PayrollData;
          if (existingRecord) {
            payrollData = existingRecord.payrollData;
          } else {
            // Use current payroll data for all months (in real system, this would be historical data)
            payrollData = currentPayrollData;
            
            // Save the generated payroll record
            try {
              await savePayrollRecord(user.employeeId, month, payrollData);
            } catch (error) {
              console.error('Error saving payroll record for', month, ':', error);
            }
          }
          
          generatedPayslips.push({
            month,
            ...payrollData
          });
        }
        
        setPayslips(generatedPayslips);
        
      } catch (error) {
        console.error('Error loading payroll data:', error);
        toast.error("Error loading employee data");
      } finally {
        setLoading(false);
      }
    };

    if (user?.employeeId) {
      loadEmployeeData();
    } else {
      setLoading(false);
    }
  }, [user?.employeeId]);

  const handleDownloadPayslipPDF = (month: string) => {
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
      
      console.log('PDF data being passed to generator:', pdfData);
      
      generatePayslipPDF(pdfData);
      toast.success(`PDF payslip downloaded for ${month}`, {
        description: `Employee: ${currentEmployee.name} (${currentEmployee.id})`
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error(`Error generating PDF for ${month}`, {
        description: 'Please check console for details'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading payslip data...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!user?.employeeId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="text-center">
              <p className="text-red-600">No employee ID found for current user</p>
              <p className="text-sm text-gray-500 mt-2">Please contact your administrator</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!currentEmployee) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="text-center">
              <p className="text-red-600">Employee record not found</p>
              <p className="text-sm text-gray-500 mt-2">
                Employee ID: {user.employeeId} could not be found in the system
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const totalEarningsYear = payslips.reduce((sum, payslip) => sum + payslip.grossSalary + payslip.approvedClaims, 0);
  const totalCPFYear = payslips.reduce((sum, payslip) => sum + payslip.totalCPF, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">My Payslips</h2>
              <p className="text-gray-600">View and download your payslips with live data from Supabase</p>
              <p className="text-sm text-gray-500 mt-1">
                Employee: {currentEmployee?.name} ({currentEmployee?.id})
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Earnings (Year)</p>
                      <p className="text-2xl font-bold text-gray-900">S${totalEarningsYear.toLocaleString()}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Including claims: S${(payslips.reduce((sum, p) => sum + p.approvedClaims, 0)).toLocaleString()}
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
                <CardDescription>Download your monthly payslips as PDF (Data from Supabase)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {payslips.map((payslip, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{payslip.month}</p>
                        <p className="text-sm text-gray-600">
                          Net: S${payslip.netSalary.toLocaleString()} • 
                          Gross: S${(payslip.grossSalary + payslip.approvedClaims).toLocaleString()} • 
                          CPF: S${payslip.totalCPF.toLocaleString()}
                          {payslip.approvedClaims > 0 && ` • Claims: S${payslip.approvedClaims.toLocaleString()}`}
                        </p>
                        <p className="text-xs text-gray-400">
                          Base: S${payslip.baseSalary.toLocaleString()} • 
                          Allowances: S${payslip.totalAllowances.toLocaleString()} • 
                          Deductions: S${payslip.totalDeductions.toLocaleString()}
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
                          Download PDF
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Payslips;
